"use client";

import React, { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Phone,
  PhoneOff,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { getStatusColor } from "@/lib/api/followup";

// -- Types -------------------------------------------------------------------
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

interface UserStat {
  user: string;
  displayName: string;
  branch: string;
  called: number;
  answered: number;
  promised: number;
  converted: number;
  collectedAmt: number;
  noAnswer: number;
  logs: LogEntry[];
}

interface BranchStat {
  branch: string;
  called: number;
  answered: number;
  busy: number;
  noAnswer: number;
  promised: number;
  converted: number;
  collectedAmt: number;
}

// -- Helpers -----------------------------------------------------------------
function isoNow() {
  return new Date().toISOString().slice(0, 10);
}

function getMondayOfWeek(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon, ...6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function formatDateShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function formatTime(str: string) {
  if (!str) return "";
  return new Date(str.replace(" ", "T")).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateFull(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function buildUserStats(logs: LogEntry[]): UserStat[] {
  const map = new Map<string, UserStat>();

  for (const l of logs) {
    if (!map.has(l.called_by)) {
      map.set(l.called_by, {
        user: l.called_by,
        displayName: l.called_by.includes("@")
          ? l.called_by.split("@")[0]
          : l.called_by,
        branch: l.branch,
        called: 0,
        answered: 0,
        promised: 0,
        converted: 0,
        collectedAmt: 0,
        noAnswer: 0,
        logs: [],
      });
    }
    const s = map.get(l.called_by)!;
    s.called++;
    s.logs.push(l);

    const status = l.call_status;
    if (
      [
        "Called – Answered",
        "Promised to Pay",
        "Will Pay This Week",
        "Already Paid",
      ].includes(status)
    )
      s.answered++;
    if (["Promised to Pay", "Will Pay This Week"].includes(status))
      s.promised++;
    if (["Called – No Answer", "Called – Busy"].includes(status)) s.noAnswer++;
    if (l.payment_received || status === "Already Paid") {
      s.converted++;
      s.collectedAmt += l.amount_received ?? 0;
    }
    if (l.branch) s.branch = l.branch;
  }

  return Array.from(map.values()).sort((a, b) => b.called - a.called);
}

function buildBranchStats(logs: LogEntry[]): BranchStat[] {
  const map = new Map<string, BranchStat>();
  for (const l of logs) {
    const br = l.branch || "Unknown";
    if (!map.has(br)) {
      map.set(br, {
        branch: br,
        called: 0,
        answered: 0,
        busy: 0,
        noAnswer: 0,
        promised: 0,
        converted: 0,
        collectedAmt: 0,
      });
    }
    const s = map.get(br)!;
    s.called++;
    const st = l.call_status;
    if (
      ["Called – Answered", "Promised to Pay", "Will Pay This Week", "Already Paid"].includes(st)
    )
      s.answered++;
    if (st === "Called – Busy") s.busy++;
    if (st === "Called – No Answer") s.noAnswer++;
    if (["Promised to Pay", "Will Pay This Week"].includes(st)) s.promised++;
    if (l.payment_received || st === "Already Paid") {
      s.converted++;
      s.collectedAmt += l.amount_received ?? 0;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.called - a.called);
}

// -- Row variant -------------------------------------------------------------
const rowIn = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

// -- Individual call row -----------------------------------------------------
function CallDetail({ log }: { log: LogEntry }) {
  const sc = getStatusColor(log.call_status);
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border-light/60 last:border-0">
      <div className="shrink-0 w-20 text-[9px] text-text-tertiary tabular-nums">
        <p>{formatDateFull(log.call_date.slice(0, 10))}</p>
        <p>{formatTime(log.call_date)}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text-primary truncate">
          {log.student_name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}
          >
            <span className={`w-1 h-1 rounded-full ${sc.dot}`} />
            {log.call_status}
          </span>
          {log.remarks && (
            <span className="text-[9px] text-text-tertiary line-clamp-1">
              {log.remarks}
            </span>
          )}
        </div>
      </div>
      {log.payment_received ? (
        <div className="shrink-0 text-right">
          <span className="text-[10px] font-bold text-emerald-700">
            {log.amount_received ? formatCurrency(log.amount_received) : "Paid"}
          </span>
        </div>
      ) : null}
    </div>
  );
}

// -- Branch breakdown row ---------------------------------------------------
function BranchRow({ bs }: { bs: BranchStat }) {
  return (
    <div className="py-2.5 border-b border-border-light/50 last:border-0">
      <p className="text-xs font-semibold text-text-primary truncate mb-1">
        {bs.branch}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-primary-light text-primary">
          <Phone className="h-2.5 w-2.5" /> {bs.called} Called
        </span>
        {bs.answered > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-teal-50 text-teal-700">
            <CheckCircle2 className="h-2.5 w-2.5" /> {bs.answered} Answered
          </span>
        )}
        {bs.promised > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700">
            <Clock className="h-2.5 w-2.5" /> {bs.promised} Promised
          </span>
        )}
        {bs.noAnswer > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500">
            <PhoneOff className="h-2.5 w-2.5" /> {bs.noAnswer} No Answer
          </span>
        )}
        {bs.busy > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-orange-50 text-orange-600">
            <PhoneOff className="h-2.5 w-2.5" /> {bs.busy} Busy
          </span>
        )}
        {bs.converted > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-2.5 w-2.5" /> {bs.converted} Paid
            {bs.collectedAmt > 0 ? ` · ${formatCurrency(bs.collectedAmt)}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}

// -- User card ----------------------------------------------------------------
function UserCard({ stat, index }: { stat: UserStat; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const branchStats = useMemo(() => buildBranchStats(stat.logs), [stat.logs]);
  const answerRate =
    stat.called > 0 ? Math.round((stat.answered / stat.called) * 100) : 0;
  const conversionRate =
    stat.called > 0 ? Math.round((stat.converted / stat.called) * 100) : 0;

  return (
    <motion.div
      variants={rowIn}
      transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
      className="rounded-xl border border-border-light bg-surface overflow-hidden shadow-card"
    >
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-surface-alt/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-violet-600 uppercase">
            {stat.displayName.charAt(0)}
          </span>
        </div>

        {/* Name + branch */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-text-primary truncate">
            {stat.displayName}
          </p>
          <p className="text-[10px] text-text-tertiary truncate">{stat.branch}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-center">
            <p className="text-base font-bold text-text-primary tabular-nums">
              {stat.called}
            </p>
            <p className="text-[9px] text-text-tertiary font-medium">Called</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-primary tabular-nums">
              {stat.answered}
            </p>
            <p className="text-[9px] text-text-tertiary font-medium">Answered</p>
          </div>
          <div className="text-center hidden sm:block">
            <p className="text-base font-bold text-blue-600 tabular-nums">
              {stat.promised}
            </p>
            <p className="text-[9px] text-text-tertiary font-medium">Promised</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-emerald-600 tabular-nums">
              {stat.converted}
            </p>
            <p className="text-[9px] text-text-tertiary font-medium">Paid</p>
          </div>
          {stat.collectedAmt > 0 && (
            <div className="text-center bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
              <p className="text-sm font-bold text-emerald-700 tabular-nums">
                {formatCurrency(stat.collectedAmt)}
              </p>
              <p className="text-[9px] text-emerald-600 font-semibold">Collected</p>
            </div>
          )}
        </div>

        {/* Chevron */}
        <div className="shrink-0 ml-1">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-text-tertiary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-tertiary" />
          )}
        </div>
      </div>

      {/* Progress bars */}
      <div className="px-4 pb-3 -mt-1">
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-[9px] text-text-tertiary">Answer rate</span>
              <span className="text-[9px] font-semibold text-primary">
                {answerRate}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-primary-light">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${answerRate}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-primary"
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-[9px] text-text-tertiary">Conversion</span>
              <span className="text-[9px] font-semibold text-emerald-600">
                {conversionRate}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-emerald-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${conversionRate}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                className="h-full rounded-full bg-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded: branch breakdown + all calls */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-border-light bg-surface-alt/30"
          >
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide mb-1">
                By Branch
              </p>
              {branchStats.map((bs) => (
                <BranchRow key={bs.branch} bs={bs} />
              ))}
            </div>
            <div className="px-4 pt-2 pb-3">
              <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide mb-2">
                All {stat.called} call{stat.called !== 1 ? "s" : ""} this week
              </p>
              {stat.logs
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.call_date).getTime() -
                    new Date(a.call_date).getTime()
                )
                .map((l) => (
                  <CallDetail key={l.name} log={l} />
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// -- Page --------------------------------------------------------------------
function WeekCallsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchParam = searchParams.get("branch") ?? "";

  const monday = getMondayOfWeek();
  const today = isoNow();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["week-calls", branchParam],
    queryFn: async () => {
      const params = new URLSearchParams({ from: monday, to: today });
      if (branchParam) params.set("branch", branchParam);
      const res = await fetch(`/api/director/fee-followup?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<{ logs: LogEntry[] }>;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const logs: LogEntry[] = data?.logs ?? [];
  const userStats = useMemo(() => buildUserStats(logs), [logs]);

  const totals = useMemo(
    () => ({
      called: logs.length,
      answered: userStats.reduce((s, u) => s + u.answered, 0),
      promised: userStats.reduce((s, u) => s + u.promised, 0),
      converted: userStats.reduce((s, u) => s + u.converted, 0),
      noAnswer: userStats.reduce((s, u) => s + u.noAnswer, 0),
      amount: userStats.reduce((s, u) => s + u.collectedAmt, 0),
    }),
    [logs, userStats]
  );

  const dateRangeLabel = `${formatDateShort(monday)} – ${formatDateShort(today)}`;

  return (
    <div className="min-h-screen pb-12 bg-app-bg">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 rounded-lg border border-border-light bg-surface flex items-center justify-center hover:bg-surface-alt transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4 text-text-secondary" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-text-primary flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-500" />
                This Week&rsquo;s Calls — User Summary
                {branchParam && (
                  <span className="text-xs font-normal text-text-tertiary">
                    · {branchParam}
                  </span>
                )}
              </h1>
              <p className="text-xs text-text-tertiary">{dateRangeLabel}</p>
            </div>
          </div>
        </motion.div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-text-tertiary">
              Loading this week&rsquo;s calls…
            </p>
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Failed to load data. Please try again.
          </div>
        )}

        {data && (
          <>
            {/* Summary totals */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            >
              {[
                {
                  label: "Total Calls",
                  value: totals.called,
                  color: "text-violet-700",
                  bg: "bg-violet-50",
                  border: "border-violet-200",
                  icon: <Phone className="h-3.5 w-3.5" />,
                  sub: null,
                },
                {
                  label: "Answered",
                  value: totals.answered,
                  color: "text-teal-700",
                  bg: "bg-teal-50",
                  border: "border-teal-200",
                  icon: <Phone className="h-3.5 w-3.5" />,
                  sub:
                    totals.called > 0
                      ? `${Math.round((totals.answered / totals.called) * 100)}% rate`
                      : null,
                },
                {
                  label: "Promised to Pay",
                  value: totals.promised,
                  color: "text-blue-700",
                  bg: "bg-blue-50",
                  border: "border-blue-200",
                  icon: <Clock className="h-3.5 w-3.5" />,
                  sub: null,
                },
                {
                  label: "Payments Collected",
                  value: totals.converted,
                  color: "text-emerald-700",
                  bg: "bg-emerald-50",
                  border: "border-emerald-200",
                  icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                  sub:
                    totals.amount > 0 ? formatCurrency(totals.amount) : null,
                },
                {
                  label: "No Answer / Busy",
                  value: totals.noAnswer,
                  color: "text-slate-600",
                  bg: "bg-slate-50",
                  border: "border-slate-200",
                  icon: <PhoneOff className="h-3.5 w-3.5" />,
                  sub: null,
                },
                {
                  label: "Revenue This Week",
                  value: totals.amount > 0 ? formatCurrency(totals.amount) : "₹0",
                  color: "text-emerald-700",
                  bg: "bg-emerald-50",
                  border: "border-emerald-300",
                  icon: <IndianRupee className="h-3.5 w-3.5" />,
                  sub: `${totals.converted} payment${totals.converted !== 1 ? "s" : ""}`,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`rounded-xl p-3 ${s.bg} border ${s.border} text-center`}
                >
                  <div className={`flex justify-center mb-1 ${s.color}`}>
                    {s.icon}
                  </div>
                  <p
                    className={`text-xl font-bold tabular-nums ${s.color}`}
                  >
                    {typeof s.value === "number" ? s.value : s.value}
                  </p>
                  <p className="text-[10px] text-text-tertiary font-medium">
                    {s.label}
                  </p>
                  {s.sub && (
                    <p className={`text-[9px] font-semibold ${s.color}`}>
                      {s.sub}
                    </p>
                  )}
                </div>
              ))}
            </motion.div>

            {/* User cards */}
            {userStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-text-tertiary">
                <PhoneOff className="h-8 w-8 opacity-30" />
                <p className="text-sm font-medium">No calls logged this week yet.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-text-tertiary">
                  <strong className="text-text-secondary">
                    {userStats.length}
                  </strong>{" "}
                  agent{userStats.length !== 1 ? "s" : ""} active this week —
                  tap a row to see their calls
                </p>
                <motion.div
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: { staggerChildren: 0.06 },
                    },
                  }}
                  initial="hidden"
                  animate="show"
                  className="space-y-3"
                >
                  {userStats.map((s, i) => (
                    <UserCard key={s.user} stat={s} index={i} />
                  ))}
                </motion.div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function WeekCallsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <WeekCallsInner />
    </Suspense>
  );
}
