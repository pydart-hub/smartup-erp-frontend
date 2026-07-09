"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Phone,
  X,
  IndianRupee,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  createFollowUp,
  CALL_STATUS_OPTIONS,
  getStatusColor,
} from "@/lib/api/followup";

interface FollowUpDrawerProps {
  open: boolean;
  onClose: () => void;
  student: {
    student_id: string;
    student_name: string;
    branch: string;
  };
  /** Query key to invalidate after successful save */
  invalidateKeys?: string[][];
  initialCallStatus?: string;
  initialPaymentReceived?: boolean;
  initialAmountReceived?: number;
  initialPaymentMode?: string;
  /** Payment Entry docname — set ONLY when opening from paid-history claim flow.
   *  Saved as invoice_ref on the Fee Follow Up record so the claiming algorithm
   *  can unambiguously distinguish this from an overdue-call log. */
  initialInvoiceRef?: string;
}

export function FollowUpDrawer({
  open,
  onClose,
  student,
  invalidateKeys = [],
  initialCallStatus = "",
  initialPaymentReceived = false,
  initialAmountReceived,
  initialPaymentMode = "",
  initialInvoiceRef = "",
}: FollowUpDrawerProps) {
  const qc = useQueryClient();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [callStatus, setCallStatus] = useState<string>(initialCallStatus);
  const [paymentReceived, setPaymentReceived] = useState(initialPaymentReceived);
  const [amountReceived, setAmountReceived] = useState(initialAmountReceived ? String(initialAmountReceived) : "");
  const [paymentMode, setPaymentMode] = useState(initialPaymentMode);
  const [remarks, setRemarks] = useState("");
  const [nextDate, setNextDate] = useState("");
  // Locked invoice_ref — only set when opened from the paid-history claim flow
  const invoiceRef = initialInvoiceRef;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: () =>
      createFollowUp({
        student: student.student_id,
        student_name: student.student_name,
        branch: student.branch,
        call_status: callStatus,
        payment_received: paymentReceived,
        amount_received: paymentReceived && amountReceived ? Number(amountReceived) : undefined,
        payment_mode: paymentReceived && paymentMode ? paymentMode : undefined,
        remarks: remarks.trim() || undefined,
        next_followup_date: nextDate || undefined,
        // Only passed from the paid-history claim flow — links this log to the specific PE
        invoice_ref: invoiceRef || undefined,
      }),
    onSuccess: () => {
      toast.success("Follow-up logged");
      // Invalidate follow-up queries for this student
      qc.invalidateQueries({ queryKey: ["followup", student.student_id] });
      for (const key of invalidateKeys) {
        qc.invalidateQueries({ queryKey: key });
      }
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save follow-up");
    },
  });

  const canSubmit = callStatus.length > 0 && !mutation.isPending;

  const selectedColor = callStatus ? getStatusColor(callStatus) : null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-2xl shadow-2xl border-t border-border-light max-h-[90vh] overflow-y-auto"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border-input" />
            </div>

            <div className="px-4 pb-8 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between pt-1">
                <div>
                  <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    Log Follow-Up Call
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {student.student_name}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-border-light transition-colors text-text-tertiary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Call Status */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Call Status <span className="text-error">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CALL_STATUS_OPTIONS.map((opt) => {
                    const c = getStatusColor(opt);
                    const isSelected = callStatus === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setCallStatus(opt)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                          isSelected
                            ? `${c.bg} ${c.text} ${c.border} ring-2 ring-offset-1 ring-current`
                            : "bg-surface border-border-light text-text-secondary hover:border-border-input"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? c.dot : "bg-border-input"}`} />
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment received toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border-light bg-surface">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${paymentReceived ? "bg-emerald-50" : "bg-border-light"}`}>
                    <IndianRupee className={`h-4 w-4 ${paymentReceived ? "text-emerald-600" : "text-text-tertiary"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Payment Received</p>
                    <p className="text-[11px] text-text-tertiary">Mark if student paid during this call</p>
                  </div>
                </div>
                <button
                  onClick={() => setPaymentReceived((v) => !v)}
                  className={`relative w-10 h-5.5 rounded-full transition-colors ${
                    paymentReceived ? "bg-emerald-500" : "bg-border-input"
                  }`}
                  style={{ minWidth: "2.5rem", height: "1.375rem" }}
                >
                  <motion.span
                    animate={{ x: paymentReceived ? 18 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                    style={{ display: "block" }}
                  />
                </button>
              </div>

              {/* Payment details — shown only when toggle on */}
              <AnimatePresence>
                {paymentReceived && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                          Amount (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={amountReceived}
                          onChange={(e) => setAmountReceived(e.target.value)}
                          className="w-full text-sm rounded-lg border border-border-input bg-surface px-3 py-2 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                          Mode
                        </label>
                        <select
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value)}
                          className="w-full text-sm rounded-lg border border-border-input bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400"
                        >
                          <option value="">Select</option>
                          <option>Cash</option>
                          <option>UPI</option>
                          <option>Bank Transfer</option>
                          <option>Cheque</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3" />
                  Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes from the call..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full text-sm rounded-xl border border-border-input bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>

              {/* Next follow-up date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Next Follow-Up Date
                </label>
                <input
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  className="w-full text-sm rounded-xl border border-border-input bg-surface px-3 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Submit */}
              <button
                disabled={!canSubmit}
                onClick={() => mutation.mutate()}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                  canSubmit
                    ? selectedColor
                      ? `${selectedColor.bg} ${selectedColor.text} border ${selectedColor.border} hover:opacity-90`
                      : "bg-primary text-white hover:bg-primary/90"
                    : "bg-border-light text-text-tertiary cursor-not-allowed"
                }`}
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {mutation.isPending ? "Saving…" : "Save Follow-Up"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
