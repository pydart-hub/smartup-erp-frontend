"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  Search,
  Building2,
  AlertCircle,
  ChevronRight,
  Users,
  Sparkles,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  getAllBranches,
  getActiveStudentCountForBranch,
  getDiscontinuedStudentCountForBranch,
  getActiveStudentCount,
  getDiscontinuedStudentCount,
  getStudentCountByPlan,
  getStudentCountByPlanForBranch,
  getStudentCountByTypeForBranch,
  getStudentCountByType,
  getConvertedDemoStudentCount,
  getConvertedDemoStudentCountForBranch,
} from "@/lib/api/director";
import { AnimatedNumber } from "@/components/dashboard/AnimatedValue";
import { getBranchTarget } from "@/lib/constants/branch-targets";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

// ── Branch Card ──
function BranchCard({ branch }: { branch: { name: string; abbr: string } }) {
  const { data: activeCount, isLoading: loadingActive } = useQuery({
    queryKey: ["director-branch-active-students", branch.name],
    queryFn: () => getActiveStudentCountForBranch(branch.name),
    staleTime: 120_000,
  });

  const { data: discontinuedCount } = useQuery({
    queryKey: ["director-branch-discontinued-students", branch.name],
    queryFn: () => getDiscontinuedStudentCountForBranch(branch.name),
    staleTime: 120_000,
  });

  const { data: planCounts, isLoading: loadingPlans } = useQuery({
    queryKey: ["director-branch-plan-counts", branch.name],
    queryFn: () => getStudentCountByPlanForBranch(branch.name),
    staleTime: 120_000,
  });

  const { data: convertedCount } = useQuery({
    queryKey: ["director-branch-converted-demo", branch.name],
    queryFn: () => getConvertedDemoStudentCountForBranch(branch.name),
    staleTime: 120_000,
  });

  const { data: typeCounts, isLoading: loadingTypes } = useQuery({
    queryKey: ["director-branch-type-counts", branch.name],
    queryFn: () => getStudentCountByTypeForBranch(branch.name),
    staleTime: 120_000,
  });

  const shortName = branch.name.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const branchKnownPlanTotal =
    (planCounts?.advanced ?? 0) +
    (planCounts?.intermediate ?? 0) +
    (planCounts?.basic ?? 0) +
    (planCounts?.freeAccess ?? 0) +
    (planCounts?.demo ?? 0);
  const branchNaPlanCount = planCounts
    ? Math.max(0, (activeCount ?? 0) - branchKnownPlanTotal)
    : 0;
  const hasPlan = !loadingPlans && planCounts && (branchKnownPlanTotal + branchNaPlanCount > 0);
  const hasType = !loadingTypes && typeCounts && (typeCounts.fresher + typeCounts.existing + typeCounts.rejoining > 0);

  return (
    <Link href={`/dashboard/director/branches/${encodeURIComponent(branch.name)}/students`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card className="h-full cursor-pointer border-border-light dark:border-cyan-500/20 hover:border-primary/20 dark:hover:border-cyan-400/45 hover:shadow-lg dark:hover:shadow-[0_18px_40px_-22px_rgba(45,212,191,0.65)] transition-all duration-200 group bg-surface dark:bg-gradient-to-br dark:from-slate-900/95 dark:via-slate-900/90 dark:to-cyan-950/40 backdrop-blur-sm">
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex items-start justify-between p-4 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/8 dark:bg-cyan-400/10 ring-1 ring-transparent dark:ring-cyan-300/20 flex items-center justify-center shrink-0">
                  <Building2 className="h-[18px] w-[18px] text-primary" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-text-primary leading-tight">{shortName}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5 font-medium tracking-wide">{branch.abbr}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <ChevronRight className="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
                {/* Target badge */}
                {!loadingActive && activeCount != null && (() => {
                  const TARGET = getBranchTarget(branch.name);
                  const pctVal = Math.min(100, Math.round((activeCount / TARGET) * 100));
                  const color =
                    pctVal >= 75 ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30"
                    : pctVal >= 40 ? "bg-amber-500/10 text-amber-600 ring-amber-500/30"
                    : "bg-red-500/10 text-red-500 ring-red-500/30";
                  return (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 ${color}`}>
                      <span className="opacity-60 font-normal">Target</span>
                      {pctVal}%
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Count + status */}
            <div className="px-4 pb-3 flex items-end justify-between">
              <div className="flex items-baseline gap-1.5">
                {loadingActive ? (
                  <span className="inline-block w-8 h-7 bg-border-light rounded animate-pulse" />
                ) : (
                  <span className="text-[28px] font-bold text-text-primary leading-none tabular-nums">
                    <AnimatedNumber value={activeCount ?? 0} />
                  </span>
                )}
                <span className="text-xs text-text-tertiary font-medium">active</span>
              </div>
              {(discontinuedCount ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error/8 text-[11px] font-medium text-error/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-error/60" />
                  {discontinuedCount} disc.
                </span>
              )}
            </div>

            {/* Plan distribution */}
            {hasPlan ? (
              <>
                <div className="mx-4 mb-2 grid grid-cols-3 gap-1.5">
                <div className="rounded-[6px] bg-purple-50 border border-purple-100 dark:bg-fuchsia-500/12 dark:border-fuchsia-300/20 py-1.5 text-center">
                  <p className="text-sm font-bold text-purple-700 dark:text-fuchsia-200 tabular-nums leading-none">{planCounts.advanced}</p>
                  <p className="text-[9px] text-purple-400 dark:text-fuchsia-300/70 font-medium mt-1 uppercase tracking-wider">Advanced</p>
                </div>
                <div className="rounded-[6px] bg-blue-50 border border-blue-100 dark:bg-sky-500/12 dark:border-sky-300/20 py-1.5 text-center">
                  <p className="text-sm font-bold text-blue-700 dark:text-sky-200 tabular-nums leading-none">{planCounts.intermediate}</p>
                  <p className="text-[9px] text-blue-400 dark:text-sky-300/70 font-medium mt-1 uppercase tracking-wider">Intermediate</p>
                </div>
                <div className="rounded-[6px] bg-emerald-50 border border-emerald-100 dark:bg-emerald-500/12 dark:border-emerald-300/20 py-1.5 text-center">
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-200 tabular-nums leading-none">{planCounts.basic}</p>
                  <p className="text-[9px] text-emerald-400 dark:text-emerald-300/70 font-medium mt-1 uppercase tracking-wider">Basic</p>
                </div>
                </div>
                {((planCounts.freeAccess ?? 0) > 0 || (planCounts.demo ?? 0) > 0 || branchNaPlanCount > 0) && (
                  <div className="mx-4 mb-3 flex items-center gap-1.5 flex-wrap">
                    {(planCounts.freeAccess ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-400/12 rounded-full px-2 py-0.5">
                        <span className="w-1 h-1 rounded-full bg-amber-500" />
                        {planCounts.freeAccess} Free
                      </span>
                    )}
                    {(planCounts.demo ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-fuchsia-700 dark:text-fuchsia-200 bg-fuchsia-50 dark:bg-fuchsia-400/12 rounded-full px-2 py-0.5">
                        <span className="w-1 h-1 rounded-full bg-fuchsia-500" />
                        {planCounts.demo} Demo
                      </span>
                    )}
                    {branchNaPlanCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-700 dark:text-cyan-200 bg-cyan-50 dark:bg-cyan-400/12 rounded-full px-2 py-0.5">
                        <span className="w-1 h-1 rounded-full bg-cyan-500" />
                        {branchNaPlanCount} N/A
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : loadingPlans ? (
              <div className="mx-4 mb-3 grid grid-cols-3 gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[42px] rounded-[6px] bg-border-light/40 animate-pulse" />
                ))}
              </div>
            ) : null}

            {/* Student type — compact inline labels */}
            {hasType ? (() => {
              const entered = typeCounts.fresher + typeCounts.existing + typeCounts.rejoining;
              const notEntered = Math.max(0, (activeCount ?? 0) - entered);
              return (
                <div className="mx-4 mb-3 flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 dark:text-emerald-200 bg-green-50 dark:bg-emerald-400/12 rounded-full px-2 py-0.5">
                    <span className="w-1 h-1 rounded-full bg-green-500" />
                    {typeCounts.fresher} Fresher
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 dark:text-sky-200 bg-blue-50 dark:bg-sky-400/12 rounded-full px-2 py-0.5">
                    <span className="w-1 h-1 rounded-full bg-blue-500" />
                    {typeCounts.existing} Existing
                  </span>
                  {typeCounts.rejoining > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-400/12 rounded-full px-2 py-0.5">
                      <span className="w-1 h-1 rounded-full bg-amber-500" />
                      {typeCounts.rejoining} Rejoin
                    </span>
                  )}
                  {notEntered > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-text-tertiary dark:text-slate-300 bg-border-light/60 dark:bg-slate-400/12 rounded-full px-2 py-0.5">
                      <span className="w-1 h-1 rounded-full bg-text-tertiary/40 dark:bg-slate-300/70" />
                      {notEntered} N/A
                    </span>
                  )}
                </div>
              );
            })() : loadingTypes ? (
              <div className="mx-4 mb-3 h-5 w-2/3 rounded-full bg-border-light/40 animate-pulse" />
            ) : null}
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}

// ── Main Page ──
export default function DirectorStudentsPage() {
  const { data: branches, isLoading, isError } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 300_000,
  });

  const { data: totalActive, isLoading: loadTotalActive } = useQuery({
    queryKey: ["director-total-active-students"],
    queryFn: getActiveStudentCount,
    staleTime: 120_000,
  });

  const { data: totalDiscontinued, isLoading: loadTotalDiscontinued } = useQuery({
    queryKey: ["director-total-discontinued-students"],
    queryFn: getDiscontinuedStudentCount,
    staleTime: 120_000,
  });

  const { data: globalPlanCounts, isLoading: loadGlobalPlans } = useQuery({
    queryKey: ["director-student-plan-counts"],
    queryFn: getStudentCountByPlan,
    staleTime: 120_000,
  });

  const { data: globalConvertedCount } = useQuery({
    queryKey: ["director-converted-demo-count"],
    queryFn: getConvertedDemoStudentCount,
    staleTime: 120_000,
  });

  const { data: globalTypeCounts, isLoading: loadGlobalTypes } = useQuery({
    queryKey: ["director-student-type-counts"],
    queryFn: getStudentCountByType,
    staleTime: 120_000,
  });

  const [search, setSearch] = useState("");

  const activeBranches = (branches ?? []).filter((b) => b.name !== "Smart Up");
  const filtered = search
    ? activeBranches.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    : activeBranches;

  const totalAll = (totalActive ?? 0) + (totalDiscontinued ?? 0);
  const globalNaPlanCount = globalPlanCounts?.na ?? 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative isolate space-y-6"
    >
      <div className="pointer-events-none absolute -top-20 -right-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl dark:bg-cyan-400/10" />
      <div className="pointer-events-none absolute top-44 -left-20 h-80 w-80 rounded-full bg-secondary/10 blur-3xl dark:bg-sky-400/10" />

      <BreadcrumbNav />

      {/* Page header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border-light dark:border-cyan-400/25 bg-surface/80 dark:bg-slate-900/70 px-3 py-1 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-text-secondary dark:text-cyan-200/80">Director View</span>
          </div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Students</h1>
          <p className="text-sm text-text-secondary mt-0.5">Overview across all branches</p>
        </div>
        <Link href="/dashboard/director/students/all">
          <Button variant="primary" size="md" className="gap-2 shadow-md shadow-primary/20 dark:shadow-cyan-400/25">
            <Users className="h-4 w-4" />
            All Students
            {totalActive !== undefined && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-xs font-semibold">{totalAll}</span>
            )}
          </Button>
        </Link>
      </motion.div>

      {/* Summary strip — 3 sections */}
      <motion.div variants={itemVariants}>
        <Card className="border-border-light dark:border-cyan-500/20 bg-surface dark:bg-gradient-to-br dark:from-slate-900/95 dark:via-slate-900/90 dark:to-cyan-950/35 overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border-light dark:divide-cyan-900/50">

              {/* ── Section 1: Total & Active ── */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-cyan-400/12 ring-1 ring-transparent dark:ring-cyan-300/25 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-4 w-4 text-primary" />
                </div>
                <div className="flex gap-5">
                  <div>
                    <p className="text-2xl font-black text-text-primary tabular-nums leading-none">
                      {loadTotalActive ? <span className="inline-block w-10 h-7 bg-border-light rounded animate-pulse" /> : <AnimatedNumber value={totalAll} />}
                    </p>
                    <p className="text-[10px] text-text-tertiary mt-1 font-medium">Total Students</p>
                  </div>
                  <div className="w-px bg-border-light self-stretch" />
                  <div>
                    <p className="text-2xl font-black text-success tabular-nums leading-none">
                      {loadTotalActive ? <span className="inline-block w-8 h-7 bg-border-light rounded animate-pulse" /> : <AnimatedNumber value={totalActive ?? 0} />}
                    </p>
                    <p className="text-[10px] text-text-tertiary mt-1 font-medium">Active</p>
                  </div>
                  {(totalDiscontinued ?? 0) > 0 && (
                    <>
                      <div className="w-px bg-border-light self-stretch" />
                      <div>
                        <p className="text-2xl font-black text-error/80 tabular-nums leading-none">
                          <AnimatedNumber value={totalDiscontinued ?? 0} />
                        </p>
                        <p className="text-[10px] text-text-tertiary mt-1 font-medium">Discontinued</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ── Section 2: Student types ── */}
              <div className="px-5 py-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary mb-2">By Type</p>
                {loadGlobalTypes ? (
                  <div className="flex gap-2">
                    {[0,1,2,3].map((i) => <div key={i} className="h-10 flex-1 rounded-lg bg-border-light/40 animate-pulse" />)}
                  </div>
                ) : globalTypeCounts && (
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="rounded-lg bg-green-50 border border-green-100 dark:bg-emerald-500/12 dark:border-emerald-300/20 py-2 text-center">
                      <p className="text-base font-black text-green-700 dark:text-emerald-200 tabular-nums leading-none"><AnimatedNumber value={globalTypeCounts.fresher} /></p>
                      <p className="text-[9px] text-green-500 dark:text-emerald-300/70 font-semibold mt-1 uppercase tracking-wider">Fresher</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 border border-blue-100 dark:bg-sky-500/12 dark:border-sky-300/20 py-2 text-center">
                      <p className="text-base font-black text-blue-700 dark:text-sky-200 tabular-nums leading-none"><AnimatedNumber value={globalTypeCounts.existing} /></p>
                      <p className="text-[9px] text-blue-400 dark:text-sky-300/70 font-semibold mt-1 uppercase tracking-wider">Existing</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 border border-amber-100 dark:bg-amber-500/12 dark:border-amber-300/20 py-2 text-center">
                      <p className="text-base font-black text-amber-700 dark:text-amber-200 tabular-nums leading-none"><AnimatedNumber value={globalTypeCounts.rejoining} /></p>
                      <p className="text-[9px] text-amber-500 dark:text-amber-300/70 font-semibold mt-1 uppercase tracking-wider">Rejoin</p>
                    </div>
                    <div className="rounded-lg bg-app-bg border border-border-light dark:bg-slate-400/10 dark:border-slate-500/30 py-2 text-center">
                      <p className="text-base font-black text-text-tertiary dark:text-slate-200 tabular-nums leading-none"><AnimatedNumber value={globalTypeCounts.unenrolled} /></p>
                      <p className="text-[9px] text-text-tertiary/60 dark:text-slate-300/70 font-semibold mt-1 uppercase tracking-wider">N/A</p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Section 3: Plans ── */}
              <div className="px-5 py-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary mb-2">By Plan</p>
                {loadGlobalPlans ? (
                  <div className="flex gap-2">
                    {[0,1,2].map((i) => <div key={i} className="h-10 flex-1 rounded-lg bg-border-light/40 animate-pulse" />)}
                  </div>
                ) : globalPlanCounts && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="rounded-lg bg-purple-50 border border-purple-100 dark:bg-fuchsia-500/12 dark:border-fuchsia-300/20 py-2 text-center">
                        <p className="text-base font-black text-purple-700 dark:text-fuchsia-200 tabular-nums leading-none"><AnimatedNumber value={globalPlanCounts.advanced} /></p>
                        <p className="text-[9px] text-purple-400 dark:text-fuchsia-300/70 font-semibold mt-1 uppercase tracking-wider">Advanced</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 border border-blue-100 dark:bg-sky-500/12 dark:border-sky-300/20 py-2 text-center">
                        <p className="text-base font-black text-blue-700 dark:text-sky-200 tabular-nums leading-none"><AnimatedNumber value={globalPlanCounts.intermediate} /></p>
                        <p className="text-[9px] text-blue-400 dark:text-sky-300/70 font-semibold mt-1 uppercase tracking-wider">Inter</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 border border-emerald-100 dark:bg-emerald-500/12 dark:border-emerald-300/20 py-2 text-center">
                        <p className="text-base font-black text-emerald-700 dark:text-emerald-200 tabular-nums leading-none"><AnimatedNumber value={globalPlanCounts.basic} /></p>
                        <p className="text-[9px] text-emerald-500 dark:text-emerald-300/70 font-semibold mt-1 uppercase tracking-wider">Basic</p>
                      </div>
                    </div>
                    {((globalPlanCounts.freeAccess ?? 0) > 0 || (globalPlanCounts.demo ?? 0) > 0 || globalNaPlanCount > 0) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(globalPlanCounts.freeAccess ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-400/12 rounded-full px-2 py-0.5">
                            <span className="w-1 h-1 rounded-full bg-amber-500" />
                            <AnimatedNumber value={globalPlanCounts.freeAccess} /> Free
                          </span>
                        )}
                        {(globalPlanCounts.demo ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-fuchsia-700 dark:text-fuchsia-200 bg-fuchsia-50 dark:bg-fuchsia-400/12 rounded-full px-2 py-0.5">
                            <span className="w-1 h-1 rounded-full bg-fuchsia-500" />
                            <AnimatedNumber value={globalPlanCounts.demo} /> Demo
                          </span>
                        )}
                        {globalNaPlanCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-700 dark:text-cyan-200 bg-cyan-50 dark:bg-cyan-400/12 rounded-full px-2 py-0.5">
                            <span className="w-1 h-1 rounded-full bg-cyan-500" />
                            <AnimatedNumber value={globalNaPlanCount} /> N/A
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search + badge */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search branches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-surface/80 dark:bg-slate-900/70 border-border-light dark:border-cyan-500/25"
          />
        </div>
        <Badge variant="outline" className="text-xs font-medium shrink-0 bg-surface/80 dark:bg-slate-900/70 dark:border-cyan-500/25">
          {filtered.length} branches
        </Badge>
      </motion.div>

      {/* Branch grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 rounded-xl border border-border-light animate-pulse bg-surface" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load branches</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((branch) => (
            <BranchCard key={branch.name} branch={branch} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
