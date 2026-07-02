"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Clock3, PhoneCall, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { getStudentFollowUps, getStatusColor } from "@/lib/api/followup";

interface StudentFollowUpHistoryProps {
  studentId: string;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function StudentFollowUpHistory({ studentId }: StudentFollowUpHistoryProps) {
  const [open, setOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["student-followup-history", studentId],
    queryFn: () => getStudentFollowUps(studentId),
    enabled: open,
    staleTime: 30_000,
  });

  const rows = data ?? [];

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700 transition-colors"
      >
        {open ? (
          <>
            Follow-up History <ChevronUp className="h-3 w-3" />
          </>
        ) : (
          <>
            Follow-up History
            {rows.length > 0 ? ` (${rows.length})` : ""}
            <ChevronDown className="h-3 w-3" />
          </>
        )}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-3 text-left w-[240px] xs:w-[280px] sm:w-[320px] md:w-[360px] max-w-full">
          <div className="mb-2 flex items-center gap-2">
            <PhoneCall className="h-3.5 w-3.5 text-slate-500" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
              Follow-up History
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 py-2 text-xs text-text-secondary">
              <Clock3 className="h-3.5 w-3.5 animate-pulse" />
              Loading history...
            </div>
          ) : isError ? (
            <p className="py-2 text-xs text-error">Failed to load follow-up history</p>
          ) : rows.length === 0 ? (
            <p className="py-2 text-xs text-text-secondary">No follow-up history yet</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {rows.map((row) => {
                const badge = getStatusColor(row.call_status);
                const caller = row.called_by ? row.called_by.split("@")[0] : "unknown";
                return (
                  <div
                    key={row.name}
                    className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px]"
                  >
                    {/* First row: Date, Caller & Status badge */}
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="text-text-secondary font-medium">
                        <span className="font-semibold text-text-primary">{formatDate(row.call_date)}</span>
                        <span className="mx-1 text-slate-300">|</span>
                        <span>by {caller}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                        <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                        {row.call_status}
                      </span>
                    </div>

                    {/* Second row: Remarks (if any) */}
                    {row.remarks && (
                      <p className="text-text-secondary italic bg-slate-50 rounded px-2 py-1 border border-dashed border-slate-100 text-[10px] break-words">
                        "{row.remarks}"
                      </p>
                    )}

                    {/* Third row: Payment Received / Next Followup Info */}
                    {(row.payment_received === 1 || row.next_followup_date) && (
                      <div className="flex items-center justify-between flex-wrap gap-1 pt-1 border-t border-slate-50 text-[9px] text-text-tertiary">
                        {row.payment_received === 1 ? (
                          <span className="font-medium text-emerald-700">
                            Collected: {formatCurrency(row.amount_received ?? 0)} ({row.payment_mode || "N/A"})
                          </span>
                        ) : <span />}

                        {row.next_followup_date ? (
                          <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                            <Calendar className="h-2.5 w-2.5" />
                            Next follow-up: {formatDate(row.next_followup_date)}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
