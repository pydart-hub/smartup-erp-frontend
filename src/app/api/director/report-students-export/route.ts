import { NextRequest, NextResponse } from "next/server";
import { generateExcel } from "@/lib/reports/excel-generator";
import { generateCSV } from "@/lib/reports/csv-generator";
import type { ReportColumn } from "@/lib/reports/definitions";
import {
  getAllBranchesSummary,
  getBranchDetail,
  getAllClassesSummary,
  getClassDetail,
} from "../report-students/route";

export const dynamic = "force-dynamic";

const branchSummaryCols: ReportColumn[] = [
  { key: "branch", header: "Branch", width: 28 },
  { key: "totalStudents", header: "Total", width: 12 },
  { key: "active", header: "Active", width: 12 },
  { key: "discontinued", header: "Discontinued", width: 14 },
  { key: "basic", header: "Basic", width: 12 },
  { key: "intermediate", header: "Intermediate", width: 16 },
  { key: "advanced", header: "Advanced", width: 12 },
  { key: "male", header: "Male", width: 10 },
  { key: "female", header: "Female", width: 10 },
  { key: "newThisMonth", header: "New This Month", width: 16 },
];

const classSummaryCols: ReportColumn[] = [
  { key: "program", header: "Class/Program", width: 28 },
  { key: "totalStudents", header: "Total", width: 12 },
  { key: "active", header: "Active", width: 12 },
  { key: "discontinued", header: "Discontinued", width: 14 },
  { key: "basic", header: "Basic", width: 12 },
  { key: "intermediate", header: "Intermediate", width: 16 },
  { key: "advanced", header: "Advanced", width: 12 },
  { key: "male", header: "Male", width: 10 },
  { key: "female", header: "Female", width: 10 },
  { key: "newThisMonth", header: "New This Month", width: 16 },
];

const branchDetailCols: ReportColumn[] = [
  { key: "studentId", header: "Student ID", width: 22 },
  { key: "studentName", header: "Name", width: 28 },
  { key: "status", header: "Status", width: 14 },
  { key: "gender", header: "Gender", width: 10 },
  { key: "phone", header: "Phone", width: 16 },
  { key: "guardian", header: "Guardian", width: 24 },
  { key: "joiningDate", header: "Admission Date", width: 16 },
  { key: "program", header: "Class/Program", width: 24 },
  { key: "disabilities", header: "Disabilities", width: 20 },
];

const classDetailCols: ReportColumn[] = [
  { key: "studentId", header: "Student ID", width: 22 },
  { key: "studentName", header: "Name", width: 28 },
  { key: "status", header: "Status", width: 14 },
  { key: "gender", header: "Gender", width: 10 },
  { key: "phone", header: "Phone", width: 16 },
  { key: "guardian", header: "Guardian", width: 24 },
  { key: "joiningDate", header: "Admission Date", width: 16 },
  { key: "branch", header: "Branch", width: 20 },
  { key: "disabilities", header: "Disabilities", width: 20 },
];

function buildFilename(label: string): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  return `SmartUp_Students_${label.replace(/\s+/g, "_")}_${dateStr}`;
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
    const fromDate = body.fromDate ? String(body.fromDate) : undefined;
    const toDate = body.toDate ? String(body.toDate) : undefined;
    const format = body.format === "csv" ? "csv" : "xlsx";

    let columns: ReportColumn[];
    let rows: Record<string, unknown>[];
    let label: string;

    if (mode === "branch" && !detail) {
      const data = await getAllBranchesSummary(fromDate, toDate);
      columns = branchSummaryCols;
      rows = addTotalRow(
        data as unknown as Record<string, unknown>[],
        "branch",
        ["totalStudents", "active", "discontinued", "basic", "intermediate", "advanced", "male", "female", "newThisMonth"],
      );
      label = "All_Branches";
    } else if (mode === "branch" && detail) {
      const d = await getBranchDetail(detail, fromDate, toDate);
      columns = branchDetailCols;
      rows = d.students as unknown as Record<string, unknown>[];
      label = `Branch_${detail.replace(/\s+/g, "_")}`;
    } else if (mode === "class" && !detail) {
      const data = await getAllClassesSummary(fromDate, toDate);
      columns = classSummaryCols;
      rows = addTotalRow(
        data as unknown as Record<string, unknown>[],
        "program",
        ["totalStudents", "active", "discontinued", "basic", "intermediate", "advanced", "male", "female", "newThisMonth"],
      );
      label = "All_Classes";
    } else if (mode === "class" && detail) {
      const d = await getClassDetail(detail, fromDate, toDate);
      columns = classDetailCols;
      rows = d.students as unknown as Record<string, unknown>[];
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
    console.error("[director/report-students-export] Error:", err.message);
    return NextResponse.json({ error: err.message || "Export failed" }, { status: 500 });
  }
}
