/**
 * GET /api/admission/demo-conversion-info
 *
 * Returns info needed to power the "Convert Demo to Regular" modal:
 *   - Student details (name, branch, program, enrollment)
 *   - Demo invoice total
 *   - Total amount already paid against the demo invoice (from Payment Entries)
 *
 * Query params:
 *   studentId — Frappe Student name (EDU-STU-YYYY-NNNNN)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const headers = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

async function frappeGet(path: string) {
  const res = await fetch(`${FRAPPE_URL}/api${path}`, { headers });
  if (!res.ok) throw new Error(`Frappe GET ${path} failed: ${res.status} ${res.statusText}`);
  return (await res.json()).data;
}

export async function GET(request: NextRequest) {
  const authResult = requireRole(request, STAFF_ROLES);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  try {
    // 1. Fetch student
    const student = await frappeGet(
      `/resource/Student/${encodeURIComponent(studentId)}`,
    );

    if (student.custom_student_type !== "Demo") {
      return NextResponse.json(
        { error: "Student is not a Demo student" },
        { status: 400 },
      );
    }

    const customerName: string = student.customer;
    if (!customerName) {
      return NextResponse.json(
        { error: "Student has no linked Customer record" },
        { status: 400 },
      );
    }

    // 2. Fetch latest Program Enrollment
    const peFilters = encodeURIComponent(
      JSON.stringify([
        ["student", "=", studentId],
        ["docstatus", "!=", 2],
      ]),
    );
    const peFields = encodeURIComponent(
      JSON.stringify([
        "name", "program", "academic_year", "student_batch_name",
        "enrollment_date", "custom_plan", "custom_no_of_instalments",
        "custom_fee_structure", "docstatus",
      ]),
    );
    const peList = await frappeGet(
      `/resource/Program Enrollment?filters=${peFilters}&fields=${peFields}&order_by=creation+desc&limit_page_length=1`,
    );
    const enrollment = peList?.[0] ?? null;

    // 3. Fetch demo Sales Invoices (all submitted invoices for this customer)
    const invFilters = encodeURIComponent(
      JSON.stringify([
        ["customer", "=", customerName],
        ["docstatus", "=", 1],
      ]),
    );
    const invFields = encodeURIComponent(
      JSON.stringify(["name", "grand_total", "outstanding_amount", "posting_date", "status"]),
    );
    const invoices = await frappeGet(
      `/resource/Sales Invoice?filters=${invFilters}&fields=${invFields}&order_by=posting_date+asc&limit_page_length=20`,
    );

    // 4. Compute total paid = sum(grand_total - outstanding_amount) across all demo invoices
    const totalInvoiced: number = (invoices ?? []).reduce(
      (sum: number, inv: { grand_total: number }) => sum + (inv.grand_total ?? 0),
      0,
    );
    const totalOutstanding: number = (invoices ?? []).reduce(
      (sum: number, inv: { outstanding_amount: number }) => sum + (inv.outstanding_amount ?? 0),
      0,
    );
    const paidAmount = Math.max(0, totalInvoiced - totalOutstanding);

    return NextResponse.json({
      data: {
        studentId,
        studentName: student.student_name,
        branch: student.custom_branch,
        customer: customerName,
        enrollment,
        demoInvoices: invoices ?? [],
        totalInvoiced,
        paidAmount,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[demo-conversion-info]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
