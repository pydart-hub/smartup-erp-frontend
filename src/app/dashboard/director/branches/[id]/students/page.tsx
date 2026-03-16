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
  AlertCircle,
  List,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getBranchBatches, getStudentCountForBranch, getActiveStudentCountForBranch, getDiscontinuedStudentCountForBranch, getProgramBatchesStudentStats } from "@/lib/api/director";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

function ProgramStudentCount({ batchNames }: { batchNames: string[] }) {
  const { data, isLoading } = useQuery({
    queryKey: ["director-program-student-stats", ...batchNames.slice().sort()],
    queryFn: () => getProgramBatchesStudentStats(batchNames),
    staleTime: 120_000,
  });
  const total = (data?.active ?? 0) + (data?.inactive ?? 0);
  return (
    <p className="text-xs text-text-tertiary mt-2">
      {isLoading ? "..." : `${total} student${total !== 1 ? "s" : ""}`}
    </p>
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

  const {
    data: batchesRes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["director-branch-batches-list", branchName],
    queryFn: () => getBranchBatches(branchName),
    staleTime: 120_000,
  });

  const batches = batchesRes?.data ?? [];
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

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="border-border-light col-span-2 sm:col-span-1">
          <CardContent className="p-4 text-center">
            <GraduationCap className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">
              {totalCount ?? "..."}
            </p>
            <p className="text-xs text-text-tertiary">Total Students</p>
            <div className="flex justify-center gap-3 mt-2">
              <div className="text-center">
                <p className="text-sm font-semibold text-success">
                  {activeCount ?? "..."}
                </p>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Active</p>
              </div>
              <div className="w-px bg-border-light" />
              <div className="text-center">
                <p className="text-sm font-semibold text-error">
                  {discontinuedCount ?? "..."}
                </p>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Discontinued</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border-light">
          <CardContent className="p-4 text-center">
            <School className="h-5 w-5 text-secondary mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">
              {isLoading ? "..." : programs.length}
            </p>
            <p className="text-xs text-text-tertiary">Programs / Classes</p>
          </CardContent>
        </Card>
        <Card className="border-border-light">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-info mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">
              {isLoading ? "..." : activeBatches.length}
            </p>
            <p className="text-xs text-text-tertiary">Active Batches</p>
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
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <AlertCircle className="h-8 w-8 text-error" />
            <p className="text-sm text-error">Failed to load data</p>
          </div>
        ) : programs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48">
            <p className="text-sm text-text-tertiary">No programs found for this branch</p>
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

                      <ProgramStudentCount batchNames={groups.map((g) => g.name)} />
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
