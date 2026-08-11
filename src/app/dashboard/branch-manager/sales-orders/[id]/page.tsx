"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, FileText, AlertCircle, ShoppingCart,
  Package, Receipt, CheckCircle2, Banknote, X, Loader2, RefreshCw,
  CreditCard, Smartphone, Building2, Wallet, ArrowRight,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { getSalesOrder, getSalesInvoices, cancelSalesOrder } from "@/lib/api/sales";
import { getStudent } from "@/lib/api/students";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { generateInstalmentDueDates } from "@/lib/utils/feeSchedule";
import { toast } from "sonner";
import type { SalesOrderStatus, SalesInvoice } from "@/lib/types/sales";
import CollectPaymentModal from "@/components/payments/CollectPaymentModal";
import { StudentTransactionHistory } from "@/components/fees/StudentTransactionHistory";

const STATUS_COLORS: Record<SalesOrderStatus, "default" | "success" | "warning" | "error" | "info"> = {
  Draft: "default",
  "On Hold": "warning",
  "To Deliver and Bill": "info",
  "To Bill": "info",
  "To Deliver": "info",
  Completed: "success",
  Cancelled: "error",
  Closed: "default",
};

function formatDateInputLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getAllowedPaymentDateRange() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  return {
    today: formatDateInputLocal(today),
    yesterday: formatDateInputLocal(yesterday),
  };
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-border-light last:border-0">
      <span className="text-sm text-text-tertiary">{label}</span>
      <span className="text-sm font-medium text-text-primary text-right max-w-[60%]">{value || "—"}</span>
    </div>
  );
}

export default function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const decodedId = decodeURIComponent(id);
  const { today: todayDate, yesterday: yesterdayDate } = getAllowedPaymentDateRange();

  // ── Payment modal state ─────────────────────────────────────
  const [paymentInvoice, setPaymentInvoice] = useState<SalesInvoice | null>(null);

  function openPaymentModal(inv: SalesInvoice) {
    setPaymentInvoice(inv);
  }

  function closePaymentModal() {
    setPaymentInvoice(null);
  }

  /** Fire receipt email (non-blocking) after any successful payment */
  function sendReceipt(invoiceId: string) {
    fetch("/api/payments/send-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ invoice_id: invoiceId }),
    }).catch(() => {/* best-effort */});
  }

  /** Refresh queries after payment */
  function onPaymentDone(invoiceId: string) {
    sendReceipt(invoiceId);
    closePaymentModal();
    queryClient.invalidateQueries({ queryKey: ["so-invoices", decodedId] });
    queryClient.invalidateQueries({ queryKey: ["sales-order", decodedId] });
  }

  // ── SO data ───────────────────────────────────────────────
  const { data: soRes, isLoading, isError } = useQuery({
    queryKey: ["sales-order", decodedId],
    queryFn: () => getSalesOrder(decodedId),
    staleTime: 60_000,
  });
  const so = soRes?.data;

  // ── Linked invoices (filter by child table sales_order reference) ──
  const { data: invoicesRes } = useQuery({
    queryKey: ["so-invoices", decodedId],
    queryFn: () => getSalesInvoices({ sales_order: decodedId, docstatus: 1, limit_page_length: 20 }),
    enabled: !!so,
    staleTime: 30_000,
  });
  const salesOrderLinkedInvoices = (invoicesRes?.data ?? []).filter((inv) => inv.docstatus === 1);

  // Fallback query: some manually corrected invoices may no longer keep the sales_order child link
  // even though they belong to this same student/order schedule.
  const { data: studentInvoicesRes } = useQuery({
    queryKey: ["so-student-invoices", so?.student, so?.customer, so?.company],
    queryFn: () =>
      getSalesInvoices({
        customer: so?.customer,
        company: so?.company,
        docstatus: 1,
        limit_page_length: 50,
      }),
    enabled: !!so?.customer && !!so?.company,
    staleTime: 30_000,
  });

  // ── Check if this SO was created by a branch transfer ──
  const { data: transferRes } = useQuery({
    queryKey: ["so-transfer", decodedId],
    queryFn: async () => {
      const res = await fetch(
        `/api/transfer/by-so?so=${encodeURIComponent(decodedId)}`,
        { credentials: "include" },
      );
      if (!res.ok) return { transfer: null };
      return res.json();
    },
    enabled: !!so,
    staleTime: 300_000,
  });
  const transferInfo = transferRes?.transfer ?? null;

  // ── Check if student is discontinued ──
  const studentId = so?.student;
  const { data: studentRes } = useQuery({
    queryKey: ["student-status", studentId],
    queryFn: () => getStudent(studentId!),
    enabled: !!studentId,
    staleTime: 60_000,
  });
  const isDiscontinued = studentRes?.data?.enabled === 0 && !!studentRes?.data?.custom_discontinuation_date;

  const expectedSchedule = useMemo(() => {
    if (!so) return [];
    const instalments = Number(so.custom_no_of_instalments) || 1;
    const total = so.grand_total;
    const academicYear = so.custom_academic_year || "2026-2027";
    const enrollmentDate = so.transaction_date || undefined;

    if (instalments === 1) {
      const [singleDueDate] = generateInstalmentDueDates(1, academicYear, enrollmentDate);
      return [{ amount: total, dueDate: singleDueDate, label: "Full Payment" }];
    }

    const dueDates = generateInstalmentDueDates(instalments, academicYear, enrollmentDate);
    const perInst = Math.floor(total / instalments);
    const remainder = total - perInst * (instalments - 1);
    const labels = instalments === 4 ? ["Q1", "Q2", "Q3", "Q4"] : null;

    return dueDates.slice(0, instalments).map((dueDate, i) => ({
      amount: i === instalments - 1 ? remainder : perInst,
      dueDate,
      label: labels?.[i] || `Instalment ${i + 1}`,
    }));
  }, [so]);

  const linkedInvoices = useMemo(() => {
    const base = [...salesOrderLinkedInvoices];
    const extraInvoices = (studentInvoicesRes?.data ?? []).filter((inv) => inv.docstatus === 1);
    const byName = new Set(base.map((inv) => inv.name));

    for (const expected of expectedSchedule) {
      const alreadyMatched = base.some(
        (inv) =>
          (inv.due_date || inv.posting_date || "") === expected.dueDate &&
          Math.round(inv.grand_total) === Math.round(expected.amount),
      );
      if (alreadyMatched) continue;

      const candidate = extraInvoices.find(
        (inv) =>
          !byName.has(inv.name) &&
          (inv.due_date || inv.posting_date || "") === expected.dueDate &&
          Math.round(inv.grand_total) === Math.round(expected.amount),
      );

      if (candidate) {
        base.push(candidate);
        byName.add(candidate.name);
      }
    }

    return base;
  }, [expectedSchedule, salesOrderLinkedInvoices, studentInvoicesRes?.data]);

  // Sort invoices by due date ascending
  const sortedInvoices = useMemo(
    () =>
      [...linkedInvoices].sort((a, b) => {
        const dateA = a.due_date || a.posting_date || "";
        const dateB = b.due_date || b.posting_date || "";
        return dateA.localeCompare(dateB);
      }),
    [linkedInvoices],
  );

  // ── Generate invoices for SOs that are missing them ─────────
  const generateInvoicesMutation = useMutation({
    mutationFn: async () => {
      if (!so) throw new Error("No Sales Order");
      const res = await fetch("/api/admission/create-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ salesOrderName: so.name, schedule: expectedSchedule }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed (HTTP ${res.status})`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      const count = data.invoices?.length ?? 0;
      const failed = data.failed?.length ?? 0;
      if (failed > 0) {
        toast.warning(`Created ${count} invoice(s), ${failed} failed.`);
      } else {
        toast.success(`${count} invoice(s) created successfully!`);
      }
      queryClient.invalidateQueries({ queryKey: ["so-invoices", decodedId] });
      queryClient.invalidateQueries({ queryKey: ["sales-order", decodedId] });
    },
    onError: (err: Error) => {
      toast.error(`Invoice generation failed: ${err.message}`);
    },
  });

  // ── Repair mutation — creates the single missing first invoice ───────────
  const repairMissingMutation = useMutation({
    mutationFn: async () => {
      if (!so) throw new Error("No Sales Order");
      const existingTotal = linkedInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);
      const missingAmount = Math.round(so.grand_total - existingTotal);
      if (missingAmount <= 0) throw new Error("No missing amount detected");
      const res = await fetch("/api/admission/create-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          salesOrderName: so.name,
          schedule: [{
            amount: missingAmount,
            dueDate: new Date().toISOString().split("T")[0],
            label: "Instalment 1",
          }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed (HTTP ${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Missing invoice created successfully!");
      queryClient.invalidateQueries({ queryKey: ["so-invoices", decodedId] });
      queryClient.invalidateQueries({ queryKey: ["sales-order", decodedId] });
    },
    onError: (err: Error) => {
      toast.error(`Repair failed: ${err.message}`);
    },
  });

  const perBilled = so?.per_billed ?? 0;
  const isFullyBilled = perBilled >= 100;
  const canCreateInvoice = so?.docstatus === 1 && !isFullyBilled && so.status !== "Cancelled";
  const numInst = Number(so?.custom_no_of_instalments) || 1;
  const isMissingInvoices = numInst > 1 && linkedInvoices.length > 0 && linkedInvoices.length < numInst && !isFullyBilled;
  const missingInvoiceAmount = isMissingInvoices
    ? Math.round((so?.grand_total ?? 0) - linkedInvoices.reduce((sum, inv) => sum + inv.grand_total, 0))
    : 0;

  async function handleCancel() {
    if (!so || !confirm(`Cancel ${so.name}?`)) return;
    try {
      await cancelSalesOrder(so.name);
      await queryClient.invalidateQueries({ queryKey: ["sales-order", decodedId] });
      await queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      toast.success("Sales Order cancelled.");
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to cancel"
      );
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <BreadcrumbNav />
        <Skeleton className="h-10 w-64 rounded" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !so) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-error">
        <AlertCircle className="h-8 w-8" />
        <p className="font-medium">Sales Order not found</p>
        <button onClick={() => router.back()} className="text-sm text-primary underline">Go back</button>
      </div>
    );
  }

  const status = so.status as SalesOrderStatus;
  const billedAmount = so.grand_total * (perBilled / 100);
  const unbilledAmount = so.grand_total - billedAmount;
  const totalOutstanding = linkedInvoices.reduce((sum, inv) => sum + (inv.outstanding_amount ?? 0), 0);
  // Use Math.floor to avoid phantom "paid" amounts caused by Frappe's rounded_total:
  // outstanding_amount = round(grand_total), so grand_total - outstanding can show ~₹0.33 per invoice
  // without any real payment. Math.floor(0.33) = 0; Math.floor(500.00) = 500 — safe.
  const totalPaid = linkedInvoices.reduce((sum, inv) => {
    const paid = inv.grand_total - (inv.outstanding_amount ?? 0);
    return sum + Math.max(0, Math.floor(paid));
  }, 0);
  // When invoices exist, use their actual sum as the effective total.
  // This handles plan-conversion cases where SO grand_total is stale (e.g. Advanced→Basic).
  const effectiveTotal = linkedInvoices.length > 0 ? totalPaid + totalOutstanding : so.grand_total;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-5xl mx-auto">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-text-secondary hover:bg-app-bg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary font-mono">{so.name}</h1>
            <p className="text-xs text-text-tertiary">{so.customer_name || so.customer}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {transferInfo && (
            <Badge variant="info">Transferred</Badge>
          )}
          <Badge variant={STATUS_COLORS[status] ?? "default"}>{status}</Badge>
          {isFullyBilled && (
            <Badge variant="success">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Fully Billed
            </Badge>
          )}
        </div>
      </div>

      {/* Hero summary card with billing progress */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-xs text-text-tertiary mb-1">Grand Total</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(effectiveTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary mb-1">Paid</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary mb-1">Outstanding</p>
              <p className="text-2xl font-bold text-warning">{formatCurrency(totalOutstanding)}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary mb-1">Invoices</p>
              <p className="text-2xl font-bold text-text-primary">{linkedInvoices.length}</p>
            </div>
          </div>

          {/* Payment progress bar */}
          <div className="mt-5 pt-4 border-t border-border-light">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-secondary">Payment Progress</span>
              <span className="text-xs font-bold text-text-primary">
                {effectiveTotal > 0 ? Math.round((totalPaid / effectiveTotal) * 100) : 0}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-app-bg rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totalOutstanding === 0 && linkedInvoices.length > 0 ? "bg-success" : totalPaid > 0 ? "bg-primary" : "bg-border-light"
                }`}
                style={{ width: `${effectiveTotal > 0 ? Math.min((totalPaid / effectiveTotal) * 100, 100) : 0}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branch Transfer Info */}
      {transferInfo && (
        <Card className="border border-info/30 bg-info/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-light">
              <Building2 className="h-4 w-4 text-info" />
              <h3 className="font-semibold text-text-primary">Branch Transfer</h3>
              <Badge variant="info">Completed</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-text-tertiary mb-1">From Branch</p>
                <p className="text-xs font-medium text-text-primary leading-tight">{transferInfo.from_branch}</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">To Branch</p>
                <p className="text-xs font-medium text-text-primary leading-tight flex items-center gap-1">
                  <ArrowRight className="h-3 w-3 text-info flex-shrink-0" />
                  {transferInfo.to_branch}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">Transfer Date</p>
                <p className="text-sm font-medium text-text-primary">
                  {transferInfo.completion_date ? formatDate(transferInfo.completion_date) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">Credit Applied</p>
                <p className="text-sm font-semibold text-success">
                  {formatCurrency(transferInfo.amount_already_paid || 0)}
                </p>
              </div>
            </div>
            {(transferInfo.amount_already_paid > 0) && (
              <div className="mt-3 pt-3 border-t border-border-light">
                <p className="text-xs text-text-secondary">
                  Original fee{" "}
                  <span className="font-medium text-text-primary">
                    {formatCurrency(transferInfo.new_total_amount || 0)}
                  </span>
                  {" "}−{" "}credit{" "}
                  <span className="font-medium text-success">
                    {formatCurrency(transferInfo.amount_already_paid || 0)}
                  </span>
                  {" "}={" "}net charged{" "}
                  <span className="font-semibold text-primary">
                    {formatCurrency(transferInfo.adjusted_amount || 0)}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Order Details */}
        <Card className="lg:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-light">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-text-primary">Order Details</h3>
            </div>
            <InfoRow label="Order No." value={so.name} />
            <InfoRow label="Customer" value={so.customer_name || so.customer} />
            {so.student && <InfoRow label="Student" value={so.student} />}
            <InfoRow label="Company" value={so.company} />
            <InfoRow label="Order Date" value={formatDate(so.transaction_date)} />
            {so.custom_plan && <InfoRow label="Plan" value={so.custom_plan} />}
            {so.custom_no_of_instalments && <InfoRow label="Instalments" value={so.custom_no_of_instalments} />}
            {so.custom_academic_year && <InfoRow label="Academic Year" value={so.custom_academic_year} />}
            <InfoRow label="Created" value={so.creation ? formatDate(so.creation) : null} />
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-light">
              <Package className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-text-primary">Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light text-text-secondary text-xs font-semibold">
                    <th className="text-left pb-2 pr-3">Item</th>
                    <th className="text-left pb-2 pr-3">Description</th>
                    <th className="text-right pb-2 pr-3">Qty</th>
                    <th className="text-right pb-2 pr-3">Rate</th>
                    <th className="text-right pb-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {(so.items ?? []).map((item, i) => (
                    <tr key={item.name ?? i}>
                      <td className="py-2 pr-3 font-medium text-text-primary">{item.item_name || item.item_code}</td>
                      <td className="py-2 pr-3 text-text-secondary text-xs">{item.description || "—"}</td>
                      <td className="py-2 pr-3 text-right">{item.qty}</td>
                      <td className="py-2 pr-3 text-right">{formatCurrency(item.rate)}</td>
                      <td className="py-2 text-right font-semibold">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border-light">
                    <td colSpan={4} className="pt-3 text-right font-semibold text-text-primary">Grand Total</td>
                    <td className="pt-3 text-right font-bold text-primary text-base">{formatCurrency(so.grand_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linked Invoices */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-light">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-text-primary">Invoices from this Order</h3>
              {linkedInvoices.length > 0 && (
                <Badge variant="default">{linkedInvoices.length}</Badge>
              )}
            </div>
          </div>

          {isDiscontinued && (
            <div className="flex items-center gap-3 rounded-[12px] border border-error/20 bg-error-light p-4 mb-4">
              <AlertCircle className="h-5 w-5 text-error flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-error">Student Discontinued</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  This student has been discontinued. Payments are blocked and outstanding amounts have been written off as credit notes.
                </p>
              </div>
            </div>
          )}

          {isMissingInvoices && missingInvoiceAmount > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-[12px] border border-warning/30 bg-warning/5 p-4 mb-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-warning">Missing Invoice Detected</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {linkedInvoices.length}/{numInst} invoices found — {formatCurrency(missingInvoiceAmount)} is unbilled.
                    This can happen if the system was busy during admission.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={repairMissingMutation.isPending}
                onClick={() => repairMissingMutation.mutate()}
              >
                {repairMissingMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Repairing...</>
                ) : (
                  <><RefreshCw className="h-4 w-4" /> Repair</>
                )}
              </Button>
            </div>
          )}

          {so.student && so.company && (
            <div className="mb-4 rounded-[12px] border border-border-light bg-app-bg px-4 py-3">
              <StudentTransactionHistory
                studentId={so.student}
                branch={so.company}
              />
            </div>
          )}

          {linkedInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-text-tertiary">
              <FileText className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm font-medium">No invoices created yet</p>
              <p className="text-xs mt-1">Invoices are auto-created on admission.</p>
            </div>
          ) : (
            <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 shadow-sm">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="text-left py-3 px-4">#</th>
                    <th className="text-left py-3 px-4">Invoice #</th>
                    <th className="text-left py-3 px-4">Due Date</th>
                    <th className="text-right py-3 px-4">Grand Total</th>
                    <th className="text-right py-3 px-4">Outstanding</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                  {sortedInvoices.map((inv, idx) => {
                    const isPaid = inv.outstanding_amount === 0;
                    const isOverdue = inv.due_date && inv.due_date < new Date().toISOString().split("T")[0];
                    return (
                      <tr key={inv.name} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-colors duration-150">
                        <td className="py-3 px-4 text-xs text-slate-400 dark:text-slate-500 font-medium">
                          {idx + 1}/{sortedInvoices.length}
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/dashboard/branch-manager/invoices/${encodeURIComponent(inv.name)}`}
                            className="font-mono text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline"
                          >
                            {inv.name}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                          {inv.due_date ? formatDate(inv.due_date) : formatDate(inv.posting_date)}
                        </td>
                        <td className="py-3 px-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {formatCurrency(inv.grand_total)}
                        </td>
                        <td className="py-3 px-4 text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                          {formatCurrency(inv.outstanding_amount)}
                        </td>
                        <td className="py-3 px-4">
                          {(() => {
                            const statusStr = inv.status || "";
                            if (isPaid || statusStr === "Paid") {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                                  Paid
                                </span>
                              );
                            }
                            if (statusStr === "Partly Paid") {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  Partly Paid
                                </span>
                              );
                            }
                            if (statusStr === "Unpaid" || statusStr === "Overdue" || isOverdue) {
                              const label = statusStr === "Overdue" || isOverdue ? "Overdue" : "Unpaid";
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  {label}
                                </span>
                              );
                            }
                            // Fallback
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                {statusStr}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {inv.outstanding_amount > 0 && !isDiscontinued && (
                            <button
                              onClick={() => openPaymentModal(inv)}
                              className="ml-auto flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-green-600 border border-green-200 bg-white hover:bg-green-600 hover:border-green-600 hover:text-white dark:border-green-800 dark:bg-slate-900 dark:text-green-400 dark:hover:bg-green-600 dark:hover:text-white shadow-sm transition-all duration-150 active:scale-95 cursor-pointer"
                            >
                              <Banknote className="h-3.5 w-3.5" /> Pay
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Payment Modal (Online + Cash) ────────────────────── */}
      {paymentInvoice && (
        <CollectPaymentModal
          isOpen={!!paymentInvoice}
          onClose={closePaymentModal}
          invoice={paymentInvoice}
          studentName={so?.customer_name || (paymentInvoice as any)?.student_name || ""}
          studentId={so?.student || (paymentInvoice as any)?.student || ""}
          customer={so?.customer || ""}
          onPaymentDone={onPaymentDone}
          allowOffline={true}
        />
      )}
    </motion.div>
  );
}
