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
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getBranchBatches, getBatchStudents, getPlanCountsForBatches } from "@/lib/api/director";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

// ── Batch card with live student count ──
function BatchCard({
  batch,
  encodedBranch,
  branchName,
}: {
  batch: { name: string; student_group_name: string; academic_year: string; max_strength: number };
  encodedBranch: string;
  branchName: string;
}) {
  const { data: batchRes, isLoading } = useQuery({
    queryKey: ["director-batch-students", batch.name],
    queryFn: () => getBatchStudents(batch.name, branchName),
    staleTime: 120_000,
  });

  const { data: planCounts, isLoading: loadingPlans } = useQuery({
    queryKey: ["director-batch-plan-counts", branchName, batch.name],
    queryFn: () => getPlanCountsForBatches([batch.name], branchName),
    staleTime: 120_000,
  });

  const students = batchRes?.students ?? [];
  const activeStudents = students.filter((s) => s.active);
  const hasPlan = !loadingPlans && planCounts && (planCounts.advanced + planCounts.intermediate + planCounts.basic + planCounts.freeAccess > 0);

  return (
    <Link
      href={`/dashboard/director/branches/${encodedBranch}/batches/${encodeURIComponent(batch.name)}`}
    >
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border-light hover:border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-wash flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {batch.student_group_name || batch.name}
                  </p>
                  <p className="text-xs text-text-tertiary">{batch.academic_year}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />
            </div>

            {/* Student count stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-text-primary">
                  {isLoading ? (
                    <span className="inline-block w-6 h-5 bg-border-light rounded animate-pulse" />
                  ) : (
                    students.length
                  )}
                </p>
                <p className="text-[10px] text-text-tertiary uppercase">Total</p>
              </div>
              <div>
                <p className="text-lg font-bold text-success">
                  {isLoading ? (
                    <span className="inline-block w-6 h-5 bg-border-light rounded animate-pulse" />
                  ) : (
                    activeStudents.length
                  )}
                </p>
                <p className="text-[10px] text-text-tertiary uppercase">Active</p>
              </div>
              <div>
                <p className="text-lg font-bold text-error">
                  {isLoading ? (
                    <span className="inline-block w-6 h-5 bg-border-light rounded animate-pulse" />
                  ) : (
                    students.length - activeStudents.length
                  )}
                </p>
                <p className="text-[10px] text-text-tertiary uppercase">Discontinued</p>
              </div>
            </div>

            {/* Plan breakdown */}
            {hasPlan && (
              <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-border-light">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-[10px] font-semibold text-purple-700">
                  <span className="w-1 h-1 rounded-full bg-purple-500" />{planCounts.advanced} Adv
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-[10px] font-semibold text-blue-700">
                  <span className="w-1 h-1 rounded-full bg-blue-500" />{planCounts.intermediate} Int
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-[10px] font-semibold text-emerald-700">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />{planCounts.basic} Basic
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}

export default function ProgramStudentsPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.id as string);
  const programName = decodeURIComponent(params.program as string);
  const shortBranch = branchName.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const encodedBranch = encodeURIComponent(branchName);

  const {
    data: batchesRes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["director-branch-batches-list", branchName],
    queryFn: () => getBranchBatches(branchName),
    staleTime: 120_000,
  });

  const allBatches = batchesRes?.data ?? [];
  // Filter to only batches in this program
  const programBatches = allBatches.filter(
    (b) => !b.disabled && (b.program || "Uncategorised") === programName
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
          href={`/dashboard/director/branches/${encodedBranch}/students`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Programs
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[10px] bg-brand-wash flex items-center justify-center">
              <School className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{programName}</h1>
              <p className="text-sm text-text-tertiary">{shortBranch}</p>
            </div>
          </div>
          <Badge variant="outline" className="self-start text-xs">
            {programBatches.length} batch{programBatches.length !== 1 ? "es" : ""}
          </Badge>
        </div>
      </motion.div>

      {/* Summary */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
        <Card className="border-border-light">
          <CardContent className="p-4 text-center">
            <School className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{programName}</p>
            <p className="text-xs text-text-tertiary">Program / Class</p>
          </CardContent>
        </Card>
        <Card className="border-border-light">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-secondary mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">
              {isLoading ? "..." : programBatches.length}
            </p>
            <p className="text-xs text-text-tertiary">Batches</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Batches */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-text-primary mb-3">
          Select a Batch
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <AlertCircle className="h-8 w-8 text-error" />
            <p className="text-sm text-error">Failed to load batches</p>
          </div>
        ) : programBatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48">
            <p className="text-sm text-text-tertiary">No batches in this program</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {programBatches.map((batch) => (
              <BatchCard
                key={batch.name}
                batch={batch}
                encodedBranch={encodedBranch}
                branchName={branchName}
              />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
