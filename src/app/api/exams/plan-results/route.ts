import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/exams/plan-results?assessment_plan=X
 *
 * Returns ranked, graded results for a single Assessment Plan.
 * Includes per-student breakdown with pass/fail status and classifications.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const planName = request.nextUrl.searchParams.get("assessment_plan");
    if (!planName) {
      return NextResponse.json({ error: "assessment_plan param required" }, { status: 400 });
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    // 1. Fetch the plan details
    const planRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Plan/${encodeURIComponent(planName)}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    if (!planRes.ok) {
      return NextResponse.json({ error: "Assessment plan not found" }, { status: 404 });
    }
    const plan = (await planRes.json()).data as {
      name: string;
      course: string;
      student_group: string;
      program: string;
      assessment_group: string;
      schedule_date: string;
      from_time: string;
      to_time: string;
      maximum_assessment_score: number;
      custom_branch: string;
      examiner_name?: string;
    };

    // 2. Fetch all submitted results for this plan
    const resultsRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
        filters: JSON.stringify([
          ["assessment_plan", "=", planName],
          ["docstatus", "=", 1],
        ]),
        fields: JSON.stringify([
          "name", "student", "student_name", "total_score", "maximum_score", "grade",
        ]),
        limit_page_length: "500",
        order_by: "total_score desc",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const rawResults: {
      student: string; student_name: string; total_score: number;
      maximum_score: number; grade: string;
    }[] = resultsRes.ok ? (await resultsRes.json()).data ?? [] : [];

    // 3. Fetch grading scale
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

    // 4. Sort by score desc and assign ranks (ties = same rank)
    const sorted = [...rawResults].sort((a, b) => b.total_score - a.total_score);
    const maxScore = plan.maximum_assessment_score;

    let currentRank = 1;
    const data = sorted.map((r, i) => {
      if (i > 0 && r.total_score < sorted[i - 1].total_score) currentRank = i + 1;
      const pct = maxScore > 0 ? Math.round((r.total_score / maxScore) * 100 * 10) / 10 : 0;
      const grade = r.grade || getGrade(pct);
      return {
        student: r.student,
        student_name: r.student_name || r.student,
        score: r.total_score,
        maximum_score: maxScore,
        percentage: pct,
        grade,
        passed: pct >= 33,
        rank: currentRank,
      };
    });

    // 5. Summary
    const passCount = data.filter((d) => d.passed).length;
    const pcts = data.map((d) => d.percentage);
    const summary = {
      total_students: data.length,
      pass_count: passCount,
      fail_count: data.length - passCount,
      pass_rate: data.length > 0 ? Math.round((passCount / data.length) * 100 * 10) / 10 : 0,
      average_percentage: pcts.length > 0 ? Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10 : 0,
      highest_percentage: pcts.length > 0 ? Math.max(...pcts) : 0,
      lowest_percentage: pcts.length > 0 ? Math.min(...pcts) : 0,
    };

    return NextResponse.json({ plan, data, summary });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[exams/plan-results] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
