"use client";

import React from "react";
import { getStatusColor, formatCallDate } from "@/lib/api/followup";
import type { FollowUpLog } from "@/lib/api/followup";
import { Phone, IndianRupee } from "lucide-react";

interface FollowUpBadgeProps {
  log: FollowUpLog;
}

/**
 * Compact badge shown on a student overdue card after a follow-up has been logged.
 * Displays: status label · call date · optional paid amount
 */
export function FollowUpBadge({ log }: FollowUpBadgeProps) {
  const colors = getStatusColor(log.call_status);
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {/* Colored dot */}
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />

      {/* Phone icon */}
      <Phone className="h-2.5 w-2.5 shrink-0 opacity-70" />

      {/* Status + date */}
      <span>{log.call_status}</span>
      <span className="opacity-60">·</span>
      <span>{formatCallDate(log.call_date)}</span>

      {/* Amount if paid */}
      {log.payment_received === 1 && log.amount_received && log.amount_received > 0 && (
        <>
          <span className="opacity-60">·</span>
          <IndianRupee className="h-2.5 w-2.5 shrink-0" />
          <span>{log.amount_received.toLocaleString("en-IN")}</span>
        </>
      )}
    </div>
  );
}
