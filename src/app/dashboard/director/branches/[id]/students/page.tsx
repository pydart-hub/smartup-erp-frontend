"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  School,
  Users,
  GraduationCap,
  ChevronRight,
  Loader2,
  List,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getBranchBatches, getStudentCountForBranch, getActiveStudentCountForBranch, getDiscontinuedStudentCountForBranch, getProgramBatchesStudentStats, getStudentCountByPlanForBranch, getPlanCountsForBatches } from "@/lib/api/director";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

function ProgramStudentCount({ batchNames, branchName }: { batchNames: string[]; branchName: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["director-program-student-stats", ...batchNames.slice().sort()],
    queryFn: () => getProgramBatchesStudentStats(batchNames, branchName),
    staleTime: 120_000,
  });
  const { data: planCounts, isLoading: loadingPlans } = useQuery({
    queryKey: ["director-program-plan-counts", branchName, ...batchNames.slice().sort()],
    queryFn: () => getPlanCountsForBatches(batchNames, branchName),
    staleTime: 120_000,
  });
  const total = (data?.active ?? 0) + (data?.inactive ?? 0);
  const hasPlan = !loadingPlans && planCounts && (planCounts.advanced + planCounts.intermediate + planCounts.basic + planCounts.freeAccess > 0);
  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-xs text-text-tertiary">
        {isLoading ? "..." : `${total} student${total !== 1 ? "s" : ""}`}
      </p>
      {hasPlan && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-400/25">
            <span className="w-1 h-1 rounded-full bg-purple-500" />{planCounts.advanced} Adv
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-400/25">
            <span className="w-1 h-1 rounded-full bg-sky-500" />{planCounts.intermediate} Int
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/25">
            <span className="w-1 h-1 rounded-full bg-emerald-500" />{planCounts.basic} Basic
          </span>
          {planCounts.freeAccess > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-400/25">
              <span className="w-1 h-1 rounded-full bg-amber-500" />{planCounts.freeAccess} Free
            </span>
          )}
          {planCounts.demo > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:border-fuchsia-400/25">
              <span className="w-1 h-1 rounded-full bg-fuchsia-500" />{planCounts.demo} Demo
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function BranchStudentsPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.id as string);
  const shortName = branchName.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const encodedBranch = encodeURIComponent(branchName);

  const { data: totalCount } = useQuery({
    queryKey: ["director-branch-student-count", branchName],
    queryFn: () => getStudentCountForBranch(branchName),
    staleTime: 120_000,
  });

  const { data: activeCount } = useQuery({
    queryKey: ["director-branch-active-students", branchName],
    queryFn: () => getActiveStudentCountForBranch(branchName),
    staleTime: 120_000,
  });

  const { data: discontinuedCount } = useQuery({
    queryKey: ["director-branch-discontinued-students", branchName],
    queryFn: () => getDiscontinuedStudentCountForBranch(branchName),
    staleTime: 120_000,
  });

  const { data: planCounts } = useQuery({
    queryKey: ["director-branch-plan-counts", branchName],
    queryFn: () => getStudentCountByPlanForBranch(branchName),
    staleTime: 120_000,
  });

  const oneToOneCount = Math.max(
    0,
    (activeCount ?? 0) - (
      (planCounts?.advanced ?? 0) +
      (planCounts?.intermediate ?? 0) +
      (planCounts?.basic ?? 0) +
      (planCounts?.freeAccess ?? 0) +
      (planCounts?.demo ?? 0)
    )
  );

  const {
    data: batchesRes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["director-branch-batches-list", branchName],
    queryFn: () => getBranchBatches(branchName),
    staleTime: 120_000,
    retry: false,
  });

  const batches = batchesRes?.data ?? [];
  const hasBatchPermissionError = Boolean(batchesRes?.permissionDenied);
  const activeBatches = batches.filter((b) => !b.disabled);

  // Group by program to get class-wise breakdown
  const programMap = activeBatches.reduce(
    (acc, b) => {
      const key = b.program || "Uncategorised";
      if (!acc[key]) acc[key] = [];
      acc[key].push(b);
      return acc;
    },
    {} as Record<string, typeof activeBatches>
  );

  const programs = Object.entries(programMap).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Back */}
      <motion.div variants={itemVariants}>
        <Link
          href={`/dashboard/director/branches/${encodedBranch}`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {shortName}
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Students — {shortName}
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {totalCount !== undefined
                ? `${totalCount} total students across ${programs.length} programs`
                : "Loading..."}
            </p>
          </div>
          <Link href={`/dashboard/director/branches/${encodedBranch}/students/all`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <List className="h-3.5 w-3.5" />
              View All Students
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Summary Cards — 3 equal columns */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
        {/* Card 1: Total Students */}
        <Card className="border-border-light">
          <CardContent className="p-5 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-text-primary tabular-nums">{totalCount ?? "..."}</p>
            <p className="text-xs text-text-tertiary mt-1">Total Students</p>
            <div className="flex justify-center gap-4 mt-3 pt-3 border-t border-border-light w-full">
              <div className="text-center">
                <p className="text-sm font-semibold text-success">{activeCount ?? "..."}</p>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Active</p>
              </div>
              <div className="w-px bg-border-light" />
              <div className="text-center">
                <p className="text-sm font-semibold text-error">{discontinuedCount ?? "..."}</p>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Disc.</p>
              </div>
            </div>
            {planCounts && (planCounts.advanced + planCounts.intermediate + planCounts.basic + planCounts.freeAccess + (planCounts.demo ?? 0) + oneToOneCount > 0) && (
              <div className="flex flex-wrap justify-center gap-1.5 mt-3 pt-3 border-t border-border-light w-full">
                {planCounts.advanced > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-400/25">
                    <span className="w-1 h-1 rounded-full bg-purple-500" />{planCounts.advanced} Adv
                  </span>
                )}
                {planCounts.intermediate > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-400/25">
                    <span className="w-1 h-1 rounded-full bg-sky-500" />{planCounts.intermediate} Int
                  </span>
                )}
                {planCounts.basic > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/25">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />{planCounts.basic} Basic
                  </span>
                )}
                {(planCounts.freeAccess ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-400/25">
                    <span className="w-1 h-1 rounded-full bg-amber-500" />{planCounts.freeAccess} Free
                  </span>
                )}
                {(planCounts.demo ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:border-fuchsia-400/25">
                    <span className="w-1 h-1 rounded-full bg-fuchsia-500" />{planCounts.demo} Demo
                  </span>
                )}
                {oneToOneCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-400/25">
                    <span className="w-1 h-1 rounded-full bg-cyan-500" />{oneToOneCount} 1:1
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Programs / Classes */}
        <Card className="border-border-light">
          <CardContent className="p-5 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center mb-3">
              <School className="h-5 w-5 text-secondary" />
            </div>
            <p className="text-3xl font-bold text-text-primary tabular-nums">{isLoading ? "..." : programs.length}</p>
            <p className="text-xs text-text-tertiary mt-1">Programs / Classes</p>
            <div className="mt-3 pt-3 border-t border-border-light w-full">
              <p className="text-[10px] text-text-tertiary">Select a class below</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Active Batches */}
        <Card className="border-border-light">
          <CardContent className="p-5 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center mb-3">
              <Users className="h-5 w-5 text-info" />
            </div>
            <p className="text-3xl font-bold text-text-primary tabular-nums">{isLoading ? "..." : activeBatches.length}</p>
            <p className="text-xs text-text-tertiary mt-1">Active Batches</p>
            <div className="mt-3 pt-3 border-t border-border-light w-full">
              <p className="text-[10px] text-text-tertiary">
                {isLoading ? "..." : batches.length - activeBatches.length > 0 ? `${batches.length - activeBatches.length} inactive` : "All active"}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Programs / Classes Grid */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-text-primary mb-3">
          Select a Program / Class
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
          </div>
        ) : programs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-1.5">
            <p className="text-sm text-text-tertiary">
              {hasBatchPermissionError
                ? "Programs and batches are hidden for this role"
                : "No programs found for this branch"}
            </p>
            {hasBatchPermissionError ? (
              <p className="text-xs text-warning text-center max-w-md">
                Student list access is working, but this account does not have permission for Student Group and Program Enrollment.
                Use View All Students, or ask admin to grant read access for those doctypes.
              </p>
            ) : isError && (
              <p className="text-xs text-warning">Data source temporarily unavailable; showing safe empty view.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map(([program, groups]) => (
              <Link
                key={program}
                href={`/dashboard/director/branches/${encodedBranch}/students/${encodeURIComponent(program)}`}
              >
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border-light hover:border-primary/30">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[10px] bg-brand-wash flex items-center justify-center">
                            <School className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-text-primary text-sm">
                              {program}
                            </h3>
                            <p className="text-xs text-text-tertiary">
                              {groups.length} batch{groups.length !== 1 ? "es" : ""}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-text-tertiary" />
                      </div>

                      {/* Batch preview */}
                      <div className="flex flex-wrap gap-1.5">
                        {groups.slice(0, 4).map((g) => (
                          <Badge key={g.name} variant="outline" className="text-[10px] px-2 py-0.5">
                            {g.student_group_name || g.name}
                          </Badge>
                        ))}
                        {groups.length > 4 && (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                            +{groups.length - 4} more
                          </Badge>
                        )}
                      </div>

                      <ProgramStudentCount batchNames={groups.map((g) => g.name)} branchName={branchName} />
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
