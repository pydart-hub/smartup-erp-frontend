import { NextRequest, NextResponse } from "next/server";
import { generateExcel } from "@/lib/reports/excel-generator";
import { generateCSV } from "@/lib/reports/csv-generator";
import type { ReportColumn } from "@/lib/reports/definitions";
import {
  getAllBranchesOverdueSummary,
  getBranchOverdueDetail,
} from "../report-overdue/route";

export const dynamic = "force-dynamic";

function fmtCurrency(v: unknown): string {
  return "₹" + Number(v || 0).toLocaleString("en-IN");
}

function fmtPct(v: unknown): string {
  return `${Number(v || 0)}%`;
}

const branchSummaryCols: ReportColumn[] = [
  { key: "branch", header: "Branch", width: 28 },
  { key: "totalStudents", header: "Total Students", width: 16 },
  { key: "overdueStudents", header: "Overdue Students", width: 18 },
  { key: "totalFee", header: "Total Fee", width: 16, transform: fmtCurrency },
  { key: "collected", header: "Collected", width: 16, transform: fmtCurrency },
  { key: "overdueAmount", header: "Overdue Amount", width: 18, transform: fmtCurrency },
  { key: "pending", header: "Pending", width: 16, transform: fmtCurrency },
  { key: "overduePct", header: "Overdue %", width: 14, transform: fmtPct },
];

const branchDetailCols: ReportColumn[] = [
  { key: "studentId", header: "Student ID", width: 22 },
  { key: "studentName", header: "Name", width: 30 },
  { key: "parentName", header: "Parent Name", width: 28 },
  { key: "parentPhone", header: "Parent Phone", width: 18 },
  { key: "program", header: "Class / Plan", width: 28 },
  { key: "planType", header: "Plan Type", width: 18 },
  { key: "totalFee", header: "Total Fee", width: 16, transform: fmtCurrency },
  { key: "paid", header: "Paid", width: 16, transform: fmtCurrency },
  { key: "overdueAmount", header: "Overdue", width: 16, transform: fmtCurrency },
  { key: "installmentAmount", header: "Inst. Amount", width: 16, transform: fmtCurrency },
  { key: "installmentPaid", header: "Inst. Paid", width: 16, transform: fmtCurrency },
  { key: "pending", header: "Pending (Not Yet Due)", width: 22, transform: fmtCurrency },
  { key: "oldestDueDate", header: "Oldest Due Date", width: 16 },
  { key: "daysOverdue", header: "Days Overdue", width: 14 },
  { key: "invoiceCount", header: "Invoices", width: 12 },
];

export async function POST(request: NextRequest) {
  let body: { mode?: string; detail?: string; format?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { detail, format = "xlsx" } = body;

  try {
    let rows: Record<string, unknown>[];
    let columns: ReportColumn[];
    let sheetName: string;
    let fileBaseName: string;

    if (detail) {
      // Branch detail — student list
      const data = await getBranchOverdueDetail(detail);
      rows = data.students as unknown as Record<string, unknown>[];
      columns = branchDetailCols;
      sheetName = `Overdue - ${String(detail).replace("Smart Up ", "")}`;
      fileBaseName = `overdue-${String(detail).replace(/\s+/g, "_").toLowerCase()}`;
    } else {
      // Branch summary
      const data = await getAllBranchesOverdueSummary();
      rows = data as unknown as Record<string, unknown>[];
      columns = branchSummaryCols;
      sheetName = "Overdue Report";
      fileBaseName = "overdue-branch-summary";
    }

    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `${fileBaseName}_${dateStamp}.${format}`;

    if (format === "csv") {
      const csv = generateCSV(columns, rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Default: xlsx
    const buffer = await generateExcel(sheetName, columns, rows);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
