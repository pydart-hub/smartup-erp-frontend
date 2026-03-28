import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

export async function GET(request: NextRequest) {
  // ── Auth ──
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
  if (
    !roles.includes("Administrator") &&
    !roles.includes("Director") &&
    !roles.includes("Accounts Manager")
  ) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
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

  try {
    const today = new Date().toISOString().slice(0, 10);

    // 1. Fetch students created today
    const studentsRes = await frappeGet("resource/Student", {
      fields: JSON.stringify([
        "name",
        "student_name",
        "custom_branch",
        "custom_branch_abbr",
        "joining_date",
        "enabled",
      ]),
      filters: JSON.stringify([
        ["creation", ">=", `${today} 00:00:00`],
        ["creation", "<=", `${today} 23:59:59`],
      ]),
      order_by: "creation desc",
      limit_page_length: "100",
    });

    const students: {
      name: string;
      student_name: string;
      custom_branch: string;
      custom_branch_abbr: string;
      joining_date: string;
      enabled: number;
    }[] = studentsRes?.data ?? [];

    if (!students.length) {
      return NextResponse.json({ data: [] });
    }

    const studentIds = students.map((s) => s.name);

    // 2. Get program enrollments for these students (fee structure + plan)
    const enrollRes = await frappeGet("resource/Program Enrollment", {
      fields: JSON.stringify([
        "name",
        "student",
        "program",
        "student_batch_name",
        "custom_fee_structure",
        "custom_plan",
        "custom_no_of_instalments",
      ]),
      filters: JSON.stringify([["student", "in", studentIds]]),
      order_by: "enrollment_date desc",
      limit_page_length: "200",
    });

    const enrollments: {
      name: string;
      student: string;
      program: string;
      student_batch_name: string;
      custom_fee_structure: string;
      custom_plan: string;
      custom_no_of_instalments: string;
    }[] = enrollRes?.data ?? [];

    // Map: student → latest enrollment
    const enrollMap = new Map<string, (typeof enrollments)[0]>();
    for (const e of enrollments) {
      if (!enrollMap.has(e.student)) enrollMap.set(e.student, e);
    }

    // 3. Get sales invoices for these students
    const invoiceRes = await frappeGet("resource/Sales Invoice", {
      fields: JSON.stringify([
        "student",
        "sum(grand_total) as total_billed",
        "sum(outstanding_amount) as total_outstanding",
        "count(name) as invoice_count",
      ]),
      filters: JSON.stringify([
        ["docstatus", "=", 1],
        ["student", "in", studentIds],
      ]),
      group_by: "student",
      limit_page_length: "200",
    });

    const invoiceRows: {
      student: string;
      total_billed: number;
      total_outstanding: number;
      invoice_count: number;
    }[] = invoiceRes?.data ?? [];

    const invoiceMap = new Map<string, (typeof invoiceRows)[0]>();
    for (const row of invoiceRows) {
      invoiceMap.set(row.student, row);
    }

    // 4. Get payment entries for these students (total paid)
    const paymentRes = await frappeGet("resource/Payment Entry", {
      fields: JSON.stringify([
        "party",
        "sum(paid_amount) as total_paid",
      ]),
      filters: JSON.stringify([
        ["docstatus", "=", 1],
        ["payment_type", "=", "Receive"],
        ["party_type", "=", "Customer"],
      ]),
      group_by: "party",
      limit_page_length: "1000",
    });

    // Map customer → total_paid  
    const paymentRows: { party: string; total_paid: number }[] =
      paymentRes?.data ?? [];
    const paymentByCustomer = new Map<string, number>();
    for (const row of paymentRows) {
      paymentByCustomer.set(row.party, row.total_paid);
    }

    // 5. Assemble response
    const data = students.map((s) => {
      const enroll = enrollMap.get(s.name);
      const inv = invoiceMap.get(s.name);
      const totalBilled = inv?.total_billed ?? 0;
      const totalOutstanding = inv?.total_outstanding ?? 0;
      const totalPaid = totalBilled - totalOutstanding;

      return {
        student_id: s.name,
        student_name: s.student_name,
        branch: s.custom_branch,
        branch_abbr: s.custom_branch_abbr,
        program: enroll?.program ?? "-",
        batch: enroll?.student_batch_name ?? "-",
        fee_structure: enroll?.custom_fee_structure ?? "-",
        plan: enroll?.custom_plan ?? "-",
        instalments: enroll?.custom_no_of_instalments ?? "-",
        total_billed: totalBilled,
        total_paid: totalPaid,
        total_outstanding: totalOutstanding,
        invoice_count: inv?.invoice_count ?? 0,
      };
    });

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[today-admissions] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
