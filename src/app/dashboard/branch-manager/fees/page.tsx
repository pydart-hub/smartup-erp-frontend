"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  FileText,
  CreditCard,
  BarChart3,
  ArrowRight,
  Loader2,
  Clock,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/formatters";
import { getFeeReportSummary, getPayments } from "@/lib/api/fees";
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

  const today = new Date().toISOString().split("T")[0];
  const overdueInvoices = pendingFees.filter((inv) => !!inv.due_date && inv.due_date < today);
  const overdueTotal = overdueInvoices.reduce((s, inv) => s + inv.outstanding_amount, 0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getFeeReportSummary(defaultCompany || undefined),
      getSalesInvoices({
        outstanding_only: true,
        docstatus: 1,
        limit_page_length: 10,
        order_by: "due_date asc",
        ...(defaultCompany ? { company: defaultCompany } : {}),
      }),
      getPayments({
        limit_page_length: 5,
        ...(defaultCompany ? { company: defaultCompany } : {}),
      }),
    ])
      .then(([summaryData, invoicesRes, paymentsRes]) => {
        setSummary(summaryData);
        setPendingFees(invoicesRes.data);
        setRecentPayments(paymentsRes.data);
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
        <div className="flex gap-2">
          <Link href="/dashboard/branch-manager/fees/structure">
            <Button variant="outline" size="md">
              <FileText className="h-4 w-4" />
              Fee Structure
            </Button>
          </Link>
          <Link href="/dashboard/branch-manager/fees/payments">
            <Button variant="primary" size="md">
              <CreditCard className="h-4 w-4" />
              Record Payment
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
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
          </>
        )}
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Fees */}
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
              ) : pendingFees.length === 0 ? (
                <p className="text-center text-text-secondary text-sm py-8">No pending fees found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-light">
                        <th className="text-left pb-3 font-semibold text-text-secondary">Student</th>
                        <th className="text-left pb-3 font-semibold text-text-secondary">Invoice #</th>
                        <th className="text-right pb-3 font-semibold text-text-secondary">Outstanding</th>
                        <th className="text-left pb-3 font-semibold text-text-secondary">Due Date</th>
                        <th className="text-left pb-3 font-semibold text-text-secondary">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingFees.map((invoice, index) => {
                        const today = new Date().toISOString().split("T")[0];
                        const dueDate = invoice.due_date || invoice.posting_date;
                        const isOverdue = !!invoice.due_date && invoice.due_date < today;
                        const isDueToday = !!invoice.due_date && invoice.due_date === today;
                        return (
                          <motion.tr
                            key={invoice.name}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b border-border-light hover:bg-brand-wash/30 transition-colors"
                          >
                            <td className="py-3 font-medium text-text-primary">{invoice.customer_name || invoice.customer}</td>
                            <td className="py-3 text-text-secondary text-xs">{invoice.name}</td>
                            <td className="py-3 text-right font-semibold text-text-primary">
                              {formatCurrency(invoice.outstanding_amount)}
                            </td>
                            <td className="py-3">
                              <span className={`flex items-center gap-1 text-sm ${
                                isOverdue ? "text-error font-semibold" : isDueToday ? "text-warning font-semibold" : "text-text-secondary"
                              }`}>
                                {(isOverdue || isDueToday) && <Clock className="h-3.5 w-3.5 shrink-0" />}
                                {dueDate
                                  ? new Date(dueDate).toLocaleDateString("en-IN", {
                                      day: "numeric", month: "short", year: "numeric",
                                    })
                                  : "—"}
                                {isOverdue && <span className="text-[10px] font-bold ml-1">OVERDUE</span>}
                              </span>
                            </td>
                            <td className="py-3">
                              <Badge variant={invoice.status === "Overdue" ? "error" : invoice.status === "Unpaid" ? "warning" : "info"}>
                                {invoice.status}
                              </Badge>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
    </motion.div>
  );
}