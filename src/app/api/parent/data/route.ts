import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/parent/data
 *
 * Admin-backed API that fetches ALL parent-facing data in one call.
 *
 * Flow:
 *   1. Parse session cookie → get email
 *   2. Find Guardian by email_address
 *   3. Find Students via "Student Guardian" child table (singular doctype name)
 *   4. For each student, fetch Program Enrollment (program + batch info)
 *   5. For each student, fetch Attendance (current month, submitted)
 *   6. For each student, fetch Sales Orders (via customer)
 *   7. For each student, fetch Sales Invoices (via student field or customer)
 *
 * Returns:
 *   { guardian, children, enrollments, attendance, fees, salesOrders, salesInvoices }
 */

// -- Helper: build Frappe list URL -------------------------------------------
function frappeListUrl(
  doctype: string,
  filters: unknown[][],
  fields: string[],
  opts?: { limit?: number; orderBy?: string }
): string {
  const params = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: JSON.stringify(fields),
    limit_page_length: String(opts?.limit ?? 100),
  });
  if (opts?.orderBy) params.set("order_by", opts.orderBy);
  return `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`;
}

// -- Helper: safe fetch that returns [] on failure ---------------------------
async function safeFetch<T = unknown>(
  url: string,
  headers: Record<string, string>
): Promise<T[]> {
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) {
      console.error(`[parent/data] Frappe ${res.status} for ${url}`);
      return [];
    }
    const json = await res.json();
    return json?.data ?? [];
  } catch (err) {
    console.error("[parent/data] fetch error:", err);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let email: string;
    try {
      const sessionData = JSON.parse(
        Buffer.from(sessionCookie.value, "base64").toString()
      );
      email = sessionData.email;
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: "No email in session" }, { status: 400 });
    }

    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const headers = {
      Authorization: adminAuth,
      "Content-Type": "application/json",
    };

    const emptyResult = {
      guardian: null,
      children: [],
      enrollments: {},
      attendance: {},
      fees: {},
      salesOrders: {},
      salesInvoices: {},
      feeStructures: {},
      paymentEntries: {},
    };

    // ── 1. Find Guardian by email ────────────────────────────────
    // Multiple Guardian records may exist for the same email (e.g. from retry
    // attempts during admission). Fetch ALL of them and scan each one for students.
    const guardians = await safeFetch<{
      name: string;
      guardian_name: string;
      email_address: string;
      mobile_number: string;
    }>(
      frappeListUrl(
        "Guardian",
        [["email_address", "=", email]],
        ["name", "guardian_name", "email_address", "mobile_number"],
        { limit: 20 }
      ),
      headers
    );

    if (guardians.length === 0) {
      console.warn(`[parent/data] No Guardian found for email: ${email}`);
      return NextResponse.json(emptyResult);
    }
    console.log(`[parent/data] Found ${guardians.length} guardian(s) for email: ${email}:`, guardians.map(g => g.name).join(", "));

    // Use the first guardian as the "primary" for display/return purposes
    const guardian = guardians[0];
    const guardianIds = guardians.map((g) => g.name);

    // ── 2. Find Students linked to any of these Guardians ────────
    // Try both child-table doctype names — Frappe Education uses "Student Guardian"
    // (singular) but some installations store it as "Student Guardians" (plural).
    let children: ({
      name: string;
      student_name: string;
      first_name: string;
      custom_branch: string;
      custom_branch_abbr: string;
      custom_srr_id: string;
      customer: string;
      student_email_id: string;
      student_mobile_number: string;
      custom_parent_name: string;
      joining_date: string;
      enabled: number;
    })[] = [];

    const studentFields = [
      "name", "student_name", "first_name",
      "custom_branch", "custom_branch_abbr", "custom_srr_id",
      "customer", "student_email_id", "student_mobile_number",
      "custom_parent_name", "joining_date", "enabled",
    ];

    // First try the singular form (standard Frappe Education)
    children = await safeFetch(
      frappeListUrl(
        "Student",
        [["Student Guardian", "guardian", "in", guardianIds]],
        studentFields,
        { limit: 20 }
      ),
      headers
    );
    console.log(`[parent/data] Student lookup (singular, ${guardianIds.length} guardians) returned ${children.length} children`);

    // Fallback: try plural form
    if (children.length === 0) {
      children = await safeFetch(
        frappeListUrl(
          "Student",
          [["Student Guardians", "guardian", "in", guardianIds]],
          studentFields,
          { limit: 20 }
        ),
        headers
      );
      console.log(`[parent/data] Student lookup (plural, ${guardianIds.length} guardians) returned ${children.length} children`);
    }

    // Last-resort fallback: search by guardian_name text on the Student doctype
    if (children.length === 0) {
      children = await safeFetch(
        frappeListUrl(
          "Student",
          [["custom_parent_name", "=", guardian.guardian_name]],
          studentFields,
          { limit: 20 }
        ),
        headers
      );
      console.log(`[parent/data] Student lookup (custom_parent_name) returned ${children.length} children`);
    }

    if (children.length === 0) {
      console.warn(`[parent/data] No students found for guardian(s): ${guardianIds.join(", ")} (${guardian.guardian_name})`);
      return NextResponse.json({ ...emptyResult, guardian });
    }

    // ── 3. Parallel fetch per-child data ─────────────────────────
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const enrollmentMap: Record<string, unknown[]> = {};
    const attendanceMap: Record<string, unknown[]> = {};
    const feesMap: Record<string, unknown[]> = {};
    const salesOrderMap: Record<string, unknown[]> = {};
    const salesInvoiceMap: Record<string, unknown[]> = {};
    const feeStructureMap: Record<string, unknown[]> = {};
    const paymentEntryMap: Record<string, unknown[]> = {};

    await Promise.all(
      children.map(async (child) => {
        // 3a. Program Enrollment — get program, batch, academic year
        //     Include both submitted (docstatus=1) and draft (docstatus=0) so parents
        //     can see their child's enrollment even if admin hasn't submitted it yet.
        const enrollments = await safeFetch<{ name: string; student: string; student_name: string; program: string; custom_program_abb: string; academic_year: string; student_batch_name: string; enrollment_date: string; custom_fee_structure: string | null; custom_plan: string | null; custom_no_of_instalments: string | null }>(
          frappeListUrl(
            "Program Enrollment",
            [
              ["student", "=", child.name],
              ["docstatus", "in", [0, 1]],
            ],
            [
              "name", "student", "student_name", "program",
              "custom_program_abb", "academic_year",
              "student_batch_name", "enrollment_date",
              "custom_fee_structure", "custom_plan", "custom_no_of_instalments",
            ],
            { limit: 10, orderBy: "enrollment_date desc" }
          ),
          headers
        );
        enrollmentMap[child.name] = enrollments;

        // 3a-ii. Fetch Fee Structure for the latest enrollment
        const latestEnr = enrollments[0];
        if (latestEnr?.program && latestEnr?.academic_year) {
          let fsList: { name: string }[] = [];

          // Best case: enrollment has the exact Fee Structure stored
          if (latestEnr.custom_fee_structure) {
            fsList = [{ name: latestEnr.custom_fee_structure }];
          } else {
            // Fallback: search by program + academic year + company
            // Normalise program name: Fee Structures use "11th State" but enrollments
            // may use "11th Science State". Strip "Science " for the lookup.
            const feeProgram = latestEnr.program.replace(
              /^(\d+(?:st|nd|rd|th))\s+Science\s+(State|CBSE)/i,
              "$1 $2"
            );
            const programsToTry = feeProgram !== latestEnr.program
              ? [feeProgram, latestEnr.program]
              : [latestEnr.program];

            // Filter by the student's company (branch) to narrow results
            const companyFilter: string[][] = child.custom_branch
              ? [["company", "=", child.custom_branch]]
              : [];

            for (const prog of programsToTry) {
              fsList = await safeFetch<{ name: string }>(
                frappeListUrl(
                  "Fee Structure",
                  [
                    ["program", "=", prog],
                    ["academic_year", "=", latestEnr.academic_year],
                    ...companyFilter,
                  ],
                  ["name", "program", "academic_year", "total_amount", "company"],
                  { limit: 5 }
                ),
                headers
              );
              if (fsList.length > 0) break;
            }
          }
          // Fetch full docs to get the components child table
          const fullDocs = await Promise.all(
            fsList.map(async (fs) => {
              try {
                const res = await fetch(
                  `${FRAPPE_URL}/api/resource/Fee%20Structure/${encodeURIComponent(fs.name)}`,
                  { headers, cache: "no-store" }
                );
                if (!res.ok) return fs;
                const json = await res.json();
                return json?.data ?? fs;
              } catch {
                return fs;
              }
            })
          );
          feeStructureMap[child.name] = fullDocs.filter(Boolean) as unknown[];
        } else {
          feeStructureMap[child.name] = [];
        }

        // 3b. Attendance (current month, submitted only)
        attendanceMap[child.name] = await safeFetch(
          frappeListUrl(
            "Attendance",
            [
              ["student", "=", child.name],
              ["attendance_date", ">=", monthStart],
              ["docstatus", "=", 1],
            ],
            ["name", "status", "attendance_date"],
            { limit: 50, orderBy: "attendance_date desc" }
          ),
          headers
        );

        // 3c. Fees doctype (per student) — may be empty
        feesMap[child.name] = await safeFetch(
          frappeListUrl(
            "Fees",
            [["student", "=", child.name]],
            [
              "name", "student", "student_name", "program",
              "posting_date", "due_date", "grand_total",
              "outstanding_amount", "docstatus", "fee_structure",
            ],
            { limit: 50, orderBy: "posting_date desc" }
          ),
          headers
        );

        // 3d. Sales Orders — filter by customer (Frappe auto-creates
        //     a Customer linked to the Student on student save)
        if (child.customer) {
          salesOrderMap[child.name] = await safeFetch(
            frappeListUrl(
              "Sales Order",
              [
                ["customer", "=", child.customer],
                ["docstatus", "=", 1],
              ],
              [
                "name", "customer", "customer_name", "transaction_date",
                "delivery_date", "grand_total", "status",
                "per_billed", "advance_paid",
                "custom_academic_year", "student",
                "custom_no_of_instalments", "custom_plan",
              ],
              { limit: 50, orderBy: "transaction_date desc" }
            ),
            headers
          );

          // 3e. Sales Invoices — filter by customer, submitted
          salesInvoiceMap[child.name] = await safeFetch(
            frappeListUrl(
              "Sales Invoice",
              [
                ["customer", "=", child.customer],
                ["docstatus", "=", 1],
              ],
              [
                "name", "customer", "customer_name", "posting_date",
                "due_date", "grand_total", "outstanding_amount",
                "status", "student",
              ],
              { limit: 50, orderBy: "posting_date desc" }
            ),
            headers
          );

          // 3f. Payment Entries — submitted payments by customer
          paymentEntryMap[child.name] = await safeFetch(
            frappeListUrl(
              "Payment Entry",
              [
                ["party_type", "=", "Customer"],
                ["party", "=", child.customer],
                ["docstatus", "=", 1],
              ],
              [
                "name", "posting_date", "paid_amount", "mode_of_payment",
                "reference_no", "party_name",
              ],
              { limit: 50, orderBy: "posting_date desc" }
            ),
            headers
          );
        } else {
          salesOrderMap[child.name] = [];
          salesInvoiceMap[child.name] = [];
          paymentEntryMap[child.name] = [];
        }
      })
    );

    return NextResponse.json({
      guardian,
      children,
      enrollments: enrollmentMap,
      attendance: attendanceMap,
      fees: feesMap,
      salesOrders: salesOrderMap,
      salesInvoices: salesInvoiceMap,
      feeStructures: feeStructureMap,
      paymentEntries: paymentEntryMap,
    });
  } catch (error: unknown) {
    console.error("[parent/data] Unexpected error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
