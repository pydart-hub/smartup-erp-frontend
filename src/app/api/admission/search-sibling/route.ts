import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/admission/search-sibling?q=<query>&branch=<optional>
 *
 * Searches existing students by name, SRR ID, or guardian phone.
 * Used by the Siblings Admission flow to pick an existing sibling.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const branch = request.nextUrl.searchParams.get("branch");

  if (!q || q.length < 2) {
    return NextResponse.json({ data: [] });
  }

  const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
  const headers: Record<string, string> = {
    Authorization: adminAuth,
    "Content-Type": "application/json",
  };

  const studentFields = JSON.stringify([
    "name", "student_name", "custom_srr_id", "custom_branch",
    "custom_branch_abbr", "student_email_id", "student_mobile_number",
    "custom_parent_name", "customer", "enabled",
  ]);

  // Search by student_name OR custom_srr_id
  const orFilters = JSON.stringify([
    ["student_name", "like", `%${q}%`],
    ["custom_srr_id", "like", `%${q}%`],
  ]);

  const filters: string[][] = [["enabled", "=", "1"]];
  if (branch) filters.push(["custom_branch", "=", branch]);

  const params = new URLSearchParams({
    fields: studentFields,
    or_filters: orFilters,
    filters: JSON.stringify(filters),
    limit_page_length: "15",
    order_by: "student_name asc",
  });

  try {
    const res = await fetch(
      `${FRAPPE_URL}/api/resource/Student?${params}`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) {
      console.error("[search-sibling] Frappe error:", res.status);
      return NextResponse.json({ data: [] });
    }
    const json = await res.json();
    const students = json?.data ?? [];

    // For each student, fetch their latest Program Enrollment to show class info  
    const enriched = await Promise.all(
      students.map(async (s: Record<string, unknown>) => {
        try {
          const peParams = new URLSearchParams({
            fields: JSON.stringify(["program", "academic_year", "student_batch_name"]),
            filters: JSON.stringify([["student", "=", s.name], ["docstatus", "in", [0, 1]]]),
            limit_page_length: "1",
            order_by: "enrollment_date desc",
          });
          const peRes = await fetch(
            `${FRAPPE_URL}/api/resource/Program%20Enrollment?${peParams}`,
            { headers, cache: "no-store" }
          );
          if (peRes.ok) {
            const peJson = await peRes.json();
            const pe = peJson?.data?.[0];
            if (pe) {
              return { ...s, program: pe.program, academic_year: pe.academic_year, batch: pe.student_batch_name };
            }
          }
        } catch { /* ignore */ }
        return s;
      })
    );

    return NextResponse.json({ data: enriched });
  } catch (err) {
    console.error("[search-sibling] Error:", err);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
