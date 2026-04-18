import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/analytics/student-performance?student=X&student_group=Y
 *
 * Returns comprehensive academic profile for a single student:
 * - Attendance stats
 * - Exam results per assessment group (with subject breakdown)
 * - Performance trend (improving/declining/stable)
 * - Strengths & weaknesses
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const student = request.nextUrl.searchParams.get("student");
    const studentGroup = request.nextUrl.searchParams.get("student_group");

    if (!student || !studentGroup) {
      return NextResponse.json(
        { error: "student and student_group params required" },
        { status: 400 },
      );
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    // 1. Fetch student info
    const studentRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(student)}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const studentDoc = studentRes.ok ? (await studentRes.json()).data : null;
    const studentName = studentDoc?.student_name || student;

    // 2. Fetch student group for program info
    const sgRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Group/${encodeURIComponent(studentGroup)}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const sgDoc = sgRes.ok ? (await sgRes.json()).data : null;
    const program = sgDoc?.program || "";

    // 3. Fetch attendance
    const attRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Attendance?${new URLSearchParams({
        filters: JSON.stringify([["student", "=", student], ["student_group", "=", studentGroup]]),
        fields: JSON.stringify(["date", "status"]),
        limit_page_length: "0",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const attRecords: { date: string; status: string }[] =
      attRes.ok ? (await attRes.json()).data ?? [] : [];

    const attStats = {
      total_days: attRecords.length,
      present: attRecords.filter((r) => r.status === "Present").length,
      absent: attRecords.filter((r) => r.status === "Absent").length,
      late: attRecords.filter((r) => r.status === "Late").length,
      pct: 0,
    };
    attStats.pct = attStats.total_days > 0
      ? Math.round(((attStats.present + attStats.late) / attStats.total_days) * 100 * 10) / 10
      : 0;

    // 4. Fetch assessment results for this student in this batch
    const resultsRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
        filters: JSON.stringify([
          ["student", "=", student],
          ["student_group", "=", studentGroup],
          ["docstatus", "=", 1],
        ]),
        fields: JSON.stringify([
          "name", "assessment_plan", "course", "total_score",
          "maximum_score", "grade", "assessment_group",
        ]),
        limit_page_length: "200",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const studentResults: {
      assessment_plan: string; course: string; total_score: number;
      maximum_score: number; grade: string; assessment_group: string;
    }[] = resultsRes.ok ? (await resultsRes.json()).data ?? [] : [];

    // Fetch grading scale
    const gsRes = await fetch(
      `${FRAPPE_URL}/api/resource/Grading%20Scale/SmartUp%20Grading%20Scale`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const gs = gsRes.ok ? (await gsRes.json()).data : null;
    const intervals: { grade_code: string; threshold: number }[] =
      gs?.intervals?.sort((a: { threshold: number }, b: { threshold: number }) => b.threshold - a.threshold) ?? [];

    function getGrade(pct: number): string {
      for (const iv of intervals) {
        if (pct >= iv.threshold) return iv.grade_code;
      }
      return intervals[intervals.length - 1]?.grade_code ?? "";
    }

    // 5. Group results by assessment_group
    const groupMap = new Map<string, {
      subjects: { course: string; score: number; maximum_score: number; pct: number; grade: string; passed: boolean }[];
    }>();

    for (const r of studentResults) {
      const ag = r.assessment_group || "Unknown";
      if (!groupMap.has(ag)) groupMap.set(ag, { subjects: [] });
      const g = groupMap.get(ag)!;
      const pct = r.maximum_score > 0
        ? Math.round((r.total_score / r.maximum_score) * 100 * 10) / 10
        : 0;
      g.subjects.push({
        course: r.course,
        score: r.total_score,
        maximum_score: r.maximum_score,
        pct,
        grade: r.grade || getGrade(pct),
        passed: pct >= 33,
      });
    }

    // 6. For each assessment group, fetch batch results to compute rank
    const examResults = await Promise.all(
      Array.from(groupMap.entries()).map(async ([ag, data]) => {
        // Fetch all results for this batch + assessment group to compute rank
        const batchResultsRes = await fetch(
          `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
            filters: JSON.stringify([
              ["student_group", "=", studentGroup],
              ["assessment_group", "=", ag],
              ["docstatus", "=", 1],
            ]),
            fields: JSON.stringify(["student", "total_score", "maximum_score"]),
            limit_page_length: "2000",
          })}`,
          { headers: { Authorization: auth }, cache: "no-store" },
        );
        const batchResults: { student: string; total_score: number; maximum_score: number }[] =
          batchResultsRes.ok ? (await batchResultsRes.json()).data ?? [] : [];

        // Aggregate per student
        const studentTotals = new Map<string, { totalScore: number; totalMax: number }>();
        for (const br of batchResults) {
          if (!studentTotals.has(br.student)) {
            studentTotals.set(br.student, { totalScore: 0, totalMax: 0 });
          }
          const st = studentTotals.get(br.student)!;
          st.totalScore += br.total_score;
          st.totalMax += br.maximum_score;
        }

        const ranked = Array.from(studentTotals.entries())
          .map(([s, t]) => ({
            student: s,
            pct: t.totalMax > 0 ? (t.totalScore / t.totalMax) * 100 : 0,
          }))
          .sort((a, b) => b.pct - a.pct);

        const thisStudentRank = ranked.findIndex((r) => r.student === student) + 1;

        const totalScore = data.subjects.reduce((s, sub) => s + sub.score, 0);
        const totalMax = data.subjects.reduce((s, sub) => s + sub.maximum_score, 0);
        const overallPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100 * 10) / 10 : 0;

        return {
          assessment_group: ag,
          subjects: data.subjects,
          overall_pct: overallPct,
          overall_grade: getGrade(overallPct),
          rank: thisStudentRank || 0,
          total_in_batch: studentTotals.size,
        };
      }),
    );

    // 7. Compute trend
    const sortedExams = [...examResults].sort((a, b) =>
      a.assessment_group.localeCompare(b.assessment_group),
    );
    let trend: "improving" | "declining" | "stable" = "stable";
    if (sortedExams.length >= 2) {
      const first = sortedExams[0].overall_pct;
      const last = sortedExams[sortedExams.length - 1].overall_pct;
      if (last - first > 5) trend = "improving";
      else if (first - last > 5) trend = "declining";
    }

    // 8. Strengths & weaknesses (subjects where consistently high/low)
    const subjectAvgs = new Map<string, number[]>();
    for (const ex of examResults) {
      for (const sub of ex.subjects) {
        if (!subjectAvgs.has(sub.course)) subjectAvgs.set(sub.course, []);
        subjectAvgs.get(sub.course)!.push(sub.pct);
      }
    }
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    for (const [course, pcts] of subjectAvgs) {
      const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
      if (avg >= 75) strengths.push(course);
      else if (avg < 50) weaknesses.push(course);
    }

    return NextResponse.json({
      data: {
        student,
        student_name: studentName,
        student_group: studentGroup,
        program,
        attendance: attStats,
        exam_results: examResults,
        trend,
        strengths,
        weaknesses,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[analytics/student-performance] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
