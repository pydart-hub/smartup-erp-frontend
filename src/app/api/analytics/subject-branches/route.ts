import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/analytics/subject-branches?program=X&subject=X
 *
 * Cross-branch comparison for a specific subject within a program.
 * Level 4 of the class-first hierarchy.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const program = request.nextUrl.searchParams.get("program");
    const subject = request.nextUrl.searchParams.get("subject");
    if (!program || !subject) {
      return NextResponse.json(
        { error: "program and subject params required" },
        { status: 400 },
      );
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    // 1. Get company name map
    const companiesRes = await fetch(
      `${FRAPPE_URL}/api/resource/Company?${new URLSearchParams({
        filters: JSON.stringify([["is_group", "=", 0]]),
        fields: JSON.stringify(["name", "company_name"]),
        limit_page_length: "50",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const companies: { name: string; company_name: string }[] =
      companiesRes.ok ? (await companiesRes.json()).data ?? [] : [];
    const companyNameMap = new Map(companies.map((c) => [c.name, c.company_name]));

    // 2. Batches for this program
    const sgRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Group?${new URLSearchParams({
        filters: JSON.stringify([
          ["program", "=", program],
          ["group_based_on", "=", "Batch"],
          ["disabled", "=", 0],
        ]),
        fields: JSON.stringify(["name", "custom_branch"]),
        limit_page_length: "200",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const batches: { name: string; custom_branch: string }[] =
      sgRes.ok ? (await sgRes.json()).data ?? [] : [];

    if (batches.length === 0) {
      return NextResponse.json({
        program,
        subject,
        branches: [],
        overall: { total_students: 0, avg_score_pct: 0, pass_rate: 0 },
      });
    }

    const batchNames = batches.map((b) => b.name);
    const batchToBranch = new Map(batches.map((b) => [b.name, b.custom_branch]));

    // 3. Assessment plans for this subject in these batches
    const plansRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Plan?${new URLSearchParams({
        filters: JSON.stringify([
          ["student_group", "in", batchNames],
          ["course", "=", subject],
          ["docstatus", "=", 1],
        ]),
        fields: JSON.stringify(["name", "student_group"]),
        limit_page_length: "500",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const plans: { name: string; student_group: string }[] =
      plansRes.ok ? (await plansRes.json()).data ?? [] : [];

    if (plans.length === 0) {
      return NextResponse.json({
        program,
        subject,
        branches: [],
        overall: { total_students: 0, avg_score_pct: 0, pass_rate: 0 },
      });
    }

    const planNames = plans.map((p) => p.name);
    const planLookup = new Map(plans.map((p) => [p.name, p]));

    // 4. Results for this subject
    const resultsRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
        filters: JSON.stringify([
          ["assessment_plan", "in", planNames],
          ["docstatus", "=", 1],
        ]),
        fields: JSON.stringify(["student", "total_score", "maximum_score", "assessment_plan"]),
        limit_page_length: "5000",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const results: {
      student: string;
      total_score: number;
      maximum_score: number;
      assessment_plan: string;
    }[] = resultsRes.ok ? (await resultsRes.json()).data ?? [] : [];

    // 5. Aggregate per branch
    const branchData = new Map<string, { scores: number[]; maxs: number[] }>();
    for (const r of results) {
      const plan = planLookup.get(r.assessment_plan);
      if (!plan) continue;
      const branch = batchToBranch.get(plan.student_group);
      if (!branch) continue;
      if (!branchData.has(branch)) branchData.set(branch, { scores: [], maxs: [] });
      branchData.get(branch)!.scores.push(r.total_score);
      branchData.get(branch)!.maxs.push(r.maximum_score);
    }

    const branchResults = Array.from(branchData.entries())
      .map(([branch, d]) => {
        const total = d.scores.length;
        const maxPossible = d.maxs.length > 0 ? Math.max(...d.maxs) : 0;
        const avgScore = total > 0 ? d.scores.reduce((a, b) => a + b, 0) / total : 0;
        const avgPct =
          maxPossible > 0 ? Math.round((avgScore / maxPossible) * 1000) / 10 : 0;
        const passed = d.scores.filter(
          (s, i) => d.maxs[i] > 0 && (s / d.maxs[i]) * 100 >= 33,
        ).length;
        return {
          branch,
          branch_name: companyNameMap.get(branch) ?? branch,
          total_students: total,
          avg_score_pct: avgPct,
          pass_rate: total > 0 ? Math.round((passed / total) * 1000) / 10 : 0,
          avg_score: Math.round(avgScore * 10) / 10,
          maximum_possible: maxPossible,
        };
      })
      .sort((a, b) => b.avg_score_pct - a.avg_score_pct);

    const allPcts = results
      .filter((r) => r.maximum_score > 0)
      .map((r) => (r.total_score / r.maximum_score) * 100);
    const overall = {
      total_students: results.length,
      avg_score_pct:
        allPcts.length > 0
          ? Math.round((allPcts.reduce((a, b) => a + b, 0) / allPcts.length) * 10) / 10
          : 0,
      pass_rate:
        allPcts.length > 0
          ? Math.round((allPcts.filter((p) => p >= 33).length / allPcts.length) * 1000) / 10
          : 0,
    };

    return NextResponse.json({ program, subject, branches: branchResults, overall });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[analytics/subject-branches] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
