"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { CheckCircle2, Clock, AlertCircle, CircleDot, Loader2, XCircle, IndianRupee, Lock, FileText } from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";

// ── Razorpay types ──
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayInstance {
  open: () => void;
  on: (event: string, callback: (response: unknown) => void) => void;
}
interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// ── Data types ──
interface InvoiceData {
  name: string;
  posting_date: string;
  due_date: string;
  grand_total: number;
  outstanding_amount: number;
  status: string;
  label: string;
}

interface PayData {
  salesOrder: string;
  customer: string;
  studentName: string;
  programName: string;
  guardianName: string;
  academicYear: string;
  branch: string;
  grandTotal: number;
  discontinued: boolean;
  invoices: InvoiceData[];
}

// ── Helpers ──
function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInvoiceStatus(inv: InvoiceData): "paid" | "overdue" | "due-today" | "upcoming" | "partially-paid" {
  if (inv.outstanding_amount <= 0) return "paid";
  if (inv.outstanding_amount > 0 && inv.outstanding_amount < inv.grand_total) return "partially-paid";
  const today = new Date().toISOString().split("T")[0];
  if (inv.due_date < today) return "overdue";
  if (inv.due_date === today) return "due-today";
  return "upcoming";
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const statusConfig = {
  paid: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-200", badge: "Paid" },
  "partially-paid": { icon: CircleDot, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", badge: "Partial" },
  overdue: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", badge: "Overdue" },
  "due-today": { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", badge: "Due Today" },
  upcoming: { icon: Clock, color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200", badge: "Upcoming" },
};

export default function PayPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<PayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingInvoice, setPayingInvoice] = useState<string | null>(null);
  const [paidInvoices, setPaidInvoices] = useState<Set<string>>(new Set());

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/pay/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load invoices");
      }
      setData(await res.json());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchInvoices();
  }, [token, fetchInvoices]);

  const handlePay = useCallback(async (inv: InvoiceData) => {
    if (!data) return;
    setPayingInvoice(inv.name);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Failed to load payment gateway");

      // Create order
      const orderRes = await fetch("/api/pay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          amount: inv.outstanding_amount,
          invoice_id: inv.name,
          student_name: data.studentName,
          customer: data.customer,
        }),
      });
      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create order");
      }
      const orderData = await orderRes.json();

      // Open Razorpay
      const rzp = new window.Razorpay({
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "SmartUp Learning",
        description: `${inv.label} — ${data.studentName}`,
        order_id: orderData.order_id,
        prefill: { name: data.guardianName },
        theme: { color: "#6366f1" },
        handler: async (response: RazorpayResponse) => {
          // Verify payment
          try {
            const verifyRes = await fetch("/api/pay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                invoice_id: inv.name,
                amount: inv.outstanding_amount,
                student_name: data.studentName,
                customer: data.customer,
              }),
            });
            if (!verifyRes.ok) {
              const errData = await verifyRes.json().catch(() => ({}));
              throw new Error(errData.error || "Verification failed");
            }
            setPaidInvoices(prev => new Set(prev).add(inv.name));
            // Refresh data after short delay to let Frappe update
            setTimeout(() => fetchInvoices(), 2000);
          } catch (err) {
            alert(`Payment may have been received but verification failed: ${(err as Error).message}. Please contact support.`);
          }
          setPayingInvoice(null);
        },
        modal: {
          ondismiss: () => setPayingInvoice(null),
        },
      });

      rzp.on("payment.failed", () => {
        setPayingInvoice(null);
        alert("Payment failed. Please try again.");
      });

      rzp.open();
    } catch (err) {
      setPayingInvoice(null);
      alert((err as Error).message);
    }
  }, [data, token, fetchInvoices]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-600">Loading fee details...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="mt-4 text-lg font-semibold text-gray-900">Link Expired or Invalid</h1>
          <p className="mt-2 text-sm text-gray-600">
            {error || "This payment link is no longer valid. Please contact your school for a new link."}
          </p>
        </div>
      </div>
    );
  }

  const totalPaid = data.invoices.reduce((s, i) => s + (i.grand_total - i.outstanding_amount), 0);
  const totalOutstanding = data.invoices.reduce((s, i) => s + i.outstanding_amount, 0);
  const progressPct = data.grandTotal > 0 ? Math.round((totalPaid / data.grandTotal) * 100) : 0;

  // Sequential payment: only the first unpaid instalment can be paid
  const firstUnpaidIndex = useMemo(
    () => data.invoices.findIndex((inv) => inv.outstanding_amount > 0 && !paidInvoices.has(inv.name)),
    [data.invoices, paidInvoices],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">SmartUp Learning</h1>
            <p className="text-xs text-gray-500">Fee Payment Portal</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Student info card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">{data.studentName}</h2>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
            {data.programName && <span>{data.programName}</span>}
            {data.branch && <span>{data.branch}</span>}
            {data.academicYear && <span>{data.academicYear}</span>}
          </div>

          {/* Progress */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-600">
              <span>{formatINR(totalPaid)} paid of {formatINR(data.grandTotal)}</span>
              <span className="font-semibold">{progressPct}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {totalOutstanding > 0 && (
              <p className="text-xs text-gray-500">
                Outstanding: <span className="font-semibold text-gray-900">{formatINR(totalOutstanding)}</span>
              </p>
            )}
          </div>
        </div>

        {/* Discontinued warning */}
        {data.discontinued && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-xs text-red-700">
              This student&apos;s enrollment has been discontinued. Payments are no longer accepted.
            </p>
          </div>
        )}

        {/* Invoices */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Instalments</h3>
            <Link
              href={`/pay/${token}/invoice`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              View Invoice
            </Link>
          </div>
          {data.invoices.map((inv, index) => {
            const status = paidInvoices.has(inv.name) ? "paid" : getInvoiceStatus(inv);
            const config = statusConfig[status];
            const Icon = config.icon;
            const canPay = !data.discontinued && index === firstUnpaidIndex && !paidInvoices.has(inv.name);
            const isLocked = !data.discontinued && inv.outstanding_amount > 0 && !paidInvoices.has(inv.name) && index !== firstUnpaidIndex;
            const isPaying = payingInvoice === inv.name;

            return (
              <div
                key={inv.name}
                className={`rounded-xl border p-4 ${config.border} ${config.bg}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <span className="text-sm font-semibold text-gray-900">{inv.label}</span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${config.color} ${config.bg}`}>
                      {config.badge}
                    </span>
                  </div>
                  <span className="text-base font-bold text-gray-900">{formatINR(inv.grand_total)}</span>
                </div>

                {/* Partial payment progress */}
                {status === "partially-paid" && (
                  <div className="mt-2 space-y-1">
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${Math.round(((inv.grand_total - inv.outstanding_amount) / inv.grand_total) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-600">
                      <span>{formatINR(inv.grand_total - inv.outstanding_amount)} paid</span>
                      <span>Remaining: {formatINR(inv.outstanding_amount)}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">Due {formatDate(inv.due_date)}</span>

                  {canPay && (
                    <button
                      onClick={() => handlePay(inv)}
                      disabled={isPaying || !!payingInvoice}
                      className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isPaying ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Processing…
                        </>
                      ) : (
                        <>
                          <IndianRupee className="h-3.5 w-3.5" />
                          Pay {formatINR(inv.outstanding_amount)}
                        </>
                      )}
                    </button>
                  )}

                  {isLocked && (
                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5" />
                      Pay previous first
                    </span>
                  )}

                  {status === "paid" && (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Paid
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pt-4">
          Powered by SmartUp Learning Ventures
        </p>
      </main>
    </div>
  );
}
