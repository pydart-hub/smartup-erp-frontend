"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

export interface DeleteTarget {
  id: string;
  type: "attempt" | "registration";
  studentName: string;
  phone?: string | null;
  classLevel?: string;
  district?: string;
  details?: string;
}

interface ScholarDeletePuzzleModalProps {
  isOpen: boolean;
  target: DeleteTarget | null;
  onClose: () => void;
  onConfirmDelete: (target: DeleteTarget) => Promise<void>;
}

export function ScholarDeletePuzzleModal({
  isOpen,
  target,
  onClose,
  onConfirmDelete,
}: ScholarDeletePuzzleModalProps) {
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen && target) {
      setTypedConfirmation("");
      setErrorMsg("");
    }
  }, [isOpen, target]);

  if (!isOpen || !target) return null;

  const isTypeCorrect = typedConfirmation.trim().toUpperCase() === "DELETE";
  const canSubmit = isTypeCorrect && !isDeleting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsDeleting(true);
    setErrorMsg("");
    try {
      await onConfirmDelete(target);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to delete entry. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden">
        {/* Header Alert Ribbon */}
        <div className="bg-rose-50 border-b border-rose-100 p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <h3 className="text-base font-bold text-rose-950">
              Confirm Permanent Deletion
            </h3>
            <p className="text-xs text-rose-700/90 mt-0.5">
              This action will permanently delete this student&apos;s record. All other students and exam question data remain safe.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Target Info Summary Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span className="uppercase tracking-wider text-[10px] font-bold text-slate-400">
                Target Record ({target.type === "attempt" ? "Exam Attempt" : "Raw Registration"})
              </span>
              <span className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                {target.id}
              </span>
            </div>
            <div className="font-bold text-slate-900 text-sm">
              {target.studentName}
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 pt-0.5">
              {target.phone && <span>📞 {target.phone}</span>}
              {target.classLevel && <span>📚 {target.classLevel}</span>}
              {target.district && <span>📍 {target.district}</span>}
              {target.details && <span>📊 {target.details}</span>}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Type DELETE confirmation container */}
          <div className="border border-rose-100 bg-rose-50/40 rounded-2xl p-4 space-y-2.5">
            <p className="text-xs text-slate-600 leading-relaxed">
              To prevent accidental deletion, please type{" "}
              <strong className="font-mono text-rose-600 font-extrabold tracking-wide">DELETE</strong>{" "}
              in the box below to confirm:
            </p>
            <div className="relative">
              <input
                type="text"
                placeholder="TYPE DELETE"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                disabled={isDeleting}
                autoFocus
                className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border bg-white focus:outline-none transition-all uppercase tracking-wider ${
                  typedConfirmation
                    ? isTypeCorrect
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-800 pr-9"
                      : "border-rose-400 ring-2 ring-rose-400/20 text-rose-700"
                    : "border-slate-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                }`}
              />
              {typedConfirmation && isTypeCorrect && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-2.5 px-4 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`flex-1 py-2.5 px-4 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                canSubmit
                  ? "bg-rose-600 hover:bg-rose-700 cursor-pointer shadow-rose-600/20"
                  : "bg-slate-300 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Entry</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
