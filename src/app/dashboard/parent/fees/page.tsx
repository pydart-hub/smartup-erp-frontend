"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  IndianRupee,
  GraduationCap,
  FileText,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Receipt,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import InstalmentTimeline, {
  type InstalmentItem,
} from "@/components/fees/InstalmentTimeline";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  useParentData,
  getLatestEnrollment,
  type SalesInvoiceEntry,
  type SalesOrderEntry,
  type FeeStructureEntry,
  type PaymentEntryRecord,
} from "../page";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
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
  const { user, isLoading: authLoading } = useAuth();
  const { data, isLoading: dataLoading } = useParentData(user?.email);
  const isLoading = authLoading || dataLoading;
  const [selectedChild, setSelectedChild] = useState<string>("all");
  const today = new Date().toISOString().split("T")[0];
  const queryClient = useQueryClient();

  const handlePaymentSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["parent-data"] });
  }, [queryClient]);

  const children = data?.children ?? [];

  const getChildInvoices = (studentId: string): SalesInvoiceEntry[] =>
    (data?.salesInvoices?.[studentId] ?? []) as SalesInvoiceEntry[];
  const getChildSalesOrders = (studentId: string): SalesOrderEntry[] =>
    (data?.salesOrders?.[studentId] ?? []) as SalesOrderEntry[];
  const getChildFeeStructures = (studentId: string): FeeStructureEntry[] =>
    (data?.feeStructures?.[studentId] ?? []) as FeeStructureEntry[];

  const targetChildren = selectedChild === "all"
    ? children
    : children.filter((c) => c.name === selectedChild);

  const allInvoices = targetChildren.flatMap((c) => getChildInvoices(c.name));
  const allSOs = targetChildren.flatMap((c) => getChildSalesOrders(c.name));
  const allFeeStructures = targetChildren.flatMap((c) => getChildFeeStructures(c.name));

  // Aggregate totals
  const totalInvoiced = allInvoices.reduce((s, i) => s + i.grand_total, 0);
  const totalInvOutstanding = allInvoices.reduce((s, i) => s + i.outstanding_amount, 0);
  const totalSO = allSOs.reduce((s, so) => s + so.grand_total, 0);
  const totalFeeStructure = allFeeStructures.reduce((s, fs) => s + fs.total_amount, 0);

  // Best available source for summary:
  // SO = full fee commitment, invoices = what's been billed from backend
  let displayTotal: number;
  let displayOutstanding: number;
  let displayPaid: number;
  if (totalSO > 0) {
    displayTotal = totalSO;
    displayPaid = totalInvoiced > 0 ? totalInvoiced - totalInvOutstanding : 0;
    displayOutstanding = totalSO - displayPaid;
  } else if (totalInvoiced > 0) {
    displayTotal = totalInvoiced;
    displayPaid = totalInvoiced - totalInvOutstanding;
    displayOutstanding = totalInvOutstanding;
  } else {
    displayTotal = totalFeeStructure;
    displayPaid = 0;
    displayOutstanding = totalFeeStructure;
  }

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
            {displayPaid > 0 ? formatCurrency(displayPaid) : displayTotal > 0 ? formatCurrency(0) : "—"}
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
        targetChildren.map((child) => (
          <ChildFeeCard
            key={child.name}
            child={child}
            data={data}
            today={today}
            user={user}
            onPaymentSuccess={handlePaymentSuccess}
          />
        ))
      )}
    </motion.div>
  );
}

// ── Per-child fee card ───────────────────────────────────────────

function ChildFeeCard({
  child,
  data,
  today,
  user,
  onPaymentSuccess,
}: {
  child: { name: string; student_name: string; custom_branch: string; customer: string };
  data: ReturnType<typeof useParentData>["data"];
  today: string;
  user: { full_name?: string; email?: string } | null;
  onPaymentSuccess: () => void;
}) {
  const enrollment = getLatestEnrollment(data, child.name);
  const childInvoices = (data?.salesInvoices?.[child.name] ?? []) as SalesInvoiceEntry[];
  const childSOs = (data?.salesOrders?.[child.name] ?? []) as SalesOrderEntry[];
  const childFeeStructures = (data?.feeStructures?.[child.name] ?? []) as FeeStructureEntry[];
  const childPayments = (data?.paymentEntries?.[child.name] ?? []) as PaymentEntryRecord[];

  const hasInvoices = childInvoices.length > 0;
  const hasSOs = childSOs.length > 0;
  const hasFeeStructures = childFeeStructures.length > 0;

  const soTotal = childSOs.reduce((s, so) => s + so.grand_total, 0);
  const invPaid = childInvoices.reduce((s, inv) => s + (inv.grand_total - inv.outstanding_amount), 0);

  // Build instalment items from invoices, sorted by due date
  const instalments: InstalmentItem[] = useMemo(() => {
    if (!hasInvoices) return [];

    const sorted = [...childInvoices].sort(
      (a, b) => (a.due_date ?? a.posting_date).localeCompare(b.due_date ?? b.posting_date)
    );

    return sorted.map((inv, idx) => {
      const isPaid = inv.outstanding_amount <= 0;
      const isPartiallyPaid = !isPaid && inv.outstanding_amount < inv.grand_total;
      const dueDate = inv.due_date ?? inv.posting_date;
      const isOverdue = dueDate < today && !isPaid;
      const isDueToday = dueDate === today && !isPaid;

      // Auto-label based on count
      let label: string;
      if (sorted.length === 1) label = "Full Payment";
      else if (sorted.length === 4) label = `Q${idx + 1}`;
      else label = `Instalment ${idx + 1}`;

      let status: InstalmentItem["status"];
      if (isPaid) status = "paid";
      else if (isPartiallyPaid) status = "partially-paid";
      else if (isOverdue) status = "overdue";
      else if (isDueToday) status = "due-today";
      else status = "upcoming";

      return {
        invoiceId: inv.name,
        label,
        amount: inv.grand_total,
        outstandingAmount: inv.outstanding_amount,
        dueDate,
        postingDate: inv.posting_date,
        status,
      } satisfies InstalmentItem;
    });
  }, [childInvoices, hasInvoices, today]);

  const plan = enrollment?.custom_plan || childSOs[0]?.custom_plan;
  const numInstalments = enrollment?.custom_no_of_instalments || childSOs[0]?.custom_no_of_instalments;

  return (
    <motion.div variants={item}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap">
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
            {plan && <Badge variant="info">{plan}</Badge>}
            {numInstalments && (
              <Badge variant="default">{numInstalments}x Instalments</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* SO summary header */}
          {hasSOs && (
            <div className="flex items-center justify-between rounded-[12px] border border-border-light bg-app-bg p-4">
              <div>
                <p className="text-xs text-text-secondary">Fee Order</p>
                <p className="text-sm font-medium text-text-primary">{childSOs[0].name}</p>
                {enrollment?.academic_year && (
                  <p className="text-xs text-text-tertiary mt-0.5">{enrollment.academic_year}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-text-secondary">Total Fee</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(soTotal)}</p>
                {invPaid > 0 && (
                  <p className="text-xs text-success">Paid: {formatCurrency(invPaid)}</p>
                )}
              </div>
            </div>
          )}

          {/* Instalment Timeline (replaces flat invoice table) */}
          {hasInvoices && instalments.length > 0 && (
            <InstalmentTimeline
              instalments={instalments}
              studentName={child.student_name}
              customer={child.customer}
              parentName={user?.full_name}
              parentEmail={user?.email}
              onPaymentSuccess={onPaymentSuccess}
            />
          )}

          {/* Warning: SO exists but no invoices yet — parent can't pay */}
          {hasSOs && !hasInvoices && (
            <div className="flex items-center gap-3 rounded-[12px] border border-warning/20 bg-warning-light p-4">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">Invoices being processed</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Your fee invoices are being set up. Payment options will appear here once ready.
                  Please contact the school office if this persists.
                </p>
              </div>
            </div>
          )}

          {/* Payment History */}
          {childPayments.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-text-tertiary" />
                Payment History
              </h4>
              <div className="border border-border-light rounded-[12px] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-app-bg">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-text-secondary font-medium">Date</th>
                      <th className="text-left px-4 py-2.5 text-text-secondary font-medium">Amount</th>
                      <th className="text-left px-4 py-2.5 text-text-secondary font-medium">Mode</th>
                      <th className="text-left px-4 py-2.5 text-text-secondary font-medium">Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {childPayments.map((pe) => (
                      <tr key={pe.name} className="hover:bg-app-bg/50">
                        <td className="px-4 py-2.5 text-text-primary">{formatDate(pe.posting_date)}</td>
                        <td className="px-4 py-2.5 font-medium text-success">{formatCurrency(pe.paid_amount)}</td>
                        <td className="px-4 py-2.5 text-text-secondary">{pe.mode_of_payment}</td>
                        <td className="px-4 py-2.5 text-text-tertiary text-xs">{pe.reference_no || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No invoices yet — show SO info or fee structure */}
          {!hasInvoices && (
            <div>
              {hasSOs && (
                <div className="rounded-[12px] border border-border-light bg-app-bg p-4">
                  <p className="text-sm text-text-secondary text-center">
                    Your fee order has been placed. Invoices will appear here once generated by the institute.
                  </p>
                </div>
              )}
              {!hasSOs && hasFeeStructures && (
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-1 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-text-tertiary" />
                    Fee Structure
                    <Badge variant="default" className="ml-1 text-xs">No invoice raised yet</Badge>
                  </h4>
                  <p className="text-xs text-text-secondary mb-4">
                    Your fee structure has been set up. Invoices will appear here once generated by the institute.
                  </p>
                  {childFeeStructures.map((fs) => (
                    <div key={fs.name} className="rounded-[12px] border border-border-light bg-app-bg p-4 mb-3">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-text-primary text-sm">{fs.program}</p>
                          <p className="text-xs text-text-secondary mt-0.5">{fs.academic_year}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-text-secondary">Annual Fee</p>
                          <p className="text-xl font-bold text-primary">{formatCurrency(fs.total_amount)}</p>
                        </div>
                      </div>
                      {(fs.components ?? []).length > 0 && (
                        <div className="border-t border-border-light pt-3 space-y-1.5">
                          {(fs.components ?? []).map((c, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-text-secondary">{c.fees_category}</span>
                              <span className="font-medium text-text-primary">{formatCurrency(c.total ?? c.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!hasSOs && !hasFeeStructures && (
                <p className="text-sm text-text-secondary text-center py-6">
                  No fee records found for this student.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
