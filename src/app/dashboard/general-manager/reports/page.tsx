"use client";

import React, { useState, useCallback, Suspense } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  GraduationCap,
  BookOpen,
  FileBarChart,
  Users,
  CalendarCheck,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { useQuery } from "@tanstack/react-query";
import { getBranchAcademics } from "@/lib/api/analytics";
import { safeNum, pctBadgeColor } from "@/components/academics/BranchDrillDown";
import { useSearchParams } from "next/navigation";

// Academics - Exam Analytics
import { AcademicsBranchSummary } from "@/components/reports/AcademicsBranchSummary";
import { AcademicsClassSummary } from "@/components/reports/AcademicsClassSummary";

// Students
import { StudentsBranchSummary } from "@/components/reports/StudentsBranchSummary";
import { StudentsBranchDetail } from "@/components/reports/StudentsBranchDetail";
import { StudentsClassSummary } from "@/components/reports/StudentsClassSummary";
import { StudentsClassDetail } from "@/components/reports/StudentsClassDetail";

// Attendance
import { AttendanceBranchSummary } from "@/components/reports/AttendanceBranchSummary";
import { AttendanceBranchDetail } from "@/components/reports/AttendanceBranchDetail";
import { AttendanceClassSummary } from "@/components/reports/AttendanceClassSummary";
import { AttendanceClassDetail } from "@/components/reports/AttendanceClassDetail";

type Category = "students" | "attendance" | "academics" | "shedules";
type Mode = "branch" | "class";

const CATEGORIES: { key: Category; label: string; icon: React.ElementType }[] = [
  { key: "students", label: "Students", icon: Users },
  { key: "attendance", label: "Attendance", icon: CalendarCheck },
  { key: "academics", label: "Academics", icon: BookOpen },
  { key: "shedules", label: "Shedules", icon: CalendarDays },
];

function getAdjustedBranchMetrics(branch: {
  total_working_days?: number;
  scheduled_days?: number;
  attendance_marked_on_scheduled_days?: number;
}) {
  const workingDays = safeNum(branch.total_working_days);
  const scheduledDays = Math.min(safeNum(branch.scheduled_days), workingDays);
  const attendanceMarkedDays = Math.min(safeNum(branch.attendance_marked_on_scheduled_days), scheduledDays);
  const nonScheduledDays = Math.max(workingDays - scheduledDays, 0);
  const attendanceNotMarkedDays = Math.max(workingDays - attendanceMarkedDays, 0);
  const operationalPct = workingDays > 0
    ? Math.max(0, Math.round(((workingDays - attendanceNotMarkedDays) / workingDays) * 1000) / 10)
    : 0;

  return {
    workingDays,
    scheduledDays,
    nonScheduledDays,
    attendanceMarkedDays,
    attendanceNotMarkedDays,
    operationalPct,
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function getDefaultDates() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(new Date(y, now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`,
  };
}

export default function GeneralManagerReportsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-text-secondary text-sm">Loading...</div>}>
      <ReportsPageInner />
    </Suspense>
  );
}

function ReportsPageInner() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("tab") === "shedules" ? "shedules" : "students";
  const [category, setCategory] = useState<Category>(initialCategory);
  const [mode, setMode] = useState<Mode>("branch");
  const [detail, setDetail] = useState<string | null>(null);

  // Attendance date range
  const defaults = getDefaultDates();
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);

  const switchCategory = useCallback((c: Category) => {
    setCategory(c);
    setMode("branch");
    setDetail(null);
  }, []);

  const switchMode = useCallback((m: Mode) => {
    setMode(m);
    setDetail(null);
  }, []);

  const isDetail = !!detail;

  const { data: scheduleData, isLoading: schedulesLoading } = useQuery({
    queryKey: ["gm-reports-shedules-branch-comparison"],
    queryFn: getBranchAcademics,
    staleTime: 120_000,
    enabled: category === "shedules",
  });

  // ─── Render content per category ───
  function renderContent() {
    // SHEDULES
    if (category === "shedules") {
      if (schedulesLoading) {
        return (
          <div className="bg-surface rounded-[12px] border border-border-light p-6">
            <div className="h-6 w-48 bg-app-bg rounded animate-pulse mb-4" />
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-app-bg rounded animate-pulse" />
              ))}
            </div>
          </div>
        );
      }

      const rows = (scheduleData?.branches ?? [])
        .map((b) => ({ branch: b, metrics: getAdjustedBranchMetrics(b) }))
        .sort((a, b) => b.metrics.operationalPct - a.metrics.operationalPct);

      return (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-primary">Branch Comparison</h2>
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
                  {rows.map(({ branch: b, metrics }) => (
                    <tr key={b.branch} className="border-b border-border-light last:border-0">
                      <td className="p-3 font-medium text-primary">{b.branch.replace("Smart Up ", "")}</td>
                      <td className="p-3 text-center text-text-secondary">{metrics.workingDays}</td>
                      <td className="p-3 text-center text-text-secondary">{metrics.scheduledDays}</td>
                      <td className="p-3 text-center text-text-secondary">{metrics.nonScheduledDays}</td>
                      <td className="p-3 text-center text-success font-medium">{metrics.attendanceMarkedDays}</td>
                      <td className="p-3 text-center text-error font-medium">{metrics.attendanceNotMarkedDays}</td>
                      <td className="p-3 text-center text-text-secondary">{safeNum(b.total_batches)}</td>
                      <td className="p-3 text-center text-text-secondary">{safeNum(b.total_instructors)}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${pctBadgeColor(metrics.operationalPct, 80, 60)}`}>
                          {metrics.operationalPct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-sm text-text-tertiary">
                        No branch comparison data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // STUDENTS
    if (category === "students") {
      if (detail && mode === "branch") return <StudentsBranchDetail branch={detail} onBack={() => setDetail(null)} />;
      if (detail && mode === "class") return <StudentsClassDetail program={detail} onBack={() => setDetail(null)} />;
      if (mode === "branch") return <StudentsBranchSummary onSelect={setDetail} />;
      return <StudentsClassSummary onSelect={setDetail} />;
    }

    // ACADEMICS
    if (category === "academics") {
      if (mode === "branch") return <AcademicsBranchSummary onSelect={setDetail} />;
      return <AcademicsClassSummary onSelect={setDetail} />;
    }

    // ATTENDANCE
    if (detail && mode === "branch") return <AttendanceBranchDetail branch={detail} fromDate={fromDate} toDate={toDate} onBack={() => setDetail(null)} />;
    if (detail && mode === "class") return <AttendanceClassDetail program={detail} fromDate={fromDate} toDate={toDate} onBack={() => setDetail(null)} />;
    if (mode === "branch") return <AttendanceBranchSummary fromDate={fromDate} toDate={toDate} onDrillDown={setDetail} />;
    return <AttendanceClassSummary fromDate={fromDate} toDate={toDate} onDrillDown={setDetail} />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-brand-wash flex items-center justify-center">
            <FileBarChart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
            <p className="text-text-secondary text-sm mt-0.5">
              Students, attendance and academic analytics (branch-wise or class-wise)
            </p>
          </div>
        </div>
      </motion.div>

      {/* Category Tabs */}
      <motion.div variants={itemVariants}>
        <div className="flex gap-1 p-1 bg-app-bg rounded-[12px] border border-border-light w-fit">
          {CATEGORIES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => switchCategory(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-medium transition-all",
                category === key
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </motion.div>


      {/* Branch / Class toggle — visible at summary level only */}
      {!isDetail && category !== "shedules" && (
        <motion.div variants={itemVariants}>
          <div className="flex gap-2 p-1 bg-app-bg rounded-[12px] border border-border-light w-fit">
            <button
              onClick={() => switchMode("branch")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-medium transition-all",
                mode === "branch"
                  ? "bg-surface text-text-primary shadow-sm border border-border-light"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface",
              )}
            >
              <Building2 className="h-4 w-4" />
              Branch Wise
            </button>
            <button
              onClick={() => switchMode("class")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-medium transition-all",
                mode === "class"
                  ? "bg-surface text-text-primary shadow-sm border border-border-light"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface",
              )}
            >
              <GraduationCap className="h-4 w-4" />
              Class Wise
            </button>
          </div>
        </motion.div>
      )}

      {/* Date filters for Attendance */}
      {category === "attendance" && !isDetail && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              From
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-1.5 rounded-[8px] border border-border-light bg-surface text-text-primary text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              To
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-1.5 rounded-[8px] border border-border-light bg-surface text-text-primary text-sm"
              />
            </label>
          </div>
        </motion.div>
      )}

      {/* Content */}
      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        {renderContent()}
      </motion.div>
    </motion.div>
  );
}
