"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  ArrowLeft,
  Medal,
  Search,
  Building2,
  Calendar,
  Sparkles,
  Download,
  Flame,
  CheckCircle2,
  BookOpen,
  Award,
  Layers,
  BarChart3,
  TrendingUp,
  X,
  Clock,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { useTheme } from "next-themes";
import * as XLSX from "xlsx";

interface QuarterScores {
  attendance: {
    raw_pct: number;
    late_arrivals: number;
    points: number;
    max: number;
  };
  portion_completion: {
    completed_pct: number;
    topics_assigned: number;
    topics_covered: number;
    points: number;
    max: number;
  };
  weekly_exams: {
    avg_pct: number;
    exams_evaluated: number;
    score_30?: number;
    full_mark_pts?: number;
    above_80_pts?: number;
    above_70_pts?: number;
    passed_pts?: number;
    points: number;
    max: number;
  };
  cwc_exam: {
    cwc_name: string;
    avg_pct: number;
    exams_evaluated: number;
    points: number;
    max: number;
  };
  core_subtotal: number;
  bonus_work: {
    assigned_count: number;
    completed_count: number;
    points: number;
    max: number;
  };
  total_score: number;
  max: number;
  grade: string;
  is_unlocked?: boolean;
  status?: "completed" | "upcoming";
  message?: string;
}

interface FacultyLeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  branch: string;
  employee_id: string;
  subjects: string[];
  student_groups: string[];
  quarters: {
    Q1: QuarterScores;
    Q2: QuarterScores;
    Q3: QuarterScores;
  };
  annual_average: number;
  annual_grade: string;
}

interface QuarterMetaItem {
  name: string;
  milestone: string;
  cwcExamGroup: string;
  from: string;
  to: string;
  is_unlocked?: boolean;
  status?: "completed" | "upcoming";
  status_message?: string;
}

interface ApiResponse {
  leaderboard: FacultyLeaderboardEntry[];
  quarters: {
    Q1: QuarterMetaItem;
    Q2: QuarterMetaItem;
    Q3: QuarterMetaItem;
  };
  active_quarter: string;
  overall: {
    total_faculty: number;
    avg_score: number;
    avg_cwc_score: number;
    avg_attendance_score: number;
    avg_portion_score: number;
    avg_weekly_score: number;
  };
}

export default function CwcFacultyLeaderboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading CWC Leaderboard...</div>}>
      <CwcFacultyLeaderboardContent />
    </Suspense>
  );
}

function CwcFacultyLeaderboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<"Q1" | "Q2" | "Q3" | "ANNUAL">("Q1");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyLeaderboardEntry | null>(null);

  // Fetch CWC Leaderboard data
  const { data, isLoading, isError, refetch } = useQuery<ApiResponse>({
    queryKey: ["cwc-leaderboard", activeTab, selectedBranch],
    queryFn: async () => {
      const branchParam = selectedBranch !== "all" ? `&branch=${encodeURIComponent(selectedBranch)}` : "";
      const res = await fetch(`/api/analytics/cwc-leaderboard?quarter=${activeTab}${branchParam}`);
      if (!res.ok) throw new Error("Failed to fetch CWC Leaderboard data");
      return res.json();
    },
    staleTime: 60_000,
  });

  const facultyList = data?.leaderboard ?? [];
  const quartersMeta = data?.quarters;
  const overall = data?.overall;

  // Extract unique branches for dropdown filter
  const branchOptions = useMemo(() => {
    const set = new Set<string>();
    facultyList.forEach((f) => {
      if (f.branch) set.add(f.branch);
    });
    return Array.from(set).sort();
  }, [facultyList]);

  // Filtered List based on Search Query
  const filteredList = useMemo(() => {
    let list = [...facultyList];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.branch.toLowerCase().includes(q) ||
          f.subjects.some((s) => s.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [facultyList, searchQuery]);

  // Top 3 Podium
  const topThree = useMemo(() => {
    return filteredList.slice(0, 3);
  }, [filteredList]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredList.length === 0) return;

    const rows = filteredList.map((f) => {
      const qScores = activeTab === "ANNUAL" ? f.quarters.Q1 : f.quarters[activeTab];
      return {
        Rank: f.rank,
        Faculty_Name: f.name,
        Branch: f.branch,
        Employee_ID: f.employee_id,
        Subjects: f.subjects.join(", "),
        Attendance_Points_15: qScores.attendance.points,
        Attendance_Pct: `${qScores.attendance.raw_pct}%`,
        Late_Arrivals: qScores.attendance.late_arrivals,
        Portion_Points_15: qScores.portion_completion.points,
        Portion_Pct: `${qScores.portion_completion.completed_pct}%`,
        Weekly_Exam_Points_20: qScores.weekly_exams.points,
        Weekly_Exam_Avg: `${qScores.weekly_exams.avg_pct}%`,
        CWC_Exam_Points_30: qScores.cwc_exam.points,
        CWC_Exam_Avg: `${qScores.cwc_exam.avg_pct}%`,
        Core_Subtotal_80: qScores.core_subtotal,
        Bonus_Points_20: qScores.bonus_work.points,
        Quarter_Total_100: qScores.total_score,
        Grade: qScores.grade,
        Q1_Score: f.quarters.Q1.total_score,
        Q2_Score: f.quarters.Q2.total_score,
        Q3_Score: f.quarters.Q3.total_score,
        Annual_Average: f.annual_average,
        Annual_Grade: f.annual_grade,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `CWC Leaderboard - ${activeTab}`);
    XLSX.writeFile(workbook, `SmartUp_CWC_Leaderboard_${activeTab}.xlsx`);
  };

  return (
    <div className="min-h-screen space-y-6 pb-16 text-slate-800 dark:text-slate-100">
      {/* ── Breadcrumb & Top Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <BreadcrumbNav />
        <button
          onClick={() => router.push("/dashboard/director/leaderboard")}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Leaderboards
        </button>
      </div>

      {/* ── Header & Action Bar ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/90 p-6 md:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/5">
              <Award className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              100-Point Faculty Evaluation Framework
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              CWC Faculty Leaderboard
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              Standardized faculty performance tracking across Attendance & Punctuality (15), Portion Completion (15), Weekly Exams (20), CWC Assessment (30), and Bonus Academic Work (20).
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={handleExportExcel}
              disabled={filteredList.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="h-3.5 w-3.5" />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* ── Quarter Navigation Tabs & Active Milestone Banner ────────────── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/5 w-fit">
          <button
            onClick={() => setActiveTab("Q1")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "Q1"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Quarter 1
          </button>
          <button
            onClick={() => setActiveTab("Q2")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "Q2"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Quarter 2
            {quartersMeta?.Q2 && !quartersMeta.Q2.is_unlocked && (
              <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                Upcoming
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("Q3")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "Q3"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Quarter 3
            {quartersMeta?.Q3 && !quartersMeta.Q3.is_unlocked && (
              <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                Upcoming
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("ANNUAL")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "ANNUAL"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            Annual Leaderboard
          </button>
        </div>

        {/* Milestone Indicator */}
        <div className="flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-slate-300">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>
            {activeTab === "ANNUAL"
              ? "Yearly Aggregated Average: Active Completed Quarters (Quarter 1)"
              : quartersMeta
              ? !quartersMeta[activeTab].is_unlocked
                ? `${quartersMeta[activeTab].name}: Pending ${quartersMeta[activeTab].cwcExamGroup} Exam (Calculation begins after exam)`
                : `${quartersMeta[activeTab].name}: ${quartersMeta[activeTab].milestone} (${quartersMeta[activeTab].cwcExamGroup})`
              : "Active Quarter View"}
          </span>
        </div>
      </div>

      {/* ── Upcoming Quarter Notice Banner ─────────────────────────────────── */}
      {activeTab !== "ANNUAL" && quartersMeta?.[activeTab] && !quartersMeta[activeTab].is_unlocked && (
        <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-start gap-3 text-xs">
          <div className="p-1 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 shrink-0 mt-0.5">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-amber-900 dark:text-amber-100">
              {quartersMeta[activeTab].name} Performance Evaluation Pending
            </div>
            <p className="text-amber-800/80 dark:text-amber-300/80 text-[11px] leading-relaxed">
              {quartersMeta[activeTab].status_message || `${quartersMeta[activeTab].name} evaluation will be calculated only after ${quartersMeta[activeTab].cwcExamGroup} is conducted.`}
              {" "}Quarterly scoring activates automatically once assessment plans and results are submitted to the ERP.
            </p>
          </div>
        </div>
      )}

      {/* ── KPI Stat Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Faculty Evaluated</span>
            <GraduationCap className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-white tracking-tight">
            {overall?.total_faculty ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Across all branches</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Average Score</span>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-white tracking-tight">
            {overall?.avg_score ?? 0} <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Weighted Core + Bonus</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Avg CWC Points</span>
            <Award className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-white tracking-tight">
            {overall?.avg_cwc_score ?? 0} <span className="text-xs font-normal text-slate-400">/ 30</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Continuous Weekly Assessment</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Avg Weekly Exam</span>
            <BarChart3 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-white tracking-tight">
            {overall?.avg_weekly_score ?? 0} <span className="text-xs font-normal text-slate-400">/ 20</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Student weekly exam average</div>
        </div>
      </div>

      {/* ── Top 3 Minimal Podium Cards ───────────────────────────────────── */}
      {topThree.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Rank 2 (Silver) */}
          <div
            onClick={() => setSelectedFaculty(topThree[1])}
            className="cursor-pointer group relative p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm hover:border-slate-300 dark:hover:border-white/20 transition-all"
          >
            <div className="flex items-start justify-between">
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                2nd Rank
              </span>
              <Medal className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3.5">
              <div className="text-base font-bold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                {topThree[1].name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                {topThree[1].branch}
              </div>
            </div>
            <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Score</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {activeTab === "ANNUAL" ? topThree[1].annual_average : topThree[1].quarters[activeTab].total_score}
                  <span className="text-xs font-normal text-slate-400"> /100</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/5">
                Grade {activeTab === "ANNUAL" ? topThree[1].annual_grade : topThree[1].quarters[activeTab].grade}
              </span>
            </div>
          </div>

          {/* Rank 1 (Top Performer) */}
          <div
            onClick={() => setSelectedFaculty(topThree[0])}
            className="cursor-pointer group relative p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-white/40 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs">
                <Trophy className="h-3 w-3 text-amber-400" />
                1st Rank
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Top Faculty
              </span>
            </div>
            <div className="mt-3.5">
              <div className="text-base font-bold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                {topThree[0].name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                {topThree[0].branch}
              </div>
            </div>
            <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Score</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {activeTab === "ANNUAL" ? topThree[0].annual_average : topThree[0].quarters[activeTab].total_score}
                  <span className="text-xs font-normal text-slate-400"> /100</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                Grade {activeTab === "ANNUAL" ? topThree[0].annual_grade : topThree[0].quarters[activeTab].grade}
              </span>
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          <div
            onClick={() => setSelectedFaculty(topThree[2])}
            className="cursor-pointer group relative p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm hover:border-slate-300 dark:hover:border-white/20 transition-all"
          >
            <div className="flex items-start justify-between">
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                3rd Rank
              </span>
              <Medal className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3.5">
              <div className="text-base font-bold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                {topThree[2].name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                {topThree[2].branch}
              </div>
            </div>
            <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Score</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {activeTab === "ANNUAL" ? topThree[2].annual_average : topThree[2].quarters[activeTab].total_score}
                  <span className="text-xs font-normal text-slate-400"> /100</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/5">
                Grade {activeTab === "ANNUAL" ? topThree[2].annual_grade : topThree[2].quarters[activeTab].grade}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Search & Filter Controls ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search faculty name, branch, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 shadow-sm">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Branches</option>
              {branchOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Detailed Faculty Leaderboard Table ───────────────────────────── */}
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                <th className="py-3 px-4 text-center w-14">Rank</th>
                <th className="py-3 px-4 min-w-[200px]">Faculty</th>
                <th className="py-3 px-4 text-center">Attendance (15)</th>
                <th className="py-3 px-4 text-center">Portion (15)</th>
                <th 
                  className="py-3 px-4 text-center cursor-help"
                  title="Weekly Exam Performance: Evaluated on 30 pts criteria (Full mark: 5, 80%+: 5, 70%+: 10, Passed: 10) normalized to 20 pts"
                >
                  Weekly (20)
                </th>
                <th className="py-3 px-4 text-center">CWC (30)</th>
                <th className="py-3 px-4 text-center">Core (80)</th>
                <th className="py-3 px-4 text-center">Bonus (20)</th>
                {activeTab === "ANNUAL" && (
                  <>
                    <th className="py-3 px-4 text-center">Q1</th>
                    <th className="py-3 px-4 text-center">Q2</th>
                    <th className="py-3 px-4 text-center">Q3</th>
                  </>
                )}
                <th className="py-3 px-4 text-center">Total /100</th>
                <th className="py-3 px-4 text-center">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
              {filteredList.map((faculty) => {
                const qScores = activeTab === "ANNUAL" ? faculty.quarters.Q1 : faculty.quarters[activeTab];
                const totalScore = activeTab === "ANNUAL" ? faculty.annual_average : qScores.total_score;
                const grade = activeTab === "ANNUAL" ? faculty.annual_grade : qScores.grade;

                return (
                  <tr
                    key={faculty.id}
                    onClick={() => setSelectedFaculty(faculty)}
                    className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                        {faculty.rank}
                      </span>
                    </td>

                    {/* Faculty Details */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                        {faculty.name}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{faculty.branch}</span>
                        {faculty.subjects[0] && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500 dark:text-slate-400 font-medium">
                              {faculty.subjects[0]}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Attendance (15) */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {qScores.attendance.points}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {qScores.attendance.raw_pct}%{" "}
                        {qScores.attendance.late_arrivals > 0 && (
                          <span className="text-slate-500 font-medium">
                            ({qScores.attendance.late_arrivals}L)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Portion Completion (15) */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {qScores.portion_completion.points}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {qScores.portion_completion.completed_pct}%
                      </div>
                    </td>

                    {/* Weekly Exam Performance (20 normalized from 30 pts criteria) */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {qScores.weekly_exams.points}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {qScores.weekly_exams.score_30 !== undefined ? (
                          <span>{qScores.weekly_exams.score_30}/30 pts</span>
                        ) : (
                          <span>{qScores.weekly_exams.avg_pct}% avg</span>
                        )}
                      </div>
                    </td>

                    {/* CWC Exam Performance (30) */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {qScores.cwc_exam.points}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {qScores.cwc_exam.avg_pct}% avg
                      </div>
                    </td>

                    {/* Core Subtotal (80) */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                        {qScores.core_subtotal}
                      </span>
                    </td>

                    {/* Bonus Work (20) */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        +{qScores.bonus_work.points}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {qScores.bonus_work.completed_count}/{qScores.bonus_work.assigned_count} done
                      </div>
                    </td>

                    {/* Annual Individual Quarters */}
                    {activeTab === "ANNUAL" && (
                      <>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-700 dark:text-slate-300">
                          {faculty.quarters.Q1.is_unlocked !== false ? faculty.quarters.Q1.total_score : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-400">
                          {faculty.quarters.Q2.is_unlocked ? (
                            faculty.quarters.Q2.total_score
                          ) : (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal italic">
                              Upcoming
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-400">
                          {faculty.quarters.Q3.is_unlocked ? (
                            faculty.quarters.Q3.total_score
                          ) : (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal italic">
                              Upcoming
                            </span>
                          )}
                        </td>
                      </>
                    )}

                    {/* Total Score */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {totalScore}
                      </div>
                      <div className="w-14 mx-auto bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className="bg-slate-900 dark:bg-slate-300 h-full rounded-full"
                          style={{ width: `${Math.min(100, totalScore)}%` }}
                        />
                      </div>
                    </td>

                    {/* Grade */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          grade.startsWith("A")
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : grade.startsWith("B")
                            ? "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                            : grade.startsWith("C")
                            ? "bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400"
                            : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                        }`}
                      >
                        {grade}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    No faculty found matching the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Faculty Detail Modal / Drawer ───────────────────────────────── */}
      <AnimatePresence>
        {selectedFaculty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedFaculty(null)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-base shadow-sm">
                  {selectedFaculty.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedFaculty.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Rank #{selectedFaculty.rank}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>{selectedFaculty.branch}</span>
                    <span>•</span>
                    <span>Employee ID: {selectedFaculty.employee_id}</span>
                  </div>
                </div>
              </div>

              {/* Active Tab Scores Breakdown */}
              {(() => {
                const qScores =
                  activeTab === "ANNUAL" ? selectedFaculty.quarters.Q1 : selectedFaculty.quarters[activeTab];
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5">
                      <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {activeTab === "ANNUAL" ? "Annual Aggregated Score" : `${activeTab} Final Score`}
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                          {activeTab === "ANNUAL" ? selectedFaculty.annual_average : qScores.total_score}
                          <span className="text-xs font-normal text-slate-400"> / 100</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Grade</div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                          {activeTab === "ANNUAL" ? selectedFaculty.annual_grade : qScores.grade}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-4">
                      Scoring Framework Metrics
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Attendance */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/5">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                          <span>1. Attendance & Punctuality</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {qScores.attendance.points} / 15
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                          Rate: <strong>{qScores.attendance.raw_pct}%</strong> | Late arrivals:{" "}
                          <strong>{qScores.attendance.late_arrivals}</strong>
                        </div>
                      </div>

                      {/* Portion Completion */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/5">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                          <span>2. Portion Completion</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {qScores.portion_completion.points} / 15
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                          Completion: <strong>{qScores.portion_completion.completed_pct}%</strong> | Topics:{" "}
                          <strong>
                            {qScores.portion_completion.topics_covered}/{qScores.portion_completion.topics_assigned}
                          </strong>
                        </div>
                      </div>

                      {/* Weekly Exam */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/5 md:col-span-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                          <div className="flex items-center gap-2">
                            <span>3. Weekly Exam Performance</span>
                            {qScores.weekly_exams.score_30 !== undefined && (
                              <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {qScores.weekly_exams.score_30} / 30 criteria pts
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {qScores.weekly_exams.points} / 20
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>Exam Avg: <strong>{qScores.weekly_exams.avg_pct}%</strong></span>
                          <span>Tests evaluated: <strong>{qScores.weekly_exams.exams_evaluated}</strong></span>
                        </div>
                        {qScores.weekly_exams.full_mark_pts !== undefined && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-white/5 text-[11px]">
                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                              <div className="text-slate-400">1. Full Mark (5)</div>
                              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                {qScores.weekly_exams.full_mark_pts} / 5 pts
                              </div>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                              <div className="text-slate-400">2. 80%+ (5)</div>
                              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                {qScores.weekly_exams.above_80_pts} / 5 pts
                              </div>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                              <div className="text-slate-400">3. 70%+ (10)</div>
                              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                {qScores.weekly_exams.above_70_pts} / 10 pts
                              </div>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                              <div className="text-slate-400">4. Passed (10)</div>
                              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                {qScores.weekly_exams.passed_pts} / 10 pts
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* CWC Exam */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/5">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                          <span>4. CWC Exam Performance</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {qScores.cwc_exam.points} / 30
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                          Assessment Avg: <strong>{qScores.cwc_exam.avg_pct}%</strong> | ({qScores.cwc_exam.cwc_name})
                        </div>
                      </div>
                    </div>

                    {/* Bonus Work Assignments */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>5. Academic Work Assignments (Bonus)</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          +{qScores.bonus_work.points} / 20
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        Completed: <strong>{qScores.bonus_work.completed_count}</strong> of{" "}
                        <strong>{qScores.bonus_work.assigned_count}</strong> assigned academic tasks.
                      </div>
                    </div>

                    {/* Three-Quarter Performance Progression */}
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                        Three-Quarter Progression
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-center">
                          <div className="text-[11px] text-slate-400">Quarter 1</div>
                          <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                            {selectedFaculty.quarters.Q1.is_unlocked !== false ? selectedFaculty.quarters.Q1.total_score : "—"}
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold">
                            {selectedFaculty.quarters.Q1.is_unlocked !== false ? `Grade ${selectedFaculty.quarters.Q1.grade}` : "Upcoming"}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-center">
                          <div className="text-[11px] text-slate-400">Quarter 2</div>
                          <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                            {selectedFaculty.quarters.Q2.is_unlocked ? selectedFaculty.quarters.Q2.total_score : "—"}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {selectedFaculty.quarters.Q2.is_unlocked ? `Grade ${selectedFaculty.quarters.Q2.grade}` : "Pending CWC 2"}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-center">
                          <div className="text-[11px] text-slate-400">Quarter 3</div>
                          <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                            {selectedFaculty.quarters.Q3.is_unlocked ? selectedFaculty.quarters.Q3.total_score : "—"}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {selectedFaculty.quarters.Q3.is_unlocked ? `Grade ${selectedFaculty.quarters.Q3.grade}` : "Pending CWC 3"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
