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
import type { StudentsClassRow } from "@/lib/reports/summary-types";

async function fetchData(): Promise<StudentsClassRow[]> {
  const res = await fetch("/api/director/report-students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "class" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to fetch");
  }
  return (await res.json()).data;
}

interface Props {
  onSelect: (program: string) => void;
}

export function StudentsClassSummary({ onSelect }: Props) {
  const [loading, setLoading] = useState<"xlsx" | "csv" | null>(null);
  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["report-students", "class", "all"],
    queryFn: fetchData,
    staleTime: 60_000,
  });

  const totals = rows?.reduce(
    (acc, r) => ({
      totalStudents: acc.totalStudents + r.totalStudents,
      active: acc.active + r.active,
      discontinued: acc.discontinued + r.discontinued,
      male: acc.male + r.male,
      female: acc.female + r.female,
      newThisMonth: acc.newThisMonth + r.newThisMonth,
    }),
    { totalStudents: 0, active: 0, discontinued: 0, male: 0, female: 0, newThisMonth: 0 },
  );

  const handleExport = async (format: "xlsx" | "csv") => {
    setLoading(format);
    try {
      const res = await fetch("/api/director/report-students-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "class", format }),
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
          {rows.length} classes &middot; {totals?.totalStudents.toLocaleString()} total students
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
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Class / Program</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Total</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Active</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Discontinued</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Branches</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Male</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Female</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">New This Month</th>
              <th className="px-3 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {rows.map((row) => (
              <tr key={row.program} className="hover:bg-brand-wash/30 transition-colors cursor-pointer" onClick={() => onSelect(row.program)}>
                <td className="px-3 py-2 text-text-primary font-medium whitespace-nowrap">{row.program}</td>
                <td className="px-3 py-2 text-right text-text-primary">{row.totalStudents}</td>
                <td className="px-3 py-2 text-right text-success">{row.active}</td>
                <td className="px-3 py-2 text-right text-error">{row.discontinued}</td>
                <td className="px-3 py-2 text-right text-text-primary">{row.branchCount}</td>
                <td className="px-3 py-2 text-right text-text-primary">{row.male}</td>
                <td className="px-3 py-2 text-right text-text-primary">{row.female}</td>
                <td className="px-3 py-2 text-right text-info">{row.newThisMonth}</td>
                <td className="px-3 py-2 text-center"><ChevronRight className="h-4 w-4 text-text-tertiary" /></td>
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
                <td className="px-3 py-2.5 text-right text-text-primary">—</td>
                <td className="px-3 py-2.5 text-right text-text-primary">{totals.male}</td>
                <td className="px-3 py-2.5 text-right text-text-primary">{totals.female}</td>
                <td className="px-3 py-2.5 text-right text-info">{totals.newThisMonth}</td>
                <td className="px-3 py-2.5"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
