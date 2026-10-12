"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  AlertCircle,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronRight,
  School,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import type { SchoolRow } from "@/lib/reports/summary-types";

async function fetchData(fromDate?: string, toDate?: string, program?: string): Promise<SchoolRow[]> {
  const res = await fetch("/api/director/report-students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "school", fromDate, toDate, program }),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to fetch school report");
  }
  return (await res.json()).data;
}

interface Props {
  fromDate?: string;
  toDate?: string;
  selectedProgram?: string;
  onSelect: (school: string) => void;
  onBack?: () => void;
}

export function SchoolWiseSummary({ fromDate, toDate, selectedProgram, onSelect, onBack }: Props) {
  const [loading, setLoading] = useState<"xlsx" | "csv" | null>(null);
  const [search, setSearch] = useState("");

  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["report-students", "school", "all", fromDate, toDate, selectedProgram],
    queryFn: () => fetchData(fromDate, toDate, selectedProgram),
    staleTime: 60_000,
  });

  const totals = rows?.reduce(
    (acc, r) => ({
      totalStudents: acc.totalStudents + r.totalStudents,
      active: acc.active + r.active,
      discontinued: acc.discontinued + r.discontinued,
      basic: acc.basic + r.basic,
      intermediate: acc.intermediate + r.intermediate,
      advanced: acc.advanced + r.advanced,
      male: acc.male + r.male,
      female: acc.female + r.female,
      newThisMonth: acc.newThisMonth + r.newThisMonth,
    }),
    { totalStudents: 0, active: 0, discontinued: 0, basic: 0, intermediate: 0, advanced: 0, male: 0, female: 0, newThisMonth: 0 },
  );

  const filteredRows = (rows ?? []).filter((r) =>
    r.school.toLowerCase().includes(search.toLowerCase()),
  );

  const handleExport = async (format: "xlsx" | "csv") => {
    setLoading(format);
    try {
      const res = await fetch("/api/director/report-students-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "school", fromDate, toDate, program: selectedProgram, format }),
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Export failed");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] ?? `School_Wise_Report.${format}`;
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

  if (isLoading) return <GifLoader />;
  if (isError || !rows) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <AlertCircle className="h-6 w-6 text-error" />
        <p className="text-sm text-error">Failed to load school summary</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navigation Header if scoped to class */}
      {selectedProgram && onBack && (
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back to Classes
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center">
              <School className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">
              Schools in {selectedProgram}
            </h2>
          </div>
        </div>
      )}

      {/* Top Bar with Search & Export */}
      <div className="flex items-center justify-between p-4 bg-surface rounded-[14px] border border-border-light flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <p className="text-sm text-text-secondary font-medium shrink-0">
            {rows.length} schools &middot; {totals?.totalStudents.toLocaleString()} total students
          </p>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search schools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-[8px] border border-border-light bg-app-bg text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
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

      {/* Table matching Class Wise styling */}
      <div className="overflow-x-auto rounded-[10px] border border-border-light bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-app-bg border-b border-border-light">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">School Name</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Total</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Active</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Discontinued</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Branches</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Basic</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Intermediate</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Advanced</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Male</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Female</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">New This Month</th>
              <th className="px-3 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {filteredRows.map((row) => (
              <tr
                key={row.school}
                className="hover:bg-brand-wash/30 transition-colors cursor-pointer group"
                onClick={() => onSelect(row.school)}
              >
                <td className="px-3 py-2.5 text-text-primary font-medium whitespace-nowrap flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                    <School className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="group-hover:text-primary transition-colors">{row.school}</span>
                </td>
                <td className="px-3 py-2 text-right text-text-primary font-semibold">{row.totalStudents}</td>
                <td className="px-3 py-2 text-right text-success">{row.active}</td>
                <td className="px-3 py-2 text-right text-error">{row.discontinued}</td>
                <td className="px-3 py-2 text-right text-info font-medium">{row.branchCount}</td>
                <td className="px-3 py-2 text-right text-text-primary">{row.basic}</td>
                <td className="px-3 py-2 text-right text-text-primary">{row.intermediate}</td>
                <td className="px-3 py-2 text-right text-text-primary">{row.advanced}</td>
                <td className="px-3 py-2 text-right text-text-primary">{row.male}</td>
                <td className="px-3 py-2 text-right text-text-primary">{row.female}</td>
                <td className="px-3 py-2 text-right text-info">{row.newThisMonth}</td>
                <td className="px-3 py-2 text-center">
                  <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-primary transition-colors" />
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-sm text-text-tertiary">
                  No schools found matching &ldquo;{search}&rdquo;
                </td>
              </tr>
            )}
          </tbody>
          {totals && (
            <tfoot>
              <tr className="bg-app-bg border-t-2 border-border-light font-semibold">
                <td className="px-3 py-2.5 text-text-primary">TOTAL</td>
                <td className="px-3 py-2.5 text-right text-text-primary">{totals.totalStudents}</td>
                <td className="px-3 py-2.5 text-right text-success">{totals.active}</td>
                <td className="px-3 py-2.5 text-right text-error">{totals.discontinued}</td>
                <td className="px-3 py-2.5 text-right text-text-primary">—</td>
                <td className="px-3 py-2.5 text-right text-text-primary">{totals.basic}</td>
                <td className="px-3 py-2.5 text-right text-text-primary">{totals.intermediate}</td>
                <td className="px-3 py-2.5 text-right text-text-primary">{totals.advanced}</td>
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
