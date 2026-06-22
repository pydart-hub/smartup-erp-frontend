"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Loader2, MessageSquare, Phone, X } from "lucide-react";
import {
  createDiscontinuedFollowUp,
  DISCONTINUED_CALL_STATUS_OPTIONS,
  DISCONTINUED_FEEDBACK_CATEGORY_OPTIONS,
  DISCONTINUED_OUTCOME_OPTIONS,
} from "@/lib/api/discontinuedFollowup";

interface DiscontinuedFollowUpDrawerProps {
  open: boolean;
  onClose: () => void;
  student: {
    student_id: string;
    student_name: string;
    branch: string;
    mobile?: string;
    discontinuation_date?: string;
    discontinuation_reason?: string;
    outstanding_amount?: number;
  };
  invalidateKeys?: string[][];
}

export function DiscontinuedFollowUpDrawer({
  open,
  onClose,
  student,
  invalidateKeys = [],
}: DiscontinuedFollowUpDrawerProps) {
  const qc = useQueryClient();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [callStatus, setCallStatus] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState("");
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [interestedToRejoin, setInterestedToRejoin] = useState(false);
  const [rejoinProbability, setRejoinProbability] = useState("");
  const [reasonNotRejoining, setReasonNotRejoining] = useState("");
  const [followupOutcome, setFollowupOutcome] = useState("Open");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: () =>
      createDiscontinuedFollowUp({
        student: student.student_id,
        student_name: student.student_name,
        branch: student.branch,
        discontinuation_date: student.discontinuation_date,
        discontinuation_reason: student.discontinuation_reason,
        call_status: callStatus,
        feedback_category: feedbackCategory || undefined,
        feedback_notes: feedbackNotes.trim() || undefined,
        interested_to_rejoin: interestedToRejoin,
        rejoin_probability: interestedToRejoin ? rejoinProbability || undefined : undefined,
        reason_not_rejoining: !interestedToRejoin ? reasonNotRejoining.trim() || undefined : undefined,
        followup_outcome: followupOutcome || undefined,
        latest_mobile_used: student.mobile || undefined,
        invoice_outstanding_at_call: student.outstanding_amount ?? 0,
      }),
    onSuccess: () => {
      toast.success("Discontinued follow-up saved");
      qc.invalidateQueries({ queryKey: ["discontinued-followup", student.student_id] });
      for (const key of invalidateKeys) qc.invalidateQueries({ queryKey: key });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save follow-up"),
  });

  const canSubmit = !!callStatus && !mutation.isPending;

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-2xl border-t border-border-light bg-surface shadow-2xl"
          >
            <div className="flex justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-border-input" />
            </div>

            <div className="space-y-5 px-4 pb-8">
              <div className="flex items-start justify-between pt-1">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
                    <Phone className="h-4 w-4 text-primary" />
                    Log Discontinued Follow-Up
                  </h2>
                  <p className="mt-0.5 text-xs text-text-secondary">{student.student_name}</p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-border-light"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Call Status <span className="text-error">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DISCONTINUED_CALL_STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setCallStatus(opt)}
                      className={`rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-all ${
                        callStatus === opt
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                          : "border-border-light bg-surface text-text-secondary hover:border-border-input"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Feedback Category
                </label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="w-full rounded-xl border border-border-input bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select</option>
                  {DISCONTINUED_FEEDBACK_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border-light bg-surface p-3.5">
                <div>
                  <p className="text-sm font-medium text-text-primary">Interested to Rejoin</p>
                  <p className="text-[11px] text-text-tertiary">Mark if the student is open to coming back</p>
                </div>
                <button
                  onClick={() => setInterestedToRejoin((v) => !v)}
                  className={`relative h-5.5 w-10 rounded-full transition-colors ${interestedToRejoin ? "bg-emerald-500" : "bg-border-input"}`}
                >
                  <motion.span
                    animate={{ x: interestedToRejoin ? 18 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 block h-4 w-4 rounded-full bg-white shadow"
                  />
                </button>
              </div>

              {interestedToRejoin ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Rejoin Probability
                  </label>
                  <select
                    value={rejoinProbability}
                    onChange={(e) => setRejoinProbability(e.target.value)}
                    className="w-full rounded-xl border border-border-input bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Reason Not Rejoining
                  </label>
                  <textarea
                    rows={2}
                    value={reasonNotRejoining}
                    onChange={(e) => setReasonNotRejoining(e.target.value)}
                    className="w-full resize-none rounded-xl border border-border-input bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Why the student does not want to rejoin..."
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  <MessageSquare className="h-3 w-3" />
                  Feedback Notes
                </label>
                <textarea
                  rows={3}
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  className="w-full resize-none rounded-xl border border-border-input bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="What happened on the call?"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Outcome
                </label>
                <select
                  value={followupOutcome}
                  onChange={(e) => setFollowupOutcome(e.target.value)}
                  className="w-full rounded-xl border border-border-input bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {DISCONTINUED_OUTCOME_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <button
                disabled={!canSubmit}
                onClick={() => mutation.mutate()}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all ${
                  canSubmit ? "border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15" : "cursor-not-allowed bg-border-light text-text-tertiary"
                }`}
              >
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {mutation.isPending ? "Saving..." : "Save Follow-Up"}
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
