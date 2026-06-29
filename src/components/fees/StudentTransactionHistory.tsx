"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Clock3, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/formatters";
import { getStudentTransactionHistory } from "@/lib/api/fees";

interface StudentTransactionHistoryProps {
  studentId: string;
  branch: string;
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

function modeVariant(mode: "Razorpay" | "UPI" | "Bank" | "Cash"): "info" | "success" | "warning" {
  if (mode === "Razorpay") return "info";
  if (mode === "UPI") return "success";
  if (mode === "Cash") return "warning";
  return "warning";
}

export function StudentTransactionHistory({
  studentId,
  branch,
}: StudentTransactionHistoryProps) {
  const [open, setOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["student-transaction-history", branch, studentId],
    queryFn: () => getStudentTransactionHistory(studentId, branch),
    enabled: open,
    staleTime: 60_000,
  });

  const rows = data ?? [];

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
      >
        {open ? (
          <>
            Payment History <ChevronUp className="h-3 w-3" />
          </>
        ) : (
          <>
            Payment History
            {rows.length > 0 ? ` (${rows.length})` : ""}
            <ChevronDown className="h-3 w-3" />
          </>
        )}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-3">
          <div className="mb-2 flex items-center gap-2">
            <ReceiptText className="h-3.5 w-3.5 text-slate-500" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
              Payment History
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 py-2 text-xs text-text-secondary">
              <Clock3 className="h-3.5 w-3.5 animate-pulse" />
              Loading history...
            </div>
          ) : isError ? (
            <p className="py-2 text-xs text-error">Failed to load transaction history</p>
          ) : rows.length === 0 ? (
            <p className="py-2 text-xs text-text-secondary">No transaction history yet</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[1.1fr_1fr_0.9fr] gap-2 px-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">Date</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-right text-text-tertiary">Amount</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-right text-text-tertiary">Mode</p>
              </div>

              {rows.map((row) => (
                <div
                  key={`${row.payment_entry_id}-${row.invoice_id}`}
                  className="grid grid-cols-[1.1fr_1fr_0.9fr] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-primary">{formatDate(row.posting_date)}</p>
                    <p className="truncate text-[9px] text-text-tertiary/70">{row.invoice_id || "Direct payment"}</p>
                  </div>
                  <p className="text-right text-xs font-semibold tabular-nums text-text-primary">
                    {formatCurrency(row.amount)}
                  </p>
                  <div className="flex justify-end">
                    <Badge variant={modeVariant(row.mode)} className="px-2 py-0.5 text-[10px]">
                      {row.mode}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
