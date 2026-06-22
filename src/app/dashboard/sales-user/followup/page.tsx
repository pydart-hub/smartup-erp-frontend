"use client";

import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Phone,
  PhoneCall,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Building2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { getSalesUserFollowUpDashboard } from "@/lib/api/followup";
import { formatCurrency } from "@/lib/utils/formatters";
import { GifLoader } from "@/components/ui/GifLoader";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function SalesUserFollowUpDashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["sales-user-followup-dashboard"],
    queryFn: () => getSalesUserFollowUpDashboard(),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const summary = data?.summary;
  const byBranch = data?.by_branch ?? [];
  const byStatus = data?.by_status ?? [];
  const recentLogs = data?.recent_logs ?? [];
  const userInfo = data?.user;

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6 pb-8">
      <BreadcrumbNav />

      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-text-primary">Follow-Up Dashboard</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Only your calling history, conversions, pending follow-ups, and recent call activity
        </p>
      </motion.div>

      {!!userInfo && (
        <motion.div variants={item}>
          <Card className="border-teal-200/70 bg-teal-50/30">
            <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Showing User</p>
                <p className="text-xl font-bold text-text-primary mt-1">{userInfo.full_name}</p>
                <p className="text-sm text-text-secondary mt-1">
                  {userInfo.email}
                  {userInfo.branch ? ` • ${userInfo.branch.replace("Smart Up ", "").replace("Smart Up", "HQ")}` : ""}
                </p>
              </div>
              <div className="rounded-xl border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700">
                Your data only
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {isLoading ? (
        <GifLoader />
      ) : isError || !summary ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">
            {error instanceof Error ? error.message : "Failed to load follow-up dashboard"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
            <Card className="border-sky-200/70">
              <CardContent className="p-5">
                <Phone className="h-5 w-5 text-sky-600 mb-3" />
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Today Calls</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{summary.today_calls}</p>
                <p className="text-xs text-text-secondary mt-1">{summary.week_calls} this week</p>
              </CardContent>
            </Card>

            <Card className="border-emerald-200/70">
              <CardContent className="p-5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mb-3" />
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Converted</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{summary.converted_count}</p>
                <p className="text-xs text-emerald-700 mt-1">{formatCurrency(summary.paid_amount)} received</p>
              </CardContent>
            </Card>

            <Card className="border-amber-200/70">
              <CardContent className="p-5">
                <Clock3 className="h-5 w-5 text-amber-600 mb-3" />
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Pending</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{summary.pending_followups}</p>
                <p className="text-xs text-text-secondary mt-1">{summary.promised_count} promised to pay</p>
              </CardContent>
            </Card>

            <Card className="border-violet-200/70">
              <CardContent className="p-5">
                <PhoneCall className="h-5 w-5 text-violet-600 mb-3" />
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Answered</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{summary.answered_count}</p>
                <p className="text-xs text-text-secondary mt-1">{summary.no_answer_count} no answer / busy</p>
              </CardContent>
            </Card>

            <Card className="border-teal-200/70">
              <CardContent className="p-5">
                <Building2 className="h-5 w-5 text-teal-600 mb-3" />
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Students Contacted</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{summary.students_contacted}</p>
                <p className="text-xs text-text-secondary mt-1">{summary.total_calls} total calls</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-text-primary">Your Branch Activity</h2>
                  <span className="text-xs text-text-tertiary">{byBranch.length} branches you handled</span>
                </div>
                <div className="space-y-3">
                  {byBranch.length ? byBranch.map((row) => (
                    <div key={row.branch} className="rounded-xl border border-border-light bg-surface p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {(row.branch || "").replace("Smart Up ", "").replace("Smart Up", "HQ") || "Unknown Branch"}
                          </p>
                          <p className="text-xs text-text-secondary mt-1">
                            {row.calls} calls • {row.converted} converted • {row.promised} promised • {row.pending} pending
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-text-primary">{row.calls}</p>
                          <p className="text-[11px] text-text-tertiary">calls</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-text-tertiary">No branch activity yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-text-primary">Your Status Breakdown</h2>
                  <span className="text-xs text-text-tertiary">{summary.total_calls} logs</span>
                </div>
                <div className="space-y-3">
                  {byStatus.length ? byStatus.map((row) => (
                    <div key={row.status} className="flex items-center justify-between rounded-xl border border-border-light bg-surface px-4 py-3">
                      <p className="text-sm text-text-primary">{row.status}</p>
                      <p className="text-sm font-bold text-text-primary">{row.count}</p>
                    </div>
                  )) : (
                    <p className="text-sm text-text-tertiary">No status history yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-text-primary">Your Recent Call History</h2>
                <span className="text-xs text-text-tertiary">Latest 12 logs</span>
              </div>
              <div className="space-y-2">
                {recentLogs.length ? recentLogs.map((log) => (
                  <div key={log.name || `${log.student}-${log.call_date}`} className="rounded-xl border border-border-light bg-surface px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{log.student_name || log.student}</p>
                        <p className="text-xs text-text-secondary mt-1">
                          {(log.branch || "").replace("Smart Up ", "").replace("Smart Up", "HQ") || "Unknown Branch"} • {log.call_status}
                          {log.payment_received ? " • Converted" : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-text-secondary">{formatDateTime(log.call_date)}</p>
                        {log.amount_received ? (
                          <p className="text-xs font-semibold text-emerald-700 mt-1">{formatCurrency(log.amount_received)}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-text-tertiary">No call history yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </motion.div>
  );
}
