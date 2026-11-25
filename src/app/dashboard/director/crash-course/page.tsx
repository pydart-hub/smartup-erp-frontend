"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Zap,
  Search,
  Building2,
  AlertCircle,
  ChevronRight,
  Users,
  Sparkles,
  IndianRupee,
  Layers,
  TrendingUp,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AnimatedNumber } from "@/components/dashboard/AnimatedValue";
import type {
  CrashCourseDashboardStats,
  CrashCourseBranchCardData,
} from "@/lib/types/crashCourse";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

function formatRupee(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

// ── Branch Card Component ──
function CrashCourseBranchCard({
  branch,
}: {
  branch: CrashCourseBranchCardData;
}) {
  const targetPct =
    branch.targetStudents > 0
      ? Math.min(100, Math.round((branch.activeStudents / branch.targetStudents) * 100))
      : 0;

  const targetColor =
    targetPct >= 75
      ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-300"
      : targetPct >= 40
      ? "bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-300"
      : "bg-purple-500/10 text-purple-600 ring-purple-500/30 dark:text-purple-300";

  return (
    <Link
      href={`/dashboard/director/crash-course/${encodeURIComponent(branch.shortName)}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card className="h-full cursor-pointer border-border-light dark:border-cyan-500/20 hover:border-primary/30 dark:hover:border-cyan-400/45 hover:shadow-lg dark:hover:shadow-[0_18px_40px_-22px_rgba(45,212,191,0.65)] transition-all duration-200 group bg-surface dark:bg-gradient-to-br dark:from-slate-900/95 dark:via-slate-900/90 dark:to-cyan-950/40 backdrop-blur-sm">
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex items-start justify-between p-4 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 dark:bg-amber-400/12 ring-1 ring-transparent dark:ring-amber-300/20 flex items-center justify-center shrink-0">
                  <Building2 className="h-[18px] w-[18px] text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-text-primary leading-tight">
                    {branch.shortName}
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5 font-medium tracking-wide">
                    {branch.abbr} • Target {branch.targetStudents}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <ChevronRight className="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${targetColor}`}
                >
                  <span className="opacity-60 font-normal">Target</span>
                  {targetPct}%
                </span>
              </div>
            </div>

            {/* Active Count */}
            <div className="px-4 pb-3 flex items-end justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[28px] font-bold text-text-primary leading-none tabular-nums">
                  <AnimatedNumber value={branch.activeStudents} />
                </span>
                <span className="text-xs text-text-tertiary font-medium">active</span>
              </div>

              {/* Billed info */}
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider">
                  Billed
                </p>
                <p className="text-xs font-semibold text-text-primary tabular-nums">
                  {formatRupee(branch.totalBilled)}
                </p>
              </div>
            </div>

            {/* Financial Strip: Collected vs Due */}
            <div className="mx-4 mb-3 grid grid-cols-2 gap-1.5">
              <div className="rounded-[6px] bg-emerald-50/80 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-300/20 py-1.5 px-2.5 text-center">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 tabular-nums leading-none">
                  {formatRupee(branch.totalCollected)}
                </p>
                <p className="text-[9px] text-emerald-600/80 dark:text-emerald-300/70 font-medium mt-1 uppercase tracking-wider">
                  Collected
                </p>
              </div>
              <div className="rounded-[6px] bg-amber-50/80 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-300/20 py-1.5 px-2.5 text-center">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300 tabular-nums leading-none">
                  {formatRupee(branch.totalDue)}
                </p>
                <p className="text-[9px] text-amber-600/80 dark:text-amber-300/70 font-medium mt-1 uppercase tracking-wider">
                  Due / Pending
                </p>
              </div>
            </div>

            {/* Class distribution pills */}
            <div className="mx-4 mb-3 flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 dark:text-sky-200 bg-blue-50 dark:bg-sky-400/12 rounded-full px-2 py-0.5">
                <span className="w-1 h-1 rounded-full bg-blue-500" />
                {branch.classCounts["10th"] || 0} in 10th
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 dark:text-fuchsia-200 bg-purple-50 dark:bg-purple-400/12 rounded-full px-2 py-0.5">
                <span className="w-1 h-1 rounded-full bg-purple-500" />
                {branch.classCounts["9th"] || 0} in 9th
              </span>
              {(branch.classCounts["Plus One"] || 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-400/12 rounded-full px-2 py-0.5">
                  <span className="w-1 h-1 rounded-full bg-indigo-500" />
                  {branch.classCounts["Plus One"]} in +1
                </span>
              )}
              {(branch.classCounts["Plus Two"] || 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 dark:text-teal-200 bg-teal-50 dark:bg-teal-400/12 rounded-full px-2 py-0.5">
                  <span className="w-1 h-1 rounded-full bg-teal-500" />
                  {branch.classCounts["Plus Two"]} in +2
                </span>
              )}
            </div>

            {/* Batches & Capacity Gauges */}
            {branch.batches && branch.batches.length > 0 && (
              <div className="px-4 py-2.5 border-t border-border-light/60 dark:border-cyan-900/40 bg-surface/50 dark:bg-slate-900/40 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                  Active Batches ({branch.batches.length})
                </p>
                {branch.batches.map((b) => {
                  const capPct = Math.min(
                    100,
                    Math.round((b.enrolled_count / b.max_capacity) * 100)
                  );
                  return (
                    <div key={b.name} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-medium text-text-secondary truncate max-w-[170px]">
                          {b.name}
                        </span>
                        <span className="font-semibold text-text-primary tabular-nums text-[10px]">
                          {b.enrolled_count}/{b.max_capacity}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-border-light/80 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            capPct >= 90
                              ? "bg-red-500"
                              : capPct >= 70
                              ? "bg-amber-500"
                              : "bg-primary"
                          }`}
                          style={{ width: `${Math.max(5, capPct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}

// ── Director Crash Course Page ──
export default function DirectorCrashCoursePage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery<{
    success: boolean;
    data: CrashCourseDashboardStats;
  }>({
    queryKey: ["director-crash-course-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/crash-course/dashboard");
      if (!res.ok) throw new Error("Failed to load Crash Course dashboard");
      return res.json();
    },
    staleTime: 60_000,
  });

  const stats = data?.data;
  const branches = stats?.branches || [];

  const filteredBranches = search
    ? branches.filter(
        (b) =>
          b.shortName.toLowerCase().includes(search.toLowerCase()) ||
          b.branchName.toLowerCase().includes(search.toLowerCase()) ||
          b.abbr.toLowerCase().includes(search.toLowerCase())
      )
    : branches;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative isolate space-y-6"
    >
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-20 -right-16 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl dark:bg-amber-400/5" />
      <div className="pointer-events-none absolute top-44 -left-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl dark:bg-cyan-400/10" />

      <BreadcrumbNav />

      {/* Page Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 dark:border-amber-400/25 bg-amber-50/80 dark:bg-slate-900/70 px-3 py-1 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-amber-800 dark:text-amber-300">
              DIRECTOR VIEW
            </span>
          </div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight flex items-center gap-2">
            <span>⚡ Crash Course 2026–27</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <Link href="/dashboard/director/students">
            <Button variant="outline" size="md" className="gap-2">
              <Users className="h-4 w-4" />
              Regular Students
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Top Summary Header Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Card 1: Total Enrolled */}
        <Card className="lg:col-span-3 border-border-light dark:border-cyan-500/20 bg-surface dark:bg-gradient-to-br dark:from-slate-900/95 dark:via-slate-900/90 dark:to-cyan-950/35 overflow-hidden shadow-sm flex flex-col">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <p className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary mb-2">
              Enrollment
            </p>
            <div className="flex items-center gap-3.5 my-auto py-1">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 dark:bg-amber-400/12 ring-1 ring-transparent dark:ring-amber-300/25 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-text-primary tabular-nums leading-none">
                  {isLoading ? (
                    <span className="inline-block w-8 h-7 bg-border-light rounded animate-pulse" />
                  ) : (
                    <AnimatedNumber value={stats?.totalStudents ?? 0} />
                  )}
                </p>
                <p className="text-[10px] text-text-tertiary mt-1 font-medium">
                  Total Enrolled
                </p>
              </div>
              {(stats?.discontinuedStudents ?? 0) > 0 && (
                <>
                  <div className="w-px bg-border-light self-stretch" />
                  <div>
                    <p className="text-2xl font-black text-error/80 tabular-nums">
                      <AnimatedNumber value={stats?.discontinuedStudents ?? 0} />
                    </p>
                    <p className="text-[10px] text-text-tertiary mt-1 font-medium">
                      Discontinued
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Financial Performance */}
        <Card className="lg:col-span-5 border-border-light dark:border-cyan-500/20 bg-surface dark:bg-gradient-to-br dark:from-slate-900/95 dark:via-slate-900/90 dark:to-cyan-950/35 overflow-hidden shadow-sm flex flex-col">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <p className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary mb-2">
              Financial Performance
            </p>
            {isLoading ? (
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-10 flex-1 rounded-lg bg-border-light/40 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 my-auto">
                <div className="rounded-lg bg-surface border border-border-light dark:bg-slate-800/40 dark:border-slate-700/50 py-2.5 px-2 text-center">
                  <p className="text-sm font-black text-text-primary tabular-nums leading-none">
                    {formatRupee(stats?.totalInvoiced ?? 0)}
                  </p>
                  <p className="text-[9px] text-text-tertiary font-semibold mt-1 uppercase tracking-wider">
                    Billed
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 dark:bg-emerald-500/12 dark:border-emerald-300/20 py-2.5 px-2 text-center">
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 tabular-nums leading-none">
                    {formatRupee(stats?.totalCollected ?? 0)}
                  </p>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-300/70 font-semibold mt-1 uppercase tracking-wider">
                    Collected
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-100 dark:bg-amber-500/12 dark:border-amber-300/20 py-2.5 px-2 text-center">
                  <p className="text-sm font-black text-amber-700 dark:text-amber-300 tabular-nums leading-none">
                    {formatRupee(stats?.totalDue ?? 0)}
                  </p>
                  <p className="text-[9px] text-amber-600 dark:text-amber-300/70 font-semibold mt-1 uppercase tracking-wider">
                    Pending / Due
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Class & Add-on Distribution */}
        <Card className="lg:col-span-4 border-border-light dark:border-cyan-500/20 bg-surface dark:bg-gradient-to-br dark:from-slate-900/95 dark:via-slate-900/90 dark:to-cyan-950/35 overflow-hidden shadow-sm flex flex-col">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <p className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary mb-2">
              By Class & Sunday Add-ons
            </p>
            {isLoading ? (
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 flex-1 rounded-lg bg-border-light/40 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-1.5 my-auto">
                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-lg bg-blue-50 border border-blue-100 dark:bg-sky-500/12 dark:border-sky-300/20 py-2 px-1 text-center">
                    <p className="text-base font-black text-blue-700 dark:text-sky-200 tabular-nums leading-none">
                      <AnimatedNumber value={stats?.classCounts["10th"] ?? 0} />
                    </p>
                    <p className="text-[9px] text-blue-500 dark:text-sky-300/70 font-semibold mt-1 uppercase tracking-wider">
                      10th
                    </p>
                  </div>
                  <div className="rounded-lg bg-purple-50 border border-purple-100 dark:bg-purple-500/12 dark:border-purple-300/20 py-2 px-1 text-center">
                    <p className="text-base font-black text-purple-700 dark:text-purple-200 tabular-nums leading-none">
                      <AnimatedNumber value={stats?.classCounts["9th"] ?? 0} />
                    </p>
                    <p className="text-[9px] text-purple-500 dark:text-purple-300/70 font-semibold mt-1 uppercase tracking-wider">
                      9th
                    </p>
                  </div>
                  <div className="rounded-lg bg-indigo-50 border border-indigo-100 dark:bg-indigo-500/12 dark:border-indigo-300/20 py-2 px-1 text-center">
                    <p className="text-base font-black text-indigo-700 dark:text-indigo-200 tabular-nums leading-none">
                      <AnimatedNumber value={stats?.classCounts["Plus One"] ?? 0} />
                    </p>
                    <p className="text-[9px] text-indigo-500 dark:text-indigo-300/70 font-semibold mt-1 uppercase tracking-wider">
                      +1
                    </p>
                  </div>
                  <div className="rounded-lg bg-teal-50 border border-teal-100 dark:bg-teal-500/12 dark:border-teal-300/20 py-2 px-1 text-center">
                    <p className="text-base font-black text-teal-700 dark:text-teal-200 tabular-nums leading-none">
                      <AnimatedNumber value={stats?.classCounts["Plus Two"] ?? 0} />
                    </p>
                    <p className="text-[9px] text-teal-500 dark:text-teal-300/70 font-semibold mt-1 uppercase tracking-wider">
                      +2
                    </p>
                  </div>
                </div>

                {(stats?.sundayLanguagesCount ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-fuchsia-700 dark:text-fuchsia-200 bg-fuchsia-50 dark:bg-fuchsia-400/12 rounded-full px-2 py-0.5">
                      <span className="w-1 h-1 rounded-full bg-fuchsia-500" />
                      <AnimatedNumber value={stats?.sundayLanguagesCount ?? 0} /> Sunday Language Add-ons
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Search Bar & Branch Count */}
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
        <Badge
          variant="outline"
          className="text-xs font-medium shrink-0 bg-surface/80 dark:bg-slate-900/70 dark:border-cyan-500/25"
        >
          {filteredBranches.length} participating branches
        </Badge>
      </motion.div>

      {/* Branch Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-56 rounded-xl border border-border-light animate-pulse bg-surface"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load Crash Course data</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBranches.map((branch) => (
            <CrashCourseBranchCard key={branch.branchName} branch={branch} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
