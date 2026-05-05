"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranchAcademics } from "@/lib/api/analytics";
import { BranchDrillDown, safeNum, pctColor, pctBadgeColor } from "@/components/academics/BranchDrillDown";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, ClipboardCheck, AlertTriangle, Users,
  ChevronRight, UserCheck,
} from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function GMAttendancePage() {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [holidayAdjustment, setHolidayAdjustment] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["branch-academics"],
    queryFn: getBranchAcademics,
    staleTime: 120_000,
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

  const branches = data?.branches ?? [];
  const basePublicHolidayDays = safeNum(data?.overall?.public_holiday_days);
  const publicHolidayDays = Math.max(basePublicHolidayDays + holidayAdjustment, 0);

  const adjustedBranchMetrics = branches.map((b) => {
    const adjustedWorking = Math.max(safeNum(b.total_working_days) - holidayAdjustment, 0);
    const scheduled = Math.min(safeNum(b.scheduled_days), adjustedWorking);
    const attendanceMarked = Math.min(safeNum(b.attendance_marked_on_scheduled_days), scheduled);
    const nonScheduled = Math.max(adjustedWorking - scheduled, 0);
    const attendanceNotMarked = nonScheduled + Math.max(scheduled - attendanceMarked, 0);
    return {
      branch: b.branch,
      adjustedWorking,
      scheduled,
      nonScheduled,
      attendanceMarked,
      attendanceNotMarked,
    };
  });
  const metricByBranch = new Map(adjustedBranchMetrics.map((m) => [m.branch, m]));

  const visibleBranches = onlyProblems
    ? branches.filter((b) => {
        const m = metricByBranch.get(b.branch);
        return !!m && (m.nonScheduled > 0 || m.attendanceNotMarked > 0);
      })
    : branches;

  const sorted = [...visibleBranches].sort((a, b) => b.avg_attendance_pct - a.avg_attendance_pct);

  const totalStudents = visibleBranches.reduce((a, b) => a + b.total_students, 0);
  const overallAtt = visibleBranches.length
    ? Math.round(visibleBranches.reduce((a, b) => a + b.avg_attendance_pct, 0) / visibleBranches.length)
    : 0;
  const totalAbsentees = visibleBranches.reduce((a, b) => a + b.chronic_absentees, 0);
  const totalWorkingDays = Math.max(safeNum(data?.overall?.total_working_days) - holidayAdjustment, 0);
  const totalScheduledDays = visibleBranches.reduce((a, b) => a + (metricByBranch.get(b.branch)?.scheduled ?? 0), 0);
  const totalNonScheduledDays = visibleBranches.reduce((a, b) => a + (metricByBranch.get(b.branch)?.nonScheduled ?? 0), 0);
  const totalAttendanceMarked = visibleBranches.reduce((a, b) => a + (metricByBranch.get(b.branch)?.attendanceMarked ?? 0), 0);
  const totalAttendanceNotMarked = visibleBranches.reduce((a, b) => a + (metricByBranch.get(b.branch)?.attendanceNotMarked ?? 0), 0);
  const metricsFrom = data?.overall?.metrics_from_date ?? "";
  const metricsTo = data?.overall?.metrics_to_date ?? "";

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <AnimatePresence mode="wait">
        {selectedBranch ? (
          <BranchDrillDown
            key={selectedBranch}
            branch={selectedBranch}
            onBack={() => setSelectedBranch(null)}
            defaultTab="attendance"
          />
        ) : (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-primary">Attendance Overview</h1>
              <p className="text-sm text-text-tertiary mt-0.5">Cross-branch attendance analytics</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-text-tertiary">
                <span>
                  Public Holidays: <span className="font-semibold text-primary">{publicHolidayDays}</span>
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
                  onClick={() => setOnlyProblems(false)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    !onlyProblems
                      ? "bg-primary text-white border-primary"
                      : "bg-surface text-text-secondary border-border-light hover:border-primary/40"
                  }`}
                >
                  All Branches ({branches.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyProblems(true)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    onlyProblems
                      ? "bg-error text-white border-error"
                      : "bg-surface text-text-secondary border-border-light hover:border-error/40"
                  }`}
                >
                  Only Problem Branches ({branches.filter((b) => {
                    const m = metricByBranch.get(b.branch);
                    return !!m && (m.nonScheduled > 0 || m.attendanceNotMarked > 0);
                  }).length})
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-text-tertiary" />
                  <span className="text-xs text-text-tertiary font-medium">Branches</span>
                </div>
                <p className="text-2xl font-bold text-primary">{visibleBranches.length}</p>
              </motion.div>
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-text-tertiary" />
                  <span className="text-xs text-text-tertiary font-medium">Total Students</span>
                </div>
                <p className="text-2xl font-bold text-primary">{totalStudents}</p>
              </motion.div>
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardCheck className="w-4 h-4 text-success" />
                  <span className="text-xs text-text-tertiary font-medium">Avg Attendance</span>
                </div>
                <p className={`text-2xl font-bold ${pctColor(overallAtt)}`}>{overallAtt}%</p>
              </motion.div>
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-error" />
                  <span className="text-xs text-text-tertiary font-medium">Chronic Absentees</span>
                </div>
                <p className="text-2xl font-bold text-error">{totalAbsentees}</p>
              </motion.div>
            </motion.div>

            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-text-tertiary" />
                  <span className="text-xs text-text-tertiary font-medium">Working Days</span>
                </div>
                <p className="text-2xl font-bold text-primary">{totalWorkingDays}</p>
                {metricsFrom && metricsTo && (
                  <p className="text-[11px] text-text-tertiary mt-1">
                    May onward: {metricsFrom} to {metricsTo} (Sunday excluded, public holidays: {publicHolidayDays})
                  </p>
                )}
              </motion.div>
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardCheck className="w-4 h-4 text-info" />
                  <span className="text-xs text-text-tertiary font-medium">Scheduled Days</span>
                </div>
                <p className="text-2xl font-bold text-primary">{totalScheduledDays}</p>
              </motion.div>
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span className="text-xs text-text-tertiary font-medium">Not Scheduled</span>
                </div>
                <p className="text-2xl font-bold text-warning">{totalNonScheduledDays}</p>
              </motion.div>
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-4 h-4 text-success" />
                  <span className="text-xs text-text-tertiary font-medium">Attendance Marked</span>
                </div>
                <p className="text-2xl font-bold text-success">{totalAttendanceMarked}</p>
              </motion.div>
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-error" />
                  <span className="text-xs text-text-tertiary font-medium">Att Not Marked</span>
                </div>
                <p className="text-2xl font-bold text-error">{totalAttendanceNotMarked}</p>
              </motion.div>
            </motion.div>

            {/* Branch Rows */}
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
              {sorted.map((b) => (
                <motion.button
                  key={b.branch}
                  variants={item}
                  onClick={() => setSelectedBranch(b.branch)}
                  className="w-full text-left bg-surface rounded-[12px] border border-border-light p-4 hover:border-primary/30 hover:shadow-md transition-all group flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-[10px] flex items-center justify-center text-sm font-bold shrink-0 ${pctBadgeColor(safeNum(b.avg_attendance_pct))}`}>
                      {safeNum(b.avg_attendance_pct)}%
                    </div>
                    <div className="min-w-0">
                      {(() => {
                        const m = metricByBranch.get(b.branch);
                        return (
                          <>
                            <p className="text-sm font-semibold text-primary truncate">{b.branch.replace("Smart Up ", "")}</p>
                            <p className="text-xs text-text-tertiary">{b.total_students} students · {b.total_batches} batches</p>
                            <p className="text-xs text-text-tertiary mt-1">
                              Working: <span className="font-medium text-primary">{m?.adjustedWorking ?? 0}</span> · Scheduled: <span className="font-medium text-primary">{m?.scheduled ?? 0}</span> · Not scheduled: <span className="font-medium text-warning">{m?.nonScheduled ?? 0}</span> · Attendance marked: <span className="font-medium text-success">{m?.attendanceMarked ?? 0}</span> · Attendance not marked: <span className="font-medium text-error">{m?.attendanceNotMarked ?? 0}</span>
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    {b.chronic_absentees > 0 && (
                      <div className="flex items-center gap-1.5 bg-error/5 rounded-[8px] px-2.5 py-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-error" />
                        <span className="text-xs text-error font-medium">{b.chronic_absentees} at risk</span>
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-primary transition-colors" />
                  </div>
                </motion.button>
              ))}
            </motion.div>

            {/* Comparison Table */}
            {visibleBranches.length > 1 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h2 className="text-lg font-semibold text-primary mb-3">Branch Comparison</h2>
                <div className="bg-surface rounded-[12px] border border-border-light overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-app-bg border-b border-border-light">
                          <th className="text-left p-3 font-medium text-text-secondary">Branch</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Students</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Attendance</th>
                          <th className="text-center p-3 font-medium text-text-secondary">At Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((b) => (
                          <tr
                            key={b.branch}
                            onClick={() => setSelectedBranch(b.branch)}
                            className="border-b border-border-light last:border-0 hover:bg-app-bg transition-colors cursor-pointer"
                          >
                            <td className="p-3 font-medium text-primary">{b.branch.replace("Smart Up ", "")}</td>
                            <td className="p-3 text-center text-text-secondary">{b.total_students}</td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${pctBadgeColor(safeNum(b.avg_attendance_pct))}`}>
                                {safeNum(b.avg_attendance_pct)}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {b.chronic_absentees > 0 ? (
                                <span className="text-error font-medium">{b.chronic_absentees}</span>
                              ) : (
                                <span className="text-success">0</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
