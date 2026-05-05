"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getBranchActionsNeeded } from "@/lib/api/analytics";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ShieldCheck,
} from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function getAdjustedBranchWeekMetrics(branch: {
  working_days_this_week: number;
  scheduled_days_this_week: number;
  attendance_marked_on_scheduled_days_this_week: number;
}, holidayAdjustment: number) {
  const adjustedWorkingDays = Math.max(branch.working_days_this_week - holidayAdjustment, 0);
  const scheduledDays = Math.min(branch.scheduled_days_this_week, adjustedWorkingDays);
  const attendanceMarked = Math.min(branch.attendance_marked_on_scheduled_days_this_week, scheduledDays);
  const attendanceNotMarkedOnScheduled = Math.max(scheduledDays - attendanceMarked, 0);
  const notScheduledDays = Math.max(adjustedWorkingDays - scheduledDays, 0);
  const actionsNeededDays = notScheduledDays + attendanceNotMarkedOnScheduled;

  const actionItems: string[] = [];
  if (notScheduledDays > 0) {
    actionItems.push(`${notScheduledDays} working day(s) not scheduled this week`);
  }
  if (attendanceNotMarkedOnScheduled > 0) {
    actionItems.push(`${attendanceNotMarkedOnScheduled} scheduled day(s) attendance not marked`);
  }
  if (actionItems.length === 0) {
    actionItems.push("No immediate scheduling or attendance action needed this week.");
  }

  return {
    adjustedWorkingDays,
    scheduledDays,
    notScheduledDays,
    attendanceMarked,
    attendanceNotMarkedOnScheduled,
    actionsNeededDays,
    actionItems,
  };
}

function severityClass(actionsNeeded: number, workingDays: number): string {
  if (workingDays <= 0) return "bg-surface text-text-tertiary";
  const pct = (actionsNeeded / workingDays) * 100;
  if (pct >= 60) return "bg-error/10 text-error";
  if (pct >= 30) return "bg-warning/10 text-warning";
  if (pct > 0) return "bg-info/10 text-info";
  return "bg-success/10 text-success";
}

export default function GMActionsNeededPage() {
  const [onlyActionBranches, setOnlyActionBranches] = useState(true);
  const [holidayAdjustment, setHolidayAdjustment] = useState(0);
  // weekOffset: 0 = current week, -1 = last week, +1 = next week, etc.
  const [weekOffset, setWeekOffset] = useState(0);
  const router = useRouter();

  // Compute the Monday of the selected week
  const selectedWeekStart = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const mondayOffset = (day + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset + weekOffset * 7);
    return monday.toISOString().slice(0, 10);
  }, [weekOffset]);

  const isCurrentWeek = weekOffset === 0;

  const { data, isLoading } = useQuery({
    queryKey: ["branch-actions-needed", selectedWeekStart],
    queryFn: () => getBranchActionsNeeded(selectedWeekStart),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="h-8 w-64 bg-surface rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 bg-surface rounded-[12px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const allBranches = data?.branches ?? [];
  const branchViews = allBranches.map((branch) => ({
    branch,
    metrics: getAdjustedBranchWeekMetrics(branch, holidayAdjustment),
  }));
  const actionableBranchViews = branchViews.filter((v) => v.metrics.actionsNeededDays > 0);
  const visibleBranchViews = onlyActionBranches ? actionableBranchViews : branchViews;
  const sorted = [...visibleBranchViews].sort((a, b) => b.metrics.actionsNeededDays - a.metrics.actionsNeededDays);

  const weekFrom = data?.overall?.week_from_date ?? "";
  const weekTo = data?.overall?.week_to_date ?? "";
  const basePublicHolidayDays = data?.overall?.public_holiday_days_this_week ?? 0;
  const publicHolidayDays = Math.max(basePublicHolidayDays + holidayAdjustment, 0);
  const workingDaysThisWeek = Math.max((data?.overall?.working_days_this_week ?? 0) - holidayAdjustment, 0);
  const branchesWithActions = actionableBranchViews.length;
  const totalActionsNeededDays = sorted.reduce((sum, v) => sum + v.metrics.actionsNeededDays, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <AnimatePresence mode="wait">
        <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-primary">Actions Needed</h1>
              <p className="text-sm text-text-tertiary mt-0.5">Branch-wise weekly schedule and attendance follow-ups</p>

              {/* Week selector */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setWeekOffset((v) => v - 1); setHolidayAdjustment(0); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-light text-text-secondary hover:text-primary hover:border-primary/40 transition-colors text-sm"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-light bg-surface text-sm font-medium text-text-primary min-w-[220px] justify-center">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <span>
                    {weekFrom && weekTo
                      ? `${weekFrom} → ${weekTo}`
                      : selectedWeekStart}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setWeekOffset((v) => v + 1); setHolidayAdjustment(0); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-light text-text-secondary hover:text-primary hover:border-primary/40 transition-colors text-sm"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
                {!isCurrentWeek && (
                  <button
                    type="button"
                    onClick={() => { setWeekOffset(0); setHolidayAdjustment(0); }}
                    className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-sm hover:bg-primary/5 transition-colors"
                  >
                    This Week
                  </button>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
                <span>
                  (Sunday excluded, public holidays: {publicHolidayDays})
                </span>
                <button
                  type="button"
                  onClick={() => setHolidayAdjustment((v) => Math.max(v - 1, -basePublicHolidayDays))}
                  className="w-5 h-5 rounded border border-border-light text-text-secondary hover:text-primary hover:border-primary/40 transition-colors"
                  aria-label="Decrease public holidays"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setHolidayAdjustment((v) => v + 1)}
                  className="w-5 h-5 rounded border border-border-light text-text-secondary hover:text-primary hover:border-primary/40 transition-colors"
                  aria-label="Increase public holidays"
                >
                  +
                </button>
                {holidayAdjustment !== 0 && (
                  <button
                    type="button"
                    onClick={() => setHolidayAdjustment(0)}
                    className="px-2 py-0.5 rounded border border-border-light text-text-secondary hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyActionBranches(true)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    onlyActionBranches
                      ? "bg-error text-white border-error"
                      : "bg-surface text-text-secondary border-border-light hover:border-error/40"
                  }`}
                >
                  Need Action ({actionableBranchViews.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyActionBranches(false)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    !onlyActionBranches
                      ? "bg-primary text-white border-primary"
                      : "bg-surface text-text-secondary border-border-light hover:border-primary/40"
                  }`}
                >
                  All Branches ({allBranches.length})
                </button>
              </div>
            </div>

            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-error" />
                  <span className="text-xs text-text-tertiary font-medium">Branches With Actions</span>
                </div>
                <p className="text-2xl font-bold text-error">{branchesWithActions}</p>
              </motion.div>
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="w-4 h-4 text-warning" />
                  <span className="text-xs text-text-tertiary font-medium">Public Holidays This Week</span>
                </div>
                <p className="text-2xl font-bold text-warning">{publicHolidayDays}</p>
              </motion.div>
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="w-4 h-4 text-text-tertiary" />
                  <span className="text-xs text-text-tertiary font-medium">Working Days This Week</span>
                </div>
                <p className="text-2xl font-bold text-primary">{workingDaysThisWeek}</p>
              </motion.div>
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardCheck className="w-4 h-4 text-warning" />
                  <span className="text-xs text-text-tertiary font-medium">Total Action Days</span>
                </div>
                <p className="text-2xl font-bold text-warning">{totalActionsNeededDays}</p>
                <p className="text-[11px] text-text-tertiary mt-1">
                  Sum of (Not Scheduled + Attendance Not Marked) across visible branches
                </p>
              </motion.div>
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-success" />
                  <span className="text-xs text-text-tertiary font-medium">Resolved Branches</span>
                </div>
                <p className="text-2xl font-bold text-success">{Math.max(branchViews.length - branchesWithActions, 0)}</p>
              </motion.div>
            </motion.div>

            <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
              {sorted.map(({ branch: b, metrics }) => (
                <motion.button
                  key={b.branch}
                  variants={item}
                  onClick={() => router.push(`/dashboard/general-manager/actions-needed/${encodeURIComponent(b.branch)}`)}
                  className="w-full text-left bg-surface rounded-[12px] border border-border-light p-4 hover:border-primary/30 hover:shadow-md transition-all group flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <p className="text-sm font-semibold text-primary truncate">{b.branch.replace("Smart Up ", "")}</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${severityClass(metrics.actionsNeededDays, metrics.adjustedWorkingDays)}`}>
                        {metrics.actionsNeededDays} action day{metrics.actionsNeededDays === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-xs text-text-tertiary tabular-nums">
                      <p className="text-left sm:text-center">Working: {metrics.adjustedWorkingDays}</p>
                      <p className="text-left sm:text-center">Scheduled: {metrics.scheduledDays}</p>
                      <p className="text-left sm:text-center">Not scheduled: {metrics.notScheduledDays}</p>
                      <p className="text-left sm:text-center">Attendance not marked: {metrics.attendanceNotMarkedOnScheduled}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {metrics.actionItems.map((action) => (
                        <span key={action} className="text-[11px] bg-app-bg text-text-secondary rounded px-2 py-0.5">
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-primary transition-colors shrink-0" />
                </motion.button>
              ))}
              {sorted.length === 0 && (
                <div className="bg-surface rounded-[12px] border border-border-light p-6 text-center text-sm text-text-tertiary">
                  No branches found for the selected filter.
                </div>
              )}
            </motion.div>
          </motion.div>
      </AnimatePresence>
    </div>
  );
}
