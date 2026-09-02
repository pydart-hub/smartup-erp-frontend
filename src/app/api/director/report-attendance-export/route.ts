import { NextRequest, NextResponse } from "next/server";
import { generateExcel } from "@/lib/reports/excel-generator";
import { generateCSV } from "@/lib/reports/csv-generator";
import type { ReportColumn } from "@/lib/reports/definitions";
import {
  getAllBranchesSummary,
  getBranchDetail,
  getAllClassesSummary,
  getClassDetail,
} from "../report-attendance/route";

export const dynamic = "force-dynamic";

function fmtPct(v: unknown): string {
  return `${Number(v || 0)}%`;
}

const branchSummaryCols: ReportColumn[] = [
  { key: "branch", header: "Branch", width: 28 },
  { key: "totalSessions", header: "Total Records", width: 14 },
  { key: "avgAttendancePct", header: "Avg Attendance %", width: 18, transform: fmtPct },
  { key: "present", header: "Present", width: 12 },
  { key: "absent", header: "Absent", width: 12 },
  { key: "leave", header: "Leave", width: 12 },
  { key: "students", header: "Students", width: 12 },
];

const classSummaryCols: ReportColumn[] = [
  { key: "program", header: "Class/Program", width: 28 },
  { key: "totalSessions", header: "Total Records", width: 14 },
  { key: "avgAttendancePct", header: "Avg Attendance %", width: 18, transform: fmtPct },
  { key: "present", header: "Present", width: 12 },
  { key: "absent", header: "Absent", width: 12 },
  { key: "leave", header: "Leave", width: 12 },
  { key: "students", header: "Students", width: 12 },
];

const branchDetailCols: ReportColumn[] = [
  { key: "studentId", header: "Student ID", width: 22 },
  { key: "studentName", header: "Name", width: 28 },
  { key: "present", header: "Present", width: 12 },
  { key: "absent", header: "Absent", width: 12 },
  { key: "leave", header: "Leave", width: 12 },
  { key: "attendancePct", header: "Attendance %", width: 14, transform: fmtPct },
  { key: "lastAttended", header: "Last Attended", width: 16 },
];

const classDetailCols: ReportColumn[] = [
  { key: "studentId", header: "Student ID", width: 22 },
  { key: "studentName", header: "Name", width: 28 },
  { key: "present", header: "Present", width: 12 },
  { key: "absent", header: "Absent", width: 12 },
  { key: "leave", header: "Leave", width: 12 },
  { key: "attendancePct", header: "Attendance %", width: 14, transform: fmtPct },
  { key: "lastAttended", header: "Last Attended", width: 16 },
  { key: "branch", header: "Branch", width: 22 },
];

function buildFilename(label: string): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  return `SmartUp_Attendance_${label.replace(/\s+/g, "_")}_${dateStr}`;
}

function addTotalRow(
  rows: Record<string, unknown>[],
  labelKey: string,
  numericKeys: string[],
): Record<string, unknown>[] {
  if (rows.length === 0) return rows;
  const totals: Record<string, unknown> = { [labelKey]: "TOTAL" };
  for (const key of numericKeys) {
    totals[key] = rows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);
  }
  return [...rows, totals];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mode = String(body.mode ?? "");
    const detail = body.detail ? String(body.detail) : undefined;
    const format = body.format === "csv" ? "csv" : "xlsx";
    const d = new Date();
    const fromDate = body.fromDate || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const toDate = body.toDate || d.toISOString().slice(0, 10);

    let columns: ReportColumn[];
    let rows: Record<string, unknown>[];
    let label: string;

    if (mode === "branch" && !detail) {
      const data = await getAllBranchesSummary(fromDate, toDate);
      columns = branchSummaryCols;
      rows = addTotalRow(
        data as unknown as Record<string, unknown>[],
        "branch",
        ["totalSessions", "present", "absent", "leave", "students"],
      );
      label = "All_Branches";
    } else if (mode === "branch" && detail) {
      const dRes = await getBranchDetail(detail, fromDate, toDate);
      columns = branchDetailCols;
      rows = dRes.students as unknown as Record<string, unknown>[];
      label = `Branch_${detail.replace(/\s+/g, "_")}`;
    } else if (mode === "class" && !detail) {
      const data = await getAllClassesSummary(fromDate, toDate);
      columns = classSummaryCols;
      rows = addTotalRow(
        data as unknown as Record<string, unknown>[],
        "program",
        ["totalSessions", "present", "absent", "leave", "students"],
      );
      label = "All_Classes";
    } else if (mode === "class" && detail) {
      const dRes = await getClassDetail(detail, fromDate, toDate);
      columns = classDetailCols;
      rows = dRes.students as unknown as Record<string, unknown>[];
      label = `Class_${detail.replace(/\s+/g, "_")}`;
    } else {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const baseName = buildFilename(label);

    if (format === "csv") {
      const csv = generateCSV(columns, rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${baseName}.csv"`,
        },
      });
    }

    const buffer = await generateExcel(label.replace(/_/g, " "), columns, rows);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[director/report-attendance-export] Error:", err.message);
    return NextResponse.json({ error: err.message || "Export failed" }, { status: 500 });
  }
}
