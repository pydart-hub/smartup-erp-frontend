"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getAttendanceAnalytics,
  getExamAnalytics,
  getInstructorAnalytics,
  getScheduleAnalytics,
} from "@/lib/api/analytics";
import type { BatchAcademicSummary, ChronicAbsentee } from "@/lib/types/analytics";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck, Trophy, BookOpen,
  AlertTriangle, Users, TrendingUp, BarChart3,
  ChevronDown, ChevronLeft, UserCheck,
  Loader2, Calendar, CalendarDays, CheckCircle2, Clock,
  Sparkles, Star, Flame, Zap, TrendingDown, ShieldAlert,
} from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────────
export function safeNum(n: number | undefined | null): number {
  return Number.isFinite(n) ? n! : 0;
}

export function pctColor(pct: number, good = 75, mid = 50): string {
  if (pct >= good) return "text-success";
  if (pct >= mid) return "text-warning";
  return "text-error";
}

export function pctBadgeColor(pct: number, good = 75, mid = 50): string {
  if (pct >= good) return "bg-success/10 text-success";
  if (pct >= mid) return "bg-warning/10 text-warning";
  return "bg-error/10 text-error";
}

// ── Drill Level Types ───────────────────────────────────────────
type AttDrillLevel = { view: "classes" } | { view: "batches"; program: string } | { view: "detail"; program: string; batch: string };
type ExamDrillLevel = { view: "classes" } | { view: "detail"; program: string };
type SchedDrillLevel = { view: "classes" } | { view: "batches"; program: string } | { view: "detail"; program: string; batch: string };

// ── Small Reusable Components ───────────────────────────────────
export function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface rounded-[12px] p-3 border border-border-light">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[10px] text-text-tertiary font-medium">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color ?? "text-primary"}`}>{value}</p>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-surface rounded-[12px] p-6 text-center border border-border-light">
      <p className="text-text-tertiary text-sm">{text}</p>
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-surface rounded-[12px] animate-pulse" />)}
      </div>
      {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-surface rounded-[10px] animate-pulse" />)}
    </div>
  );
}

function AbsenteeTable({ absentees, showBatch = true }: { absentees: ChronicAbsentee[]; showBatch?: boolean }) {
  return (
    <div className="bg-surface rounded-[12px] border border-border-light overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-app-bg border-b border-border-light">
              <th className="text-left p-2.5 font-medium text-text-secondary">Student</th>
              {showBatch && <th className="text-left p-2.5 font-medium text-text-secondary">Batch</th>}
              <th className="text-center p-2.5 font-medium text-text-secondary">P</th>
              <th className="text-center p-2.5 font-medium text-text-secondary">A</th>
              <th className="text-center p-2.5 font-medium text-text-secondary">%</th>
            </tr>
          </thead>
          <tbody>
            {absentees.slice(0, 20).map((a) => (
              <tr key={a.student} className="border-b border-border-light last:border-0">
                <td className="p-2.5">
                  <p className="font-medium text-primary text-xs">{a.student_name}</p>
                </td>
                {showBatch && <td className="p-2.5 text-xs text-text-tertiary">{a.student_group}</td>}
                <td className="p-2.5 text-center text-success text-xs font-medium">{a.present}</td>
                <td className="p-2.5 text-center text-error text-xs font-medium">{a.absent}</td>
                <td className="p-2.5 text-center">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${pctBadgeColor(a.pct, 75, 50)}`}>
                    {a.pct}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {absentees.length > 20 && (
        <div className="p-2 text-center text-xs text-text-tertiary border-t border-border-light">
          +{absentees.length - 20} more
        </div>
      )}
    </div>
  );
}

// ── Performance classification config ──────────────────────────
const CLASSIFICATIONS = [
  {
    key: "star",
    label: "Star Performers",
    range: "≥90%",
    min: 90,
    max: 101,
    icon: Star,
    iconColor: "text-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-500/10",
    border: "border-yellow-200 dark:border-yellow-500/20",
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
    pctClass: "text-yellow-600 dark:text-yellow-400",
  },
  {
    key: "performers",
    label: "Good Performers",
    range: "75–89%",
    min: 75,
    max: 90,
    icon: Flame,
    iconColor: "text-success",
    bg: "bg-success/5",
    border: "border-success/20",
    badge: "bg-success/10 text-success",
    pctClass: "text-success",
  },
  {
    key: "average",
    label: "Average",
    range: "50–74%",
    min: 50,
    max: 75,
    icon: Zap,
    iconColor: "text-info",
    bg: "bg-info/5",
    border: "border-info/20",
    badge: "bg-info/10 text-info",
    pctClass: "text-info",
  },
  {
    key: "improvement",
    label: "Need Improvement",
    range: "33–49%",
    min: 33,
    max: 50,
    icon: TrendingDown,
    iconColor: "text-warning",
    bg: "bg-warning/5",
    border: "border-warning/20",
    badge: "bg-warning/10 text-warning",
    pctClass: "text-warning",
  },
  {
    key: "atrisk",
    label: "At Risk",
    range: "<33%",
    min: 0,
    max: 33,
    icon: ShieldAlert,
    iconColor: "text-error",
    bg: "bg-error/5",
    border: "border-error/20",
    badge: "bg-error/10 text-error",
    pctClass: "text-error",
  },
] as const;

function BatchExamCard({ batch }: { batch: BatchAcademicSummary }) {
  const [open, setOpen] = useState(false);

  const allStudents = [...(batch.all_students ?? [])].sort((a, b) => a.rank - b.rank);

  const classifiedCounts = CLASSIFICATIONS.map((cls) => ({
    ...cls,
    count: allStudents.filter((s) => s.pct >= cls.min && s.pct < cls.max).length,
  })).filter((cls) => cls.count > 0);

  function getClassification(pct: number) {
    return CLASSIFICATIONS.find((cls) => pct >= cls.min && pct < cls.max) ?? CLASSIFICATIONS[CLASSIFICATIONS.length - 1];
  }

  return (
    <div className="bg-surface rounded-[12px] border border-border-light overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 hover:bg-app-bg transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center text-xs font-bold ${pctBadgeColor(safeNum(batch.overall_avg_pct), 70, 50)}`}>
            {safeNum(batch.overall_avg_pct)}%
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-primary">{batch.student_group}</p>
            <p className="text-xs text-text-tertiary">{batch.assessment_group} · {batch.total_students} students</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pctBadgeColor(safeNum(batch.overall_pass_rate))}`}>
            {safeNum(batch.overall_pass_rate)}% pass
          </span>
          <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border-light">
              {/* Subject summary table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-app-bg border-b border-border-light">
                      <th className="text-left p-2.5 font-medium text-text-secondary">Subject</th>
                      <th className="text-center p-2.5 font-medium text-text-secondary">Avg</th>
                      <th className="text-center p-2.5 font-medium text-text-secondary">Avg %</th>
                      <th className="text-center p-2.5 font-medium text-text-secondary">Pass Rate</th>
                      <th className="text-center p-2.5 font-medium text-text-secondary">High</th>
                      <th className="text-center p-2.5 font-medium text-text-secondary">Low</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.subjects.map((s) => (
                      <tr key={s.course} className="border-b border-border-light last:border-0">
                        <td className="p-2.5 font-medium text-primary">{s.course}</td>
                        <td className="p-2.5 text-center text-text-secondary font-medium">{s.avg_score}/{s.maximum_possible}</td>
                        <td className="p-2.5 text-center">
                          <span className={`font-medium ${pctColor(safeNum(s.avg_pct), 60, 40)}`}>{safeNum(s.avg_pct)}%</span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded-full font-bold ${pctBadgeColor(safeNum(s.pass_rate))}`}>{safeNum(s.pass_rate)}%</span>
                        </td>
                        <td className="p-2.5 text-center text-success font-medium">{s.max_score}</td>
                        <td className="p-2.5 text-center text-error font-medium">{s.min_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Classification count summary */}
              {classifiedCounts.length > 0 && (
                <div className="px-3 py-2.5 border-t border-border-light flex flex-wrap gap-2">
                  {classifiedCounts.map((cls) => {
                    const Icon = cls.icon;
                    return (
                      <span key={cls.key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cls.badge}`}>
                        <Icon className="w-3 h-3" />
                        {cls.label}
                        <span className="font-bold">({cls.count})</span>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Full student list with category labels */}
              {allStudents.length > 0 && (
                <div className="border-t border-border-light overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-app-bg border-b border-border-light">
                        <th className="text-center p-2.5 font-medium text-text-secondary w-8">#</th>
                        <th className="text-left p-2.5 font-medium text-text-secondary">Student</th>
                        <th className="text-left p-2.5 font-medium text-text-secondary">Category</th>
                        <th className="text-center p-2.5 font-medium text-text-secondary">Score</th>
                        <th className="text-center p-2.5 font-medium text-text-secondary">%</th>
                        <th className="text-center p-2.5 font-medium text-text-secondary">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allStudents.map((s) => {
                        const cls = getClassification(s.pct);
                        const Icon = cls.icon;
                        return (
                          <tr key={s.student} className="border-b border-border-light last:border-0 hover:bg-app-bg/40 transition-colors">
                            <td className="p-2.5 text-center text-text-tertiary font-medium">{s.rank}</td>
                            <td className="p-2.5">
                              <p className="font-semibold text-primary">{s.student_name}</p>
                              {s.failed_subjects.length > 0 && (
                                <p className="text-[10px] text-error">Fail: {s.failed_subjects.join(", ")}</p>
                              )}
                            </td>
                            <td className="p-2.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls.badge}`}>
                                <Icon className="w-2.5 h-2.5" />
                                {cls.label}
                              </span>
                            </td>
                            <td className="p-2.5 text-center text-text-secondary font-medium">{s.total_score}/{s.total_max}</td>
                            <td className="p-2.5 text-center">
                              <span className={`font-bold ${cls.pctClass}`}>{s.pct}%</span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`px-1.5 py-0.5 rounded-full font-bold text-[10px] ${cls.badge}`}>{s.grade}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main BranchDrillDown Component ──────────────────────────────
export type DrillTab = "attendance" | "exams" | "instructors" | "schedule" | "events";

export function BranchDrillDown({ branch, onBack, defaultTab = "attendance" }: { branch: string; onBack: () => void; defaultTab?: DrillTab }) {
  const [activeTab, setActiveTab] = useState<DrillTab>(defaultTab);
  const [attDrill, setAttDrill] = useState<AttDrillLevel>({ view: "classes" });
  const [examDrill, setExamDrill] = useState<ExamDrillLevel>({ view: "classes" });
  const [schedDrill, setSchedDrill] = useState<SchedDrillLevel>({ view: "classes" });

  const switchTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setAttDrill({ view: "classes" });
    setExamDrill({ view: "classes" });
    setSchedDrill({ view: "classes" });
  };

  const dateRange = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setMonth(to.getMonth() - 1);
    return {
      from_date: from.toISOString().split("T")[0],
      to_date: to.toISOString().split("T")[0],
    };
  }, []);

  const { data: attData, isLoading: attLoading } = useQuery({
    queryKey: ["drill-attendance", branch, dateRange],
    queryFn: () => getAttendanceAnalytics({ branch, ...dateRange }),
    staleTime: 60_000,
  });

  const { data: examData, isLoading: examLoading } = useQuery({
    queryKey: ["drill-exams", branch],
    queryFn: () => getExamAnalytics({ branch }),
    staleTime: 60_000,
  });

  const { data: instrData, isLoading: instrLoading } = useQuery({
    queryKey: ["drill-instructors", branch],
    queryFn: () => getInstructorAnalytics({ branch }),
    staleTime: 60_000,
  });

  const { data: schedData, isLoading: schedLoading } = useQuery({
    queryKey: ["drill-schedule", branch],
    queryFn: () => getScheduleAnalytics({ branch }),
    staleTime: 60_000,
  });

  const branchLabel = branch.replace("Smart Up ", "");

  // ── Attendance: group batches by program → "class" ──
  const attClasses = useMemo(() => {
    if (!attData?.batches) return [];
    const map = new Map<string, typeof attData.batches>();
    for (const b of attData.batches) {
      const key = b.program || "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return Array.from(map.entries())
      .map(([program, batches]) => {
        const totalStudents = batches.reduce((s, b) => s + b.total_students, 0);
        const totalP = batches.reduce((s, b) => s + b.total_present, 0);
        const totalA = batches.reduce((s, b) => s + b.total_absent, 0);
        const totalL = batches.reduce((s, b) => s + b.total_late, 0);
        const totalRisk = batches.reduce((s, b) => s + b.chronic_absentees, 0);
        const totalAtt = totalP + totalA + totalL;
        const avgPct = totalAtt > 0 ? Math.round(((totalP + totalL) / totalAtt) * 1000) / 10 : 0;
        return { program, batches, totalStudents, totalP, totalA, totalL, totalRisk, avgPct };
      })
      .sort((a, b) => b.avgPct - a.avgPct);
  }, [attData]);

  // ── Exams: group batches by program ──
  const examClasses = useMemo(() => {
    if (!examData?.batches) return [];
    const map = new Map<string, typeof examData.batches>();
    for (const b of examData.batches) {
      const key = b.program || "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return Array.from(map.entries())
      .map(([program, batches]) => {
        const totalStudents = batches.reduce((s, b) => s + b.total_students, 0);
        const avgPct = totalStudents > 0
          ? Math.round((batches.reduce((s, b) => s + b.overall_avg_pct * b.total_students, 0) / Math.max(totalStudents, 1)) * 10) / 10
          : 0;
        const avgPass = totalStudents > 0
          ? Math.round((batches.reduce((s, b) => s + b.overall_pass_rate * b.total_students, 0) / totalStudents) * 10) / 10
          : 0;
        return { program, batches, totalStudents, avgPct, avgPass };
      })
      .sort((a, b) => b.avgPct - a.avgPct);
  }, [examData]);

  // ── Back handler for inner drill-downs ──
  const handleBack = () => {
    if (activeTab === "attendance") {
      if (attDrill.view === "detail") setAttDrill({ view: "batches", program: attDrill.program });
      else if (attDrill.view === "batches") setAttDrill({ view: "classes" });
      else onBack();
    } else if (activeTab === "exams") {
      if (examDrill.view === "detail") setExamDrill({ view: "classes" });
      else onBack();
    } else if (activeTab === "schedule") {
      if (schedDrill.view === "detail") setSchedDrill({ view: "batches", program: schedDrill.program });
      else if (schedDrill.view === "batches") setSchedDrill({ view: "classes" });
      else onBack();
    } else {
      onBack();
    }
  };

  // ── Breadcrumb ──
  const breadcrumbs: string[] = [branchLabel];
  if (activeTab === "attendance") {
    if (attDrill.view === "batches" || attDrill.view === "detail") breadcrumbs.push(attDrill.program);
    if (attDrill.view === "detail") breadcrumbs.push(attDrill.batch);
  } else if (activeTab === "exams") {
    if (examDrill.view === "detail") breadcrumbs.push(examDrill.program);
  } else if (activeTab === "schedule") {
    if (schedDrill.view === "batches" || schedDrill.view === "detail") breadcrumbs.push(schedDrill.program);
    if (schedDrill.view === "detail") breadcrumbs.push(schedDrill.batch);
  }

  const isAtRoot = (activeTab === "attendance" && attDrill.view === "classes") ||
    (activeTab === "exams" && examDrill.view === "classes") ||
    (activeTab === "schedule" && schedDrill.view === "classes") ||
    activeTab === "instructors" ||
    activeTab === "events";

  const tabs = [
    { key: "attendance" as const, label: "Attendance", icon: ClipboardCheck, loading: attLoading },
    { key: "exams" as const, label: "Exams", icon: Trophy, loading: examLoading },
    { key: "instructors" as const, label: "Instructors", icon: UserCheck, loading: instrLoading },
    { key: "schedule" as const, label: "Schedule", icon: Calendar, loading: schedLoading },
    { key: "events" as const, label: "Events", icon: Sparkles, loading: schedLoading },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >
      {/* Back + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={isAtRoot ? onBack : handleBack}
          className="p-2 rounded-[8px] hover:bg-app-bg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm flex-wrap">
            {breadcrumbs.map((bc, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-text-tertiary">/</span>}
                <span className={i === breadcrumbs.length - 1 ? "font-bold text-primary" : "text-text-tertiary"}>
                  {bc}
                </span>
              </span>
            ))}
          </div>
          <p className="text-xs text-text-tertiary mt-0.5">
            {attDrill.view === "classes" && activeTab === "attendance" && "Class-wise attendance overview"}
            {attDrill.view === "batches" && activeTab === "attendance" && "Batch-wise attendance for this class"}
            {attDrill.view === "detail" && activeTab === "attendance" && "Detailed batch attendance"}
            {examDrill.view === "classes" && activeTab === "exams" && "Class-wise exam overview"}
            {examDrill.view === "detail" && activeTab === "exams" && "Detailed exam results for this class"}
            {activeTab === "instructors" && "Instructor performance breakdown"}
            {schedDrill.view === "classes" && activeTab === "schedule" && "Class-wise schedule overview"}
            {schedDrill.view === "batches" && activeTab === "schedule" && "Batch-wise schedules for this class"}
            {schedDrill.view === "detail" && activeTab === "schedule" && "Detailed batch schedule"}
            {activeTab === "events" && "Event planner overview"}
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-app-bg rounded-[10px] p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-[8px] transition-colors ${
              activeTab === t.key
                ? "bg-surface text-primary shadow-sm"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.loading && <Loader2 className="w-3 h-3 animate-spin" />}
          </button>
        ))}
      </div>

      {/* ═══════════════ ATTENDANCE TAB ═══════════════ */}
      {activeTab === "attendance" && (
        <div className="space-y-4">
          {attLoading ? (
            <LoadingSkeleton />
          ) : attDrill.view === "classes" ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard icon={<Users className="w-4 h-4 text-text-tertiary" />} label="Students" value={String(attData?.overall?.total_students ?? 0)} />
                <MetricCard icon={<ClipboardCheck className="w-4 h-4 text-success" />} label="Avg Attendance" value={`${safeNum(attData?.overall?.avg_attendance_pct)}%`} color={pctColor(safeNum(attData?.overall?.avg_attendance_pct))} />
                <MetricCard icon={<BarChart3 className="w-4 h-4 text-text-tertiary" />} label="Working Days" value={String(attData?.overall?.total_working_days ?? 0)} />
                <MetricCard icon={<AlertTriangle className="w-4 h-4 text-error" />} label="At Risk" value={String(attData?.chronic_absentees?.length ?? 0)} color="text-error" />
              </div>
              <h3 className="text-sm font-semibold text-text-secondary">Class-wise Attendance (Last 30 Days)</h3>
              <div className="space-y-2">
                {attClasses.length === 0 ? (
                  <EmptyState text="No attendance data" />
                ) : (
                  attClasses.map((cls) => (
                    <button key={cls.program} onClick={() => setAttDrill({ view: "batches", program: cls.program })} className="w-full bg-surface rounded-[10px] border border-border-light p-3.5 flex items-center justify-between hover:border-primary/30 hover:shadow-sm transition-all group text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-[10px] flex items-center justify-center text-xs font-bold ${pctBadgeColor(cls.avgPct, 85, 70)}`}>{cls.avgPct}%</div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary group-hover:text-primary/80 transition-colors truncate">{cls.program}</p>
                          <p className="text-xs text-text-tertiary">{cls.totalStudents} students · {cls.batches.length} {cls.batches.length === 1 ? "batch" : "batches"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <span className="text-success">P:{cls.totalP}</span>
                        <span className="text-error">A:{cls.totalA}</span>
                        <span className="text-warning">L:{cls.totalL}</span>
                        {cls.totalRisk > 0 && <span className="bg-error/10 text-error px-1.5 py-0.5 rounded-full font-medium">{cls.totalRisk} risk</span>}
                        <ChevronDown className="w-4 h-4 text-text-tertiary -rotate-90 group-hover:text-primary" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : attDrill.view === "batches" ? (
            (() => {
              const cls = attClasses.find((c) => c.program === attDrill.program);
              if (!cls) return <EmptyState text="No data for this class" />;
              const sorted = [...cls.batches].sort((a, b) => b.avg_attendance_pct - a.avg_attendance_pct);
              const classAbsentees = (attData?.chronic_absentees ?? []).filter((a) => cls.batches.some((b) => b.student_group === a.student_group));
              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MetricCard icon={<Users className="w-4 h-4 text-text-tertiary" />} label="Students" value={String(cls.totalStudents)} />
                    <MetricCard icon={<ClipboardCheck className="w-4 h-4 text-success" />} label="Avg Attendance" value={`${cls.avgPct}%`} color={pctColor(cls.avgPct)} />
                    <MetricCard icon={<BarChart3 className="w-4 h-4 text-text-tertiary" />} label="Batches" value={String(cls.batches.length)} />
                    <MetricCard icon={<AlertTriangle className="w-4 h-4 text-error" />} label="At Risk" value={String(cls.totalRisk)} color="text-error" />
                  </div>
                  <h3 className="text-sm font-semibold text-text-secondary">Batches in {cls.program}</h3>
                  <div className="space-y-2">
                    {sorted.map((b) => (
                      <button key={b.student_group} onClick={() => setAttDrill({ view: "detail", program: attDrill.program, batch: b.student_group })} className="w-full bg-surface rounded-[10px] border border-border-light p-3 flex items-center justify-between hover:border-primary/30 hover:shadow-sm transition-all group text-left">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center text-xs font-bold ${pctBadgeColor(b.avg_attendance_pct, 85, 70)}`}>{safeNum(b.avg_attendance_pct)}%</div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-primary group-hover:text-primary/80 truncate">{b.student_group}</p>
                            <p className="text-xs text-text-tertiary">{b.total_students} students · {b.total_working_days} working days</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          <span className="text-success">P:{b.total_present}</span>
                          <span className="text-error">A:{b.total_absent}</span>
                          <span className="text-warning">L:{b.total_late}</span>
                          {b.chronic_absentees > 0 && <span className="bg-error/10 text-error px-1.5 py-0.5 rounded-full font-medium">{b.chronic_absentees} risk</span>}
                          <ChevronDown className="w-4 h-4 text-text-tertiary -rotate-90 group-hover:text-primary" />
                        </div>
                      </button>
                    ))}
                  </div>
                  {classAbsentees.length > 0 && (
                    <>
                      <h3 className="text-sm font-semibold text-error flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />At Risk Students — {cls.program} ({classAbsentees.length})</h3>
                      <AbsenteeTable absentees={classAbsentees} />
                    </>
                  )}
                </>
              );
            })()
          ) : (
            (() => {
              const batch = attData?.batches.find((b) => b.student_group === attDrill.batch);
              if (!batch) return <EmptyState text="No data for this batch" />;
              const batchAbsentees = (attData?.chronic_absentees ?? []).filter((a) => a.student_group === attDrill.batch);
              const totalRecords = batch.total_present + batch.total_absent + batch.total_late;
              const presentPct = totalRecords > 0 ? Math.round((batch.total_present / totalRecords) * 100) : 0;
              const absentPct = totalRecords > 0 ? Math.round((batch.total_absent / totalRecords) * 100) : 0;
              const latePct = totalRecords > 0 ? Math.round((batch.total_late / totalRecords) * 100) : 0;
              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MetricCard icon={<Users className="w-4 h-4 text-text-tertiary" />} label="Students" value={String(batch.total_students)} />
                    <MetricCard icon={<ClipboardCheck className="w-4 h-4 text-success" />} label="Attendance" value={`${safeNum(batch.avg_attendance_pct)}%`} color={pctColor(safeNum(batch.avg_attendance_pct))} />
                    <MetricCard icon={<BarChart3 className="w-4 h-4 text-text-tertiary" />} label="Working Days" value={String(batch.total_working_days)} />
                    <MetricCard icon={<AlertTriangle className="w-4 h-4 text-error" />} label="At Risk" value={String(batch.chronic_absentees)} color="text-error" />
                  </div>
                  <div className="bg-surface rounded-[12px] border border-border-light p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-text-secondary">Attendance Breakdown</h3>
                    <div className="h-4 rounded-full overflow-hidden flex bg-app-bg">
                      {presentPct > 0 && <div className="bg-success h-full transition-all" style={{ width: `${presentPct}%` }} />}
                      {latePct > 0 && <div className="bg-warning h-full transition-all" style={{ width: `${latePct}%` }} />}
                      {absentPct > 0 && <div className="bg-error h-full transition-all" style={{ width: `${absentPct}%` }} />}
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success" />Present: {batch.total_present} ({presentPct}%)</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warning" />Late: {batch.total_late} ({latePct}%)</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-error" />Absent: {batch.total_absent} ({absentPct}%)</span>
                    </div>
                  </div>
                  {batchAbsentees.length > 0 ? (
                    <>
                      <h3 className="text-sm font-semibold text-error flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />At Risk Students ({batchAbsentees.length})</h3>
                      <AbsenteeTable absentees={batchAbsentees} showBatch={false} />
                    </>
                  ) : (
                    <div className="bg-success/5 rounded-[10px] border border-success/20 p-4 flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-success" />
                      <p className="text-sm text-success font-medium">All students are above 75% attendance!</p>
                    </div>
                  )}
                </>
              );
            })()
          )}
        </div>
      )}

      {/* ═══════════════ EXAMS TAB ═══════════════ */}
      {activeTab === "exams" && (
        <div className="space-y-4">
          {examLoading ? (
            <LoadingSkeleton />
          ) : examDrill.view === "classes" ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard icon={<BarChart3 className="w-4 h-4 text-text-tertiary" />} label="Total Exams" value={String(examData?.overall?.total_exams ?? 0)} />
                <MetricCard icon={<Users className="w-4 h-4 text-text-tertiary" />} label="Assessed" value={String(examData?.overall?.total_students_assessed ?? 0)} />
                <MetricCard icon={<TrendingUp className="w-4 h-4 text-success" />} label="Avg Score" value={`${safeNum(examData?.overall?.avg_score_pct)}%`} color={pctColor(safeNum(examData?.overall?.avg_score_pct), 60, 40)} />
                <MetricCard icon={<Trophy className="w-4 h-4 text-warning" />} label="Pass Rate" value={`${safeNum(examData?.overall?.overall_pass_rate)}%`} color={pctColor(safeNum(examData?.overall?.overall_pass_rate))} />
              </div>
              <h3 className="text-sm font-semibold text-text-secondary">Class-wise Exam Performance</h3>
              <div className="space-y-2">
                {examClasses.length === 0 ? (
                  <EmptyState text="No exam data yet" />
                ) : (
                  examClasses.map((cls) => (
                    <button key={cls.program} onClick={() => setExamDrill({ view: "detail", program: cls.program })} className="w-full bg-surface rounded-[10px] border border-border-light p-3.5 flex items-center justify-between hover:border-primary/30 hover:shadow-sm transition-all group text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-[10px] flex items-center justify-center text-xs font-bold ${pctBadgeColor(cls.avgPct, 70, 50)}`}>{cls.avgPct}%</div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary group-hover:text-primary/80 transition-colors truncate">{cls.program}</p>
                          <p className="text-xs text-text-tertiary">{cls.totalStudents} students · {cls.batches.length} {cls.batches.length === 1 ? "batch" : "batches"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pctBadgeColor(cls.avgPass)}`}>{cls.avgPass}% pass</span>
                        <ChevronDown className="w-4 h-4 text-text-tertiary -rotate-90 group-hover:text-primary" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            (() => {
              const cls = examClasses.find((c) => c.program === examDrill.program);
              if (!cls) return <EmptyState text="No exam data for this class" />;
              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MetricCard icon={<Users className="w-4 h-4 text-text-tertiary" />} label="Students" value={String(cls.totalStudents)} />
                    <MetricCard icon={<TrendingUp className="w-4 h-4 text-success" />} label="Avg Score" value={`${cls.avgPct}%`} color={pctColor(cls.avgPct, 60, 40)} />
                    <MetricCard icon={<Trophy className="w-4 h-4 text-warning" />} label="Pass Rate" value={`${cls.avgPass}%`} color={pctColor(cls.avgPass)} />
                    <MetricCard icon={<BarChart3 className="w-4 h-4 text-text-tertiary" />} label="Batches" value={String(cls.batches.length)} />
                  </div>
                  <h3 className="text-sm font-semibold text-text-secondary">Batch Exam Results — {cls.program}</h3>
                  <div className="space-y-3">
                    {cls.batches.map((batch) => (
                      <BatchExamCard key={`${batch.student_group}-${batch.assessment_group}`} batch={batch} />
                    ))}
                  </div>
                </>
              );
            })()
          )}
        </div>
      )}

      {/* ═══════════════ INSTRUCTORS TAB ═══════════════ */}
      {activeTab === "instructors" && (
        <div className="space-y-4">
          {instrLoading ? (
            <LoadingSkeleton />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <MetricCard icon={<UserCheck className="w-4 h-4 text-text-tertiary" />} label="Instructors" value={String(instrData?.overall?.total_instructors ?? 0)} />
                <MetricCard icon={<BookOpen className="w-4 h-4 text-info" />} label="Avg Topic Completion" value={`${safeNum(instrData?.overall?.avg_topic_completion_pct)}%`} color={pctColor(safeNum(instrData?.overall?.avg_topic_completion_pct), 70, 50)} />
                <MetricCard icon={<ClipboardCheck className="w-4 h-4 text-success" />} label="Avg Classes Conducted" value={`${safeNum(instrData?.overall?.avg_classes_conducted_pct)}%`} color={pctColor(safeNum(instrData?.overall?.avg_classes_conducted_pct), 80, 60)} />
              </div>
              <h3 className="text-sm font-semibold text-text-secondary">Instructor Breakdown</h3>
              <div className="space-y-2">
                {(instrData?.instructors ?? []).length === 0 ? (
                  <EmptyState text="No instructor data" />
                ) : (
                  instrData!.instructors
                    .sort((a, b) => b.topic_completion_pct - a.topic_completion_pct)
                    .map((inst) => {
                      const conductedPct = inst.classes_scheduled > 0 ? Math.round((inst.classes_conducted / inst.classes_scheduled) * 100) : 0;
                      return (
                        <div key={inst.instructor} className="bg-surface rounded-[10px] border border-border-light p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium text-primary">{inst.instructor_name}</p>
                              <p className="text-xs text-text-tertiary">{inst.classes_conducted}/{inst.classes_scheduled} classes · {inst.batches.length} batches</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-bold ${pctColor(inst.topic_completion_pct, 70, 50)}`}>{safeNum(inst.topic_completion_pct)}%</p>
                              <p className="text-xs text-text-tertiary">topics</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="flex justify-between text-[10px] text-text-tertiary mb-0.5"><span>Classes</span><span>{conductedPct}%</span></div>
                              <div className="h-1 bg-app-bg rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${conductedPct >= 80 ? "bg-success" : "bg-warning"}`} style={{ width: `${conductedPct}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-[10px] text-text-tertiary mb-0.5"><span>Topics</span><span>{safeNum(inst.topic_completion_pct)}%</span></div>
                              <div className="h-1 bg-app-bg rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${inst.topic_completion_pct >= 70 ? "bg-success" : "bg-warning"}`} style={{ width: `${safeNum(inst.topic_completion_pct)}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════ SCHEDULE TAB ═══════════════ */}
      {activeTab === "schedule" && (
        <div className="space-y-4">
          {schedLoading ? (
            <LoadingSkeleton />
          ) : schedDrill.view === "classes" ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard icon={<Calendar className="w-4 h-4 text-text-tertiary" />} label="Total Scheduled" value={String(schedData?.overall?.total_scheduled ?? 0)} />
                <MetricCard icon={<CheckCircle2 className="w-4 h-4 text-success" />} label="Conducted" value={`${safeNum(schedData?.overall?.conducted_pct)}%`} color={pctColor(safeNum(schedData?.overall?.conducted_pct), 80, 60)} />
                <MetricCard icon={<BookOpen className="w-4 h-4 text-info" />} label="Topic Coverage" value={`${safeNum(schedData?.overall?.topic_coverage_pct)}%`} color={pctColor(safeNum(schedData?.overall?.topic_coverage_pct), 70, 50)} />
                <MetricCard icon={<Clock className="w-4 h-4 text-warning" />} label="Upcoming" value={String(schedData?.overall?.total_upcoming ?? 0)} />
              </div>
              <h3 className="text-sm font-semibold text-text-secondary">Class-wise Schedule Summary</h3>
              <div className="space-y-2">
                {(schedData?.classes ?? []).length === 0 ? (
                  <EmptyState text="No schedule data" />
                ) : (
                  schedData!.classes.map((cls) => (
                    <button key={cls.program} onClick={() => setSchedDrill({ view: "batches", program: cls.program })} className="w-full bg-surface rounded-[10px] border border-border-light p-3.5 flex items-center justify-between hover:border-primary/30 hover:shadow-sm transition-all group text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-[10px] flex items-center justify-center text-xs font-bold ${pctBadgeColor(cls.conducted_pct, 80, 60)}`}>{cls.conducted_pct}%</div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary group-hover:text-primary/80 transition-colors truncate">{cls.program}</p>
                          <p className="text-xs text-text-tertiary">{cls.total_scheduled} scheduled · {cls.batches.length} {cls.batches.length === 1 ? "batch" : "batches"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <span className="text-success">{cls.conducted} done</span>
                        <span className="text-warning">{cls.upcoming} upcoming</span>
                        <span className={`px-1.5 py-0.5 rounded-full font-medium ${pctBadgeColor(cls.topic_coverage_pct, 70, 50)}`}>{cls.topic_coverage_pct}% topics</span>
                        <ChevronDown className="w-4 h-4 text-text-tertiary -rotate-90 group-hover:text-primary" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : schedDrill.view === "batches" ? (
            (() => {
              const cls = (schedData?.classes ?? []).find((c) => c.program === schedDrill.program);
              if (!cls) return <EmptyState text="No data for this class" />;
              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MetricCard icon={<Calendar className="w-4 h-4 text-text-tertiary" />} label="Scheduled" value={String(cls.total_scheduled)} />
                    <MetricCard icon={<CheckCircle2 className="w-4 h-4 text-success" />} label="Conducted" value={`${cls.conducted_pct}%`} color={pctColor(cls.conducted_pct, 80, 60)} />
                    <MetricCard icon={<BookOpen className="w-4 h-4 text-info" />} label="Topic Coverage" value={`${cls.topic_coverage_pct}%`} color={pctColor(cls.topic_coverage_pct, 70, 50)} />
                    <MetricCard icon={<Clock className="w-4 h-4 text-warning" />} label="Upcoming" value={String(cls.upcoming)} />
                  </div>
                  <h3 className="text-sm font-semibold text-text-secondary">Batches in {cls.program}</h3>
                  <div className="space-y-2">
                    {cls.batches.map((b) => {
                      const bConductedPct = b.total_scheduled > 0 ? Math.round((b.conducted / b.total_scheduled) * 100) : 0;
                      return (
                        <button key={b.student_group} onClick={() => setSchedDrill({ view: "detail", program: schedDrill.program, batch: b.student_group })} className="w-full bg-surface rounded-[10px] border border-border-light p-3 flex items-center justify-between hover:border-primary/30 hover:shadow-sm transition-all group text-left">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center text-xs font-bold ${pctBadgeColor(bConductedPct, 80, 60)}`}>{bConductedPct}%</div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-primary truncate">{b.student_group}</p>
                              <p className="text-xs text-text-tertiary">{b.total_scheduled} scheduled · {b.courses.length} {b.courses.length === 1 ? "course" : "courses"} · {b.instructors.length} {b.instructors.length === 1 ? "teacher" : "teachers"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-xs">
                            <span className="text-success">{b.conducted} done</span>
                            <span className="text-warning">{b.upcoming} up</span>
                            <ChevronDown className="w-4 h-4 text-text-tertiary -rotate-90 group-hover:text-primary" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            })()
          ) : (
            (() => {
              const cls = (schedData?.classes ?? []).find((c) => c.program === schedDrill.program);
              const batch = cls?.batches.find((b) => b.student_group === schedDrill.batch);
              if (!batch) return <EmptyState text="No data for this batch" />;
              const bConductedPct = batch.total_scheduled > 0 ? Math.round((batch.conducted / batch.total_scheduled) * 100) : 0;
              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MetricCard icon={<Calendar className="w-4 h-4 text-text-tertiary" />} label="Scheduled" value={String(batch.total_scheduled)} />
                    <MetricCard icon={<CheckCircle2 className="w-4 h-4 text-success" />} label="Conducted" value={`${bConductedPct}%`} color={pctColor(bConductedPct, 80, 60)} />
                    <MetricCard icon={<BookOpen className="w-4 h-4 text-info" />} label="Topic Coverage" value={`${batch.topic_coverage_pct}%`} color={pctColor(batch.topic_coverage_pct, 70, 50)} />
                    <MetricCard icon={<Clock className="w-4 h-4 text-warning" />} label="Upcoming" value={String(batch.upcoming)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface rounded-[10px] border border-border-light p-3">
                      <p className="text-[10px] font-semibold text-text-secondary mb-2">Instructors</p>
                      {batch.instructors.map((inst) => (<p key={inst.id} className="text-xs text-primary py-0.5">{inst.name}</p>))}
                      {batch.instructors.length === 0 && <p className="text-xs text-text-tertiary">None</p>}
                    </div>
                    <div className="bg-surface rounded-[10px] border border-border-light p-3">
                      <p className="text-[10px] font-semibold text-text-secondary mb-2">Courses</p>
                      {batch.courses.map((c) => (<p key={c} className="text-xs text-primary py-0.5">{c}</p>))}
                      {batch.courses.length === 0 && <p className="text-xs text-text-tertiary">None</p>}
                    </div>
                  </div>
                  {batch.upcoming_list.length > 0 && (
                    <>
                      <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-1.5"><Clock className="w-4 h-4 text-warning" /> Upcoming Classes</h3>
                      <div className="bg-surface rounded-[12px] border border-border-light overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead><tr className="bg-app-bg border-b border-border-light"><th className="text-left p-2.5 font-medium text-text-secondary">Date</th><th className="text-left p-2.5 font-medium text-text-secondary">Course</th><th className="text-left p-2.5 font-medium text-text-secondary">Instructor</th><th className="text-left p-2.5 font-medium text-text-secondary">Time</th><th className="text-left p-2.5 font-medium text-text-secondary">Topic</th></tr></thead>
                            <tbody>
                              {batch.upcoming_list.map((s) => (
                                <tr key={s.name} className="border-b border-border-light last:border-0">
                                  <td className="p-2.5 text-primary font-medium">{s.date}</td>
                                  <td className="p-2.5 text-text-secondary">{s.course}</td>
                                  <td className="p-2.5 text-text-secondary">{s.instructor_name}</td>
                                  <td className="p-2.5 text-text-tertiary">{s.from_time?.slice(0, 5)} - {s.to_time?.slice(0, 5)}</td>
                                  <td className="p-2.5 text-text-tertiary">{s.topic || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                  {batch.recent.length > 0 && (
                    <>
                      <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-text-tertiary" /> Recent Classes</h3>
                      <div className="bg-surface rounded-[12px] border border-border-light overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead><tr className="bg-app-bg border-b border-border-light"><th className="text-left p-2.5 font-medium text-text-secondary">Date</th><th className="text-left p-2.5 font-medium text-text-secondary">Course</th><th className="text-left p-2.5 font-medium text-text-secondary">Instructor</th><th className="text-left p-2.5 font-medium text-text-secondary">Topic</th><th className="text-center p-2.5 font-medium text-text-secondary">Status</th></tr></thead>
                            <tbody>
                              {batch.recent.map((s) => (
                                <tr key={s.name} className="border-b border-border-light last:border-0">
                                  <td className="p-2.5 text-primary font-medium">{s.date}</td>
                                  <td className="p-2.5 text-text-secondary">{s.course}</td>
                                  <td className="p-2.5 text-text-secondary">{s.instructor_name}</td>
                                  <td className="p-2.5 text-text-tertiary">
                                    {s.topic ? (
                                      <span className="flex items-center gap-1">
                                        {s.topic}
                                        {s.topic_covered ? <CheckCircle2 className="w-3 h-3 text-success shrink-0" /> : <Clock className="w-3 h-3 text-warning shrink-0" />}
                                      </span>
                                    ) : "—"}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${s.conducted ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>{s.conducted ? "Done" : "Missed"}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </>
              );
            })()
          )}
        </div>
      )}

      {/* ═══════════════ EVENTS TAB ═══════════════ */}
      {activeTab === "events" && (
        <div className="space-y-4">
          {schedLoading ? (
            <LoadingSkeleton />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <MetricCard icon={<Sparkles className="w-4 h-4 text-text-tertiary" />} label="Total Events" value={String(schedData?.events?.total ?? 0)} />
                <MetricCard icon={<CalendarDays className="w-4 h-4 text-info" />} label="This Month" value={String(schedData?.events?.this_month ?? 0)} />
                <MetricCard icon={<Clock className="w-4 h-4 text-warning" />} label="Upcoming" value={String(schedData?.events?.upcoming ?? 0)} />
              </div>
              {(schedData?.events?.by_type ?? []).length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-text-secondary">By Type</h3>
                  <div className="flex flex-wrap gap-2">
                    {schedData!.events.by_type.map((t) => (
                      <div key={t.type} className="bg-surface rounded-[8px] border border-border-light px-3 py-2 flex items-center gap-2">
                        <span className="text-xs font-medium text-primary">{t.type}</span>
                        <span className="text-xs font-bold text-text-secondary bg-app-bg px-1.5 py-0.5 rounded-full">{t.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <h3 className="text-sm font-semibold text-text-secondary">Recent & Upcoming Events</h3>
              {(schedData?.events?.list ?? []).length === 0 ? (
                <EmptyState text="No events found" />
              ) : (
                <div className="bg-surface rounded-[12px] border border-border-light overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-app-bg border-b border-border-light"><th className="text-left p-2.5 font-medium text-text-secondary">Date</th><th className="text-left p-2.5 font-medium text-text-secondary">Type</th><th className="text-left p-2.5 font-medium text-text-secondary">Title</th><th className="text-left p-2.5 font-medium text-text-secondary">Class / Batch</th><th className="text-left p-2.5 font-medium text-text-secondary">Host</th><th className="text-left p-2.5 font-medium text-text-secondary">Time</th></tr></thead>
                      <tbody>
                        {schedData!.events.list.map((e) => {
                          const isUpcoming = e.date >= new Date().toISOString().split("T")[0];
                          return (
                            <tr key={e.name} className="border-b border-border-light last:border-0">
                              <td className="p-2.5 font-medium text-primary whitespace-nowrap">{e.date}{isUpcoming && <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-warning/10 text-warning font-bold">UPCOMING</span>}</td>
                              <td className="p-2.5"><span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{e.event_type}</span></td>
                              <td className="p-2.5 text-text-secondary font-medium">{e.event_title}</td>
                              <td className="p-2.5 text-text-tertiary">{e.student_group || e.program || "Branch-wide"}{e.course && <span className="block text-[10px]">{e.course}</span>}</td>
                              <td className="p-2.5 text-text-secondary">{e.instructor_name || "—"}</td>
                              <td className="p-2.5 text-text-tertiary whitespace-nowrap">{e.from_time?.slice(0, 5)} - {e.to_time?.slice(0, 5)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
