import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/exams/report-card?student=X&assessment_group=Y&student_group=Z
 *
 * Generates a full report card for one student across all subjects
 * for a given exam group and batch. Includes rank within batch.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const student = request.nextUrl.searchParams.get("student");
    const assessmentGroup = request.nextUrl.searchParams.get("assessment_group");
    const studentGroup = request.nextUrl.searchParams.get("student_group");

    if (!student || !assessmentGroup || !studentGroup) {
      return NextResponse.json(
        { error: "student, assessment_group, and student_group params required" },
        { status: 400 },
      );
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    // Fetch Student info
    const studentRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(student)}?fields=["name","student_name","custom_branch"]`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const studentData = studentRes.ok ? (await studentRes.json()).data : null;

    // Fetch Student Group info
    const sgRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Group/${encodeURIComponent(studentGroup)}?fields=["name","program","academic_year","custom_branch"]`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const sgData = sgRes.ok ? (await sgRes.json()).data : null;

    // Fetch all plans for this batch + exam group
    const plansRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Plan?${new URLSearchParams({
        filters: JSON.stringify([
          ["student_group", "=", studentGroup],
          ["assessment_group", "=", assessmentGroup],
          ["docstatus", "=", 1],
        ]),
        fields: JSON.stringify(["name", "course", "maximum_assessment_score"]),
        limit_page_length: "100",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const plans: { name: string; course: string; maximum_assessment_score: number }[] =
      plansRes.ok ? ((await plansRes.json()).data ?? []) : [];

    if (plans.length === 0) {
      return NextResponse.json({ error: "No exams found for this batch and exam group" }, { status: 404 });
    }

    const planNames = plans.map((p) => p.name);

    // Fetch ALL results for these plans (all students, for ranking)
    const allResultsRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
        filters: JSON.stringify([
          ["assessment_plan", "in", planNames],
          ["docstatus", "=", 1],
        ]),
        fields: JSON.stringify([
          "name", "student", "student_name", "course",
          "total_score", "maximum_score", "grade",
        ]),
        limit_page_length: "2000",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const allResults: {
      student: string; student_name: string; course: string;
      total_score: number; maximum_score: number; grade: string;
    }[] = allResultsRes.ok ? ((await allResultsRes.json()).data ?? []) : [];

    // Grading scale
    const gsRes = await fetch(
      `${FRAPPE_URL}/api/resource/Grading%20Scale/SmartUp%20Grading%20Scale`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const gs = gsRes.ok ? (await gsRes.json()).data : null;
    const intervals: { grade_code: string; threshold: number }[] =
      gs?.intervals?.sort((a: { threshold: number }, b: { threshold: number }) => b.threshold - a.threshold) ?? [];

    function getGrade(percentage: number): string {
      for (const iv of intervals) {
        if (percentage >= iv.threshold) return iv.grade_code;
      }
      return intervals[intervals.length - 1]?.grade_code ?? "";
    }

    // Group by student for ranking
    const studentMap = new Map<string, { total: number; max: number }>();
    for (const r of allResults) {
      const prev = studentMap.get(r.student) ?? { total: 0, max: 0 };
      prev.total += r.total_score;
      prev.max += r.maximum_score;
      studentMap.set(r.student, prev);
    }

    // Sort all students by percentage for ranking
    const allStudentPcts = Array.from(studentMap.entries())
      .map(([s, v]) => ({ student: s, pct: v.max > 0 ? (v.total / v.max) * 100 : 0 }))
      .sort((a, b) => b.pct - a.pct);

    // Assign ranks
    let rank = 0;
    let prevPct = -1;
    for (let i = 0; i < allStudentPcts.length; i++) {
      if (allStudentPcts[i].pct !== prevPct) {
        rank = i + 1;
        prevPct = allStudentPcts[i].pct;
      }
      allStudentPcts[i] = { ...allStudentPcts[i], student: allStudentPcts[i].student } as typeof allStudentPcts[0] & { rank?: number };
      if (allStudentPcts[i].student === student) {
        // found our student's rank
      }
    }

    const studentRankEntry = allStudentPcts.findIndex((s) => s.student === student);
    let studentRank = 0;
    if (studentRankEntry >= 0) {
      let r = 1;
      let pp = -1;
      for (let i = 0; i <= studentRankEntry; i++) {
        if (allStudentPcts[i].pct !== pp) {
          r = i + 1;
          pp = allStudentPcts[i].pct;
        }
      }
      studentRank = r;
    }

    // Build this student's subjects
    const myResults = allResults.filter((r) => r.student === student);
    const subjects = myResults.map((r) => {
      const maxScore = r.maximum_score || 0;
      const pct = maxScore > 0 ? Math.round((r.total_score / maxScore) * 100 * 10) / 10 : 0;
      return {
        course: r.course,
        score: r.total_score,
        maximum_score: maxScore,
        percentage: pct,
        grade: r.grade || getGrade(pct),
        passed: pct >= 33,
      };
    });

    const totalScore = subjects.reduce((s, sub) => s + sub.score, 0);
    const totalMax = subjects.reduce((s, sub) => s + sub.maximum_score, 0);
    const overallPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100 * 10) / 10 : 0;

    return NextResponse.json({
      data: {
        student,
        student_name: studentData?.student_name ?? myResults[0]?.student_name ?? student,
        program: sgData?.program ?? "",
        student_group: studentGroup,
        assessment_group: assessmentGroup,
        academic_year: sgData?.academic_year ?? "",
        branch: sgData?.custom_branch ?? studentData?.custom_branch ?? "",
        subjects,
        total_score: totalScore,
        total_maximum: totalMax,
        overall_percentage: overallPct,
        overall_grade: getGrade(overallPct),
        rank: studentRank,
        total_students: allStudentPcts.length,
        passed: subjects.every((s) => s.passed),
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[exams/report-card] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
