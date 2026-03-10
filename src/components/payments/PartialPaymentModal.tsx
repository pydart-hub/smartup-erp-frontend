"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import RazorpayPayButton from "@/components/payments/RazorpayPayButton";
import type { InstalmentItem } from "@/components/fees/InstalmentTimeline";

interface PartialPaymentModalProps {
  instalment: InstalmentItem;
  studentName: string;
  customer: string;
  parentName?: string;
  parentEmail?: string;
  onSuccess: () => void;
  onClose: () => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PartialPaymentModal({
  instalment,
  studentName,
  customer,
  parentName,
  parentEmail,
  onSuccess,
  onClose,
}: PartialPaymentModalProps) {
  const paidSoFar = instalment.amount - instalment.outstandingAmount;
  const [amount, setAmount] = useState(instalment.outstandingAmount);
  const [error, setError] = useState("");

  function handleAmountChange(val: string) {
    const num = Number(val);
    setError("");
    if (isNaN(num) || num < 1) {
      setError("Minimum ₹1");
    } else if (num > instalment.outstandingAmount) {
      setError(`Maximum ${formatCurrency(instalment.outstandingAmount)}`);
    }
    setAmount(num);
  }

  const isValid = amount >= 1 && amount <= instalment.outstandingAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface-card w-full max-w-md rounded-[16px] border border-border-light shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-bold text-text-primary">
            Pay for: {instalment.label}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-app-bg transition-colors"
          >
            <X className="h-4 w-4 text-text-tertiary" />
          </button>
        </div>

        {/* Summary */}
        <div className="px-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Invoice Total</span>
            <span className="font-semibold text-text-primary">
              {formatCurrency(instalment.amount)}
            </span>
          </div>
          {paidSoFar > 0 && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Already Paid</span>
              <span className="font-semibold text-success">
                {formatCurrency(paidSoFar)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-text-secondary">Outstanding</span>
            <span className="font-bold text-text-primary">
              {formatCurrency(instalment.outstandingAmount)}
            </span>
          </div>
        </div>

        {/* Amount input */}
        <div className="px-5 mt-4">
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Amount to Pay
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">
              ₹
            </span>
            <input
              type="number"
              min={1}
              max={instalment.outstandingAmount}
              step={1}
              value={amount || ""}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full rounded-[10px] border border-border-light bg-app-bg pl-7 pr-3 py-2.5 text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {error && (
            <p className="text-xs text-error mt-1">{error}</p>
          )}
          <p className="text-[11px] text-text-tertiary mt-1">
            Min: ₹1 &nbsp;|&nbsp; Max: {formatCurrency(instalment.outstandingAmount)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-[10px] border border-border-light text-sm font-medium text-text-secondary hover:bg-app-bg transition-colors"
          >
            Cancel
          </button>
          {isValid && (
            <div className="flex-1">
              <RazorpayPayButton
                amount={amount}
                invoiceId={instalment.invoiceId}
                studentName={studentName}
                customer={customer}
                parentName={parentName}
                parentEmail={parentEmail}
                onSuccess={() => onSuccess()}
                size="md"
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
