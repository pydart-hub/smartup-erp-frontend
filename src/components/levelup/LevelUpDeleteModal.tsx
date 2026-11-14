"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

export interface LevelUpDeleteTarget {
  id: string;
  type: "attempt" | "registration";
  studentName: string;
  phone?: string | null;
  classLevel?: string;
  countryCity?: string;
  details?: string;
}

interface LevelUpDeleteModalProps {
  isOpen: boolean;
  target: LevelUpDeleteTarget | null;
  onClose: () => void;
  onConfirmDelete: (target: LevelUpDeleteTarget) => Promise<void>;
}

export function LevelUpDeleteModal({
  isOpen,
  target,
  onClose,
  onConfirmDelete,
}: LevelUpDeleteModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#121722] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header Alert Banner */}
        <div className="bg-rose-500/10 border-b border-rose-500/20 p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <h3 className="text-sm font-bold text-rose-300">
              Confirm Permanent Deletion
            </h3>
            <p className="text-xs text-rose-400/80 mt-0.5">
              This will permanently delete this student&apos;s record from the smartup_online database.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Target Info Summary Box */}
          <div className="bg-[#181F2E] border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400 font-medium">
              <span className="uppercase tracking-wider text-[10px] font-bold text-slate-500">
                Target Record ({target.type === "attempt" ? "Exam Attempt" : "Raw Registration"})
              </span>
              <span className="font-mono text-[10px] text-slate-500 truncate max-w-[130px]">
                {target.id}
              </span>
            </div>
            <div className="font-bold text-white text-sm">
              {target.studentName}
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 pt-0.5">
              {target.phone && <span>📞 {target.phone}</span>}
              {target.classLevel && <span>📚 {target.classLevel}</span>}
              {target.countryCity && <span>📍 {target.countryCity}</span>}
              {target.details && <span>📊 {target.details}</span>}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-semibold text-rose-400">
              {errorMsg}
            </div>
          )}

          {/* Type DELETE confirmation container */}
          <div className="border border-rose-500/20 bg-rose-500/5 rounded-2xl p-4 space-y-2">
            <p className="text-xs text-slate-300 leading-relaxed">
              To prevent accidental deletion, please type{" "}
              <strong className="font-mono text-rose-400 font-black tracking-wide">DELETE</strong>{" "}
              in the box below:
            </p>
            <div className="relative">
              <input
                type="text"
                placeholder="TYPE DELETE"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                disabled={isDeleting}
                autoFocus
                className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border bg-[#0A0D14] focus:outline-none transition-all uppercase tracking-wider text-white ${
                  typedConfirmation
                    ? isTypeCorrect
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-400 pr-9"
                      : "border-rose-500 ring-2 ring-rose-500/20 text-rose-300"
                    : "border-slate-800 focus:border-rose-500"
                }`}
              />
              {typedConfirmation && isTypeCorrect && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-2.5 px-4 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`flex-1 py-2.5 px-4 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                canSubmit
                  ? "bg-rose-600 hover:bg-rose-500 cursor-pointer shadow-rose-950/40"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
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

