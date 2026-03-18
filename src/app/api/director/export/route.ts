import { NextRequest, NextResponse } from "next/server";
import { getReportDefinition } from "@/lib/reports/definitions";
import type { ReportFilters } from "@/lib/reports/definitions";
import { generateExcel } from "@/lib/reports/excel-generator";
import { generateCSV } from "@/lib/reports/csv-generator";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * POST /api/director/export
 *
 * Body: { reportType: string, filters: ReportFilters, format: "xlsx" | "csv" }
 *
 * Validates Director/Management role, fetches all data from Frappe,
 * generates file, and returns it as a downloadable stream.
 */
export async function POST(request: NextRequest) {
  try {
    // ── Auth ──
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let sessionData: {
      default_company?: string;
      allowed_companies?: string[];
      roles?: string[];
    };
    try {
      sessionData = JSON.parse(
        Buffer.from(sessionCookie.value, "base64").toString()
      );
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const roles = sessionData.roles ?? [];
    const isDirector = roles.includes("Director") || roles.includes("Management") || roles.includes("Administrator");
    if (!isDirector) {
      return NextResponse.json({ error: "Access denied — Director role required" }, { status: 403 });
    }

    // ── Parse body ──
    const body = await request.json();
    const reportType = String(body.reportType ?? "");
    const filters: ReportFilters = body.filters ?? {};
    const format = body.format === "csv" ? "csv" : "xlsx";

    const definition = getReportDefinition(reportType);
    if (!definition) {
      return NextResponse.json({ error: `Unknown report type: ${reportType}` }, { status: 400 });
    }

    // Validate branch access
    if (filters.branch) {
      const allowed = sessionData.allowed_companies ?? [];
      const isAdmin = roles.includes("Administrator");
      if (!isAdmin && allowed.length > 0 && !allowed.includes(filters.branch)) {
        return NextResponse.json({ error: "Access denied for this branch" }, { status: 403 });
      }
    }

    // ── Fetch data from Frappe ──
    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    const frappeGet = async (
      doctype: string,
      fields: string[],
      frappeFilters: (string | number)[][],
      orderBy?: string,
      limit?: number,
    ): Promise<Record<string, unknown>[]> => {
      // Fetch in pages to handle large datasets
      const pageSize = 500;
      const maxRecords = limit && limit > 0 ? limit : 10000;
      let allData: Record<string, unknown>[] = [];
      let offset = 0;

      while (offset < maxRecords) {
        const currentLimit = Math.min(pageSize, maxRecords - offset);
        const params = new URLSearchParams({
          fields: JSON.stringify(fields),
          filters: JSON.stringify(frappeFilters),
          limit_page_length: String(currentLimit),
          limit_start: String(offset),
          ...(orderBy ? { order_by: orderBy } : {}),
        });

        const res = await fetch(
          `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`,
          {
            headers: { Authorization: adminAuth, Accept: "application/json" },
            cache: "no-store",
          },
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Frappe ${doctype} ${res.status}: ${text.slice(0, 300)}`);
        }

        const json = await res.json();
        const page: Record<string, unknown>[] = json?.data ?? [];
        allData = allData.concat(page);

        // If we got less than the page size, we've exhausted the records
        if (page.length < currentLimit) break;
        offset += pageSize;
      }

      return allData;
    };

    const fetchSteps = definition.buildFetch(filters);

    const stepResults: Record<string, unknown>[][] = [];
    for (const step of fetchSteps) {
      const data = await frappeGet(
        step.doctype,
        step.fields,
        step.filters,
        step.orderBy,
        step.limit,
      );
      stepResults.push(data);
    }

    // Post-process or use raw first step results
    const rows = definition.postProcess
      ? definition.postProcess(stepResults)
      : stepResults[0] ?? [];

    // ── Generate file ──
    const dateStr = new Date().toISOString().slice(0, 10);
    const branchSuffix = filters.branch
      ? `_${filters.branch.replace(/\s+/g, "-")}`
      : "";
    const baseName = `SmartUp_${definition.label.replace(/\s+/g, "_")}${branchSuffix}_${dateStr}`;

    if (format === "csv") {
      const csv = generateCSV(definition.columns, rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${baseName}.csv"`,
        },
      });
    }

    // xlsx
    const buffer = await generateExcel(definition.label, definition.columns, rows);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[director/export] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Export failed" },
      { status: 500 },
    );
  }
}
