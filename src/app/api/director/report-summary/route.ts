import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

// ── Auth helper ──

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

function isDirectorRole(roles: string[]): boolean {
  return roles.includes("Director") || roles.includes("Management") || roles.includes("Administrator");
}

// ── Frappe helpers ──

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

// ── Interfaces ──

interface BranchRow {
  branch: string;
  totalStudents: number;
  active: number;
  inactive: number;
  discontinued: number;
  staff: number;
  totalFee: number;
  collectedFee: number;
  pendingFee: number;
}

interface ClassRow {
  program: string;
  totalStudents: number;
  active: number;
  discontinued: number;
  branchCount: number;
  totalFee: number;
  collectedFee: number;
  pendingFee: number;
}

interface BranchDetailClassRow {
  program: string;
  totalStudents: number;
  active: number;
  discontinued: number;
  totalFee: number;
  collectedFee: number;
  pendingFee: number;
}

interface ClassDetailBranchRow {
  branch: string;
  totalStudents: number;
  active: number;
  discontinued: number;
  staff: number;
  totalFee: number;
  collectedFee: number;
  pendingFee: number;
}

// ── Handlers ──

async function getAllBranchesSummary(): Promise<BranchRow[]> {
  // 1. Get all companies (branches) except "Smart Up"
  const companies = await frappeGet("Company", ["name"], [], "name asc");
  const branches = companies
    .map((c) => String(c.name))
    .filter((n) => n !== "Smart Up");

  // 2. Fetch all students once
  const students = await frappeGet(
    "Student",
    ["name", "custom_branch", "enabled"],
    [],
    undefined,
    0,
  );

  // 3. Fetch all active employees once
  const employees = await frappeGet(
    "Employee",
    ["name", "company"],
    [["status", "=", "Active"]],
    undefined,
    0,
  );

  // 4. Fetch all submitted invoices once
  const invoices = await frappeGet(
    "Sales Invoice",
    ["company", "grand_total", "outstanding_amount"],
    [["docstatus", "=", 1]],
    undefined,
    0,
  );

  // 5. Aggregate per branch
  const result: BranchRow[] = branches.map((branch) => {
    const branchStudents = students.filter((s) => s.custom_branch === branch);
    const total = branchStudents.length;
    const discontinued = branchStudents.filter((s) => Number(s.enabled) === 0).length;
    const active = branchStudents.filter((s) => Number(s.enabled) === 1).length;

    const staff = employees.filter((e) => e.company === branch).length;

    const branchInvoices = invoices.filter((inv) => inv.company === branch);
    const totalFee = branchInvoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
    const pendingFee = branchInvoices.reduce((sum, inv) => sum + (Number(inv.outstanding_amount) || 0), 0);

    return {
      branch,
      totalStudents: total,
      active,
      inactive: 0,
      discontinued,
      staff,
      totalFee,
      collectedFee: totalFee - pendingFee,
      pendingFee,
    };
  });

  return result;
}

async function getBranchDetail(branch: string): Promise<{
  summary: BranchRow;
  classes: BranchDetailClassRow[];
}> {
  // Students for this branch
  const students = await frappeGet(
    "Student",
    ["name", "enabled"],
    [["custom_branch", "=", branch]],
    undefined,
    0,
  );

  // Staff
  const employees = await frappeGet(
    "Employee",
    ["name"],
    [["company", "=", branch], ["status", "=", "Active"]],
    undefined,
    0,
  );

  // Invoices
  const invoices = await frappeGet(
    "Sales Invoice",
    ["student", "grand_total", "outstanding_amount"],
    [["docstatus", "=", 1], ["company", "=", branch]],
    undefined,
    0,
  );

  const totalStudents = students.length;
  const discontinued = students.filter((s) => Number(s.enabled) === 0).length;
  const active = students.filter((s) => Number(s.enabled) === 1).length;

  const totalFee = invoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
  const pendingFee = invoices.reduce((sum, inv) => sum + (Number(inv.outstanding_amount) || 0), 0);

  const summary: BranchRow = {
    branch,
    totalStudents,
    active,
    inactive: 0,
    discontinued,
    staff: employees.length,
    totalFee,
    collectedFee: totalFee - pendingFee,
    pendingFee,
  };

  // Program enrollments for these students to map student→program
  const studentNames = students.map((s) => String(s.name));
  let enrollments: Record<string, unknown>[] = [];
  if (studentNames.length > 0) {
    enrollments = await frappeGet(
      "Program Enrollment",
      ["student", "program"],
      [["student", "in", studentNames], ["docstatus", "!=", 2]],
      "enrollment_date desc",
      0,
    );
  }

  // Latest program per student
  const studentProgram = new Map<string, string>();
  for (const e of enrollments) {
    const sid = String(e.student);
    if (!studentProgram.has(sid)) studentProgram.set(sid, String(e.program));
  }

  // Build student→enabled lookup
  const studentEnabled = new Map(students.map((s) => [String(s.name), Number(s.enabled)]));

  // Build invoice lookup by student
  const invoiceByStudent = new Map<string, { total: number; outstanding: number }>();
  for (const inv of invoices) {
    const sid = String(inv.student ?? "");
    if (!sid) continue;
    const cur = invoiceByStudent.get(sid) ?? { total: 0, outstanding: 0 };
    cur.total += Number(inv.grand_total) || 0;
    cur.outstanding += Number(inv.outstanding_amount) || 0;
    invoiceByStudent.set(sid, cur);
  }

  // Group by program
  const programMap = new Map<string, { students: Set<string> }>();
  for (const s of students) {
    const sid = String(s.name);
    const prog = studentProgram.get(sid) ?? "Uncategorized";
    if (!programMap.has(prog)) programMap.set(prog, { students: new Set() });
    programMap.get(prog)!.students.add(sid);
  }

  const classes: BranchDetailClassRow[] = Array.from(programMap.entries()).map(
    ([program, { students: studs }]) => {
      const stuArr = Array.from(studs);
      const disc = stuArr.filter((sid) => studentEnabled.get(sid) === 0).length;
      const act = stuArr.filter((sid) => studentEnabled.get(sid) === 1).length;

      let tf = 0, pf = 0;
      for (const sid of stuArr) {
        const inv = invoiceByStudent.get(sid);
        if (inv) { tf += inv.total; pf += inv.outstanding; }
      }

      return {
        program,
        totalStudents: stuArr.length,
        active: act,
        discontinued: disc,
        totalFee: tf,
        collectedFee: tf - pf,
        pendingFee: pf,
      };
    },
  ).sort((a, b) => b.totalStudents - a.totalStudents);

  return { summary, classes };
}

async function getAllClassesSummary(): Promise<ClassRow[]> {
  // All students
  const students = await frappeGet(
    "Student",
    ["name", "custom_branch", "enabled"],
    [],
    undefined,
    0,
  );
  const studentNames = students.map((s) => String(s.name));

  // All program enrollments
  let enrollments: Record<string, unknown>[] = [];
  if (studentNames.length > 0) {
    enrollments = await frappeGet(
      "Program Enrollment",
      ["student", "program"],
      [["docstatus", "!=", 2]],
      "enrollment_date desc",
      0,
    );
  }

  // Latest program per student
  const studentProgram = new Map<string, string>();
  for (const e of enrollments) {
    const sid = String(e.student);
    if (!studentProgram.has(sid)) studentProgram.set(sid, String(e.program));
  }

  // All submitted invoices
  const invoices = await frappeGet(
    "Sales Invoice",
    ["student", "grand_total", "outstanding_amount"],
    [["docstatus", "=", 1]],
    undefined,
    0,
  );

  // Invoice lookup by student
  const invoiceByStudent = new Map<string, { total: number; outstanding: number }>();
  for (const inv of invoices) {
    const sid = String(inv.student ?? "");
    if (!sid) continue;
    const cur = invoiceByStudent.get(sid) ?? { total: 0, outstanding: 0 };
    cur.total += Number(inv.grand_total) || 0;
    cur.outstanding += Number(inv.outstanding_amount) || 0;
    invoiceByStudent.set(sid, cur);
  }

  // Group students by program
  const programMap = new Map<string, {
    students: { name: string; branch: string; enabled: number }[];
  }>();

  for (const s of students) {
    const sid = String(s.name);
    const prog = studentProgram.get(sid) ?? "Uncategorized";
    if (!programMap.has(prog)) programMap.set(prog, { students: [] });
    programMap.get(prog)!.students.push({
      name: sid,
      branch: String(s.custom_branch ?? ""),
      enabled: Number(s.enabled),
    });
  }

  const result: ClassRow[] = Array.from(programMap.entries())
    .filter(([prog]) => prog !== "Uncategorized")
    .map(([program, { students: studs }]) => {
      const total = studs.length;
      const disc = studs.filter((s) => s.enabled === 0).length;
      const active = studs.filter((s) => s.enabled === 1).length;
      const branchSet = new Set(studs.map((s) => s.branch).filter(Boolean));

      let totalFee = 0, pendingFee = 0;
      for (const s of studs) {
        const inv = invoiceByStudent.get(s.name);
        if (inv) { totalFee += inv.total; pendingFee += inv.outstanding; }
      }

      return {
        program,
        totalStudents: total,
        active,
        discontinued: disc,
        branchCount: branchSet.size,
        totalFee,
        collectedFee: totalFee - pendingFee,
        pendingFee,
      };
    })
    .sort((a, b) => b.totalStudents - a.totalStudents);

  return result;
}

async function getClassDetail(program: string): Promise<{
  summary: ClassRow;
  branches: ClassDetailBranchRow[];
}> {
  // All students
  const students = await frappeGet(
    "Student",
    ["name", "custom_branch", "enabled"],
    [],
    undefined,
    0,
  );
  const studentNames = students.map((s) => String(s.name));

  // Program enrollments
  let enrollments: Record<string, unknown>[] = [];
  if (studentNames.length > 0) {
    enrollments = await frappeGet(
      "Program Enrollment",
      ["student", "program"],
      [["docstatus", "!=", 2]],
      "enrollment_date desc",
      0,
    );
  }

  // Latest program per student
  const studentProgram = new Map<string, string>();
  for (const e of enrollments) {
    const sid = String(e.student);
    if (!studentProgram.has(sid)) studentProgram.set(sid, String(e.program));
  }

  // Filter students for this program
  const programStudents = students.filter(
    (s) => studentProgram.get(String(s.name)) === program,
  );

  // Invoices
  const invoices = await frappeGet(
    "Sales Invoice",
    ["student", "grand_total", "outstanding_amount"],
    [["docstatus", "=", 1]],
    undefined,
    0,
  );
  const invoiceByStudent = new Map<string, { total: number; outstanding: number }>();
  for (const inv of invoices) {
    const sid = String(inv.student ?? "");
    if (!sid) continue;
    const cur = invoiceByStudent.get(sid) ?? { total: 0, outstanding: 0 };
    cur.total += Number(inv.grand_total) || 0;
    cur.outstanding += Number(inv.outstanding_amount) || 0;
    invoiceByStudent.set(sid, cur);
  }

  // Employees per branch (for staff count)
  const employees = await frappeGet(
    "Employee",
    ["name", "company"],
    [["status", "=", "Active"]],
    undefined,
    0,
  );

  // Summary
  const total = programStudents.length;
  const disc = programStudents.filter((s) => Number(s.enabled) === 0).length;
  const active = programStudents.filter((s) => Number(s.enabled) === 1).length;
  const branchSet = new Set(
    programStudents.map((s) => String(s.custom_branch ?? "")).filter(Boolean),
  );
  let totalFee = 0, pendingFee = 0;
  for (const s of programStudents) {
    const inv = invoiceByStudent.get(String(s.name));
    if (inv) { totalFee += inv.total; pendingFee += inv.outstanding; }
  }

  const summary: ClassRow = {
    program,
    totalStudents: total,
    active,
    discontinued: disc,
    branchCount: branchSet.size,
    totalFee,
    collectedFee: totalFee - pendingFee,
    pendingFee,
  };

  // Group by branch
  const branchMap = new Map<string, typeof programStudents>();
  for (const s of programStudents) {
    const br = String(s.custom_branch ?? "");
    if (!br) continue;
    if (!branchMap.has(br)) branchMap.set(br, []);
    branchMap.get(br)!.push(s);
  }

  const branches: ClassDetailBranchRow[] = Array.from(branchMap.entries()).map(
    ([branch, studs]) => {
      const t = studs.length;
      const d = studs.filter((s) => Number(s.enabled) === 0).length;
      const a = studs.filter((s) => Number(s.enabled) === 1).length;
      const staff = employees.filter((e) => e.company === branch).length;

      let tf = 0, pf = 0;
      for (const s of studs) {
        const inv = invoiceByStudent.get(String(s.name));
        if (inv) { tf += inv.total; pf += inv.outstanding; }
      }

      return {
        branch,
        totalStudents: t,
        active: a,
        discontinued: d,
        staff,
        totalFee: tf,
        collectedFee: tf - pf,
        pendingFee: pf,
      };
    },
  ).sort((a, b) => b.totalStudents - a.totalStudents);

  return { summary, branches };
}

// ── Route handler ──

export async function POST(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const roles = session.roles ?? [];
    if (!isDirectorRole(roles)) {
      return NextResponse.json({ error: "Access denied — Director role required" }, { status: 403 });
    }

    const body = await request.json();
    const mode = String(body.mode ?? "");
    const detail = body.detail ? String(body.detail) : null;

    if (mode === "branch" && !detail) {
      const data = await getAllBranchesSummary();
      return NextResponse.json({ data });
    }
    if (mode === "branch" && detail) {
      const data = await getBranchDetail(detail);
      return NextResponse.json({ data });
    }
    if (mode === "class" && !detail) {
      const data = await getAllClassesSummary();
      return NextResponse.json({ data });
    }
    if (mode === "class" && detail) {
      const data = await getClassDetail(detail);
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "Invalid mode. Use 'branch' or 'class'" }, { status: 400 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[director/report-summary] Error:", err.message);
    return NextResponse.json({ error: err.message || "Failed to fetch report summary" }, { status: 500 });
  }
}
