"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CalendarCheck } from "lucide-react";
import type { AttendanceBranchRow } from "@/lib/reports/summary-types";
import { ShareReportMenu } from "@/components/reports/ShareReportMenu";

async function fetchData(
  fromDate?: string,
  toDate?: string,
): Promise<AttendanceBranchRow[]> {
  const res = await fetch("/api/director/report-attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "branch", fromDate, toDate }),
    credentials: "include",
  });
  if (!res.ok)
    throw new Error(
      (await res.json().catch(() => ({}))).error || "Failed",
    );
  return (await res.json()).data;
}

interface Props {
  fromDate?: string;
  toDate?: string;
  onDrillDown: (branch: string) => void;
}

export function AttendanceBranchSummary({ fromDate, toDate, onDrillDown }: Props) {
  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["report-attendance", "branch", "all", fromDate, toDate],
    queryFn: () => fetchData(fromDate, toDate),
    staleTime: 60_000,
  });

  const handleFetchExport = async (format: "xlsx" | "csv") => {
    const res = await fetch("/api/director/report-attendance-export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "branch", fromDate, toDate, format }),
      credentials: "include",
    });
    if (!res.ok)
      throw new Error(
        (await res.json().catch(() => ({}))).error || "Export failed",
      );
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const filename =
      disposition.match(/filename="?([^"]+)"?/)?.[1] ?? `Attendance_Branch_Report.${format}`;
    const blob = await res.blob();
    return { blob, filename };
  };

  if (isLoading)
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <video src="/logo-look.webm" autoPlay loop muted playsInline  className="w-20 h-20 object-contain" />
        <p className="text-xs font-semibold text-text-tertiary animate-pulse tracking-wide">Loading…</p>
      </div>
    );
  if (isError || !rows)
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <AlertCircle className="h-6 w-6 text-error" />
        <p className="text-sm text-error">Failed to load data</p>
      </div>
    );

  const totals = rows.reduce(
    (a, r) => ({
      totalSessions: a.totalSessions + r.totalSessions,
      present: a.present + r.present,
      absent: a.absent + r.absent,
      leave: a.leave + r.leave,
      students: a.students + r.students,
    }),
    { totalSessions: 0, present: 0, absent: 0, leave: 0, students: 0 },
  );
  const totalPct = totals.totalSessions > 0 ? Math.round((totals.present / totals.totalSessions) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-surface rounded-[14px] border border-border-light flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-brand-wash flex items-center justify-center">
            <CalendarCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">
              Attendance Report — Branch Wise
            </p>
            <p className="text-xs text-text-tertiary">
              {rows.length} branches
            </p>
          </div>
        </div>
        <ShareReportMenu
          title="Attendance Report - Branch Wise"
          subtitle={`${rows.length} branches · Total Sessions: ${totals.totalSessions.toLocaleString()}`}
          onExport={handleFetchExport}
        />
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary text-sm">
          No data.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-border-light">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-bg border-b border-border-light">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Branch</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Records</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Avg Attendance %</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Present</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Absent</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Leave</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Students</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {rows.map((r) => (
                <tr
                  key={r.branch}
                  onClick={() => onDrillDown(r.branch)}
                  className="cursor-pointer hover:bg-brand-wash/30 transition-colors"
                >
                  <td className="px-3 py-2 text-primary font-medium whitespace-nowrap">
                    {r.branch.replace("Smart Up ", "")}
                  </td>
                  <td className="px-3 py-2 text-right text-text-primary whitespace-nowrap">{r.totalSessions}</td>
                  <td className="px-3 py-2 text-right text-text-primary whitespace-nowrap">{r.avgAttendancePct}%</td>
                  <td className="px-3 py-2 text-right text-success whitespace-nowrap">{r.present}</td>
                  <td className="px-3 py-2 text-right text-error whitespace-nowrap">{r.absent}</td>
                  <td className="px-3 py-2 text-right text-warning whitespace-nowrap">{r.leave}</td>
                  <td className="px-3 py-2 text-right text-text-primary whitespace-nowrap">{r.students}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-app-bg border-t-2 border-border-light font-bold">
                <td className="px-3 py-2 text-text-primary">Total</td>
                <td className="px-3 py-2 text-right text-text-primary">{totals.totalSessions}</td>
                <td className="px-3 py-2 text-right text-text-primary">{totalPct}%</td>
                <td className="px-3 py-2 text-right text-success">{totals.present}</td>
                <td className="px-3 py-2 text-right text-error">{totals.absent}</td>
                <td className="px-3 py-2 text-right text-warning">{totals.leave}</td>
                <td className="px-3 py-2 text-right text-text-primary">{totals.students}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
