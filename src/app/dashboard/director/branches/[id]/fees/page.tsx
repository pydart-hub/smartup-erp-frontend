"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  IndianRupee,
  School,
  ChevronRight,
  Loader2,
  AlertCircle,
  CircleCheck,
  Clock,
  TriangleAlert,
  CalendarClock,
  Wifi,
  Banknote,
  X,
  Smartphone,
  Building2,
  FileText,
  HelpCircle,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getBranchInvoiceStats, getBranchProgramFeeStats, getBranchForfeitedFees, getBranchCollectedByMode, getDuesTodayByClass } from "@/lib/api/director";
import type { CollectedByMode } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

const OFFLINE_MODES: { key: keyof CollectedByMode; label: string; icon: React.ElementType; color: string; bg: string; bar: string }[] = [
  { key: "cash", label: "Cash", icon: Banknote, color: "text-emerald-600", bg: "bg-emerald-50", bar: "bg-emerald-500" },
  { key: "upi", label: "UPI", icon: Smartphone, color: "text-violet-600", bg: "bg-violet-50", bar: "bg-violet-500" },
  { key: "bank_transfer", label: "Bank Transfer", icon: Building2, color: "text-sky-600", bg: "bg-sky-50", bar: "bg-sky-500" },
  { key: "cheque", label: "Cheque", icon: FileText, color: "text-amber-600", bg: "bg-amber-50", bar: "bg-amber-500" },
  { key: "other", label: "Other", icon: HelpCircle, color: "text-gray-500", bg: "bg-gray-50", bar: "bg-gray-400" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export default function BranchFeesPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.id as string);
  const shortName = branchName.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const encodedBranch = encodeURIComponent(branchName);
  const [showCollectedModal, setShowCollectedModal] = useState(false);
  const [offlineExpanded, setOfflineExpanded] = useState(false);

  const { data: invoiceStats, isLoading: loadInvoices } = useQuery({
    queryKey: ["director-branch-invoice-stats", branchName],
    queryFn: () => getBranchInvoiceStats(branchName),
    staleTime: 120_000,
  });

  const { data: forfeitedTotal, isLoading: loadForfeited } = useQuery({
    queryKey: ["director-branch-forfeited-fees", branchName],
    queryFn: () => getBranchForfeitedFees(branchName),
    staleTime: 120_000,
  });

  const { data: collectedByMode, isLoading: loadCollectedByMode } = useQuery({
    queryKey: ["director-branch-collected-by-mode", branchName],
    queryFn: () => getBranchCollectedByMode(branchName),
    staleTime: 120_000,
  });

  const {
    data: programStats,
    isLoading: loadPrograms,
    isError: programError,
  } = useQuery({
    queryKey: ["director-branch-program-fees", branchName],
    queryFn: () => getBranchProgramFeeStats(branchName),
    staleTime: 120_000,
  });

  const { data: dueClasses, isLoading: loadDues } = useQuery({
    queryKey: ["director-dues-classes", branchName],
    queryFn: () => getDuesTodayByClass(branchName),
    staleTime: 30_000,
  });

  const duesToday = (dueClasses ?? []).reduce((s, c) => s + c.total_dues, 0);
  const dueStudentCount = (dueClasses ?? []).reduce((s, c) => s + c.student_count, 0);

  // Build a lookup: program name → dues amount
  const duesByProgram = new Map<string, number>();
  for (const c of dueClasses ?? []) {
    duesByProgram.set(c.item_code.replace(" Tuition Fee", ""), c.total_dues);
  }

  const totalFees = invoiceStats?.totalInvoiced ?? 0;
  const totalCollected = invoiceStats?.totalCollected ?? 0;
  const forfeited = forfeitedTotal ?? 0;
  const totalPending = (invoiceStats?.totalOutstanding ?? 0) - forfeited;
  const invoiceCount = invoiceStats?.count ?? 0;

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
            <h1 className="text-2xl font-bold text-text-primary">Fees — {shortName}</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Submitted invoices only · {invoiceCount} invoice{invoiceCount !== 1 ? "s" : ""}
            </p>
          </div>
          <Badge variant="outline" className="self-start text-xs">{branchName}</Badge>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="border-border-light">
          <CardContent className="p-4 text-center">
            <IndianRupee className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">
              {loadInvoices ? "..." : formatCurrency(totalFees)}
            </p>
            <p className="text-xs text-text-tertiary">Total Fees</p>
          </CardContent>
        </Card>
        <Card
          className="border-success/20 hover:shadow-md hover:border-success/40 transition-all cursor-pointer"
          onClick={() => setShowCollectedModal(true)}
        >
          <CardContent className="p-4 text-center">
            <CircleCheck className="h-5 w-5 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-success">
              {loadInvoices ? "..." : formatCurrency(totalCollected)}
            </p>
            <p className="text-xs text-text-tertiary">Collected</p>
            <div className="flex justify-center gap-3 mt-2">
              <div className="text-center">
                <div className="flex items-center justify-center gap-0.5">
                  <Wifi className="h-3 w-3 text-blue-500" />
                  <p className="text-xs font-semibold text-blue-600">
                    {loadCollectedByMode ? "..." : formatCurrency(collectedByMode?.razorpay ?? 0)}
                  </p>
                </div>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Razorpay</p>
              </div>
              <div className="w-px bg-border-light" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-0.5">
                  <Banknote className="h-3 w-3 text-green-500" />
                  <p className="text-xs font-semibold text-green-600">
                    {loadCollectedByMode ? "..." : formatCurrency(collectedByMode?.razorpay != null ? (collectedByMode.total - collectedByMode.razorpay) : 0)}
                  </p>
                </div>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Offline</p>
              </div>
            </div>
            <p className="text-[10px] text-primary mt-2 font-medium">Tap for details</p>
          </CardContent>
        </Card>
        <Card className="border-error/20">
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 text-error mx-auto mb-2" />
            <p className="text-2xl font-bold text-error">
              {loadInvoices ? "..." : formatCurrency(totalPending)}
            </p>
            <p className="text-xs text-text-tertiary">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200/60">
          <CardContent className="p-4 text-center">
            <TriangleAlert className="h-5 w-5 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-600">
              {loadForfeited ? "..." : formatCurrency(forfeited)}
            </p>
            <p className="text-xs text-text-tertiary">Forfeited</p>
            <p className="text-[10px] text-text-tertiary">Discontinued</p>
          </CardContent>
        </Card>
        <Link href={`/dashboard/director/dues/${encodedBranch}`}>
          <Card className="h-full border-orange-200/60 hover:shadow-md hover:border-orange-300 transition-all cursor-pointer">
            <CardContent className="p-4 text-center">
              <CalendarClock className="h-5 w-5 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">
                {loadDues ? "..." : formatCurrency(duesToday)}
              </p>
              <p className="text-xs text-text-tertiary">Dues Till Today</p>
              {!loadDues && dueStudentCount > 0 && (
                <p className="text-[10px] text-orange-500 mt-1">{dueStudentCount} student{dueStudentCount !== 1 ? "s" : ""}</p>
              )}
              <ChevronRight className="h-3.5 w-3.5 text-orange-400 mx-auto mt-1" />
            </CardContent>
          </Card>
        </Link>
      </motion.div>

      {/* Program-wise breakdown */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-text-primary mb-3">By Program / Class</h2>

        {loadPrograms ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
          </div>
        ) : programError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <AlertCircle className="h-8 w-8 text-error" />
            <p className="text-sm text-error">Failed to load program stats</p>
          </div>
        ) : !programStats?.length ? (
          <div className="flex flex-col items-center justify-center h-48">
            <School className="h-8 w-8 text-text-tertiary mb-2" />
            <p className="text-sm text-text-tertiary">No invoice data found for this branch</p>
          </div>
        ) : (
          <div className="space-y-3">
            {programStats.map((p) => (
              <Link
                key={p.program}
                href={`/dashboard/director/branches/${encodedBranch}/fees/${encodeURIComponent(p.program)}`}
              >
                <div className="flex items-center gap-3 p-3 rounded-[10px] border border-border-light bg-surface hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-brand-wash flex items-center justify-center shrink-0">
                    <School className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{p.program}</p>
                    <p className="text-xs text-text-tertiary">{p.count} invoice{p.count !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-text-primary">{formatCurrency(p.totalInvoiced)}</p>
                      <p className="text-[10px] text-text-tertiary">total</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-success">{formatCurrency(p.totalCollected)}</p>
                      <p className="text-[10px] text-success/70 flex items-center justify-end gap-0.5">
                        <CircleCheck className="h-2.5 w-2.5" /> collected
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-error">{formatCurrency(p.totalOutstanding - p.forfeitedFees)}</p>
                      <p className="text-[10px] text-error/70 flex items-center justify-end gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> pending
                      </p>
                    </div>
                    {(() => {
                      const dues = duesByProgram.get(p.program) ?? 0;
                      return (
                        <div className="text-right">
                          <p className={`text-sm font-bold ${dues > 0 ? "text-orange-600" : "text-text-tertiary"}`}>
                            {formatCurrency(dues)}
                          </p>
                          <p className="text-[10px] text-orange-500/80 flex items-center justify-end gap-0.5">
                            <CalendarClock className="h-2.5 w-2.5" /> overdue
                          </p>
                        </div>
                      );
                    })()}
                    <div className="text-right">
                      <p className={`text-sm font-bold ${p.forfeitedFees > 0 ? "text-amber-600" : "text-text-tertiary"}`}>
                        {formatCurrency(p.forfeitedFees)}
                      </p>
                      <p className="text-[10px] text-amber-500/80 flex items-center justify-end gap-0.5">
                        <TriangleAlert className="h-2.5 w-2.5" /> forfeited
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-tertiary ml-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      {/* Collected Breakdown Modal */}
      <AnimatePresence>
        {showCollectedModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowCollectedModal(false); setOfflineExpanded(false); }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              className="fixed inset-x-4 top-[12%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-50"
            >
              <div className="bg-surface rounded-2xl border border-border-light shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="relative bg-gradient-to-br from-success/10 via-emerald-50 to-teal-50 dark:from-success/5 dark:via-success/5 dark:to-success/5 px-6 pt-5 pb-4">
                  <button
                    onClick={() => { setShowCollectedModal(false); setOfflineExpanded(false); }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-black/5 transition-colors"
                  >
                    <X className="h-4 w-4 text-text-tertiary" />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center">
                      <CircleCheck className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text-primary">Collection Breakdown</h3>
                      <p className="text-xs text-text-secondary">{shortName}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-extrabold text-success tracking-tight">
                      {formatCurrency(collectedByMode?.total ?? totalCollected)}
                    </p>
                    <p className="text-xs text-text-tertiary mt-0.5">Total collected</p>
                  </div>
                </div>

                {/* Two-level breakdown */}
                <div className="px-6 py-4 space-y-3">
                  {loadCollectedByMode ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin h-5 w-5 text-text-tertiary" />
                    </div>
                  ) : (() => {
                    const total = collectedByMode?.total || 1;
                    const razorpayAmt = collectedByMode?.razorpay ?? 0;
                    const offlineAmt = total - razorpayAmt;
                    const razorpayPct = Math.round((razorpayAmt / total) * 100);
                    const offlinePct = 100 - razorpayPct;

                    if (total <= 1) {
                      return (
                        <div className="text-center py-8">
                          <Banknote className="h-8 w-8 text-text-tertiary mx-auto mb-2" />
                          <p className="text-sm text-text-tertiary">No payments recorded</p>
                        </div>
                      );
                    }

                    return (
                      <>
                        {/* Razorpay row */}
                        <motion.div
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 }}
                        >
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                              <Wifi className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-semibold text-text-primary">Razorpay</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-bold text-blue-600">{formatCurrency(razorpayAmt)}</span>
                                  <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                    {razorpayPct}%
                                  </span>
                                </div>
                              </div>
                              <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${razorpayPct}%` }}
                                  transition={{ delay: 0.25, duration: 0.6, ease: "easeOut" }}
                                  className="h-full rounded-full bg-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        {/* Offline row (expandable) */}
                        <motion.div
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.12 }}
                        >
                          <button
                            onClick={() => setOfflineExpanded((prev) => !prev)}
                            className="w-full text-left"
                          >
                            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              offlineExpanded
                                ? "bg-emerald-50/80 border-emerald-200 shadow-sm"
                                : "bg-emerald-50/50 border-emerald-100 hover:border-emerald-200 hover:shadow-sm"
                            }`}>
                              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                                <Banknote className="h-5 w-5 text-emerald-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-text-primary">Offline</span>
                                    <ChevronRight className={`h-3.5 w-3.5 text-text-tertiary transition-transform duration-200 ${
                                      offlineExpanded ? "rotate-90" : ""
                                    }`} />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-base font-bold text-emerald-600">{formatCurrency(offlineAmt)}</span>
                                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                                      {offlinePct}%
                                    </span>
                                  </div>
                                </div>
                                <div className="w-full h-2.5 bg-emerald-100 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${offlinePct}%` }}
                                    transition={{ delay: 0.32, duration: 0.6, ease: "easeOut" }}
                                    className="h-full rounded-full bg-emerald-500"
                                  />
                                </div>
                              </div>
                            </div>
                          </button>

                          {/* Offline sub-modes (expandable) */}
                          <AnimatePresence>
                            {offlineExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <div className="ml-5 mt-2 pl-5 border-l-2 border-emerald-200 space-y-2">
                                  {OFFLINE_MODES
                                    .map((m) => ({ ...m, amount: collectedByMode?.[m.key] ?? 0 }))
                                    .filter((m) => m.amount > 0)
                                    .sort((a, b) => b.amount - a.amount)
                                    .map((m, i) => {
                                      const subPct = offlineAmt > 0 ? Math.round((m.amount / offlineAmt) * 100) : 0;
                                      const Icon = m.icon;
                                      return (
                                        <motion.div
                                          key={m.key}
                                          initial={{ opacity: 0, x: -8 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: i * 0.05 }}
                                          className="flex items-center gap-2.5 py-2 px-3 rounded-lg hover:bg-white/60 transition-colors"
                                        >
                                          <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center shrink-0`}>
                                            <Icon className={`h-3.5 w-3.5 ${m.color}`} />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-medium text-text-primary">{m.label}</span>
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-bold text-text-primary">{formatCurrency(m.amount)}</span>
                                                <span className={`text-[10px] font-semibold ${m.color} px-1.5 py-0.5 rounded-md bg-white/70`}>
                                                  {subPct}%
                                                </span>
                                              </div>
                                            </div>
                                            <div className="w-full h-1.5 bg-border-light/40 rounded-full overflow-hidden mt-1">
                                              <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${subPct}%` }}
                                                transition={{ delay: i * 0.05 + 0.15, duration: 0.4, ease: "easeOut" }}
                                                className={`h-full rounded-full ${m.bar}`}
                                              />
                                            </div>
                                          </div>
                                        </motion.div>
                                      );
                                    })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </>
                    );
                  })()}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-border-light bg-app-bg/50">
                  <p className="text-[10px] text-text-tertiary text-center">
                    Based on submitted Payment Entry records
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

