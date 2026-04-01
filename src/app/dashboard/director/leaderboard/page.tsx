"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  Medal,
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
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import {
  getLeaderboardData,
  type LeaderboardBranch,
} from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

/* ── Constants ── */

type Period = "month" | "quarter" | "year" | "all";
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

const pct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : 0;

/* ── Rank badge ── */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-100 text-yellow-700 font-bold text-sm">
        🥇
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold text-sm">
        🥈
      </span>
    );
  if (rank === 3)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-600 font-bold text-sm">
        🥉
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-border-light text-text-secondary font-semibold text-xs">
      {rank}
    </span>
  );
}

/* ── Champion card ── */
function ChampionCard({
  title,
  icon: Icon,
  branch,
  value,
  color,
}: {
  title: string;
  icon: React.ElementType;
  branch: string;
  value: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border border-border-light bg-surface p-4 flex flex-col gap-2 min-w-[180px]`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg ${color}/10 flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <span className="text-xs font-medium text-text-secondary">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-yellow-500" />
        <span className="text-sm font-bold text-text-primary">{branch}</span>
      </div>
      <span className={`text-lg font-bold ${color}`}>{value}</span>
    </motion.div>
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
  const [sortKey, setSortKey] = useState<SortKey>("collectionRate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data, isLoading, error } = useQuery({
    queryKey: ["director-leaderboard", period],
    queryFn: () => getLeaderboardData(period),
    staleTime: 120_000,
  });

  const branches = data?.data ?? [];

  // Sort
  const sorted = useMemo(() => {
    const copy = [...branches];
    copy.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      // Lower overdue is better → flip for "natural" sorting
      if (sortKey === "overdueAmount" || sortKey === "pendingFees") {
        return sortDir === "desc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
    return copy;
  }, [branches, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  // Champions
  const bestCollection = branches.length
    ? branches.reduce((best, b) => (b.collectionRate > best.collectionRate ? b : best))
    : null;
  const mostAdmissions = branches.length
    ? branches.reduce((best, b) => (b.newAdmissions > best.newAdmissions ? b : best))
    : null;
  const lowestOverdue = branches.length
    ? branches.reduce((best, b) => (b.overdueAmount < best.overdueAmount ? b : best))
    : null;

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
      {
        activeStudents: 0,
        newAdmissions: 0,
        totalBilled: 0,
        totalCollected: 0,
        pendingFees: 0,
        overdueAmount: 0,
      },
    );
  }, [branches]);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <BreadcrumbNav />
          <h1 className="text-xl font-bold text-text-primary mt-1 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Branch Leaderboard
          </h1>
        </div>

        {/* Period filter */}
        <div className="flex gap-1 bg-app-bg border border-border-light rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                period === p.value
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-text-secondary">Loading branch data…</span>
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
          {/* ── Champion Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {bestCollection && (
              <ChampionCard
                title="Best Collection Rate"
                icon={TrendingUp}
                branch={bestCollection.branchShort}
                value={`${bestCollection.collectionRate}%`}
                color="text-success"
              />
            )}
            {mostAdmissions && (
              <ChampionCard
                title={period === "all" ? "Most Students" : "Most Admissions"}
                icon={UserPlus}
                branch={mostAdmissions.branchShort}
                value={String(mostAdmissions.newAdmissions)}
                color="text-primary"
              />
            )}
            {lowestOverdue && (
              <ChampionCard
                title="Lowest Overdue"
                icon={AlertTriangle}
                branch={lowestOverdue.branchShort}
                value={formatCurrency(lowestOverdue.overdueAmount)}
                color="text-warning"
              />
            )}
          </div>

          {/* ── Ranking Table ── */}
          <div className="rounded-xl border border-border-light bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-app-bg border-b border-border-light">
                    <th className="px-3 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider w-12 text-center">
                      #
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Branch
                    </th>
                    <SortHeader
                      label="Students"
                      sortKey="activeStudents"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                      className="text-right"
                    />
                    <SortHeader
                      label={period === "all" ? "Total" : "New Adm."}
                      sortKey="newAdmissions"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                      className="text-right"
                    />
                    <SortHeader
                      label="Collected"
                      sortKey="totalCollected"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                      className="text-right"
                    />
                    <SortHeader
                      label="Collect %"
                      sortKey="collectionRate"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                      className="text-right"
                    />
                    <SortHeader
                      label="Pending"
                      sortKey="pendingFees"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                      className="text-right"
                    />
                    <SortHeader
                      label="Overdue"
                      sortKey="overdueAmount"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                      className="text-right"
                    />
                    <th className="px-3 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">
                      Batches
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">
                      Staff
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {sorted.map((b, idx) => {
                    const rank = idx + 1;
                    return (
                      <motion.tr
                        key={b.branch}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.04 }}
                        className="hover:bg-brand-wash/30 transition-colors"
                      >
                        <td className="px-3 py-3 text-center">
                          <RankBadge rank={rank} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-semibold text-text-primary">
                              {b.branchShort}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-medium text-text-primary">
                          {b.activeStudents}
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-medium text-primary">
                          {b.newAdmissions}
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-medium text-success">
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
                        <td className="px-3 py-3 text-right text-sm text-text-secondary">
                          {b.batchCount}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-text-secondary">
                          {b.staffCount}
                        </td>
                      </motion.tr>
                    );
                  })}

                  {/* Totals row */}
                  <tr className="bg-app-bg border-t-2 border-border-light font-semibold">
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3 text-sm text-text-primary">Total</td>
                    <td className="px-3 py-3 text-right text-sm text-text-primary">
                      {totals.activeStudents}
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-primary">
                      {totals.newAdmissions}
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-success">
                      {formatCurrency(totals.totalCollected)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                        {pct(totals.totalCollected, totals.totalCollected + totals.pendingFees)}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-error">
                      {formatCurrency(totals.pendingFees)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-orange-600">
                      {formatCurrency(totals.overdueAmount)}
                    </td>
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Collection Progress Bars ── */}
          <div className="rounded-xl border border-border-light bg-surface p-4 space-y-4">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Collection Overview
            </h2>
            <div className="space-y-3">
              {sorted.map((b, idx) => {
                const barPct = pct(b.totalCollected, b.totalBilled);
                return (
                  <div key={b.branch} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-text-secondary w-28 truncate">
                      {b.branchShort}
                    </span>
                    <div className="flex-1 h-5 rounded-full bg-border-light overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barPct}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.05, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
                      />
                      {barPct > 15 && (
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white mix-blend-difference">
                          {barPct}%
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-text-tertiary w-36 text-right tabular-nums">
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
