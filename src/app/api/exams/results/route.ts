import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/exams/results?assessment_plan=X
 *
 * Returns all submitted Assessment Results for a given Assessment Plan.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const assessmentPlan = request.nextUrl.searchParams.get("assessment_plan");
    if (!assessmentPlan) {
      return NextResponse.json({ error: "assessment_plan param required" }, { status: 400 });
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    const res = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
        filters: JSON.stringify([
          ["assessment_plan", "=", assessmentPlan],
          ["docstatus", "=", 1],
        ]),
        fields: JSON.stringify([
          "name", "student", "student_name", "total_score",
          "maximum_score", "grade", "course", "assessment_group",
        ]),
        limit_page_length: "500",
        order_by: "total_score desc",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch results" }, { status: res.status });
    }

    const json = await res.json();
    return NextResponse.json({ data: json.data ?? [] });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[exams/results] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
