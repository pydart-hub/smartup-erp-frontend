"use client";

import React from "react";
import { Users, AlertTriangle, ShieldCheck, CheckCircle } from "lucide-react";
import type { CrashCourseBatchSummary } from "@/lib/types/crashCourse";

interface Props {
  batch: CrashCourseBatchSummary;
}

export function BatchCapacityGauge({ batch }: Props) {
  const percent = Math.min(
    100,
    Math.round((batch.enrolled_count / batch.max_capacity) * 100)
  );

  let barColor = "bg-emerald-500";
  let statusText = `${batch.seats_remaining} seats remaining`;
  let statusBadge = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";

  if (batch.is_full) {
    barColor = "bg-red-500";
    statusText = "Batch Full (50/50)";
    statusBadge = "bg-red-500/10 text-red-600 border-red-500/20";
  } else if (batch.is_near_capacity) {
    barColor = "bg-amber-500";
    statusText = `Near capacity: ${batch.seats_remaining} left`;
    statusBadge = "bg-amber-500/10 text-amber-600 border-amber-500/20";
  }

  return (
    <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-text-muted" />
          <span className="text-sm font-semibold text-text-primary">
            {batch.student_group_name || batch.name}
          </span>
        </div>
        <span
          className={`text-xs px-2.5 py-0.5 font-medium rounded-full border ${statusBadge}`}
        >
          {statusText}
        </span>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-300`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] text-text-muted mt-1.5">
          <span>{batch.enrolled_count} Enrolled</span>
          <span>Target: 20–50 students</span>
        </div>
      </div>

      {/* Policy reminder */}
      <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-text-muted">
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" /> Small batch guaranteed
        </span>
        <span>Max: 50 / class</span>
      </div>
    </div>
  );
}
