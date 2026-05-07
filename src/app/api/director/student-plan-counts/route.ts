import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

const ALLOWED_ROLES = ["Administrator", "Director", "Management", "General Manager"];

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let sessionData: { roles?: string[] };
  try {
    sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const roles = sessionData.roles ?? [];
  if (!ALLOWED_ROLES.some((r) => roles.includes(r))) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

  try {
    const params = new URLSearchParams({
      fields: JSON.stringify(["custom_plan as plan", "student_category", "count(name) as count"]),
      filters: JSON.stringify([["docstatus", "=", 1]]),
      group_by: "custom_plan,student_category",
      limit_page_length: "0",
    });

    const res = await fetch(
      `${FRAPPE_URL}/api/resource/Program%20Enrollment?${params}`,
      {
        headers: { Authorization: adminAuth, Accept: "application/json" },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      throw new Error(`Frappe ${res.status}`);
    }

    const json = await res.json();
    const rows: Array<{ plan?: string; student_category?: string; count?: number }> = json?.data ?? [];

    const result = { advanced: 0, intermediate: 0, basic: 0, freeAccess: 0, demo: 0 };
    for (const row of rows) {
      if ((row.student_category || "").toLowerCase().trim() === "free access") {
        result.freeAccess += Number(row.count ?? 0);
        continue;
      }
      if ((row.student_category || "").toLowerCase().trim() === "demo") {
        result.demo += Number(row.count ?? 0);
        continue;
      }

      const plan = (row.plan || "").toLowerCase().trim();
      const count = Number(row.count ?? 0);
      if (plan === "advanced") result.advanced = count;
      else if (plan === "intermediate") result.intermediate = count;
      else if (plan === "basic") result.basic = count;
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[student-plan-counts] Error:", err);
    return NextResponse.json({ advanced: 0, intermediate: 0, basic: 0, freeAccess: 0, demo: 0 });
  }
}
