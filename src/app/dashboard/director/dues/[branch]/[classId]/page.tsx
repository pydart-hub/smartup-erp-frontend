"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  ChevronRight,
  Loader2,
  AlertCircle,
  CalendarClock,
  ArrowLeft,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { getDuesTodayByBatch } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function DuesBatchPage() {
  const params = useParams();
  const branch = decodeURIComponent(params.branch as string);
  const classId = decodeURIComponent(params.classId as string);
  const shortBranch = branch.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const displayClass = classId.replace(" Tuition Fee", "");

  const { data: batches, isLoading, isError } = useQuery({
    queryKey: ["director-dues-batches", branch, classId],
    queryFn: () => getDuesTodayByBatch(branch, classId),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const totalDues = (batches ?? []).reduce((s, b) => s + b.total_dues, 0);
  const totalStudents = (batches ?? []).reduce((s, b) => s + b.student_count, 0);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <Link
          href={`/dashboard/director/dues/${encodeURIComponent(branch)}`}
          className="text-text-tertiary hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{displayClass} — Dues</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Batch-wise overdue at {shortBranch}
          </p>
        </div>
      </motion.div>

      {/* Summary card */}
      <motion.div variants={itemVariants}>
        <Card className="border-orange-200/60">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
              <CalendarClock className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Class Overdue</p>
              <p className="text-2xl font-bold text-orange-600">
                {isLoading ? "..." : formatCurrency(totalDues)}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-text-secondary">Students</p>
              <p className="text-xl font-bold text-text-primary">
                {isLoading ? "..." : totalStudents}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Batch rows */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load dues</p>
        </div>
      ) : !batches?.length ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <CalendarClock className="h-8 w-8 text-success" />
          <p className="text-sm text-success font-medium">No overdue dues for this class!</p>
        </div>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-2">
          {batches.map((batch) => (
            <motion.div key={batch.batch_id} variants={itemVariants}>
              <Link
                href={`/dashboard/director/dues/${encodeURIComponent(branch)}/${encodeURIComponent(classId)}/${encodeURIComponent(batch.batch_id)}`}
              >
                <div className="flex items-center gap-3 p-4 rounded-[10px] border border-border-light hover:border-orange-300/50 hover:shadow-sm transition-all cursor-pointer bg-surface">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{batch.batch_name}</p>
                    <p className="text-xs text-text-tertiary">
                      {batch.student_count} student{batch.student_count !== 1 ? "s" : ""} with overdue
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-orange-600">
                      {formatCurrency(batch.total_dues)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
