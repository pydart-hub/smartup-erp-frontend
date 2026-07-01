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
  CalendarDays,
  PhoneCall,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getDuesTodayByStudent } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";
import { FollowUpDrawer } from "@/components/fees/FollowUpDrawer";
import { FollowUpBadge } from "@/components/fees/FollowUpBadge";
import { StudentTransactionHistory } from "@/components/fees/StudentTransactionHistory";
import { getBranchFollowUps } from "@/lib/api/followup";
import type { FollowUpLog } from "@/lib/api/followup";
import { useAuth } from "@/lib/hooks/useAuth";

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

export default function SalesOverdueStudentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const branch = decodeURIComponent(params.branch as string);
  const classId = decodeURIComponent(params.classId as string);
  const batch = decodeURIComponent(params.batch as string);
  const shortBranch = branch.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const displayClass = classId.replace(" Tuition Fee", "");
  const asOf = searchParams.get("as_of") || undefined;
  const childQs = asOf ? `?as_of=${asOf}` : "";

  const { allowedCompanies, role } = useAuth();
  const hasAccess =
    role !== "Sales User" ||
    !allowedCompanies ||
    allowedCompanies.length === 0 ||
    allowedCompanies.includes(branch);

  const [planFilter, setPlanFilter] = useState("all");
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [notCalledOnly, setNotCalledOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc" | "none">("none");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [drawerStudent, setDrawerStudent] = useState<{ student_id: string; student_name: string; branch: string } | null>(null);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const { data: students, isLoading, isError } = useQuery({
    queryKey: ["sales-dues-students", branch, batch, asOf, classId],
    queryFn: () => getDuesTodayByStudent(branch, batch, asOf, classId),
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled: hasAccess,
  });

  // Follow-up logs keyed by student_id — single branch request
  const { data: allLogs } = useQuery({
    queryKey: ["followup-batch", branch],
    queryFn: () => getBranchFollowUps(branch),
    enabled: !!branch && hasAccess,
    staleTime: 60_000,
  });

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav />
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 rounded-2xl border border-red-100 bg-red-50/50 p-8 text-center animate-fade-in">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <h2 className="text-lg font-semibold text-gray-900">Access Denied</h2>
          <p className="text-sm text-gray-600 max-w-md">
            You do not have permission to access data for branch "{shortBranch}". Mapped branches for your account are: {allowedCompanies?.join(", ")}.
          </p>
          <Link href="/dashboard/sales-user/fees/overdue" className="mt-2 text-sm font-semibold text-primary hover:text-primary-dark underline">
            Go back to Overdue Fees
          </Link>
        </div>
      </div>
    );
  }

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

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    let result = students.filter((s) => {
      if (planFilter !== "all" && s.plan !== planFilter) return false;
      if (frequencyFilter !== "all" && s.no_of_instalments !== frequencyFilter) return false;
      // Not-called filter: only students with no follow-up log in allLogs
      if (notCalledOnly && allLogs && allLogs[s.student_id]) return false;
      return true;
    });
    if (sortOrder === "desc") {
      result = [...result].sort((a, b) => b.total_dues - a.total_dues);
    } else if (sortOrder === "asc") {
      result = [...result].sort((a, b) => a.total_dues - b.total_dues);
    }
    return result;
  }, [students, planFilter, frequencyFilter, notCalledOnly, sortOrder, allLogs]);

  const notCalledCount = useMemo(() => {
    if (!students || !allLogs) return null;
    return students.filter((s) => !allLogs[s.student_id]).length;
  }, [students, allLogs]);

  const totalDues = filteredStudents.reduce((s, st) => s + st.total_dues, 0);
  const hasActiveFilters = planFilter !== "all" || frequencyFilter !== "all" || notCalledOnly || sortOrder !== "none";

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
          href={`/dashboard/sales-user/fees/overdue/${encodeURIComponent(branch)}/${encodeURIComponent(classId)}${childQs}`}
          className="text-text-tertiary hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{batch} — Overdue</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {displayClass} · {shortBranch}
          </p>
        </div>
      </motion.div>

      {/* Summary */}
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
      {!isLoading && students && students.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-text-secondary shrink-0">
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

            {/* Not Called Yet toggle */}
            <button
              onClick={() => setNotCalledOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all shrink-0 ${
                notCalledOnly
                  ? "bg-rose-600 border-rose-600 text-white shadow-sm"
                  : "bg-surface border-border-input text-text-secondary hover:border-rose-400 hover:text-rose-600"
              }`}
            >
              <PhoneCall className="h-3.5 w-3.5" />
              Not Called Yet
              {notCalledCount !== null && (
                <span
                  className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold ${
                    notCalledOnly ? "bg-white text-rose-600" : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {notCalledCount}
                </span>
              )}
            </button>

            {/* Sort by due amount */}
            <button
              onClick={() =>
                setSortOrder((prev) =>
                  prev === "none" ? "desc" : prev === "desc" ? "asc" : "none"
                )
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all shrink-0 ${
                sortOrder !== "none"
                  ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                  : "bg-surface border-border-input text-text-secondary hover:border-amber-400 hover:text-amber-600"
              }`}
            >
              {sortOrder === "asc" ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {sortOrder === "asc"
                ? "Due: Low to High"
                : sortOrder === "desc"
                ? "Due: High to Low"
                : "Sort by Due"}
            </button>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setPlanFilter("all");
                  setFrequencyFilter("all");
                  setNotCalledOnly(false);
                  setSortOrder("none");
                }}
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
        <GifLoader />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load students</p>
        </div>
      ) : !students?.length ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <CalendarClock className="h-8 w-8 text-success" />
          <p className="text-sm text-success font-medium">No overdue fees for this batch!</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <Filter className="h-8 w-8 text-text-tertiary" />
          <p className="text-sm text-text-secondary">No students match the selected filters</p>
        </div>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-3">
          {filteredStudents.map((student, idx) => {
            const planColor = PLAN_COLORS[student.plan] ?? { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" };
            const frequencyLabel = PAYMENT_OPTION_LABELS[student.no_of_instalments] ?? (student.no_of_instalments ? `${student.no_of_instalments} Inst.` : "");
            const isExpanded = expandedIds.has(student.student_id);
            const lastLog = allLogs?.[student.student_id];

            return (
              <motion.div key={student.student_id} variants={itemVariants}>
                <div className="rounded-[12px] border border-border-light bg-surface overflow-hidden">
                  {/* ── Student Header ── */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-lg bg-brand-wash flex items-center justify-center shrink-0 mt-0.5">
                        <GraduationCap className="h-4 w-4 text-primary" />
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        {/* Name row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-text-primary">
                            <span className="text-text-tertiary mr-1.5 font-normal">#{idx + 1}</span>
                            {student.student_name}
                          </p>
                          {student.plan && (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${planColor.bg} ${planColor.text} ${planColor.border}`}>
                              {student.plan}
                            </span>
                          )}
                          {frequencyLabel && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              {frequencyLabel}
                            </span>
                          )}
                        </div>

                        {/* ID + Class */}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <p className="text-xs text-text-tertiary font-mono">{student.student_id}</p>
                          <span className="text-text-tertiary/40 text-xs">·</span>
                          <p className="text-xs text-text-tertiary">{displayClass}</p>
                        </div>

                        {/* Admission date */}
                        {student.joining_date && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-text-secondary">
                            <CalendarDays className="h-3 w-3 text-text-tertiary shrink-0" />
                            <span>Admitted: {formatDate(student.joining_date)}</span>
                          </div>
                        )}

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

                        {/* Follow-up badge or Mark Called button */}
                        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                          {lastLog ? (
                            <>
                              <FollowUpBadge log={lastLog} />
                              <button
                                onClick={() => setDrawerStudent({ student_id: student.student_id, student_name: student.student_name, branch })}
                                className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 underline underline-offset-2"
                              >
                                Log Again
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setDrawerStudent({ student_id: student.student_id, student_name: student.student_name, branch })}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5 text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
                            >
                              <PhoneCall className="h-2.5 w-2.5" />
                              Mark Called
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Overdue total + expand toggle */}
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
                            <>{student.overdue_invoices.length} instalment{student.overdue_invoices.length !== 1 ? "s" : ""} <ChevronDown className="h-3 w-3" /></>
                          )}
                        </button>
                        <StudentTransactionHistory
                          studentId={student.student_id}
                          branch={branch}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Instalment Detail (expandable) ── */}
                  {isExpanded && student.overdue_invoices.length > 0 && (
                    <div className="border-t border-border-light bg-orange-50/20 px-4 py-3 space-y-2">
                      {/* Column header */}
                      <div className="grid grid-cols-4 gap-2 px-1 mb-1">
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide">Instalment</p>
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide text-right">Total</p>
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide text-right">Paid</p>
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide text-right">Balance</p>
                      </div>

                      {student.overdue_invoices.map((inv) => (
                        <div
                          key={inv.name}
                          className="grid grid-cols-4 gap-2 items-center px-3 py-2.5 rounded-lg bg-white border border-orange-100"
                        >
                          {/* Instalment label + due date */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {inv.instalment_label && (
                                <Badge variant="info" className="text-[10px] shrink-0">
                                  {inv.instalment_label}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-text-tertiary mt-0.5">
                              Due: {formatDate(inv.due_date)}
                            </p>
                            <p className="text-[9px] text-text-tertiary/60 font-mono mt-0.5 truncate">{inv.name}</p>
                          </div>

                          {/* Total */}
                          <p className="text-xs font-medium text-text-primary text-right tabular-nums">
                            {formatCurrency(inv.grand_total)}
                          </p>

                          {/* Paid */}
                          <p className={`text-xs font-medium text-right tabular-nums ${(inv.paid ?? 0) > 0 ? "text-success" : "text-text-tertiary"}`}>
                            {formatCurrency(inv.paid ?? 0)}
                          </p>

                          {/* Balance */}
                          <p className="text-xs font-semibold text-orange-600 text-right tabular-nums">
                            {formatCurrency(inv.amount)}
                          </p>
                        </div>
                      ))}

                      {/* Totals row */}
                      <div className="grid grid-cols-4 gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200/60 mt-1">
                        <p className="text-[10px] font-bold text-text-secondary uppercase">Total</p>
                        <p className="text-xs font-bold text-text-primary text-right tabular-nums">
                          {formatCurrency(student.overdue_invoices.reduce((s, i) => s + (i.grand_total ?? 0), 0))}
                        </p>
                        <p className="text-xs font-bold text-success text-right tabular-nums">
                          {formatCurrency(student.overdue_invoices.reduce((s, i) => s + (i.paid ?? 0), 0))}
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

      {/* Follow-Up Drawer */}
      <FollowUpDrawer
        open={drawerStudent !== null}
        onClose={() => setDrawerStudent(null)}
        student={drawerStudent ?? { student_id: "", student_name: "", branch: "" }}
        invalidateKeys={[["followup-batch", branch]]}
      />
    </motion.div>
  );
}
