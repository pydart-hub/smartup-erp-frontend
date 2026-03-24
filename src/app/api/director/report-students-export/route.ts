import { NextRequest, NextResponse } from "next/server";
import { generateExcel } from "@/lib/reports/excel-generator";
import { generateCSV } from "@/lib/reports/csv-generator";
import type { ReportColumn } from "@/lib/reports/definitions";

export const dynamic = "force-dynamic";

async function fetchReport(
  request: NextRequest,
  mode: string,
  detail?: string,
): Promise<Record<string, unknown>> {
  const origin = request.nextUrl.origin;
  const cookie = request.cookies.get("smartup_session");
  const res = await fetch(`${origin}/api/director/report-students`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: `smartup_session=${cookie.value}` } : {}),
    },
    body: JSON.stringify({ mode, detail }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Export failed" }));
    throw new Error(err.error || `Report fetch failed (${res.status})`);
  }
  return res.json();
}

const branchSummaryCols: ReportColumn[] = [
  { key: "branch", header: "Branch", width: 28 },
  { key: "totalStudents", header: "Total", width: 12 },
  { key: "active", header: "Active", width: 12 },
  { key: "discontinued", header: "Discontinued", width: 14 },
  { key: "male", header: "Male", width: 10 },
  { key: "female", header: "Female", width: 10 },
  { key: "newThisMonth", header: "New This Month", width: 16 },
];

const classSummaryCols: ReportColumn[] = [
  { key: "program", header: "Class/Program", width: 28 },
  { key: "totalStudents", header: "Total", width: 12 },
  { key: "active", header: "Active", width: 12 },
  { key: "discontinued", header: "Discontinued", width: 14 },
  { key: "branchCount", header: "Branches", width: 12 },
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
  { key: "joiningDate", header: "Joining Date", width: 14 },
  { key: "program", header: "Program", width: 22 },
];

const classDetailCols: ReportColumn[] = [
  { key: "studentId", header: "Student ID", width: 22 },
  { key: "studentName", header: "Name", width: 28 },
  { key: "status", header: "Status", width: 14 },
  { key: "gender", header: "Gender", width: 10 },
  { key: "phone", header: "Phone", width: 16 },
  { key: "guardian", header: "Guardian", width: 24 },
  { key: "joiningDate", header: "Joining Date", width: 14 },
  { key: "branch", header: "Branch", width: 22 },
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
    const format = body.format === "csv" ? "csv" : "xlsx";

    let columns: ReportColumn[];
    let rows: Record<string, unknown>[];
    let label: string;

    const result = await fetchReport(request, mode, detail);
    const data = (result as { data: unknown }).data;

    if (mode === "branch" && !detail) {
      columns = branchSummaryCols;
      rows = addTotalRow(
        data as Record<string, unknown>[],
        "branch",
        ["totalStudents", "active", "discontinued", "male", "female", "newThisMonth"],
      );
      label = "All_Branches";
    } else if (mode === "branch" && detail) {
      const d = data as { students: Record<string, unknown>[] };
      columns = branchDetailCols;
      rows = d.students;
      label = `Branch_${detail.replace(/\s+/g, "_")}`;
    } else if (mode === "class" && !detail) {
      columns = classSummaryCols;
      rows = addTotalRow(
        data as Record<string, unknown>[],
        "program",
        ["totalStudents", "active", "discontinued", "male", "female", "newThisMonth"],
      );
      label = "All_Classes";
    } else if (mode === "class" && detail) {
      const d = data as { students: Record<string, unknown>[] };
      columns = classDetailCols;
      rows = d.students;
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
