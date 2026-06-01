import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

function formatDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getAcademicWindowUTC(today: Date) {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const startYear = month >= 4 ? year : year - 1;
  return { start: `${startYear}-05-01`, end: formatDateUTC(today) };
}

/**
 * GET /api/analytics/class-branch-subjects?program=X&branch=X
 *
 * Returns subject-wise exam analytics for a specific program + branch.
 * Level 3 of the class-first hierarchy.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const program = request.nextUrl.searchParams.get("program");
    const branch = request.nextUrl.searchParams.get("branch");
    if (!program || !branch) {
      return NextResponse.json(
        { error: "program and branch params required" },
        { status: 400 },
      );
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const { start: fromDate, end: toDate } = getAcademicWindowUTC(new Date());

    // 1. Get batches for this program + branch
    const sgRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Group?${new URLSearchParams({
        filters: JSON.stringify([
          ["program", "=", program],
          ["custom_branch", "=", branch],
          ["group_based_on", "=", "Batch"],
          ["disabled", "=", 0],
        ]),
        fields: JSON.stringify(["name"]),
        limit_page_length: "100",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const batchDocs: { name: string }[] = sgRes.ok ? (await sgRes.json()).data ?? [] : [];
    const batchNames = batchDocs.map((b) => b.name);

    if (batchNames.length === 0) {
      return NextResponse.json({
        program,
        branch,
        subjects: [],
        batches: [],
        total_students: 0,
        avg_attendance_pct: 0,
        chronic_absentees: 0,
        avg_exam_score_pct: 0,
        pass_rate: 0,
      });
    }

    // 2. Attendance
    const attRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Attendance?${new URLSearchParams({
        filters: JSON.stringify([
          ["student_group", "in", batchNames],
          ["date", ">=", fromDate],
          ["date", "<=", toDate],
        ]),
        fields: JSON.stringify(["student", "status"]),
        limit_page_length: "0",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const attRecords: { student: string; status: string }[] =
      attRes.ok ? (await attRes.json()).data ?? [] : [];

    const uniqueStudents = new Set(attRecords.map((r) => r.student));
    const totalStudents = uniqueStudents.size;
    const totalAtt = attRecords.length;
    const presentCount = attRecords.filter(
      (r) => r.status === "Present" || r.status === "Late",
    ).length;
    const avgAttPct = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 1000) / 10 : 0;
    const attByStudent = new Map<string, { p: number; t: number }>();
    for (const r of attRecords) {
      if (!attByStudent.has(r.student)) attByStudent.set(r.student, { p: 0, t: 0 });
      const s = attByStudent.get(r.student)!;
      s.t++;
      if (r.status === "Present" || r.status === "Late") s.p++;
    }
    const chronicAbsentees = Array.from(attByStudent.values()).filter(
      (s) => s.t >= 3 && (s.p / s.t) * 100 < 75,
    ).length;

    // 3. Exam plans
    const plansRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Plan?${new URLSearchParams({
        filters: JSON.stringify([
          ["student_group", "in", batchNames],
          ["docstatus", "=", 1],
        ]),
        fields: JSON.stringify(["name", "student_group", "course"]),
        limit_page_length: "500",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const plans: { name: string; student_group: string; course: string }[] =
      plansRes.ok ? (await plansRes.json()).data ?? [] : [];

    const subjectMap: Record<string, { scores: number[]; maxs: number[] }> = {};
    const batchStats: Record<
      string,
      { students: Set<string>; totalScore: number; totalMax: number; passed: number }
    > = {};
    for (const bn of batchNames) {
      batchStats[bn] = { students: new Set(), totalScore: 0, totalMax: 0, passed: 0 };
    }

    if (plans.length > 0) {
      const planNames = plans.map((p) => p.name);
      const resultsRes = await fetch(
        `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
          filters: JSON.stringify([
            ["assessment_plan", "in", planNames],
            ["docstatus", "=", 1],
          ]),
          fields: JSON.stringify([
            "student",
            "total_score",
            "maximum_score",
            "course",
            "assessment_plan",
          ]),
          limit_page_length: "5000",
        })}`,
        { headers: { Authorization: auth }, cache: "no-store" },
      );
      const results: {
        student: string;
        total_score: number;
        maximum_score: number;
        course: string;
        assessment_plan: string;
      }[] = resultsRes.ok ? (await resultsRes.json()).data ?? [] : [];

      const planLookup = new Map(plans.map((p) => [p.name, p]));
      for (const r of results) {
        if (!subjectMap[r.course]) subjectMap[r.course] = { scores: [], maxs: [] };
        subjectMap[r.course].scores.push(r.total_score);
        subjectMap[r.course].maxs.push(r.maximum_score);

        const plan = planLookup.get(r.assessment_plan);
        if (plan && batchStats[plan.student_group]) {
          const bs = batchStats[plan.student_group];
          bs.students.add(r.student);
          bs.totalScore += r.total_score;
          bs.totalMax += r.maximum_score;
          if (r.maximum_score > 0 && (r.total_score / r.maximum_score) * 100 >= 33) bs.passed++;
        }
      }
    }

    const subjectSummaries = Object.entries(subjectMap)
      .map(([subject, d]) => {
        const total = d.scores.length;
        const maxPossible = d.maxs.length > 0 ? Math.max(...d.maxs) : 0;
        const avgScore = total > 0 ? d.scores.reduce((a, b) => a + b, 0) / total : 0;
        const avgPct = maxPossible > 0 ? Math.round((avgScore / maxPossible) * 1000) / 10 : 0;
        const passed = d.scores.filter(
          (s, i) => d.maxs[i] > 0 && (s / d.maxs[i]) * 100 >= 33,
        ).length;
        return {
          subject,
          total_students: total,
          avg_score: Math.round(avgScore * 10) / 10,
          avg_score_pct: avgPct,
          pass_rate: total > 0 ? Math.round((passed / total) * 1000) / 10 : 0,
          max_score: total > 0 ? Math.max(...d.scores) : 0,
          min_score: total > 0 ? Math.min(...d.scores) : 0,
          maximum_possible: maxPossible,
        };
      })
      .sort((a, b) => b.avg_score_pct - a.avg_score_pct);

    const batchSummaries = batchNames.map((name) => {
      const bs = batchStats[name];
      const studentCount = bs.students.size;
      const avgPct =
        bs.totalMax > 0 ? Math.round((bs.totalScore / bs.totalMax) * 1000) / 10 : 0;
      const passRate =
        studentCount > 0 ? Math.round((bs.passed / studentCount) * 1000) / 10 : 0;
      return { name, total_students: studentCount, avg_pct: avgPct, pass_rate: passRate };
    });

    const allPcts = Object.values(batchStats).flatMap((bs) => {
      if (bs.totalMax === 0) return [];
      return [(bs.totalScore / bs.totalMax) * 100];
    });
    const avgExamScore =
      allPcts.length > 0
        ? Math.round((allPcts.reduce((a, b) => a + b, 0) / allPcts.length) * 10) / 10
        : 0;
    const passedCount = allPcts.filter((p) => p >= 33).length;
    const passRate =
      allPcts.length > 0 ? Math.round((passedCount / allPcts.length) * 1000) / 10 : 0;

    return NextResponse.json({
      program,
      branch,
      subjects: subjectSummaries,
      batches: batchSummaries,
      total_students: totalStudents,
      avg_attendance_pct: avgAttPct,
      chronic_absentees: chronicAbsentees,
      avg_exam_score_pct: avgExamScore,
      pass_rate: passRate,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[analytics/class-branch-subjects] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
