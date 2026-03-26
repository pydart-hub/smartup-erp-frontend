"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2, Clock, AlertCircle, CircleDot, Loader2, XCircle,
  ArrowLeft, FileText, Printer,
} from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";

// ── Data types ──
interface InvoiceItem {
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  name: string;
  posting_date: string;
  due_date: string;
  grand_total: number;
  outstanding_amount: number;
  status: string;
  label: string;
  items: InvoiceItem[];
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

const statusConfig = {
  paid: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", badge: "Paid" },
  "partially-paid": { icon: CircleDot, color: "text-amber-600", bg: "bg-amber-50", badge: "Partial" },
  overdue: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", badge: "Overdue" },
  "due-today": { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", badge: "Due Today" },
  upcoming: { icon: Clock, color: "text-gray-500", bg: "bg-gray-50", badge: "Upcoming" },
};

export default function InvoiceViewPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<PayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-600">Loading invoice details...</p>
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
            {error || "This link is no longer valid. Please contact your school for a new link."}
          </p>
        </div>
      </div>
    );
  }

  const totalPaid = data.invoices.reduce((s, i) => s + (i.grand_total - i.outstanding_amount), 0);
  const totalOutstanding = data.invoices.reduce((s, i) => s + i.outstanding_amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 print:border-b-0">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900">SmartUp Learning</h1>
              <p className="text-xs text-gray-500">Fee Invoice</p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Link
              href={`/pay/${token}`}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Pay
            </Link>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Student & Fee Summary */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{data.studentName}</h2>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                {data.programName && <span>{data.programName}</span>}
                {data.branch && <span>{data.branch}</span>}
                {data.academicYear && <span>{data.academicYear}</span>}
              </div>
              {data.guardianName && (
                <p className="mt-1 text-xs text-gray-500">Guardian: {data.guardianName}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <FileText className="h-5 w-5 text-indigo-600 ml-auto" />
              <p className="text-xs text-gray-500 mt-1">Order</p>
              <p className="text-xs font-mono text-gray-700">{data.salesOrder}</p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-center">
              <p className="text-[10px] uppercase font-semibold text-indigo-600 tracking-wider">Total Fee</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">{formatINR(data.grandTotal)}</p>
            </div>
            <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-center">
              <p className="text-[10px] uppercase font-semibold text-green-600 tracking-wider">Paid</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">{formatINR(totalPaid)}</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
              <p className="text-[10px] uppercase font-semibold text-amber-600 tracking-wider">Outstanding</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">{formatINR(totalOutstanding)}</p>
            </div>
          </div>
        </div>

        {/* Instalment Schedule */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Instalment Schedule</h3>
          </div>

          {/* Table header */}
          <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">Instalment</div>
            <div className="col-span-2">Due Date</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-2 text-right">Paid</div>
            <div className="col-span-2 text-right">Balance</div>
            <div className="col-span-1 text-center">Status</div>
          </div>

          {data.invoices.map((inv) => {
            const status = getInvoiceStatus(inv);
            const config = statusConfig[status];
            const Icon = config.icon;
            const paid = inv.grand_total - inv.outstanding_amount;

            return (
              <div key={inv.name} className="border-b border-gray-50 last:border-b-0">
                {/* Desktop row */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-3 items-center text-sm">
                  <div className="col-span-3 font-medium text-gray-900">{inv.label}</div>
                  <div className="col-span-2 text-gray-600">{formatDate(inv.due_date)}</div>
                  <div className="col-span-2 text-right text-gray-900">{formatINR(inv.grand_total)}</div>
                  <div className="col-span-2 text-right text-green-600">{formatINR(paid)}</div>
                  <div className="col-span-2 text-right font-semibold text-gray-900">{formatINR(inv.outstanding_amount)}</div>
                  <div className="col-span-1 flex justify-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${config.color} ${config.bg}`}>
                      <Icon className="h-3 w-3" />
                      {config.badge}
                    </span>
                  </div>
                </div>

                {/* Mobile card */}
                <div className="sm:hidden px-5 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{inv.label}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${config.color} ${config.bg}`}>
                      <Icon className="h-3 w-3" />
                      {config.badge}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Due: {formatDate(inv.due_date)}</span>
                    <span className="font-semibold text-gray-900">{formatINR(inv.grand_total)}</span>
                  </div>
                  {inv.outstanding_amount > 0 && inv.outstanding_amount < inv.grand_total && (
                    <div className="flex justify-between text-xs">
                      <span className="text-green-600">Paid: {formatINR(paid)}</span>
                      <span className="text-amber-600">Bal: {formatINR(inv.outstanding_amount)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Total row */}
          <div className="bg-gray-50 border-t border-gray-200">
            <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-3 items-center text-sm font-semibold">
              <div className="col-span-3 text-gray-700">Total</div>
              <div className="col-span-2" />
              <div className="col-span-2 text-right text-gray-900">{formatINR(data.grandTotal)}</div>
              <div className="col-span-2 text-right text-green-600">{formatINR(totalPaid)}</div>
              <div className="col-span-2 text-right text-gray-900">{formatINR(totalOutstanding)}</div>
              <div className="col-span-1" />
            </div>
            <div className="sm:hidden px-5 py-3 flex justify-between text-sm font-semibold">
              <span className="text-gray-700">Total</span>
              <span className="text-gray-900">{formatINR(data.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Fee Breakdown (items from first invoice — typically all have same items) */}
        {data.invoices.length > 0 && data.invoices[0].items && data.invoices[0].items.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Fee Components</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {data.invoices[0].items.map((item, idx) => (
                <div key={idx} className="px-5 py-2.5 flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.item_name}</span>
                  <span className="text-sm font-medium text-gray-900">{formatINR(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pay Now CTA */}
        <div className="print:hidden">
          <Link
            href={`/pay/${token}`}
            className="w-full inline-flex items-center justify-center gap-2 h-11 px-6 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Pay Now
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pt-2">
          Powered by SmartUp Learning Ventures
        </p>
      </main>
    </div>
  );
}
