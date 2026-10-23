"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Target,
  UserPlus,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
  Sliders,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Info,
  Calendar,
  AlertCircle,
  Eye,
  Activity,
  Layers,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  getBranchMonitoringData,
  type BranchMonitoringResponse,
  type BranchMonitoringRow,
} from "@/lib/api/branchMonitoring";
import { SetBranchTargetModal } from "@/components/director/branch-monitoring/SetBranchTargetModal";
import { BranchDrilldownDrawer } from "@/components/director/branch-monitoring/BranchDrilldownDrawer";
import { formatCurrency } from "@/lib/utils/formatters";

// ── Helper to format month navigation ──
function getAdjacentMonthKey(monthKey: string, delta: number): string {
  const [yStr, mStr] = monthKey.split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function BranchMonitoringPage() {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"collection_pct" | "admission_pct" | "name" | "collection_amt">("collection_pct");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals state
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [targetModalBranch, setTargetModalBranch] = useState<string | null>(null);

  // Drilldown drawer state
  const [drilldownDrawerOpen, setDrilldownDrawerOpen] = useState(false);
  const [drilldownBranch, setDrilldownBranch] = useState<string>("");
  const [drilldownBranchShort, setDrilldownBranchShort] = useState<string>("");
  const [drilldownInitialTab, setDrilldownInitialTab] = useState<"admissions" | "collection">("admissions");

  // Query monthly targets data
  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<BranchMonitoringResponse>({
    queryKey: ["branch-monitoring-data", selectedMonth],
    queryFn: () => getBranchMonitoringData(selectedMonth),
    staleTime: 60_000,
  });

  const branches = data?.branches || [];
  const networkTotals = data?.network_totals;

  // Filter & sort branches
  const filteredBranches = useMemo(() => {
    let result = [...branches];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.branch.toLowerCase().includes(q) ||
          b.branch_short.toLowerCase().includes(q) ||
          b.abbr.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((b) => b.metrics.status === statusFilter);
    }

    result.sort((a, b) => {
      let comp = 0;
      if (sortBy === "collection_pct") {
        comp = a.metrics.collection_pct - b.metrics.collection_pct;
      } else if (sortBy === "admission_pct") {
        comp = a.metrics.admission_pct - b.metrics.admission_pct;
      } else if (sortBy === "collection_amt") {
        comp = a.actuals.collection - b.actuals.collection;
      } else if (sortBy === "name") {
        comp = a.branch_short.localeCompare(b.branch_short);
      }
      return sortOrder === "desc" ? -comp : comp;
    });

    return result;
  }, [branches, searchQuery, statusFilter, sortBy, sortOrder]);

  // Top performer & Needs attention
  const topBranch = useMemo(() => {
    if (!branches.length) return null;
    return [...branches].sort((a, b) => b.metrics.collection_pct - a.metrics.collection_pct)[0];
  }, [branches]);

  const criticalBranch = useMemo(() => {
    if (!branches.length) return null;
    return [...branches].sort((a, b) => a.metrics.collection_pct - b.metrics.collection_pct)[0];
  }, [branches]);

  // Open drilldown helper
  function openDrilldown(branchRow: BranchMonitoringRow, tab: "admissions" | "collection") {
    setDrilldownBranch(branchRow.branch);
    setDrilldownBranchShort(branchRow.branch_short);
    setDrilldownInitialTab(tab);
    setDrilldownDrawerOpen(true);
  }

  // Open target edit helper
  function openEditTarget(branchName?: string) {
    setTargetModalBranch(branchName || null);
    setIsTargetModalOpen(true);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <BreadcrumbNav />

      {/* ── Top Header & Executive Controls ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface via-surface to-primary/5 border border-border-light shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-violet-600 flex items-center justify-center text-white shadow-md shadow-primary/20">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-text-primary tracking-tight">
                Branch Monitoring
              </h1>
            </div>
          </div>

          {/* Month Controls & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month Stepper */}
            <div className="flex items-center bg-surface border border-border-light rounded-xl p-1 shadow-xs">
              <button
                onClick={() => setSelectedMonth((m) => getAdjacentMonthKey(m, -1))}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-app-bg transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="px-3 py-1 flex items-center gap-1.5 min-w-[140px] justify-center">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold text-text-primary">
                  {data?.month_label || selectedMonth}
                </span>
              </div>

              <button
                onClick={() => setSelectedMonth((m) => getAdjacentMonthKey(m, 1))}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-app-bg transition-colors"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {selectedMonth !== currentMonthKey && (
              <button
                onClick={() => setSelectedMonth(currentMonthKey)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-border-light bg-surface hover:bg-app-bg text-text-secondary transition-colors"
              >
                Current Month
              </button>
            )}

            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-2 rounded-xl border border-border-light bg-surface hover:bg-app-bg text-text-secondary transition-colors shadow-xs"
              title="Refresh Live Data"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin text-primary" : ""}`} />
            </button>

            <button
              onClick={() => openEditTarget()}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary/90 shadow-md transition-all active:scale-95"
            >
              <Sliders className="h-3.5 w-3.5" />
              Assign Targets
            </button>
          </div>
        </div>
      </div>

      {/* ── Time & Pacing Progress Bar ── */}
      <div className="rounded-xl border border-border-light bg-surface px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="font-semibold text-text-primary">
            {isLoading ? (
              <span className="inline-block w-48 h-3.5 bg-border-light rounded animate-pulse" />
            ) : data?.is_current_month ? (
              <>
                Day <span className="text-primary font-bold">{data.elapsed_days}</span> of{" "}
                {data.days_in_month} —{" "}
                <span className="text-text-tertiary">
                  {Math.round((data.elapsed_days / data.days_in_month) * 100)}% of month elapsed
                </span>
              </>
            ) : (
              <span>
                Past Month Summary — Full {data?.days_in_month || 30} days completed
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-4 text-text-tertiary">
          {data?.is_current_month && (
            <span>
              <strong className="text-text-primary font-bold">{data.remaining_days}</strong> days remaining to hit targets
            </span>
          )}
          <span className="hidden sm:inline bg-border-light w-px h-3" />
          <span>
            Active Offline Branches: <strong className="text-text-primary">{branches.length || 9}</strong>
          </span>
        </div>
      </div>

      {/* ── Network Summary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Collections vs Target */}
        <Card className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/5 via-surface to-surface shadow-sm overflow-hidden relative group hover:border-emerald-500/40 transition-all">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                <IndianRupee className="h-4 w-4" />
                Offline Collections
              </span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 tabular-nums">
                {isLoading ? "..." : `${networkTotals?.collection_pct || 0}%`}
              </span>
            </div>

            <div>
              <p className="text-2xl font-black text-text-primary tabular-nums tracking-tight">
                {isLoading ? (
                  <span className="inline-block w-32 h-7 bg-border-light rounded animate-pulse" />
                ) : (
                  formatCurrency(networkTotals?.actual_collection || 0)
                )}
              </p>
              <p className="text-[11px] text-text-tertiary mt-0.5">
                Target: <span className="font-semibold text-text-secondary">{formatCurrency(networkTotals?.target_collection || 0)}</span>
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-border-light overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, networkTotals?.collection_pct || 0)}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-700"
                />
              </div>
              <div className="flex justify-between text-[10px] text-text-tertiary">
                <span>Shortfall: {formatCurrency(networkTotals?.collection_shortfall || 0)}</span>
                <span>{networkTotals?.payment_count || 0} payments</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Admissions vs Target */}
        <Card className="rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-500/5 via-surface to-surface shadow-sm overflow-hidden relative group hover:border-blue-500/40 transition-all">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
                <UserPlus className="h-4 w-4" />
                Monthly Admissions
              </span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 tabular-nums">
                {isLoading ? "..." : `${networkTotals?.admission_pct || 0}%`}
              </span>
            </div>

            <div>
              <p className="text-2xl font-black text-text-primary tabular-nums tracking-tight">
                {isLoading ? (
                  <span className="inline-block w-20 h-7 bg-border-light rounded animate-pulse" />
                ) : (
                  <>
                    {networkTotals?.actual_admissions || 0}{" "}
                    <span className="text-sm font-normal text-text-tertiary">admitted</span>
                  </>
                )}
              </p>
              <p className="text-[11px] text-text-tertiary mt-0.5">
                Target: <span className="font-semibold text-text-secondary">{networkTotals?.target_admissions || 0} students</span>
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-border-light overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, networkTotals?.admission_pct || 0)}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700"
                />
              </div>
              <div className="flex justify-between text-[10px] text-text-tertiary">
                <span>Shortfall: {networkTotals?.admission_shortfall || 0} students</span>
                <span>Goal: {networkTotals?.target_admissions || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Top Performing Center */}
        <Card className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/5 via-surface to-surface shadow-sm overflow-hidden relative">
          <CardContent className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-violet-600 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                Top Pacing Branch
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-600">
                Leading
              </span>
            </div>

            {topBranch ? (
              <div>
                <p className="text-lg font-black text-text-primary truncate">
                  {topBranch.branch_short}
                </p>
                <p className="text-xs text-text-secondary mt-0.5 font-semibold">
                  {formatCurrency(topBranch.actuals.collection)} ({topBranch.metrics.collection_pct}% coll)
                </p>
                <p className="text-[10px] text-text-tertiary mt-1">
                  {topBranch.actuals.admissions} admissions ({topBranch.metrics.admission_pct}% adm)
                </p>
              </div>
            ) : (
              <p className="text-xs text-text-tertiary py-3">
                {isLoading ? "Calculating leader..." : "No branch data"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Branch Needing Push */}
        <Card className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/5 via-surface to-surface shadow-sm overflow-hidden relative">
          <CardContent className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Focus Center
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">
                Needs Attention
              </span>
            </div>

            {criticalBranch ? (
              <div>
                <p className="text-lg font-black text-text-primary truncate">
                  {criticalBranch.branch_short}
                </p>
                <p className="text-xs text-amber-600 font-semibold mt-0.5">
                  {criticalBranch.metrics.collection_pct}% collection pace
                </p>
                <p className="text-[10px] text-text-tertiary mt-1">
                  Shortfall: {formatCurrency(criticalBranch.metrics.collection_shortfall)}
                </p>
              </div>
            ) : (
              <p className="text-xs text-text-tertiary py-3">
                {isLoading ? "Evaluating pace..." : "No branch data"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Filters & Search Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: "all", label: `All Branches (${branches.length})` },
            { id: "exceeded", label: "Exceeded Target" },
            { id: "on_track", label: "On Track" },
            { id: "behind", label: "Behind Pace" },
            { id: "critical", label: "Critical" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface border border-border-light text-text-secondary hover:text-text-primary hover:bg-app-bg"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-surface border border-border-light text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-surface border border-border-light text-text-primary"
          >
            <option value="collection_pct">Sort by Collection %</option>
            <option value="admission_pct">Sort by Admission %</option>
            <option value="collection_amt">Sort by Amount Collected</option>
            <option value="name">Sort by Branch Name</option>
          </select>

          <button
            onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
            className="p-1.5 rounded-xl border border-border-light bg-surface text-text-secondary hover:text-text-primary hover:bg-app-bg transition-colors"
            title={`Toggle sort order (${sortOrder})`}
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Main Performance Matrix Table ── */}
      <div className="rounded-2xl border border-border-light bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-app-bg border-b border-border-light text-text-tertiary uppercase font-bold text-[10px] tracking-wider">
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4 min-w-[220px]">Monthly Admissions</th>
                <th className="py-3 px-4 min-w-[260px]">Monthly Collections (₹)</th>
                <th className="py-3 px-4 text-center">Pace Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-text-tertiary">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-xs">Loading branch monitoring metrics...</p>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-error">
                    <div className="flex items-center justify-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      <p className="text-xs font-semibold">Failed to load branch data. Please refresh.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-text-tertiary">
                    No branches found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredBranches.map((b) => {
                  const statusColors = {
                    exceeded: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                    on_track: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                    behind: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                    critical: "bg-red-500/10 text-red-600 border-red-500/20",
                  }[b.metrics.status];

                  const statusLabels = {
                    exceeded: "Exceeded Target",
                    on_track: "On Track",
                    behind: "Behind Pace",
                    critical: "Critical Lag",
                  }[b.metrics.status];

                  return (
                    <tr key={b.branch} className="hover:bg-app-bg/50 transition-colors group">
                      {/* Branch info */}
                      <td className="py-3.5 px-4 font-semibold text-text-primary">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <Link
                              href={`/dashboard/director/branches/${encodeURIComponent(b.branch)}`}
                              className="font-bold text-xs hover:text-primary transition-colors flex items-center gap-1"
                            >
                              {b.branch_short}
                              <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                            <span className="text-[10px] text-text-tertiary">{b.abbr}</span>
                          </div>
                        </div>
                      </td>

                      {/* Admissions column */}
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => openDrilldown(b, "admissions")}
                          className="cursor-pointer group/adm space-y-1"
                          title="Click to view admitted students"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-blue-600 tabular-nums">
                                {b.actuals.admissions}
                              </span>
                              <span className="text-[11px] text-text-tertiary">
                                / {b.targets.admission_target}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                b.metrics.admission_pct >= 100
                                  ? "bg-emerald-500/15 text-emerald-600"
                                  : b.metrics.admission_pct >= 60
                                  ? "bg-blue-500/15 text-blue-600"
                                  : "bg-amber-500/15 text-amber-600"
                              } tabular-nums`}
                            >
                              {b.metrics.admission_pct}%
                            </span>
                          </div>

                          {/* Mini bar */}
                          <div className="h-1.5 rounded-full bg-border-light overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, b.metrics.admission_pct)}%` }}
                              className="h-full rounded-full bg-blue-500"
                            />
                          </div>

                          <div className="flex items-center justify-end text-[10px]">
                            <span className="text-blue-600 group-hover/adm:underline flex items-center gap-0.5">
                              View <Eye className="h-2.5 w-2.5" />
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Collections column */}
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => openDrilldown(b, "collection")}
                          className="cursor-pointer group/col space-y-1"
                          title="Click to view payment entries"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-emerald-600 tabular-nums">
                                {formatCurrency(b.actuals.collection)}
                              </span>
                              <span className="text-[10px] text-text-tertiary truncate max-w-[80px]">
                                / {formatCurrency(b.targets.collection_target)}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                b.metrics.collection_pct >= 100
                                  ? "bg-emerald-500/15 text-emerald-600"
                                  : b.metrics.collection_pct >= 60
                                  ? "bg-emerald-500/15 text-emerald-600"
                                  : "bg-amber-500/15 text-amber-600"
                              } tabular-nums`}
                            >
                              {b.metrics.collection_pct}%
                            </span>
                          </div>

                          {/* Mini bar */}
                          <div className="h-1.5 rounded-full bg-border-light overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, b.metrics.collection_pct)}%` }}
                              className="h-full rounded-full bg-emerald-500"
                            />
                          </div>

                          <div className="flex items-center justify-end text-[10px]">
                            <span className="text-emerald-600 group-hover/col:underline flex items-center gap-0.5">
                              View <Eye className="h-2.5 w-2.5" />
                            </span>
                          </div>
                        </div>
                      </td>



                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusColors}`}
                        >
                          {statusLabels}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditTarget(b.branch)}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-border-light bg-app-bg hover:border-primary/40 hover:bg-surface text-text-primary transition-colors"
                          >
                            Edit Target
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals & Drawers ── */}
      <SetBranchTargetModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        monthKey={selectedMonth}
        monthLabel={data?.month_label || selectedMonth}
        branches={branches}
        selectedBranchName={targetModalBranch}
        onSuccess={() => refetch()}
      />

      <BranchDrilldownDrawer
        isOpen={drilldownDrawerOpen}
        onClose={() => setDrilldownDrawerOpen(false)}
        branch={drilldownBranch}
        branchShort={drilldownBranchShort}
        monthKey={selectedMonth}
        monthLabel={data?.month_label || selectedMonth}
        initialTab={drilldownInitialTab}
      />
    </div>
  );
}
