"use client";

import React from "react";
import { CreditCard, Sparkles, CheckCircle2 } from "lucide-react";
import type { CrashCourseFeeBreakdown } from "@/lib/types/crashCourse";
import { formatINR } from "@/lib/utils/crashCoursePricing";

interface Props {
  breakdown: CrashCourseFeeBreakdown;
}

export function CrashCourseFeeSummaryCard({ breakdown }: Props) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated/70 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              Fee Summary ({breakdown.classLevel})
            </h3>
            <p className="text-xs text-text-muted">
              All-inclusive Crash Course 2026–27 Pricing
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Fixed Pricing
        </span>
      </div>

      <div className="mt-4 space-y-2.5 text-sm">
        <div className="flex justify-between items-center text-text-secondary">
          <span>Course Tuition Fee:</span>
          <span className="font-medium text-text-primary">
            {formatINR(breakdown.courseFee)}
          </span>
        </div>

        <div className="flex justify-between items-center text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span>Exam & Materials Fee:</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-text-muted">
              Mandatory
            </span>
          </span>
          <span className="font-medium text-text-primary">
            {formatINR(breakdown.examMaterialsFee)}
          </span>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-border/60 font-medium text-text-primary">
          <span>Mandatory Subtotal:</span>
          <span>{formatINR(breakdown.mandatoryTotal)}</span>
        </div>

        {breakdown.selectedLanguages.length > 0 && (
          <div className="mt-3 pt-3 border-t border-dashed border-border/80 space-y-1.5">
            <div className="flex justify-between items-center text-text-secondary">
              <span className="flex items-center gap-1.5">
                <span>Sunday Languages ({breakdown.selectedLanguages.length}):</span>
                {breakdown.languageSavings > 0 && (
                  <span className="flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    <Sparkles className="w-3 h-3" /> Save {formatINR(breakdown.languageSavings)}
                  </span>
                )}
              </span>
              <span className="font-medium text-text-primary">
                +{formatINR(breakdown.languageFee)}
              </span>
            </div>
            <div className="text-xs text-text-muted flex gap-1 flex-wrap">
              {breakdown.selectedLanguages.map((lang) => (
                <span
                  key={lang}
                  className="px-2 py-0.5 rounded bg-muted text-text-secondary text-[11px]"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t-2 border-border flex justify-between items-baseline">
        <div>
          <span className="text-xs uppercase tracking-wider text-text-muted font-medium">
            Grand Total Due
          </span>
          <div className="text-2xl font-bold text-text-primary tracking-tight">
            {formatINR(breakdown.grandTotal)}
          </div>
        </div>
        <div className="text-right text-xs text-text-muted">
          <span>Includes all 3 exams</span>
        </div>
      </div>
    </div>
  );
}
