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
import { INSTALMENT_DUE_DATES } from "@/lib/utils/constants";
import { toast } from "sonner";
import type { SalesOrderStatus, SalesInvoice } from "@/lib/types/sales";
import RazorpayPayButton from "@/components/payments/RazorpayPayButton";

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

  // ── Payment modal state ─────────────────────────────────────
  const [paymentInvoice, setPaymentInvoice] = useState<SalesInvoice | null>(null);
  const [payTab, setPayTab] = useState<"online" | "cash">("online");
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("Cash");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payRef, setPayRef] = useState("");

  function openPaymentModal(inv: SalesInvoice) {
    setPaymentInvoice(inv);
    setPayTab("online");
    setPayAmount(String(inv.outstanding_amount));
    setPayMode("Cash");
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayRef("");
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

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!paymentInvoice) throw new Error("No invoice selected");
      const res = await fetch("/api/payments/record-cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          invoice_id: paymentInvoice.name,
          amount: Number(payAmount),
          mode_of_payment: payMode,
          posting_date: payDate,
          reference_no: payRef || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to record payment");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Payment recorded: ${data.payment_entry}`);
      if (paymentInvoice) onPaymentDone(paymentInvoice.name);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

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
    queryFn: () => getSalesInvoices({ sales_order: decodedId, limit_page_length: 20 }),
    enabled: !!so,
    staleTime: 30_000,
  });
  const linkedInvoices = invoicesRes?.data ?? [];

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
      const numInst = Number(so.custom_no_of_instalments) || 1;
      const total = so.grand_total;
      const academicYear = so.custom_academic_year || "2026-2027";
      const startYear = parseInt(academicYear.split("-")[0], 10);

      // Build due dates
      function buildDueDate(tmpl: { month: number; day: number }) {
        const calYear = tmpl.month < 3 ? startYear + 1 : startYear;
        return `${calYear}-${String(tmpl.month + 1).padStart(2, "0")}-${String(tmpl.day).padStart(2, "0")}`;
      }

      let schedule: { amount: number; dueDate: string; label: string }[];
      if (numInst === 1) {
        schedule = [{ amount: total, dueDate: new Date().toISOString().split("T")[0], label: "Full Payment" }];
      } else {
        const dueDates = numInst === 4 ? INSTALMENT_DUE_DATES.quarterly
          : numInst === 6 ? INSTALMENT_DUE_DATES.inst6
          : numInst === 8 ? INSTALMENT_DUE_DATES.inst8
          : INSTALMENT_DUE_DATES.quarterly;
        const perInst = Math.floor(total / numInst);
        const remainder = total - perInst * (numInst - 1);
        const labels = numInst === 4 ? ["Q1", "Q2", "Q3", "Q4"] : null;
        schedule = dueDates.slice(0, numInst).map((tmpl, i) => ({
          amount: i === numInst - 1 ? remainder : perInst,
          dueDate: buildDueDate(tmpl),
          label: labels?.[i] || `Instalment ${i + 1}`,
        }));
      }

      const res = await fetch("/api/admission/create-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ salesOrderName: so.name, schedule }),
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

  const perBilled = so?.per_billed ?? 0;
  const isFullyBilled = perBilled >= 100;
  const canCreateInvoice = so?.docstatus === 1 && !isFullyBilled && so.status !== "Cancelled";

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
          {canCreateInvoice && (
            <Link href={`/dashboard/branch-manager/invoices/new?so=${encodeURIComponent(so.name)}`}>
              <Button variant="primary" size="sm">
                <Receipt className="h-4 w-4" /> Create Invoice
              </Button>
            </Link>
          )}
          {isFullyBilled && (
            <Badge variant="success">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Fully Billed
            </Badge>
          )}
          {so.docstatus === 1 && status !== "Cancelled" && (
            <Button variant="danger" size="sm" onClick={handleCancel}>
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      {/* Hero summary card with billing progress */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-xs text-text-tertiary mb-1">Grand Total</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(so.grand_total)}</p>
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
                {so.grand_total > 0 ? Math.round((totalPaid / so.grand_total) * 100) : 0}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-app-bg rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totalOutstanding === 0 && linkedInvoices.length > 0 ? "bg-success" : totalPaid > 0 ? "bg-primary" : "bg-border-light"
                }`}
                style={{ width: `${so.grand_total > 0 ? Math.min((totalPaid / so.grand_total) * 100, 100) : 0}%` }}
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
            {canCreateInvoice && (
              <Link href={`/dashboard/branch-manager/invoices/new?so=${encodeURIComponent(so.name)}`}>
                <Button variant="outline" size="sm">
                  <Receipt className="h-4 w-4" /> Create Invoice
                </Button>
              </Link>
            )}
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

          {linkedInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-text-tertiary">
              <FileText className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm font-medium">No invoices created yet</p>
              <p className="text-xs mt-1">Invoices are auto-created on admission.</p>
              {canCreateInvoice && so.custom_no_of_instalments && (
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  disabled={generateInvoicesMutation.isPending}
                  onClick={() => generateInvoicesMutation.mutate()}
                >
                  {generateInvoicesMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><RefreshCw className="h-4 w-4" /> Generate {so.custom_no_of_instalments} Invoice(s)</>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light text-text-secondary text-xs font-semibold">
                  <th className="text-left pb-2 pr-3">#</th>
                  <th className="text-left pb-2 pr-3">Invoice #</th>
                  <th className="text-left pb-2 pr-3">Due Date</th>
                  <th className="text-right pb-2 pr-3">Grand Total</th>
                  <th className="text-right pb-2 pr-3">Outstanding</th>
                  <th className="text-left pb-2 pr-3">Status</th>
                  <th className="text-right pb-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {sortedInvoices.map((inv, idx) => (
                  <tr key={inv.name} className="hover:bg-app-bg transition-colors">
                    <td className="py-2 pr-3 text-xs text-text-tertiary font-medium">
                      {idx + 1}/{sortedInvoices.length}
                    </td>
                    <td className="py-2 pr-3">
                      <Link
                        href={`/dashboard/branch-manager/invoices/${encodeURIComponent(inv.name)}`}
                        className="font-mono text-xs text-primary font-semibold hover:underline"
                      >
                        {inv.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-text-secondary">{inv.due_date ? formatDate(inv.due_date) : formatDate(inv.posting_date)}</td>
                    <td className="py-2 pr-3 text-right font-semibold">{formatCurrency(inv.grand_total)}</td>
                    <td className="py-2 pr-3 text-right text-warning font-semibold">{formatCurrency(inv.outstanding_amount)}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={inv.outstanding_amount === 0 ? "success" : inv.due_date && inv.due_date < new Date().toISOString().split("T")[0] ? "error" : "warning"}>
                        {inv.outstanding_amount === 0 ? "Paid" : inv.due_date && inv.due_date < new Date().toISOString().split("T")[0] ? "Overdue" : inv.status}
                      </Badge>
                    </td>
                    <td className="py-2 text-right">
                      {inv.outstanding_amount > 0 && !isDiscontinued && (
                        <Button variant="outline" size="sm" onClick={() => openPaymentModal(inv)}>
                          <Banknote className="h-3.5 w-3.5" /> Pay
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── Payment Modal (Online + Cash) ────────────────────── */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closePaymentModal} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-surface rounded-2xl shadow-2xl border border-border-light w-full max-w-md mx-4 p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-text-primary">Collect Payment</h2>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {paymentInvoice.name}
                  {sortedInvoices.length > 1 && (() => {
                    const idx = sortedInvoices.findIndex(inv => inv.name === paymentInvoice.name);
                    return idx >= 0 ? ` — Instalment ${idx + 1}/${sortedInvoices.length}` : "";
                  })()}
                </p>
              </div>
              <button onClick={closePaymentModal} className="text-text-tertiary hover:text-text-primary transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Invoice summary */}
            <div className="bg-app-bg rounded-xl p-4 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-text-tertiary">Invoice Total</span>
                <span className="font-semibold">{formatCurrency(paymentInvoice.grand_total)}</span>
              </div>
              {paymentInvoice.grand_total !== paymentInvoice.outstanding_amount && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-text-tertiary">Already Paid</span>
                  <span className="font-medium text-success">{formatCurrency(paymentInvoice.grand_total - paymentInvoice.outstanding_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm mt-1">
                <span className="text-text-tertiary">Outstanding</span>
                <span className="font-bold text-warning">{formatCurrency(paymentInvoice.outstanding_amount)}</span>
              </div>
              {paymentInvoice.due_date && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-text-tertiary">Due Date</span>
                  <span className="font-medium">{formatDate(paymentInvoice.due_date)}</span>
                </div>
              )}
            </div>

            {/* Payment mode tabs */}
            <div className="flex gap-1 p-1 bg-app-bg rounded-xl mb-5">
              <button
                onClick={() => setPayTab("online")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  payTab === "online"
                    ? "bg-surface text-primary shadow-sm"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                <CreditCard className="h-4 w-4" />
                Online (Razorpay)
              </button>
              <button
                onClick={() => setPayTab("cash")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  payTab === "cash"
                    ? "bg-surface text-primary shadow-sm"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                <Wallet className="h-4 w-4" />
                Cash / Offline
              </button>
            </div>

            {/* Online Tab */}
            {payTab === "online" && (
              <div className="space-y-4">
                <p className="text-xs text-text-tertiary">
                  Pay the full outstanding amount via Razorpay (Card, UPI, Net Banking).
                </p>
                <RazorpayPayButton
                  amount={paymentInvoice.outstanding_amount}
                  invoiceId={paymentInvoice.name}
                  studentName={so?.student || so?.customer_name || ""}
                  customer={so?.customer || ""}
                  onSuccess={() => onPaymentDone(paymentInvoice.name)}
                  onError={(err) => toast.error(err)}
                  size="md"
                  className="w-full"
                />
              </div>
            )}

            {/* Cash / Offline Tab */}
            {payTab === "cash" && (
              <div className="space-y-4">
                <Input
                  label="Amount (₹)"
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  min={1}
                  max={paymentInvoice.outstanding_amount}
                  step="0.01"
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-secondary">Mode of Payment</label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium border-primary bg-primary/5 text-primary"
                      disabled
                    >
                      <Banknote className="h-4 w-4" />
                      Cash
                    </button>
                  </div>
                </div>

                <Input
                  label="Payment Date"
                  type="date"
                  value={payDate}
                  readOnly
                  className="cursor-not-allowed opacity-70"
                />



                <div className="flex gap-3 mt-2">
                  <Button variant="outline" size="md" onClick={closePaymentModal} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    className="flex-1"
                    disabled={paymentMutation.isPending || !payAmount || Number(payAmount) <= 0 || Number(payAmount) > paymentInvoice.outstanding_amount}
                    onClick={() => paymentMutation.mutate()}
                  >
                    {paymentMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Recording...</>
                    ) : (
                      <><Banknote className="h-4 w-4" /> Record ₹{Number(payAmount || 0).toLocaleString("en-IN")}</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
