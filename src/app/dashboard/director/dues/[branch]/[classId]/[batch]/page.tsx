"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  AlertCircle,
  CalendarClock,
  ArrowLeft,
  Filter,
  Download,
  Calendar,
  Phone,
  Search,
  X,
  Users,
  CheckCircle2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getDuesTodayByStudent, type DuesTodayStudentRow } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

const PAYMENT_OPTION_LABELS: Record<string, string> = {
  "1": "One-Time Payment",
  "4": "Quarterly",
  "6": "Bi-Monthly (6 Inst.)",
  "8": "Monthly (8 Inst.)",
};

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  Advanced: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-300" },
  Intermediate: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300" },
  Basic: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300" },
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

function exportBatchStudentsCSV(
  students: DuesTodayStudentRow[],
  batchName: string,
  branchName: string
) {
  const headers = [
    "Sl No",
    "Student Name",
    "Student ID",
    "Admission Date",
    "Plan",
    "Payment Frequency",
    "Total Fee (INR)",
    "Paid Fee (INR)",
    "Overdue Amount (INR)",
    "Remaining Balance (INR)",
    "Fee Status",
    "Guardian Name",
    "Guardian Phone",
    "Batch",
    "Branch",
  ];

  const rows = students.map((s, idx) => {
    const status =
      s.total_dues > 0
        ? "Overdue"
        : (s.balance_fee ?? 0) === 0
        ? "Fully Paid"
        : "Up-to-Date";

    return [
      idx + 1,
      s.student_name,
      s.student_id,
      s.admission_date ? formatDate(s.admission_date) : "—",
      s.plan || "—",
      PAYMENT_OPTION_LABELS[s.no_of_instalments] || s.no_of_instalments || "—",
      s.total_fee ?? 0,
      s.paid_fee ?? 0,
      s.total_dues ?? 0,
      s.balance_fee ?? 0,
      status,
      s.guardian_name || "—",
      s.guardian_phone || "—",
      batchName,
      branchName,
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const cleanBatch = batchName.replace(/[^a-zA-Z0-9-_]/g, "_");
  link.href = url;
  link.setAttribute(
    "download",
    `${cleanBatch}_Students_Fee_Report_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function DuesStudentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const branch = decodeURIComponent(params.branch as string);
  const classId = decodeURIComponent(params.classId as string);
  const batch = decodeURIComponent(params.batch as string);
  const shortBranch = branch.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const asOf = searchParams.get("as_of") || undefined;
  const childQs = asOf ? `?as_of=${asOf}` : "";

  // View Mode: "overdue" vs "all"
  const [viewMode, setViewMode] = useState<"overdue" | "all">("overdue");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");

  const { data: students, isLoading, isError } = useQuery({
    queryKey: ["director-dues-students", branch, batch, asOf, classId],
    queryFn: () => getDuesTodayByStudent(branch, batch, asOf, classId),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  // Overall batch statistics
  const batchStats = useMemo(() => {
    if (!students) return { total: 0, overdueCount: 0, upToDateCount: 0, totalDues: 0, totalFee: 0, totalPaid: 0 };
    let overdueCount = 0;
    let upToDateCount = 0;
    let totalDues = 0;
    let totalFee = 0;
    let totalPaid = 0;

    for (const s of students) {
      if (s.total_dues > 0) {
        overdueCount++;
        totalDues += s.total_dues;
      } else {
        upToDateCount++;
      }
      totalFee += s.total_fee ?? 0;
      totalPaid += s.paid_fee ?? 0;
    }

    return {
      total: students.length,
      overdueCount,
      upToDateCount,
      totalDues,
      totalFee,
      totalPaid,
    };
  }, [students]);

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

  // Apply filters and view mode
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    const q = searchQuery.trim().toLowerCase();

    return students.filter((s) => {
      // 1. View mode filter
      if (viewMode === "overdue" && s.total_dues <= 0) return false;

      // 2. Dropdown filters
      if (planFilter !== "all" && s.plan !== planFilter) return false;
      if (frequencyFilter !== "all" && s.no_of_instalments !== frequencyFilter) return false;

      // 3. Search query
      if (q) {
        const nameMatch = s.student_name.toLowerCase().includes(q);
        const idMatch = s.student_id.toLowerCase().includes(q);
        const phoneMatch = (s.guardian_phone || "").includes(q);
        if (!nameMatch && !idMatch && !phoneMatch) return false;
      }

      return true;
    });
  }, [students, viewMode, planFilter, frequencyFilter, searchQuery]);

  const displayedTotalDues = filteredStudents.reduce((s, st) => s + st.total_dues, 0);
  const displayedTotalFee = filteredStudents.reduce((s, st) => s + (st.total_fee ?? 0), 0);
  const displayedTotalPaid = filteredStudents.reduce((s, st) => s + (st.paid_fee ?? 0), 0);
  const hasActiveFilters = planFilter !== "all" || frequencyFilter !== "all" || searchQuery.length > 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Header & Title */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/director/dues/${encodeURIComponent(branch)}/${encodeURIComponent(classId)}${childQs}`}
            className="text-text-tertiary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              {batch} — {viewMode === "all" ? "All Students" : "Dues"}
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {viewMode === "all" ? "Complete batch roster and fee status" : "Student-wise overdue breakdown"} at {shortBranch}
            </p>
          </div>
        </div>

        {/* Download CSV Report Button */}
        {students && students.length > 0 && (
          <Button
            onClick={() => exportBatchStudentsCSV(filteredStudents, batch, shortBranch)}
            className="rounded-xl inline-flex items-center gap-2 bg-[#5f2ea8] text-white hover:bg-[#5f2ea8]/90 text-xs font-bold shadow-xs px-4 py-2 self-start sm:self-auto cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Fee Report ({filteredStudents.length})</span>
          </Button>
        )}
      </motion.div>

      {/* Summary Card */}
      <motion.div variants={itemVariants}>
        <Card className="border-orange-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1526]/85">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center shrink-0">
                  <CalendarClock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-text-secondary font-medium">Batch Overdue</p>
                  <p className="text-xl font-bold text-orange-600">
                    {isLoading ? "..." : formatCurrency(displayedTotalDues)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 border-l border-slate-100 dark:border-slate-800/80 pl-4">
                <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-text-secondary font-medium">Total Billed</p>
                  <p className="text-xl font-bold text-text-primary">
                    {isLoading ? "..." : formatCurrency(displayedTotalFee)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 border-l border-slate-100 dark:border-slate-800/80 pl-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-text-secondary font-medium">Collected / Paid</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {isLoading ? "..." : formatCurrency(displayedTotalPaid)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 border-l border-slate-100 dark:border-slate-800/80 pl-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-text-secondary font-medium">
                    {viewMode === "overdue" ? "Overdue Students" : "Batch Students"}
                  </p>
                  <p className="text-xl font-bold text-text-primary">
                    {isLoading ? "..." : `${filteredStudents.length} / ${batchStats.total}`}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* View Mode Segmented Controls & Filters Bar */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white/70 dark:bg-[#0E1526]/70 p-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 backdrop-blur shadow-xs">
        {/* Toggle between Overdue and All Students */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setViewMode("overdue")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === "overdue"
                ? "bg-orange-600 text-white shadow-xs"
                : "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100/70 border border-orange-200/50 dark:border-orange-800/30"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Overdue Students ({batchStats.overdueCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("all")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === "all"
                ? "bg-[#5f2ea8] text-white shadow-xs"
                : "bg-purple-50 dark:bg-purple-950/20 text-[#5f2ea8] dark:text-purple-300 hover:bg-purple-100/70 border border-purple-200/50 dark:border-purple-800/30"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Students in Batch ({batchStats.total})</span>
          </button>

          {batchStats.upToDateCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-200/50 dark:border-emerald-800/30">
              <CheckCircle2 className="w-3 h-3" />
              {batchStats.upToDateCount} fully paid / up to date
            </span>
          )}
        </div>

        {/* Search & Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              placeholder="Search student or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-7 py-1.5 text-xs bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-[#5f2ea8]/20 focus:border-[#5f2ea8] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary p-0.5 rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {planOptions.length > 0 && (
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1526] px-2.5 py-1.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-[#5f2ea8]/20"
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
              className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1526] px-2.5 py-1.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-[#5f2ea8]/20"
            >
              <option value="all">All Frequencies</option>
              {frequencyOptions.map((f) => (
                <option key={f} value={f}>{PAYMENT_OPTION_LABELS[f] ?? `${f} Inst.`}</option>
              ))}
            </select>
          )}

          {hasActiveFilters && (
            <button
              onClick={() => {
                setPlanFilter("all");
                setFrequencyFilter("all");
                setSearchQuery("");
              }}
              className="text-xs text-[#5f2ea8] hover:underline font-bold px-1"
            >
              Reset
            </button>
          )}
        </div>
      </motion.div>

      {/* Student Cards List */}
      {isLoading ? (
        <GifLoader />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 bg-white dark:bg-[#0E1526]/85 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error font-medium">Failed to load batch student fee details</p>
        </div>
      ) : !students?.length ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 bg-white dark:bg-[#0E1526]/85 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <CalendarClock className="h-8 w-8 text-success" />
          <p className="text-sm text-success font-medium">No students enrolled in this batch!</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 bg-white dark:bg-[#0E1526]/85 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <Filter className="h-8 w-8 text-text-tertiary" />
          <p className="text-sm text-text-secondary font-medium">
            {viewMode === "overdue"
              ? "No students in this batch have overdue dues!"
              : "No students match the current filters"}
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPlanFilter("all");
                setFrequencyFilter("all");
                setSearchQuery("");
              }}
              className="rounded-xl text-xs font-bold text-[#5f2ea8]"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-3">
          {filteredStudents.map((student, idx) => {
            const planColor = PLAN_COLORS[student.plan] ?? { bg: "bg-gray-50", text: "text-gray-600" };
            const frequencyLabel = PAYMENT_OPTION_LABELS[student.no_of_instalments] ?? "";
            const isStudentOverdue = student.total_dues > 0;

            return (
              <motion.div key={student.student_id} variants={itemVariants}>
                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#0E1526]/90 shadow-xs hover:border-[#5f2ea8]/30 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                    {/* Student Info & Admission Date */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center shrink-0 mt-0.5">
                        <GraduationCap className="h-5 w-5 text-[#5f2ea8] dark:text-purple-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-base font-bold text-text-primary">
                            <span className="text-text-tertiary mr-2 font-mono text-xs">#{idx + 1}</span>
                            {student.student_name}
                          </p>
                          {student.plan && (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${planColor.bg} ${planColor.text}`}>
                              {student.plan}
                            </span>
                          )}
                          {frequencyLabel && (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-text-secondary">
                              {frequencyLabel}
                            </span>
                          )}
                        </div>

                        {/* ID, Admission Date & Contact */}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-text-tertiary">
                          <span className="font-mono text-text-secondary font-medium">{student.student_id}</span>
                          {student.admission_date && (
                            <span className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-800 font-medium text-text-secondary">
                              <Calendar className="w-3 h-3 text-[#5f2ea8]" />
                              <span>Admitted: {formatDate(student.admission_date)}</span>
                            </span>
                          )}
                          {student.guardian_phone && (
                            <div className="flex items-center gap-1 font-mono text-text-secondary">
                              <Phone className="w-3 h-3 text-text-tertiary" />
                              <span>{student.guardian_phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Financial Summary: Total Fee, Paid Fee, Overdue / Balance */}
                    <div className="flex items-center gap-4 sm:gap-6 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                      {student.total_fee !== undefined && (
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-bold">Total Fee</p>
                          <p className="text-xs sm:text-sm font-bold text-text-primary">
                            {formatCurrency(student.total_fee)}
                          </p>
                        </div>
                      )}

                      {student.paid_fee !== undefined && (
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">Paid Fee</p>
                          <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(student.paid_fee)}
                          </p>
                        </div>
                      )}

                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-bold">
                          {isStudentOverdue ? "Overdue" : "Balance"}
                        </p>
                        <p className={`text-base sm:text-lg font-black ${isStudentOverdue ? "text-orange-600" : "text-text-primary"}`}>
                          {formatCurrency(isStudentOverdue ? student.total_dues : (student.balance_fee ?? 0))}
                        </p>
                        {!isStudentOverdue && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{(student.balance_fee ?? 0) === 0 ? "Fully Paid" : "Up-to-Date"}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Overdue invoices detail */}
                  {student.overdue_invoices.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                      <p className="text-[11px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider">
                        Overdue Invoices ({student.overdue_invoices.length}):
                      </p>
                      {student.overdue_invoices.map((inv) => (
                        <div
                          key={inv.name}
                          className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] font-mono text-text-tertiary border-slate-200 dark:border-slate-800">
                              {inv.name}
                            </Badge>
                            {inv.instalment_label && (
                              <Badge variant="info" className="text-[10px]">
                                {inv.instalment_label}
                              </Badge>
                            )}
                            <span className="text-text-secondary text-[11px]">
                              Due: {formatDate(inv.due_date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <p className="text-[10px] text-text-tertiary">Invoice Total</p>
                              <p className="font-medium text-text-primary text-xs">{formatCurrency(inv.grand_total)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-orange-600 font-bold">Pending</p>
                              <p className="font-bold text-orange-600 text-xs">{formatCurrency(inv.amount)}</p>
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

