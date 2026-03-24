"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  AlertCircle,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import type { BranchRow } from "@/lib/reports/summary-types";

function formatCurrency(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

async function fetchBranchSummary(): Promise<BranchRow[]> {
  const res = await fetch("/api/director/report-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "branch" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to fetch branch summary");
  }
  const json = await res.json();
  return json.data;
}

interface Props {
  onSelectBranch: (branch: string) => void;
}

export function BranchWiseSummary({ onSelectBranch }: Props) {
  const [loading, setLoading] = useState<"xlsx" | "csv" | null>(null);

  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["report-summary", "branch", "all"],
    queryFn: fetchBranchSummary,
    staleTime: 60_000,
  });

  const totals = rows?.reduce(
    (acc, r) => ({
      totalStudents: acc.totalStudents + r.totalStudents,
      active: acc.active + r.active,
      discontinued: acc.discontinued + r.discontinued,
      staff: acc.staff + r.staff,
      totalFee: acc.totalFee + r.totalFee,
      collectedFee: acc.collectedFee + r.collectedFee,
      pendingFee: acc.pendingFee + r.pendingFee,
    }),
    { totalStudents: 0, active: 0, discontinued: 0, staff: 0, totalFee: 0, collectedFee: 0, pendingFee: 0 },
  );

  const handleExport = async (format: "xlsx" | "csv") => {
    setLoading(format);
    try {
      const res = await fetch("/api/director/report-summary-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "branch", format }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(err.error || "Export failed");
      }
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] ?? `report.${format}`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} downloaded`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="animate-spin h-6 w-6 text-primary" />
      </div>
    );
  }

  if (isError || !rows) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <AlertCircle className="h-6 w-6 text-error" />
        <p className="text-sm text-error">Failed to load branch summary</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Export bar */}
      <div className="flex items-center justify-between p-4 bg-surface rounded-[14px] border border-border-light">
        <p className="text-sm text-text-secondary font-medium">
          {rows.length} branches &middot; {totals?.totalStudents.toLocaleString()} total students
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleExport("xlsx")}
            disabled={loading !== null}
          >
            {loading === "xlsx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Excel
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            disabled={loading !== null}
          >
            {loading === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            CSV
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-[10px] border border-border-light">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-app-bg border-b border-border-light">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Branch</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Total</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Active</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Discontinued</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Staff</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Fee</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Collected</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Pending</th>
              <th className="px-3 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {rows.map((row) => (
              <tr
                key={row.branch}
                className="hover:bg-brand-wash/30 transition-colors cursor-pointer"
                onClick={() => onSelectBranch(row.branch)}
              >
                <td className="px-3 py-2 text-text-primary font-medium whitespace-nowrap">
                  {row.branch.replace("Smart Up ", "")}
                </td>
                <td className="px-3 py-2 text-right text-text-primary">{row.totalStudents}</td>
                <td className="px-3 py-2 text-right text-success">{row.active}</td>
                <td className="px-3 py-2 text-right text-error">{row.discontinued}</td>
                <td className="px-3 py-2 text-right text-text-primary">{row.staff}</td>
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
                <td className="px-3 py-2.5 text-right text-text-primary">{totals.staff}</td>
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
