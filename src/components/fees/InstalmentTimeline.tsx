"use client";

import React, { useState, useCallback } from "react";
import { CheckCircle2, Clock, AlertCircle, CircleDot, CircleDashed } from "lucide-react";
import { toast } from "sonner";
import RazorpayPayButton from "@/components/payments/RazorpayPayButton";
import PartialPaymentModal from "@/components/payments/PartialPaymentModal";

export interface InstalmentItem {
  invoiceId: string;
  label: string;           // "Q1", "Inst 3", "Full Payment"
  amount: number;
  outstandingAmount: number;
  dueDate: string;         // YYYY-MM-DD
  postingDate: string;
  status: "paid" | "partially-paid" | "overdue" | "due-today" | "upcoming";
}

interface InstalmentTimelineProps {
  instalments: InstalmentItem[];
  studentName: string;
  customer: string;
  parentName?: string;
  parentEmail?: string;
  onPaymentSuccess: () => void;
}

function formatCurrency(amount: number) {
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

function shortMonth(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "short",
  });
}

const statusConfig = {
  paid: {
    icon: CheckCircle2,
    dotColor: "bg-success",
    lineColor: "bg-success",
    textColor: "text-success",
    bgColor: "bg-success-light",
    borderColor: "border-success/20",
    badgeLabel: "Paid",
  },
  "partially-paid": {
    icon: CircleDashed,
    dotColor: "bg-warning",
    lineColor: "bg-warning/30",
    textColor: "text-warning",
    bgColor: "bg-warning-light",
    borderColor: "border-warning/20",
    badgeLabel: "Partially Paid",
  },
  overdue: {
    icon: AlertCircle,
    dotColor: "bg-error",
    lineColor: "bg-error/30",
    textColor: "text-error",
    bgColor: "bg-error-light",
    borderColor: "border-error/20",
    badgeLabel: "Overdue",
  },
  "due-today": {
    icon: Clock,
    dotColor: "bg-warning",
    lineColor: "bg-warning/30",
    textColor: "text-warning",
    bgColor: "bg-warning-light",
    borderColor: "border-warning/20",
    badgeLabel: "Due Today",
  },
  upcoming: {
    icon: CircleDot,
    dotColor: "bg-border-light",
    lineColor: "bg-border-light",
    textColor: "text-text-tertiary",
    bgColor: "bg-app-bg",
    borderColor: "border-border-light",
    badgeLabel: "Upcoming",
  },
};

export default function InstalmentTimeline({
  instalments,
  studentName,
  customer,
  parentName,
  parentEmail,
  onPaymentSuccess,
}: InstalmentTimelineProps) {
  const [partialModalInst, setPartialModalInst] = useState<InstalmentItem | null>(null);

  /** Send receipt email then refresh parent data */
  const handlePaymentDone = useCallback(async (invoiceId: string) => {
    // Fire receipt (non-blocking for UX)
    try {
      const res = await fetch("/api/payments/send-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ invoice_id: invoiceId }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Receipt email sent to ${data.recipient || "parent"}`, { duration: 3000 });
      } else {
        toast.warning("Payment recorded — receipt email could not be sent", { duration: 4000 });
      }
    } catch {
      // non-blocking
    }
    onPaymentSuccess();
  }, [onPaymentSuccess]);

  if (instalments.length === 0) return null;

  const totalAmount = instalments.reduce((s, i) => s + i.amount, 0);
  const paidAmount = instalments.reduce(
    (s, i) => s + (i.amount - i.outstandingAmount),
    0
  );
  const progressPct =
    totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-text-secondary">
          <span>
            {formatCurrency(paidAmount)} paid of {formatCurrency(totalAmount)}
          </span>
          <span className="font-semibold">{progressPct}%</span>
        </div>
        <div className="w-full h-2 bg-border-light rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-success transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {instalments.map((inst, idx) => {
          const config = statusConfig[inst.status];
          const Icon = config.icon;
          const isLast = idx === instalments.length - 1;
          const isPartial = inst.outstandingAmount > 0 && inst.outstandingAmount < inst.amount;
          const instPaidAmount = inst.amount - inst.outstandingAmount;
          const instPct = inst.amount > 0 ? Math.round((instPaidAmount / inst.amount) * 100) : 0;
          const showPayButton =
            inst.outstandingAmount > 0 &&
            (inst.status === "overdue" || inst.status === "due-today" || inst.status === "partially-paid" ||
              // Also show for earliest upcoming
              (inst.status === "upcoming" &&
                instalments.findIndex(
                  (i) => i.outstandingAmount > 0 && i.status === "upcoming"
                ) === idx));

          return (
            <div key={inst.invoiceId} className="flex gap-3">
              {/* Timeline track */}
              <div className="flex flex-col items-center w-8 shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bgColor} ${config.borderColor} border`}
                >
                  <Icon className={`h-4 w-4 ${config.textColor}`} />
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 min-h-[24px] ${config.lineColor}`} />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-4 ${isLast ? "pb-0" : ""}`}>
                <div
                  className={`rounded-[12px] border p-3.5 ${config.borderColor} ${config.bgColor}`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">
                        {inst.label}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${config.textColor} ${config.bgColor}`}
                      >
                        {config.badgeLabel}
                      </span>
                    </div>
                    <span className="text-base font-bold text-text-primary">
                      {formatCurrency(inst.amount)}
                    </span>
                  </div>

                  {/* Per-instalment progress bar (only if partially paid) */}
                  {isPartial && (
                    <div className="mt-2 space-y-1">
                      <div className="w-full h-1.5 bg-border-light rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-warning transition-all duration-500"
                          style={{ width: `${instPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-text-secondary">
                        <span>{formatCurrency(instPaidAmount)} paid</span>
                        <span>Remaining: {formatCurrency(inst.outstandingAmount)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                    <span className="text-xs text-text-secondary">
                      Due {formatDate(inst.dueDate)}{" "}
                      <span className="text-text-tertiary">
                        ({shortMonth(inst.dueDate)})
                      </span>
                    </span>

                    {inst.status === "paid" && (
                      <span className="text-xs text-success font-medium">
                        Paid {formatDate(inst.postingDate)}
                      </span>
                    )}

                    {showPayButton && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <RazorpayPayButton
                          amount={inst.outstandingAmount}
                          invoiceId={inst.invoiceId}
                          studentName={studentName}
                          customer={customer}
                          parentName={parentName}
                          parentEmail={parentEmail}
                          onSuccess={() => handlePaymentDone(inst.invoiceId)}
                          size="sm"
                        />
                        {inst.outstandingAmount > 1 && (
                          <button
                            type="button"
                            onClick={() => setPartialModalInst(inst)}
                            className="text-xs font-medium text-primary hover:text-primary-hover underline underline-offset-2"
                          >
                            Pay Custom Amount
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Partial payment modal */}
      {partialModalInst && (
        <PartialPaymentModal
          instalment={partialModalInst}
          studentName={studentName}
          customer={customer}
          parentName={parentName}
          parentEmail={parentEmail}
          onSuccess={() => {
            setPartialModalInst(null);
            handlePaymentDone(partialModalInst.invoiceId);
          }}
          onClose={() => setPartialModalInst(null)}
        />
      )}
    </div>
  );
}
