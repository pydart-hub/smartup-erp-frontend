"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft, FileText, AlertCircle, IndianRupee,
  CheckCircle2, Clock, Ban, CreditCard, X, ExternalLink,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { recordPaymentSchema, type RecordPaymentValues } from "@/lib/validators/sales";
import {
  getSalesInvoice, cancelSalesInvoice, createSalesPayment,
} from "@/lib/api/sales";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { SalesInvoiceStatus } from "@/lib/types/sales";
import { toast } from "sonner";

// ── helpers ────────────────────────────────────────────────────────────────

function statusVariant(
  status: SalesInvoiceStatus
): "success" | "warning" | "error" | "info" | "default" {
  if (status === "Paid") return "success";
  if (status === "Unpaid") return "warning";
  if (status === "Overdue") return "error";
  if (status === "Cancelled" || status === "Return") return "default";
  return "info";
}

function statusIcon(status: SalesInvoiceStatus) {
  if (status === "Paid") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "Overdue") return <AlertCircle className="h-4 w-4" />;
  if (status === "Cancelled") return <Ban className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
}

const MODES = ["Cash", "Bank Transfer", "UPI", "Cheque", "Razorpay"];

const selectCls =
  "h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full";

// ── component ──────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const {
    data: invRes,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["sales-invoice", id],
    queryFn: () => getSalesInvoice(id),
    staleTime: 30_000,
  });

  const inv = invRes?.data;

  // ── payment form ──────────────────────────────────────────
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset: resetPayForm,
    formState: { errors: payErrors, isSubmitting: paySubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<RecordPaymentValues>({
    resolver: zodResolver(recordPaymentSchema) as any,
    defaultValues: {
      posting_date: new Date().toISOString().split("T")[0],
      mode_of_payment: "Cash",
      paid_amount: 0,
    },
  });

  React.useEffect(() => {
    if (inv) setValue("paid_amount", inv.outstanding_amount);
  }, [inv, setValue]);

  async function onPaymentSubmit(values: RecordPaymentValues) {
    if (!inv) return;
    try {
      await createSalesPayment({
        customer: inv.customer,
        paid_amount: values.paid_amount,
        mode_of_payment: values.mode_of_payment,
        posting_date: values.posting_date,
        company: inv.company,
        reference_no: values.reference_no,
        reference_date: values.reference_date,
        remarks: values.remarks,
        references: [
          {
            reference_doctype: "Sales Invoice",
            reference_name: inv.name,
            allocated_amount: values.paid_amount,
          },
        ],
      });
      toast.success("Payment recorded successfully!");
      resetPayForm();
      setShowPaymentForm(false);
      queryClient.invalidateQueries({ queryKey: ["sales-invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Failed to record payment";
      toast.error(msg);
    }
  }

  async function handleCancel() {
    if (!inv) return;
    if (!confirm(`Cancel invoice ${inv.name}? This cannot be undone.`)) return;
    setCancelling(true);
    try {
      await cancelSalesInvoice(inv.name);
      toast.success("Invoice cancelled.");
      queryClient.invalidateQueries({ queryKey: ["sales-invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to cancel invoice"
      );
    } finally {
      setCancelling(false);
    }
  }

  // ── loading ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <BreadcrumbNav />
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-[10px]" />
          <Skeleton className="h-7 w-64" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-5"><Skeleton className="h-48" /></CardContent></Card>
      </div>
    );
  }

  if (isError || !inv) {
    return (
      <div className="max-w-5xl mx-auto">
        <BreadcrumbNav />
        <Card className="mt-6">
          <CardContent className="p-10 text-center">
            <AlertCircle className="h-10 w-10 text-error mx-auto mb-3" />
            <p className="text-text-secondary">
              {(error as Error)?.message || "Invoice not found."}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => router.back()}>
              Go back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const paidAmount = inv.grand_total - inv.outstanding_amount;
  const canReceivePayment = inv.docstatus === 1 && inv.outstanding_amount > 0 &&
    inv.status !== "Cancelled" && inv.status !== "Paid";
  const canCancel = inv.docstatus === 1 && inv.status !== "Cancelled";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-5xl mx-auto">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-text-secondary hover:bg-app-bg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {inv.name}
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {inv.customer_name || inv.customer} · {inv.company}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(inv.status as SalesInvoiceStatus)}>
            <span className="flex items-center gap-1">
              {statusIcon(inv.status as SalesInvoiceStatus)}
              {inv.status}
            </span>
          </Badge>
          {canReceivePayment && (
            <Button variant="primary" size="sm" onClick={() => setShowPaymentForm(true)}>
              <CreditCard className="h-4 w-4" /> Record Payment
            </Button>
          )}
          {canCancel && (
            <Button variant="outline" size="sm" loading={cancelling} onClick={handleCancel}>
              <Ban className="h-4 w-4" /> Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Grand Total",
            value: formatCurrency(inv.grand_total),
            icon: <IndianRupee className="h-5 w-5 text-primary" />,
          },
          {
            label: "Outstanding",
            value: formatCurrency(inv.outstanding_amount),
            icon: <Clock className="h-5 w-5 text-warning" />,
            valueClass: inv.outstanding_amount > 0 ? "text-error" : "text-success",
          },
          {
            label: "Paid",
            value: formatCurrency(paidAmount),
            icon: <CheckCircle2 className="h-5 w-5 text-success" />,
          },
          {
            label: "Due Date",
            value: inv.due_date ? formatDate(inv.due_date) : "—",
            icon: <AlertCircle className="h-5 w-5 text-info" />,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">{stat.label}</p>
                {stat.icon}
              </div>
              <p className={`text-xl font-bold ${stat.valueClass ?? "text-text-primary"}`}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Details + Items */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Details */}
        <Card className="md:col-span-2">
          <CardContent className="p-5">
            <h3 className="font-semibold text-text-primary mb-4 pb-3 border-b border-border-light">Details</h3>
            <dl className="space-y-3 text-sm">
              {[
                ["Invoice #", inv.name],
                ["Customer", inv.customer_name || inv.customer],
                ["Company", inv.company],
                ["Posting Date", formatDate(inv.posting_date)],
                ["Due Date", inv.due_date ? formatDate(inv.due_date) : "—"],
                ["Created", inv.creation ? formatDate(inv.creation) : "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-start gap-2">
                  <dt className="text-text-secondary shrink-0">{label}</dt>
                  <dd className="text-text-primary font-medium text-right">{value}</dd>
                </div>
              ))}
              {inv.sales_order && (
                <div className="flex justify-between items-start gap-2">
                  <dt className="text-text-secondary shrink-0">Sales Order</dt>
                  <dd>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/branch-manager/sales-orders/${encodeURIComponent(inv.sales_order!)}`
                        )
                      }
                      className="text-primary hover:underline flex items-center gap-1 font-medium text-right"
                    >
                      {inv.sales_order}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="md:col-span-3">
          <CardContent className="p-5">
            <h3 className="font-semibold text-text-primary mb-4 pb-3 border-b border-border-light">
              Items ({inv.items?.length ?? 0})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light text-text-secondary text-xs">
                    <th className="text-left pb-2 pr-3">Item</th>
                    <th className="text-right pb-2 pr-3">Qty</th>
                    <th className="text-right pb-2 pr-3">Rate</th>
                    <th className="text-right pb-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light/50">
                  {(inv.items ?? []).map((item, i) => (
                    <tr key={i}>
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-text-primary">{item.item_name}</p>
                        {item.description && (
                          <p className="text-xs text-text-tertiary">{item.description}</p>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-text-secondary">
                        {item.qty} {item.uom}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-text-secondary">
                        {formatCurrency(item.rate)}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-text-primary">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border-light">
                    <td colSpan={3} className="pt-3 text-right font-bold text-text-primary pr-3">
                      Grand Total
                    </td>
                    <td className="pt-3 text-right font-bold text-primary">
                      {formatCurrency(inv.grand_total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment history (if any) */}
      {inv.payments && inv.payments.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-text-primary mb-4 pb-3 border-b border-border-light">
              Payments ({inv.payments.length})
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light text-text-secondary text-xs">
                  <th className="text-left pb-2 pr-3">Mode</th>
                  <th className="text-right pb-2 pr-3">Amount</th>
                  <th className="text-right pb-2">Allocated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/50">
                {inv.payments.map((p, i) => (
                  <tr key={i}>
                    <td className="py-2.5 pr-3 text-text-primary">{p.mode_of_payment}</td>
                    <td className="py-2.5 pr-3 text-right text-text-secondary">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-success">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Record Payment Modal */}
      <AnimatePresence>
        {showPaymentForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowPaymentForm(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ ease: "easeOut" as const, duration: 0.15 }}
              className="bg-surface rounded-2xl shadow-2xl border border-border-light w-full max-w-lg"
            >
              <div className="flex items-center justify-between p-5 border-b border-border-light">
                <h2 className="font-bold text-text-primary flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" /> Record Payment
                </h2>
                <button onClick={() => setShowPaymentForm(false)} className="text-text-tertiary hover:text-text-primary">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onPaymentSubmit)} className="p-5 space-y-4">
                {/* Invoice summary */}
                <div className="bg-brand-wash rounded-[10px] p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Invoice</span>
                    <span className="font-medium text-text-primary">{inv.name}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-text-secondary">Outstanding</span>
                    <span className="font-bold text-primary">{formatCurrency(inv.outstanding_amount)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={1}
                      max={inv.outstanding_amount}
                      {...register("paid_amount")}
                      className={selectCls}
                    />
                    {payErrors.paid_amount && (
                      <p className="text-xs text-error mt-1">{payErrors.paid_amount.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                      Mode *
                    </label>
                    <select {...register("mode_of_payment")} className={selectCls}>
                      {MODES.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                    Posting Date *
                  </label>
                  <input type="date" {...register("posting_date")} className={selectCls} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                      Reference No
                    </label>
                    <input
                      {...register("reference_no")}
                      placeholder="UTR / Cheque No."
                      className={selectCls}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                      Reference Date
                    </label>
                    <input type="date" {...register("reference_date")} className={selectCls} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                    Remarks
                  </label>
                  <textarea
                    {...register("remarks")}
                    rows={2}
                    placeholder="Optional note…"
                    className="w-full rounded-[10px] border border-border-input bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowPaymentForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" loading={paySubmitting}>
                    {paySubmitting ? "Saving…" : `Pay ${formatCurrency(watch("paid_amount") ?? 0)}`}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
