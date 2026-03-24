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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import type { StudentsBranchDetailData } from "@/lib/reports/summary-types";

async function fetchData(branch: string): Promise<StudentsBranchDetailData> {
  const res = await fetch("/api/director/report-students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "branch", detail: branch }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to fetch");
  }
  return (await res.json()).data;
}

interface Props {
  branch: string;
  onBack: () => void;
}

export function StudentsBranchDetail({ branch, onBack }: Props) {
  const [loading, setLoading] = useState<"xlsx" | "csv" | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["report-students", "branch", branch],
    queryFn: () => fetchData(branch),
    staleTime: 60_000,
  });

  const handleExport = async (format: "xlsx" | "csv") => {
    setLoading(format);
    try {
      const res = await fetch("/api/director/report-students-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "branch", detail: branch, format }),
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
  if (isError || !data) return <div className="flex flex-col items-center justify-center h-48 gap-2"><AlertCircle className="h-6 w-6 text-error" /><p className="text-sm text-error">Failed to load data</p></div>;

  const { summary, students } = data;

  const stats = [
    { label: "Total Students", value: summary.totalStudents, icon: Users, color: "text-primary" },
    { label: "Active", value: summary.active, icon: UserCheck, color: "text-success" },
    { label: "Discontinued", value: summary.discontinued, icon: UserX, color: "text-error" },
    { label: "Male", value: summary.male, icon: Users, color: "text-info" },
    { label: "Female", value: summary.female, icon: Users, color: "text-info" },
    { label: "New This Month", value: summary.newThisMonth, icon: UserCheck, color: "text-primary" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h2 className="text-lg font-bold text-text-primary">{branch.replace("Smart Up ", "")}</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="p-3 bg-surface rounded-[10px] border border-border-light">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <p className="text-xs text-text-tertiary">{stat.label}</p>
              </div>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between p-4 bg-surface rounded-[14px] border border-border-light">
        <p className="text-sm text-text-secondary font-medium">
          Student list &middot; {students.length} students
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

      {students.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary text-sm">No students found.</div>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-border-light">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-bg border-b border-border-light">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Student ID</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Name</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Gender</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Phone</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Guardian</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Joining Date</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Program</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {students.map((s) => (
                <tr key={s.studentId} className="hover:bg-brand-wash/30 transition-colors">
                  <td className="px-3 py-2 text-text-primary font-medium whitespace-nowrap">{s.studentId}</td>
                  <td className="px-3 py-2 text-text-primary whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {s.studentName}
                      {s.disabilities && <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">{s.disabilities}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={s.status === "Active" ? "text-success" : "text-error"}>{s.status}</span>
                  </td>
                  <td className="px-3 py-2 text-text-primary">{s.gender}</td>
                  <td className="px-3 py-2 text-text-primary whitespace-nowrap">{s.phone}</td>
                  <td className="px-3 py-2 text-text-primary whitespace-nowrap">{s.guardian}</td>
                  <td className="px-3 py-2 text-text-primary whitespace-nowrap">{s.joiningDate}</td>
                  <td className="px-3 py-2 text-text-primary whitespace-nowrap">{s.program}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
