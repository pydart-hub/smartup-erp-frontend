"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  IndianRupee,
  Phone,
  UserRound,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/Card";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { formatCurrency } from "@/lib/utils/formatters";
import { getStatusColor } from "@/lib/api/followup";

interface LogEntry {
  name: string;
  student: string;
  student_name: string;
  branch: string;
  call_date: string;
  called_by: string;
  call_status: string;
  payment_received: number;
  amount_received?: number;
  payment_mode?: string;
  remarks?: string;
  next_followup_date?: string;
}

interface FeeFollowUpResponse {
  logs: LogEntry[];
}

interface GroupStat {
  label: string;
  count: number;
  amount: number;
}

type DetailKind = "promised" | "collected";

const PROMISED_STATUSES = ["Promised to Pay", "Will Pay This Week"];

function formatDateTime(str: string) {
  if (!str) return "";
  const d = new Date(str.replace(" ", "T"));
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateChip(str: string) {
  if (!str) return "";
  return new Date(`${str}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toDisplayUser(user: string) {
  return user.includes("@") ? user.split("@")[0] : user;
}

function DetailInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const selectedBranch = searchParams.get("selected_branch") ?? "";

  const kind = (searchParams.get("kind") === "collected" ? "collected" : "promised") as DetailKind;
  const branch = searchParams.get("branch") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const calledBy = searchParams.get("called_by") ?? "";
  const status = searchParams.get("status") ?? "";

  const title = kind === "promised" ? "Promised to Pay" : "Payments Collected";
  const description =
    kind === "promised"
      ? "Students who committed to pay, with branch-wise and sales-user-wise classification."
      : "Students whose payments were collected, with branch-wise and sales-user-wise classification.";

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("kind", kind);
    if (branch) params.set("branch", branch);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (calledBy) params.set("called_by", calledBy);
    if (status) params.set("status", status);
    return params.toString();
  }, [branch, from, to, calledBy, status]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["director-fee-followup-detail", kind, branch, from, to, calledBy, status],
    queryFn: async () => {
      const res = await fetch(`/api/director/fee-followup?${queryString}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch follow-up details");
      return res.json() as Promise<FeeFollowUpResponse>;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const detailLogs = useMemo(() => {
    const logs = data?.logs ?? [];
    return logs.filter((log) =>
      kind === "promised"
        ? PROMISED_STATUSES.includes(log.call_status)
        : Boolean(log.payment_received)
    );
  }, [data?.logs, kind]);

  const scopedLogs = useMemo(() => {
    if (!selectedBranch) return detailLogs;
    return detailLogs.filter((log) => (log.branch || "Unknown") === selectedBranch);
  }, [detailLogs, selectedBranch]);

  const branchStats = useMemo<GroupStat[]>(() => {
    const map = new Map<string, GroupStat>();
    for (const log of detailLogs) {
      const key = log.branch || "Unknown";
      const current = map.get(key) ?? { label: key, count: 0, amount: 0 };
      current.count += 1;
      current.amount += log.amount_received ?? 0;
      map.set(key, current);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || b.amount - a.amount);
  }, [detailLogs]);

  const userStats = useMemo<GroupStat[]>(() => {
    const map = new Map<string, GroupStat>();
    for (const log of scopedLogs) {
      const key = log.called_by || "Unknown";
      const current = map.get(key) ?? { label: key, count: 0, amount: 0 };
      current.count += 1;
      current.amount += log.amount_received ?? 0;
      map.set(key, current);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || b.amount - a.amount);
  }, [scopedLogs]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scopedLogs;
    return scopedLogs.filter((log) =>
      log.student_name.toLowerCase().includes(q) ||
      log.student.toLowerCase().includes(q) ||
      log.branch.toLowerCase().includes(q) ||
      log.called_by.toLowerCase().includes(q) ||
      log.call_status.toLowerCase().includes(q) ||
      (log.remarks ?? "").toLowerCase().includes(q)
    );
  }, [scopedLogs, search]);

  const totalAmount = scopedLogs.reduce((sum, log) => sum + (log.amount_received ?? 0), 0);

  function updateSelectedBranch(branchValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (branchValue) params.set("selected_branch", branchValue);
    else params.delete("selected_branch");
    router.push(`${pathname}?${params.toString()}`);
  }

  const activeFilters = [
    branch ? `Branch: ${branch}` : null,
    from ? `From: ${formatDateChip(from)}` : null,
    to ? `To: ${formatDateChip(to)}` : null,
    calledBy ? `Sales User: ${toDisplayUser(calledBy)}` : null,
    status ? `Status: ${status}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-app-bg pb-12">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <BreadcrumbNav />

        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start gap-3">
            <button
              onClick={() => router.back()}
              className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-light bg-surface transition-colors hover:bg-surface-alt"
            >
              <ArrowLeft className="h-4 w-4 text-text-secondary" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 text-lg font-bold text-text-primary">
                {kind === "promised" ? (
                  <Clock className="h-5 w-5 text-amber-600" />
                ) : (
                  <IndianRupee className="h-5 w-5 text-emerald-600" />
                )}
                {title}
              </h1>
              <p className="mt-0.5 text-xs text-text-tertiary">{description}</p>
              {activeFilters.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeFilters.map((filter) => (
                    <span
                      key={filter}
                      className="inline-flex items-center rounded-full border border-border-light bg-surface px-2 py-0.5 text-[10px] font-medium text-text-secondary"
                    >
                      {filter}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Link
              href="/dashboard/director/fee-followup"
              className="hidden shrink-0 rounded-lg border border-border-light bg-surface px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-surface-alt sm:inline-flex"
            >
              Back to Dashboard
            </Link>
          </div>
        </motion.div>

        {isLoading && (
          <div className="flex h-40 flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-text-tertiary">Loading detail records…</p>
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Failed to load detail data. Please try again.
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card className="border-border-light">
                <CardContent className="p-4 text-center">
                  <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    {kind === "promised" ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </div>
                  <p className="text-2xl font-bold text-text-primary">{scopedLogs.length.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-text-tertiary">Matching Records</p>
                </CardContent>
              </Card>
              <Card className="border-border-light">
                <CardContent className="p-4 text-center">
                  <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold text-text-primary">{selectedBranch ? "1" : branchStats.length.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-text-tertiary">Branches</p>
                </CardContent>
              </Card>
              <Card className="border-border-light">
                <CardContent className="p-4 text-center">
                  <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold text-text-primary">{userStats.length.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-text-tertiary">Sales Users</p>
                </CardContent>
              </Card>
              <Card className="border-border-light">
                <CardContent className="p-4 text-center">
                  <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <IndianRupee className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-bold text-text-primary">
                    {kind === "collected" ? formatCurrency(totalAmount) : "—"}
                  </p>
                  <p className="text-[10px] text-text-tertiary">{kind === "collected" ? "Collected Amount" : "Amount"}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-border-light">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold text-text-primary">Branch-wise Classification</h2>
                  </div>
                  {branchStats.length === 0 ? (
                    <p className="text-sm text-text-tertiary">No branch data found.</p>
                  ) : (
                    <div className="space-y-2">
                      {branchStats.map((stat) => (
                        <button
                          key={stat.label}
                          type="button"
                          onClick={() => updateSelectedBranch(stat.label)}
                          className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
                            selectedBranch === stat.label
                              ? "border-primary/40 bg-primary/5"
                              : "border-border-light bg-surface-alt/40 hover:border-primary/25 hover:bg-primary/5"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-text-primary">{stat.label}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-text-primary">{stat.count}</p>
                              <ChevronRight className="h-4 w-4 text-text-tertiary" />
                            </div>
                          </div>
                          {kind === "collected" && stat.amount > 0 && (
                            <p className="mt-1 text-[11px] font-medium text-emerald-700">{formatCurrency(stat.amount)}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border-light">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-violet-600" />
                    <h2 className="text-sm font-semibold text-text-primary">Sales User-wise Classification</h2>
                  </div>
                  {userStats.length === 0 ? (
                    <p className="text-sm text-text-tertiary">No sales-user data found.</p>
                  ) : (
                    <div className="space-y-2">
                      {userStats.map((stat) => (
                        <div key={stat.label} className="rounded-lg border border-border-light bg-surface-alt/40 px-3 py-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-text-primary">{toDisplayUser(stat.label)}</p>
                            <p className="text-sm font-bold text-text-primary">{stat.count}</p>
                          </div>
                          {kind === "collected" && stat.amount > 0 && (
                            <p className="mt-1 text-[11px] font-medium text-emerald-700">{formatCurrency(stat.amount)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-border-light">
              <CardContent className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Phone className="h-4 w-4 text-text-secondary" />
                    <h2 className="text-sm font-semibold text-text-primary">Student Details</h2>
                    <span className="inline-flex items-center rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-medium text-primary">
                      {filteredLogs.length}
                    </span>
                    {selectedBranch && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
                        <Filter className="h-3 w-3" />
                        {selectedBranch}
                        <button
                          type="button"
                          onClick={() => updateSelectedBranch("")}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-primary/10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>
                  <input
                    type="search"
                    placeholder="Search student, branch, user…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40 sm:w-64"
                  />
                </div>

                {filteredLogs.length === 0 ? (
                  <p className="py-8 text-center text-sm text-text-tertiary">
                    {selectedBranch
                      ? `No matching student records found for ${selectedBranch}.`
                      : "No matching student records found."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredLogs.map((log) => {
                      const sc = getStatusColor(log.call_status);
                      return (
                        <div key={log.name} className="rounded-lg border border-border-light bg-surface-alt/30 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-text-primary">{log.student_name}</p>
                                <span className="text-[10px] font-mono text-text-tertiary">{log.student}</span>
                                <span className="inline-flex items-center rounded-full border border-border-light bg-surface px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                                  {log.branch}
                                </span>
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sc.bg} ${sc.text} ${sc.border}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                                  {log.call_status}
                                </span>
                                <span className="text-[10px] text-text-tertiary">{formatDateTime(log.call_date)}</span>
                                <span className="text-[10px] text-text-secondary">by {toDisplayUser(log.called_by)}</span>
                              </div>
                              {log.remarks && (
                                <p className="mt-2 text-xs text-text-secondary">{log.remarks}</p>
                              )}
                            </div>
                            <div className="shrink-0 text-right">
                              {kind === "collected" ? (
                                <>
                                  <p className="text-sm font-bold text-emerald-700">
                                    {formatCurrency(log.amount_received ?? 0)}
                                  </p>
                                  <p className="text-[10px] text-text-tertiary">{log.payment_mode || "Payment received"}</p>
                                </>
                              ) : (
                                <p className="text-[10px] font-medium text-amber-700">Committed</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default function FeeFollowUpDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <DetailInner />
    </Suspense>
  );
}


