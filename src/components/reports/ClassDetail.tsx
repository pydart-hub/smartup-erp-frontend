"use client";

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
  MapPin,
  IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import type { ClassDetailData } from "@/lib/reports/summary-types";

function formatCurrency(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

async function fetchClassDetail(program: string): Promise<ClassDetailData> {
  const res = await fetch("/api/director/report-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "class", detail: program }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to fetch class detail");
  }
  const json = await res.json();
  return json.data;
}

interface Props {
  program: string;
  onBack: () => void;
}

export function ClassDetail({ program, onBack }: Props) {
  const [loading, setLoading] = useState<"xlsx" | "csv" | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["report-summary", "class", program],
    queryFn: () => fetchClassDetail(program),
    staleTime: 60_000,
  });

  const handleExport = async (format: "xlsx" | "csv") => {
    setLoading(format);
    try {
      const res = await fetch("/api/director/report-summary-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "class", detail: program, format }),
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

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <AlertCircle className="h-6 w-6 text-error" />
        <p className="text-sm text-error">Failed to load class detail</p>
      </div>
    );
  }

  const { summary, branches } = data;

  const branchTotals = branches.reduce(
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

  const stats = [
    { label: "Total Students", value: summary.totalStudents, icon: Users, color: "text-primary" },
    { label: "Active", value: summary.active, icon: UserCheck, color: "text-success" },
    { label: "Discontinued", value: summary.discontinued, icon: UserX, color: "text-error" },
    { label: "Branches", value: summary.branchCount, icon: MapPin, color: "text-info" },
    { label: "Total Fee", value: formatCurrency(summary.totalFee), icon: IndianRupee, color: "text-text-primary" },
    { label: "Collected", value: formatCurrency(summary.collectedFee), icon: IndianRupee, color: "text-success" },
    { label: "Pending", value: formatCurrency(summary.pendingFee), icon: IndianRupee, color: "text-error" },
  ];

  return (
    <div className="space-y-4">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h2 className="text-lg font-bold text-text-primary">{program}</h2>
      </div>

      {/* Summary stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-3 bg-surface rounded-[10px] border border-border-light"
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <p className="text-xs text-text-tertiary">{stat.label}</p>
              </div>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Export bar */}
      <div className="flex items-center justify-between p-4 bg-surface rounded-[14px] border border-border-light">
        <p className="text-sm text-text-secondary font-medium">
          Branch-wise breakdown &middot; {branches.length} branches
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

      {/* Branch table */}
      {branches.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary text-sm">
          No branch data found for this class.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-border-light">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-bg border-b border-border-light">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Branch</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Students</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Active</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Discontinued</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Staff</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Fee</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Collected</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {branches.map((row) => (
                <tr key={row.branch} className="hover:bg-brand-wash/30 transition-colors">
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
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-app-bg border-t-2 border-border-light font-semibold">
                <td className="px-3 py-2.5 text-text-primary">TOTAL</td>
                <td className="px-3 py-2.5 text-right text-text-primary">{branchTotals.totalStudents}</td>
                <td className="px-3 py-2.5 text-right text-success">{branchTotals.active}</td>
                <td className="px-3 py-2.5 text-right text-error">{branchTotals.discontinued}</td>
                <td className="px-3 py-2.5 text-right text-text-primary">{branchTotals.staff}</td>
                <td className="px-3 py-2.5 text-right text-text-primary whitespace-nowrap">{formatCurrency(branchTotals.totalFee)}</td>
                <td className="px-3 py-2.5 text-right text-success whitespace-nowrap">{formatCurrency(branchTotals.collectedFee)}</td>
                <td className="px-3 py-2.5 text-right text-error whitespace-nowrap">{formatCurrency(branchTotals.pendingFee)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
