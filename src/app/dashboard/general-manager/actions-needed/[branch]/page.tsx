"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getBranchActionsNeededDetail } from "@/lib/api/analytics";
import { ArrowLeft, CalendarDays, CheckCircle2, AlertTriangle, ClipboardCheck } from "lucide-react";

function statusBadge(status: "not_scheduled" | "attendance_not_marked" | "resolved") {
  if (status === "not_scheduled") return "bg-warning/10 text-warning";
  if (status === "attendance_not_marked") return "bg-error/10 text-error";
  return "bg-success/10 text-success";
}

function statusLabel(status: "not_scheduled" | "attendance_not_marked" | "resolved") {
  if (status === "not_scheduled") return "Not Scheduled";
  if (status === "attendance_not_marked") return "Attendance Not Marked";
  return "Resolved";
}

export default function GMActionNeededBranchDetailPage() {
  const params = useParams<{ branch: string }>();
  const branch = decodeURIComponent(params?.branch ?? "");

  const { data, isLoading } = useQuery({
    queryKey: ["branch-actions-needed-detail", branch],
    queryFn: () => getBranchActionsNeededDetail(branch),
    enabled: !!branch,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
        <div className="h-8 w-72 bg-surface rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-[12px] animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-surface rounded-[12px] animate-pulse" />
      </div>
    );
  }

  const detail = data;
  if (!detail) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <p className="text-sm text-text-tertiary">Unable to load branch action details.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="space-y-2">
        <Link
          href="/dashboard/general-manager/actions-needed"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Actions Needed
        </Link>
        <h1 className="text-2xl font-bold text-primary">{detail.branch.replace("Smart Up ", "")} - Action Details</h1>
        <p className="text-xs text-text-tertiary">
          Week: {detail.week_from_date} to {detail.week_to_date} (Sunday excluded, public holidays: {detail.public_holiday_days_this_week})
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface rounded-[12px] border border-border-light p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-4 h-4 text-text-tertiary" />
            <span className="text-xs text-text-tertiary">Working Days</span>
          </div>
          <p className="text-2xl font-bold text-primary">{detail.working_days_this_week}</p>
        </div>
        <div className="bg-surface rounded-[12px] border border-border-light p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-xs text-text-tertiary">Not Scheduled Days</span>
          </div>
          <p className="text-2xl font-bold text-warning">{detail.not_scheduled_days_this_week}</p>
        </div>
        <div className="bg-surface rounded-[12px] border border-border-light p-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className="w-4 h-4 text-error" />
            <span className="text-xs text-text-tertiary">Attendance Not Marked</span>
          </div>
          <p className="text-2xl font-bold text-error">{detail.attendance_not_marked_on_scheduled_days_this_week}</p>
        </div>
        <div className="bg-surface rounded-[12px] border border-border-light p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-xs text-text-tertiary">Scheduled Days</span>
          </div>
          <p className="text-2xl font-bold text-success">{detail.scheduled_days_this_week}</p>
        </div>
      </div>

      <div className="bg-surface rounded-[12px] border border-border-light overflow-hidden">
        <div className="p-4 border-b border-border-light">
          <h2 className="text-base font-semibold text-primary">Day-Wise Action Breakdown</h2>
          <p className="text-xs text-text-tertiary mt-0.5">Exact days that are not scheduled or attendance not marked.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-bg border-b border-border-light">
                <th className="text-left p-3 font-medium text-text-secondary">Date</th>
                <th className="text-center p-3 font-medium text-text-secondary">Scheduled</th>
                <th className="text-center p-3 font-medium text-text-secondary">Attendance Marked</th>
                <th className="text-center p-3 font-medium text-text-secondary">Status</th>
              </tr>
            </thead>
            <tbody>
              {detail.day_details.map((d) => (
                <tr key={d.date} className="border-b border-border-light last:border-0">
                  <td className="p-3 font-medium text-primary">{d.date}</td>
                  <td className="p-3 text-center text-text-secondary">{d.scheduled ? "Yes" : "No"}</td>
                  <td className="p-3 text-center text-text-secondary">{d.attendance_marked ? "Yes" : "No"}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${statusBadge(d.status)}`}>
                      {statusLabel(d.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-surface rounded-[12px] border border-border-light p-4">
          <h3 className="text-sm font-semibold text-primary mb-2">Not Scheduled Dates</h3>
          {detail.not_scheduled_dates.length ? (
            <div className="flex flex-wrap gap-1.5">
              {detail.not_scheduled_dates.map((date) => (
                <span key={date} className="text-xs bg-warning/10 text-warning rounded px-2 py-0.5">{date}</span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">No not-scheduled dates this week.</p>
          )}
        </div>
        <div className="bg-surface rounded-[12px] border border-border-light p-4">
          <h3 className="text-sm font-semibold text-primary mb-2">Attendance Not Marked Dates</h3>
          {detail.attendance_not_marked_dates.length ? (
            <div className="flex flex-wrap gap-1.5">
              {detail.attendance_not_marked_dates.map((date) => (
                <span key={date} className="text-xs bg-error/10 text-error rounded px-2 py-0.5">{date}</span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">Attendance is marked for all scheduled days this week.</p>
          )}
        </div>
      </div>
    </div>
  );
}
