"use client";

import React from "react";
import { Target, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import type { CrashCourseBranchProgress } from "@/lib/types/crashCourse";

interface Props {
  progress: CrashCourseBranchProgress;
}

export function TargetProgressBar({ progress }: Props) {
  const minPercent = progress.minTargetAchievedPercent;
  const recPercent = progress.recTargetAchievedPercent;

  const isMinReached = progress.enrolledCount >= progress.minTarget;
  const isRecReached = progress.enrolledCount >= progress.recTarget;

  return (
    <div className="p-5 rounded-xl border border-border bg-surface space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              {progress.branch}
            </h3>
            <p className="text-xs text-text-muted">
              Crash Course Admission Target
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-bold text-text-primary">
            {progress.enrolledCount}
          </span>
          <span className="text-xs text-text-muted"> / {progress.recTarget} Target</span>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-2">
        {/* Min Target Bar (80) */}
        <div>
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>Minimum Viability Target ({progress.minTarget})</span>
            <span className="font-semibold text-text-primary">{minPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isMinReached ? "bg-emerald-500" : "bg-primary"
              }`}
              style={{ width: `${minPercent}%` }}
            />
          </div>
        </div>

        {/* Recommended Target Bar (150) */}
        <div>
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>Recommended Branch Target ({progress.recTarget})</span>
            <span className="font-semibold text-text-primary">{recPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isRecReached ? "bg-emerald-500" : "bg-indigo-500"
              }`}
              style={{ width: `${recPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Target status note */}
      <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
        {isRecReached ? (
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4" /> Recommended Target Achieved!
          </span>
        ) : isMinReached ? (
          <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
            <TrendingUp className="w-4 h-4" /> Minimum Met! Pushing for 150.
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
            <AlertCircle className="w-4 h-4" /> {progress.minTarget - progress.enrolledCount} admits needed to reach minimum (80)
          </span>
        )}

        <span className="text-text-muted">
          Active Batches: {progress.batches?.length || 0}
        </span>
      </div>
    </div>
  );
}
