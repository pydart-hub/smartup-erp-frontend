"use client";

import React, { useState, useCallback } from "react";
import {
  CheckCircle2,
  IndianRupee,
  X,
  Loader2,
  Calendar,
  CreditCard,
  Banknote,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import RazorpayPayButton from "@/components/payments/RazorpayPayButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/* ──────────────────────────────────────────────────────── */
/* Types                                                    */
/* ──────────────────────────────────────────────────────── */

export interface InvoiceForPayment {
  invoiceId: string;
  label: string;
  amount: number;
  dueDate: string;
}

export interface PostAdmissionPaymentProps {
  open: boolean;
  onClose: () => void;

  /** Student info */
  studentName: string;
  customerName: string;

  /** Guardian / parent info */
  guardianName: string;
  guardianEmail: string;
  guardianPhone?: string;

  /** Mode chosen during admission */
  mode: "Cash" | "Online";

  /** Action chosen during admission */
  action: "pay_now" | "send_to_parent";

  /** Invoices generated from the admission */
  invoices: InvoiceForPayment[];

  /** Sales Order name */
  salesOrderName?: string;
}

/* ──────────────────────────────────────────────────────── */
/* Cash Payment sub-form                                    */
/* ──────────────────────────────────────────────────────── */

function CashPaymentForm({
  invoice,
  onPaid,
}: {
  invoice: InvoiceForPayment;
  onPaid: (invoiceId: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("Cash");
  const [referenceNo, setReferenceNo] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const handleRecordCash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/record-cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          invoice_id: invoice.invoiceId,
          amount: invoice.amount,
          mode_of_payment: mode,
          posting_date: today,
          reference_no: referenceNo || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to record payment");
      }

      const data = await res.json();
      toast.success(`Payment recorded — ${data.payment_entry}`, {
        description: `₹${invoice.amount.toLocaleString("en-IN")} for ${invoice.invoiceId}`,
      });
      onPaid(invoice.invoiceId);
    } catch (err) {
      toast.error((err as Error).message || "Payment recording failed");
    } finally {
      setLoading(false);
    }
  }, [invoice, mode, referenceNo, today, onPaid]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {(["Cash", "UPI", "Bank Transfer", "Cheque"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-3 py-2 text-xs font-medium rounded-[8px] border transition-all ${
              mode === m
                ? "border-primary bg-primary/5 text-primary"
                : "border-border-input bg-surface text-text-secondary hover:border-border-input/80"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <Input
        placeholder="Receipt / UTR number (optional)"
        value={referenceNo}
        onChange={(e) => setReferenceNo(e.target.value)}
      />

      <Button
        variant="primary"
        className="w-full"
        onClick={handleRecordCash}
        loading={loading}
        disabled={loading}
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Recording…</>
        ) : (
          <><Banknote className="h-4 w-4" /> Record ₹{invoice.amount.toLocaleString("en-IN")}</>
        )}
      </Button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/* Main dialog                                              */
/* ──────────────────────────────────────────────────────── */

export default function PostAdmissionPayment({
  open,
  onClose,
  studentName,
  customerName,
  guardianName,
  guardianEmail,
  guardianPhone,
  mode,
  action,
  invoices,
  salesOrderName,
}: PostAdmissionPaymentProps) {
  const [paidInvoices, setPaidInvoices] = useState<Set<string>>(new Set());
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handlePaid = useCallback((invoiceId: string) => {
    setPaidInvoices((prev) => new Set([...prev, invoiceId]));
  }, []);

  const allPaid = invoices.length > 0 && invoices.every((inv) => paidInvoices.has(inv.invoiceId));
  const totalAmount = invoices.reduce((s, i) => s + i.amount, 0);

  // Send payment request email to parent
  const handleSendRequest = useCallback(async () => {
    setSendingRequest(true);
    try {
      const res = await fetch("/api/payments/send-payment-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          guardian_email: guardianEmail,
          guardian_name: guardianName,
          student_name: studentName,
          total_amount: totalAmount,
          invoices: invoices.map((inv) => ({
            invoice_id: inv.invoiceId,
            amount: inv.amount,
            due_date: inv.dueDate,
            label: inv.label,
          })),
          sales_order: salesOrderName,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to send payment request");
      }

      toast.success("Payment request sent!", {
        description: `Email sent to ${guardianEmail}`,
      });
      setRequestSent(true);
    } catch (err) {
      toast.error((err as Error).message || "Failed to send request");
    } finally {
      setSendingRequest(false);
    }
  }, [guardianEmail, guardianName, studentName, totalAmount, invoices, salesOrderName]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-surface border border-border-light shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-surface z-10 flex items-center justify-between px-6 py-4 border-b border-border-light">
          <div>
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              {action === "pay_now" ? (
                <><CreditCard className="h-5 w-5 text-primary" /> Collect Payment</>
              ) : (
                <><Send className="h-5 w-5 text-primary" /> Send Payment Request</>
              )}
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              {studentName} — {mode} payment
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-app-bg transition-colors"
          >
            <X className="h-4 w-4 text-text-tertiary" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Summary */}
          <div className="bg-brand-wash rounded-[12px] border border-primary/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Total Fee</p>
                <p className="text-xl font-bold text-primary">
                  ₹{totalAmount.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-secondary">
                  {invoices.length} instalment{invoices.length !== 1 ? "s" : ""}
                </p>
                {salesOrderName && (
                  <p className="text-xs text-text-tertiary">{salesOrderName}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── PAY NOW FLOW ── */}
          {action === "pay_now" && (
            <div className="space-y-4">
              {invoices.length === 0 ? (
                <div className="text-center py-6 text-text-secondary text-sm">
                  No invoices generated yet. Payment can be collected from the Sales Order page.
                </div>
              ) : (
                invoices.map((inv, idx) => {
                  const isPaid = paidInvoices.has(inv.invoiceId);

                  return (
                    <div
                      key={inv.invoiceId}
                      className={`rounded-[12px] border p-4 transition-all ${
                        isPaid
                          ? "border-success/20 bg-success-light"
                          : "border-border-light bg-app-bg"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {isPaid ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </div>
                          )}
                          <div>
                            <span className="text-sm font-semibold text-text-primary">
                              {inv.label}
                            </span>
                            <span className="text-xs text-text-tertiary ml-2">
                              {inv.invoiceId}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-text-primary">
                          ₹{inv.amount.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-text-secondary mb-3">
                        <Calendar className="h-3.5 w-3.5" />
                        Due{" "}
                        {new Date(inv.dueDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>

                      {isPaid ? (
                        <div className="flex items-center gap-2 text-sm text-success font-medium">
                          <CheckCircle2 className="h-4 w-4" /> Payment recorded
                        </div>
                      ) : mode === "Online" ? (
                        idx === 0 ? (
                          <RazorpayPayButton
                            amount={inv.amount}
                            invoiceId={inv.invoiceId}
                            studentName={studentName}
                            customer={customerName}
                            parentName={guardianName}
                            parentEmail={guardianEmail}
                            parentPhone={guardianPhone}
                            onSuccess={() => handlePaid(inv.invoiceId)}
                            size="md"
                            className="w-full"
                          />
                        ) : (
                          <div className="text-xs text-text-tertiary italic">
                            Payable later from parent dashboard
                          </div>
                        )
                      ) : (
                        <CashPaymentForm invoice={inv} onPaid={handlePaid} />
                      )}
                    </div>
                  );
                })
              )}

              {allPaid && (
                <div className="bg-success-light rounded-[12px] border border-success/20 p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="text-sm font-semibold text-success">All payments collected!</p>
                  <p className="text-xs text-text-secondary mt-1">
                    Receipt email will be sent to {guardianEmail}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── SEND TO PARENT FLOW ── */}
          {action === "send_to_parent" && (
            <div className="space-y-4">
              {/* Invoice preview */}
              <div className="rounded-[12px] border border-border-light overflow-hidden">
                <div className="bg-app-bg px-4 py-2.5 text-xs font-medium text-text-secondary border-b border-border-light">
                  Invoices to be included
                </div>
                {invoices.map((inv, idx) => (
                  <div
                    key={inv.invoiceId}
                    className="flex items-center justify-between px-4 py-2.5 border-b border-border-light last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <span className="text-sm text-text-primary">{inv.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-text-primary">
                        ₹{inv.amount.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-text-tertiary block">
                        {new Date(inv.dueDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recipient info */}
              <div className="bg-app-bg rounded-md p-3 text-sm text-text-secondary">
                <p>
                  Payment request will be sent to{" "}
                  <span className="font-medium text-text-primary">{guardianName}</span>{" "}
                  at{" "}
                  <span className="font-medium text-primary">{guardianEmail}</span>
                </p>
                <p className="text-xs text-text-tertiary mt-1">
                  Includes a &quot;Pay Now&quot; link to the parent fee dashboard
                </p>
              </div>

              {requestSent ? (
                <div className="bg-success-light rounded-[12px] border border-success/20 p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="text-sm font-semibold text-success">Request sent!</p>
                  <p className="text-xs text-text-secondary mt-1">
                    {guardianName} will receive the payment link at {guardianEmail}
                  </p>
                </div>
              ) : (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleSendRequest}
                  loading={sendingRequest}
                  disabled={sendingRequest || invoices.length === 0}
                >
                  {sendingRequest ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                  ) : (
                    <><Send className="h-4 w-4" /> Send Payment Request</>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface border-t border-border-light px-6 py-4">
          <Button variant="outline" className="w-full" onClick={onClose}>
            {allPaid || requestSent ? "Done" : "Skip & Close"}
          </Button>
        </div>
      </div>
    </div>
  );
}
