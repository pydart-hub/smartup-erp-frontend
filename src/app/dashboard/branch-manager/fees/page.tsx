"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  ArrowRight,
  Loader2,
  Clock,
  UserX,
  ChevronDown,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/formatters";
import { getPayments } from "@/lib/api/fees";
import { getSalesInvoices } from "@/lib/api/sales";
import type { PaymentEntry, FeeReportSummary } from "@/lib/types/fee";
import type { SalesInvoice } from "@/lib/types/sales";
import { useAuth } from "@/lib/hooks/useAuth";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function FeesPage() {
  const { defaultCompany } = useAuth();

  const [summary, setSummary] = useState<FeeReportSummary | null>(null);
  const [pendingFees, setPendingFees] = useState<SalesInvoice[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Discontinued write-offs
  const [discontinuedData, setDiscontinuedData] = useState<{
    students: {
      student_id: string;
      student_name: string;
      branch: string;
      discontinuation_date: string;
      reason: string;
      total_written_off: number;
    }[];
    total_written_off: number;
  } | null>(null);

  const today = new Date().toISOString().split("T")[0];

  // Active (non-discontinued) pending invoices
  const activePendingFees = useMemo(() => {
    if (!discontinuedData?.students.length) return pendingFees;
    const discIds = new Set(discontinuedData.students.map((s) => s.student_id));
    return pendingFees.filter((inv) => !inv.student || !discIds.has(inv.student));
  }, [pendingFees, discontinuedData]);

  const overdueInvoices = activePendingFees.filter((inv) => !!inv.due_date && inv.due_date < today);
  const overdueTotal = overdueInvoices.reduce((s, inv) => s + inv.outstanding_amount, 0);

  const forfeitedTotal = useMemo(() => {
    if (!discontinuedData?.students.length) return 0;
    const discIds = new Set(discontinuedData.students.map((s) => s.student_id));
    return pendingFees
      .filter((inv) => inv.student && discIds.has(inv.student))
      .reduce((sum, inv) => sum + inv.outstanding_amount, 0);
  }, [pendingFees, discontinuedData]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/fees/report-summary${defaultCompany ? `?company=${encodeURIComponent(defaultCompany)}` : ""}`, { credentials: "include" })
        .then((r) => r.ok ? r.json() : null)
        .catch(() => null),
      getSalesInvoices({
        outstanding_only: true,
        docstatus: 1,
        limit_page_length: 50,
        order_by: "due_date asc",
        ...(defaultCompany ? { company: defaultCompany } : {}),
      }),
      getPayments({
        limit_page_length: 5,
        ...(defaultCompany ? { company: defaultCompany } : {}),
      }),
      fetch(`/api/fees/discontinued-summary${defaultCompany ? `?company=${encodeURIComponent(defaultCompany)}` : ""}`, { credentials: "include" })
        .then((r) => r.ok ? r.json() : null)
        .catch(() => null),
    ])
      .then(([summaryData, invoicesRes, paymentsRes, discData]) => {
        if (summaryData) setSummary({
          total_fees: summaryData.total_fees ?? 0,
          total_collected: summaryData.total_collected ?? 0,
          total_pending: summaryData.total_pending ?? 0,
          collection_rate: summaryData.collection_rate ?? 0,
        });
        setPendingFees(invoicesRes.data);
        setRecentPayments(paymentsRes.data);
        if (discData) setDiscontinuedData(discData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [defaultCompany]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Fee Management</h1>
          <p className="text-sm text-text-secondary mt-0.5">Track fees, payments, and generate reports</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-[14px] bg-surface animate-pulse border border-border-light" />
          ))
        ) : (
          <>
            <StatsCard
              title="Total Fees"
              value={formatCurrency(summary?.total_fees ?? 0)}
              icon={<IndianRupee className="h-5 w-5" />}
              color="info"
            />
            <StatsCard
              title="Collected"
              value={formatCurrency(summary?.total_collected ?? 0)}
              icon={<TrendingUp className="h-5 w-5" />}
              color="success"
            />
            <StatsCard
              title="Pending"
              value={formatCurrency(summary?.total_pending ?? 0)}
              icon={<AlertTriangle className="h-5 w-5" />}
              color="warning"
              href="/dashboard/branch-manager/fees/pending"
            />
            <StatsCard
              title="Overdue"
              value={overdueInvoices.length > 0 ? `${overdueInvoices.length} (${formatCurrency(overdueTotal)})` : "None"}
              icon={<Clock className="h-5 w-5" />}
              color={overdueInvoices.length > 0 ? "error" : "success"}
              href="/dashboard/branch-manager/fees/pending"
            />
            <StatsCard
              title="Collection Rate"
              value={`${(summary?.collection_rate ?? 0).toFixed(1)}%`}
              icon={<BarChart3 className="h-5 w-5" />}
              color="primary"
            />
            <StatsCard
              title="Forfeited Fees"
              value={forfeitedTotal > 0 ? formatCurrency(forfeitedTotal) : "None"}
              icon={<UserX className="h-5 w-5" />}
              color={forfeitedTotal > 0 ? "error" : "success"}
              href="/dashboard/branch-manager/fees/forfeited"
            />
          </>
        )}
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Fees — grouped by student */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pending Fees</CardTitle>
                <Link href="/dashboard/branch-manager/fees/pending">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : activePendingFees.length === 0 ? (
                <p className="text-center text-text-secondary text-sm py-8">No pending fees found.</p>
              ) : (
                <StudentGroupedFees
                  invoices={activePendingFees}
                  discontinuedStudents={[]}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Payments */}
        <motion.div variants={itemVariants}>
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : recentPayments.length === 0 ? (
                <p className="text-center text-text-secondary text-sm py-8">No payments found.</p>
              ) : (
                <div className="space-y-3">
                  {recentPayments.map((payment, index) => (
                    <motion.div
                      key={payment.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-[10px] bg-app-bg border border-border-light"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">{payment.party_name || payment.party}</p>
                        <p className="text-xs text-text-tertiary">
                          {payment.mode_of_payment || "—"} &middot; {payment.posting_date}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-success">
                        {formatCurrency(payment.paid_amount)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Discontinued Write-offs */}
      {discontinuedData && discontinuedData.students.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserX className="h-4 w-4 text-error" />
                  <CardTitle>Discontinued Students — Write-offs</CardTitle>
                </div>
                <Badge variant="error">
                  {formatCurrency(discontinuedData.total_written_off)} written off
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light">
                      <th className="text-left pb-3 font-semibold text-text-secondary">Student</th>
                      <th className="text-left pb-3 font-semibold text-text-secondary">Date</th>
                      <th className="text-left pb-3 font-semibold text-text-secondary">Reason</th>
                      <th className="text-right pb-3 font-semibold text-text-secondary">Amount Written Off</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discontinuedData.students.map((stu) => (
                      <tr key={stu.student_id} className="border-b border-border-light last:border-0 hover:bg-brand-wash/30 transition-colors">
                        <td className="py-3">
                          <Link
                            href={`/dashboard/branch-manager/students/${encodeURIComponent(stu.student_id)}`}
                            className="font-medium text-text-primary hover:text-primary transition-colors"
                          >
                            {stu.student_name}
                          </Link>
                          <p className="text-xs text-text-tertiary">{stu.student_id}</p>
                        </td>
                        <td className="py-3 text-text-secondary text-xs">
                          {stu.discontinuation_date
                            ? new Date(stu.discontinuation_date).toLocaleDateString("en-IN", {
                                day: "numeric", month: "short", year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="py-3">
                          <Badge variant="default">{stu.reason || "—"}</Badge>
                        </td>
                        <td className="py-3 text-right font-semibold text-error">
                          {stu.total_written_off > 0 ? formatCurrency(stu.total_written_off) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Student-grouped pending fees with accordion ──────────────────

interface StudentGroup {
  studentName: string;
  studentId?: string;
  invoices: SalesInvoice[];
  totalOutstanding: number;
  isDiscontinued: boolean;
}

function StudentGroupedFees({
  invoices,
  discontinuedStudents,
}: {
  invoices: SalesInvoice[];
  discontinuedStudents: { student_id: string; student_name: string }[];
}) {
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const discontinuedIds = useMemo(
    () => new Set(discontinuedStudents.map((s) => s.student_id)),
    [discontinuedStudents],
  );

  const groups: StudentGroup[] = useMemo(() => {
    const map = new Map<string, StudentGroup>();
    for (const inv of invoices) {
      const key = inv.customer_name || inv.customer;
      if (!map.has(key)) {
        map.set(key, {
          studentName: key,
          studentId: inv.student,
          invoices: [],
          totalOutstanding: 0,
          isDiscontinued: !!inv.student && discontinuedIds.has(inv.student),
        });
      }
      const group = map.get(key)!;
      group.invoices.push(inv);
      group.totalOutstanding += inv.outstanding_amount;
    }
    return Array.from(map.values());
  }, [invoices, discontinuedIds]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="divide-y divide-border-light">
      {groups.map((group) => {
        const isOpen = expandedStudent === group.studentName;
        const hasOverdue = group.invoices.some((inv) => !!inv.due_date && inv.due_date < today);

        return (
          <div key={group.studentName}>
            {/* Student row — click to expand */}
            <button
              type="button"
              onClick={() => setExpandedStudent(isOpen ? null : group.studentName)}
              className="w-full flex items-center justify-between py-3 px-1 hover:bg-brand-wash/30 transition-colors text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ChevronDown
                  className={`h-4 w-4 text-text-tertiary shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
                <span className="text-sm font-semibold text-text-primary truncate">
                  {group.studentName}
                </span>
                {group.isDiscontinued && (
                  <Badge variant="error">Discontinued</Badge>
                )}
                {hasOverdue && !group.isDiscontinued && (
                  <Badge variant="error">Overdue</Badge>
                )}
                <span className="text-xs text-text-tertiary">
                  {group.invoices.length} invoice{group.invoices.length !== 1 ? "s" : ""}
                </span>
              </div>
              <span className={`text-sm font-bold shrink-0 ml-3 ${group.isDiscontinued ? "text-error line-through" : "text-warning"}`}>
                {formatCurrency(group.totalOutstanding)}
              </span>
            </button>

            {/* Expanded invoice list */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pl-7 pr-1 pb-3 space-y-1.5">
                    {group.invoices.map((inv) => {
                      const dueDate = inv.due_date || inv.posting_date;
                      const isOverdue = !!inv.due_date && inv.due_date < today;
                      return (
                        <div
                          key={inv.name}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-app-bg text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-text-secondary">{inv.name}</span>
                            <span className={isOverdue ? "text-error font-semibold" : "text-text-tertiary"}>
                              {dueDate
                                ? new Date(dueDate).toLocaleDateString("en-IN", {
                                    day: "numeric", month: "short", year: "numeric",
                                  })
                                : "—"}
                              {isOverdue && <span className="ml-1 text-[10px] font-bold">OVERDUE</span>}
                            </span>
                            <Badge variant={
                              inv.status === "Overdue" ? "error"
                                : inv.status === "Partly Paid" ? "warning"
                                : inv.status === "Unpaid" ? "warning"
                                : "info"
                            }>
                              {inv.status}
                            </Badge>
                          </div>
                          <span className="font-semibold text-text-primary ml-2 shrink-0">
                            {formatCurrency(inv.outstanding_amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}