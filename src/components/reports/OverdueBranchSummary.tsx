"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import type { OverdueBranchRow } from "@/lib/reports/summary-types";
import { ShareReportMenu } from "@/components/reports/ShareReportMenu";

function fmt(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

async function fetchData(): Promise<OverdueBranchRow[]> {
  const res = await fetch("/api/director/report-overdue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "branch" }),
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
  return (await res.json()).data;
}

interface Props {
  onSelect: (branch: string) => void;
}

export function OverdueBranchSummary({ onSelect }: Props) {
  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["report-overdue", "branch", "all"],
    queryFn: fetchData,
    staleTime: 60_000,
  });

  const totals = rows?.reduce(
    (acc, r) => ({
      totalStudents: acc.totalStudents + r.totalStudents,
      overdueStudents: acc.overdueStudents + r.overdueStudents,
      totalFee: acc.totalFee + r.totalFee,
      collected: acc.collected + r.collected,
      overdueAmount: acc.overdueAmount + r.overdueAmount,
      pending: acc.pending + r.pending,
    }),
    { totalStudents: 0, overdueStudents: 0, totalFee: 0, collected: 0, overdueAmount: 0, pending: 0 },
  );

  const totalOverduePct =
    totals && totals.totalFee > 0
      ? Math.round((totals.overdueAmount / totals.totalFee) * 100)
      : 0;

  const handleFetchExport = async (format: "xlsx" | "csv") => {
    const res = await fetch("/api/director/report-overdue-export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "branch", format }),
      credentials: "include",
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Export failed");
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] ?? `Overdue_Branch_Report.${format}`;
    const blob = await res.blob();
    return { blob, filename };
  };

  if (isLoading) return <GifLoader />;
  if (isError || !rows)
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <AlertCircle className="h-6 w-6 text-error" />
        <p className="text-sm text-error">Failed to load data</p>
      </div>
    );

  const overdueRows = rows.filter((r) => r.overdueAmount > 0);

  return (
    <div className="space-y-4">
      {/* Summary & Share bar */}
      <div className="flex items-center justify-between p-4 bg-surface rounded-[14px] border border-border-light flex-wrap gap-3">
        <p className="text-sm text-text-secondary font-medium">
          {overdueRows.length} branches &middot;{" "}
          <span className="text-error font-semibold">{totals?.overdueStudents ?? 0} overdue students</span>
          {" "}&middot;{" "}
          <span className="text-error font-semibold">{fmt(totals?.overdueAmount ?? 0)} overdue</span>
        </p>
        <ShareReportMenu
          title="Overdue Branch Summary Report"
          subtitle={`${overdueRows.length} branches · ${totals?.overdueStudents ?? 0} overdue students (${fmt(totals?.overdueAmount ?? 0)})`}
          onExport={handleFetchExport}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-[10px] border border-border-light">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-app-bg border-b border-border-light">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Branch
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Total Fee
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Collected
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Overdue
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Pending
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Overdue %
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Students Overdue
              </th>
              <th className="px-3 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {overdueRows.map((row) => (
              <tr
                key={row.branch}
                className="hover:bg-brand-wash/30 transition-colors cursor-pointer"
                onClick={() => onSelect(row.branch)}
              >
                <td className="px-3 py-2 text-text-primary font-medium whitespace-nowrap">
                  {row.branch.replace("Smart Up ", "")}
                </td>
                <td className="px-3 py-2 text-right text-text-primary whitespace-nowrap">
                  {fmt(row.totalFee)}
                </td>
                <td className="px-3 py-2 text-right text-success whitespace-nowrap">
                  {fmt(row.collected)}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 text-error font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {fmt(row.overdueAmount)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-warning whitespace-nowrap">
                  {fmt(row.pending)}
                </td>
                <td className="px-3 py-2 text-right text-error">{row.overduePct}%</td>
                <td className="px-3 py-2 text-right text-error font-semibold">
                  {row.overdueStudents}
                </td>
                <td className="px-3 py-2 text-center">
                  <ChevronRight className="h-4 w-4 text-text-tertiary" />
                </td>
              </tr>
            ))}
          </tbody>
          {totals && overdueRows.length > 0 && (
            <tfoot>
              <tr className="bg-app-bg border-t-2 border-border-light font-semibold">
                <td className="px-3 py-2.5 text-text-primary">TOTAL</td>
                <td className="px-3 py-2.5 text-right text-text-primary whitespace-nowrap">
                  {fmt(totals.totalFee)}
                </td>
                <td className="px-3 py-2.5 text-right text-success whitespace-nowrap">
                  {fmt(totals.collected)}
                </td>
                <td className="px-3 py-2.5 text-right text-error font-semibold whitespace-nowrap">
                  {fmt(totals.overdueAmount)}
                </td>
                <td className="px-3 py-2.5 text-right text-warning whitespace-nowrap">
                  {fmt(totals.pending)}
                </td>
                <td className="px-3 py-2.5 text-right text-error">{totalOverduePct}%</td>
                <td className="px-3 py-2.5 text-right text-error font-semibold">
                  {totals.overdueStudents}
                </td>
                <td className="px-3 py-2.5" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {overdueRows.length === 0 && (
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-text-secondary">
          <AlertTriangle className="h-8 w-8 text-success" />
          <p className="text-sm font-medium">No overdue invoices across all branches</p>
        </div>
      )}
    </div>
  );
}
