"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  GraduationCap,
  FileBarChart,
  Users,
  IndianRupee,
  CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";

// Overview (existing)
import { BranchWiseSummary } from "@/components/reports/BranchWiseSummary";
import { ClassWiseSummary } from "@/components/reports/ClassWiseSummary";
import { BranchDetail } from "@/components/reports/BranchDetail";
import { ClassDetail } from "@/components/reports/ClassDetail";

// Students
import { StudentsBranchSummary } from "@/components/reports/StudentsBranchSummary";
import { StudentsBranchDetail } from "@/components/reports/StudentsBranchDetail";
import { StudentsClassSummary } from "@/components/reports/StudentsClassSummary";
import { StudentsClassDetail } from "@/components/reports/StudentsClassDetail";

// Fees
import { FeesBranchSummary } from "@/components/reports/FeesBranchSummary";
import { FeesBranchDetail } from "@/components/reports/FeesBranchDetail";
import { FeesClassSummary } from "@/components/reports/FeesClassSummary2";
import { FeesClassDetail } from "@/components/reports/FeesClassDetail";

// Attendance
import { AttendanceBranchSummary } from "@/components/reports/AttendanceBranchSummary";
import { AttendanceBranchDetail } from "@/components/reports/AttendanceBranchDetail";
import { AttendanceClassSummary } from "@/components/reports/AttendanceClassSummary";
import { AttendanceClassDetail } from "@/components/reports/AttendanceClassDetail";

type Category = "overview" | "students" | "fees" | "attendance";
type Mode = "branch" | "class";

const CATEGORIES: { key: Category; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: FileBarChart },
  { key: "students", label: "Students", icon: Users },
  { key: "fees", label: "Fees", icon: IndianRupee },
  { key: "attendance", label: "Attendance", icon: CalendarCheck },
];

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
  const [category, setCategory] = useState<Category>("overview");
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

  // ─── Render content per category ───
  function renderContent() {
    // OVERVIEW
    if (category === "overview") {
      if (detail && mode === "branch") return <BranchDetail branch={detail} onBack={() => setDetail(null)} />;
      if (detail && mode === "class") return <ClassDetail program={detail} onBack={() => setDetail(null)} />;
      if (mode === "branch") return <BranchWiseSummary onSelectBranch={setDetail} />;
      return <ClassWiseSummary onSelectClass={setDetail} />;
    }

    // STUDENTS
    if (category === "students") {
      if (detail && mode === "branch") return <StudentsBranchDetail branch={detail} onBack={() => setDetail(null)} />;
      if (detail && mode === "class") return <StudentsClassDetail program={detail} onBack={() => setDetail(null)} />;
      if (mode === "branch") return <StudentsBranchSummary onSelect={setDetail} />;
      return <StudentsClassSummary onSelect={setDetail} />;
    }

    // FEES
    if (category === "fees") {
      if (detail && mode === "branch") return <FeesBranchDetail branch={detail} onBack={() => setDetail(null)} />;
      if (detail && mode === "class") return <FeesClassDetail program={detail} onBack={() => setDetail(null)} />;
      if (mode === "branch") return <FeesBranchSummary onSelect={setDetail} />;
      return <FeesClassSummary onDrillDown={setDetail} />;
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
              Download branch-wise or class-wise analytics
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
      {!isDetail && (
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
