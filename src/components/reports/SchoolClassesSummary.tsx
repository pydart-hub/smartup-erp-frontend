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
  GraduationCap,
  School,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import type { SchoolClassRow } from "@/lib/reports/summary-types";

async function fetchSchoolClasses(fromDate?: string, toDate?: string): Promise<SchoolClassRow[]> {
  const res = await fetch("/api/director/report-students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "school-classes", fromDate, toDate }),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to fetch school class summary");
  }
  return (await res.json()).data;
}

interface Props {
  fromDate?: string;
  toDate?: string;
  onSelectClass: (program: string) => void;
}

export function SchoolClassesSummary({ fromDate, toDate, onSelectClass }: Props) {
  const [loading, setLoading] = useState<"xlsx" | "csv" | null>(null);

  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["report-students", "school-classes", fromDate, toDate],
    queryFn: () => fetchSchoolClasses(fromDate, toDate),
    staleTime: 60_000,
  });

  const totals = rows?.reduce(
    (acc, r) => ({
      totalStudents: acc.totalStudents + r.totalStudents,
      active: acc.active + r.active,
      discontinued: acc.discontinued + r.discontinued,
      schoolCount: acc.schoolCount + r.schoolCount,
      branchCount: Math.max(acc.branchCount, r.branchCount),
      basic: acc.basic + r.basic,
      intermediate: acc.intermediate + r.intermediate,
      advanced: acc.advanced + r.advanced,
      male: acc.male + r.male,
      female: acc.female + r.female,
      newThisMonth: acc.newThisMonth + r.newThisMonth,
    }),
    {
      totalStudents: 0,
      active: 0,
      discontinued: 0,
      schoolCount: 0,
      branchCount: 0,
      basic: 0,
      intermediate: 0,
      advanced: 0,
      male: 0,
      female: 0,
      newThisMonth: 0,
    },
  );

  const handleExport = async (format: "xlsx" | "csv") => {
    setLoading(format);
    try {
      const res = await fetch("/api/director/report-students-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "school-classes", fromDate, toDate, format }),
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Export failed");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] ?? `School_Classes_Summary.${format}`;
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
        <p className="text-sm text-error">Failed to load classes summary</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Bar with Totals & Export */}
      <div className="flex items-center justify-between p-4 bg-surface rounded-[14px] border border-border-light flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[8px] bg-primary/10 flex items-center justify-center">
            <School className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              School Wise — Select Class
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              {rows.length} classes &middot; {totals?.totalStudents.toLocaleString()} total students
            </p>
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

      {/* Table */}
      <div className="overflow-x-auto rounded-[10px] border border-border-light bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-app-bg border-b border-border-light">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Class / Program
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Total
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Active
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Discontinued
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Schools
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Branches
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Basic
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Intermediate
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Advanced
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Male
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Female
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                New This Month
              </th>
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
                <td className="px-3 py-2.5 text-text-primary font-medium whitespace-nowrap flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span>{row.program}</span>
                </td>
                <td className="px-3 py-2.5 text-right text-text-primary font-semibold">
                  {row.totalStudents}
                </td>
                <td className="px-3 py-2.5 text-right text-success font-medium">
                  {row.active}
                </td>
                <td className="px-3 py-2.5 text-right text-error font-medium">
                  {row.discontinued}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    <School className="h-3 w-3" />
                    {row.schoolCount}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-text-secondary">
                  {row.branchCount}
                </td>
                <td className="px-3 py-2.5 text-right text-text-secondary">{row.basic}</td>
                <td className="px-3 py-2.5 text-right text-text-secondary">{row.intermediate}</td>
                <td className="px-3 py-2.5 text-right text-text-secondary">{row.advanced}</td>
                <td className="px-3 py-2.5 text-right text-text-secondary">{row.male}</td>
                <td className="px-3 py-2.5 text-right text-text-secondary">{row.female}</td>
                <td className="px-3 py-2.5 text-right text-info font-medium">{row.newThisMonth}</td>
                <td className="px-3 py-2.5 text-center">
                  <ChevronRight className="h-4 w-4 text-text-tertiary" />
                </td>
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot>
              <tr className="bg-app-bg border-t-2 border-border-light font-semibold">
                <td className="px-3 py-2.5 text-text-primary">TOTAL</td>
                <td className="px-3 py-2.5 text-right text-text-primary font-bold">
                  {totals.totalStudents}
                </td>
                <td className="px-3 py-2.5 text-right text-success">{totals.active}</td>
                <td className="px-3 py-2.5 text-right text-error">{totals.discontinued}</td>
                <td className="px-3 py-2.5 text-right text-primary font-bold">
                  {totals.schoolCount}
                </td>
                <td className="px-3 py-2.5 text-right text-text-secondary">{totals.branchCount}</td>
                <td className="px-3 py-2.5 text-right text-text-secondary">{totals.basic}</td>
                <td className="px-3 py-2.5 text-right text-text-secondary">{totals.intermediate}</td>
                <td className="px-3 py-2.5 text-right text-text-secondary">{totals.advanced}</td>
                <td className="px-3 py-2.5 text-right text-text-secondary">{totals.male}</td>
                <td className="px-3 py-2.5 text-right text-text-secondary">{totals.female}</td>
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
