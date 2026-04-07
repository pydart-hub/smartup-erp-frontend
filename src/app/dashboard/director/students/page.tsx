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
} from "@/lib/api/director";
import { AnimatedNumber } from "@/components/dashboard/AnimatedValue";

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

  const { data: typeCounts, isLoading: loadingTypes } = useQuery({
    queryKey: ["director-branch-type-counts", branch.name],
    queryFn: () => getStudentCountByTypeForBranch(branch.name),
    staleTime: 120_000,
  });

  const shortName = branch.name.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const hasPlan = !loadingPlans && planCounts && (planCounts.advanced + planCounts.intermediate + planCounts.basic > 0);
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
        <Card className="h-full cursor-pointer border-border-light hover:border-primary/20 hover:shadow-lg transition-all duration-200 group">
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex items-start justify-between p-4 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                  <Building2 className="h-[18px] w-[18px] text-primary" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-text-primary leading-tight">{shortName}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5 font-medium tracking-wide">{branch.abbr}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all mt-0.5" />
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
              <div className="mx-4 mb-3 grid grid-cols-3 gap-1.5">
                <div className="rounded-[6px] bg-purple-50 py-1.5 text-center">
                  <p className="text-sm font-bold text-purple-700 tabular-nums leading-none">{planCounts.advanced}</p>
                  <p className="text-[9px] text-purple-400 font-medium mt-1 uppercase tracking-wider">Advanced</p>
                </div>
                <div className="rounded-[6px] bg-blue-50 py-1.5 text-center">
                  <p className="text-sm font-bold text-blue-700 tabular-nums leading-none">{planCounts.intermediate}</p>
                  <p className="text-[9px] text-blue-400 font-medium mt-1 uppercase tracking-wider">Intermediate</p>
                </div>
                <div className="rounded-[6px] bg-emerald-50 py-1.5 text-center">
                  <p className="text-sm font-bold text-emerald-700 tabular-nums leading-none">{planCounts.basic}</p>
                  <p className="text-[9px] text-emerald-400 font-medium mt-1 uppercase tracking-wider">Basic</p>
                </div>
              </div>
            ) : loadingPlans ? (
              <div className="mx-4 mb-3 grid grid-cols-3 gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[42px] rounded-[6px] bg-border-light/40 animate-pulse" />
                ))}
              </div>
            ) : null}

            {/* Student type distribution */}
            {hasType ? (
              <div className="mx-4 mb-3 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {typeCounts.fresher} Fresher
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {typeCounts.existing} Existing
                </span>
                {typeCounts.rejoining > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {typeCounts.rejoining} Rejoining
                  </span>
                )}
              </div>
            ) : loadingTypes ? (
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

  const [search, setSearch] = useState("");

  const activeBranches = (branches ?? []).filter((b) => b.name !== "Smart Up");
  const filtered = search
    ? activeBranches.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    : activeBranches;

  const totalAll = (totalActive ?? 0) + (totalDiscontinued ?? 0);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Page header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Students</h1>
          <p className="text-sm text-text-secondary mt-0.5">Overview across all branches</p>
        </div>
        <Link href="/dashboard/director/students/all">
          <Button variant="primary" size="md" className="gap-2">
            <Users className="h-4 w-4" />
            All Students
            {totalActive !== undefined && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-xs font-semibold">{totalAll}</span>
            )}
          </Button>
        </Link>
      </motion.div>

      {/* Summary strip */}
      <motion.div variants={itemVariants}>
        <Card className="border-border-light">
          <CardContent className="py-3 px-5">
            <div className="flex items-center gap-5 flex-wrap">
              {/* Total */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold text-text-primary tabular-nums leading-none">
                    {loadTotalActive ? "..." : <AnimatedNumber value={totalAll} />}
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">Total Students</p>
                </div>
              </div>

              <div className="w-px h-8 bg-border-light" />

              {/* Active */}
              <div>
                <p className="text-base font-bold text-success tabular-nums leading-none">
                  {loadTotalActive ? "..." : <AnimatedNumber value={totalActive ?? 0} />}
                </p>
                <p className="text-[10px] text-text-tertiary mt-0.5">Active</p>
              </div>

              {(totalDiscontinued ?? 0) > 0 && (
                <>
                  <div className="w-px h-8 bg-border-light" />
                  <div>
                    <p className="text-base font-bold text-error/80 tabular-nums leading-none">
                      {loadTotalDiscontinued ? "..." : <AnimatedNumber value={totalDiscontinued ?? 0} />}
                    </p>
                    <p className="text-[10px] text-text-tertiary mt-0.5">Discontinued</p>
                  </div>
                </>
              )}

              {/* Global plan pills — pushed right */}
              <div className="flex items-center gap-2 sm:ml-auto">
                {loadGlobalPlans ? (
                  <span className="inline-block w-40 h-6 bg-border-light rounded animate-pulse" />
                ) : globalPlanCounts && (
                  <>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 text-[11px] font-semibold text-purple-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      {globalPlanCounts.advanced} Adv
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-[11px] font-semibold text-blue-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {globalPlanCounts.intermediate} Int
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-[11px] font-semibold text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {globalPlanCounts.basic} Basic
                    </span>
                  </>
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
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="text-xs font-medium shrink-0">
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
