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

    // Build plan filter: if assessmentGroup starts with CWC, match by assessment_group OR assessment_name pattern
    const isCwc = assessmentGroup.toLowerCase().includes("cwc");
    const planFilters: any[] = [
      ["student_group", "=", studentGroup],
      ["docstatus", "=", 1],
    ];

    if (isCwc) {
      // In Frappe API filter, we query all docstatus=1 for student_group and filter by CWC group/name in JS if needed
    } else {
      planFilters.push(["assessment_group", "=", assessmentGroup]);
    }

    // Fetch all Assessment Plans for this batch
    const plansRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Plan?${new URLSearchParams({
        filters: JSON.stringify(planFilters),
        fields: JSON.stringify(["name", "course", "maximum_assessment_score", "assessment_group", "assessment_name"]),
        limit_page_length: "200",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );

    if (!plansRes.ok) {
      return NextResponse.json({ error: "Failed to fetch plans" }, { status: plansRes.status });
    }

    let plans: { name: string; course: string; maximum_assessment_score: number; assessment_group?: string; assessment_name?: string }[] =
      (await plansRes.json()).data ?? [];

    if (isCwc) {
      // Extract specific CWC index/number from assessmentGroup (e.g., "cwc 1", "cwc exam 1", "cwc 2")
      const match = assessmentGroup.toLowerCase().match(/cwc\s*(?:exam\s*)?(\d+)/);
      const cwcNum = match ? match[1] : "";

      plans = plans.filter((p) => {
        const ag = (p.assessment_group || "").toLowerCase();
        const an = (p.assessment_name || "").toLowerCase();
        
        if (cwcNum) {
          // Strict check: must match cwc + specific number (e.g., "cwc 1" or "cwc exam 1")
          const targetRegex = new RegExp(`cwc\\s*(?:exam\\s*)?${cwcNum}\\b`, "i");
          return targetRegex.test(ag) || targetRegex.test(an);
        }
        return ag.includes("cwc") || an.includes("cwc");
      });
    }

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

    // Group results by student, and within student by course to handle multiple plans of the same course
    const studentMap = new Map<string, {
      student: string;
      student_name: string;
      courseMap: Map<string, { course: string; score: number; maximum_score: number }>;
    }>();

    for (const r of results) {
      if (!studentMap.has(r.student)) {
        studentMap.set(r.student, {
          student: r.student,
          student_name: r.student_name || r.student,
          courseMap: new Map(),
        });
      }
      const entry = studentMap.get(r.student)!;
      const prevCourse = entry.courseMap.get(r.course) ?? {
        course: r.course,
        score: 0,
        maximum_score: 0,
      };

      prevCourse.score += r.total_score || 0;
      prevCourse.maximum_score += r.maximum_score || 0;
      entry.courseMap.set(r.course, prevCourse);
    }

    // Compute aggregated results
    const aggregated = Array.from(studentMap.values()).map((s) => {
      const subjects = Array.from(s.courseMap.values()).map((c) => {
        const percentage = c.maximum_score > 0 ? Math.round((c.score / c.maximum_score) * 100 * 10) / 10 : 0;
        return {
          course: c.course,
          score: c.score,
          maximum_score: c.maximum_score,
          percentage,
          grade: getGrade(percentage),
          passed: percentage >= 33,
        };
      });

      const totalScore = subjects.reduce((sum, sub) => sum + sub.score, 0);
      const totalMax = subjects.reduce((sum, sub) => sum + sub.maximum_score, 0);
      const overallPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100 * 10) / 10 : 0;
      const passed = subjects.every((sub) => sub.passed);

      return {
        student: s.student,
        student_name: s.student_name,
        subjects,
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
