"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  GraduationCap,
  Users,
  UserCheck,
  ChevronRight,
  Loader2,
  AlertCircle,
  IndianRupee,
  CircleCheck,
  Clock,
  TriangleAlert,
  Wifi,
  Banknote,
  CalendarClock,
  UserPlus,
  BarChart3,
  ClipboardCheck,
  Trophy,
  Calendar,
  BookOpen,
  Target,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getAllBranches,
  getStudentCountForBranch,
  getBatchCountForBranch,
  getInstructorCountForBranch,
  getTotalStudentCount,
  getActiveStudentCount,
  getDiscontinuedStudentCount,
  getTotalStaffCount,
  getStudentCountByPlan,
  getTotalInvoiceStats,
  getCollectedByMode,
  getDiscontinuedStudentForfeitedFees,
  getDuesTodayTotal,
  getTodaysAdmissions,
  getTodaysBilled,
  getTodaysCollected,
} from "@/lib/api/director";
import { getBudgetData } from "@/lib/api/budget";
import { AnimatedNumber, AnimatedCurrency, AnimatedName } from "@/components/dashboard/AnimatedValue";

const DIRECTOR_BUDGET_FISCAL_YEAR = "2026-2027";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, rotateX: -10 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

function formatBudgetSummaryAmount(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

// ── 3D hover wrapper ──
function ThreeDCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      style={{ perspective: "1000px" }}
      whileHover={{
        y: -4,
        rotateX: -2,
        rotateY: 2,
        scale: 1.02,
        transition: { duration: 0.2, ease: "easeOut" },
      }}
      whileTap={{ scale: 0.96, y: 2 }}
    >
      {children}
    </motion.div>
  );
}

// ── Branch card with live stats ──
function BranchCard({ branch, index: _index }: { branch: { name: string; company_name: string; abbr: string }; index?: number }) {
  const { data: studentCount, isLoading: loadingStudents } = useQuery({
    queryKey: ["director-branch-students", branch.name],
    queryFn: () => getStudentCountForBranch(branch.name),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: batchCount, isLoading: loadingBatches } = useQuery({
    queryKey: ["director-branch-batches", branch.name],
    queryFn: () => getBatchCountForBranch(branch.name),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: instructorCount, isLoading: loadingInstructors } = useQuery({
    queryKey: ["director-branch-instructors", branch.name],
    queryFn: () => getInstructorCountForBranch(branch.name),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const shortName = branch.name.replace("Smart Up ", "").replace("Smart Up", "HQ");

  return (
    <Link href={`/dashboard/director/branches/${encodeURIComponent(branch.name)}`}>
      <motion.div
        style={{ perspective: "800px" }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        whileHover={{ y: -8, rotateX: -6, rotateY: 5, scale: 1.02, transition: { duration: 0.18 } }}
        whileTap={{ scale: 0.97 }}
      >
        <Card className="h-full relative overflow-hidden rounded-[20px] bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),_0_8px_16px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_0_12px_24px_rgba(103,58,183,0.15)] hover:border-[#7E57C2]/40 transition-all duration-300 cursor-pointer group border-b-[4px] border-r-[2px] hover:-translate-y-1 active:translate-y-0 active:border-b-[1px] active:border-r-[1px]">
          <CardContent className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-brand-wash flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary text-sm leading-tight">{shortName}</h3>
                  <p className="text-[11px] text-text-tertiary mt-0.5">{branch.abbr}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-primary transition-colors" />
            </div>

            {/* Divider */}
            <div className="border-t border-border-light mb-4" />

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-app-bg px-3 py-2.5 text-center">
                <GraduationCap className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <p className="text-base font-bold text-text-primary leading-none tabular-nums">
                  {loadingStudents ? (
                    <span className="inline-block w-5 h-4 bg-border-light rounded animate-pulse" />
                  ) : (
                    studentCount ?? 0
                  )}
                </p>
                <p className="text-[10px] text-text-tertiary mt-1 uppercase tracking-wider">Students</p>
              </div>
              <div className="rounded-lg bg-app-bg px-3 py-2.5 text-center">
                <Users className="h-4 w-4 text-secondary mx-auto mb-1.5" />
                <p className="text-base font-bold text-text-primary leading-none tabular-nums">
                  {loadingBatches ? (
                    <span className="inline-block w-5 h-4 bg-border-light rounded animate-pulse" />
                  ) : (
                    batchCount ?? 0
                  )}
                </p>
                <p className="text-[10px] text-text-tertiary mt-1 uppercase tracking-wider">Batches</p>
              </div>
              <div className="rounded-lg bg-app-bg px-3 py-2.5 text-center">
                <UserCheck className="h-4 w-4 text-info mx-auto mb-1.5" />
                <p className="text-base font-bold text-text-primary leading-none tabular-nums">
                  {loadingInstructors ? (
                    <span className="inline-block w-5 h-4 bg-border-light rounded animate-pulse" />
                  ) : (
                    instructorCount ?? 0
                  )}
                </p>
                <p className="text-[10px] text-text-tertiary mt-1 uppercase tracking-wider">Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}

// ── Main Director Dashboard ──
export default function DirectorDashboard() {
  const { user } = useAuth();

  const {
    data: branches,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  // Filter out the parent "Smart Up" company (HQ) if it has no students
  const activeBranches = (branches ?? []).filter(
    (b) => b.name !== "Smart Up"
  );

  // Summary stats
  const totalBranches = activeBranches.length;

  // Dynamic total counts
  const { data: totalStudents, isLoading: loadTotalStudents, isError: errTotalStudents } = useQuery({
    queryKey: ["director-total-students"],
    queryFn: getTotalStudentCount,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: activeStudents, isLoading: loadActiveStudents } = useQuery({
    queryKey: ["director-active-students"],
    queryFn: getActiveStudentCount,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: discontinuedStudents, isLoading: loadDiscontinuedStudents } = useQuery({
    queryKey: ["director-discontinued-students"],
    queryFn: getDiscontinuedStudentCount,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: planCounts, isLoading: loadPlanCounts } = useQuery({
    queryKey: ["director-student-plan-counts"],
    queryFn: getStudentCountByPlan,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: totalStaff, isLoading: loadTotalStaff, isError: errTotalStaff } = useQuery({
    queryKey: ["director-total-staff"],
    queryFn: getTotalStaffCount,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: invoiceStats, isLoading: loadInvoiceStats, isError: errInvoiceStats } = useQuery({
    queryKey: ["director-total-invoices"],
    queryFn: getTotalInvoiceStats,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: forfeitedFees, isLoading: loadForfeitedFees, isError: errForfeitedFees } = useQuery({
    queryKey: ["director-forfeited-fees"],
    queryFn: getDiscontinuedStudentForfeitedFees,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: collectedByMode, isLoading: loadCollectedByMode, isError: errCollectedByMode } = useQuery({
    queryKey: ["director-collected-by-mode"],
    queryFn: getCollectedByMode,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: duesToday, isLoading: loadDuesToday, isError: errDuesToday } = useQuery({
    queryKey: ["director-dues-today"],
    queryFn: () => getDuesTodayTotal(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: todaysAdmissions, isLoading: loadTodaysAdmissions } = useQuery({
    queryKey: ["director-todays-admissions"],
    queryFn: getTodaysAdmissions,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: todaysBilled, isLoading: loadTodaysBilled } = useQuery({
    queryKey: ["director-todays-billed"],
    queryFn: getTodaysBilled,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: todaysCollected, isLoading: loadTodaysCollected } = useQuery({
    queryKey: ["director-todays-collected"],
    queryFn: getTodaysCollected,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: budgetData, isLoading: loadBudgetData, isError: errBudgetData } = useQuery({
    queryKey: ["director-budget-summary", DIRECTOR_BUDGET_FISCAL_YEAR],
    queryFn: () => getBudgetData(DIRECTOR_BUDGET_FISCAL_YEAR),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ perspective: "1200px" }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Welcome Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                Welcome,{" "}
              </motion.span>
              <AnimatedName name={user?.full_name?.split(" ")[0] || "Director"} />
              <video src="/Logo%20Icon%20Smile%20ALPHA.webm" autoPlay loop muted playsInline  className="h-20 w-20 object-contain" />
            </h1>
            <motion.p
              className="text-text-secondary text-sm mt-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              Overview of all your branches and operations
            </motion.p>
          </div>
          <Badge variant="default" className="self-start px-3 py-1 text-sm">
            Director
          </Badge>
        </div>
      </motion.div>

      {/* Today's Snapshot — compact highlight bar */}
      <motion.div variants={itemVariants}>
        <Link href="/dashboard/director/today">
        <Card className="relative overflow-hidden bg-gradient-to-br from-[#7E57C2]/15 via-white dark:via-slate-900 to-[#512DA8]/5 border-[#7E57C2]/30 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),_0_8px_20px_rgba(103,58,183,0.12)] hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_0_12px_24px_rgba(103,58,183,0.2)] transition-all duration-300 cursor-pointer rounded-2xl group">
          <div className="absolute inset-0 bg-white/40 dark:bg-black/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="relative py-3 px-5 flex items-center gap-6 flex-wrap z-10">
            {/* Admissions */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <UserPlus className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <span className="text-lg font-bold text-emerald-600 tabular-nums">
                  {loadTodaysAdmissions ? "..." : <AnimatedNumber value={todaysAdmissions ?? 0} />}
                </span>
                <span className="text-xs text-text-tertiary ml-1.5">
                  {(todaysAdmissions ?? 0) === 1 ? "admission" : "admissions"}
                </span>
              </div>
            </div>

            <div className="w-px h-7 bg-border-light" />

            {/* Today Billed */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
                <IndianRupee className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <span className="text-lg font-bold text-yellow-600 tabular-nums">
                  {loadTodaysBilled ? "..." : <AnimatedCurrency value={todaysBilled ?? 0} />}
                </span>
                <span className="text-xs text-text-tertiary ml-1.5">billed</span>
              </div>
            </div>

            <div className="w-px h-7 bg-border-light" />

            {/* Today Collected */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                <CircleCheck className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <span className="text-lg font-bold text-green-600 tabular-nums">
                  {loadTodaysCollected ? "..." : <AnimatedCurrency value={todaysCollected ?? 0} />}
                </span>
                <span className="text-xs text-text-tertiary ml-1.5">collected</span>
              </div>
            </div>

            <span className="text-[10px] text-text-tertiary ml-auto uppercase tracking-wider">Today</span>
          </CardContent>
        </Card>
        </Link>
      </motion.div>

      {/* Summary Stats — Clickable Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <ThreeDCard className="min-w-0">
          <Link href="/dashboard/director/students" className="block h-full">
            <Card className="h-full relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),_0_6px_12px_rgba(0,0,0,0.05)] hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_0_10px_20px_rgba(103,58,183,0.15)] transition-all duration-300 cursor-pointer group hover:border-[#7E57C2]/40">
              <CardContent className="p-3 text-center">
                <GraduationCap className="h-4 w-4 text-primary mx-auto mb-1.5" />
                {errTotalStudents ? (
                  <p className="text-xs text-error flex items-center justify-center gap-1"><AlertCircle className="h-3 w-3" /> Error</p>
                ) : (
                  <p className="text-xl font-bold text-text-primary leading-tight">
                    {loadTotalStudents ? "..." : <AnimatedNumber value={totalStudents ?? 0} />}
                  </p>
                )}
                <p className="text-[10px] text-text-tertiary mt-0.5">Total Students</p>
                {!errTotalStudents && (
                  <div className="flex justify-center gap-2 mt-1.5">
                    <div className="text-center">
                      <p className="text-xs font-semibold text-success">{loadActiveStudents ? "..." : <AnimatedNumber value={activeStudents ?? 0} />}</p>
                      <p className="text-[9px] text-text-tertiary uppercase">Active</p>
                    </div>
                    <div className="w-px bg-border-light" />
                    <div className="text-center">
                      <p className="text-xs font-semibold text-error">{loadDiscontinuedStudents ? "..." : <AnimatedNumber value={discontinuedStudents ?? 0} />}</p>
                      <p className="text-[9px] text-text-tertiary uppercase">Disc.</p>
                    </div>
                  </div>
                )}
                {!errTotalStudents && (
                  <div className="flex justify-center gap-1.5 mt-1.5 pt-1.5 border-t border-border-light">
                    <div className="text-center">
                      <p className="text-[11px] font-semibold text-purple-600">{loadPlanCounts ? "..." : <AnimatedNumber value={planCounts?.advanced ?? 0} />}</p>
                      <p className="text-[8px] text-text-tertiary uppercase">Adv</p>
                    </div>
                    <div className="w-px bg-border-light" />
                    <div className="text-center">
                      <p className="text-[11px] font-semibold text-blue-600">{loadPlanCounts ? "..." : <AnimatedNumber value={planCounts?.intermediate ?? 0} />}</p>
                      <p className="text-[8px] text-text-tertiary uppercase">Int</p>
                    </div>
                    <div className="w-px bg-border-light" />
                    <div className="text-center">
                      <p className="text-[11px] font-semibold text-emerald-600">{loadPlanCounts ? "..." : <AnimatedNumber value={planCounts?.basic ?? 0} />}</p>
                      <p className="text-[8px] text-text-tertiary uppercase">Basic</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        </ThreeDCard>
        <ThreeDCard className="min-w-0">
          <Link href="/dashboard/director/teachers" className="block h-full">
            <Card className="h-full relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),_0_6px_12px_rgba(0,0,0,0.05)] hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_0_10px_20px_rgba(59,130,246,0.15)] transition-all duration-300 cursor-pointer group hover:border-blue-500/40">
              <CardContent className="p-3 text-center">
                <UserCheck className="h-4 w-4 text-info mx-auto mb-1.5" />
                {errTotalStaff ? (
                  <p className="text-xs text-error flex items-center justify-center gap-1"><AlertCircle className="h-3 w-3" /> Error</p>
                ) : (
                  <p className="text-xl font-bold text-text-primary leading-tight">
                    {loadTotalStaff ? "..." : <AnimatedNumber value={totalStaff ?? 0} />}
                  </p>
                )}
                <p className="text-[10px] text-text-tertiary mt-0.5">Total Staff</p>
              </CardContent>
            </Card>
          </Link>
        </ThreeDCard>
        <ThreeDCard className="min-w-0">
          <Link href="/dashboard/director/fees" className="block h-full">
            <Card className="h-full relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),_0_6px_12px_rgba(0,0,0,0.05)] hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_0_10px_20px_rgba(234,179,8,0.15)] transition-all duration-300 cursor-pointer group hover:border-yellow-500/40">
              <CardContent className="p-3 text-center">
                <IndianRupee className="h-4 w-4 text-warning mx-auto mb-1.5" />
                {errInvoiceStats ? (
                  <p className="text-xs text-error flex items-center justify-center gap-1"><AlertCircle className="h-3 w-3" /> Error</p>
                ) : (
                  <p className="text-xl font-bold text-text-primary leading-tight truncate">
                    {loadInvoiceStats ? "..." : <AnimatedCurrency value={invoiceStats?.totalInvoiced ?? 0} />}
                  </p>
                )}
                <p className="text-[10px] text-text-tertiary mt-0.5">Total Billed</p>
              </CardContent>
            </Card>
          </Link>
        </ThreeDCard>
        <ThreeDCard className="min-w-0">
          <Link href="/dashboard/director/fees" className="block h-full">
            <Card className="h-full relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),_0_6px_12px_rgba(0,0,0,0.05)] hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_0_10px_20px_rgba(34,197,94,0.15)] transition-all duration-300 cursor-pointer group hover:border-green-500/40">
              <CardContent className="p-3 text-center">
                <CircleCheck className="h-4 w-4 text-success mx-auto mb-1.5" />
                {errCollectedByMode ? (
                  <p className="text-xs text-error flex items-center justify-center gap-1"><AlertCircle className="h-3 w-3" /> Error</p>
                ) : loadCollectedByMode ? (
                  <p className="text-xl font-bold text-success leading-tight truncate">...</p>
                ) : (
                  <p className="text-xl font-bold text-success leading-tight truncate">
                    <AnimatedCurrency value={collectedByMode?.total ?? 0} />
                  </p>
                )}
                <p className="text-[10px] text-text-tertiary mt-0.5">Collected</p>
                {!errCollectedByMode && (
                  <div className="flex justify-center gap-2 mt-1.5">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <Wifi className="h-2.5 w-2.5 text-blue-500" />
                        <p className="text-[10px] font-semibold text-blue-600">{loadCollectedByMode ? "..." : <AnimatedCurrency value={collectedByMode?.razorpay ?? 0} />}</p>
                      </div>
                      <p className="text-[8px] text-text-tertiary uppercase">Razorpay</p>
                    </div>
                    <div className="w-px bg-border-light" />
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <Banknote className="h-2.5 w-2.5 text-green-500" />
                        <p className="text-[10px] font-semibold text-green-600">{loadCollectedByMode ? "..." : <AnimatedCurrency value={collectedByMode?.offline ?? 0} />}</p>
                      </div>
                      <p className="text-[8px] text-text-tertiary uppercase">Offline</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        </ThreeDCard>
        <ThreeDCard className="min-w-0">
          <Link href="/dashboard/director/fees" className="block h-full">
            <Card className="h-full relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),_0_6px_12px_rgba(0,0,0,0.05)] hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_0_10px_20px_rgba(239,68,68,0.15)] transition-all duration-300 cursor-pointer group hover:border-red-500/40">
              <CardContent className="p-3 text-center">
                <Clock className="h-4 w-4 text-error mx-auto mb-1.5" />
                {errInvoiceStats ? (
                  <p className="text-xs text-error flex items-center justify-center gap-1"><AlertCircle className="h-3 w-3" /> Error</p>
                ) : (
                  <p className="text-xl font-bold text-error leading-tight truncate">
                    {loadInvoiceStats || loadForfeitedFees ? "..." : <AnimatedCurrency value={(invoiceStats?.totalOutstanding ?? 0) - (forfeitedFees ?? 0)} />}
                  </p>
                )}
                <p className="text-[10px] text-text-tertiary mt-0.5">Pending Fees</p>
              </CardContent>
            </Card>
          </Link>
        </ThreeDCard>
        <ThreeDCard className="min-w-0">
          <Link href="/dashboard/director/dues" className="block h-full">
            <Card className="h-full relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),_0_6px_12px_rgba(0,0,0,0.05)] hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_0_10px_20px_rgba(249,115,22,0.15)] transition-all duration-300 cursor-pointer group hover:border-orange-500/40">
              <CardContent className="p-3 text-center">
                <CalendarClock className="h-4 w-4 text-orange-500 mx-auto mb-1.5" />
                {errDuesToday ? (
                  <p className="text-xs text-error flex items-center justify-center gap-1"><AlertCircle className="h-3 w-3" /> Error</p>
                ) : (
                  <p className="text-xl font-bold text-orange-600 leading-tight truncate">
                    {loadDuesToday ? "..." : <AnimatedCurrency value={duesToday?.total_dues ?? 0} />}
                  </p>
                )}
                <p className="text-[10px] text-text-tertiary mt-0.5">Dues Till Today</p>
                {!errDuesToday && (
                  <p className="text-[9px] text-text-tertiary">{loadDuesToday ? "..." : `${duesToday?.student_count ?? 0} students`}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        </ThreeDCard>
        <ThreeDCard className="min-w-0">
          <Link href="/dashboard/director/fees/forfeited" className="block h-full">
            <Card className="h-full relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),_0_6px_12px_rgba(0,0,0,0.05)] hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_0_10px_20px_rgba(245,158,11,0.15)] transition-all duration-300 cursor-pointer group hover:border-amber-500/40">
              <CardContent className="p-3 text-center">
                <TriangleAlert className="h-4 w-4 text-amber-500 mx-auto mb-1.5" />
                {errForfeitedFees ? (
                  <p className="text-xs text-error flex items-center justify-center gap-1"><AlertCircle className="h-3 w-3" /> Error</p>
                ) : (
                  <p className="text-xl font-bold text-amber-600 leading-tight truncate">
                    {loadForfeitedFees ? "..." : <AnimatedCurrency value={forfeitedFees ?? 0} />}
                  </p>
                )}
                <p className="text-[10px] text-text-tertiary mt-0.5">Forfeited Fees</p>
                <p className="text-[9px] text-text-tertiary">Discontinued</p>
              </CardContent>
            </Card>
          </Link>
        </ThreeDCard>
        <ThreeDCard className="min-w-0">
          <Link href="/dashboard/director/accounts/budget" className="block h-full">
            <Card className="h-full relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),_0_6px_12px_rgba(0,0,0,0.05)] hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_0_10px_20px_rgba(20,184,166,0.15)] transition-all duration-300 cursor-pointer group hover:border-teal-500/40">
              <CardContent className="p-3 text-center">
                <Target className="h-4 w-4 text-teal-500 mx-auto mb-1.5" />
                {errBudgetData ? (
                  <p className="text-xs text-error flex items-center justify-center gap-1"><AlertCircle className="h-3 w-3" /> Error</p>
                ) : (
                  <>
                    <p className="text-lg font-bold text-teal-600 leading-tight truncate">
                      {loadBudgetData ? "..." : formatBudgetSummaryAmount(budgetData?.totals.actual ?? 0)}
                    </p>
                    <p className="text-[10px] text-text-tertiary mt-0.5">Budget Actual</p>
                    <div className="mt-1.5 pt-1.5 border-t border-border-light">
                      <p className="text-[10px] font-semibold text-text-primary truncate">
                        {loadBudgetData ? "..." : formatBudgetSummaryAmount(budgetData?.totals.budget ?? 0)}
                      </p>
                      <p className="text-[8px] text-text-tertiary uppercase">Budget</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>
        </ThreeDCard>
      </motion.div>

      {/* Academic Analytics Cards */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary leading-tight">Academic Analytics</h2>
            <p className="text-xs text-text-tertiary">Cross-branch academic overview</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { title: "Overview", desc: "Full academics drill-down", icon: BarChart3, href: "/dashboard/director/academics", color: "bg-primary/10 text-primary" },
            { title: "Attendance", desc: "Cross-branch attendance", icon: ClipboardCheck, href: "/dashboard/director/academics/attendance", color: "bg-success/10 text-success" },
            { title: "Exams", desc: "Exam performance", icon: Trophy, href: "/dashboard/director/academics/exams", color: "bg-warning/10 text-warning" },
            { title: "Schedule", desc: "Classes & completion", icon: Calendar, href: "/dashboard/director/academics/course-schedule", color: "bg-info/10 text-info" },
            { title: "Instructors", desc: "Teacher performance", icon: UserCheck, href: "/dashboard/director/academics/instructors", color: "bg-purple-100 text-purple-700" },
            { title: "Topic Coverage", desc: "Curriculum progress", icon: BookOpen, href: "/dashboard/director/academics/topic-coverage", color: "bg-orange-100 text-orange-700" },
          ].map((card) => (
            <Link key={card.title} href={card.href}>
              <motion.div
                style={{ perspective: "600px" }}
                whileHover={{ y: -5, rotateX: -5, rotateY: 4, scale: 1.03, transition: { duration: 0.18, ease: "easeOut" } }}
                whileTap={{ scale: 0.97 }}
                className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-[16px] border border-slate-200 dark:border-slate-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),_0_4px_10px_rgba(0,0,0,0.04)] p-4 hover:border-[#7E57C2]/40 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_0_8px_16px_rgba(103,58,183,0.12)] transition-all duration-300 group cursor-pointer h-full relative overflow-hidden"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] ${card.color}`}>
                  <card.icon className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-primary group-hover:text-primary/80 transition-colors">{card.title}</p>
                <p className="text-[11px] text-text-tertiary mt-0.5">{card.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Mentorship & Operations Cards */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary leading-tight">Mentorship & Operations</h2>
            <p className="text-xs text-text-tertiary">Student follow-ups and mentor load</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { title: "Mentor Summary", desc: "Cross-branch mentor load", icon: Users, href: "/dashboard/director/mentor-summary", color: "bg-teal-100 text-teal-700" },
            { title: "Feedback Logs", desc: "Student follow-up notes", icon: ClipboardCheck, href: "/dashboard/director/mentor-feedback", color: "bg-cyan-100 text-cyan-700" },
          ].map((card) => (
            <Link key={card.title} href={card.href}>
              <motion.div
                style={{ perspective: "600px" }}
                whileHover={{ y: -5, rotateX: -5, rotateY: 4, scale: 1.03, transition: { duration: 0.18, ease: "easeOut" } }}
                whileTap={{ scale: 0.97 }}
                className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-[16px] border border-slate-200 dark:border-slate-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),_0_4px_10px_rgba(0,0,0,0.04)] p-4 hover:border-[#7E57C2]/40 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_0_8px_16px_rgba(103,58,183,0.12)] transition-all duration-300 group cursor-pointer h-full relative overflow-hidden"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] ${card.color}`}>
                  <card.icon className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-primary group-hover:text-primary/80 transition-colors">{card.title}</p>
                <p className="text-[11px] text-text-tertiary mt-0.5">{card.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Branches Grid */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary leading-tight">All Branches</h2>
              <p className="text-xs text-text-tertiary">Tap a branch to view details</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-medium">
            {totalBranches} branches
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="border-border-light overflow-hidden">
                <div className="h-1 bg-border-light" />
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-border-light animate-pulse" />
                    <div className="space-y-2">
                      <div className="w-24 h-4 bg-border-light rounded animate-pulse" />
                      <div className="w-14 h-3 bg-border-light rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="w-full h-3 bg-border-light rounded animate-pulse" />
                    <div className="w-full h-3 bg-border-light rounded animate-pulse" />
                    <div className="w-full h-3 bg-border-light rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <AlertCircle className="h-8 w-8 text-error" />
            <p className="text-sm text-error">Failed to load branches</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {activeBranches.map((branch, idx) => (
              <BranchCard key={branch.name} branch={branch} index={idx} />
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
