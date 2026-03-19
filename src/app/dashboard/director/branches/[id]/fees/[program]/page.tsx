"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  IndianRupee,
  Users,
  CircleCheck,
  Clock,
  TriangleAlert,
  Loader2,
  AlertCircle,
  Search,
  UserX,
  Star,
  Banknote,
  Wifi,
  Filter,
  CalendarClock,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { getBranchProgramStudentFees } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

const PAYMENT_OPTION_LABELS: Record<string, string> = {
  "1": "One-Time Payment",
  "4": "Quarterly",
  "6": "Bi-Monthly (6 Inst.)",
  "8": "Monthly (8 Inst.)",
};

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Advanced: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-300" },
  Intermediate: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300" },
  Basic: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300" },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

export default function ProgramStudentFeesPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.id as string);
  const programName = decodeURIComponent(params.program as string);
  const shortName = branchName.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const encodedBranch = encodeURIComponent(branchName);

  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");

  const { data: students, isLoading, isError } = useQuery({
    queryKey: ["director-program-student-fees", branchName, programName],
    queryFn: () => getBranchProgramStudentFees(branchName, programName),
    staleTime: 120_000,
  });

  // Derive available filter options from the data
  const { planOptions, frequencyOptions } = useMemo(() => {
    const plans = new Set<string>();
    const freqs = new Set<string>();
    for (const s of students ?? []) {
      if (s.feePlan) plans.add(s.feePlan);
      if (s.noOfInstalments) freqs.add(s.noOfInstalments);
    }
    return {
      planOptions: Array.from(plans).sort(),
      frequencyOptions: Array.from(freqs).sort((a, b) => Number(a) - Number(b)),
    };
  }, [students]);

  const filtered = useMemo(() => {
    return (students ?? []).filter((s) => {
      if (search && !s.studentName.toLowerCase().includes(search.toLowerCase()) && !s.studentId.toLowerCase().includes(search.toLowerCase())) return false;
      if (planFilter !== "all" && s.feePlan !== planFilter) return false;
      if (frequencyFilter !== "all" && s.noOfInstalments !== frequencyFilter) return false;
      return true;
    });
  }, [students, search, planFilter, frequencyFilter]);

  const hasActiveFilters = planFilter !== "all" || frequencyFilter !== "all";

  // Summary totals
  const totalFees = filtered.reduce((sum, s) => sum + s.totalInvoiced, 0);
  const totalCollected = filtered.reduce((sum, s) => sum + s.totalCollected, 0);
  const totalPending = filtered.reduce((sum, s) => sum + s.totalOutstanding, 0);
  const discontinuedCount = filtered.filter((s) => s.enabled === 0).length;
  const totalDues = filtered.reduce((sum, s) => sum + s.duesTillToday, 0);

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
          href={`/dashboard/director/branches/${encodedBranch}/fees`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {shortName} Fees
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{programName}</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {shortName} · Student-wise fee details
            </p>
          </div>
          <Badge variant="outline" className="self-start text-xs">{branchName}</Badge>
        </div>
      </motion.div>

      {/* Summary Cards */}
      {!isLoading && !isError && (students?.length ?? 0) > 0 && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card className="border-border-light">
            <CardContent className="p-4 text-center">
              <IndianRupee className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalFees)}</p>
              <p className="text-xs text-text-tertiary">
                {hasActiveFilters ? "Filtered Total" : "Total Fees"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-success/20">
            <CardContent className="p-4 text-center">
              <CircleCheck className="h-5 w-5 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-success">{formatCurrency(totalCollected)}</p>
              <p className="text-xs text-text-tertiary">Collected</p>
            </CardContent>
          </Card>
          <Card className="border-error/20">
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 text-error mx-auto mb-2" />
              <p className="text-2xl font-bold text-error">{formatCurrency(totalPending)}</p>
              <p className="text-xs text-text-tertiary">Pending</p>
            </CardContent>
          </Card>
          <Card className={`border-orange-200/60 ${totalDues > 0 ? '' : 'opacity-60'}`}>
            <CardContent className="p-4 text-center">
              <CalendarClock className="h-5 w-5 text-orange-500 mx-auto mb-2" />
              <p className={`text-2xl font-bold ${totalDues > 0 ? 'text-orange-600' : 'text-text-tertiary'}`}>{formatCurrency(totalDues)}</p>
              <p className="text-xs text-text-tertiary">Overdue</p>
            </CardContent>
          </Card>
          <Card className="border-border-light">
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-primary">{filtered.length}</p>
              <p className="text-xs text-text-tertiary">Students</p>
              {discontinuedCount > 0 && (
                <p className="text-[10px] text-amber-500 mt-1">{discontinuedCount} discontinued</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search + Filters */}
      <motion.div variants={itemVariants} className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {!isLoading && (planOptions.length > 0 || frequencyOptions.length > 0) && (
          <>
            <div className="flex items-center gap-1.5 text-sm text-text-secondary">
              <Filter className="h-4 w-4" />
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
          </>
        )}
      </motion.div>

      {/* Student List */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <AlertCircle className="h-8 w-8 text-error" />
            <p className="text-sm text-error">Failed to load student fee details</p>
          </div>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            {search || hasActiveFilters ? (
              <>
                <Filter className="h-8 w-8 text-text-tertiary" />
                <p className="text-sm text-text-tertiary">
                  No students match your {search ? "search" : "filters"}
                </p>
              </>
            ) : (
              <>
                <Users className="h-8 w-8 text-text-tertiary" />
                <p className="text-sm text-text-tertiary">No students found for this class</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((student) => {
              const pending = student.totalOutstanding;
              const isDiscontinued = student.enabled === 0;
              const planColor = PLAN_COLORS[student.feePlan ?? ""] ?? { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-300" };
              const frequencyLabel = PAYMENT_OPTION_LABELS[student.noOfInstalments ?? ""] ?? "";

              return (
                <motion.div
                  key={student.studentId}
                  variants={itemVariants}
                  className={`flex items-center gap-3 p-3 rounded-[10px] border bg-surface transition-colors ${
                    isDiscontinued
                      ? "border-amber-200/60 opacity-75"
                      : "border-border-light"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isDiscontinued ? "bg-amber-50" : "bg-brand-wash"
                  }`}>
                    {isDiscontinued ? (
                      <UserX className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Users className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{student.studentName}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs text-text-tertiary truncate">{student.studentId}</p>
                      {isDiscontinued && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-300">
                          Discontinued
                        </Badge>
                      )}
                      {student.feePlan && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${planColor.bg} ${planColor.text}`}>
                          {student.feePlan === "Advanced" && (
                            <Star className="h-2.5 w-2.5 mr-0.5" />
                          )}
                          {student.feePlan}
                        </span>
                      )}
                      {frequencyLabel && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600">
                          {frequencyLabel}
                        </span>
                      )}
                      {student.paymentMode && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 gap-0.5 ${
                            student.paymentMode === "Online"
                              ? "border-blue-300 text-blue-600"
                              : "border-green-300 text-green-600"
                          }`}
                        >
                          {student.paymentMode === "Online" ? (
                            <Wifi className="h-2.5 w-2.5" />
                          ) : (
                            <Banknote className="h-2.5 w-2.5" />
                          )}
                          {student.paymentMode}
                        </Badge>
                      )}
                      {!isDiscontinued && student.totalOutstanding === 0 && student.totalInvoiced > 0 && (
                        <Badge variant="success" className="text-[10px] px-1.5 py-0 gap-0.5">
                          <CircleCheck className="h-2.5 w-2.5" /> Fully Paid
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-text-primary">{formatCurrency(student.totalInvoiced)}</p>
                      <p className="text-[10px] text-text-tertiary">total</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-success">{formatCurrency(student.totalCollected)}</p>
                      <p className="text-[10px] text-success/70 flex items-center justify-end gap-0.5">
                        <CircleCheck className="h-2.5 w-2.5" /> paid
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${pending > 0 ? (isDiscontinued ? "text-amber-600" : "text-error") : "text-text-tertiary"}`}>
                        {formatCurrency(pending)}
                      </p>
                      <p className={`text-[10px] flex items-center justify-end gap-0.5 ${
                        pending > 0 ? (isDiscontinued ? "text-amber-500/70" : "text-error/70") : "text-text-tertiary"
                      }`}>
                        {pending > 0 ? (
                          isDiscontinued ? (
                            <><TriangleAlert className="h-2.5 w-2.5" /> forfeited</>
                          ) : (
                            <><Clock className="h-2.5 w-2.5" /> pending</>
                          )
                        ) : (
                          "cleared"
                        )}
                      </p>
                    </div>
                    {student.duesTillToday > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-600">
                          {formatCurrency(student.duesTillToday)}
                        </p>
                        <p className="text-[10px] text-orange-500/80 flex items-center justify-end gap-0.5">
                          <CalendarClock className="h-2.5 w-2.5" /> overdue
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
