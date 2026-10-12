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
  MapPin,
  GraduationCap,
  School,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import type { SchoolDetailData } from "@/lib/reports/summary-types";

async function fetchData(school: string, fromDate?: string, toDate?: string, program?: string): Promise<SchoolDetailData> {
  const res = await fetch("/api/director/report-students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "school", detail: school, fromDate, toDate, program }),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to fetch school details");
  }
  return (await res.json()).data;
}

interface Props {
  school: string;
  fromDate?: string;
  toDate?: string;
  selectedProgram?: string;
  onBack: () => void;
}

export function SchoolDetail({ school, fromDate, toDate, selectedProgram, onBack }: Props) {
  const [loading, setLoading] = useState<"xlsx" | "csv" | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["report-students", "school", school, fromDate, toDate, selectedProgram],
    queryFn: () => fetchData(school, fromDate, toDate, selectedProgram),
    staleTime: 60_000,
  });

  const handleExport = async (format: "xlsx" | "csv") => {
    setLoading(format);
    try {
      const res = await fetch("/api/director/report-students-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "school", detail: school, fromDate, toDate, program: selectedProgram, format }),
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Export failed");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] ?? `School_${school.replace(/\s+/g, "_")}.${format}`;
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
  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <AlertCircle className="h-6 w-6 text-error" />
        <p className="text-sm text-error">Failed to load school details</p>
      </div>
    );
  }

  const { summary, students } = data;

  const stats = [
    { label: "Total Students", value: summary.totalStudents, icon: Users, color: "text-primary" },
    { label: "Active", value: summary.active, icon: UserCheck, color: "text-success" },
    { label: "Discontinued", value: summary.discontinued, icon: UserX, color: "text-error" },
    { label: "Branches", value: summary.branchCount, icon: MapPin, color: "text-info" },
    { label: "Male", value: summary.male, icon: Users, color: "text-info" },
    { label: "Female", value: summary.female, icon: Users, color: "text-info" },
  ];

  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.studentName.toLowerCase().includes(q) ||
      s.studentId.toLowerCase().includes(q) ||
      s.branch.toLowerCase().includes(q) ||
      s.program.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back to Schools
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center">
            <School className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">{school}</h2>
          {selectedProgram && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-wash text-primary border border-primary/20">
              <GraduationCap className="h-3.5 w-3.5" />
              {selectedProgram}
            </span>
          )}
        </div>
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

      <div className="flex items-center justify-between p-4 bg-surface rounded-[14px] border border-border-light flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <p className="text-sm text-text-secondary font-medium shrink-0">
            {students.length} students enrolled
          </p>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search students, class, branch..."
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

      {students.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary text-sm">No students found for this school.</div>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-border-light bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-bg border-b border-border-light">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Student ID</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Name</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Branch</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Class / Program</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Gender</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Phone</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Guardian</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Joining Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {filteredStudents.map((s) => (
                <tr key={s.studentId} className="hover:bg-brand-wash/30 transition-colors">
                  <td className="px-3 py-2 text-text-secondary font-mono text-xs">{s.studentId}</td>
                  <td className="px-3 py-2 text-text-primary font-medium">{s.studentName}</td>
                  <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{s.branch}</td>
                  <td className="px-3 py-2 text-text-primary whitespace-nowrap flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" />
                    {s.program}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.status === "Active"
                          ? "bg-success/10 text-success"
                          : "bg-error/10 text-error"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{s.gender}</td>
                  <td className="px-3 py-2 text-text-secondary font-mono text-xs">{s.phone}</td>
                  <td className="px-3 py-2 text-text-secondary">{s.guardian}</td>
                  <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{s.joiningDate}</td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-text-tertiary">
                    No students match &ldquo;{search}&rdquo;
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
