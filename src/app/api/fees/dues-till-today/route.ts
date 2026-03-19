/**
 * GET /api/fees/dues-till-today
 *
 * Returns overdue fee data — invoices where due_date <= today AND outstanding > 0.
 * Excludes discontinued students.
 *
 * Query params:
 *   level      — "total" | "branch" | "class" | "batch" | "student"
 *   branch     — company name (required for class/batch/student)
 *   item_code  — class identifier (required for batch)
 *   batch      — Student Group name (required for student)
 *
 * Uses admin token server-side for aggregate queries.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

function today(): string {
  return new Date().toISOString().split("T")[0];
}

async function frappeGet(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${FRAPPE_URL}/api/${path}?${qs}`, {
    headers: { Authorization: `token ${API_KEY}:${API_SECRET}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frappe ${path} ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function frappePost(path: string, body: unknown) {
  const res = await fetch(`${FRAPPE_URL}/api/${path}`, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frappe POST ${path} ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

/** Fetch discontinued student customer IDs (optionally scoped to a branch). */
async function getDiscontinuedCustomers(company?: string): Promise<string[]> {
  const filters: (string | number | string[])[][] = [
    ["enabled", "=", 0],
    ["custom_discontinuation_date", "is", "set"],
  ];
  if (company) filters.push(["custom_branch", "=", company]);

  const res = await frappeGet("resource/Student", {
    filters: JSON.stringify(filters),
    fields: JSON.stringify(["customer"]),
    limit_page_length: "500",
  });
  return (res.data ?? [])
    .map((s: { customer?: string }) => s.customer)
    .filter(Boolean) as string[];
}

function parseSession(request: NextRequest) {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie) return null;
  try {
    return JSON.parse(Buffer.from(sessionCookie.value, "base64").toString()) as {
      default_company?: string;
      allowed_companies?: string[];
      roles?: string[];
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const level = sp.get("level") || "total";
    const branch = sp.get("branch") || "";
    const itemCode = sp.get("item_code") || "";
    const batch = sp.get("batch") || "";
    const todayDate = today();

    const bt = "`"; // backtick helper for Frappe SQL

    // ── LEVEL: total ──
    if (level === "total") {
      const discCustomers = await getDiscontinuedCustomers();

      const filters: (string | number | string[])[][] = [
        ["docstatus", "=", 1],
        ["outstanding_amount", ">", 0],
        ["due_date", "<=", todayDate],
      ];
      if (discCustomers.length > 0) {
        filters.push(["customer", "not in", discCustomers]);
      }

      const res = await frappeGet("resource/Sales Invoice", {
        filters: JSON.stringify(filters),
        fields: JSON.stringify([
          "sum(outstanding_amount) as total_dues",
          "count(name) as invoice_count",
          "count(distinct customer) as student_count",
        ]),
        limit_page_length: "1",
      });

      const row = res.data?.[0] ?? {};
      return NextResponse.json({
        total_dues: row.total_dues ?? 0,
        invoice_count: row.invoice_count ?? 0,
        student_count: row.student_count ?? 0,
      });
    }

    // ── LEVEL: branch ──
    if (level === "branch") {
      const discCustomers = await getDiscontinuedCustomers();

      const filters: (string | number | string[])[][] = [
        ["docstatus", "=", 1],
        ["outstanding_amount", ">", 0],
        ["due_date", "<=", todayDate],
      ];
      if (discCustomers.length > 0) {
        filters.push(["customer", "not in", discCustomers]);
      }

      const res = await frappeGet("resource/Sales Invoice", {
        filters: JSON.stringify(filters),
        fields: JSON.stringify([
          "company",
          "sum(outstanding_amount) as total_dues",
          "count(name) as invoice_count",
          "count(distinct customer) as student_count",
        ]),
        group_by: "company",
        order_by: "total_dues desc",
        limit_page_length: "100",
      });

      const rows = (res.data ?? []).map((r: { company: string; total_dues: number; invoice_count: number; student_count: number }) => ({
        branch: r.company,
        total_dues: r.total_dues ?? 0,
        invoice_count: r.invoice_count ?? 0,
        student_count: r.student_count ?? 0,
      }));

      return NextResponse.json({ data: rows });
    }

    // ── LEVEL: class (item_code) within a branch ──
    if (level === "class") {
      if (!branch) {
        return NextResponse.json({ error: "branch is required" }, { status: 400 });
      }

      const discCustomers = await getDiscontinuedCustomers(branch);

      const filters: (string | number | string[])[][] = [
        ["Sales Invoice", "docstatus", "=", 1],
        ["Sales Invoice", "outstanding_amount", ">", 0],
        ["Sales Invoice", "due_date", "<=", todayDate],
        ["Sales Invoice", "company", "=", branch],
      ];
      if (discCustomers.length > 0) {
        filters.push(["Sales Invoice", "customer", "not in", discCustomers]);
      }

      const json = await frappePost("method/frappe.client.get_list", {
        doctype: "Sales Invoice",
        fields: [
          `${bt}tabSales Invoice Item${bt}.item_code as item_code`,
          `count(distinct ${bt}tabSales Invoice${bt}.customer) as student_count`,
          `sum(${bt}tabSales Invoice${bt}.outstanding_amount) as total_dues`,
          `count(${bt}tabSales Invoice${bt}.name) as invoice_count`,
        ],
        filters,
        group_by: `${bt}tabSales Invoice Item${bt}.item_code`,
        order_by: `total_dues desc`,
        limit_page_length: 100,
      });

      const rows = (json.message ?? []).map((r: { item_code: string; student_count: number; total_dues: number; invoice_count: number }) => ({
        item_code: r.item_code,
        total_dues: r.total_dues ?? 0,
        invoice_count: r.invoice_count ?? 0,
        student_count: r.student_count ?? 0,
      }));

      return NextResponse.json({ data: rows });
    }

    // ── LEVEL: batch (Student Group) within a branch + class ──
    if (level === "batch") {
      if (!branch || !itemCode) {
        return NextResponse.json({ error: "branch and item_code are required" }, { status: 400 });
      }

      const discCustomers = await getDiscontinuedCustomers(branch);

      // Step 1: Get overdue invoices for this branch + item_code.
      // Use the same proven frappePost pattern as the class level (4-element filters
      // with child-table join work when the parent doctype is Sales Invoice).
      const invFilters: (string | number | string[])[][] = [
        ["Sales Invoice", "docstatus", "=", 1],
        ["Sales Invoice", "outstanding_amount", ">", 0],
        ["Sales Invoice", "due_date", "<=", todayDate],
        ["Sales Invoice", "company", "=", branch],
        ["Sales Invoice Item", "item_code", "=", itemCode],
      ];
      if (discCustomers.length > 0) {
        invFilters.push(["Sales Invoice", "customer", "not in", discCustomers]);
      }

      const invJson = await frappePost("method/frappe.client.get_list", {
        doctype: "Sales Invoice",
        fields: [
          `${bt}tabSales Invoice${bt}.name`,
          `${bt}tabSales Invoice${bt}.student`,
          `${bt}tabSales Invoice${bt}.outstanding_amount`,
        ],
        filters: invFilters,
        limit_page_length: 2000,
      });

      const invoices: { name: string; student: string; outstanding_amount: number }[] =
        invJson.message ?? [];

      if (!invoices.length) {
        return NextResponse.json({ data: [] });
      }

      // Aggregate per student
      const studentDues = new Map<string, number>();
      for (const inv of invoices) {
        if (!inv.student) continue;
        studentDues.set(inv.student, (studentDues.get(inv.student) ?? 0) + (inv.outstanding_amount ?? 0));
      }

      const studentIds = Array.from(studentDues.keys());

      // Step 2: Find Student Groups for this branch, then build student→SG mapping.
      // Cannot query `Student Group Student` child table directly (PermissionError).
      // Instead, fetch all Student Groups for this branch and read their students arrays.
      const sgListRes = await frappeGet("resource/Student Group", {
        filters: JSON.stringify([["disabled", "=", 0], ["custom_branch", "=", branch]]),
        fields: JSON.stringify(["name", "student_group_name"]),
        limit_page_length: "500",
      });
      const sgList: { name: string; student_group_name: string }[] = sgListRes.data ?? [];

      // For each SG, fetch the full document to get its students child array
      const studentToSG = new Map<string, string>();
      const sgDisplayNames = new Map<string, string>();
      const sgStudentSets = new Map<string, Set<string>>();

      // Only fetch SG details if we have student IDs to match
      const studentIdSet = new Set(studentIds);
      await Promise.all(
        sgList.map(async (sg) => {
          try {
            const sgDoc = await frappeGet(
              `resource/Student Group/${encodeURIComponent(sg.name)}`,
              {},
            );
            const students: { student: string }[] = sgDoc?.data?.students ?? [];
            const matchedStudents = students.filter((s) => studentIdSet.has(s.student));
            if (matchedStudents.length > 0) {
              sgDisplayNames.set(sg.name, sg.student_group_name || sg.name);
              const sset = new Set<string>();
              for (const s of matchedStudents) {
                if (!studentToSG.has(s.student)) {
                  studentToSG.set(s.student, sg.name);
                }
                sset.add(s.student);
              }
              sgStudentSets.set(sg.name, sset);
            }
          } catch {
            // Skip SGs that can't be fetched
          }
        })
      );

      // Build SG-level aggregation
      const sgDues = new Map<string, { total_dues: number; students: Set<string> }>();
      for (const [studentId, dues] of studentDues) {
        const sgName = studentToSG.get(studentId) ?? "Unassigned";
        const existing = sgDues.get(sgName) ?? { total_dues: 0, students: new Set<string>() };
        existing.total_dues += dues;
        existing.students.add(studentId);
        sgDues.set(sgName, existing);
      }

      const rows = Array.from(sgDues.entries())
        .filter(([sgId]) => sgId !== "Unassigned")
        .map(([sgId, { total_dues, students }]) => ({
          batch_id: sgId,
          batch_name: sgDisplayNames.get(sgId) ?? sgId,
          total_dues,
          student_count: students.size,
        }))
        .sort((a, b) => b.total_dues - a.total_dues);

      return NextResponse.json({ data: rows });
    }

    // ── LEVEL: student within a batch ──
    if (level === "student") {
      if (!branch || !batch) {
        return NextResponse.json({ error: "branch and batch are required" }, { status: 400 });
      }

      // Step 1: Get students from the Student Group
      const sgJson = await frappeGet(
        `resource/Student Group/${encodeURIComponent(batch)}`,
        {},
      );
      const sgStudents: { student: string; student_name: string; active: number }[] =
        sgJson?.data?.students ?? [];

      if (!sgStudents.length) {
        return NextResponse.json({ data: [] });
      }

      const studentIds = sgStudents.map((s) => s.student);

      const discCustomers = await getDiscontinuedCustomers(branch);

      // Step 2: Fetch overdue invoices for these students
      const invRes = await frappeGet("resource/Sales Invoice", {
        filters: JSON.stringify([
          ["docstatus", "=", 1],
          ["outstanding_amount", ">", 0],
          ["due_date", "<=", todayDate],
          ["student", "in", studentIds],
          ["company", "=", branch],
        ]),
        fields: JSON.stringify([
          "name", "student", "outstanding_amount", "due_date", "grand_total",
        ]),
        limit_page_length: "2000",
      });

      const invoices: {
        name: string;
        student: string;
        outstanding_amount: number;
        due_date: string;
        grand_total: number;
      }[] = invRes.data ?? [];

      // Step 2b: Fetch Sales Orders for these students to get plan + instalment info
      const soRes = await frappeGet("resource/Sales Order", {
        filters: JSON.stringify([
          ["student", "in", studentIds],
          ["company", "=", branch],
          ["docstatus", "=", 1],
        ]),
        fields: JSON.stringify([
          "name", "student", "custom_plan", "custom_no_of_instalments",
        ]),
        order_by: "creation desc",
        limit_page_length: "500",
      });

      // Map student → most recent SO plan info
      const studentPlanMap = new Map<string, { plan: string; no_of_instalments: string }>();
      for (const so of (soRes.data ?? []) as { student: string; custom_plan?: string; custom_no_of_instalments?: string }[]) {
        if (!so.student || studentPlanMap.has(so.student)) continue;
        studentPlanMap.set(so.student, {
          plan: so.custom_plan || "",
          no_of_instalments: so.custom_no_of_instalments || "1",
        });
      }

      // Fetch discontinued student IDs directly to exclude them
      const discStudentRes = await frappeGet("resource/Student", {
        filters: JSON.stringify([
          ["enabled", "=", 0],
          ["custom_discontinuation_date", "is", "set"],
          ["name", "in", studentIds],
        ]),
        fields: JSON.stringify(["name"]),
        limit_page_length: "500",
      });
      const discStudentIds = new Set(
        ((discStudentRes.data ?? []) as { name: string }[]).map((s) => s.name)
      );

      // Helper: derive instalment label from due_date + no_of_instalments
      function getInstalmentLabel(dueDate: string, numInst: string): string {
        if (numInst === "1") return "Full Payment";
        const month = new Date(dueDate).getMonth(); // 0-indexed
        if (numInst === "4") {
          const qMap: Record<number, string> = { 3: "Q1", 6: "Q2", 9: "Q3", 0: "Q4" };
          return qMap[month] ?? `Inst`;
        }
        if (numInst === "6") {
          const i6Months = [3, 5, 7, 9, 11, 1];
          const idx = i6Months.indexOf(month);
          return idx !== -1 ? `Inst ${idx + 1} of 6` : `Inst`;
        }
        if (numInst === "8") {
          const i8Months = [3, 4, 5, 6, 7, 8, 9, 10];
          const idx = i8Months.indexOf(month);
          return idx !== -1 ? `Inst ${idx + 1} of 8` : `Inst`;
        }
        return "Inst";
      }

      // Aggregate per student
      const studentMap = new Map<string, {
        total_dues: number;
        overdue_invoices: { name: string; amount: number; grand_total: number; due_date: string; instalment_label: string }[];
      }>();

      for (const inv of invoices) {
        if (!inv.student || discStudentIds.has(inv.student)) continue;
        const existing = studentMap.get(inv.student) ?? { total_dues: 0, overdue_invoices: [] };
        existing.total_dues += inv.outstanding_amount ?? 0;
        const planInfo = studentPlanMap.get(inv.student);
        existing.overdue_invoices.push({
          name: inv.name,
          amount: inv.outstanding_amount ?? 0,
          grand_total: inv.grand_total ?? 0,
          due_date: inv.due_date,
          instalment_label: getInstalmentLabel(inv.due_date, planInfo?.no_of_instalments ?? "1"),
        });
        studentMap.set(inv.student, existing);
      }

      // Build name lookup
      const nameMap = new Map<string, string>();
      for (const s of sgStudents) {
        nameMap.set(s.student, s.student_name || s.student);
      }

      const rows = Array.from(studentMap.entries())
        .map(([studentId, { total_dues, overdue_invoices }]) => {
          const planInfo = studentPlanMap.get(studentId);
          return {
            student_id: studentId,
            student_name: nameMap.get(studentId) ?? studentId,
            total_dues,
            plan: planInfo?.plan || "",
            no_of_instalments: planInfo?.no_of_instalments || "",
            overdue_invoices: overdue_invoices.sort(
              (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
            ),
          };
        })
        .sort((a, b) => b.total_dues - a.total_dues);

      return NextResponse.json({ data: rows });
    }

    return NextResponse.json({ error: `Unknown level: ${level}` }, { status: 400 });
  } catch (err) {
    console.error("[dues-till-today] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
