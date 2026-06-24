"use client";

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranchAcademics } from "@/lib/api/analytics";
import { BranchDrillDown, safeNum, pctColor, pctBadgeColor } from "@/components/academics/BranchDrillDown";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Building2, ClipboardCheck, AlertTriangle, Users,
  ChevronRight, UserCheck, CalendarDays, TrendingUp,
  BarChart3, ShieldAlert,
} from "lucide-react";

/* ─── Reusable 3-D tilt stat card ─────────────────────────────────── */
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
  const cardRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [5, -5]), { stiffness: 320, damping: 32 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-5, 5]), { stiffness: 320, damping: 32 });
  const glowX = useSpring(useTransform(mx, [-0.5, 0.5], [5, 95]), { stiffness: 180, damping: 22 });
  const glowY = useSpring(useTransform(my, [-0.5, 0.5], [5, 95]), { stiffness: 180, damping: 22 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 800 }}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ duration: 0.18 }}
        className="relative overflow-hidden rounded-xl bg-surface border border-border-light shadow-card hover:shadow-card-hover transition-shadow duration-200 group p-4"
      >
        {/* cursor shimmer */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: useTransform(
              [glowX, glowY],
              ([gx, gy]) =>
                `radial-gradient(220px circle at ${gx}% ${gy}%, rgba(103,58,183,0.07), transparent 65%)`
            ),
          }}
        />
        {/* top accent line */}
        <div
          className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: "linear-gradient(90deg, #673AB7, #7E57C2)" }}
        />

        <div className="relative flex items-start gap-3">
          <motion.div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}
            style={{ transformStyle: "preserve-3d" }}
            whileHover={{ rotateY: 16, rotateX: -10, scale: 1.08 }}
            transition={{ duration: 0.28 }}
          >
            <Icon className="h-4 w-4" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary mb-1">{label}</p>
            <p className="text-2xl font-black leading-none text-text-primary">{value}</p>
            {sub && <div className="mt-1.5">{sub}</div>}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Branch row card ─────────────────────────────────────────────── */
function BranchRow({
  b,
  m,
  onClick,
  delay,
}: {
  b: {
    branch: string;
    avg_attendance_pct: number;
    total_students: number;
    total_batches: number;
    chronic_absentees: number;
  };
  m:
    | {
        adjustedWorking: number;
        scheduled: number;
        nonScheduled: number;
        attendanceMarked: number;
        attendanceNotMarked: number;
      }
    | undefined;
  onClick: () => void;
  delay: number;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [3, -3]), { stiffness: 300, damping: 32 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-3, 3]), { stiffness: 300, damping: 32 });

  function onMove(e: React.MouseEvent<HTMLButtonElement>) {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  const pct = safeNum(b.avg_attendance_pct);
  const shortName = b.branch.replace("Smart Up ", "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 900 }}
    >
      <motion.button
        ref={cardRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onClick={onClick}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{ scale: 1.008, y: -1 }}
        transition={{ duration: 0.18 }}
        className="w-full text-left relative overflow-hidden rounded-xl bg-surface border border-border-light shadow-card hover:shadow-card-hover transition-shadow duration-200 group"
      >
        {/* left accent stripe */}
        <div
          className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full"
          style={{ background: "linear-gradient(180deg, #673AB7, #7E57C2)" }}
        />

        <div className="flex items-center gap-4 px-4 py-3 pl-5">
          {/* Pct badge */}
          <div
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 text-xs font-black ${pctBadgeColor(pct)}`}
          >
            <span className="text-[15px] leading-none">{pct}%</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-text-primary truncate">{shortName}</p>
            <p className="text-[11px] text-text-tertiary">
              {b.total_students} students · {b.total_batches} batches
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px]">
              <span className="text-text-tertiary">
                Working:{" "}
                <span className="font-semibold text-text-secondary">{m?.adjustedWorking ?? 0}</span>
              </span>
              <span className="text-text-tertiary">
                Scheduled: <span className="font-semibold text-primary">{m?.scheduled ?? 0}</span>
              </span>
              <span className="text-text-tertiary">
                Not scheduled:{" "}
                <span className="font-semibold text-warning">{m?.nonScheduled ?? 0}</span>
              </span>
              <span className="text-text-tertiary">
                Marked:{" "}
                <span className="font-semibold text-success">{m?.attendanceMarked ?? 0}</span>
              </span>
              <span className="text-text-tertiary">
                Not marked:{" "}
                <span className="font-semibold text-error">{m?.attendanceNotMarked ?? 0}</span>
              </span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 shrink-0">
            {b.chronic_absentees > 0 && (
              <div className="flex items-center gap-1 bg-error/10 rounded-lg px-2 py-1">
                <ShieldAlert className="w-3 h-3 text-error" />
                <span className="text-[10px] font-semibold text-error">
                  {b.chronic_absentees} at risk
                </span>
              </div>
            )}
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary-light border border-primary/20">
              <ChevronRight className="w-3.5 h-3.5 text-primary group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}

export default function DirectorAcademicsAttendancePage() {
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
        <div className="h-8 w-64 bg-surface rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />
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
    const attendanceMarked = Math.min(
      safeNum(b.attendance_marked_on_scheduled_days),
      scheduled
    );
    const nonScheduled = Math.max(adjustedWorking - scheduled, 0);
    const attendanceNotMarked =
      nonScheduled + Math.max(scheduled - attendanceMarked, 0);
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

  const sorted = [...visibleBranches].sort(
    (a, b) => b.avg_attendance_pct - a.avg_attendance_pct
  );

  const totalStudents = visibleBranches.reduce((a, b) => a + b.total_students, 0);
  const overallAtt = visibleBranches.length
    ? Math.round(
        visibleBranches.reduce((a, b) => a + b.avg_attendance_pct, 0) /
          visibleBranches.length
      )
    : 0;
  const totalAbsentees = visibleBranches.reduce((a, b) => a + b.chronic_absentees, 0);
  const totalWorkingDays = Math.max(
    safeNum(data?.overall?.total_working_days) - holidayAdjustment,
    0
  );
  const totalScheduledDays = visibleBranches.reduce(
    (a, b) => a + (metricByBranch.get(b.branch)?.scheduled ?? 0),
    0
  );
  const totalNonScheduledDays = visibleBranches.reduce(
    (a, b) => a + (metricByBranch.get(b.branch)?.nonScheduled ?? 0),
    0
  );
  const totalAttendanceMarked = visibleBranches.reduce(
    (a, b) => a + (metricByBranch.get(b.branch)?.attendanceMarked ?? 0),
    0
  );
  const totalAttendanceNotMarked = visibleBranches.reduce(
    (a, b) => a + (metricByBranch.get(b.branch)?.attendanceNotMarked ?? 0),
    0
  );
  const metricsFrom = data?.overall?.metrics_from_date ?? "";
  const metricsTo = data?.overall?.metrics_to_date ?? "";

  const problemCount = branches.filter((b) => {
    const m = metricByBranch.get(b.branch);
    return !!m && (m.nonScheduled > 0 || m.attendanceNotMarked > 0);
  }).length;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <AnimatePresence mode="wait">
        {selectedBranch ? (
          <BranchDrillDown
            key={selectedBranch}
            branch={selectedBranch}
            onBack={() => setSelectedBranch(null)}
            defaultTab="attendance"
          />
        ) : (
          <motion.div
            key="overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            {/* ── Header ── */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #673AB7 0%, #7E57C2 100%)",
                    boxShadow: "0 4px 12px rgba(103,58,183,0.28)",
                  }}
                  animate={{ rotateY: [0, 14, 0, -14, 0] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                >
                  <BarChart3 className="h-4 w-4 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-lg font-bold text-text-primary tracking-tight">
                    Attendance Overview
                  </h1>
                  <p className="text-xs text-text-secondary">
                    Cross-branch attendance analytics
                  </p>
                </div>
              </div>

              {/* Holiday adjuster + filter row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Holiday pill */}
                <div className="flex items-center gap-1.5 bg-surface border border-border-light rounded-xl px-3 py-1.5 shadow-sm">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] text-text-tertiary">Public Holidays:</span>
                  <span className="text-[11px] font-bold text-primary">{publicHolidayDays}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setHolidayAdjustment((v) =>
                        Math.max(v - 1, -basePublicHolidayDays)
                      )
                    }
                    className="w-5 h-5 rounded-md border border-border-light text-text-secondary hover:text-primary hover:border-primary/40 transition-colors text-xs flex items-center justify-center"
                    aria-label="Decrease public holidays"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => setHolidayAdjustment((v) => v + 1)}
                    className="w-5 h-5 rounded-md border border-border-light text-text-secondary hover:text-primary hover:border-primary/40 transition-colors text-xs flex items-center justify-center"
                    aria-label="Increase public holidays"
                  >
                    +
                  </button>
                  {holidayAdjustment !== 0 && (
                    <button
                      type="button"
                      onClick={() => setHolidayAdjustment(0)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-border-light text-text-secondary hover:text-primary transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Toggle buttons */}
                <div className="flex items-center gap-1 bg-surface border border-border-light rounded-xl p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setOnlyProblems(false)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      !onlyProblems
                        ? "bg-primary text-white shadow-sm"
                        : "text-text-secondary hover:text-primary"
                    }`}
                  >
                    All Branches ({branches.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnlyProblems(true)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      onlyProblems
                        ? "bg-error text-white shadow-sm"
                        : "text-text-secondary hover:text-error"
                    }`}
                  >
                    Problem Branches ({problemCount})
                  </button>
                </div>
              </div>
            </motion.div>

            {/* ── Summary stat cards (row 1) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <StatCard3D
                icon={Building2}
                iconClass="bg-primary-light text-primary"
                label="Branches"
                value={<span className="text-primary">{visibleBranches.length}</span>}
                delay={0}
              />
              <StatCard3D
                icon={Users}
                iconClass="bg-primary-light text-primary"
                label="Total Students"
                value={<span className="text-primary">{totalStudents}</span>}
                delay={0.05}
              />
              <StatCard3D
                icon={TrendingUp}
                iconClass="bg-success/15 text-success"
                label="Avg Attendance"
                value={<span className={pctColor(overallAtt)}>{overallAtt}%</span>}
                delay={0.1}
              />
              <StatCard3D
                icon={AlertTriangle}
                iconClass="bg-error/10 text-error"
                label="Chronic Absentees"
                value={<span className="text-error">{totalAbsentees}</span>}
                delay={0.15}
              />
            </div>

            {/* ── Detail stat cards (row 2) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              <StatCard3D
                icon={CalendarDays}
                iconClass="bg-primary-light text-primary"
                label="Working Days"
                value={<span className="text-primary">{totalWorkingDays}</span>}
                sub={
                  metricsFrom && metricsTo ? (
                    <p className="text-[9px] text-text-tertiary leading-tight">
                      {metricsFrom} → {metricsTo} (excl. Sun, {publicHolidayDays} holidays)
                    </p>
                  ) : undefined
                }
                delay={0.05}
              />
              <StatCard3D
                icon={ClipboardCheck}
                iconClass="bg-info/10 text-info"
                label="Scheduled Days"
                value={<span className="text-primary">{totalScheduledDays}</span>}
                delay={0.1}
              />
              <StatCard3D
                icon={AlertTriangle}
                iconClass="bg-warning/10 text-warning"
                label="Not Scheduled"
                value={<span className="text-warning">{totalNonScheduledDays}</span>}
                delay={0.15}
              />
              <StatCard3D
                icon={UserCheck}
                iconClass="bg-success/15 text-success"
                label="Att. Marked"
                value={<span className="text-success">{totalAttendanceMarked}</span>}
                delay={0.2}
              />
              <StatCard3D
                icon={AlertTriangle}
                iconClass="bg-error/10 text-error"
                label="Att. Not Marked"
                value={<span className="text-error">{totalAttendanceNotMarked}</span>}
                delay={0.25}
              />
            </div>

            {/* ── Branch list ── */}
            <div className="space-y-1.5">
              {sorted.map((b, i) => (
                <BranchRow
                  key={b.branch}
                  b={b}
                  m={metricByBranch.get(b.branch)}
                  onClick={() => setSelectedBranch(b.branch)}
                  delay={i * 0.04}
                />
              ))}
            </div>

            {/* ── Comparison table ── */}
            {visibleBranches.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-bold text-text-primary">Branch Comparison</h2>
                </div>
                <div className="bg-surface rounded-xl border border-border-light overflow-hidden shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-light">
                          <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                            Branch
                          </th>
                          <th className="text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                            Students
                          </th>
                          <th className="text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                            Attendance
                          </th>
                          <th className="text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                            At Risk
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((b) => (
                          <tr
                            key={b.branch}
                            onClick={() => setSelectedBranch(b.branch)}
                            className="border-b border-border-light last:border-0 hover:bg-brand-wash transition-colors cursor-pointer group"
                          >
                            <td className="px-4 py-2.5 font-semibold text-[13px] text-text-primary group-hover:text-primary transition-colors">
                              {b.branch.replace("Smart Up ", "")}
                            </td>
                            <td className="px-4 py-2.5 text-center text-[13px] text-text-secondary">
                              {b.total_students}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${pctBadgeColor(safeNum(b.avg_attendance_pct))}`}
                              >
                                {safeNum(b.avg_attendance_pct)}%
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {b.chronic_absentees > 0 ? (
                                <span className="text-[12px] font-bold text-error">
                                  {b.chronic_absentees}
                                </span>
                              ) : (
                                <span className="text-[12px] font-bold text-success">0</span>
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
