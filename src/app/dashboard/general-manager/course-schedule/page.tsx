"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranchAcademics } from "@/lib/api/analytics";
import { BranchDrillDown, safeNum, pctColor, pctBadgeColor } from "@/components/academics/BranchDrillDown";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  CalendarDays, ChevronRight, UserCheck, Download, FileText, FileSpreadsheet, Loader2,
} from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function getAdjustedBranchMetrics(branch: {
  total_working_days?: number;
  scheduled_days?: number;
  attendance_marked_on_scheduled_days?: number;
  attendance_not_marked_on_scheduled_days?: number;
}, holidayAdjustment: number) {
  const workingDays = safeNum(branch.total_working_days);
  const adjustedWorkingDays = Math.max(workingDays - holidayAdjustment, 0);

  const baseScheduledDays = safeNum(branch.scheduled_days);
  const scheduledDays = Math.min(baseScheduledDays, adjustedWorkingDays);

  const baseMarkedDays = safeNum(branch.attendance_marked_on_scheduled_days);
  const attendanceMarkedDays = Math.min(baseMarkedDays, scheduledDays);

  const pendingScheduledDays = Math.max(scheduledDays - attendanceMarkedDays, 0);
  const nonScheduledDays = Math.max(adjustedWorkingDays - scheduledDays, 0);

  // Attendance-not-marked definition: non-scheduled working days + scheduled days with pending attendance.
  const attendanceNotMarkedDays = nonScheduledDays + pendingScheduledDays;

  const operationalPct = adjustedWorkingDays > 0
    ? Math.max(0, Math.round(((adjustedWorkingDays - attendanceNotMarkedDays) / adjustedWorkingDays) * 1000) / 10)
    : 0;

  return {
    workingDays: adjustedWorkingDays,
    scheduledDays,
    nonScheduledDays,
    attendanceMarkedDays,
    attendanceNotMarkedDays,
    operationalPct,
  };
}

export default function GMCourseSchedulePage() {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [holidayAdjustment, setHolidayAdjustment] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  const fmtDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

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
  const branchViews = branches.map((branch) => ({
    branch,
    metrics: getAdjustedBranchMetrics(branch, holidayAdjustment),
  }));
  const problemBranchViews = branchViews.filter((v) =>
    v.metrics.nonScheduledDays > 0 || v.metrics.attendanceNotMarkedDays > 0,
  );
  const filteredBranchViews = onlyProblems ? problemBranchViews : branchViews;
  const sorted = [...filteredBranchViews].sort((a, b) => b.metrics.operationalPct - a.metrics.operationalPct);

  const overallOperationalPct = filteredBranchViews.length
    ? Math.round(filteredBranchViews.reduce((a, v) => a + v.metrics.operationalPct, 0) / filteredBranchViews.length)
    : 0;
  const totalScheduledDays = filteredBranchViews.reduce((a, v) => a + v.metrics.scheduledDays, 0);
  const totalAttendanceMarked = filteredBranchViews.reduce((a, v) => a + v.metrics.attendanceMarkedDays, 0);
  const totalAttendancePending = filteredBranchViews.reduce((a, v) => a + v.metrics.attendanceNotMarkedDays, 0);
  const workingDaysFrom = data?.overall?.metrics_from_date ?? "";
  const workingDaysTo = data?.overall?.metrics_to_date ?? "";
  const basePublicHolidayDays = safeNum(data?.overall?.public_holiday_days);
  const publicHolidayDays = Math.max(basePublicHolidayDays + holidayAdjustment, 0);
  const totalWorkingDays = Math.max(safeNum(data?.overall?.total_working_days) - holidayAdjustment, 0);

  const exportRows = sorted.map(({ branch: b, metrics }) => ({
    branch: b.branch.replace("Smart Up ", ""),
    working: metrics.workingDays,
    scheduled: metrics.scheduledDays,
    nonScheduled: metrics.nonScheduledDays,
    attendanceMarked: metrics.attendanceMarkedDays,
    attendanceNotMarked: metrics.attendanceNotMarkedDays,
    batches: safeNum(b.total_batches),
    teachers: safeNum(b.total_instructors),
    operationalPct: metrics.operationalPct,
  }));

  const exportFileBase = `gm-course-schedule-${workingDaysFrom || "range"}-${workingDaysTo || "range"}-${onlyProblems ? "problems" : "all"}`;

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = async () => {
    if (exportRows.length === 0) {
      toast.error("No branch data available to export");
      return;
    }
    try {
      setExporting("excel");
      setExportOpen(false);
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Branch Comparison");

      sheet.addRow(["GM Course Schedule Overview"]);
      sheet.addRow([`Range: ${workingDaysFrom || "-"} to ${workingDaysTo || "-"}`]);
      sheet.addRow([`Public holidays: ${publicHolidayDays} | Working days: ${totalWorkingDays}`]);
      sheet.addRow([`Filter: ${onlyProblems ? "Only Problem Branches" : "All Branches"}`]);
      sheet.addRow([" "]);

      const header = [
        "Branch",
        "Working",
        "Scheduled",
        "Non-Scheduled",
        "Attendance Marked",
        "Attendance Not Marked",
        "Batches",
        "Teachers",
        "Operational %",
      ];
      sheet.addRow(header);

      for (const row of exportRows) {
        sheet.addRow([
          row.branch,
          row.working,
          row.scheduled,
          row.nonScheduled,
          row.attendanceMarked,
          row.attendanceNotMarked,
          row.batches,
          row.teachers,
          row.operationalPct,
        ]);
      }

      const headerRow = sheet.getRow(6);
      headerRow.font = { bold: true };
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE8F1FF" },
        };
      });

      sheet.columns = [
        { width: 24 },
        { width: 12 },
        { width: 12 },
        { width: 16 },
        { width: 20 },
        { width: 24 },
        { width: 10 },
        { width: 10 },
        { width: 14 },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `${exportFileBase}.xlsx`,
      );
      toast.success("Excel exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Excel export failed");
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    if (exportRows.length === 0) {
      toast.error("No branch data available to export");
      return;
    }
    try {
      setExporting("pdf");
      setExportOpen(false);
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

      doc.setFontSize(14);
      doc.text("GM Course Schedule Overview", 40, 32);
      doc.setFontSize(10);
      doc.text(`Range: ${workingDaysFrom || "-"} to ${workingDaysTo || "-"}`, 40, 50);
      doc.text(`Public holidays: ${publicHolidayDays} | Working days: ${totalWorkingDays}`, 40, 64);
      doc.text(`Filter: ${onlyProblems ? "Only Problem Branches" : "All Branches"}`, 40, 78);

      autoTable(doc, {
        startY: 92,
        head: [["Branch", "Working", "Scheduled", "Non-Scheduled", "Attendance Marked", "Attendance Not Marked", "Batches", "Teachers", "Operational %"]],
        body: exportRows.map((row) => [
          row.branch,
          row.working,
          row.scheduled,
          row.nonScheduled,
          row.attendanceMarked,
          row.attendanceNotMarked,
          row.batches,
          row.teachers,
          `${row.operationalPct}%`,
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [22, 163, 74] },
      });

      doc.save(`${exportFileBase}.pdf`);
      toast.success("PDF exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PDF export failed");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <AnimatePresence mode="wait">
        {selectedBranch ? (
          <BranchDrillDown
            key={selectedBranch}
            branch={selectedBranch}
            onBack={() => setSelectedBranch(null)}
            defaultTab="schedule"
          />
        ) : (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-primary">Course Schedule Overview</h1>
              <p className="text-sm text-text-tertiary mt-0.5">Class schedules and completion across branches</p>
            </div>
            <div>
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
                  Only Problem Branches ({problemBranchViews.length})
                </button>
              </div>
              {onlyProblems && (
                <p className="text-xs text-error mt-1">
                  Showing branches with non-scheduled working days or attendance not marked days.
                </p>
              )}
            </div>

            {/* Summary */}
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="w-4 h-4 text-text-tertiary" />
                  <span className="text-xs text-text-tertiary font-medium">Working Days</span>
                </div>
                <p className="text-2xl font-bold text-primary">{totalWorkingDays}</p>
                {workingDaysFrom && workingDaysTo && (
                  <p className="text-[11px] text-text-tertiary mt-1">
                    May onward: {workingDaysFrom} to {workingDaysTo} (Sunday excluded, public holidays: {publicHolidayDays})
                  </p>
                )}
              </motion.div>
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="w-4 h-4 text-info" />
                  <span className="text-xs text-text-tertiary font-medium">Scheduled Days</span>
                </div>
                <p className="text-2xl font-bold text-primary">{totalScheduledDays}</p>
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
                  <UserCheck className="w-4 h-4 text-error" />
                  <span className="text-xs text-text-tertiary font-medium">Attendance Not Marked</span>
                </div>
                <p className="text-2xl font-bold text-error">{totalAttendancePending}</p>
              </motion.div>
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-4 h-4 text-success" />
                  <span className="text-xs text-text-tertiary font-medium">Operational %</span>
                </div>
                <p className={`text-2xl font-bold ${pctColor(overallOperationalPct, 80, 60)}`}>{overallOperationalPct}%</p>
              </motion.div>
            </motion.div>

            {/* Branch Rows */}
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
              {sorted.map(({ branch: b, metrics }) => {
                const branchPct = metrics.operationalPct;
                const isExpanded = expandedBranch === b.branch;
                const nonScheduledDates = b.non_scheduled_dates ?? [];
                const attendanceNotMarkedDates = b.attendance_not_marked_dates ?? [];
                return (
                  <motion.div
                    key={b.branch}
                    variants={item}
                    onClick={() => setExpandedBranch((prev) => (prev === b.branch ? null : b.branch))}
                    className="w-full text-left bg-surface rounded-[12px] border border-border-light p-4 hover:border-primary/30 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-12 h-12 rounded-[10px] flex items-center justify-center text-sm font-bold shrink-0 ${pctBadgeColor(branchPct, 80, 60)}`}>
                          {branchPct}%
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary truncate">{b.branch.replace("Smart Up ", "")}</p>
                          <p className="text-xs text-text-tertiary">{b.total_batches} batches · {b.total_instructors ?? 0} teachers</p>
                          <p className="text-xs text-text-tertiary mt-1">
                            Working: <span className="font-medium text-primary">{metrics.workingDays}</span> · Scheduled: <span className="font-medium text-primary">{metrics.scheduledDays}</span> · Non-scheduled: <span className="font-medium text-primary">{metrics.nonScheduledDays}</span> · Attendance marked: <span className="font-medium text-success">{metrics.attendanceMarkedDays}</span> · Not marked: <span className="font-medium text-error">{metrics.attendanceNotMarkedDays}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBranch(b.branch);
                          }}
                          className="px-2.5 py-1 rounded-md border border-border-light text-xs text-text-secondary hover:text-primary hover:border-primary/40 transition-colors"
                        >
                          Open
                        </button>
                        <ChevronRight
                          className={`w-4 h-4 text-text-tertiary group-hover:text-primary transition-all ${isExpanded ? "rotate-90" : ""}`}
                        />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border-light grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="rounded-[10px] border border-warning/25 bg-warning/5 p-3">
                          <p className="text-xs font-semibold text-warning mb-2">
                            Not Scheduled Dates ({nonScheduledDates.length})
                          </p>
                          {nonScheduledDates.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {nonScheduledDates.map((d) => (
                                <span
                                  key={`${b.branch}-ns-${d}`}
                                  className="text-[11px] px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20"
                                >
                                  {fmtDate(d)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-text-tertiary">No missing schedule dates in this range.</p>
                          )}
                        </div>

                        <div className="rounded-[10px] border border-error/25 bg-error/5 p-3">
                          <p className="text-xs font-semibold text-error mb-2">
                            Attendance Not Marked Dates ({attendanceNotMarkedDates.length})
                          </p>
                          {attendanceNotMarkedDates.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {attendanceNotMarkedDates.map((d) => (
                                <span
                                  key={`${b.branch}-anm-${d}`}
                                  className="text-[11px] px-2 py-0.5 rounded-full bg-error/10 text-error border border-error/20"
                                >
                                  {fmtDate(d)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-text-tertiary">No attendance-pending dates on scheduled days.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
              {sorted.length === 0 && (
                <div className="bg-surface rounded-[12px] border border-border-light p-6 text-center text-sm text-text-tertiary">
                  No branches matched the selected filter.
                </div>
              )}
            </motion.div>

            {/* Comparison Table */}
            {sorted.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-primary">Branch Comparison</h2>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setExportOpen((v) => !v)}
                      disabled={exporting !== null}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border-light text-sm text-text-secondary hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-60"
                    >
                      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Export
                    </button>
                    {exportOpen && (
                      <div className="absolute right-0 mt-2 w-44 rounded-lg border border-border-light bg-surface shadow-md z-20 overflow-hidden">
                        <button
                          type="button"
                          onClick={handleExportPdf}
                          disabled={exporting !== null}
                          className="w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-app-bg hover:text-primary transition-colors flex items-center gap-2 disabled:opacity-60"
                        >
                          <FileText className="w-4 h-4" />
                          Export PDF
                        </button>
                        <button
                          type="button"
                          onClick={handleExportExcel}
                          disabled={exporting !== null}
                          className="w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-app-bg hover:text-primary transition-colors flex items-center gap-2 disabled:opacity-60 border-t border-border-light"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          Export Excel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-surface rounded-[12px] border border-border-light overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-app-bg border-b border-border-light">
                          <th className="text-left p-3 font-medium text-text-secondary">Branch</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Working</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Scheduled</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Non-Scheduled</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Attendance Marked</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Attendance Not Marked</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Batches</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Teachers</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Operational %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map(({ branch: b, metrics }) => {
                          const branchPct = metrics.operationalPct;
                          return (
                            <tr
                              key={b.branch}
                              onClick={() => setSelectedBranch(b.branch)}
                              className="border-b border-border-light last:border-0 hover:bg-app-bg transition-colors cursor-pointer"
                            >
                              <td className="p-3 font-medium text-primary">{b.branch.replace("Smart Up ", "")}</td>
                              <td className="p-3 text-center text-text-secondary">{metrics.workingDays}</td>
                              <td className="p-3 text-center text-text-secondary">{metrics.scheduledDays}</td>
                              <td className="p-3 text-center text-text-secondary">{metrics.nonScheduledDays}</td>
                              <td className="p-3 text-center text-success font-medium">{metrics.attendanceMarkedDays}</td>
                              <td className="p-3 text-center text-error font-medium">{metrics.attendanceNotMarkedDays}</td>
                              <td className="p-3 text-center text-text-secondary">{b.total_batches}</td>
                              <td className="p-3 text-center text-text-secondary">{b.total_instructors ?? 0}</td>
                              <td className="p-3 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${pctBadgeColor(branchPct, 80, 60)}`}>
                                  {branchPct}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
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
