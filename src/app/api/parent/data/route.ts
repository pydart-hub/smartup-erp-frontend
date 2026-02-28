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
    };

    // ── 1. Find Guardian by email ────────────────────────────────
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
        { limit: 1 }
      ),
      headers
    );
    const guardian = guardians[0] ?? null;

    if (!guardian) {
      console.warn(`[parent/data] No Guardian found for email: ${email}`);
      return NextResponse.json(emptyResult);
    }

    // ── 2. Find Students linked to this Guardian ─────────────────
    // IMPORTANT: Child table doctype is "Student Guardian" (singular),
    //            NOT "Student Guardians" (plural).
    const children = await safeFetch<{
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
    }>(
      frappeListUrl(
        "Student",
        [["Student Guardian", "guardian", "=", guardian.name]],
        [
          "name", "student_name", "first_name",
          "custom_branch", "custom_branch_abbr", "custom_srr_id",
          "customer", "student_email_id", "student_mobile_number",
          "custom_parent_name", "joining_date", "enabled",
        ],
        { limit: 20 }
      ),
      headers
    );

    if (children.length === 0) {
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

    await Promise.all(
      children.map(async (child) => {
        // 3a. Program Enrollment — get program, batch, academic year
        //     (These fields do NOT exist on Student, only on Program Enrollment)
        enrollmentMap[child.name] = await safeFetch(
          frappeListUrl(
            "Program Enrollment",
            [
              ["student", "=", child.name],
              ["docstatus", "=", 1],
            ],
            [
              "name", "student", "student_name", "program",
              "custom_program_abb", "academic_year",
              "student_batch_name", "enrollment_date",
            ],
            { limit: 10, orderBy: "enrollment_date desc" }
          ),
          headers
        );

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
        } else {
          salesOrderMap[child.name] = [];
          salesInvoiceMap[child.name] = [];
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
    });
  } catch (error: unknown) {
    console.error("[parent/data] Unexpected error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
