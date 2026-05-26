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
    // ── Step 1: fetch ALL active student IDs ─────────────────────────────
    const studentParams = new URLSearchParams({
      fields: JSON.stringify(["name"]),
      filters: JSON.stringify([["enabled", "=", 1]]),
      limit_page_length: "10000",
    });
    const studentRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student?${studentParams}`,
      { headers: { Authorization: adminAuth, Accept: "application/json" }, cache: "no-store" }
    );
    if (!studentRes.ok) throw new Error(`Frappe students ${studentRes.status}`);
    const studentJson = await studentRes.json();
    const allStudentIds: string[] = (studentJson?.data ?? []).map((s: { name: string }) => s.name);
    const totalActive = allStudentIds.length;

    // ── Step 2: fetch PEs in batches of 100 ──────────────────────────────
    const BATCH = 100;
    type PERow = { student: string; custom_plan: string; student_category: string };
    const allEnrollments: PERow[] = [];

    for (let i = 0; i < allStudentIds.length; i += BATCH) {
      const batch = allStudentIds.slice(i, i + BATCH);
      const peParams = new URLSearchParams({
        fields: JSON.stringify(["student", "custom_plan", "student_category"]),
        filters: JSON.stringify([["docstatus", "=", 1], ["student", "in", batch]]),
        order_by: "enrollment_date desc",
        limit_page_length: String(batch.length * 3),
      });
      const peRes = await fetch(
        `${FRAPPE_URL}/api/resource/Program%20Enrollment?${peParams}`,
        { headers: { Authorization: adminAuth, Accept: "application/json" }, cache: "no-store" }
      );
      if (peRes.ok) {
        const peJson = await peRes.json();
        allEnrollments.push(...(peJson?.data ?? []));
      }
    }

    // ── Step 3: deduplicate — only latest PE per student ─────────────────
    const result = { advanced: 0, intermediate: 0, basic: 0, freeAccess: 0, demo: 0, na: 0 };
    const seen = new Set<string>();

    for (const row of allEnrollments) {
      if (seen.has(row.student)) continue;
      seen.add(row.student);

      const cat = (row.student_category || "").toLowerCase().trim();
      if (cat === "free access") { result.freeAccess++; continue; }
      if (cat === "demo")        { result.demo++;        continue; }

      const plan = (row.custom_plan || "").toLowerCase().trim();
      if      (plan === "advanced")     result.advanced++;
      else if (plan === "intermediate") result.intermediate++;
      else if (plan === "basic")        result.basic++;
      else                              result.na++;  // has PE but plan unrecognised/blank
    }

    // Students with no submitted PE at all
    result.na += totalActive - seen.size;

    return NextResponse.json(result);
  } catch (err) {
    console.error("[student-plan-counts] Error:", err);
    return NextResponse.json({ advanced: 0, intermediate: 0, basic: 0, freeAccess: 0, demo: 0, na: 0 });
  }
}
