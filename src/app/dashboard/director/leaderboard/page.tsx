"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  Users,
  UserPlus,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Crown,
  Target,
  Zap,
  Star,
  Flame,
  Sparkles,
  Medal,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import {
  getLeaderboardData,
  type LeaderboardBranch,
} from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

/* ── Types ── */

type Period = "month" | "quarter" | "year" | "all";
type PerfType = "overall" | "collection" | "admissions" | "fees";

const PERIODS: { value: Period; label: string; emoji: string }[] = [
  { value: "month", label: "This Month", emoji: "📅" },
  { value: "quarter", label: "Quarter", emoji: "📊" },
  { value: "year", label: "This FY", emoji: "📆" },
  { value: "all", label: "All Time", emoji: "🏛️" },
];

const PERF_TYPES: { value: PerfType; label: string; icon: React.ElementType; gradient: string }[] = [
  { value: "overall", label: "Overall", icon: Crown, gradient: "from-violet-500 to-purple-600" },
  { value: "collection", label: "Collection", icon: TrendingUp, gradient: "from-emerald-500 to-teal-600" },
  { value: "admissions", label: "Admissions", icon: UserPlus, gradient: "from-blue-500 to-indigo-600" },
  { value: "fees", label: "Revenue", icon: IndianRupee, gradient: "from-amber-500 to-orange-600" },
];

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

/* ── Animated counter ── */
function AnimNum({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {prefix}{value.toLocaleString("en-IN")}{suffix}
    </motion.span>
  );
}

/* ── Winner card (top 3) ── */
const WINNER_STYLES = [
  {
    border: "border-yellow-400/50",
    bg: "bg-gradient-to-br from-yellow-400/10 via-amber-500/5 to-transparent",
    badge: "bg-gradient-to-r from-yellow-400 to-amber-500",
    ring: "#eab308",
    icon: Crown,
    label: "Champion",
    glow: "shadow-[0_0_30px_rgba(234,179,8,0.15)]",
  },
  {
    border: "border-slate-400/40",
    bg: "bg-gradient-to-br from-slate-300/10 via-slate-400/5 to-transparent",
    badge: "bg-gradient-to-r from-slate-300 to-slate-500",
    ring: "#94a3b8",
    icon: Medal,
    label: "Runner Up",
    glow: "shadow-[0_0_20px_rgba(148,163,184,0.1)]",
  },
  {
    border: "bg-gradient-to-br from-orange-400/10 via-amber-500/5 to-transparent",
    bg: "bg-gradient-to-br from-orange-400/10 via-amber-500/5 to-transparent",
    badge: "bg-gradient-to-r from-orange-400 to-amber-600",
    ring: "#f97316",
    icon: Star,
    label: "3rd Place",
    glow: "shadow-[0_0_20px_rgba(249,115,22,0.1)]",
  },
];

function WinnerCard({
  branch,
  rank,
  perfType,
  delay,
}: {
  branch: LeaderboardBranch;
  rank: number;
  perfType: PerfType;
  delay: number;
}) {
  const s = WINNER_STYLES[rank - 1];
  const Icon = s.icon;

  const mainValue =
    perfType === "admissions" ? `${branch.newAdmissions} students`
    : perfType === "fees" ? formatCurrency(branch.totalCollected)
    : `${branch.collectionRate}%`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, type: "spring", stiffness: 100 }}
      whileHover={{ y: -6, scale: 1.02 }}
      className={`relative rounded-2xl border ${s.border} ${s.bg} p-5 ${s.glow} transition-shadow cursor-default overflow-hidden`}
    >
      {/* Decorative sparkle */}
      {rank === 1 && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-yellow-300/20 to-transparent rounded-full blur-xl"
        />
      )}

      {/* Rank badge */}
      <div className="flex items-center justify-between mb-4">
        <div className={`${s.badge} text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5`}>
          <Icon className="h-3 w-3" />
          {s.label}
        </div>
      </div>

      {/* Branch name */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-10 h-10 rounded-xl ${s.badge} flex items-center justify-center text-white font-black text-lg shadow-md`}>
          {rank}
        </div>
        <div>
          <h3 className="text-base font-extrabold text-text-primary">{branch.branchShort}</h3>
          <p className="text-[11px] text-text-tertiary">{mainValue}</p>
        </div>
      </div>

      {/* Stats mini-grid */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="bg-surface/80 rounded-lg p-2 text-center">
          <p className="text-[10px] text-text-tertiary">Students</p>
          <p className="text-sm font-bold text-text-primary">{branch.activeStudents}</p>
        </div>
        <div className="bg-surface/80 rounded-lg p-2 text-center">
          <p className="text-[10px] text-text-tertiary">Collected</p>
          <p className="text-sm font-bold text-success">{formatCurrency(branch.totalCollected)}</p>
        </div>
        <div className="bg-surface/80 rounded-lg p-2 text-center">
          <p className="text-[10px] text-text-tertiary">Rate</p>
          <p className="text-sm font-bold text-primary">{branch.collectionRate}%</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Sort header ── */
type SortKey =
  | "activeStudents"
  | "newAdmissions"
  | "totalCollected"
  | "collectionRate"
  | "pendingFees"
  | "overdueAmount"
  | "batchCount"
  | "staffCount";

function SortHeader({
  label,
  sortKey,
  activeSortKey,
  sortDir,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === activeSortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-3 py-3 text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none transition-colors whitespace-nowrap ${
        active ? "text-primary" : "text-text-tertiary hover:text-text-secondary"
      } ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  );
}

/* ── Stat pill ── */
function StatPill({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2.5 bg-surface rounded-xl border border-border-light p-3`}
    >
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-[10px] text-text-tertiary uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold text-text-primary">{value}</p>
      </div>
    </motion.div>
  );
}

/* ═══ MAIN PAGE ═══ */

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("all");
  const [perfType, setPerfType] = useState<PerfType>("overall");
  const [sortKey, setSortKey] = useState<SortKey>("collectionRate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["director-leaderboard", period],
    queryFn: () => getLeaderboardData(period),
    staleTime: 120_000,
  });

  const branches = data?.data ?? [];

  const ranked = useMemo(() => {
    const arr = [...branches];
    if (perfType === "admissions") arr.sort((a, b) => b.newAdmissions - a.newAdmissions);
    else if (perfType === "fees") arr.sort((a, b) => b.totalCollected - a.totalCollected);
    else arr.sort((a, b) => b.collectionRate - a.collectionRate);
    return arr;
  }, [branches, perfType]);

  // Table-sorted version (sortable by any column)
  const tableSorted = useMemo(() => {
    const arr = [...ranked];
    arr.sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [ranked, sortKey, sortDir]);

  const top3 = ranked.slice(0, 3);

  // Totals
  const totals = useMemo(() => branches.reduce(
    (acc, b) => ({
      students: acc.students + b.activeStudents,
      admissions: acc.admissions + b.newAdmissions,
      collected: acc.collected + b.totalCollected,
      pending: acc.pending + b.pendingFees,
      overdue: acc.overdue + b.overdueAmount,
      billed: acc.billed + b.totalBilled,
    }),
    { students: 0, admissions: 0, collected: 0, pending: 0, overdue: 0, billed: 0 },
  ), [branches]);

  const activePerf = PERF_TYPES.find((p) => p.value === perfType)!;

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BreadcrumbNav />
          <div className="flex items-center gap-3 mt-1">
            <motion.div
              animate={{ rotate: [0, -8, 8, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >
              <Trophy className="h-7 w-7 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
            </motion.div>
            <h1 className="text-2xl font-black text-text-primary tracking-tight">
              Branch Leaderboard
            </h1>
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"
            >
              ● LIVE
            </motion.span>
          </div>
        </div>

        {/* Period pills */}
        <div className="flex gap-1.5 bg-app-bg/80 backdrop-blur border border-border-light rounded-2xl p-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                period === p.value
                  ? "bg-white dark:bg-surface text-text-primary shadow-md"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              <span className="mr-1">{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Performance Type Selector ── */}
      <div className="grid grid-cols-4 gap-2">
        {PERF_TYPES.map((pt) => {
          const active = perfType === pt.value;
          const Icon = pt.icon;
          return (
            <motion.button
              key={pt.value}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setPerfType(pt.value)}
              className={`relative rounded-2xl p-3 text-center transition-all overflow-hidden ${
                active
                  ? `bg-gradient-to-br ${pt.gradient} text-white shadow-lg`
                  : "bg-surface border border-border-light text-text-secondary hover:border-primary/30 hover:bg-brand-wash/20"
              }`}
            >
              <div className="flex flex-col items-center gap-1.5">
                <Icon className={`h-5 w-5 ${active ? "text-white" : ""}`} />
                <span className="text-xs font-bold">{pt.label}</span>
              </div>
              {active && (
                <motion.div
                  layoutId="perfGlow"
                  className="absolute inset-0 bg-white/10 rounded-2xl"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          >
            <Sparkles className="h-10 w-10 text-primary" />
          </motion.div>
          <p className="text-sm text-text-secondary font-medium">Crunching the numbers…</p>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error instanceof Error ? error.message : "Failed to load leaderboard"}
        </div>
      )}

      {!isLoading && !error && branches.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={perfType}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* ── Summary Stats ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <StatPill icon={Users} label="Total Students" value={totals.students.toLocaleString("en-IN")} color="bg-primary" />
              <StatPill icon={UserPlus} label={period === "all" ? "Total Enrolled" : "New Admissions"} value={totals.admissions.toLocaleString("en-IN")} color="bg-blue-500" />
              <StatPill icon={IndianRupee} label="Collected" value={formatCurrency(totals.collected)} color="bg-emerald-500" />
              <StatPill icon={AlertTriangle} label="Pending" value={formatCurrency(totals.pending)} color="bg-red-500" />
              <StatPill icon={Target} label="Collection Rate" value={`${pct(totals.collected, totals.collected + totals.pending)}%`} color={`bg-gradient-to-r ${activePerf.gradient}`} />
            </div>

            {/* ── Podium / Top 3 ── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Flame className="h-4 w-4 text-orange-500" />
                <h2 className="text-sm font-bold text-text-primary">Top Performers</h2>
                <span className="text-[10px] text-text-tertiary bg-app-bg border border-border-light px-2 py-0.5 rounded-full">
                  Ranked by {activePerf.label}
                </span>
              </div>
              <div className={`grid gap-3 ${top3.length === 3 ? "grid-cols-1 sm:grid-cols-3" : top3.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 max-w-md"}`}>
                {top3.map((b, i) => (
                  <WinnerCard
                    key={b.branch}
                    branch={b}
                    rank={i + 1}
                    perfType={perfType}
                    delay={i * 0.15}
                  />
                ))}
              </div>
            </div>

            {/* ── Full Ranking Table ── */}
            <div className="rounded-2xl border border-border-light bg-surface overflow-hidden">
              <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                <Medal className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-text-primary">Full Rankings</h2>
                <span className="text-[10px] text-text-tertiary bg-app-bg border border-border-light px-2 py-0.5 rounded-full">
                  {tableSorted.length} branches
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-border-light bg-app-bg/50">
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-text-tertiary text-left w-10">#</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-text-tertiary text-left">Branch</th>
                      <SortHeader label="Students" sortKey="activeStudents" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                      <SortHeader label="Admissions" sortKey="newAdmissions" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                      <SortHeader label="Collected" sortKey="totalCollected" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                      <SortHeader label="Collect %" sortKey="collectionRate" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                      <SortHeader label="Pending" sortKey="pendingFees" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                      <SortHeader label="Overdue" sortKey="overdueAmount" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                      <SortHeader label="Batches" sortKey="batchCount" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                      <SortHeader label="Staff" sortKey="staffCount" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                    </tr>
                  </thead>
                  <tbody>
                    {tableSorted.map((b, idx) => {
                      const rank = ranked.indexOf(b) + 1;
                      const isTop3 = rank <= 3;
                      return (
                        <motion.tr
                          key={b.branch}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className={`border-b border-border-light/60 transition-colors ${
                            isTop3
                              ? "bg-yellow-500/[0.03] hover:bg-yellow-500/[0.07]"
                              : "hover:bg-brand-wash/20"
                          }`}
                        >
                          <td className="px-3 py-3 text-center">
                            <span className={`text-xs font-bold tabular-nums ${
                              rank === 1 ? "text-yellow-500" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-orange-500" : "text-text-tertiary"
                            }`}>
                              {rank}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              {isTop3 && (
                                <span className={`text-xs ${
                                  rank === 1 ? "text-yellow-500" : rank === 2 ? "text-slate-400" : "text-orange-500"
                                }`}>
                                  {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                                </span>
                              )}
                              <span className="text-sm font-bold text-text-primary">{b.branchShort}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right text-sm font-semibold text-text-primary tabular-nums">{b.activeStudents}</td>
                          <td className="px-3 py-3 text-right text-sm font-semibold text-blue-500 tabular-nums">{b.newAdmissions}</td>
                          <td className="px-3 py-3 text-right text-sm font-semibold text-success tabular-nums">{formatCurrency(b.totalCollected)}</td>
                          <td className="px-3 py-3 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              b.collectionRate >= 80 ? "bg-success/10 text-success"
                              : b.collectionRate >= 50 ? "bg-warning/10 text-warning"
                              : "bg-error/10 text-error"
                            }`}>
                              {b.collectionRate}%
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right text-sm font-semibold text-error tabular-nums">{formatCurrency(b.pendingFees)}</td>
                          <td className="px-3 py-3 text-right text-sm font-semibold text-orange-500 tabular-nums">{formatCurrency(b.overdueAmount)}</td>
                          <td className="px-3 py-3 text-right text-sm font-semibold text-text-primary tabular-nums">{b.batchCount}</td>
                          <td className="px-3 py-3 text-right text-sm font-semibold text-text-primary tabular-nums">{b.staffCount}</td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                  {/* Totals row */}
                  <tfoot>
                    <tr className="bg-app-bg/80 border-t-2 border-border-light">
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3 text-xs font-black uppercase text-text-secondary">Totals</td>
                      <td className="px-3 py-3 text-right text-sm font-black text-text-primary tabular-nums">{totals.students}</td>
                      <td className="px-3 py-3 text-right text-sm font-black text-blue-500 tabular-nums">{totals.admissions}</td>
                      <td className="px-3 py-3 text-right text-sm font-black text-success tabular-nums">{formatCurrency(totals.collected)}</td>
                      <td className="px-3 py-3 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-primary/10 text-primary">
                          {pct(totals.collected, totals.collected + totals.pending)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-black text-error tabular-nums">{formatCurrency(totals.pending)}</td>
                      <td className="px-3 py-3 text-right text-sm font-black text-orange-500 tabular-nums">{formatCurrency(totals.overdue)}</td>
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ── Collection Race ── */}
            <div className="rounded-2xl border border-border-light bg-surface p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-4 w-4 text-yellow-500" />
                <h2 className="text-sm font-bold text-text-primary">Collection Race</h2>
              </div>
              <div className="space-y-3">
                {ranked.map((b, idx) => {
                  const barPct = pct(b.totalCollected, b.totalBilled);
                  const barColor =
                    idx === 0 ? "from-yellow-400 to-amber-500"
                    : idx === 1 ? "from-slate-400 to-slate-500"
                    : idx === 2 ? "from-orange-400 to-amber-500"
                    : "from-primary to-emerald-400";

                  return (
                    <motion.div
                      key={b.branch}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-3 group"
                    >
                      {/* Rank number */}
                      <span className={`text-xs font-black w-5 text-right tabular-nums ${
                        idx < 3 ? "text-yellow-600" : "text-text-tertiary"
                      }`}>
                        {idx + 1}
                      </span>

                      {/* Branch name */}
                      <span className="text-xs font-semibold text-text-secondary w-28 truncate">
                        {b.branchShort}
                      </span>

                      {/* Bar */}
                      <div className="flex-1 h-7 rounded-lg bg-app-bg overflow-hidden relative border border-border-light group-hover:border-primary/20 transition-colors">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(barPct, 2)}%` }}
                          transition={{ duration: 1, delay: idx * 0.06, ease: "easeOut" }}
                          className={`h-full rounded-lg bg-gradient-to-r ${barColor} relative`}
                        >
                          {barPct > 20 && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-white">
                              {barPct}%
                            </span>
                          )}
                        </motion.div>
                        {barPct <= 20 && (
                          <span className="absolute left-[calc(max(2%,20px)+8px)] top-1/2 -translate-y-1/2 text-[11px] font-bold text-text-secondary">
                            {barPct}%
                          </span>
                        )}
                      </div>

                      {/* Amount */}
                      <span className="text-xs font-medium text-text-tertiary w-44 text-right tabular-nums">
                        {formatCurrency(b.totalCollected)} / {formatCurrency(b.totalBilled)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
