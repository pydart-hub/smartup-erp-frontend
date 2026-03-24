import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

function parseSession(request: NextRequest) {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie) return null;
  try {
    return JSON.parse(Buffer.from(sessionCookie.value, "base64").toString()) as {
      roles?: string[];
    };
  } catch {
    return null;
  }
}

function isDirectorRole(roles: string[]): boolean {
  return roles.includes("Director") || roles.includes("Management") || roles.includes("Administrator");
}

const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

async function frappeGet(
  doctype: string,
  fields: string[],
  filters: (string | number | string[])[][],
  orderBy?: string,
  limitPageLength = 0,
): Promise<Record<string, unknown>[]> {
  const pageSize = 500;
  const maxRecords = limitPageLength > 0 ? limitPageLength : 10000;
  let allData: Record<string, unknown>[] = [];
  let offset = 0;

  while (offset < maxRecords) {
    const currentLimit = Math.min(pageSize, maxRecords - offset);
    const params = new URLSearchParams({
      fields: JSON.stringify(fields),
      filters: JSON.stringify(filters),
      limit_page_length: String(currentLimit),
      limit_start: String(offset),
      ...(orderBy ? { order_by: orderBy } : {}),
    });

    const res = await fetch(
      `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`,
      { headers: { Authorization: adminAuth, Accept: "application/json" }, cache: "no-store" },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Frappe ${doctype} ${res.status}: ${text.slice(0, 300)}`);
    }
    const json = await res.json();
    const page: Record<string, unknown>[] = json?.data ?? [];
    allData = allData.concat(page);
    if (page.length < currentLimit) break;
    offset += pageSize;
  }

  return allData;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Branch summary ──

async function getAllBranchesSummary() {
  const companies = await frappeGet("Company", ["name"], [], "name asc");
  const branches = companies.map((c) => String(c.name)).filter((n) => n !== "Smart Up");

  const invoices = await frappeGet(
    "Sales Invoice",
    ["name", "company", "student", "grand_total", "outstanding_amount", "due_date", "status"],
    [["docstatus", "=", 1]],
  );

  const today = todayStr();

  return branches.map((branch) => {
    const bi = invoices.filter((inv) => inv.company === branch);
    const totalFee = bi.reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0);
    const pending = bi.reduce((s, inv) => s + (Number(inv.outstanding_amount) || 0), 0);
    const collected = totalFee - pending;
    const overdue = bi
      .filter((inv) => (Number(inv.outstanding_amount) || 0) > 0 && String(inv.due_date ?? "") < today)
      .reduce((s, inv) => s + (Number(inv.outstanding_amount) || 0), 0);
    const studentsWithDues = new Set(
      bi.filter((inv) => (Number(inv.outstanding_amount) || 0) > 0).map((inv) => String(inv.student)),
    ).size;
    const collectionPct = totalFee > 0 ? Math.round((collected / totalFee) * 100) : 0;

    return { branch, totalFee, collected, pending, overdue, collectionPct, studentsWithDues };
  });
}

// ── Branch detail ──

async function getBranchDetail(branch: string) {
  const invoices = await frappeGet(
    "Sales Invoice",
    ["name", "student", "student_name", "grand_total", "outstanding_amount", "due_date", "status"],
    [["docstatus", "=", 1], ["company", "=", branch]],
    "due_date desc",
  );

  const today = todayStr();
  const totalFee = invoices.reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0);
  const pending = invoices.reduce((s, inv) => s + (Number(inv.outstanding_amount) || 0), 0);
  const collected = totalFee - pending;
  const overdue = invoices
    .filter((inv) => (Number(inv.outstanding_amount) || 0) > 0 && String(inv.due_date ?? "") < today)
    .reduce((s, inv) => s + (Number(inv.outstanding_amount) || 0), 0);
  const studentsWithDues = new Set(
    invoices.filter((inv) => (Number(inv.outstanding_amount) || 0) > 0).map((inv) => String(inv.student)),
  ).size;
  const collectionPct = totalFee > 0 ? Math.round((collected / totalFee) * 100) : 0;

  const summary = { branch, totalFee, collected, pending, overdue, collectionPct, studentsWithDues };

  // Fetch disabilities for students
  const studentIds = [...new Set(invoices.map((inv) => String(inv.student ?? "")).filter(Boolean))];
  const disabilityMap = new Map<string, string>();
  if (studentIds.length > 0) {
    const stuRecords = await frappeGet("Student", ["name", "custom_disabilities"], [["name", "in", studentIds]]);
    for (const s of stuRecords) {
      const d = String(s.custom_disabilities ?? "");
      if (d) disabilityMap.set(String(s.name), d);
    }
  }

  const invoicesList = invoices.map((inv) => {
    const grand = Number(inv.grand_total) || 0;
    const outstanding = Number(inv.outstanding_amount) || 0;
    return {
      studentId: String(inv.student ?? ""),
      studentName: String(inv.student_name ?? ""),
      invoiceName: String(inv.name),
      amount: grand,
      paid: grand - outstanding,
      outstanding,
      status: outstanding === 0 ? "Paid" : String(inv.due_date ?? "") < today ? "Overdue" : "Unpaid",
      dueDate: String(inv.due_date ?? ""),
      disabilities: disabilityMap.get(String(inv.student ?? "")) ?? "",
    };
  });

  return { summary, invoices: invoicesList };
}

// ── Class summary ──

async function getAllClassesSummary() {
  const students = await frappeGet("Student", ["name", "custom_branch"], []);
  const studentNames = students.map((s) => String(s.name));

  let enrollments: Record<string, unknown>[] = [];
  if (studentNames.length > 0) {
    enrollments = await frappeGet(
      "Program Enrollment",
      ["student", "program"],
      [["docstatus", "!=", 2]],
      "enrollment_date desc",
    );
  }

  const studentProgram = new Map<string, string>();
  for (const e of enrollments) {
    const sid = String(e.student);
    if (!studentProgram.has(sid)) studentProgram.set(sid, String(e.program));
  }

  const invoices = await frappeGet(
    "Sales Invoice",
    ["name", "student", "grand_total", "outstanding_amount", "due_date"],
    [["docstatus", "=", 1]],
  );

  const invoiceByStudent = new Map<string, { total: number; outstanding: number; overdue: number }>();
  const today = todayStr();
  for (const inv of invoices) {
    const sid = String(inv.student ?? "");
    if (!sid) continue;
    const cur = invoiceByStudent.get(sid) ?? { total: 0, outstanding: 0, overdue: 0 };
    cur.total += Number(inv.grand_total) || 0;
    cur.outstanding += Number(inv.outstanding_amount) || 0;
    const ost = Number(inv.outstanding_amount) || 0;
    if (ost > 0 && String(inv.due_date ?? "") < today) cur.overdue += ost;
    invoiceByStudent.set(sid, cur);
  }

  const programMap = new Map<string, string[]>();
  for (const s of students) {
    const sid = String(s.name);
    const prog = studentProgram.get(sid) ?? "Uncategorized";
    if (!programMap.has(prog)) programMap.set(prog, []);
    programMap.get(prog)!.push(sid);
  }

  return Array.from(programMap.entries())
    .filter(([prog]) => prog !== "Uncategorized")
    .map(([program, sids]) => {
      let totalFee = 0, pending = 0, overdue = 0;
      let studentsWithDues = 0;
      for (const sid of sids) {
        const inv = invoiceByStudent.get(sid);
        if (inv) {
          totalFee += inv.total;
          pending += inv.outstanding;
          overdue += inv.overdue;
          if (inv.outstanding > 0) studentsWithDues++;
        }
      }
      const collected = totalFee - pending;
      const collectionPct = totalFee > 0 ? Math.round((collected / totalFee) * 100) : 0;

      return { program, totalFee, collected, pending, overdue, collectionPct, studentsWithDues };
    })
    .sort((a, b) => b.totalFee - a.totalFee);
}

// ── Class detail ──

async function getClassDetail(program: string) {
  const students = await frappeGet("Student", ["name", "custom_branch"], []);
  const studentNames = students.map((s) => String(s.name));

  let enrollments: Record<string, unknown>[] = [];
  if (studentNames.length > 0) {
    enrollments = await frappeGet(
      "Program Enrollment",
      ["student", "program"],
      [["docstatus", "!=", 2]],
      "enrollment_date desc",
    );
  }

  const studentProgram = new Map<string, string>();
  for (const e of enrollments) {
    const sid = String(e.student);
    if (!studentProgram.has(sid)) studentProgram.set(sid, String(e.program));
  }

  const programStudentIds = new Set(
    students.filter((s) => studentProgram.get(String(s.name)) === program).map((s) => String(s.name)),
  );

  const invoices = await frappeGet(
    "Sales Invoice",
    ["name", "student", "student_name", "company", "grand_total", "outstanding_amount", "due_date", "status"],
    [["docstatus", "=", 1]],
    "due_date desc",
  );

  const programInvoices = invoices.filter((inv) => programStudentIds.has(String(inv.student ?? "")));
  const today = todayStr();

  const totalFee = programInvoices.reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0);
  const pending = programInvoices.reduce((s, inv) => s + (Number(inv.outstanding_amount) || 0), 0);
  const collected = totalFee - pending;
  const overdue = programInvoices
    .filter((inv) => (Number(inv.outstanding_amount) || 0) > 0 && String(inv.due_date ?? "") < today)
    .reduce((s, inv) => s + (Number(inv.outstanding_amount) || 0), 0);
  const studentsWithDues = new Set(
    programInvoices.filter((inv) => (Number(inv.outstanding_amount) || 0) > 0).map((inv) => String(inv.student)),
  ).size;
  const collectionPct = totalFee > 0 ? Math.round((collected / totalFee) * 100) : 0;

  const summary = { program, totalFee, collected, pending, overdue, collectionPct, studentsWithDues };

  // Fetch disabilities for students
  const programStudentIdList = [...programStudentIds];
  const disabilityMap = new Map<string, string>();
  if (programStudentIdList.length > 0) {
    const stuRecords = await frappeGet("Student", ["name", "custom_disabilities"], [["name", "in", programStudentIdList]]);
    for (const s of stuRecords) {
      const d = String(s.custom_disabilities ?? "");
      if (d) disabilityMap.set(String(s.name), d);
    }
  }

  const invoicesList = programInvoices.map((inv) => {
    const grand = Number(inv.grand_total) || 0;
    const outstanding = Number(inv.outstanding_amount) || 0;
    return {
      studentId: String(inv.student ?? ""),
      studentName: String(inv.student_name ?? ""),
      invoiceName: String(inv.name),
      amount: grand,
      paid: grand - outstanding,
      outstanding,
      status: outstanding === 0 ? "Paid" : String(inv.due_date ?? "") < today ? "Overdue" : "Unpaid",
      dueDate: String(inv.due_date ?? ""),
      branch: String(inv.company ?? "").replace("Smart Up ", ""),
      disabilities: disabilityMap.get(String(inv.student ?? "")) ?? "",
    };
  });

  return { summary, invoices: invoicesList };
}

// ── Route handler ──

export async function POST(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!isDirectorRole(session.roles ?? [])) {
      return NextResponse.json({ error: "Access denied — Director role required" }, { status: 403 });
    }

    const body = await request.json();
    const mode = String(body.mode ?? "");
    const detail = body.detail ? String(body.detail) : null;

    if (mode === "branch" && !detail) {
      return NextResponse.json({ data: await getAllBranchesSummary() });
    }
    if (mode === "branch" && detail) {
      return NextResponse.json({ data: await getBranchDetail(detail) });
    }
    if (mode === "class" && !detail) {
      return NextResponse.json({ data: await getAllClassesSummary() });
    }
    if (mode === "class" && detail) {
      return NextResponse.json({ data: await getClassDetail(detail) });
    }

    return NextResponse.json({ error: "Invalid mode. Use 'branch' or 'class'" }, { status: 400 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[director/report-fees] Error:", err.message);
    return NextResponse.json({ error: err.message || "Failed to fetch fees report" }, { status: 500 });
  }
}
