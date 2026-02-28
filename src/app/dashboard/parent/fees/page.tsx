"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  IndianRupee,
  GraduationCap,
  Calendar,
  FileText,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  ShoppingCart,
  Clock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  useParentData,
  getLatestEnrollment,
  type FeeEntry,
  type SalesInvoiceEntry,
  type SalesOrderEntry,
} from "../page";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function ParentFeesPage() {
  const { user } = useAuth();
  const { data, isLoading } = useParentData(user?.email);
  const [selectedChild, setSelectedChild] = useState<string>("all");
  const today = new Date().toISOString().split("T")[0];

  const children = data?.children ?? [];

  const getChildFees = (studentId: string): FeeEntry[] =>
    (data?.fees?.[studentId] ?? []) as FeeEntry[];
  const getChildInvoices = (studentId: string): SalesInvoiceEntry[] =>
    (data?.salesInvoices?.[studentId] ?? []) as SalesInvoiceEntry[];
  const getChildSalesOrders = (studentId: string): SalesOrderEntry[] =>
    (data?.salesOrders?.[studentId] ?? []) as SalesOrderEntry[];

  const targetChildren = selectedChild === "all"
    ? children
    : children.filter((c) => c.name === selectedChild);

  const allFees = targetChildren.flatMap((c) => getChildFees(c.name));
  const allInvoices = targetChildren.flatMap((c) => getChildInvoices(c.name));
  const allSOs = targetChildren.flatMap((c) => getChildSalesOrders(c.name));

  // Aggregate totals
  const totalInvoiced = allInvoices.reduce((s, i) => s + i.grand_total, 0);
  const totalInvOutstanding = allInvoices.reduce((s, i) => s + i.outstanding_amount, 0);
  const totalFeesDoc = allFees.reduce((s, f) => s + f.grand_total, 0);
  const totalFeesOutstanding = allFees.reduce((s, f) => s + f.outstanding_amount, 0);
  const totalSO = allSOs.reduce((s, so) => s + so.grand_total, 0);

  // Best available source
  let displayTotal: number;
  let displayOutstanding: number;
  if (totalInvoiced > 0) {
    displayTotal = totalInvoiced;
    displayOutstanding = totalInvOutstanding;
  } else if (totalFeesDoc > 0) {
    displayTotal = totalFeesDoc;
    displayOutstanding = totalFeesOutstanding;
  } else {
    displayTotal = totalSO;
    displayOutstanding = 0;
  }
  const displayPaid = displayTotal - displayOutstanding;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <IndianRupee className="h-6 w-6 text-primary" />
            Fee Status
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Complete fee details for your children
          </p>
        </div>

        {children.length > 1 && (
          <div className="relative">
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="h-10 rounded-[10px] border border-border-input bg-surface px-4 pr-8 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
            >
              <option value="all">All Children</option>
              {children.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.student_name}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-info-light rounded-[14px] p-5 border border-info/10">
          <p className="text-sm text-text-secondary">Total Fees</p>
          <p className="text-2xl font-bold text-info mt-1">
            {displayTotal > 0 ? formatCurrency(displayTotal) : "—"}
          </p>
        </div>
        <div className="bg-success-light rounded-[14px] p-5 border border-success/10">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <p className="text-sm text-text-secondary">Paid</p>
          </div>
          <p className="text-2xl font-bold text-success mt-1">
            {displayPaid > 0 ? formatCurrency(displayPaid) : "—"}
          </p>
        </div>
        <div className="bg-error-light rounded-[14px] p-5 border border-error/10">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-error" />
            <p className="text-sm text-text-secondary">Outstanding</p>
          </div>
          <p className="text-2xl font-bold text-error mt-1">
            {displayOutstanding > 0 ? formatCurrency(displayOutstanding) : displayTotal > 0 ? "All Paid" : "—"}
          </p>
        </div>
      </motion.div>

      {/* Per-child breakdown */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-border-light rounded-[14px] animate-pulse" />
          ))}
        </div>
      ) : (
        targetChildren.map((child) => {
          const enrollment = getLatestEnrollment(data, child.name);
          const childFees = getChildFees(child.name);
          const childInvoices = getChildInvoices(child.name);
          const childSOs = getChildSalesOrders(child.name);
          const hasInvoices = childInvoices.length > 0;
          const hasFees = childFees.length > 0;
          const hasSOs = childSOs.length > 0;

          return (
            <motion.div key={child.name} variants={item}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    {child.student_name}
                    <span className="text-sm font-normal text-text-secondary ml-2">
                      {[
                        enrollment?.program,
                        child.custom_branch?.replace("Smart Up ", ""),
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Sales Invoices */}
                  {hasInvoices && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-text-tertiary" />
                        Invoices
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border-light text-text-secondary">
                              <th className="text-left py-2 pr-4 font-medium">Invoice</th>
                              <th className="text-left py-2 pr-4 font-medium">Date</th>
                              <th className="text-left py-2 pr-4 font-medium">Due Date</th>
                              <th className="text-right py-2 pr-4 font-medium">Amount</th>
                              <th className="text-right py-2 pr-4 font-medium">Outstanding</th>
                              <th className="text-right py-2 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {childInvoices.map((inv) => {
                              const isOverdue = !!inv.due_date && inv.due_date < today && inv.outstanding_amount > 0;
                              const isDueToday = !!inv.due_date && inv.due_date === today && inv.outstanding_amount > 0;
                              return (
                              <tr key={inv.name} className="border-b border-border-light last:border-0">
                                <td className="py-2.5 pr-4 font-medium text-text-primary">{inv.name}</td>
                                <td className="py-2.5 pr-4 text-text-secondary">
                                  {new Date(inv.posting_date).toLocaleDateString("en-IN", {
                                    day: "numeric", month: "short", year: "numeric",
                                  })}
                                </td>
                                <td className="py-2.5 pr-4">
                                  <span className={`flex items-center gap-1 text-sm ${
                                    isOverdue ? "text-error font-semibold" : isDueToday ? "text-warning font-semibold" : "text-text-secondary"
                                  }`}>
                                    {(isOverdue || isDueToday) && <Clock className="h-3.5 w-3.5 shrink-0" />}
                                    {inv.due_date
                                      ? new Date(inv.due_date).toLocaleDateString("en-IN", {
                                          day: "numeric", month: "short", year: "numeric",
                                        })
                                      : "—"}
                                    {isOverdue && <span className="text-[10px] font-bold ml-1">OVERDUE</span>}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-4 text-right font-semibold text-text-primary">
                                  {formatCurrency(inv.grand_total)}
                                </td>
                                <td className="py-2.5 pr-4 text-right">
                                  {inv.outstanding_amount > 0 ? (
                                    <span className="font-semibold text-error">{formatCurrency(inv.outstanding_amount)}</span>
                                  ) : (
                                    <span className="text-success">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 text-right">
                                  <Badge variant={inv.outstanding_amount > 0 ? "error" : "success"}>
                                    {inv.status || (inv.outstanding_amount > 0 ? "Unpaid" : "Paid")}
                                  </Badge>
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Fee Records (Fees doctype) — shown only if no invoices */}
                  {hasFees && !hasInvoices && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                        <IndianRupee className="h-4 w-4 text-text-tertiary" />
                        Fee Records
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border-light text-text-secondary">
                              <th className="text-left py-2 pr-4 font-medium">Fee ID</th>
                              <th className="text-left py-2 pr-4 font-medium">Date</th>
                              <th className="text-left py-2 pr-4 font-medium">Due Date</th>
                              <th className="text-right py-2 pr-4 font-medium">Amount</th>
                              <th className="text-right py-2 pr-4 font-medium">Outstanding</th>
                              <th className="text-right py-2 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {childFees.map((fee) => {
                              const isOverdue = !!fee.due_date && fee.due_date < today && fee.outstanding_amount > 0;
                              const isDueToday = !!fee.due_date && fee.due_date === today && fee.outstanding_amount > 0;
                              return (
                              <tr key={fee.name} className="border-b border-border-light last:border-0">
                                <td className="py-2.5 pr-4 font-medium text-text-primary">{fee.name}</td>
                                <td className="py-2.5 pr-4 text-text-secondary">
                                  {new Date(fee.posting_date).toLocaleDateString("en-IN", {
                                    day: "numeric", month: "short", year: "numeric",
                                  })}
                                </td>
                                <td className="py-2.5 pr-4">
                                  <span className={`flex items-center gap-1 text-sm ${
                                    isOverdue ? "text-error font-semibold" : isDueToday ? "text-warning font-semibold" : "text-text-secondary"
                                  }`}>
                                    {(isOverdue || isDueToday) && <Clock className="h-3.5 w-3.5 shrink-0" />}
                                    {fee.due_date
                                      ? new Date(fee.due_date).toLocaleDateString("en-IN", {
                                          day: "numeric", month: "short", year: "numeric",
                                        })
                                      : "—"}
                                    {isOverdue && <span className="text-[10px] font-bold ml-1">OVERDUE</span>}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-4 text-right font-semibold text-text-primary">
                                  {formatCurrency(fee.grand_total)}
                                </td>
                                <td className="py-2.5 pr-4 text-right">
                                  {fee.outstanding_amount > 0 ? (
                                    <span className="font-semibold text-error">{formatCurrency(fee.outstanding_amount)}</span>
                                  ) : (
                                    <span className="text-success">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 text-right">
                                  <Badge variant={fee.outstanding_amount > 0 ? "error" : "success"}>
                                    {fee.outstanding_amount > 0 ? "Pending" : "Paid"}
                                  </Badge>
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Sales Orders */}
                  {hasSOs && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-text-tertiary" />
                        Sales Orders
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border-light text-text-secondary">
                              <th className="text-left py-2 pr-4 font-medium">Order</th>
                              <th className="text-left py-2 pr-4 font-medium">Date</th>
                              <th className="text-right py-2 pr-4 font-medium">Amount</th>
                              <th className="text-right py-2 pr-4 font-medium">Billed %</th>
                              <th className="text-right py-2 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {childSOs.map((so) => (
                              <tr key={so.name} className="border-b border-border-light last:border-0">
                                <td className="py-2.5 pr-4 font-medium text-text-primary">{so.name}</td>
                                <td className="py-2.5 pr-4 text-text-secondary">
                                  {new Date(so.transaction_date).toLocaleDateString("en-IN", {
                                    day: "numeric", month: "short", year: "numeric",
                                  })}
                                </td>
                                <td className="py-2.5 pr-4 text-right font-semibold text-text-primary">
                                  {so.grand_total > 0 ? formatCurrency(so.grand_total) : "—"}
                                </td>
                                <td className="py-2.5 pr-4 text-right text-text-secondary">
                                  {so.per_billed ?? 0}%
                                </td>
                                <td className="py-2.5 text-right">
                                  <Badge
                                    variant={
                                      so.status === "Completed" ? "success"
                                      : so.status === "To Bill" ? "warning"
                                      : "info"
                                    }
                                  >
                                    {so.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {!hasFees && !hasInvoices && !hasSOs && (
                    <p className="text-sm text-text-secondary text-center py-6">
                      No fee records found for this student.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })
      )}
    </motion.div>
  );
}
