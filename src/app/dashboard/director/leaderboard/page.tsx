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
  Loader2,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Layers,
  Crown,
  Target,
  Zap,
  Star,
  Flame,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import {
  getLeaderboardData,
  type LeaderboardBranch,
} from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

/* ── Constants ── */

type Period = "month" | "quarter" | "year" | "all";
type PerfType = "overall" | "collection" | "admissions" | "fees";
type SortKey =
  | "collectionRate"
  | "newAdmissions"
  | "activeStudents"
  | "totalCollected"
  | "pendingFees"
  | "overdueAmount";

const PERIODS: { value: Period; label: string }[] = [
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "This FY" },
  { value: "all", label: "All Time" },
];

const PERF_TYPES: { value: PerfType; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "overall", label: "Overall", icon: Crown, desc: "Weighted score across all metrics" },
  { value: "collection", label: "Collection", icon: TrendingUp, desc: "Fee collection rate ranking" },
  { value: "admissions", label: "Admissions", icon: UserPlus, desc: "New student enrolment ranking" },
  { value: "fees", label: "Revenue", icon: IndianRupee, desc: "Total revenue collected ranking" },
];

const pct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : 0;

/* ── Score calculator ── */
function computeScore(b: LeaderboardBranch, type: PerfType, maxAdm: number, maxCollected: number): number {
  if (type === "collection") return b.collectionRate;
  if (type === "admissions") return maxAdm > 0 ? Math.round((b.newAdmissions / maxAdm) * 100) : 0;
  if (type === "fees") return maxCollected > 0 ? Math.round((b.totalCollected / maxCollected) * 100) : 0;
  // overall: 40% collection rate + 30% admissions + 30% revenue
  const admScore = maxAdm > 0 ? (b.newAdmissions / maxAdm) * 100 : 0;
  const revScore = maxCollected > 0 ? (b.totalCollected / maxCollected) * 100 : 0;
  return Math.round(b.collectionRate * 0.4 + admScore * 0.3 + revScore * 0.3);
}

/* ── Podium step ── */
const PODIUM_COLORS = [
  { bg: "from-yellow-400 to-amber-500", ring: "ring-yellow-400/40", badge: "bg-yellow-400", text: "text-yellow-900", glow: "shadow-yellow-400/30" },
  { bg: "from-slate-300 to-slate-400", ring: "ring-slate-300/40", badge: "bg-slate-300", text: "text-slate-800", glow: "shadow-slate-300/30" },
  { bg: "from-orange-400 to-amber-600", ring: "ring-orange-400/40", badge: "bg-orange-400", text: "text-orange-900", glow: "shadow-orange-400/30" },
];

function PodiumCard({
  branch,
  rank,
  score,
  delay,
  perfType,
}: {
  branch: LeaderboardBranch;
  rank: number;
  score: number;
  delay: number;
  perfType: PerfType;
}) {
  const style = PODIUM_COLORS[rank - 1];
  const heights = ["h-40", "h-32", "h-28"];
  const icons = [Crown, Star, Zap];
  const Icon = icons[rank - 1];

  const mainValue =
    perfType === "collection" ? `${branch.collectionRate}%`
    : perfType === "admissions" ? `${branch.newAdmissions}`
    : perfType === "fees" ? formatCurrency(branch.totalCollected)
    : `${score}pts`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, type: "spring", stiffness: 120 }}
      className={`flex flex-col items-center ${rank === 1 ? "order-2" : rank === 2 ? "order-1" : "order-3"}`}
    >
      {/* Trophy icon */}
      <motion.div
        animate={{ rotate: [0, -5, 5, 0] }}
        transition={{ repeat: Infinity, duration: 3, delay: rank * 0.3 }}
      >
        <Icon className={`h-6 w-6 ${rank === 1 ? "text-yellow-400" : rank === 2 ? "text-slate-400" : "text-orange-400"} mb-2`} />
      </motion.div>

      {/* Name + Score */}
      <span className="text-sm font-bold text-text-primary mb-1">{branch.branchShort}</span>
      <span className={`text-lg font-extrabold bg-gradient-to-r ${style.bg} bg-clip-text text-transparent`}>
        {mainValue}
      </span>

      {/* Podium bar */}
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: "auto" }}
        transition={{ delay: delay + 0.2, duration: 0.6, type: "spring" }}
        className={`mt-2 w-24 ${heights[rank - 1]} rounded-t-xl bg-gradient-to-t ${style.bg} relative overflow-hidden shadow-lg ${style.glow}`}
      >
        <div className="absolute inset-0 bg-white/10 animate-pulse" style={{ animationDuration: "3s" }} />
        <div className="absolute inset-x-0 top-3 flex justify-center">
          <span className={`${style.badge} ${style.text} w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shadow`}>
            {rank}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-2 text-center">
          <span className="text-[10px] font-semibold text-white/90">{branch.activeStudents} students</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Score bar for table ── */
function ScoreBar({ score, rank }: { score: number; rank: number }) {
  const color =
    rank === 1 ? "from-yellow-400 to-amber-500"
    : rank === 2 ? "from-slate-300 to-slate-400"
    : rank === 3 ? "from-orange-400 to-amber-500"
    : "from-primary to-emerald-400";

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2.5 rounded-full bg-border-light overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
        />
      </div>
      <span className="text-xs font-bold text-text-primary tabular-nums w-8 text-right">{score}</span>
    </div>
  );
}

/* ── Rank badge ── */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <motion.span
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-white font-black text-sm shadow-md shadow-yellow-400/30"
      >
        1
      </motion.span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 text-white font-black text-sm shadow-md">
        2
      </span>
    );
  if (rank === 3)
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-amber-500 text-white font-black text-sm shadow-md">
        3
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-border-light text-text-secondary font-semibold text-xs">
      {rank}
    </span>
  );
}

/* ── Sort header ── */
function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = currentSort === sortKey;
  return (
    <th
      className={`px-3 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:text-primary transition-colors ${
        active ? "text-primary" : "text-text-secondary"
      } ${className ?? ""}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          currentDir === "desc" ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </th>
  );
}

/* ── Main page ── */

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("all");
  const [perfType, setPerfType] = useState<PerfType>("overall");
  const [sortKey, setSortKey] = useState<SortKey>("collectionRate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data, isLoading, error } = useQuery({
    queryKey: ["director-leaderboard", period],
    queryFn: () => getLeaderboardData(period),
    staleTime: 120_000,
  });

  const branches = data?.data ?? [];

  // Compute scores & ranked list
  const maxAdm = useMemo(() => Math.max(...branches.map((b) => b.newAdmissions), 1), [branches]);
  const maxCollected = useMemo(() => Math.max(...branches.map((b) => b.totalCollected), 1), [branches]);

  const ranked = useMemo(() => {
    const scored = branches.map((b) => ({
      ...b,
      score: computeScore(b, perfType, maxAdm, maxCollected),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }, [branches, perfType, maxAdm, maxCollected]);

  // Sort for table (may differ from performance ranking)
  const sorted = useMemo(() => {
    const copy = [...ranked];
    copy.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (sortKey === "overdueAmount" || sortKey === "pendingFees") {
        return sortDir === "desc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
    return copy;
  }, [ranked, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  // Totals
  const totals = useMemo(() => {
    return branches.reduce(
      (acc, b) => ({
        activeStudents: acc.activeStudents + b.activeStudents,
        newAdmissions: acc.newAdmissions + b.newAdmissions,
        totalBilled: acc.totalBilled + b.totalBilled,
        totalCollected: acc.totalCollected + b.totalCollected,
        pendingFees: acc.pendingFees + b.pendingFees,
        overdueAmount: acc.overdueAmount + b.overdueAmount,
      }),
      { activeStudents: 0, newAdmissions: 0, totalBilled: 0, totalCollected: 0, pendingFees: 0, overdueAmount: 0 },
    );
  }, [branches]);

  const top3 = ranked.slice(0, 3);

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <BreadcrumbNav />
          <h1 className="text-2xl font-extrabold text-text-primary mt-1 flex items-center gap-2">
            <motion.span animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}>
              <Trophy className="h-6 w-6 text-yellow-500" />
            </motion.span>
            Branch Leaderboard
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-xs font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full"
            >
              LIVE
            </motion.span>
          </h1>
        </div>

        {/* Period filter */}
        <div className="flex gap-1 bg-app-bg border border-border-light rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                period === p.value
                  ? "bg-gradient-to-r from-primary to-emerald-500 text-white shadow-md shadow-primary/25"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Performance Type Filter ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PERF_TYPES.map((pt) => {
          const active = perfType === pt.value;
          const Icon = pt.icon;
          return (
            <motion.button
              key={pt.value}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setPerfType(pt.value)}
              className={`relative rounded-xl border p-3 text-left transition-all overflow-hidden ${
                active
                  ? "border-primary bg-gradient-to-br from-primary/5 to-emerald-500/5 shadow-md shadow-primary/10"
                  : "border-border-light bg-surface hover:border-primary/30"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="perfActive"
                  className="absolute inset-0 rounded-xl border-2 border-primary"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className="relative flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? "bg-primary text-white" : "bg-border-light text-text-secondary"} transition-colors`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${active ? "text-primary" : "text-text-primary"}`}>{pt.label}</p>
                  <p className="text-[10px] text-text-tertiary">{pt.desc}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
            <Loader2 className="h-8 w-8 text-primary" />
          </motion.div>
          <span className="text-sm text-text-secondary">Crunching the numbers…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error instanceof Error ? error.message : "Failed to load leaderboard"}
        </div>
      )}

      {!isLoading && !error && branches.length > 0 && (
        <>
          {/* ── Podium ── */}
          <div className="rounded-2xl border border-border-light bg-gradient-to-b from-surface to-app-bg p-6 pt-8">
            <div className="flex items-end justify-center gap-4 sm:gap-8">
              {top3.length >= 2 && (
                <PodiumCard branch={top3[1]} rank={2} score={top3[1].score} delay={0.2} perfType={perfType} />
              )}
              {top3.length >= 1 && (
                <PodiumCard branch={top3[0]} rank={1} score={top3[0].score} delay={0} perfType={perfType} />
              )}
              {top3.length >= 3 && (
                <PodiumCard branch={top3[2]} rank={3} score={top3[2].score} delay={0.4} perfType={perfType} />
              )}
            </div>
          </div>

          {/* ── Ranking Table ── */}
          <div className="rounded-2xl border border-border-light bg-surface overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-border-light bg-gradient-to-r from-surface to-app-bg flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-bold text-text-primary">Full Rankings</span>
              <span className="text-xs text-text-tertiary ml-auto">{ranked.length} branches</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-app-bg/50 border-b border-border-light">
                    <th className="px-3 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider w-12 text-center">
                      #
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Branch
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Score
                    </th>
                    <SortHeader label="Students" sortKey="activeStudents" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                    <SortHeader label={period === "all" ? "Total" : "New Adm."} sortKey="newAdmissions" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                    <SortHeader label="Collected" sortKey="totalCollected" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                    <SortHeader label="Collect %" sortKey="collectionRate" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                    <SortHeader label="Pending" sortKey="pendingFees" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                    <SortHeader label="Overdue" sortKey="overdueAmount" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                    <th className="px-3 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Batches</th>
                    <th className="px-3 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  <AnimatePresence mode="popLayout">
                    {sorted.map((b, idx) => {
                      const rank = ranked.findIndex((r) => r.branch === b.branch) + 1;
                      return (
                        <motion.tr
                          key={b.branch}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: idx * 0.03 }}
                          className={`transition-colors ${
                            rank <= 3 ? "bg-yellow-500/[0.02] hover:bg-yellow-500/[0.05]" : "hover:bg-brand-wash/30"
                          }`}
                        >
                          <td className="px-3 py-3 text-center">
                            <RankBadge rank={rank} />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                rank === 1 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white"
                                : rank === 2 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white"
                                : rank === 3 ? "bg-gradient-to-br from-orange-300 to-amber-500 text-white"
                                : "bg-primary/10 text-primary"
                              }`}>
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="text-sm font-bold text-text-primary">{b.branchShort}</span>
                                {rank <= 3 && (
                                  <span className="ml-1.5 text-[10px] font-bold text-yellow-600 bg-yellow-400/20 px-1.5 py-0.5 rounded-full">
                                    TOP {rank}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <ScoreBar score={b.score} rank={rank} />
                          </td>
                          <td className="px-3 py-3 text-right text-sm font-medium text-text-primary">
                            {b.activeStudents}
                          </td>
                          <td className="px-3 py-3 text-right text-sm font-medium text-primary">
                            {b.newAdmissions}
                          </td>
                          <td className="px-3 py-3 text-right text-sm font-semibold text-success">
                            {formatCurrency(b.totalCollected)}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                b.collectionRate >= 80
                                  ? "bg-success/10 text-success"
                                  : b.collectionRate >= 50
                                  ? "bg-warning/10 text-warning"
                                  : "bg-error/10 text-error"
                              }`}
                            >
                              {b.collectionRate}%
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right text-sm font-medium text-error">
                            {formatCurrency(b.pendingFees)}
                          </td>
                          <td className="px-3 py-3 text-right text-sm font-medium text-orange-600">
                            {formatCurrency(b.overdueAmount)}
                          </td>
                          <td className="px-3 py-3 text-right text-sm text-text-secondary">{b.batchCount}</td>
                          <td className="px-3 py-3 text-right text-sm text-text-secondary">{b.staffCount}</td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>

                  {/* Totals row */}
                  <tr className="bg-app-bg border-t-2 border-border-light font-semibold">
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3 text-sm text-text-primary flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-primary" /> Total
                    </td>
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3 text-right text-sm text-text-primary">{totals.activeStudents}</td>
                    <td className="px-3 py-3 text-right text-sm text-primary">{totals.newAdmissions}</td>
                    <td className="px-3 py-3 text-right text-sm text-success">{formatCurrency(totals.totalCollected)}</td>
                    <td className="px-3 py-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                        {pct(totals.totalCollected, totals.totalCollected + totals.pendingFees)}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-error">{formatCurrency(totals.pendingFees)}</td>
                    <td className="px-3 py-3 text-right text-sm text-orange-600">{formatCurrency(totals.overdueAmount)}</td>
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Collection Progress Bars ── */}
          <div className="rounded-2xl border border-border-light bg-surface p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Collection Overview
            </h2>
            <div className="space-y-3">
              {ranked.map((b, idx) => {
                const barPct = pct(b.totalCollected, b.totalBilled);
                return (
                  <div key={b.branch} className="flex items-center gap-3 group">
                    <div className="flex items-center gap-2 w-32">
                      <span className={`text-xs font-bold w-5 text-right ${idx < 3 ? "text-yellow-600" : "text-text-tertiary"}`}>
                        {idx + 1}
                      </span>
                      <span className="text-xs font-medium text-text-secondary truncate">
                        {b.branchShort}
                      </span>
                    </div>
                    <div className="flex-1 h-6 rounded-full bg-border-light overflow-hidden relative group-hover:shadow-inner transition-shadow">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barPct}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.05, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          idx === 0
                            ? "bg-gradient-to-r from-yellow-400 to-amber-500"
                            : idx === 1
                            ? "bg-gradient-to-r from-slate-300 to-slate-500"
                            : idx === 2
                            ? "bg-gradient-to-r from-orange-400 to-amber-500"
                            : "bg-gradient-to-r from-primary to-emerald-400"
                        }`}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white mix-blend-difference">
                        {barPct}%
                      </span>
                    </div>
                    <span className="text-xs text-text-tertiary w-40 text-right tabular-nums">
                      {formatCurrency(b.totalCollected)} / {formatCurrency(b.totalBilled)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
