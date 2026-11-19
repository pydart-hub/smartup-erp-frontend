"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Check, RefreshCw, X, Calendar } from "lucide-react";

export interface LevelUpRemarkTarget {
  id: string;
  studentName: string;
  phone?: string | null;
  classLevel?: string;
  countryCity?: string;
  schoolName?: string;
  currentRemark?: string | null;
}

interface LevelUpRemarkModalProps {
  isOpen: boolean;
  target: LevelUpRemarkTarget | null;
  onClose: () => void;
  onSaveRemark: (id: string, remark: string) => Promise<void>;
}

export function LevelUpRemarkModal({
  isOpen,
  target,
  onClose,
  onSaveRemark,
}: LevelUpRemarkModalProps) {
  const [remarkText, setRemarkText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen && target) {
      setRemarkText(target.currentRemark || "");
      setErrorMsg("");
    }
  }, [isOpen, target]);

  if (!isOpen || !target) return null;

  const handleAddDateTag = () => {
    const today = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const prefix = `[${today}] `;
    if (!remarkText.includes(prefix)) {
      setRemarkText((prev) => (prev ? `${prev}\n${prefix}` : prefix));
    }
  };

  const handleQuickNote = (note: string) => {
    setRemarkText((prev) => {
      if (!prev.trim()) return note;
      return `${prev.trim()} - ${note}`;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg("");
    try {
      await onSaveRemark(target.id, remarkText);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save remark. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#121722] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <h3 className="text-sm font-bold text-emerald-300">
              Admin Remark
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Internal note visible & editable only in LevelUp GCC Admin Center
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Candidate Info Summary Box */}
          <div className="bg-[#181F2E] border border-slate-800 rounded-2xl p-4 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-400 font-medium">
              <span className="uppercase tracking-wider text-[10px] font-bold text-slate-500">
                Candidate Details
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
              {target.schoolName && target.schoolName !== "—" && (
                <span>🏫 {target.schoolName}</span>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-semibold text-rose-400">
              {errorMsg}
            </div>
          )}

          {/* Quick presets & date tag */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleAddDateTag}
                className="px-2.5 py-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Calendar className="w-3 h-3" />
                <span>+ Date</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickNote("Called parent")}
                className="px-2 py-1 text-[11px] text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer"
              >
                + Called
              </button>
              <button
                type="button"
                onClick={() => handleQuickNote("Interested")}
                className="px-2 py-1 text-[11px] text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer"
              >
                + Interested
              </button>
              <button
                type="button"
                onClick={() => handleQuickNote("Needs Follow-up")}
                className="px-2 py-1 text-[11px] text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer"
              >
                + Follow-up
              </button>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {remarkText.length} chars
            </span>
          </div>

          {/* Textarea */}
          <div>
            <textarea
              rows={4}
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              disabled={isSaving}
              autoFocus
              placeholder="Enter admin notes, telecaller feedback, or candidate follow-up status..."
              className="w-full bg-[#181F2E] border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all resize-y"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {target.currentRemark && (
              <button
                type="button"
                onClick={() => setRemarkText("")}
                disabled={isSaving || !remarkText}
                className="py-2.5 px-3 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl border border-rose-500/20 transition-colors cursor-pointer disabled:opacity-40"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Remark</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
