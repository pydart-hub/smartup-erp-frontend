"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  IndianRupee,
  GraduationCap,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Student } from "@/lib/types/student";
import { buildFeeConfigKey } from "@/lib/utils/feeSchedule";
import type { FeeConfigEntry } from "@/lib/types/fee";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConversionInfo {
  studentId: string;
  studentName: string;
  branch: string;
  customer: string;
  enrollment: {
    name: string;
    program: string;
    academic_year: string;
    student_batch_name?: string;
  } | null;
  demoInvoices: { name: string; grand_total: number; outstanding_amount: number }[];
  totalInvoiced: number;
  paidAmount: number;
}

interface SchedulePreviewRow {
  label: string;
  originalAmount: number;
  amount: number;
  siblingDiscountApplied: number;
  demoCreditApplied: number;
  dueDate: string;
}

interface Props {
  student: Student;
  onClose: () => void;
  onSuccess: () => void;
}

const PLAN_OPTIONS = [
  { value: "Basic", label: "Basic", description: "Standard curriculum" },
  { value: "Intermediate", label: "Intermediate", description: "Enhanced learning" },
  { value: "Advanced", label: "Advanced", description: "Premium programme" },
];

const INSTALMENT_OPTIONS = [
  { value: 1, label: "One-Time", sublabel: "Single full payment" },
  { value: 4, label: "Quarterly", sublabel: "4 instalments" },
  { value: 6, label: "6 Months", sublabel: "6 instalments" },
  { value: 8, label: "8 Months", sublabel: "8 instalments" },
];

// ── Due-date helpers (mirrors feeSchedule.ts constants) ──────────────────────

const DUE_DATES = {
  quarterly: [
    { month: 5, day: 1 },
    { month: 8, day: 1 },
    { month: 11, day: 1 },
    { month: 2, day: 1 },
  ],
  inst6: [
    { month: 5, day: 1 }, { month: 7, day: 1 }, { month: 9, day: 1 },
    { month: 11, day: 1 }, { month: 1, day: 1 }, { month: 2, day: 1 },
  ],
  inst8: [
    { month: 5, day: 1 }, { month: 6, day: 1 }, { month: 7, day: 1 }, { month: 8, day: 1 },
    { month: 9, day: 1 }, { month: 10, day: 1 }, { month: 11, day: 1 }, { month: 2, day: 1 },
  ],
};

function buildSchedulePreview(
  config: FeeConfigEntry,
  instalments: number,
  academicYear: string,
  paidAmount: number,
  siblingDiscountRate = 0,
  enrollmentDate?: string,
): SchedulePreviewRow[] {
  const startYear = parseInt(academicYear.split("-")[0], 10);

  function dueDate(tmpl: { month: number; day: number }): string {
    const year = tmpl.month < 3 ? startYear + 1 : startYear;
    return `${year}-${String(tmpl.month + 1).padStart(2, "0")}-${String(tmpl.day).padStart(2, "0")}`;
  }

  let raw: SchedulePreviewRow[] = [];

  if (instalments === 1) {
    raw = [{
      label: "Full Payment",
      originalAmount: config.otp,
      amount: config.otp,
      siblingDiscountApplied: 0,
      demoCreditApplied: 0,
      dueDate: enrollmentDate || dueDate(DUE_DATES.quarterly[0]),
    }];
  } else if (instalments === 4) {
    const labels = ["Q1", "Q2", "Q3", "Q4"];
    const amounts = [config.q1, config.q2, config.q3, config.q4];
    raw = DUE_DATES.quarterly.map((t, i) => ({
      label: labels[i],
      originalAmount: amounts[i],
      amount: amounts[i],
      siblingDiscountApplied: 0,
      demoCreditApplied: 0,
      dueDate: dueDate(t),
    }));
  } else if (instalments === 6) {
    raw = DUE_DATES.inst6.map((t, i) => ({
      label: `Inst ${i + 1}`,
      originalAmount: i < 5 ? config.inst6_per : config.inst6_last,
      amount: i < 5 ? config.inst6_per : config.inst6_last,
      siblingDiscountApplied: 0,
      demoCreditApplied: 0,
      dueDate: dueDate(t),
    }));
  } else if (instalments === 8) {
    raw = DUE_DATES.inst8.map((t, i) => ({
      label: `Inst ${i + 1}`,
      originalAmount: i < 7 ? config.inst8_per : config.inst8_last,
      amount: i < 7 ? config.inst8_per : config.inst8_last,
      siblingDiscountApplied: 0,
      demoCreditApplied: 0,
      dueDate: dueDate(t),
    }));
  }

  if (raw.length > 0 && siblingDiscountRate > 0) {
    const total = raw.reduce((sum, row) => sum + row.amount, 0);
    const siblingDiscount = Math.round(total * siblingDiscountRate);
    let remainingSiblingDiscount = siblingDiscount;
    raw = raw.map((row) => ({ ...row }));

    for (let index = raw.length - 1; index >= 0 && remainingSiblingDiscount > 0; index -= 1) {
      const applied = Math.min(raw[index].amount, remainingSiblingDiscount);
      if (applied <= 0) continue;

      raw[index] = {
        ...raw[index],
        amount: raw[index].amount - applied,
        siblingDiscountApplied: raw[index].siblingDiscountApplied + applied,
      };
      remainingSiblingDiscount -= applied;
    }
  }

  // Apply credit backwards
  let remaining = paidAmount;
  const result: SchedulePreviewRow[] = raw.map((r) => ({ ...r }));
  for (let i = result.length - 1; i >= 0 && remaining > 0; i--) {
    const applied = Math.min(result[i].amount, remaining);
    result[i].demoCreditApplied = applied;
    result[i].amount -= applied;
    remaining -= applied;
  }

  return result;
}

function fmtCurrency(amount: number) {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function getBaseOptionTotal(config: FeeConfigEntry, instalments: number): number {
  if (instalments === 1) return config.otp;
  if (instalments === 4) return config.quarterly_total;
  if (instalments === 6) return config.inst6_total;
  if (instalments === 8) return config.inst8_total;
  return 0;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConvertDemoModal({ student, onClose, onSuccess }: Props) {
  const studentId = student.name;
  const fullName =
    student.student_name ||
    [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ");

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<"loading" | "select" | "preview" | "converting" | "success" | "error">("loading");
  const [conversionInfo, setConversionInfo] = useState<ConversionInfo | null>(null);
  const [feeConfig, setFeeConfig] = useState<FeeConfigEntry | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [plan, setPlan] = useState("Basic");
  const [instalments, setInstalments] = useState(4);
  const [schedulePreview, setSchedulePreview] = useState<SchedulePreviewRow[]>([]);
  const [converting, setConverting] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<{ salesOrderName: string; invoices: string[]; paidAmount: number } | null>(null);
  const [useSiblingOffer, setUseSiblingOffer] = useState(false);
  const siblingGroup = student.custom_sibling_group ?? null;

  // ── Load conversion info on mount ─────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/admission/demo-conversion-info?studentId=${encodeURIComponent(studentId)}`,
          { credentials: "include" },
        );
        const data = await res.json() as { data?: ConversionInfo; error?: string };
        if (!res.ok || !data.data) {
          setFetchError(data.error ?? "Failed to load conversion info");
          setStep("error");
          return;
        }
        setConversionInfo(data.data);

        // Fetch fee config for this branch + program + default plan
        const enrollment = data.data.enrollment;
        if (enrollment) {
          await loadFeeConfig(data.data.branch, enrollment.program, plan);
        }
        setStep("select");
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Network error");
        setStep("error");
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function loadFeeConfig(branch: string, program: string, selectedPlan: string) {
    try {
      const res = await fetch(
        `/api/fee-config?company=${encodeURIComponent(branch)}&program=${encodeURIComponent(program)}&plan=${encodeURIComponent(selectedPlan)}`,
        { credentials: "include" },
      );
      const data = await res.json() as { data?: FeeConfigEntry; error?: string };
      if (res.ok && data.data) {
        setFeeConfig(data.data);
      } else {
        setFeeConfig(null);
      }
    } catch {
      setFeeConfig(null);
    }
  }

  // Reload fee config when plan changes
  useEffect(() => {
    if (conversionInfo?.enrollment && conversionInfo.branch) {
      loadFeeConfig(conversionInfo.branch, conversionInfo.enrollment.program, plan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  // Recompute preview when plan/instalments/feeConfig changes
  useEffect(() => {
    if (!feeConfig || !conversionInfo?.enrollment) return;
    const siblingDiscountRate = useSiblingOffer
      ? (plan === "Advanced" ? 0.10 : 0.05)
      : 0;
    const preview = buildSchedulePreview(
      feeConfig,
      instalments,
      conversionInfo.enrollment.academic_year,
      conversionInfo.paidAmount,
      siblingDiscountRate,
      undefined,
    );
    setSchedulePreview(preview);
  }, [feeConfig, instalments, conversionInfo, useSiblingOffer, plan]);

  // ── Convert handler ────────────────────────────────────────────────────────
  const handleConvert = useCallback(async () => {
    if (!feeConfig || !conversionInfo?.enrollment) return;
    setConverting(true);
    setResultError(null);
    setStep("converting");

    try {
      const res = await fetch("/api/admission/convert-to-regular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          studentId,
          plan,
          instalments,
          feeConfigEntry: feeConfig,
          academicYear: conversionInfo.enrollment.academic_year,
          enrollmentDate: new Date().toISOString().split("T")[0],
          useSiblingOffer,
          siblingGroup: useSiblingOffer ? (siblingGroup ?? undefined) : undefined,
        }),
      });
      const data = await res.json() as {
        success?: boolean;
        salesOrderName?: string;
        invoices?: string[];
        paidAmount?: number;
        error?: string;
      };

      if (!res.ok || !data.success) {
        setResultError(data.error ?? "Conversion failed");
        setStep("select");
        return;
      }

      setResultData({
        salesOrderName: data.salesOrderName ?? "",
        invoices: data.invoices ?? [],
        paidAmount: data.paidAmount ?? 0,
      });
      setStep("success");
      onSuccess();
    } catch (err) {
      setResultError(err instanceof Error ? err.message : "Network error");
      setStep("select");
    } finally {
      setConverting(false);
    }
  }, [feeConfig, conversionInfo, studentId, plan, instalments, useSiblingOffer, siblingGroup, onSuccess]);

  const totalAfterCredit = schedulePreview.reduce((s, r) => s + r.amount, 0);
  const totalOriginal = schedulePreview.reduce((s, r) => s + r.originalAmount, 0);
  const enrollment = conversionInfo?.enrollment;
  const isKadavantharaBranch = conversionInfo?.branch === "Smart Up Kadavanthara";
  const siblingDiscountRate = useSiblingOffer ? (plan === "Advanced" ? 0.10 : 0.05) : 0;
  const siblingDiscountAmount = feeConfig && siblingDiscountRate > 0
    ? Math.round(getBaseOptionTotal(feeConfig, instalments) * siblingDiscountRate)
    : 0;

  function isPlanDisabled(planValue: string): boolean {
    return isKadavantharaBranch && planValue !== "Basic";
  }

  // Kadavanthara branch supports only Basic plan in this conversion screen.
  useEffect(() => {
    if (isKadavantharaBranch && plan !== "Basic") {
      setPlan("Basic");
    }
  }, [isKadavantharaBranch, plan]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={() => step !== "converting" && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
        >

          {/* ── Loading ── */}
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-text-secondary">Loading student info…</p>
            </div>
          )}

          {/* ── Error ── */}
          {step === "error" && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-error/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-error" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">Cannot Convert</h3>
              </div>
              <p className="text-sm text-text-secondary mb-6">{fetchError}</p>
              <Button variant="outline" size="sm" onClick={onClose} className="w-full">Close</Button>
            </div>
          )}

          {/* ── Success ── */}
          {step === "success" && resultData && (
            <div className="p-6 text-center">
              <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-7 w-7 text-success" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-1">Converted Successfully</h3>
              <p className="text-sm text-text-secondary mb-5">
                {fullName} is now a Regular student ({plan} plan, {instalments === 1 ? "One-Time" : `${instalments} Instalments`}).
              </p>

              <div className="bg-app-bg rounded-xl p-4 mb-5 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-tertiary">Sales Order</span>
                  <span className="font-medium text-text-primary">{resultData.salesOrderName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-tertiary">Invoices Created</span>
                  <span className="font-medium text-text-primary">{resultData.invoices.length}</span>
                </div>
                {resultData.paidAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-tertiary">Demo Credit Applied</span>
                    <span className="font-medium text-success">-{fmtCurrency(resultData.paidAmount)}</span>
                  </div>
                )}
              </div>

              <Button variant="primary" size="sm" onClick={onClose} className="w-full">Done</Button>
            </div>
          )}

          {/* ── Select & Preview ── */}
          {(step === "select" || step === "converting") && (
            <>
              {/* Header */}
              <div className="flex items-start justify-between p-6 pb-4 border-b border-border-light">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-text-primary">Convert to Regular</h3>
                    <p className="text-xs text-text-secondary">{fullName}</p>
                  </div>
                </div>
                {step !== "converting" && (
                  <button onClick={onClose} className="p-1.5 rounded-md hover:bg-app-bg text-text-tertiary transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

                {/* Demo credit badge */}
                {(conversionInfo?.paidAmount ?? 0) > 0 && (
                  <div className="flex items-center gap-3 rounded-xl bg-success/8 border border-success/20 p-4">
                    <IndianRupee className="h-5 w-5 text-success flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-success">
                        Demo credit: {fmtCurrency(conversionInfo!.paidAmount)}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        This amount will be reduced from the last invoice(s) of the new plan.
                      </p>
                    </div>
                  </div>
                )}

                {/* Program info */}
                {enrollment && (
                  <div className="rounded-xl bg-app-bg border border-border-light p-4 text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Program</span>
                      <span className="font-medium text-text-primary">{enrollment.program}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Academic Year</span>
                      <span className="font-medium text-text-primary">{enrollment.academic_year}</span>
                    </div>
                    {enrollment.student_batch_name && (
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Batch</span>
                        <span className="font-medium text-text-primary">{enrollment.student_batch_name}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Sibling offer */}
                <div className="space-y-3 rounded-xl border border-border-light p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Sibling Offer</p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Apply sibling discount during conversion. Advanced gets 10%; all other plans get 5%.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseSiblingOffer((prev) => !prev)}
                      disabled={step === "converting"}
                      className={`inline-flex h-6 w-11 items-center rounded-full transition-colors ${useSiblingOffer ? "bg-primary" : "bg-border-light"}`}
                    >
                      <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${useSiblingOffer ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  {useSiblingOffer && (
                    <div className="rounded-xl bg-app-bg border border-border-light p-3">
                      <p className="text-xs text-text-secondary">
                        Sibling is resolved automatically from linked sibling data. Keep this ON only for verified sibling admissions.
                      </p>
                    </div>
                  )}
                </div>

                {/* Plan selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Select Plan</label>
                  {isKadavantharaBranch && (
                    <p className="text-xs text-text-tertiary">
                      Kadavanthara branch supports only Basic plan.
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {PLAN_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => !isPlanDisabled(opt.value) && setPlan(opt.value)}
                        disabled={step === "converting" || isPlanDisabled(opt.value)}
                        className={`rounded-[10px] border p-3 text-left transition-all ${
                          plan === opt.value
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border-input bg-surface text-text-secondary hover:border-primary/40"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <p className="text-sm font-semibold">{opt.label}</p>
                        <p className="text-[10px] mt-0.5 opacity-70">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instalment selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Payment Schedule</label>
                  <div className="grid grid-cols-2 gap-2">
                    {INSTALMENT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setInstalments(opt.value)}
                        disabled={step === "converting"}
                        className={`rounded-[10px] border p-3 text-left transition-all ${
                          instalments === opt.value
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border-input bg-surface text-text-secondary hover:border-primary/40"
                        } disabled:opacity-50`}
                      >
                        <p className="text-sm font-semibold">{opt.label}</p>
                        <p className="text-[10px] mt-0.5 opacity-70">{opt.sublabel}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fee config not found warning */}
                {!feeConfig && enrollment && (
                  <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/8 p-3 text-sm text-warning">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    Fee config not found for this branch / program / plan combination. Check XLSX data.
                  </div>
                )}

                {/* Instalment schedule preview */}
                {schedulePreview.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-text-secondary">Fee Schedule Preview</label>
                      <div className="flex items-center gap-2">
                        {siblingDiscountAmount > 0 && (
                          <span className="text-xs text-primary font-medium">
                            Sibling discount {fmtCurrency(siblingDiscountAmount)}
                          </span>
                        )}
                        {(conversionInfo?.paidAmount ?? 0) > 0 && (
                          <span className="text-xs text-success font-medium">
                            After {fmtCurrency(conversionInfo!.paidAmount)} credit
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border-light overflow-hidden">
                      {schedulePreview.map((row, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between px-4 py-3 text-sm border-b border-border-light last:border-0 ${
                            row.demoCreditApplied > 0 || row.siblingDiscountApplied > 0 ? "bg-success/4" : ""
                          }`}
                        >
                          <div>
                            <span className="font-medium text-text-primary">{row.label}</span>
                            <span className="ml-2 text-xs text-text-tertiary">{row.dueDate}</span>
                          </div>
                          <div className="text-right space-y-0.5">
                            {row.siblingDiscountApplied > 0 || row.demoCreditApplied > 0 ? (
                              <>
                                <p className="text-[10px] text-text-tertiary">Original {fmtCurrency(row.originalAmount)}</p>
                                {row.siblingDiscountApplied > 0 && (
                                  <p className="text-[10px] text-primary">
                                    Sibling offer -{fmtCurrency(row.siblingDiscountApplied)}
                                  </p>
                                )}
                                {row.demoCreditApplied > 0 && (
                                  <p className="text-[10px] text-success">
                                    Demo credit -{fmtCurrency(row.demoCreditApplied)}
                                  </p>
                                )}
                                <p className={`font-semibold ${row.amount === 0 ? "text-success" : "text-text-primary"}`}>
                                  Final {row.amount === 0 ? "₹0 (Paid)" : fmtCurrency(row.amount)}
                                </p>
                              </>
                            ) : (
                              <p className="font-semibold text-text-primary">{fmtCurrency(row.amount)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {/* Total row */}
                      <div className="flex items-center justify-between px-4 py-3 bg-app-bg border-t border-border-light">
                        <span className="text-sm font-semibold text-text-primary">Total Due</span>
                        <div className="text-right">
                          {(conversionInfo?.paidAmount ?? 0) > 0 && (
                            <p className="text-[10px] text-text-tertiary line-through">{fmtCurrency(totalOriginal)}</p>
                          )}
                          <p className="text-sm font-bold text-primary">{fmtCurrency(totalAfterCredit)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {resultError && (
                  <div className="flex items-start gap-2 rounded-xl border border-error/30 bg-error/8 p-3 text-sm text-error">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    {resultError}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 pb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={step === "converting"}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConvert}
                  disabled={step === "converting" || !feeConfig || schedulePreview.length === 0}
                >
                  {step === "converting" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Converting…
                    </>
                  ) : (
                    <>
                      Convert to Regular
                      <ChevronRight className="h-4 w-4" />
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
