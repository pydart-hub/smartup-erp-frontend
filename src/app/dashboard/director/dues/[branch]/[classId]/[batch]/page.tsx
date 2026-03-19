"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  Loader2,
  AlertCircle,
  CalendarClock,
  ArrowLeft,
  Filter,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getDuesTodayByStudent } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

const PAYMENT_OPTION_LABELS: Record<string, string> = {
  "1": "One-Time Payment",
  "4": "Quarterly",
  "6": "Bi-Monthly (6 Inst.)",
  "8": "Monthly (8 Inst.)",
};

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  Advanced: { bg: "bg-purple-50", text: "text-purple-700" },
  Intermediate: { bg: "bg-blue-50", text: "text-blue-700" },
  Basic: { bg: "bg-emerald-50", text: "text-emerald-700" },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function DuesStudentPage() {
  const params = useParams();
  const branch = decodeURIComponent(params.branch as string);
  const classId = decodeURIComponent(params.classId as string);
  const batch = decodeURIComponent(params.batch as string);
  const shortBranch = branch.replace("Smart Up ", "").replace("Smart Up", "HQ");

  const [planFilter, setPlanFilter] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");

  const { data: students, isLoading, isError } = useQuery({
    queryKey: ["director-dues-students", branch, batch],
    queryFn: () => getDuesTodayByStudent(branch, batch),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  // Derive available filter options from the data
  const { planOptions, frequencyOptions } = useMemo(() => {
    const plans = new Set<string>();
    const freqs = new Set<string>();
    for (const s of students ?? []) {
      if (s.plan) plans.add(s.plan);
      if (s.no_of_instalments) freqs.add(s.no_of_instalments);
    }
    return {
      planOptions: Array.from(plans).sort(),
      frequencyOptions: Array.from(freqs).sort((a, b) => Number(a) - Number(b)),
    };
  }, [students]);

  // Apply filters
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter((s) => {
      if (planFilter !== "all" && s.plan !== planFilter) return false;
      if (frequencyFilter !== "all" && s.no_of_instalments !== frequencyFilter) return false;
      return true;
    });
  }, [students, planFilter, frequencyFilter]);

  const totalDues = filteredStudents.reduce((s, st) => s + st.total_dues, 0);
  const hasActiveFilters = planFilter !== "all" || frequencyFilter !== "all";

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
          href={`/dashboard/director/dues/${encodeURIComponent(branch)}/${encodeURIComponent(classId)}`}
          className="text-text-tertiary hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{batch} — Dues</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Student-wise overdue at {shortBranch}
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
              <p className="text-sm text-text-secondary">
                {hasActiveFilters ? "Filtered Overdue" : "Batch Overdue"}
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {isLoading ? "..." : formatCurrency(totalDues)}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-text-secondary">Students</p>
              <p className="text-xl font-bold text-text-primary">
                {isLoading ? "..." : filteredStudents.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      {!isLoading && students && students.length > 0 && (planOptions.length > 0 || frequencyOptions.length > 0) && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-text-secondary">
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </div>

            {planOptions.length > 0 && (
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="text-sm rounded-lg border border-border-input bg-surface px-3 py-1.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Plans</option>
                {planOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}

            {frequencyOptions.length > 0 && (
              <select
                value={frequencyFilter}
                onChange={(e) => setFrequencyFilter(e.target.value)}
                className="text-sm rounded-lg border border-border-input bg-surface px-3 py-1.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Frequencies</option>
                {frequencyOptions.map((f) => (
                  <option key={f} value={f}>{PAYMENT_OPTION_LABELS[f] ?? `${f} Instalments`}</option>
                ))}
              </select>
            )}

            {hasActiveFilters && (
              <button
                onClick={() => { setPlanFilter("all"); setFrequencyFilter("all"); }}
                className="text-xs text-primary hover:text-primary/80 underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Student rows */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load dues</p>
        </div>
      ) : !students?.length ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <CalendarClock className="h-8 w-8 text-success" />
          <p className="text-sm text-success font-medium">No overdue dues for this batch!</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <Filter className="h-8 w-8 text-text-tertiary" />
          <p className="text-sm text-text-secondary">No students match the selected filters</p>
        </div>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-3">
          {filteredStudents.map((student, idx) => {
            const planColor = PLAN_COLORS[student.plan] ?? { bg: "bg-gray-50", text: "text-gray-600" };
            const frequencyLabel = PAYMENT_OPTION_LABELS[student.no_of_instalments] ?? "";

            return (
              <motion.div key={student.student_id} variants={itemVariants}>
                <div className="p-4 rounded-[10px] border border-border-light bg-surface">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-wash flex items-center justify-center shrink-0">
                      <GraduationCap className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-text-primary">
                          <span className="text-text-tertiary mr-2">#{idx + 1}</span>
                          {student.student_name}
                        </p>
                        {student.plan && (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${planColor.bg} ${planColor.text}`}>
                            {student.plan}
                          </span>
                        )}
                        {frequencyLabel && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600">
                            {frequencyLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-tertiary">{student.student_id}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-orange-600">
                        {formatCurrency(student.total_dues)}
                      </p>
                      <p className="text-[10px] text-text-tertiary">overdue</p>
                    </div>
                  </div>

                  {/* Overdue invoices detail */}
                  {student.overdue_invoices.length > 0 && (
                    <div className="ml-11 space-y-1.5">
                      {student.overdue_invoices.map((inv) => (
                        <div
                          key={inv.name}
                          className="flex items-center justify-between text-xs px-3 py-2 rounded-md bg-orange-50/50 border border-orange-100"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] font-mono text-text-tertiary border-border-light">
                              {inv.name}
                            </Badge>
                            {inv.instalment_label && (
                              <Badge variant="info" className="text-[10px]">
                                {inv.instalment_label}
                              </Badge>
                            )}
                            <span className="text-text-secondary">
                              Due: {formatDate(inv.due_date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <p className="text-[10px] text-text-tertiary">Total</p>
                              <p className="font-medium text-text-primary">{formatCurrency(inv.grand_total)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-text-tertiary">Balance</p>
                              <p className="font-semibold text-orange-600">{formatCurrency(inv.amount)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
