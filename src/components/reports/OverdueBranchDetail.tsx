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
  IndianRupee,
  AlertTriangle,
  Users,
  TrendingDown,
  Clock,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import type { OverdueBranchDetailData } from "@/lib/reports/summary-types";

function fmt(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function fetchData(branch: string): Promise<OverdueBranchDetailData> {
  const res = await fetch("/api/director/report-overdue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "branch", detail: branch }),
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
  return (await res.json()).data;
}

interface Props {
  branch: string;
  onBack: () => void;
}

export function OverdueBranchDetail({ branch, onBack }: Props) {
  const [loading, setLoading] = useState<"xlsx" | "csv" | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["report-overdue", "branch", branch],
    queryFn: () => fetchData(branch),
    staleTime: 60_000,
  });

  const handleExport = async (format: "xlsx" | "csv") => {
    setLoading(format);
    try {
      const res = await fetch("/api/director/report-overdue-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "branch", detail: branch, format }),
        credentials: "include",
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

  if (isLoading)
    return (
      <GifLoader />
    );
  if (isError || !data)
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <AlertCircle className="h-6 w-6 text-error" />
        <p className="text-sm text-error">Failed to load data</p>
      </div>
    );

  const { summary, students } = data;

  const stats = [
    {
      label: "Total Fee",
      value: fmt(summary.totalFee),
      icon: IndianRupee,
      color: "text-text-primary",
    },
    {
      label: "Collected",
      value: fmt(summary.collected),
      icon: IndianRupee,
      color: "text-success",
    },
    {
      label: "Overdue",
      value: fmt(summary.overdueAmount),
      icon: AlertTriangle,
      color: "text-error",
    },
    {
      label: "Pending",
      value: fmt(summary.pending),
      icon: Clock,
      color: "text-warning",
    },
    {
      label: "Overdue %",
      value: `${summary.overduePct}%`,
      icon: TrendingDown,
      color: "text-error",
    },
    {
      label: "Overdue Students",
      value: String(summary.overdueStudents),
      icon: Users,
      color: "text-error",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h2 className="text-lg font-bold text-text-primary">
          {branch.replace("Smart Up ", "")} — Overdue
        </h2>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
          {students.length} students with overdue invoices
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleExport("xlsx")}
            disabled={loading !== null}
          >
            {loading === "xlsx" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Excel <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            disabled={loading !== null}
          >
            {loading === "csv" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            CSV <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Student table */}
      <div className="overflow-x-auto rounded-[10px] border border-border-light">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-app-bg border-b border-border-light">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Student
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Parent
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Class / Plan
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Plan Type
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Total Fee
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Paid
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Overdue
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Inst. Amount
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Inst. Paid
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Pending
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Oldest Due
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Days Overdue
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {students.map((student) => (
              <tr
                key={student.studentId}
                className="hover:bg-brand-wash/30 transition-colors"
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  <p className="text-text-primary font-medium">{student.studentName}</p>
                  <p className="text-text-tertiary text-xs">{student.studentId}</p>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <p className="text-text-secondary text-sm">{student.parentName}</p>
                  {student.parentPhone && student.parentPhone !== "—" && (
                    <a
                      href={`tel:${student.parentPhone}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Phone className="h-3 w-3" />
                      {student.parentPhone}
                    </a>
                  )}
                </td>
                <td className="px-3 py-2 text-text-secondary whitespace-nowrap">
                  {student.program}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-wash text-primary">
                    {student.planType}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-text-primary whitespace-nowrap">
                  {fmt(student.totalFee)}
                </td>
                <td className="px-3 py-2 text-right text-success whitespace-nowrap">
                  {fmt(student.paid)}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 text-error font-semibold">
                    <AlertTriangle className="h-3 w-3" />
                    {fmt(student.overdueAmount)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-text-primary whitespace-nowrap">
                  {fmt(student.installmentAmount)}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <span className={student.installmentPaid > 0 ? "text-success" : "text-text-tertiary"}>
                    {student.installmentPaid > 0 ? fmt(student.installmentPaid) : "—"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-warning whitespace-nowrap">
                  {student.pending > 0 ? fmt(student.pending) : "—"}
                </td>
                <td className="px-3 py-2 text-right text-text-secondary whitespace-nowrap">
                  {formatDate(student.oldestDueDate)}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <span
                    className={
                      student.daysOverdue > 60
                        ? "text-error font-bold"
                        : student.daysOverdue > 30
                          ? "text-error"
                          : "text-warning"
                    }
                  >
                    {student.daysOverdue}d
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {students.length === 0 && (
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-text-secondary">
          <AlertTriangle className="h-8 w-8 text-success" />
          <p className="text-sm font-medium">No overdue students in this branch</p>
        </div>
      )}
    </div>
  );
}
