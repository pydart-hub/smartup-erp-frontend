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
import type { FeesBranchRow } from "@/lib/reports/summary-types";

function fmt(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

async function fetchData(): Promise<FeesBranchRow[]> {
  const res = await fetch("/api/director/report-fees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "branch" }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
  return (await res.json()).data;
}

interface Props {
  onSelect: (branch: string) => void;
}

export function FeesBranchSummary({ onSelect }: Props) {
  const [loading, setLoading] = useState<"xlsx" | "csv" | null>(null);
  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["report-fees", "branch", "all"],
    queryFn: fetchData,
    staleTime: 60_000,
  });

  const totals = rows?.reduce(
    (acc, r) => ({
      totalFee: acc.totalFee + r.totalFee,
      collected: acc.collected + r.collected,
      pending: acc.pending + r.pending,
      overdue: acc.overdue + r.overdue,
      studentsWithDues: acc.studentsWithDues + r.studentsWithDues,
    }),
    { totalFee: 0, collected: 0, pending: 0, overdue: 0, studentsWithDues: 0 },
  );
  const totalPct = totals && totals.totalFee > 0 ? Math.round((totals.collected / totals.totalFee) * 100) : 0;

  const handleExport = async (format: "xlsx" | "csv") => {
    setLoading(format);
    try {
      const res = await fetch("/api/director/report-fees-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "branch", format }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Export failed");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] ?? `report.${format}`;
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

  if (isLoading) return <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>;
  if (isError || !rows) return <div className="flex flex-col items-center justify-center h-48 gap-2"><AlertCircle className="h-6 w-6 text-error" /><p className="text-sm text-error">Failed to load data</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-surface rounded-[14px] border border-border-light">
        <p className="text-sm text-text-secondary font-medium">
          {rows.length} branches &middot; {fmt(totals?.totalFee ?? 0)} total fees
        </p>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => handleExport("xlsx")} disabled={loading !== null}>
            {loading === "xlsx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Excel <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")} disabled={loading !== null}>
            {loading === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            CSV <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-border-light">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-app-bg border-b border-border-light">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Branch</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Fee</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Collected</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Pending</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Overdue</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Collection %</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Students w/ Dues</th>
              <th className="px-3 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {rows.map((row) => (
              <tr key={row.branch} className="hover:bg-brand-wash/30 transition-colors cursor-pointer" onClick={() => onSelect(row.branch)}>
                <td className="px-3 py-2 text-text-primary font-medium whitespace-nowrap">{row.branch.replace("Smart Up ", "")}</td>
                <td className="px-3 py-2 text-right text-text-primary whitespace-nowrap">{fmt(row.totalFee)}</td>
                <td className="px-3 py-2 text-right text-success whitespace-nowrap">{fmt(row.collected)}</td>
                <td className="px-3 py-2 text-right text-error whitespace-nowrap">{fmt(row.pending)}</td>
                <td className="px-3 py-2 text-right text-error whitespace-nowrap">{fmt(row.overdue)}</td>
                <td className="px-3 py-2 text-right text-text-primary">{row.collectionPct}%</td>
                <td className="px-3 py-2 text-right text-warning">{row.studentsWithDues}</td>
                <td className="px-3 py-2 text-center"><ChevronRight className="h-4 w-4 text-text-tertiary" /></td>
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot>
              <tr className="bg-app-bg border-t-2 border-border-light font-semibold">
                <td className="px-3 py-2.5 text-text-primary">TOTAL</td>
                <td className="px-3 py-2.5 text-right text-text-primary whitespace-nowrap">{fmt(totals.totalFee)}</td>
                <td className="px-3 py-2.5 text-right text-success whitespace-nowrap">{fmt(totals.collected)}</td>
                <td className="px-3 py-2.5 text-right text-error whitespace-nowrap">{fmt(totals.pending)}</td>
                <td className="px-3 py-2.5 text-right text-error whitespace-nowrap">{fmt(totals.overdue)}</td>
                <td className="px-3 py-2.5 text-right text-text-primary">{totalPct}%</td>
                <td className="px-3 py-2.5 text-right text-warning">{totals.studentsWithDues}</td>
                <td className="px-3 py-2.5"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
