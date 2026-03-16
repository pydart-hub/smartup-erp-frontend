"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRightLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import apiClient from "@/lib/api/client";

interface Branch {
  name: string;
  abbr: string;
}

interface TransferRequestModalProps {
  student: { name: string; student_name: string; custom_branch: string };
  onClose: () => void;
  onSuccess: () => void;
}

export function TransferRequestModal({ student, onClose, onSuccess }: TransferRequestModalProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [toBranch, setToBranch] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [targetBranchLabel, setTargetBranchLabel] = useState("");

  useEffect(() => {
    apiClient
      .get('/resource/Company?fields=["name","abbr"]&limit=50&order_by=name')
      .then(({ data }) => {
        const all: Branch[] = data.data || [];
        // Exclude the student's current branch and the parent "Smart Up"
        setBranches(all.filter((b) => b.name !== student.custom_branch && b.name !== "Smart Up"));
      })
      .catch(() => setBranches([]));
  }, [student.custom_branch]);

  const handleSubmit = async () => {
    if (!toBranch) {
      setError("Please select a target branch");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transfer/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student: student.name, to_branch: toBranch, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create transfer request");
        return;
      }
      const branch = branches.find((b) => b.name === toBranch);
      setTargetBranchLabel(branch ? `${branch.name.replace("Smart Up ", "")}` : toBranch);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2200);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-surface rounded-[14px] border border-border-light shadow-xl w-full max-w-md mx-4 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-8 gap-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                >
                  <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.25 }}
                    >
                      <CheckCircle2 className="h-9 w-9 text-success" />
                    </motion.div>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-center"
                >
                  <p className="text-lg font-semibold text-text-primary">Request Sent!</p>
                  <p className="text-sm text-text-secondary mt-1">
                    Transfer request sent to <span className="font-medium text-text-primary">{targetBranchLabel}</span> branch manager
                  </p>
                </motion.div>
                <motion.div
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: 2, ease: "linear", delay: 0.2 }}
                  className="h-1 w-32 rounded-full bg-success origin-left mt-2"
                />
              </motion.div>
            ) : (
              <motion.div key="form" exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-text-primary">Transfer Student</h2>
            </div>
            <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Student info */}
          <div className="bg-app-bg rounded-[10px] p-3 mb-4">
            <p className="text-sm font-medium text-text-primary">{student.student_name}</p>
            <p className="text-xs text-text-secondary">
              {student.name} · Current: {student.custom_branch?.replace("Smart Up ", "")}
            </p>
          </div>

          {/* Target Branch */}
          <label className="block mb-1 text-sm font-medium text-text-primary">Transfer to</label>
          <select
            value={toBranch}
            onChange={(e) => setToBranch(e.target.value)}
            className="w-full mb-4 h-10 px-3 rounded-[10px] border border-border-input bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select branch…</option>
            {branches.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name.replace("Smart Up ", "")} ({b.abbr})
              </option>
            ))}
          </select>

          {/* Reason */}
          <label className="block mb-1 text-sm font-medium text-text-primary">
            Reason <span className="text-text-tertiary font-normal">(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full mb-4 px-3 py-2 rounded-[10px] border border-border-input bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            placeholder="Parent relocation, closer branch, etc."
          />

          {/* Error */}
          {error && (
            <p className="text-sm text-error mb-3">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
              Send Request
            </Button>
          </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
