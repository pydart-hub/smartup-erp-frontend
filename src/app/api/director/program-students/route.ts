import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/director/program-students?branch=...&program=...
 *
 * Returns student-level fee summary for a given branch + program.
 * Uses admin token server-side to ensure the Director role always has
 * read access to the Student and Program Enrollment doctypes.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let sessionData: {
      default_company?: string;
      allowed_companies?: string[];
      roles?: string[];
    };
    try {
      sessionData = JSON.parse(
        Buffer.from(sessionCookie.value, "base64").toString()
      );
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const branch = sp.get("branch") || "";
    const program = sp.get("program") || "";

    if (!branch || !program) {
      return NextResponse.json(
        { error: "branch and program are required" },
        { status: 400 }
      );
    }

    // Validate that the user is allowed to access this branch
    const allowed = sessionData.allowed_companies ?? [];
    const roles = sessionData.roles ?? [];
    const isAdmin = roles.includes("Administrator");
    if (!isAdmin && allowed.length > 0 && !allowed.includes(branch)) {
      return NextResponse.json(
        { error: "Access denied for this branch" },
        { status: 403 }
      );
    }

    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    const frappeGet = async (path: string, params: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${FRAPPE_URL}/api/${path}?${qs}`, {
        headers: { Authorization: adminAuth, Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Frappe ${path} ${res.status}: ${text.slice(0, 300)}`);
      }
      return res.json();
    };

    // Step 1: fetch students in this branch
    const studentJson = await frappeGet("resource/Student", {
      fields: JSON.stringify(["name", "student_name", "enabled"]),
      filters: JSON.stringify([["custom_branch", "=", branch]]),
      limit_page_length: "500",
    });
    const students: { name: string; student_name: string; enabled: number }[] =
      studentJson?.data ?? [];

    if (!students.length) {
      return NextResponse.json({ data: [] });
    }

    const allStudentNames = students.map((s) => s.name);

    // Step 2: fetch program enrollments for these students
    const enrollJson = await frappeGet("resource/Program Enrollment", {
      fields: JSON.stringify(["student", "program", "enrollment_date"]),
      filters: JSON.stringify([
        ["student", "in", allStudentNames],
        ["docstatus", "=", "1"],
      ]),
      limit_page_length: "1000",
      order_by: "enrollment_date desc",
    });
    const enrollments: { student: string; program: string }[] =
      enrollJson?.data ?? [];

    // Keep only the latest program (order_by desc already handled by Frappe)
    const studentProgram = new Map<string, string>();
    for (const e of enrollments) {
      if (!studentProgram.has(e.student)) studentProgram.set(e.student, e.program);
    }

    const programStudents = students.filter(
      (s) => (studentProgram.get(s.name) ?? "Uncategorized") === program
    );

    if (!programStudents.length) {
      return NextResponse.json({ data: [] });
    }

    const studentIdList = programStudents.map((s) => s.name);

    // Step 3: fetch invoices for these students
    const invJson = await frappeGet("resource/Sales Invoice", {
      fields: JSON.stringify(["student", "customer", "grand_total", "outstanding_amount"]),
      filters: JSON.stringify([
        ["docstatus", "=", "1"],
        ["student", "in", studentIdList],
        ["company", "=", branch],
      ]),
      limit_page_length: "1000",
    });
    const invoices: {
      student: string;
      customer: string;
      grand_total: number;
      outstanding_amount: number;
    }[] = invJson?.data ?? [];

    // Build student → customer mapping from invoices (needed for PE lookup)
    const studentToCustomer = new Map<string, string>();
    for (const inv of invoices) {
      if (inv.student && inv.customer && !studentToCustomer.has(inv.student)) {
        studentToCustomer.set(inv.student, inv.customer);
      }
    }
    const customerList = [...new Set(studentToCustomer.values())];

    // Step 4: fetch Payment Entries to determine payment mode (non-critical)
    // Cash entries have mode_of_payment="Cash"; Razorpay entries have reference_no starting with "pay_"
    const paymentModeMap = new Map<string, string>(); // customer → "Cash" | "Online"
    try {
      if (customerList.length > 0) {
        const peJson = await frappeGet("resource/Payment Entry", {
          fields: JSON.stringify(["party", "mode_of_payment", "reference_no"]),
          filters: JSON.stringify([
            ["docstatus", "=", "1"],
            ["party", "in", customerList],
            ["company", "=", branch],
          ]),
          limit_page_length: "1000",
          order_by: "creation desc",
        });
        const entries: {
          party: string;
          mode_of_payment: string | null;
          reference_no: string | null;
        }[] = peJson?.data ?? [];

        for (const pe of entries) {
          if (!pe.party || paymentModeMap.has(pe.party)) continue;
          if (pe.mode_of_payment && pe.mode_of_payment !== "Online" && pe.mode_of_payment !== "Razorpay") {
            paymentModeMap.set(pe.party, pe.mode_of_payment); // e.g. "Cash", "UPI", "Bank Transfer"
          } else if (pe.reference_no?.startsWith("pay_")) {
            paymentModeMap.set(pe.party, "Online");
          } else if (pe.mode_of_payment) {
            paymentModeMap.set(pe.party, pe.mode_of_payment);
          }
        }
      }
    } catch {
      // Payment mode is non-critical — silently skip
    }

    // Step 5: fetch Sales Orders for fee plan (non-critical)
    const feePlanMap = new Map<string, string>();
    try {
      const soJson = await frappeGet("resource/Sales Order", {
        fields: JSON.stringify(["student", "custom_plan"]),
        filters: JSON.stringify([
          ["docstatus", "=", "1"],
          ["student", "in", studentIdList],
          ["company", "=", branch],
        ]),
        limit_page_length: "1000",
        order_by: "creation desc",
      });
      const salesOrders: {
        student: string;
        custom_plan?: string;
      }[] = soJson?.data ?? [];
      for (const so of salesOrders) {
        if (so.student && so.custom_plan && !feePlanMap.has(so.student)) {
          feePlanMap.set(so.student, so.custom_plan);
        }
      }
    } catch {
      // Fee plan is non-critical — silently skip
    }

    // Aggregate invoices per student
    const aggMap = new Map<
      string,
      { invoiced: number; outstanding: number; count: number }
    >();
    for (const inv of invoices) {
      const existing = aggMap.get(inv.student) ?? {
        invoiced: 0,
        outstanding: 0,
        count: 0,
      };
      aggMap.set(inv.student, {
        invoiced: existing.invoiced + (inv.grand_total ?? 0),
        outstanding: existing.outstanding + (inv.outstanding_amount ?? 0),
        count: existing.count + 1,
      });
    }

    // Build rows for all program students
    const rows = programStudents
      .map((s) => {
        const agg = aggMap.get(s.name) ?? { invoiced: 0, outstanding: 0, count: 0 };
        const customer = studentToCustomer.get(s.name);
        return {
          studentId: s.name,
          studentName: s.student_name || s.name,
          totalInvoiced: agg.invoiced,
          totalCollected: agg.invoiced - agg.outstanding,
          totalOutstanding: agg.outstanding,
          invoiceCount: agg.count,
          enabled: s.enabled,
          paymentMode: customer ? paymentModeMap.get(customer) : undefined,
          feePlan: feePlanMap.get(s.name),
        };
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName));

    return NextResponse.json({ data: rows });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[director/program-students] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
