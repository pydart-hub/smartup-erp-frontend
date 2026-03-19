import { NextRequest, NextResponse } from "next/server";
import { generateExcel } from "@/lib/reports/excel-generator";
import { generateCSV } from "@/lib/reports/csv-generator";
import type { ReportColumn } from "@/lib/reports/definitions";

export const dynamic = "force-dynamic";

// Re-use the same summary endpoint internally
async function fetchSummary(
  request: NextRequest,
  mode: string,
  detail?: string,
): Promise<Record<string, unknown>> {
  const origin = request.nextUrl.origin;
  const cookie = request.cookies.get("smartup_session");
  const res = await fetch(`${origin}/api/director/report-summary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: `smartup_session=${cookie.value}` } : {}),
    },
    body: JSON.stringify({ mode, detail }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Export failed" }));
    throw new Error(err.error || `Summary fetch failed (${res.status})`);
  }
  return res.json();
}

// ── Column definitions for each export type ──

const branchSummaryCols: ReportColumn[] = [
  { key: "branch", header: "Branch", width: 28 },
  { key: "totalStudents", header: "Total Students", width: 16 },
  { key: "active", header: "Active", width: 12 },
  { key: "inactive", header: "Inactive", width: 12 },
  { key: "discontinued", header: "Discontinued", width: 14 },
  { key: "staff", header: "Staff", width: 10 },
  { key: "totalFee", header: "Total Fee", width: 16 },
  { key: "collectedFee", header: "Collected Fee", width: 16 },
  { key: "pendingFee", header: "Pending Fee", width: 16 },
];

const branchDetailClassCols: ReportColumn[] = [
  { key: "program", header: "Class/Program", width: 28 },
  { key: "totalStudents", header: "Total Students", width: 16 },
  { key: "active", header: "Active", width: 12 },
  { key: "discontinued", header: "Discontinued", width: 14 },
  { key: "totalFee", header: "Total Fee", width: 16 },
  { key: "collectedFee", header: "Collected Fee", width: 16 },
  { key: "pendingFee", header: "Pending Fee", width: 16 },
];

const classSummaryCols: ReportColumn[] = [
  { key: "program", header: "Class/Program", width: 28 },
  { key: "totalStudents", header: "Total Students", width: 16 },
  { key: "active", header: "Active", width: 12 },
  { key: "discontinued", header: "Discontinued", width: 14 },
  { key: "branchCount", header: "Branches", width: 12 },
  { key: "totalFee", header: "Total Fee", width: 16 },
  { key: "collectedFee", header: "Collected Fee", width: 16 },
  { key: "pendingFee", header: "Pending Fee", width: 16 },
];

const classDetailBranchCols: ReportColumn[] = [
  { key: "branch", header: "Branch", width: 28 },
  { key: "totalStudents", header: "Total Students", width: 16 },
  { key: "active", header: "Active", width: 12 },
  { key: "discontinued", header: "Discontinued", width: 14 },
  { key: "staff", header: "Staff", width: 10 },
  { key: "totalFee", header: "Total Fee", width: 16 },
  { key: "collectedFee", header: "Collected Fee", width: 16 },
  { key: "pendingFee", header: "Pending Fee", width: 16 },
];

function buildFilename(label: string): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  return `SmartUp_${label.replace(/\s+/g, "_")}_${dateStr}`;
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

    const result = await fetchSummary(request, mode, detail);
    const data = (result as { data: unknown }).data;

    if (mode === "branch" && !detail) {
      columns = branchSummaryCols;
      rows = addTotalRow(
        data as Record<string, unknown>[],
        "branch",
        ["totalStudents", "active", "inactive", "discontinued", "staff", "totalFee", "collectedFee", "pendingFee"],
      );
      label = "All_Branches_Summary";
    } else if (mode === "branch" && detail) {
      const d = data as { summary: Record<string, unknown>; classes: Record<string, unknown>[] };
      columns = branchDetailClassCols;
      rows = addTotalRow(
        d.classes,
        "program",
        ["totalStudents", "active", "discontinued", "totalFee", "collectedFee", "pendingFee"],
      );
      label = `Branch_${detail.replace(/\s+/g, "_")}_Detail`;
    } else if (mode === "class" && !detail) {
      columns = classSummaryCols;
      rows = addTotalRow(
        data as Record<string, unknown>[],
        "program",
        ["totalStudents", "active", "discontinued", "totalFee", "collectedFee", "pendingFee"],
      );
      label = "All_Classes_Summary";
    } else if (mode === "class" && detail) {
      const d = data as { summary: Record<string, unknown>; branches: Record<string, unknown>[] };
      columns = classDetailBranchCols;
      rows = addTotalRow(
        d.branches,
        "branch",
        ["totalStudents", "active", "discontinued", "staff", "totalFee", "collectedFee", "pendingFee"],
      );
      label = `Class_${detail.replace(/\s+/g, "_")}_Detail`;
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
    console.error("[director/report-summary-export] Error:", err.message);
    return NextResponse.json({ error: err.message || "Export failed" }, { status: 500 });
  }
}
