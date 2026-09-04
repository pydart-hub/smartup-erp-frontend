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
  { key: "studentName", header: "Student Name", width: 30 },
  { key: "parentName", header: "Parent Name", width: 28 },
  { key: "parentPhone", header: "Parent Phone", width: 18 },
  { key: "program", header: "Class / Plan", width: 28 },
  { key: "planType", header: "Plan Type", width: 18 },
  { key: "invoiceNo", header: "Invoice No", width: 22 },
  { key: "invoiceDueDate", header: "Due Date", width: 14 },
  { key: "invoiceGrandTotal", header: "Invoice Total", width: 16, transform: fmtCurrency },
  { key: "invoicePaid", header: "Invoice Paid", width: 16, transform: fmtCurrency },
  { key: "invoiceOutstanding", header: "Invoice Overdue", width: 18, transform: fmtCurrency },
  { key: "totalFee", header: "Student Total Fee", width: 18, transform: fmtCurrency },
  { key: "paid", header: "Student Total Paid", width: 18, transform: fmtCurrency },
  { key: "overdueAmount", header: "Student Overdue", width: 18, transform: fmtCurrency },
  { key: "pending", header: "Pending (Future)", width: 20, transform: fmtCurrency },
  { key: "daysOverdue", header: "Days Overdue", width: 14 },
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
      // Branch detail — student list with expanded overdue installment invoices
      const data = await getBranchOverdueDetail(detail);
      const expandedRows: Record<string, unknown>[] = [];

      for (const st of data.students) {
        if (st.overdueInvoices && st.overdueInvoices.length > 0) {
          for (const inv of st.overdueInvoices) {
            expandedRows.push({
              studentId: st.studentId,
              studentName: st.studentName,
              parentName: st.parentName,
              parentPhone: st.parentPhone,
              program: st.program,
              planType: st.planType,
              invoiceNo: inv.name,
              invoiceDueDate: inv.dueDate,
              invoiceGrandTotal: inv.grandTotal,
              invoicePaid: inv.paid,
              invoiceOutstanding: inv.amount,
              totalFee: st.totalFee,
              paid: st.paid,
              overdueAmount: st.overdueAmount,
              pending: st.pending,
              daysOverdue: st.daysOverdue,
            });
          }
        } else {
          expandedRows.push({
            studentId: st.studentId,
            studentName: st.studentName,
            parentName: st.parentName,
            parentPhone: st.parentPhone,
            program: st.program,
            planType: st.planType,
            invoiceNo: "—",
            invoiceDueDate: st.oldestDueDate || "—",
            invoiceGrandTotal: st.installmentAmount,
            invoicePaid: st.installmentPaid,
            invoiceOutstanding: st.overdueAmount,
            totalFee: st.totalFee,
            paid: st.paid,
            overdueAmount: st.overdueAmount,
            pending: st.pending,
            daysOverdue: st.daysOverdue,
          });
        }
      }
      rows = expandedRows;
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
