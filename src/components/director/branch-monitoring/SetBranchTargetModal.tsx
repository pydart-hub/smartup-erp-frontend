"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Target,
  IndianRupee,
  UserPlus,
  Building2,
  Sparkles,
  Save,
  Copy,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveBranchTarget,
  bulkSaveBranchTargets,
  copyBranchTargets,
  type BranchMonitoringRow,
} from "@/lib/api/branchMonitoring";
import { formatCurrency } from "@/lib/utils/formatters";

interface SetBranchTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthKey: string;
  monthLabel: string;
  branches: BranchMonitoringRow[];
  selectedBranchName?: string | null;
  onSuccess: () => void;
}

export function SetBranchTargetModal({
  isOpen,
  onClose,
  monthKey,
  monthLabel,
  branches,
  selectedBranchName,
  onSuccess,
}: SetBranchTargetModalProps) {
  // Mode: "single" or "bulk"
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  const [selectedBranch, setSelectedBranch] = useState<string>(
    selectedBranchName || branches[0]?.branch || ""
  );

  // Single form states
  const [singleAdmission, setSingleAdmission] = useState<number>(25);
  const [singleCollection, setSingleCollection] = useState<number>(600000);
  const [singleNotes, setSingleNotes] = useState<string>("");

  // Bulk form states: map of branch -> { admissions, collection }
  const [bulkTargets, setBulkTargets] = useState<
    Record<string, { admissions: number; collection: number; notes: string }>
  >({});

  // Copy tools state
  const [copyAdjustment, setCopyAdjustment] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Populate data on open or branch select
  useEffect(() => {
    if (selectedBranchName) {
      setSelectedBranch(selectedBranchName);
      setActiveTab("single");
    }
  }, [selectedBranchName]);

  useEffect(() => {
    const bulkMap: Record<string, { admissions: number; collection: number; notes: string }> = {};
    for (const b of branches) {
      bulkMap[b.branch] = {
        admissions: b.targets.admission_target,
        collection: b.targets.collection_target,
        notes: b.targets.notes || "",
      };
    }
    setBulkTargets(bulkMap);

    const curr = branches.find((b) => b.branch === selectedBranch);
    if (curr) {
      setSingleAdmission(curr.targets.admission_target);
      setSingleCollection(curr.targets.collection_target);
      setSingleNotes(curr.targets.notes || "");
    }
  }, [branches, selectedBranch]);

  if (!isOpen) return null;

  // Single submit handler
  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBranch) return;
    setIsSubmitting(true);
    try {
      await saveBranchTarget({
        branch: selectedBranch,
        month_key: monthKey,
        admission_target: Number(singleAdmission) || 0,
        collection_target: Number(singleCollection) || 0,
        notes: singleNotes,
      });
      toast.success(`Targets updated for ${selectedBranch.replace("Smart Up ", "")}`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save target";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Bulk submit handler
  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const targetsList = Object.entries(bulkTargets).map(([branch, vals]) => ({
        branch,
        admission_target: vals.admissions,
        collection_target: vals.collection,
        notes: vals.notes,
      }));

      await bulkSaveBranchTargets({
        month_key: monthKey,
        targets: targetsList,
      });

      toast.success(`Targets saved for all ${targetsList.length} branches!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save bulk targets";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Copy from previous month handler
  async function handleCopyPreviousMonth() {
    const [yStr, mStr] = monthKey.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    setIsSubmitting(true);
    try {
      await copyBranchTargets({
        target_month: monthKey,
        source_month: prevMonthKey,
        adjustment_pct: copyAdjustment,
      });
      toast.success(
        `Targets copied from ${prevDate.toLocaleString("en-US", { month: "short", year: "numeric" })} with ${copyAdjustment >= 0 ? "+" : ""}${copyAdjustment}% adjustment!`
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to copy targets";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Compute live bulk totals
  const totalBulkAdmissions = Object.values(bulkTargets).reduce((s, v) => s + (Number(v.admissions) || 0), 0);
  const totalBulkCollection = Object.values(bulkTargets).reduce((s, v) => s + (Number(v.collection) || 0), 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-surface border border-border-light shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-light bg-surface-raised">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                  Assign Branch Monthly Targets
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary">
                    {monthLabel}
                  </span>
                </h2>
                <p className="text-xs text-text-tertiary">
                  Set admission and collection expectations for offline centers
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-app-bg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center justify-between px-6 py-2.5 bg-app-bg border-b border-border-light">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("single")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "single"
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface"
                }`}
              >
                Single Branch Focus
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("bulk")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "bulk"
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface"
                }`}
              >
                All 9 Branches (Bulk Grid)
              </button>
            </div>

            {activeTab === "bulk" && (
              <div className="hidden sm:flex items-center gap-3 text-xs">
                <span className="text-text-tertiary">Total Admissions:</span>
                <span className="font-bold text-blue-600">{totalBulkAdmissions}</span>
                <span className="text-border-light">|</span>
                <span className="text-text-tertiary">Total Collection:</span>
                <span className="font-bold text-emerald-600">{formatCurrency(totalBulkCollection)}</span>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === "single" ? (
              <form onSubmit={handleSingleSubmit} className="space-y-6 max-w-xl mx-auto">
                {/* Branch selection */}
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                    Select Offline Branch
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {branches.map((b) => {
                      const isSelected = selectedBranch === b.branch;
                      const short = b.branch.replace("Smart Up ", "");
                      return (
                        <button
                          key={b.branch}
                          type="button"
                          onClick={() => {
                            setSelectedBranch(b.branch);
                            setSingleAdmission(b.targets.admission_target);
                            setSingleCollection(b.targets.collection_target);
                            setSingleNotes(b.targets.notes || "");
                          }}
                          className={`p-2.5 rounded-xl text-left border transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-sm"
                              : "border-border-light bg-surface hover:border-primary/40 hover:bg-app-bg"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-text-primary leading-tight">{short}</span>
                            <span className="text-[10px] text-text-tertiary">{b.abbr}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-text-tertiary">
                            <span>Target: {b.targets.admission_target} adm</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Admission Target Input */}
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                      <UserPlus className="h-4 w-4" />
                      Monthly Admission Target
                    </label>
                    <span className="text-xs text-text-tertiary">Students</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      max="500"
                      value={singleAdmission}
                      onChange={(e) => setSingleAdmission(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-lg font-bold px-3 py-2 rounded-lg bg-surface border border-border-light focus:outline-none focus:ring-2 focus:ring-blue-500 text-text-primary tabular-nums"
                    />
                    <div className="flex items-center gap-1">
                      {[15, 25, 35, 50].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSingleAdmission(preset)}
                          className="px-2 py-1.5 text-[11px] font-semibold rounded-md bg-surface border border-border-light hover:border-blue-400 text-text-secondary transition-colors"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Collection Target Input */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                      <IndianRupee className="h-4 w-4" />
                      Monthly Collection Target (₹)
                    </label>
                    <span className="text-xs font-bold text-emerald-600">
                      {formatCurrency(singleCollection)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={singleCollection}
                      onChange={(e) => setSingleCollection(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-lg font-bold px-3 py-2 rounded-lg bg-surface border border-border-light focus:outline-none focus:ring-2 focus:ring-emerald-500 text-text-primary tabular-nums"
                    />
                    <div className="flex items-center gap-1">
                      {[
                        { label: "4L", val: 400000 },
                        { label: "6L", val: 600000 },
                        { label: "8L", val: 800000 },
                        { label: "10L", val: 1000000 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setSingleCollection(preset.val)}
                          className="px-2 py-1.5 text-[11px] font-semibold rounded-md bg-surface border border-border-light hover:border-emerald-400 text-text-secondary transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Internal Notes / Focus Directives (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={singleNotes}
                    onChange={(e) => setSingleNotes(e.target.value)}
                    placeholder="e.g. Focus on 10th CBSE fee collections; special admission drive for Science stream."
                    className="w-full text-xs p-2.5 rounded-lg bg-surface border border-border-light focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
                  />
                </div>

                {/* Footer Save */}
                <div className="flex justify-end gap-3 pt-3 border-t border-border-light">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-border-light hover:bg-app-bg text-text-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-primary text-white shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Target for {selectedBranch.replace("Smart Up ", "")}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleBulkSubmit} className="space-y-6">
                {/* Fast Clone / Tools Bar */}
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-violet-500" />
                    <span className="text-xs font-bold text-text-primary">Quick Allocation Tools</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-tertiary">Copy from Previous Month:</span>
                    <select
                      value={copyAdjustment}
                      onChange={(e) => setCopyAdjustment(parseInt(e.target.value, 10))}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-surface border border-border-light text-text-primary"
                    >
                      <option value="0">Same as Last Month (0%)</option>
                      <option value="5">+5% Increase</option>
                      <option value="10">+10% Increase</option>
                      <option value="15">+15% Increase</option>
                      <option value="-5">-5% Conservative</option>
                    </select>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleCopyPreviousMonth}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Apply Copy
                    </button>
                  </div>
                </div>

                {/* Bulk Grid Table */}
                <div className="rounded-xl border border-border-light overflow-hidden bg-surface">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-app-bg border-b border-border-light text-text-tertiary uppercase font-bold text-[10px] tracking-wider">
                        <th className="py-2.5 px-4">Branch</th>
                        <th className="py-2.5 px-4 w-44">Admission Target (Students)</th>
                        <th className="py-2.5 px-4 w-56">Collection Target (₹)</th>
                        <th className="py-2.5 px-4">Notes / Strategy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                      {branches.map((b) => {
                        const vals = bulkTargets[b.branch] || { admissions: 0, collection: 0, notes: "" };
                        const short = b.branch.replace("Smart Up ", "");

                        return (
                          <tr key={b.branch} className="hover:bg-app-bg/50 transition-colors">
                            <td className="py-3 px-4 font-semibold text-text-primary">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 text-primary" />
                                <span>{short}</span>
                                <span className="text-[10px] text-text-tertiary">({b.abbr})</span>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <input
                                type="number"
                                min="0"
                                value={vals.admissions}
                                onChange={(e) => {
                                  const num = Math.max(0, parseInt(e.target.value) || 0);
                                  setBulkTargets((prev) => ({
                                    ...prev,
                                    [b.branch]: { ...prev[b.branch], admissions: num },
                                  }));
                                }}
                                className="w-28 px-2.5 py-1.5 rounded-lg bg-app-bg border border-border-light font-bold text-blue-600 tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="5000"
                                  value={vals.collection}
                                  onChange={(e) => {
                                    const num = Math.max(0, parseInt(e.target.value) || 0);
                                    setBulkTargets((prev) => ({
                                      ...prev,
                                      [b.branch]: { ...prev[b.branch], collection: num },
                                    }));
                                  }}
                                  className="w-36 px-2.5 py-1.5 rounded-lg bg-app-bg border border-border-light font-bold text-emerald-600 tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                <span className="text-[10px] text-text-tertiary truncate">
                                  {formatCurrency(vals.collection)}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <input
                                type="text"
                                value={vals.notes}
                                onChange={(e) => {
                                  const text = e.target.value;
                                  setBulkTargets((prev) => ({
                                    ...prev,
                                    [b.branch]: { ...prev[b.branch], notes: text },
                                  }));
                                }}
                                placeholder="Target notes..."
                                className="w-full px-2.5 py-1.5 rounded-lg bg-app-bg border border-border-light text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-app-bg border-t border-border-light font-bold">
                        <td className="py-3 px-4 text-text-primary uppercase text-[10px]">
                          Total Network Targets
                        </td>
                        <td className="py-3 px-4 text-blue-600 font-bold tabular-nums">
                          {totalBulkAdmissions} students
                        </td>
                        <td className="py-3 px-4 text-emerald-600 font-bold tabular-nums">
                          {formatCurrency(totalBulkCollection)}
                        </td>
                        <td className="py-3 px-4 text-[10px] text-text-tertiary">
                          Across all 9 offline branches
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Footer Save */}
                <div className="flex justify-end gap-3 pt-3 border-t border-border-light">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-border-light hover:bg-app-bg text-text-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-primary text-white shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Targets for All Branches
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
