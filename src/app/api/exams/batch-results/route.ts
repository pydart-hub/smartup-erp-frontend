import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/exams/batch-results?student_group=X&assessment_group=Y
 *
 * Returns batch-wide results with ranks for a given exam group.
 * Aggregates all subject scores per student, computes percentage, grade, rank.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const studentGroup = request.nextUrl.searchParams.get("student_group");
    const assessmentGroup = request.nextUrl.searchParams.get("assessment_group");

    if (!studentGroup || !assessmentGroup) {
      return NextResponse.json(
        { error: "student_group and assessment_group params required" },
        { status: 400 },
      );
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    // Fetch all Assessment Plans for this batch + exam group
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

    if (!plansRes.ok) {
      return NextResponse.json({ error: "Failed to fetch plans" }, { status: plansRes.status });
    }

    const plans: { name: string; course: string; maximum_assessment_score: number }[] =
      (await plansRes.json()).data ?? [];

    if (plans.length === 0) {
      return NextResponse.json({ data: [], summary: { total_students: 0, pass_count: 0, pass_rate: 0, average_percentage: 0, highest_percentage: 0, lowest_percentage: 0 } });
    }

    // Fetch all Assessment Results for these plans
    const planNames = plans.map((p) => p.name);
    const resultsRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
        filters: JSON.stringify([
          ["assessment_plan", "in", planNames],
          ["docstatus", "=", 1],
        ]),
        fields: JSON.stringify([
          "name", "student", "student_name", "assessment_plan",
          "course", "total_score", "maximum_score", "grade",
        ]),
        limit_page_length: "2000",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );

    if (!resultsRes.ok) {
      return NextResponse.json({ error: "Failed to fetch results" }, { status: resultsRes.status });
    }

    const results: {
      student: string; student_name: string; assessment_plan: string;
      course: string; total_score: number; maximum_score: number; grade: string;
    }[] = (await resultsRes.json()).data ?? [];

    // Fetch grading scale for grade calculation
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

    // Group results by student
    const studentMap = new Map<string, {
      student: string;
      student_name: string;
      subjects: { course: string; score: number; maximum_score: number; percentage: number; grade: string; passed: boolean }[];
    }>();

    for (const r of results) {
      if (!studentMap.has(r.student)) {
        studentMap.set(r.student, {
          student: r.student,
          student_name: r.student_name || r.student,
          subjects: [],
        });
      }
      const entry = studentMap.get(r.student)!;
      const maxScore = r.maximum_score || 0;
      const percentage = maxScore > 0 ? Math.round((r.total_score / maxScore) * 100 * 10) / 10 : 0;
      entry.subjects.push({
        course: r.course,
        score: r.total_score,
        maximum_score: maxScore,
        percentage,
        grade: r.grade || getGrade(percentage),
        passed: percentage >= 33,
      });
    }

    // Compute aggregated results
    const aggregated = Array.from(studentMap.values()).map((s) => {
      const totalScore = s.subjects.reduce((sum, sub) => sum + sub.score, 0);
      const totalMax = s.subjects.reduce((sum, sub) => sum + sub.maximum_score, 0);
      const overallPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100 * 10) / 10 : 0;
      const passed = s.subjects.every((sub) => sub.passed);

      return {
        student: s.student,
        student_name: s.student_name,
        subjects: s.subjects,
        total_score: totalScore,
        total_maximum: totalMax,
        overall_percentage: overallPct,
        overall_grade: getGrade(overallPct),
        passed,
      };
    });

    // Sort by overall percentage DESC and assign ranks
    aggregated.sort((a, b) => b.overall_percentage - a.overall_percentage);

    let currentRank = 1;
    const ranked = aggregated.map((r, i) => {
      if (i > 0 && r.overall_percentage < aggregated[i - 1].overall_percentage) {
        currentRank = i + 1;
      }
      return { ...r, rank: currentRank };
    });

    // Summary
    const passCount = ranked.filter((r) => r.passed).length;
    const percentages = ranked.map((r) => r.overall_percentage);
    const avgPct = percentages.length > 0
      ? Math.round((percentages.reduce((a, b) => a + b, 0) / percentages.length) * 10) / 10
      : 0;

    return NextResponse.json({
      data: ranked,
      summary: {
        total_students: ranked.length,
        pass_count: passCount,
        pass_rate: ranked.length > 0 ? Math.round((passCount / ranked.length) * 100 * 10) / 10 : 0,
        average_percentage: avgPct,
        highest_percentage: percentages.length > 0 ? Math.max(...percentages) : 0,
        lowest_percentage: percentages.length > 0 ? Math.min(...percentages) : 0,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[exams/batch-results] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
