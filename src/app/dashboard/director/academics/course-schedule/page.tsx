"use client";

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranchAcademics } from "@/lib/api/analytics";
import { BranchDrillDown, safeNum, pctColor, pctBadgeColor } from "@/components/academics/BranchDrillDown";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { toast } from "sonner";
import {
  CalendarDays, ChevronRight, UserCheck, Download, FileText, FileSpreadsheet, Loader2, BarChart3,
} from "lucide-react";

/* ─── 3-D tilt stat card ─────────────────────────────────────────── */
function StatCard3D({
  icon: Icon,
  iconClass,
  label,
  value,
  sub,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [5, -5]), { stiffness: 320, damping: 32 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-5, 5]), { stiffness: 320, damping: 32 });
  const glowX   = useSpring(useTransform(mx, [-0.5, 0.5], [5, 95]), { stiffness: 180, damping: 22 });
  const glowY   = useSpring(useTransform(my, [-0.5, 0.5], [5, 95]), { stiffness: 180, damping: 22 });
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };
  return (
    <motion.div initial={{ opacity: 0, y: 18, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }} style={{ perspective: 800 }}>
      <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.18 }}
        className="relative overflow-hidden rounded-xl bg-surface border border-border-light shadow-card hover:shadow-card-hover transition-shadow duration-200 group p-4"
      >
        <motion.div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: useTransform([glowX, glowY], ([gx, gy]) =>
            `radial-gradient(220px circle at ${gx}% ${gy}%, rgba(103,58,183,0.07), transparent 65%)`) }} />
        <div className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: "linear-gradient(90deg, #673AB7, #7E57C2)" }} />
        <div className="relative flex items-start gap-3">
          <motion.div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}
            style={{ transformStyle: "preserve-3d" }} whileHover={{ rotateY: 16, rotateX: -10, scale: 1.08 }}
            transition={{ duration: 0.28 }}>
            <Icon className="h-4 w-4" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary mb-1">{label}</p>
            <p className="text-2xl font-black leading-none">{value}</p>
            {sub && <div className="mt-1.5">{sub}</div>}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

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

export default function DirectorAcademicsSchedulePage() {
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
        <div className="h-8 w-64 bg-surface rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-surface rounded-xl animate-pulse" />)}
        </div>
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />)}</div>
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

  const exportFileBase = `director-course-schedule-${workingDaysFrom || "range"}-${workingDaysTo || "range"}-${onlyProblems ? "problems" : "all"}`;

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

      sheet.addRow(["Director Course Schedule Overview"]);
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
      doc.text("Director Course Schedule Overview", 40, 32);
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
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <AnimatePresence mode="wait">
        {selectedBranch ? (
          <BranchDrillDown key={selectedBranch} branch={selectedBranch} onBack={() => setSelectedBranch(null)} defaultTab="schedule" />
        ) : (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">

            {/* ── Header ── */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, #673AB7 0%, #7E57C2 100%)", boxShadow: "0 4px 12px rgba(103,58,183,0.28)" }}
                  animate={{ rotateY: [0, 14, 0, -14, 0] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                >
                  <CalendarDays className="h-4 w-4 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-lg font-bold text-text-primary tracking-tight">Course Schedule Overview</h1>
                  <p className="text-xs text-text-secondary">Class schedules and completion across branches</p>
                </div>
              </div>

              {/* Controls row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Holiday pill */}
                <div className="flex items-center gap-1.5 bg-surface border border-border-light rounded-xl px-3 py-1.5 shadow-sm">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] text-text-tertiary">Public Holidays:</span>
                  <span className="text-[11px] font-bold text-primary">{publicHolidayDays}</span>
                  <button type="button" onClick={() => setHolidayAdjustment((v) => Math.max(v - 1, -basePublicHolidayDays))}
                    className="w-5 h-5 rounded-md border border-border-light text-text-secondary hover:text-primary hover:border-primary/40 transition-colors text-xs flex items-center justify-center" aria-label="Decrease">−</button>
                  <button type="button" onClick={() => setHolidayAdjustment((v) => v + 1)}
                    className="w-5 h-5 rounded-md border border-border-light text-text-secondary hover:text-primary hover:border-primary/40 transition-colors text-xs flex items-center justify-center" aria-label="Increase">+</button>
                  {holidayAdjustment !== 0 && (
                    <button type="button" onClick={() => setHolidayAdjustment(0)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-border-light text-text-secondary hover:text-primary transition-colors">Reset</button>
                  )}
                </div>

                {/* Filter toggle */}
                <div className="flex items-center gap-1 bg-surface border border-border-light rounded-xl p-1 shadow-sm">
                  <button type="button" onClick={() => setOnlyProblems(false)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${!onlyProblems ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:text-primary"}`}>
                    All Branches ({branches.length})
                  </button>
                  <button type="button" onClick={() => setOnlyProblems(true)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${onlyProblems ? "bg-error text-white shadow-sm" : "text-text-secondary hover:text-error"}`}>
                    Problem Branches ({problemBranchViews.length})
                  </button>
                </div>
              </div>
              {onlyProblems && (
                <p className="text-[11px] text-error">Showing branches with non-scheduled or attendance-pending days.</p>
              )}
            </motion.div>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              <StatCard3D icon={CalendarDays} iconClass="bg-primary-light text-primary"  label="Working Days"       value={<span className="text-primary">{totalWorkingDays}</span>}
                sub={workingDaysFrom && workingDaysTo ? <p className="text-[9px] text-text-tertiary leading-tight">{workingDaysFrom} → {workingDaysTo} (excl. Sun, {publicHolidayDays} holidays)</p> : undefined} delay={0} />
              <StatCard3D icon={CalendarDays} iconClass="bg-info/10 text-info"           label="Scheduled Days"     value={<span className="text-primary">{totalScheduledDays}</span>}     delay={0.05} />
              <StatCard3D icon={UserCheck}    iconClass="bg-success/15 text-success"     label="Attendance Marked"  value={<span className="text-success">{totalAttendanceMarked}</span>}  delay={0.10} />
              <StatCard3D icon={UserCheck}    iconClass="bg-error/10 text-error"         label="Att. Not Marked"   value={<span className="text-error">{totalAttendancePending}</span>}   delay={0.15} />
              <StatCard3D icon={BarChart3}    iconClass="bg-primary-light text-primary"  label="Operational %"     value={<span className={pctColor(overallOperationalPct, 80, 60)}>{overallOperationalPct}%</span>} delay={0.20} />
            </div>

            {/* ── Branch list ── */}
            <div className="space-y-1.5">
              {sorted.map(({ branch: b, metrics }, i) => {
                const branchPct = metrics.operationalPct;
                const isExpanded = expandedBranch === b.branch;
                const nonScheduledDates = b.non_scheduled_dates ?? [];
                const attendanceNotMarkedDates = b.attendance_not_marked_dates ?? [];
                return (
                  <motion.div
                    key={b.branch}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    className="relative overflow-hidden rounded-xl bg-surface border border-border-light shadow-card hover:shadow-card-hover transition-shadow duration-200 group"
                  >
                    {/* left accent stripe */}
                    <div className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full"
                      style={{ background: "linear-gradient(180deg, #673AB7, #7E57C2)" }} />

                    <div
                      onClick={() => setExpandedBranch((prev) => (prev === b.branch ? null : b.branch))}
                      className="flex items-center gap-4 px-4 py-3 pl-5 cursor-pointer"
                    >
                      {/* pct badge */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-[15px] font-black ${pctBadgeColor(branchPct, 80, 60)}`}>
                        {branchPct}%
                      </div>

                      {/* info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-text-primary truncate">{b.branch.replace("Smart Up ", "")}</p>
                        <p className="text-[11px] text-text-tertiary">{b.total_batches} batches · {b.total_instructors ?? 0} teachers</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px]">
                          <span className="text-text-tertiary">Working: <span className="font-semibold text-text-secondary">{metrics.workingDays}</span></span>
                          <span className="text-text-tertiary">Scheduled: <span className="font-semibold text-primary">{metrics.scheduledDays}</span></span>
                          <span className="text-text-tertiary">Non-scheduled: <span className="font-semibold text-warning">{metrics.nonScheduledDays}</span></span>
                          <span className="text-text-tertiary">Marked: <span className="font-semibold text-success">{metrics.attendanceMarkedDays}</span></span>
                          <span className="text-text-tertiary">Not marked: <span className="font-semibold text-error">{metrics.attendanceNotMarkedDays}</span></span>
                        </div>
                      </div>

                      {/* actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedBranch(b.branch); }}
                          className="px-2.5 py-1 rounded-lg border border-border-light text-[11px] font-semibold text-text-secondary hover:text-primary hover:border-primary/40 hover:bg-brand-wash transition-all"
                        >
                          Open
                        </button>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary-light border border-primary/20">
                          <ChevronRight className={`w-3.5 h-3.5 text-primary transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                        </div>
                      </div>
                    </div>

                    {/* expanded date panels */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="mx-4 mb-3 pt-3 border-t border-border-light grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div className="rounded-xl border border-warning/25 bg-warning/5 p-3">
                              <p className="text-[11px] font-bold text-warning mb-2">Not Scheduled Dates ({nonScheduledDates.length})</p>
                              {nonScheduledDates.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {nonScheduledDates.map((d) => (
                                    <span key={`${b.branch}-ns-${d}`} className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">{fmtDate(d)}</span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-text-tertiary">No missing schedule dates in this range.</p>
                              )}
                            </div>
                            <div className="rounded-xl border border-error/25 bg-error/5 p-3">
                              <p className="text-[11px] font-bold text-error mb-2">Attendance Not Marked Dates ({attendanceNotMarkedDates.length})</p>
                              {attendanceNotMarkedDates.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {attendanceNotMarkedDates.map((d) => (
                                    <span key={`${b.branch}-anm-${d}`} className="text-[10px] px-2 py-0.5 rounded-full bg-error/10 text-error border border-error/20">{fmtDate(d)}</span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-text-tertiary">No attendance-pending dates on scheduled days.</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
              {sorted.length === 0 && (
                <div className="bg-surface rounded-xl border border-border-light p-6 text-center text-sm text-text-tertiary">
                  No branches matched the selected filter.
                </div>
              )}
            </div>

            {/* ── Comparison table ── */}
            {sorted.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-bold text-text-primary">Branch Comparison</h2>
                  </div>
                  <div className="relative">
                    <button type="button" onClick={() => setExportOpen((v) => !v)} disabled={exporting !== null}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-light text-[11px] font-semibold text-text-secondary hover:text-primary hover:border-primary/40 hover:bg-brand-wash transition-all disabled:opacity-60">
                      {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Export
                    </button>
                    {exportOpen && (
                      <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border-light bg-surface shadow-card z-20 overflow-hidden">
                        <button type="button" onClick={handleExportPdf} disabled={exporting !== null}
                          className="w-full px-3 py-2.5 text-left text-[12px] text-text-secondary hover:bg-brand-wash hover:text-primary transition-colors flex items-center gap-2 disabled:opacity-60">
                          <FileText className="w-3.5 h-3.5" />Export PDF
                        </button>
                        <button type="button" onClick={handleExportExcel} disabled={exporting !== null}
                          className="w-full px-3 py-2.5 text-left text-[12px] text-text-secondary hover:bg-brand-wash hover:text-primary transition-colors flex items-center gap-2 disabled:opacity-60 border-t border-border-light">
                          <FileSpreadsheet className="w-3.5 h-3.5" />Export Excel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-surface rounded-xl border border-border-light overflow-hidden shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-light">
                          {["Branch","Working","Scheduled","Non-Scheduled","Att. Marked","Att. Not Marked","Batches","Teachers","Operational %"].map((h) => (
                            <th key={h} className={`py-2.5 px-3 text-[10px] font-bold uppercase tracking-widest text-text-tertiary ${h === "Branch" ? "text-left" : "text-center"}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map(({ branch: b, metrics }) => {
                          const branchPct = metrics.operationalPct;
                          return (
                            <tr key={b.branch} onClick={() => setSelectedBranch(b.branch)}
                              className="border-b border-border-light last:border-0 hover:bg-brand-wash transition-colors cursor-pointer group">
                              <td className="px-3 py-2.5 font-semibold text-[13px] text-text-primary group-hover:text-primary transition-colors">{b.branch.replace("Smart Up ", "")}</td>
                              <td className="px-3 py-2.5 text-center text-[13px] text-text-secondary">{metrics.workingDays}</td>
                              <td className="px-3 py-2.5 text-center text-[13px] text-text-secondary">{metrics.scheduledDays}</td>
                              <td className="px-3 py-2.5 text-center text-[13px] text-warning font-medium">{metrics.nonScheduledDays}</td>
                              <td className="px-3 py-2.5 text-center text-[13px] text-success font-medium">{metrics.attendanceMarkedDays}</td>
                              <td className="px-3 py-2.5 text-center text-[13px] text-error font-medium">{metrics.attendanceNotMarkedDays}</td>
                              <td className="px-3 py-2.5 text-center text-[13px] text-text-secondary">{b.total_batches}</td>
                              <td className="px-3 py-2.5 text-center text-[13px] text-text-secondary">{b.total_instructors ?? 0}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${pctBadgeColor(branchPct, 80, 60)}`}>{branchPct}%</span>
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
