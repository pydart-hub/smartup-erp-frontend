"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ChevronRight } from "lucide-react";
import type { ClassRow } from "@/lib/reports/summary-types";
import { ShareReportMenu } from "@/components/reports/ShareReportMenu";

function formatCurrency(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

async function fetchClassSummary(fromDate?: string, toDate?: string): Promise<ClassRow[]> {
  const res = await fetch("/api/director/report-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "class", fromDate, toDate }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to fetch class summary");
  }
  const json = await res.json();
  return json.data;
}

interface Props {
  fromDate?: string;
  toDate?: string;
  onSelectClass: (program: string) => void;
}

export function ClassWiseSummary({ fromDate, toDate, onSelectClass }: Props) {
  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["report-summary", "class", "all", fromDate, toDate],
    queryFn: () => fetchClassSummary(fromDate, toDate),
    staleTime: 60_000,
  });

  const totals = rows?.reduce(
    (acc, r) => ({
      totalStudents: acc.totalStudents + r.totalStudents,
      active: acc.active + r.active,
      discontinued: acc.discontinued + r.discontinued,
      totalFee: acc.totalFee + r.totalFee,
      collectedFee: acc.collectedFee + r.collectedFee,
      pendingFee: acc.pendingFee + r.pendingFee,
    }),
    { totalStudents: 0, active: 0, discontinued: 0, totalFee: 0, collectedFee: 0, pendingFee: 0 },
  );

  const handleFetchExport = async (format: "xlsx" | "csv") => {
    const res = await fetch("/api/director/report-summary-export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "class", fromDate, toDate, format }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Export failed" }));
      throw new Error(err.error || "Export failed");
    }
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
    const filename = filenameMatch?.[1] ?? `Class_Wise_Summary_Report.${format}`;
    const blob = await res.blob();
    return { blob, filename };
  };

  if (isLoading) {
    return (
      <GifLoader />
    );
  }

  if (isError || !rows) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <AlertCircle className="h-6 w-6 text-error" />
        <p className="text-sm text-error">Failed to load class summary</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Export & Share bar */}
      <div className="flex items-center justify-between p-4 bg-surface rounded-[14px] border border-border-light flex-wrap gap-3">
        <p className="text-sm text-text-secondary font-medium">
          {rows.length} classes &middot; {totals?.totalStudents.toLocaleString()} total students
        </p>
        <ShareReportMenu
          title="Class Wise Summary Report"
          subtitle={`${rows.length} classes · ${totals?.totalStudents.toLocaleString()} total students`}
          onExport={handleFetchExport}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-[10px] border border-border-light">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-app-bg border-b border-border-light">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Class / Program</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Total</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Active</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Discontinued</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Fee</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Collected</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Pending</th>
              <th className="px-3 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {rows.map((row) => (
              <tr
                key={row.program}
                className="hover:bg-brand-wash/30 transition-colors cursor-pointer"
                onClick={() => onSelectClass(row.program)}
              >
                <td className="px-3 py-2 text-text-primary font-medium whitespace-nowrap">{row.program}</td>
                <td className="px-3 py-2 text-right text-text-primary">{row.totalStudents}</td>
                <td className="px-3 py-2 text-right text-success">{row.active}</td>
                <td className="px-3 py-2 text-right text-error">{row.discontinued}</td>
                <td className="px-3 py-2 text-right text-text-primary whitespace-nowrap">{formatCurrency(row.totalFee)}</td>
                <td className="px-3 py-2 text-right text-success whitespace-nowrap">{formatCurrency(row.collectedFee)}</td>
                <td className="px-3 py-2 text-right text-error whitespace-nowrap">{formatCurrency(row.pendingFee)}</td>
                <td className="px-3 py-2 text-center">
                  <ChevronRight className="h-4 w-4 text-text-tertiary" />
                </td>
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot>
              <tr className="bg-app-bg border-t-2 border-border-light font-semibold">
                <td className="px-3 py-2.5 text-text-primary">TOTAL</td>
                <td className="px-3 py-2.5 text-right text-text-primary">{totals.totalStudents}</td>
                <td className="px-3 py-2.5 text-right text-success">{totals.active}</td>
                <td className="px-3 py-2.5 text-right text-error">{totals.discontinued}</td>
                <td className="px-3 py-2.5 text-right text-text-primary whitespace-nowrap">{formatCurrency(totals.totalFee)}</td>
                <td className="px-3 py-2.5 text-right text-success whitespace-nowrap">{formatCurrency(totals.collectedFee)}</td>
                <td className="px-3 py-2.5 text-right text-error whitespace-nowrap">{formatCurrency(totals.pendingFee)}</td>
                <td className="px-3 py-2.5"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
