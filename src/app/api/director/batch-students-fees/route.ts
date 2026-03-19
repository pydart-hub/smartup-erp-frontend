import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/director/batch-students-fees?batch=...&branch=...
 *
 * Returns per-student fee summary + plan label for a specific batch (Student Group).
 * Uses admin token server-side for full read access.
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
    const batch = sp.get("batch") || "";
    const branch = sp.get("branch") || "";

    if (!batch || !branch) {
      return NextResponse.json(
        { error: "batch and branch are required" },
        { status: 400 }
      );
    }

    // Validate branch access
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

    // Step 1: Fetch the batch (Student Group) to get student list
    const sgJson = await frappeGet(
      `resource/Student Group/${encodeURIComponent(batch)}`,
      {}
    );
    const sgStudents: { student: string; student_name: string; active: number }[] =
      sgJson?.data?.students ?? [];

    if (!sgStudents.length) {
      return NextResponse.json({ data: [] });
    }

    const studentIds = sgStudents.map((s) => s.student);

    // Step 2: Fetch Sales Invoices for these students (include due_date for overdue calc)
    const invJson = await frappeGet("resource/Sales Invoice", {
      fields: JSON.stringify([
        "student",
        "grand_total",
        "outstanding_amount",
        "due_date",
      ]),
      filters: JSON.stringify([
        ["docstatus", "=", "1"],
        ["student", "in", studentIds],
        ["company", "=", branch],
      ]),
      limit_page_length: "1000",
    });
    const invoices: {
      student: string;
      grand_total: number;
      outstanding_amount: number;
      due_date: string;
    }[] = invJson?.data ?? [];

    // Compute per-student overdue dues (due_date <= today AND outstanding > 0)
    const todayDate = new Date().toISOString().split("T")[0];
    const duesMap = new Map<string, number>();
    for (const inv of invoices) {
      if (inv.due_date <= todayDate && inv.outstanding_amount > 0) {
        duesMap.set(inv.student, (duesMap.get(inv.student) ?? 0) + inv.outstanding_amount);
      }
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

    // Step 3: Fetch Sales Orders for fee plan (non-critical)
    const feePlanMap = new Map<string, string>();
    try {
      const soJson = await frappeGet("resource/Sales Order", {
        fields: JSON.stringify(["student", "custom_plan"]),
        filters: JSON.stringify([
          ["docstatus", "=", "1"],
          ["student", "in", studentIds],
          ["company", "=", branch],
        ]),
        limit_page_length: "500",
        order_by: "creation desc",
      });
      const salesOrders: { student: string; custom_plan?: string }[] =
        soJson?.data ?? [];
      for (const so of salesOrders) {
        if (so.student && so.custom_plan && !feePlanMap.has(so.student)) {
          feePlanMap.set(so.student, so.custom_plan);
        }
      }
    } catch {
      // Fee plan is non-critical
    }

    // Build rows
    const rows = sgStudents.map((s) => {
      const agg = aggMap.get(s.student) ?? { invoiced: 0, outstanding: 0, count: 0 };
      return {
        studentId: s.student,
        studentName: s.student_name || s.student,
        active: s.active,
        totalFee: agg.invoiced,
        paidFee: agg.invoiced - agg.outstanding,
        pendingFee: agg.outstanding,
        invoiceCount: agg.count,
        plan: feePlanMap.get(s.student) || null,
        duesTillToday: duesMap.get(s.student) ?? 0,
      };
    });

    return NextResponse.json({ data: rows });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[director/batch-students-fees] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
