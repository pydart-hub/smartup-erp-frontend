import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireRole } from "@/lib/utils/apiAuth";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;
const ADMIN_AUTH = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

const DIRECTOR_ROLES = [
  "Administrator",
  "Director",
  "Management",
  "General Manager",
];

interface CompanyRow {
  name: string;
}

interface StudentRow {
  name: string;
  student_name?: string;
  custom_branch?: string;
  enabled?: number;
  customer?: string;
}

interface EnrollmentRow {
  student?: string;
  program?: string;
  docstatus?: number;
  enrollment_date?: string;
}

interface InvoiceRow {
  name: string;
  company?: string;
  student?: string;
  customer?: string;
  grand_total?: number;
  outstanding_amount?: number;
  due_date?: string;
  is_return?: number;
}

interface PaymentEntryRow {
  name: string;
  company?: string;
  paid_amount?: number;
}

function cleanName(val: unknown): string {
  return String(val ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function istTodayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
}

function fmtInr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

async function frappeGetAll<T>(
  doctype: string,
  fields: string[],
  filters: (string | number | string[])[][] = [],
  orderBy?: string,
): Promise<T[]> {
  const pageSize = 1000;
  let offset = 0;
  const all: T[] = [];

  while (true) {
    const params = new URLSearchParams({
      fields: JSON.stringify(fields),
      filters: JSON.stringify(filters),
      limit_page_length: String(pageSize),
      limit_start: String(offset),
      ...(orderBy ? { order_by: orderBy } : {}),
    });

    const res = await fetch(
      `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params.toString()}`,
      { headers: { Authorization: ADMIN_AUTH, Accept: "application/json" }, cache: "no-store" },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Frappe ${doctype} ${res.status}: ${text.slice(0, 300)}`);
    }

    const json = await res.json();
    const page: T[] = json?.data ?? [];
    all.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

async function frappePostList<T>(body: Record<string, unknown>): Promise<T[]> {
  const res = await fetch(`${FRAPPE_URL}/api/method/frappe.client.get_list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: ADMIN_AUTH,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Frappe get_list ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  return (json?.message ?? []) as T[];
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFE2E8F0" } },
  left: { style: "thin", color: { argb: "FFE2E8F0" } },
  bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
  right: { style: "thin", color: { argb: "FFE2E8F0" } },
};

const TOTAL_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "medium", color: { argb: "FF4F46E5" } },
  left: { style: "thin", color: { argb: "FFC7D2FE" } },
  bottom: { style: "double", color: { argb: "FF4F46E5" } },
  right: { style: "thin", color: { argb: "FFC7D2FE" } },
};

function colLetter(colNumber: number): string {
  let num = colNumber;
  let letter = "";
  while (num > 0) {
    const rem = (num - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    num = Math.floor((num - 1) / 26);
  }
  return letter;
}

const CURRENCY_FMT = "₹#,##0";
const INT_FMT = "#,##0";
const PCT_FMT = "0%";

interface ExcelColumnDef {
  header: string;
  key: string;
  width: number;
  numFmt?: string;
  align: "left" | "right";
}

function buildStyledSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  title: string,
  subtitle: string,
  columns: ExcelColumnDef[],
  rows: Record<string, unknown>[],
  totalConfig: {
    labelKey: string;
    pctColKey: string;
    numColLetter: string;
    denColLetter: string;
  },
) {
  const sheet = workbook.addWorksheet(sheetName.slice(0, 30), {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  // Configure keys & widths without `header` so Row 1 banner is not overwritten
  sheet.columns = columns.map((c) => ({ key: c.key, width: c.width }));
  const lastCol = colLetter(columns.length);

  sheet.mergeCells(`A1:${lastCol}1`);
  const titleCell = sheet.getCell("A1");
  titleCell.value = title;
  titleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A154B" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(1).height = 30;

  sheet.mergeCells(`A2:${lastCol}2`);
  const subCell = sheet.getCell("A2");
  subCell.value = subtitle;
  subCell.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FF3730A3" } };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
  subCell.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(2).height = 20;

  sheet.getRow(3).height = 8;

  const headerRow = sheet.getRow(4);
  headerRow.values = columns.map((c) => c.header);
  headerRow.height = 24;
  headerRow.font = { name: "Segoe UI", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  const startRow = 5;
  rows.forEach((row, idx) => {
    const added = sheet.addRow(row);
    added.height = 21;
    const bg = idx % 2 === 1 ? "FFF8FAFC" : "FFFFFFFF";
    columns.forEach((c) => {
      const cell = added.getCell(c.key);
      cell.font = { name: "Segoe UI", size: 10, bold: c.key === totalConfig.labelKey };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: "middle", horizontal: c.align };
      if (c.numFmt) cell.numFmt = c.numFmt;
    });
  });

  if (rows.length > 0) {
    const endRow = startRow + rows.length - 1;
    const totalRow = sheet.addRow({});
    totalRow.height = 24;
    const totalRowNo = endRow + 1;

    columns.forEach((c, colIdx) => {
      const colNo = colIdx + 1;
      const letter = colLetter(colNo);
      const cell = totalRow.getCell(colNo);
      if (c.key === totalConfig.labelKey) {
        cell.value = "TOTAL";
      } else if (c.key === totalConfig.pctColKey) {
        cell.value = {
          formula: `IF(${totalConfig.denColLetter}${totalRowNo}>0, ${totalConfig.numColLetter}${totalRowNo}/${totalConfig.denColLetter}${totalRowNo}, 0)`,
        };
      } else {
        cell.value = { formula: `SUM(${letter}${startRow}:${letter}${endRow})` };
      }
      cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E1B4B" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
      cell.border = TOTAL_BORDER;
      cell.alignment = { vertical: "middle", horizontal: c.align };
      if (c.numFmt) cell.numFmt = c.numFmt;
    });

    sheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4, column: columns.length },
    };
  }
}

async function generateBranchProgramExcel(branch: string, today: string): Promise<{ buffer: Buffer; filename: string }> {
  const shortName = branch.replace("Smart Up ", "").replace("Smart Up", "HQ");

  const [students, enrollments, invoices, payments] = await Promise.all([
    frappeGetAll<StudentRow>(
      "Student",
      ["name", "student_name", "enabled", "customer"],
      [["custom_branch", "=", branch]],
    ),
    frappeGetAll<EnrollmentRow>(
      "Program Enrollment",
      ["student", "program", "docstatus", "enrollment_date"],
      [],
      "enrollment_date desc",
    ),
    frappeGetAll<InvoiceRow>(
      "Sales Invoice",
      ["name", "student", "customer", "grand_total", "outstanding_amount", "due_date", "is_return"],
      [
        ["docstatus", "=", 1],
        ["company", "=", branch],
      ],
      "name asc",
    ),
    frappeGetAll<PaymentEntryRow>(
      "Payment Entry",
      ["name", "paid_amount"],
      [
        ["docstatus", "=", 1],
        ["payment_type", "=", "Receive"],
        ["company", "=", branch],
      ],
      "name asc",
    ),
  ]);

  const branchStudentSet = new Set(students.map((s) => s.name));
  const discontinuedIds = new Set(students.filter((s) => !Number(s.enabled)).map((s) => s.name));
  const discontinuedCustomers = students
    .filter((s) => !Number(s.enabled) && s.customer)
    .map((s) => s.customer as string);

  const customerToStudentId = new Map<string, string>();
  const studentByCustomer = new Map<string, string>();
  for (const s of students) {
    if (s.customer) studentByCustomer.set(s.customer, s.name);
    if (s.student_name) customerToStudentId.set(cleanName(s.student_name), s.name);
  }

  const sortedEnrollments = [...enrollments].sort((a, b) => {
    const prio = (st?: number) => (st === 1 ? 0 : st === 0 ? 1 : 2);
    const pDiff = prio(a.docstatus) - prio(b.docstatus);
    if (pDiff !== 0) return pDiff;
    return String(b.enrollment_date ?? "").localeCompare(String(a.enrollment_date ?? ""));
  });
  const studentProgram = new Map<string, string>();
  for (const e of sortedEnrollments) {
    if (e.student && e.program && branchStudentSet.has(e.student) && !studentProgram.has(e.student)) {
      studentProgram.set(e.student, e.program);
    }
  }

  // Match dues-till-today class-wise query
  const bt = "`";
  const duesFilters: (string | number | string[])[][] = [
    ["Sales Invoice", "docstatus", "=", 1],
    ["Sales Invoice", "outstanding_amount", ">", 0],
    ["Sales Invoice", "due_date", "<=", today],
    ["Sales Invoice", "company", "=", branch],
  ];
  if (discontinuedCustomers.length > 0) {
    duesFilters.push(["Sales Invoice", "customer", "not in", discontinuedCustomers]);
  }
  const dueRows = await frappePostList<{ item_code?: string; total_dues?: number }>({
    doctype: "Sales Invoice",
    fields: [
      `${bt}tabSales Invoice Item${bt}.item_code as item_code`,
      `sum(${bt}tabSales Invoice${bt}.outstanding_amount) as total_dues`,
    ],
    filters: duesFilters,
    group_by: `${bt}tabSales Invoice Item${bt}.item_code`,
    limit_page_length: 100,
  });
  const duesByProgram = new Map<string, number>();
  for (const d of dueRows) {
    if (d.item_code) {
      duesByProgram.set(d.item_code.replace(" Tuition Fee", ""), Number(d.total_dues) || 0);
    }
  }

  // Program aggregation matching getBranchProgramStats
  interface ProgAgg {
    invoices: number;
    totalFees: number;
    outstanding: number;
    forfeited: number;
  }
  const progMap = new Map<string, ProgAgg>();

  let branchTotalInvoiced = 0;
  let branchTotalOutstanding = 0;
  let branchForfeited = 0;

  for (const inv of invoices) {
    const grand = Number(inv.grand_total) || 0;
    const ost = Number(inv.outstanding_amount) || 0;
    const isReturn = Number(inv.is_return) === 1;

    branchTotalInvoiced += grand;
    branchTotalOutstanding += ost;

    let sid = inv.student ? String(inv.student) : "";
    if (!sid && inv.customer) {
      sid = studentByCustomer.get(inv.customer) ?? customerToStudentId.get(cleanName(inv.customer)) ?? "";
    }
    if (!isReturn && sid && discontinuedIds.has(sid) && ost > 0) {
      branchForfeited += ost;
    }

    if (isReturn || grand <= 0) continue;
    const prog = (sid && studentProgram.get(sid)) || "Uncategorized";
    if (prog === "Uncategorized") continue;

    if (!progMap.has(prog)) {
      progMap.set(prog, { invoices: 0, totalFees: 0, outstanding: 0, forfeited: 0 });
    }
    const agg = progMap.get(prog)!;
    agg.invoices += 1;
    agg.totalFees += grand;
    agg.outstanding += ost;
    if (ost > 0 && sid && discontinuedIds.has(sid)) {
      agg.forfeited += ost;
    }
  }

  const branchCollected = payments.reduce((sum, pe) => sum + (Number(pe.paid_amount) || 0), 0);
  const branchPending = Math.max(0, branchTotalOutstanding - branchForfeited);
  const branchDues = Array.from(duesByProgram.values()).reduce((sum, v) => sum + v, 0);

  const rows = Array.from(progMap.entries())
    .filter(([, agg]) => agg.invoices > 0)
    .map(([program, agg]) => {
      const collected = agg.totalFees - agg.outstanding;
      const pending = Math.max(0, agg.outstanding - agg.forfeited);
      const overdue = duesByProgram.get(program) ?? 0;
      return {
        program,
        invoices: agg.invoices,
        totalFees: agg.totalFees,
        collected,
        pending,
        overdue,
        forfeited: agg.forfeited,
        collectionPct: agg.totalFees > 0 ? collected / agg.totalFees : 0,
      };
    })
    .sort((a, b) => b.totalFees - a.totalFees);

  const columns: ExcelColumnDef[] = [
    { header: "Program / Class", key: "program", width: 24, align: "left" },
    { header: "Invoices", key: "invoices", width: 13, numFmt: INT_FMT, align: "right" },
    { header: "Total Fees", key: "totalFees", width: 18, numFmt: CURRENCY_FMT, align: "right" },
    { header: "Collected", key: "collected", width: 18, numFmt: CURRENCY_FMT, align: "right" },
    { header: "Pending", key: "pending", width: 18, numFmt: CURRENCY_FMT, align: "right" },
    { header: "Overdue", key: "overdue", width: 18, numFmt: CURRENCY_FMT, align: "right" },
    { header: "Forfeited", key: "forfeited", width: 18, numFmt: CURRENCY_FMT, align: "right" },
    { header: "Collection %", key: "collectionPct", width: 15, numFmt: PCT_FMT, align: "right" },
  ];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SmartUp ERP";
  workbook.created = new Date();

  buildStyledSheet(
    workbook,
    `${shortName} Fees`,
    `SmartUp ERP — Fees Breakdown (${shortName})`,
    `Total Fees: ${fmtInr(branchTotalInvoiced)}  |  Collected (PE): ${fmtInr(branchCollected)}  |  Pending: ${fmtInr(branchPending)}  |  Forfeited: ${fmtInr(branchForfeited)}  |  Dues Till Today: ${fmtInr(branchDues)}  |  As-of: ${today}`,
    columns,
    rows,
    { labelKey: "program", pctColKey: "collectionPct", numColLetter: "D", denColLetter: "C" },
  );

  const rawBuffer = await workbook.xlsx.writeBuffer();
  const safeSlug = shortName.replace(/[^a-zA-Z0-9]+/g, "_");
  return {
    buffer: Buffer.from(rawBuffer),
    filename: `SmartUp_${safeSlug}_Fees_Report_${today}.xlsx`,
  };
}

async function generateAllBranchesExcel(today: string): Promise<{ buffer: Buffer; filename: string }> {
  const [companies, students, invoices, payments] = await Promise.all([
    frappeGetAll<CompanyRow>("Company", ["name"], [], "name asc"),
    frappeGetAll<StudentRow>(
      "Student",
      ["name", "student_name", "custom_branch", "enabled", "customer"],
    ),
    frappeGetAll<InvoiceRow>(
      "Sales Invoice",
      [
        "name",
        "company",
        "student",
        "customer",
        "grand_total",
        "outstanding_amount",
        "due_date",
        "is_return",
      ],
      [["docstatus", "=", 1]],
      "name asc",
    ),
    frappeGetAll<PaymentEntryRow>(
      "Payment Entry",
      ["name", "company", "paid_amount"],
      [
        ["docstatus", "=", 1],
        ["payment_type", "=", "Receive"],
      ],
      "name asc",
    ),
  ]);

  const branches = companies
    .map((c) => c.name)
    .filter((name) => name && name !== "Smart Up");

  const studentById = new Map<string, StudentRow>();
  const studentByCustomer = new Map<string, StudentRow>();
  const studentByCleanName = new Map<string, StudentRow>();
  const discontinuedIds = new Set<string>();
  const discontinuedCustomers = new Set<string>();

  for (const s of students) {
    studentById.set(s.name, s);
    if (s.customer) studentByCustomer.set(s.customer, s);
    if (s.student_name) studentByCleanName.set(cleanName(s.student_name), s);
    if (!Number(s.enabled)) {
      discontinuedIds.add(s.name);
      if (s.customer) discontinuedCustomers.add(s.customer);
    }
  }

  const resolveStudent = (inv: InvoiceRow): StudentRow | undefined => {
    if (inv.student && studentById.has(inv.student)) return studentById.get(inv.student);
    if (inv.customer && studentByCustomer.has(inv.customer)) return studentByCustomer.get(inv.customer);
    if (inv.customer) return studentByCleanName.get(cleanName(inv.customer));
    return undefined;
  };

  const isInvDiscontinued = (inv: InvoiceRow, resolved?: StudentRow): boolean => {
    if (resolved && discontinuedIds.has(resolved.name)) return true;
    if (inv.student && discontinuedIds.has(inv.student)) return true;
    if (inv.customer && discontinuedCustomers.has(inv.customer)) return true;
    return false;
  };

  const rows = branches.map((branch) => {
    const shortName = branch.replace("Smart Up ", "").replace("Smart Up", "HQ");
    const branchStudents = students.filter((s) => s.custom_branch === branch).length;

    let totalFees = 0;
    let totalOutstanding = 0;
    let forfeited = 0;
    let duesToday = 0;

    for (const inv of invoices) {
      if (inv.company !== branch) continue;
      const grand = Number(inv.grand_total) || 0;
      const ost = Number(inv.outstanding_amount) || 0;
      const isReturn = Number(inv.is_return) === 1;
      const resolved = resolveStudent(inv);
      const isDisc = isInvDiscontinued(inv, resolved);

      totalFees += grand;
      totalOutstanding += ost;

      if (!isReturn && isDisc && ost > 0) {
        forfeited += ost;
      }
      if (!isReturn && !isDisc && ost > 0 && inv.due_date && inv.due_date <= today) {
        duesToday += ost;
      }
    }

    const collected = payments
      .filter((pe) => pe.company === branch)
      .reduce((sum, pe) => sum + (Number(pe.paid_amount) || 0), 0);

    const pending = Math.max(0, totalOutstanding - forfeited);
    const collectionPct = totalFees > 0 ? collected / totalFees : 0;

    return {
      branch: shortName,
      students: branchStudents,
      totalFees,
      collected,
      pending,
      forfeited,
      duesToday,
      collectionPct,
    };
  });

  const todayFormatted = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const columns: ExcelColumnDef[] = [
    { header: "Branch", key: "branch", width: 20, align: "left" },
    { header: "Students", key: "students", width: 14, numFmt: INT_FMT, align: "right" },
    { header: "Total Fees", key: "totalFees", width: 18, numFmt: CURRENCY_FMT, align: "right" },
    { header: "Collected", key: "collected", width: 18, numFmt: CURRENCY_FMT, align: "right" },
    { header: "Pending", key: "pending", width: 18, numFmt: CURRENCY_FMT, align: "right" },
    { header: "Forfeited", key: "forfeited", width: 18, numFmt: CURRENCY_FMT, align: "right" },
    { header: "Dues Today", key: "duesToday", width: 18, numFmt: CURRENCY_FMT, align: "right" },
    { header: "Collection %", key: "collectionPct", width: 16, numFmt: PCT_FMT, align: "right" },
  ];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SmartUp ERP";
  workbook.created = new Date();

  buildStyledSheet(
    workbook,
    "Branch Fees",
    "SmartUp ERP — Fees Overview (Branch-Wise)",
    `Generated: ${todayFormatted} IST   |   Branches: ${rows.length}   |   As-of Date: ${today}`,
    columns,
    rows,
    { labelKey: "branch", pctColKey: "collectionPct", numColLetter: "D", denColLetter: "C" },
  );

  const rawBuffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(rawBuffer),
    filename: `SmartUp_Branch_Fees_Report_${today}.xlsx`,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authResult = requireRole(request, DIRECTOR_ROLES);
    if (authResult instanceof NextResponse) return authResult;

    const today = istTodayStr();
    const branch = request.nextUrl.searchParams.get("branch")?.trim() || "";

    const { buffer, filename } = branch
      ? await generateBranchProgramExcel(branch, today)
      : await generateAllBranchesExcel(today);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[director/fees-overview-export] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to generate Excel report" },
      { status: 500 },
    );
  }
}
