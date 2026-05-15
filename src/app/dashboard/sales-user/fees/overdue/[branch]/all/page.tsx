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
  Phone,
  User,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Users,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getDuesTodayByBranchStudents } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

const PAYMENT_OPTION_LABELS: Record<string, string> = {
  "1": "One-Time",
  "4": "Quarterly",
  "6": "Bi-Monthly (6)",
  "8": "Monthly (8)",
};

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Advanced: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  Intermediate: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Basic: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
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

export default function BranchAllStudentsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const branch = decodeURIComponent(params.branch as string);
  const shortBranch = branch.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const asOf = searchParams.get("as_of") || undefined;
  const childQs = asOf ? `?as_of=${asOf}` : "";

  const [planFilter, setPlanFilter] = useState("all");
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const { data: students, isLoading, isError } = useQuery({
    queryKey: ["branch-all-students", branch, asOf],
    queryFn: () => getDuesTodayByBranchStudents(branch, asOf),
    staleTime: 30_000,
    refetchInterval: 120_000,
  });

  const { planOptions, frequencyOptions, classOptions, batchOptions } = useMemo(() => {
    const plans = new Set<string>();
    const freqs = new Set<string>();
    const classes = new Set<string>();
    const batches = new Set<string>();
    for (const s of students ?? []) {
      if (s.plan) plans.add(s.plan);
      if (s.no_of_instalments) freqs.add(s.no_of_instalments);
      if (s.class_name) classes.add(s.class_name);
      if (s.batch_name) batches.add(s.batch_name);
    }
    return {
      planOptions: Array.from(plans).sort(),
      frequencyOptions: Array.from(freqs).sort((a, b) => Number(a) - Number(b)),
      classOptions: Array.from(classes).sort(),
      batchOptions: Array.from(batches).sort(),
    };
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    const q = search.toLowerCase().trim();
    return students.filter((s) => {
      if (planFilter !== "all" && s.plan !== planFilter) return false;
      if (frequencyFilter !== "all" && s.no_of_instalments !== frequencyFilter) return false;
      if (classFilter !== "all" && s.class_name !== classFilter) return false;
      if (batchFilter !== "all" && s.batch_name !== batchFilter) return false;
      if (q && !s.student_name.toLowerCase().includes(q) && !s.student_id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [students, planFilter, frequencyFilter, classFilter, batchFilter, search]);

  const totalDues = filteredStudents.reduce((s, st) => s + st.total_dues, 0);
  const hasActiveFilters = planFilter !== "all" || frequencyFilter !== "all" || classFilter !== "all" || batchFilter !== "all" || search.trim() !== "";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5 pb-8"
    >
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <Link
          href={`/dashboard/sales-user/fees/overdue${childQs}`}
          className="text-text-tertiary hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {shortBranch} — All Overdue Students
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Complete list · all classes &amp; batches
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
                {hasActiveFilters ? "Filtered Overdue" : "Branch Overdue"}
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {isLoading ? "..." : formatCurrency(totalDues)}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-text-secondary">Students</p>
              <p className="text-xl font-bold text-text-primary">
                {isLoading ? "..." : filteredStudents.length}
                {!isLoading && students && filteredStudents.length !== students.length && (
                  <span className="text-sm font-normal text-text-tertiary ml-1">
                    / {students.length}
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search + Filters */}
      {!isLoading && students && students.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or ID…"
                className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-border-input bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter label */}
            <div className="flex items-center gap-1.5 text-sm text-text-secondary shrink-0">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </div>

            {planOptions.length > 0 && (
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="text-sm rounded-lg border border-border-input bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Plans</option>
                {planOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}

            {classOptions.length > 0 && (
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="text-sm rounded-lg border border-border-input bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Classes</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>{c.replace(" Tuition Fee", "")}</option>
                ))}
              </select>
            )}

            {batchOptions.length > 0 && (
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="text-sm rounded-lg border border-border-input bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Batches</option>
                {batchOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            )}

            {frequencyOptions.length > 0 && (
              <select
                value={frequencyFilter}
                onChange={(e) => setFrequencyFilter(e.target.value)}
                className="text-sm rounded-lg border border-border-input bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Frequencies</option>
                {frequencyOptions.map((f) => (
                  <option key={f} value={f}>
                    {PAYMENT_OPTION_LABELS[f] ?? `${f} Instalments`}
                  </option>
                ))}
              </select>
            )}

            {hasActiveFilters && (
              <button
                onClick={() => { setPlanFilter("all"); setFrequencyFilter("all"); setClassFilter("all"); setBatchFilter("all"); setSearch(""); }}
                className="text-xs text-primary hover:text-primary/80 underline underline-offset-2 shrink-0"
              >
                Clear all
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Student list */}
      {isLoading ? (
        <GifLoader size="lg" />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load student data</p>
        </div>
      ) : !students?.length ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <CalendarClock className="h-8 w-8 text-success" />
          <p className="text-sm text-success font-medium">No overdue fees for {shortBranch}!</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <Users className="h-8 w-8 text-text-tertiary" />
          <p className="text-sm text-text-secondary">No students match the current filters</p>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-3"
        >
          {filteredStudents.map((student, idx) => {
            const planColor =
              PLAN_COLORS[student.plan] ?? {
                bg: "bg-gray-50",
                text: "text-gray-600",
                border: "border-gray-200",
              };
            const frequencyLabel =
              PAYMENT_OPTION_LABELS[student.no_of_instalments] ??
              (student.no_of_instalments
                ? `${student.no_of_instalments} Inst.`
                : "");
            const isExpanded = expandedIds.has(student.student_id);

            return (
              <motion.div key={student.student_id} variants={itemVariants}>
                <div className="rounded-[12px] border border-border-light bg-surface overflow-hidden">
                  {/* Student header */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-lg bg-brand-wash flex items-center justify-center shrink-0 mt-0.5">
                        <GraduationCap className="h-4 w-4 text-primary" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        {/* Name + badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-text-primary">
                            <span className="text-text-tertiary mr-1.5 font-normal">
                              #{idx + 1}
                            </span>
                            {student.student_name}
                          </p>
                          {student.class_name && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {student.class_name.replace(" Tuition Fee", "")}
                            </span>
                          )}
                          {student.batch_name && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-teal-50 text-teal-700 border border-teal-200">
                              {student.batch_name}
                            </span>
                          )}
                          {student.plan && (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${planColor.bg} ${planColor.text} ${planColor.border}`}
                            >
                              {student.plan}
                            </span>
                          )}
                          {frequencyLabel && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              {frequencyLabel}
                            </span>
                          )}
                        </div>

                        {/* ID */}
                        <p className="text-xs text-text-tertiary font-mono mt-1">
                          {student.student_id}
                        </p>

                        {/* Parent info */}
                        {(student.guardian_name || student.guardian_phone) && (
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {student.guardian_name && (
                              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                                <User className="h-3 w-3 text-text-tertiary" />
                                <span>{student.guardian_name}</span>
                              </div>
                            )}
                            {student.guardian_phone && (
                              <a
                                href={`tel:${student.guardian_phone}`}
                                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                              >
                                <Phone className="h-3 w-3" />
                                <span>{student.guardian_phone}</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Overdue amount + expand */}
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <p className="text-lg font-bold text-orange-600">
                          {formatCurrency(student.total_dues)}
                        </p>
                        <p className="text-[10px] text-text-tertiary">overdue</p>
                        <button
                          onClick={() => toggleExpand(student.student_id)}
                          className="mt-1 flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
                        >
                          {isExpanded ? (
                            <>Hide <ChevronUp className="h-3 w-3" /></>
                          ) : (
                            <>
                              {student.overdue_invoices.length} instalment
                              {student.overdue_invoices.length !== 1 ? "s" : ""}{" "}
                              <ChevronDown className="h-3 w-3" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Instalment detail (expandable) */}
                  {isExpanded && student.overdue_invoices.length > 0 && (
                    <div className="border-t border-border-light bg-orange-50/20 px-4 py-3 space-y-2">
                      {/* Column headers */}
                      <div className="grid grid-cols-4 gap-2 px-1 mb-1">
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide">
                          Instalment
                        </p>
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide text-right">
                          Total
                        </p>
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide text-right">
                          Paid
                        </p>
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide text-right">
                          Balance
                        </p>
                      </div>

                      {student.overdue_invoices.map((inv) => (
                        <div
                          key={inv.name}
                          className="grid grid-cols-4 gap-2 items-center px-3 py-2.5 rounded-lg bg-white border border-orange-100"
                        >
                          <div className="min-w-0">
                            {inv.instalment_label && (
                              <Badge variant="info" className="text-[10px]">
                                {inv.instalment_label}
                              </Badge>
                            )}
                            <p className="text-[10px] text-text-tertiary mt-0.5">
                              Due: {formatDate(inv.due_date)}
                            </p>
                            <p className="text-[9px] text-text-tertiary/60 font-mono mt-0.5 truncate">
                              {inv.name}
                            </p>
                          </div>
                          <p className="text-xs font-medium text-text-primary text-right tabular-nums">
                            {formatCurrency(inv.grand_total)}
                          </p>
                          <p
                            className={`text-xs font-medium text-right tabular-nums ${(inv.paid ?? 0) > 0 ? "text-success" : "text-text-tertiary"}`}
                          >
                            {formatCurrency(inv.paid ?? 0)}
                          </p>
                          <p className="text-xs font-semibold text-orange-600 text-right tabular-nums">
                            {formatCurrency(inv.amount)}
                          </p>
                        </div>
                      ))}

                      {/* Totals row */}
                      <div className="grid grid-cols-4 gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200/60 mt-1">
                        <p className="text-[10px] font-bold text-text-secondary uppercase">
                          Total
                        </p>
                        <p className="text-xs font-bold text-text-primary text-right tabular-nums">
                          {formatCurrency(
                            student.overdue_invoices.reduce((s, i) => s + (i.grand_total ?? 0), 0)
                          )}
                        </p>
                        <p className="text-xs font-bold text-success text-right tabular-nums">
                          {formatCurrency(
                            student.overdue_invoices.reduce((s, i) => s + (i.paid ?? 0), 0)
                          )}
                        </p>
                        <p className="text-xs font-bold text-orange-600 text-right tabular-nums">
                          {formatCurrency(student.total_dues)}
                        </p>
                      </div>
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
