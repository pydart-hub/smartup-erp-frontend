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
  ArrowLeft,
  Users,
  UserCheck,
  UserX,
  UserMinus,
  Briefcase,
  IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import type { BranchDetailData } from "@/lib/reports/summary-types";

function formatCurrency(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

async function fetchBranchDetail(branch: string, fromDate?: string, toDate?: string): Promise<BranchDetailData> {
  const res = await fetch("/api/director/report-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "branch", detail: branch, fromDate, toDate }),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to fetch branch detail");
  }
  const json = await res.json();
  return json.data;
}

interface Props {
  branch: string;
  fromDate?: string;
  toDate?: string;
  onBack: () => void;
}

export function BranchDetail({ branch, fromDate, toDate, onBack }: Props) {
  const [loading, setLoading] = useState<"xlsx" | "csv" | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["report-summary", "branch", branch, fromDate, toDate],
    queryFn: () => fetchBranchDetail(branch, fromDate, toDate),
    staleTime: 60_000,
  });

  const handleExport = async (format: "xlsx" | "csv") => {
    setLoading(format);
    try {
      const res = await fetch("/api/director/report-summary-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "branch", detail: branch, fromDate, toDate, format }),
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
      <GifLoader />
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <AlertCircle className="h-6 w-6 text-error" />
        <p className="text-sm text-error">Failed to load branch detail</p>
      </div>
    );
  }

  const { summary, classes } = data;

  const classTotals = classes.reduce(
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

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-2 text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to All Branches
      </Button>

      {/* Summary KPI Cards */}
      <div>
        <h2 className="text-lg font-bold text-text-primary mb-3">
          {branch.replace("Smart Up ", "")} &mdash; Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 bg-surface rounded-[12px] border border-border-light">
            <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
              <Users className="h-3.5 w-3.5 text-primary" />
              Total Students
            </div>
            <p className="text-xl font-bold text-text-primary">{summary.totalStudents}</p>
          </div>
          <div className="p-3.5 bg-surface rounded-[12px] border border-border-light">
            <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
              <UserCheck className="h-3.5 w-3.5 text-success" />
              Active
            </div>
            <p className="text-xl font-bold text-success">{summary.active}</p>
          </div>
          <div className="p-3.5 bg-surface rounded-[12px] border border-border-light">
            <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
              <UserX className="h-3.5 w-3.5 text-error" />
              Discontinued
            </div>
            <p className="text-xl font-bold text-error">{summary.discontinued}</p>
          </div>
          <div className="p-3.5 bg-surface rounded-[12px] border border-border-light">
            <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
              <Briefcase className="h-3.5 w-3.5 text-info" />
              Staff
            </div>
            <p className="text-xl font-bold text-text-primary">{summary.staff}</p>
          </div>
          <div className="p-3.5 bg-surface rounded-[12px] border border-border-light">
            <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
              <IndianRupee className="h-3.5 w-3.5 text-text-secondary" />
              Total Fee
            </div>
            <p className="text-lg font-bold text-text-primary">{formatCurrency(summary.totalFee)}</p>
          </div>
          <div className="p-3.5 bg-surface rounded-[12px] border border-border-light">
            <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
              <IndianRupee className="h-3.5 w-3.5 text-warning" />
              Pending Fee
            </div>
            <p className="text-lg font-bold text-error">{formatCurrency(summary.pendingFee)}</p>
          </div>
        </div>
      </div>

      {/* Class-wise breakdown table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-primary">Class Breakdown</h3>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {classes.map((row) => (
                <tr key={row.program} className="hover:bg-brand-wash/30 transition-colors">
                  <td className="px-3 py-2 text-text-primary font-medium">{row.program}</td>
                  <td className="px-3 py-2 text-right text-text-primary">{row.totalStudents}</td>
                  <td className="px-3 py-2 text-right text-success">{row.active}</td>
                  <td className="px-3 py-2 text-right text-error">{row.discontinued}</td>
                  <td className="px-3 py-2 text-right text-text-primary whitespace-nowrap">{formatCurrency(row.totalFee)}</td>
                  <td className="px-3 py-2 text-right text-success whitespace-nowrap">{formatCurrency(row.collectedFee)}</td>
                  <td className="px-3 py-2 text-right text-error whitespace-nowrap">{formatCurrency(row.pendingFee)}</td>
                </tr>
              ))}
            </tbody>
            {classTotals && (
              <tfoot>
                <tr className="bg-app-bg border-t-2 border-border-light font-semibold">
                  <td className="px-3 py-2.5 text-text-primary">TOTAL</td>
                  <td className="px-3 py-2.5 text-right text-text-primary">{classTotals.totalStudents}</td>
                  <td className="px-3 py-2.5 text-right text-success">{classTotals.active}</td>
                  <td className="px-3 py-2.5 text-right text-error">{classTotals.discontinued}</td>
                  <td className="px-3 py-2.5 text-right text-text-primary whitespace-nowrap">{formatCurrency(classTotals.totalFee)}</td>
                  <td className="px-3 py-2.5 text-right text-success whitespace-nowrap">{formatCurrency(classTotals.collectedFee)}</td>
                  <td className="px-3 py-2.5 text-right text-error whitespace-nowrap">{formatCurrency(classTotals.pendingFee)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
