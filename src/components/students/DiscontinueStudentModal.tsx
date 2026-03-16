"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Loader2, UserX, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DISCONTINUATION_REASONS } from "@/lib/utils/constants";
import type { Student } from "@/lib/types/student";

interface Props {
  student: Student;
  onClose: () => void;
  onSuccess: (result: {
    credit_notes: string[];
    total_written_off: number;
    message: string;
  }) => void;
}

export function DiscontinueStudentModal({ student, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    credit_notes: string[];
    total_written_off: number;
    message: string;
  } | null>(null);

  const fullName =
    student.student_name ||
    [student.first_name, student.middle_name, student.last_name]
      .filter(Boolean)
      .join(" ");

  const handleDiscontinue = useCallback(async () => {
    if (!reason) {
      setError("Please select a reason");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/discontinue-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.name,
          reason,
          remarks: remarks.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok && res.status !== 207) {
        setError(data.error || "Failed to discontinue student");
        return;
      }

      if (data.failed?.length > 0) {
        setError(
          `Partially completed. ${data.failed.length} step(s) had issues: ${data.failed
            .map((f: { step: string }) => f.step)
            .join(", ")}`,
        );
      }

      setResult({
        credit_notes: data.credit_notes ?? [],
        total_written_off: data.total_written_off ?? 0,
        message: data.message ?? "Student discontinued",
      });

      onSuccess({
        credit_notes: data.credit_notes ?? [],
        total_written_off: data.total_written_off ?? 0,
        message: data.message ?? "Student discontinued",
      });
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }, [student.name, reason, remarks, onSuccess]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={() => !loading && !result && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        >
          {/* ── Success State ── */}
          {result ? (
            <div className="text-center py-4">
              <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-7 w-7 text-success" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Student Discontinued
              </h3>
              <p className="text-sm text-text-secondary mb-4">{result.message}</p>

              {result.total_written_off > 0 && (
                <div className="bg-app-bg rounded-xl p-4 mb-4 text-left">
                  <p className="text-xs text-text-tertiary mb-1">Written Off</p>
                  <p className="text-xl font-bold text-error">
                    ₹{result.total_written_off.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">
                    {result.credit_notes.length} credit note(s) created
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-4 text-sm text-warning text-left">
                  {error}
                </div>
              )}

              <Button variant="primary" size="sm" onClick={onClose} className="w-full">
                Done
              </Button>
            </div>
          ) : (
            <>
              {/* ── Header ── */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">
                      Discontinue Student
                    </h3>
                    <p className="text-sm text-text-secondary">
                      This will mark the student as discontinued
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !loading && onClose()}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* ── Student Info ── */}
              <div className="bg-app-bg rounded-xl p-4 mb-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-bold">
                    {fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{fullName}</p>
                    <p className="text-xs text-text-tertiary">{student.name}</p>
                  </div>
                </div>
                <div className="text-xs text-text-secondary leading-relaxed space-y-1">
                  <p>
                    • Student will be marked as <strong>Discontinued</strong> (enabled
                    = 0)
                  </p>
                  <p>
                    • Outstanding invoices will be zeroed via <strong>Credit Notes</strong>
                  </p>
                  <p>• Program enrollment will be cancelled</p>
                  <p>• Already-paid amounts stay as revenue — nothing is deleted</p>
                </div>
              </div>

              {/* ── Reason Selection ── */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Reason for Discontinuation <span className="text-error">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2.5 rounded-[10px] border border-border-light bg-white text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                >
                  <option value="">Select a reason…</option>
                  {DISCONTINUATION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── Remarks ── */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Remarks <span className="text-text-tertiary font-normal">(optional)</span>
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={loading}
                  placeholder="Additional notes…"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-[10px] border border-border-light bg-white text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-text-tertiary disabled:opacity-50 resize-none"
                />
              </div>

              {/* ── Error ── */}
              {error && (
                <div className="bg-error/5 border border-error/20 rounded-lg p-3 mb-4 text-sm text-error">
                  {error}
                </div>
              )}

              {/* ── Actions ── */}
              <div className="flex items-center gap-3 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDiscontinue}
                  disabled={loading || !reason}
                  className="!bg-warning hover:!bg-warning/90 !text-white gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <UserX className="h-4 w-4" />
                      Discontinue Student
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
