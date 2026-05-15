import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

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
  return (
    roles.includes("Director") ||
    roles.includes("Management") ||
    roles.includes("General Manager") ||
    roles.includes("Administrator")
  );
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.max(0, Math.floor((b - a) / 86400000));
}

const PLAN_LABELS: Record<string, string> = {
  "1": "One-Time",
  "4": "Quarterly",
  "6": "Bi-Monthly",
  "8": "Monthly",
};

async function frappeGet(
  doctype: string,
  fields: string[],
  filters: (string | number | string[])[][],
  opts: { orderBy?: string; limit?: number } = {},
): Promise<Record<string, unknown>[]> {
  const pageSize = 500;
  const maxRecords = opts.limit ?? 10000;
  let allData: Record<string, unknown>[] = [];
  let offset = 0;

  while (offset < maxRecords) {
    const currentLimit = Math.min(pageSize, maxRecords - offset);
    const params = new URLSearchParams({
      fields: JSON.stringify(fields),
      filters: JSON.stringify(filters),
      limit_page_length: String(currentLimit),
      limit_start: String(offset),
      ...(opts.orderBy ? { order_by: opts.orderBy } : {}),
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

async function getDiscontinuedStudentIds(branch?: string): Promise<Set<string>> {
  const filters: (string | number | string[])[][] = [
    ["enabled", "=", 0],
    ["custom_discontinuation_date", "is", "set"],
  ];
  if (branch) filters.push(["custom_branch", "=", branch]);
  const rows = await frappeGet("Student", ["name"], filters, { limit: 5000 });
  return new Set(rows.map((r) => String(r.name)));
}

async function getAllBranchesOverdueSummary() {
  const today = todayStr();

  const companies = await frappeGet("Company", ["name"], [], { orderBy: "name asc" });
  const branches = companies.map((c) => String(c.name)).filter((n) => n !== "Smart Up");

  const overdueInvoices = await frappeGet(
    "Sales Invoice",
    ["name", "company", "student", "grand_total", "outstanding_amount", "due_date"],
    [
      ["docstatus", "=", 1],
      ["outstanding_amount", ">", 0],
      ["due_date", "<=", today],
    ],
  );

  const allInvoices = await frappeGet(
    "Sales Invoice",
    ["company", "student", "grand_total", "outstanding_amount", "due_date"],
    [["docstatus", "=", 1]],
  );

  const discIds = await getDiscontinuedStudentIds();

  const allStudents = await frappeGet(
    "Student",
    ["name", "custom_branch"],
    [["enabled", "=", 1]],
  );

  return branches.map((branch) => {
    const branchStudentCount = allStudents.filter((s) => s.custom_branch === branch).length;

    const branchOverdue = overdueInvoices.filter(
      (inv) => inv.company === branch && !discIds.has(String(inv.student ?? "")),
    );
    const branchAll = allInvoices.filter(
      (inv) => inv.company === branch && !discIds.has(String(inv.student ?? "")),
    );

    const overdueAmount = branchOverdue.reduce((s, inv) => s + (Number(inv.outstanding_amount) || 0), 0);
    const overdueStudents = new Set(branchOverdue.map((inv) => String(inv.student))).size;

    const totalFee = branchAll.reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0);
    const totalOutstanding = branchAll.reduce((s, inv) => s + (Number(inv.outstanding_amount) || 0), 0);
    const collected = totalFee - totalOutstanding;

    const pending = branchAll
      .filter((inv) => (Number(inv.outstanding_amount) || 0) > 0 && String(inv.due_date ?? "") > today)
      .reduce((s, inv) => s + (Number(inv.outstanding_amount) || 0), 0);

    const overduePct = totalFee > 0 ? Math.round((overdueAmount / totalFee) * 100) : 0;

    return { branch, totalStudents: branchStudentCount, overdueStudents, totalFee, collected, overdueAmount, pending, overduePct };
  });
}

async function getBranchOverdueDetail(branch: string) {
  const today = todayStr();

  const overdueInvoices = await frappeGet(
    "Sales Invoice",
    ["name", "student", "grand_total", "outstanding_amount", "due_date"],
    [
      ["docstatus", "=", 1],
      ["company", "=", branch],
      ["outstanding_amount", ">", 0],
      ["due_date", "<=", today],
    ],
    { orderBy: "due_date asc" },
  );

  const allInvoices = await frappeGet(
    "Sales Invoice",
    ["student", "grand_total", "outstanding_amount", "due_date"],
    [
      ["docstatus", "=", 1],
      ["company", "=", branch],
    ],
  );

  const discIds = await getDiscontinuedStudentIds(branch);

  const activeOverdueInvoices = overdueInvoices.filter((inv) => !discIds.has(String(inv.student ?? "")));
  const activeAllInvoices = allInvoices.filter((inv) => !discIds.has(String(inv.student ?? "")));

  const totalFee = activeAllInvoices.reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0);
  const totalOutstanding = activeAllInvoices.reduce((s, inv) => s + (Number(inv.outstanding_amount) || 0), 0);
  const collected = totalFee - totalOutstanding;
  const overdueAmount = activeOverdueInvoices.reduce((s, inv) => s + (Number(inv.outstanding_amount) || 0), 0);
  const overdueStudents = new Set(activeOverdueInvoices.map((inv) => String(inv.student))).size;
  const pending = activeAllInvoices
    .filter((inv) => (Number(inv.outstanding_amount) || 0) > 0 && String(inv.due_date ?? "") > today)
    .reduce((s, inv) => s + (Number(inv.outstanding_amount) || 0), 0);
  const overduePct = totalFee > 0 ? Math.round((overdueAmount / totalFee) * 100) : 0;

  const stuRecords = await frappeGet(
    "Student",
    ["name", "student_name"],
    [["custom_branch", "=", branch]],
  );
  const nameMap = new Map<string, string>();
  for (const s of stuRecords) nameMap.set(String(s.name), String(s.student_name ?? ""));
  const totalStudents = stuRecords.filter((s) => !discIds.has(String(s.name))).length;

  const allEnrollments = await frappeGet(
    "Program Enrollment",
    ["student", "program", "custom_no_of_instalments"],
    [["docstatus", "!=", 2]],
    { orderBy: "enrollment_date desc" },
  );
  const branchStudentSet = new Set(stuRecords.map((s) => String(s.name)));
  const studentProgram = new Map<string, string>();
  const studentPlanType = new Map<string, string>();
  for (const e of allEnrollments) {
    const sid = String(e.student);
    if (branchStudentSet.has(sid) && !studentProgram.has(sid)) {
      studentProgram.set(sid, String(e.program));
      const n = String(e.custom_no_of_instalments ?? "");
      studentPlanType.set(sid, PLAN_LABELS[n] ?? (n ? `${n} Instalments` : "—"));
    }
  }

  // ── Aggregate totalFee + paid from ALL invoices per student ──
  const studentAllAgg = new Map<string, { totalFee: number; totalPaid: number }>();
  for (const inv of activeAllInvoices) {
    const sid = String(inv.student ?? "");
    if (!sid) continue;
    const grand = Number(inv.grand_total) || 0;
    const ost = Number(inv.outstanding_amount) || 0;
    const existing = studentAllAgg.get(sid) ?? { totalFee: 0, totalPaid: 0 };
    existing.totalFee += grand;
    existing.totalPaid += grand - ost;
    studentAllAgg.set(sid, existing);
  }

  // ── Aggregate overdue outstanding from OVERDUE invoices only ──
  type StudentOverdueAgg = {
    overdueOutstanding: number;
    installmentAmount: number;  // grand_total of overdue invoices
    installmentPaid: number;    // paid toward those overdue invoices
    oldestDueDate: string;
    invoiceCount: number;
  };

  const studentAgg = new Map<string, StudentOverdueAgg>();
  for (const inv of activeOverdueInvoices) {
    const sid = String(inv.student ?? "");
    if (!sid) continue;
    const grand = Number(inv.grand_total) || 0;
    const ost = Number(inv.outstanding_amount) || 0;
    const dueDate = String(inv.due_date ?? "");

    if (!studentAgg.has(sid)) {
      studentAgg.set(sid, { overdueOutstanding: 0, installmentAmount: 0, installmentPaid: 0, oldestDueDate: dueDate, invoiceCount: 0 });
    }
    const agg = studentAgg.get(sid)!;
    agg.overdueOutstanding += ost;
    agg.installmentAmount += grand;
    agg.installmentPaid += grand - ost;
    agg.invoiceCount++;
    if (dueDate && dueDate < agg.oldestDueDate) agg.oldestDueDate = dueDate;
  }

  // ── Pending = outstanding on future invoices (due_date > today) per student ──
  const studentPending = new Map<string, number>();
  for (const inv of activeAllInvoices) {
    const sid = String(inv.student ?? "");
    const ost = Number(inv.outstanding_amount) || 0;
    if (ost > 0 && String(inv.due_date ?? "") > today) {
      studentPending.set(sid, (studentPending.get(sid) ?? 0) + ost);
    }
  }

  // ── Guardian info for overdue students (batch-fetch individual Student docs) ──
  const overdueStudentIds = Array.from(studentAgg.keys());
  const studentGuardianName = new Map<string, string>();
  const studentGuardianId = new Map<string, string>();

  const BATCH_SIZE = 20;
  for (let i = 0; i < overdueStudentIds.length; i += BATCH_SIZE) {
    const batch = overdueStudentIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (sid) => {
        try {
          const res = await fetch(
            `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(sid)}`,
            { headers: { Authorization: adminAuth }, cache: "no-store" },
          );
          const json = await res.json();
          const guardians = (json?.data?.guardians ?? []) as Array<{ guardian: string; guardian_name: string }>;
          return { sid, guardians };
        } catch {
          return { sid, guardians: [] };
        }
      }),
    );
    for (const { sid, guardians } of results) {
      const first = guardians[0];
      if (first) {
        studentGuardianName.set(sid, first.guardian_name ?? "");
        studentGuardianId.set(sid, first.guardian ?? "");
      }
    }
  }

  // Fetch phone numbers from Guardian doctype
  const guardianIds = Array.from(new Set(studentGuardianId.values())).filter(Boolean);
  const guardianPhoneRows = guardianIds.length > 0
    ? await frappeGet(
        "Guardian",
        ["name", "mobile_number"],
        [["name", "in", guardianIds]],
        { limit: guardianIds.length + 10 },
      )
    : [];

  const guardianPhoneMap = new Map<string, string>();
  for (const g of guardianPhoneRows) {
    guardianPhoneMap.set(String(g.name), String(g.mobile_number ?? ""));
  }

  const students = Array.from(studentAgg.entries()).map(([sid, agg]) => {
    const allAgg = studentAllAgg.get(sid) ?? { totalFee: 0, totalPaid: 0 };
    const gId = studentGuardianId.get(sid) ?? "";
    return {
      studentId: sid,
      studentName: nameMap.get(sid) ?? sid,
      parentName: studentGuardianName.get(sid) ?? "—",
      parentPhone: gId ? (guardianPhoneMap.get(gId) ?? "—") : "—",
      program: studentProgram.get(sid) ?? "—",
      planType: studentPlanType.get(sid) ?? "—",
      totalFee: allAgg.totalFee,
      paid: allAgg.totalPaid,
      overdueAmount: agg.overdueOutstanding,
      installmentAmount: agg.installmentAmount,
      installmentPaid: agg.installmentPaid,
      pending: studentPending.get(sid) ?? 0,
      oldestDueDate: agg.oldestDueDate,
      daysOverdue: agg.oldestDueDate ? daysBetween(agg.oldestDueDate, today) : 0,
      invoiceCount: agg.invoiceCount,
    };
  });

  students.sort((a, b) => b.overdueAmount - a.overdueAmount);

  return {
    summary: { branch, totalStudents, overdueStudents, totalFee, collected, overdueAmount, pending, overduePct },
    students,
  };
}

export async function POST(request: NextRequest) {
  const session = parseSession(request);
  if (!session || !isDirectorRole(session.roles ?? [])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { mode?: string; detail?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { mode = "branch", detail } = body;

  try {
    if (mode === "branch" && detail) {
      const data = await getBranchOverdueDetail(detail);
      return NextResponse.json({ data });
    }
    if (mode === "branch") {
      const data = await getAllBranchesOverdueSummary();
      return NextResponse.json({ data });
    }
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
