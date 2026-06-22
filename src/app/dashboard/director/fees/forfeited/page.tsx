"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ChevronDown,
  CircleDollarSign,
  GraduationCap,
  IndianRupee,
  Loader2,
  MessageSquareText,
  ReceiptText,
  Sparkles,
  TriangleAlert,
  UserRoundX,
  Phone,
  X,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/formatters";
import { useAuth } from "@/lib/hooks/useAuth";
import { getDiscontinuedFollowUps, type DiscontinuedFollowUpLog } from "@/lib/api/discontinuedFollowup";
import type {
  ForfeitedBatch,
  ForfeitedStudent,
} from "@/app/api/fees/forfeited-detail/route";

interface ForfeitedResponse {
  batches: ForfeitedBatch[];
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  total_bad_debt: number;
  total_future_forfeited: number;
  student_count: number;
  bad_debt_student_count: number;
}

const surfaceMotion = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

function formatShortDate(date?: string): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date?: string): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function FollowUpDetailsModal({
  student,
  onClose,
}: {
  student: ForfeitedStudent | null;
  onClose: () => void;
}) {
  const studentKey = student?.student_id ?? null;
  const [logState, setLogState] = useState<{
    studentKey: string | null;
    logs: DiscontinuedFollowUpLog[];
    loading: boolean;
  }>({
    studentKey: null,
    logs: [],
    loading: false,
  });

  useEffect(() => {
    if (!studentKey) return;
    let alive = true;
    getDiscontinuedFollowUps(studentKey)
      .then((rows) => {
        if (!alive) return;
        setLogState({ studentKey, logs: rows, loading: false });
      })
      .catch((error) => {
        console.error("[director-followup-details] Error:", error);
        if (!alive) return;
        setLogState({ studentKey, logs: [], loading: false });
      });
    return () => {
      alive = false;
    };
  }, [studentKey]);

  if (!student) return null;

  const loading = studentKey !== logState.studentKey || logState.loading;
  const logs = studentKey === logState.studentKey ? logState.logs : [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(event) => event.stopPropagation()}
          className="mx-auto mt-16 max-h-[80vh] w-[min(720px,calc(100vw-2rem))] overflow-hidden rounded-[24px] border border-sky-100 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.45)]"
        >
          <div className="flex items-start justify-between border-b border-border-light bg-gradient-to-r from-sky-50 via-white to-amber-50/50 px-5 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-sky-700/80">Discontinued Follow-Up</p>
              <h3 className="mt-1 text-lg font-semibold text-text-primary">{student.student_name}</h3>
              <p className="mt-1 text-sm text-text-secondary">{student.student_id}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border-light bg-white p-2 text-text-secondary transition-colors hover:bg-slate-50 hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto px-5 py-5">
            {loading ? (
              <div className="flex h-36 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : logs.length === 0 ? (
              <div className="rounded-2xl border border-border-light bg-slate-50/70 p-5 text-sm text-text-secondary">
                No follow-up details recorded yet.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.name}
                  className="rounded-2xl border border-border-light bg-gradient-to-br from-white to-slate-50/60 p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.5)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="info" className="px-2 py-0.5 text-[10px]">
                          {log.call_status}
                        </Badge>
                        {log.interested_to_rejoin ? (
                          <Badge variant="success" className="px-2 py-0.5 text-[10px]">
                            Interested to Rejoin
                          </Badge>
                        ) : null}
                        {log.followup_outcome ? (
                          <Badge variant="warning" className="px-2 py-0.5 text-[10px]">
                            {log.followup_outcome}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm font-medium text-text-primary">
                        {formatDateTime(log.call_date)} by {log.called_by.split("@")[0]}
                      </p>
                    </div>
                    {log.invoice_outstanding_at_call != null ? (
                      <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-right">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-amber-700/70">Outstanding At Call</p>
                        <p className="mt-1 text-sm font-semibold text-amber-700">
                          {formatCurrency(log.invoice_outstanding_at_call)}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border-light bg-white px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary">Feedback Category</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">
                        {log.feedback_category || "Not recorded"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border-light bg-white px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary">Rejoin Probability</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">
                        {log.rejoin_probability || "Not recorded"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border-light bg-white px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary">Mobile Used</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">
                        {log.latest_mobile_used || "Not recorded"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border-light bg-white px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary">Reason Not Rejoining</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">
                        {log.reason_not_rejoining || "Not recorded"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/60 px-3.5 py-3">
                    <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-sky-700/80">
                      <MessageSquareText className="h-3.5 w-3.5" />
                      Sales User Notes
                    </p>
                    <p className="mt-2 text-sm leading-6 text-text-primary">
                      {log.feedback_notes || "No notes recorded."}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function StudentTile({
  student,
  batchName,
  index,
  onOpenFollowUp,
}: {
  student: ForfeitedStudent;
  batchName: string;
  index: number;
  onOpenFollowUp: (student: ForfeitedStudent) => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.025 }}
      whileHover={{ y: -3, transition: { duration: 0.16 } }}
      className="h-full"
    >
      <Card className="h-full overflow-hidden border border-border-light bg-gradient-to-br from-white via-white to-amber-50/30 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.55)] transition-all duration-200 hover:border-amber-300/60 hover:shadow-[0_18px_38px_-28px_rgba(245,158,11,0.35)]">
        <CardContent className="p-3">
          <div className="flex items-start gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-red-50 text-sm font-semibold text-amber-700 shadow-inner">
              {student.student_name
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0] ?? "")
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="truncate text-[15px] font-semibold text-text-primary">
                  {student.student_name}
                </h3>
                <Badge
                  variant={student.is_bad_debt ? "error" : "warning"}
                  className="px-2 py-0.5 text-[10px]"
                >
                  {student.is_bad_debt ? "Bad Debt" : "Future Due"}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-[12px] text-text-secondary">
                {student.student_id} - {student.branch || "No branch"} - {batchName}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-amber-100 bg-white px-2.5 py-2">
              <p className="text-[9px] uppercase tracking-[0.12em] text-text-tertiary">Invoiced</p>
              <p className="mt-1 text-[15px] font-semibold text-text-primary">
                {formatCurrency(student.total_invoiced_amount)}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-2.5 py-2">
              <p className="text-[9px] uppercase tracking-[0.12em] text-emerald-700/70">Paid</p>
              <p className="mt-1 text-[15px] font-semibold text-emerald-600">
                {formatCurrency(student.paid_amount)}
              </p>
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50/70 px-2.5 py-2">
              <p className="text-[9px] uppercase tracking-[0.12em] text-red-700/70">Bad Debt</p>
              <p className="mt-1 text-[15px] font-semibold text-red-500">
                {formatCurrency(student.overdue_outstanding_amount)}
              </p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50/70 px-2.5 py-2">
              <p className="text-[9px] uppercase tracking-[0.12em] text-amber-700/70">Future Due</p>
              <p className="mt-1 text-[15px] font-semibold text-amber-600">
                {formatCurrency(student.future_outstanding_amount)}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-1.5 rounded-lg border border-border-light bg-slate-50/80 px-2.5 py-2 text-[12px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-text-secondary">Discontinued</span>
              <span className="font-semibold text-red-500">{formatShortDate(student.discontinuation_date)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-text-secondary">Overdue invoices</span>
              <span className="font-semibold text-text-primary">{student.overdue_invoice_count}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-text-secondary">Days overdue</span>
              <span className={`font-semibold ${student.days_overdue > 0 ? "text-red-500" : "text-text-primary"}`}>
                {student.days_overdue > 0 ? `${student.days_overdue} days` : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-text-secondary">Invoices alive</span>
              <span className="font-semibold text-text-primary">
                {student.invoice_count} invoice{student.invoice_count === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-white px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-[0.12em] text-text-tertiary">Reason</p>
            <p className="mt-1 line-clamp-2 text-[13px] font-medium text-red-500">
              {student.reason || "No reason recorded"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => student.latest_followup && onOpenFollowUp(student)}
            className={`mt-3 w-full rounded-lg border border-sky-100 bg-sky-50/50 px-2.5 py-2 text-left transition-all ${
              student.latest_followup
                ? "hover:border-sky-200 hover:bg-sky-50 hover:shadow-[0_10px_22px_-20px_rgba(14,165,233,0.7)]"
                : "cursor-default"
            }`}
          >
            <p className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] text-sky-700/80">
              <Phone className="h-3 w-3" />
              {student.latest_followup ? "Open Follow-Up Details" : "Latest Follow-Up"}
            </p>
            {student.latest_followup ? (
              <div className="mt-1.5 space-y-1 text-[12px]">
                <p className="font-medium text-text-primary">
                  {student.latest_followup.call_status}
                  {student.latest_followup.interested_to_rejoin ? (
                    <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">
                      Interested
                    </span>
                  ) : null}
                </p>
                <p className="text-text-secondary">
                  {formatShortDate(student.latest_followup.call_date)} by {student.latest_followup.called_by.split("@")[0]}
                </p>
                {student.latest_followup.feedback_category ? (
                  <p className="text-text-secondary">
                    Feedback: <span className="font-medium text-text-primary">{student.latest_followup.feedback_category}</span>
                  </p>
                ) : null}
                <p className="pt-0.5 text-[11px] font-medium text-sky-700">Click to view full details</p>
              </div>
            ) : (
              <p className="mt-1 text-[12px] text-text-tertiary">No sales feedback recorded yet.</p>
            )}
          </button>

          <div className="mt-3">
            <Link
              href="/dashboard/director/students"
              className="inline-flex w-full items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2 text-[13px] font-medium text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-50"
            >
              Open students list
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.article>
  );
}

export default function DirectorForfeitedFeesPage() {
  const { defaultCompany } = useAuth();
  const [pageState, setPageState] = useState<{
    companyKey: string;
    data: ForfeitedResponse;
  }>({
    companyKey: defaultCompany ?? "",
    data: {
      batches: [],
      total_invoiced: 0,
      total_paid: 0,
      total_outstanding: 0,
      total_bad_debt: 0,
      total_future_forfeited: 0,
      student_count: 0,
      bad_debt_student_count: 0,
    },
  });
  const [openBatches, setOpenBatches] = useState<Set<string>>(new Set());
  const [selectedStudent, setSelectedStudent] = useState<ForfeitedStudent | null>(null);

  useEffect(() => {
    let alive = true;
    const companyKey = defaultCompany ?? "";

    fetch(
      `/api/fees/forfeited-detail${defaultCompany ? `?company=${encodeURIComponent(defaultCompany)}` : ""}`,
      { credentials: "include" },
    )
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error("Failed to load forfeited fee details")),
      )
      .then((payload: ForfeitedResponse) => {
        if (!alive) return;
        setPageState({ companyKey, data: payload });
        if (payload.batches.length > 0) {
          setOpenBatches(new Set([payload.batches[0].batch_name]));
        }
      })
      .catch((error) => {
        console.error("[director-forfeited-fees] Error:", error);
        if (!alive) return;
        setPageState({
          companyKey,
          data: {
            batches: [],
            total_invoiced: 0,
            total_paid: 0,
            total_outstanding: 0,
            total_bad_debt: 0,
            total_future_forfeited: 0,
            student_count: 0,
            bad_debt_student_count: 0,
          },
        });
      });

    return () => {
      alive = false;
    };
  }, [defaultCompany]);

  const loading = pageState.companyKey !== (defaultCompany ?? "");
  const data = pageState.data;
  const batchCount = data.batches.length;
  const totalInvoiceCount = useMemo(
    () =>
      data.batches.reduce(
        (sum, batch) =>
          sum + batch.students.reduce((count, student) => count + student.invoice_count, 0),
        0,
      ),
    [data.batches],
  );

  const toggleBatch = (batchName: string) => {
    setOpenBatches((current) => {
      const next = new Set(current);
      if (next.has(batchName)) next.delete(batchName);
      else next.add(batchName);
      return next;
    });
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      <motion.section
        variants={surfaceMotion}
        className="overflow-hidden rounded-[24px] border border-amber-200/70 bg-gradient-to-br from-white via-amber-50/40 to-red-50/50 shadow-[0_28px_70px_-42px_rgba(245,158,11,0.4)]"
      >
        <div className="relative overflow-hidden px-6 py-6 sm:px-8">
          <div className="absolute -right-12 top-0 h-40 w-40 rounded-full bg-amber-200/25 blur-3xl" />
          <div className="absolute right-20 top-12 h-20 w-20 rounded-full bg-red-200/20 blur-2xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-red-50 text-amber-600 shadow-[0_14px_28px_-20px_rgba(245,158,11,0.55)]">
                <UserRoundX className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-text-primary">Forfeited Fees Details</h1>
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
              <p className="mt-2 max-w-2xl text-sm text-text-secondary">
                Drill into discontinued students and separate real bad debt from future-due
                forfeited balances.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                {
                  label: "Students",
                  value: data.student_count,
                  icon: UserRoundX,
                  tone: "text-amber-600 bg-amber-50 border-amber-100",
                },
                {
                  label: "Classes",
                  value: batchCount,
                  icon: GraduationCap,
                  tone: "text-sky-600 bg-sky-50 border-sky-100",
                },
                {
                  label: "Bad Debt",
                  value: data.bad_debt_student_count,
                  icon: TriangleAlert,
                  tone: "text-red-600 bg-red-50 border-red-100",
                },
                {
                  label: "Invoices",
                  value: totalInvoiceCount,
                  icon: ReceiptText,
                  tone: "text-violet-600 bg-violet-50 border-violet-100",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-xl border px-3 py-2.5 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.35)] ${item.tone}`}
                >
                  <item.icon className="h-4 w-4" />
                  <p className="mt-1.5 text-base font-semibold">{item.value}</p>
                  <p className="text-[10px] uppercase tracking-[0.12em] opacity-75">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={surfaceMotion} className="grid gap-3 lg:grid-cols-3">
        <Card className="overflow-hidden border-border-light bg-gradient-to-br from-white to-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
              <ReceiptText className="h-4 w-4 text-amber-500" />
              Total Invoiced
            </div>
            <p className="mt-2 text-xl font-bold text-text-primary">{formatCurrency(data.total_invoiced)}</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-emerald-700/70">
              <CircleDollarSign className="h-4 w-4 text-emerald-500" />
              Amount Paid
            </div>
            <p className="mt-2 text-xl font-bold text-emerald-600">{formatCurrency(data.total_paid)}</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-red-100 bg-gradient-to-br from-white to-red-50/70">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-red-700/70">
              <TriangleAlert className="h-4 w-4 text-red-500" />
              Bad Debt
            </div>
            <p className="mt-2 text-xl font-bold text-red-500">{formatCurrency(data.total_bad_debt)}</p>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section variants={surfaceMotion} className="grid gap-3 lg:grid-cols-2">
        <Card className="overflow-hidden border-amber-100 bg-gradient-to-br from-white to-amber-50/70">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-amber-700/70">
              <CalendarClock className="h-4 w-4 text-amber-500" />
              Future Forfeited
            </div>
            <p className="mt-2 text-xl font-bold text-amber-600">{formatCurrency(data.total_future_forfeited)}</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-rose-100 bg-gradient-to-br from-white to-rose-50/70">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-rose-700/70">
              <IndianRupee className="h-4 w-4 text-rose-500" />
              Total Forfeited
            </div>
            <p className="mt-2 text-xl font-bold text-rose-600">{formatCurrency(data.total_outstanding)}</p>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section variants={surfaceMotion} className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : data.batches.length === 0 ? (
          <Card>
            <CardContent className="flex h-48 flex-col items-center justify-center text-center">
              <TriangleAlert className="h-8 w-8 text-text-tertiary" />
              <p className="mt-4 text-base font-medium text-text-primary">
                No discontinued students with retained invoices found.
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Once a discontinued student still has invoices on record, they will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          data.batches.map((batch) => {
            const isOpen = openBatches.has(batch.batch_name);
            return (
              <Card
                key={batch.batch_name}
                className="overflow-hidden border border-border-light shadow-[0_22px_50px_-36px_rgba(15,23,42,0.45)]"
              >
                <button
                  type="button"
                  onClick={() => toggleBatch(batch.batch_name)}
                  className="w-full bg-gradient-to-r from-white via-slate-50 to-amber-50/40 px-5 py-4 text-left transition-colors hover:from-amber-50/30 hover:to-amber-50/70"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-text-primary">{batch.batch_name}</h2>
                        <p className="mt-1 text-xs text-text-secondary">
                          {batch.students.length} student{batch.students.length === 1 ? "" : "s"} in this forfeited bucket
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-lg border border-border-light bg-white px-3 py-2 text-right shadow-[0_10px_24px_-20px_rgba(15,23,42,0.35)]">
                        <p className="text-[9px] uppercase tracking-[0.12em] text-text-tertiary">Paid</p>
                        <p className="text-sm font-semibold text-emerald-600">{formatCurrency(batch.total_paid)}</p>
                      </div>
                      <div className="rounded-lg border border-border-light bg-white px-3 py-2 text-right shadow-[0_10px_24px_-20px_rgba(15,23,42,0.35)]">
                        <p className="text-[9px] uppercase tracking-[0.12em] text-text-tertiary">Bad Debt</p>
                        <p className="text-sm font-semibold text-red-500">{formatCurrency(batch.total_bad_debt)}</p>
                      </div>
                      <div className="rounded-lg border border-border-light bg-white px-3 py-2 text-right shadow-[0_10px_24px_-20px_rgba(15,23,42,0.35)]">
                        <p className="text-[9px] uppercase tracking-[0.12em] text-text-tertiary">Future Due</p>
                        <p className="text-sm font-semibold text-amber-600">{formatCurrency(batch.total_future_forfeited)}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border-light bg-white text-text-secondary shadow-[0_10px_24px_-20px_rgba(15,23,42,0.35)]">
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                      className="overflow-hidden border-t border-border-light bg-slate-50/40"
                    >
                      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                        {batch.students.map((student, index) => (
                          <StudentTile
                            key={student.student_id}
                            student={student}
                            batchName={batch.batch_name}
                            index={index}
                            onOpenFollowUp={setSelectedStudent}
                          />
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </Card>
            );
          })
        )}
      </motion.section>

      <FollowUpDetailsModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />
    </motion.div>
  );
}
