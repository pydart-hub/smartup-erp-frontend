import { NextRequest, NextResponse } from "next/server";
import { frappeAdminGet } from "@/lib/server/frappeAdmin";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("smartup_session")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const exam = searchParams.get("exam") || "CWC 1";

  try {
    // 1. Fetch CWC Assessment Plans
    const plansRes = await frappeAdminGet("resource/Assessment Plan", {
      fields: JSON.stringify([
        "name",
        "student_group",
        "assessment_name",
        "assessment_group",
        "course",
        "maximum_assessment_score",
        "custom_branch",
      ]),
      filters: JSON.stringify([
        ["docstatus", "=", 1],
        ["assessment_group", "like", "%CWC%"],
      ]),
      limit_page_length: "2000",
    });

    const allCwcPlans: any[] = plansRes.data || [];

    // Filter plans specifically for the requested exam (e.g., "CWC 1")
    const match = exam.toLowerCase().match(/cwc\s*(?:exam\s*)?(\d+)/);
    const cwcNum = match ? match[1] : "";

    const filteredPlans = allCwcPlans.filter((plan: any) => {
      const ag = (plan.assessment_group || "").toLowerCase();
      const an = (plan.assessment_name || "").toLowerCase();
      if (cwcNum) {
        const targetRegex = new RegExp(`cwc\\s*(?:exam\\s*)?${cwcNum}\\b`, "i");
        return targetRegex.test(ag) || targetRegex.test(an);
      }
      return ag.includes("cwc") || an.includes("cwc");
    });

    const planNames = filteredPlans.map((p: any) => p.name);

    if (planNames.length === 0) {
      return NextResponse.json({
        plans: [],
        results: [],
        count: 0,
      });
    }

    // 2. Fetch Assessment Results in chunks of 80 to prevent query string URL overflow in Frappe
    const chunkSize = 80;
    const allResults: any[] = [];

    for (let i = 0; i < planNames.length; i += chunkSize) {
      const chunk = planNames.slice(i, i + chunkSize);
      const resultsRes = await frappeAdminGet("resource/Assessment Result", {
        fields: JSON.stringify([
          "name",
          "student",
          "student_name",
          "assessment_plan",
          "total_score",
          "maximum_score",
          "course",
        ]),
        filters: JSON.stringify([
          ["docstatus", "=", 1],
          ["assessment_plan", "in", chunk],
        ]),
        limit_page_length: "10000",
      });

      if (resultsRes.data && Array.isArray(resultsRes.data)) {
        allResults.push(...resultsRes.data);
      }
    }

    return NextResponse.json({
      plans: filteredPlans,
      results: allResults,
      count: allResults.length,
    });
  } catch (error: any) {
    console.error("CWC Ranking API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
