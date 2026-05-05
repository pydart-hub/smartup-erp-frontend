"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Building2,
  ChevronRight,
  ChevronDown,
  Loader2,
  AlertCircle,
  Receipt,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Input } from "@/components/ui/Input";
import { getAllBranches } from "@/lib/api/director";
import {
  getExpenseSummary,
  type ExpenseBranchSummary,
} from "@/lib/api/expenses";
import type { ExpenseClassKey } from "@/lib/utils/expense-classification";
import { formatCurrency, formatCurrencyExact } from "@/lib/utils/formatters";
import { AnimatedCurrency } from "@/components/dashboard/AnimatedValue";

/* ── helpers ── */
const Pulse = ({ w = "w-14" }: { w?: string }) => (
  <span
    className={`inline-block ${w} h-5 bg-border-light rounded animate-pulse`}
  />
);

/* ── Donut chart helpers ── */
type ArcSlice = { path: string; color: string; label: string; value: number; pct: number };

function buildArcs(
  slices: Array<{ key: ExpenseClassKey; color: string; label: string }>,
  totalsMap: Map<ExpenseClassKey, number>,
  subTotal: number,
  Ro: number, Ri: number, ccx: number, ccy: number,
): ArcSlice[] {
  const result: ArcSlice[] = [];
  let sa = -Math.PI / 2;
  for (const sl of slices) {
    const value = totalsMap.get(sl.key) ?? 0;
    const pct = subTotal > 0 ? value / subTotal : 0;
    if (pct === 0) { result.push({ path: "", color: sl.color, label: sl.label, value, pct }); continue; }
    if (pct >= 1) {
      const path =
        `M ${ccx} ${ccy - Ro} A ${Ro} ${Ro} 0 1 1 ${ccx} ${ccy + Ro} L ${ccx} ${ccy + Ri} A ${Ri} ${Ri} 0 1 0 ${ccx} ${ccy - Ri} Z ` +
        `M ${ccx} ${ccy + Ro} A ${Ro} ${Ro} 0 1 1 ${ccx} ${ccy - Ro} L ${ccx} ${ccy - Ri} A ${Ri} ${Ri} 0 1 0 ${ccx} ${ccy + Ri} Z`;
      result.push({ path, color: sl.color, label: sl.label, value, pct });
      sa += 2 * Math.PI;
      continue;
    }
    const angle = pct * 2 * Math.PI;
    const ea = sa + angle;
    const x1 = ccx + Ro * Math.cos(sa); const y1 = ccy + Ro * Math.sin(sa);
    const x2 = ccx + Ro * Math.cos(ea); const y2 = ccy + Ro * Math.sin(ea);
    const ix1 = ccx + Ri * Math.cos(ea); const iy1 = ccy + Ri * Math.sin(ea);
    const ix2 = ccx + Ri * Math.cos(sa); const iy2 = ccy + Ri * Math.sin(sa);
    const lg = angle > Math.PI ? 1 : 0;
    result.push({ path: `M ${x1} ${y1} A ${Ro} ${Ro} 0 ${lg} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${Ri} ${Ri} 0 ${lg} 0 ${ix2} ${iy2} Z`, color: sl.color, label: sl.label, value, pct });
    sa = ea;
  }
  return result;
}

const PIE_SLICES_DEF = [
  { key: "BRANCH_FIXED"    as ExpenseClassKey, label: "Branch Fixed",    color: "#f43f5e", group: "BRANCH" },
  { key: "BRANCH_VARIABLE" as ExpenseClassKey, label: "Branch Variable", color: "#fb7185", group: "BRANCH" },
  { key: "HO_FIXED"        as ExpenseClassKey, label: "HO Fixed",        color: "#f97316", group: "HO"     },
  { key: "HO_VARIABLE"     as ExpenseClassKey, label: "HO Variable",     color: "#fdba74", group: "HO"     },
];

function ClassificationSection({
  classTotals,
  isLoading,
}: {
  classTotals: { key: ExpenseClassKey; label: string; total: number }[];
  isLoading: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const totalsMap = useMemo(() => {
    const m = new Map<ExpenseClassKey, number>();
    for (const ct of classTotals) m.set(ct.key, ct.total);
    return m;
  }, [classTotals]);

  const branchTotal = (totalsMap.get("BRANCH_FIXED") ?? 0) + (totalsMap.get("BRANCH_VARIABLE") ?? 0);
  const hoTotal     = (totalsMap.get("HO_FIXED") ?? 0)     + (totalsMap.get("HO_VARIABLE") ?? 0);
  const overallTotal = branchTotal + hoTotal;

  const R = 44; const ri = 24; const CC = 50;
  const branchSlices  = PIE_SLICES_DEF.filter((s) => s.group === "BRANCH");
  const hoSlices      = PIE_SLICES_DEF.filter((s) => s.group === "HO");

  const charts = [
    { key: "BRANCH", title: "Branch",      slices: branchSlices, subTotal: branchTotal,  center: "Branch", href: "/dashboard/director/accounts/expense/classification/branch" },
    { key: "HO",     title: "Head Office", slices: hoSlices,     subTotal: hoTotal,       center: "HO",     href: "/dashboard/director/accounts/expense/classification/ho"     },
    { key: "ALL",    title: "Overall",     slices: PIE_SLICES_DEF, subTotal: overallTotal, center: "Total",  href: "/dashboard/director/accounts/expense/classification/overall" },
  ];

  const toggle = (key: string) => setExpanded((prev) => {
    const n = new Set(prev);
    n.has(key) ? n.delete(key) : n.add(key);
    return n;
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border-light bg-surface p-4 space-y-3">
        <Pulse w="w-48" />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map((i) => <div key={i} className="h-40 rounded-lg bg-border-light/40 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (overallTotal === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border-light bg-surface p-4"
    >
      <h3 className="text-sm font-semibold text-text-primary mb-4">Expense by Classification</h3>

      {/* 3 donut charts */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {charts.map((chart, ci) => {
          const arcs = buildArcs(chart.slices, totalsMap, chart.subTotal, R, ri, CC, CC);
          return (
            <Link key={chart.key} href={chart.href}>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ci * 0.08 }}
              className="rounded-lg border border-border-light/70 bg-background/30 p-3 flex flex-col items-center gap-2 hover:border-rose-400/60 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-1">
                <p className="text-[11px] font-semibold text-text-secondary group-hover:text-rose-600 transition-colors">{chart.title}</p>
                <ChevronRight className="w-3 h-3 text-text-tertiary group-hover:text-rose-500 transition-colors" />
              </div>
              <svg width={100} height={100} viewBox="0 0 100 100">
                {arcs.map((sl, i) =>
                  sl.path ? (
                    <motion.path
                      key={i}
                      d={sl.path}
                      fill={sl.color}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: ci * 0.08 + i * 0.06 }}
                      className="hover:opacity-75 transition-opacity"
                    />
                  ) : null,
                )}
                <text x={CC} y={CC - 5} textAnchor="middle" fill="#6b7280" style={{ fontSize: 8, fontWeight: 600 }}>{chart.center}</text>
                <text x={CC} y={CC + 7} textAnchor="middle" fill="#f43f5e" style={{ fontSize: 7.5, fontWeight: 700 }}>₹{(chart.subTotal / 1000).toFixed(1)}k</text>
              </svg>
              <div className="w-full space-y-1.5">
                {arcs.map((sl, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: sl.color }} />
                        <span className="text-[9px] text-text-secondary truncate">{sl.label}</span>
                      </div>
                      <span className="text-[9px] font-semibold text-text-primary tabular-nums ml-1 shrink-0">
                        {sl.pct > 0 ? `${(sl.pct * 100).toFixed(0)}%` : "—"}
                      </span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-border-light/50 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${sl.pct * 100}%` }}
                        transition={{ duration: 0.45, delay: ci * 0.08 + i * 0.05 }}
                        className="h-full rounded-full"
                        style={{ background: sl.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-bold text-rose-600 tabular-nums mt-0.5">{formatCurrencyExact(chart.subTotal)}</p>
            </motion.div>
            </Link>
          );
        })}
      </div>

      {/* Collapsible detail rows: Branch + HO */}
      <div className="space-y-2">
        {[
          { key: "BRANCH", label: "Branch",      total: branchTotal,  slices: branchSlices },
          { key: "HO",     label: "Head Office", total: hoTotal,      slices: hoSlices     },
        ].map((section, si) => {
          const isOpen = expanded.has(section.key);
          return (
            <motion.div
              key={section.key}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + si * 0.05 }}
              className="rounded-lg border border-border-light/80 overflow-hidden"
            >
              <button
                onClick={() => toggle(section.key)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-background/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <motion.span animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.2 }} className="text-text-tertiary">
                    <ChevronDown className="w-4 h-4" />
                  </motion.span>
                  <span className="text-sm font-semibold text-text-primary">{section.label}</span>
                </div>
                <span className="text-sm font-bold text-rose-600">{formatCurrencyExact(section.total)}</span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 px-3 pb-3">
                      {section.slices.map((sl, i) => {
                        const val = totalsMap.get(sl.key) ?? 0;
                        const pct = overallTotal > 0 ? (val / overallTotal) * 100 : 0;
                        const barW = section.total > 0 ? (val / section.total) * 100 : 0;
                        return (
                          <motion.div key={sl.key} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="px-2 py-1.5 rounded-md hover:bg-background/40 transition-colors">
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: sl.color }} />
                                <span className="text-xs font-medium text-text-secondary truncate">{sl.label}</span>
                              </div>
                              <div className="flex items-center gap-2 ml-2 shrink-0">
                                <span className="text-[10px] text-text-tertiary">{pct.toFixed(1)}%</span>
                                <span className="text-xs font-semibold text-text-primary tabular-nums">{formatCurrencyExact(val)}</span>
                              </div>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-border-light/60 overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${barW}%` }} transition={{ duration: 0.4, delay: i * 0.03 }} className="h-full rounded-full" style={{ background: sl.color }} />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── Branch expense card ── */
function BranchExpenseCard({
  branch,
  expense,
  isLoading,
  index,
}: {
  branch: { name: string; abbr: string };
  expense: ExpenseBranchSummary | undefined;
  isLoading: boolean;
  index: number;
}) {
  const shortName = branch.name
    .replace("Smart Up ", "")
    .replace("Smart Up", "HQ");
  const hasData = expense && expense.total > 0;

  return (
    <Link
      href={`/dashboard/director/accounts/expense/${encodeURIComponent(branch.name)}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3 }}
        whileHover={{ y: -2 }}
        className="group h-full rounded-xl border border-border-light bg-surface p-3.5 hover:border-red-500/35 hover:shadow-md transition-all cursor-pointer flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/12 flex items-center justify-center">
              <Building2 className="h-3.5 w-3.5 text-red-500" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-text-primary leading-tight">
                {shortName}
              </p>
              <p className="text-[10px] text-text-tertiary">{branch.abbr}</p>
            </div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-text-tertiary group-hover:text-red-500 transition-colors" />
        </div>

        {/* Total expense */}
        <div className="mb-3">
          {isLoading ? (
            <Pulse w="w-24" />
          ) : (
            <p className="text-lg font-bold text-text-primary tabular-nums">
              <AnimatedCurrency value={expense?.total ?? 0} decimals />
            </p>
          )}
          <p className="text-[10px] text-text-tertiary mt-0.5">
            {isLoading ? <Pulse w="w-12" /> : hasData ? (
              <>{expense.entryCount} {expense.entryCount !== 1 ? "entries" : "entry"}</>
            ) : "No expenses"}
          </p>
        </div>

        {/* Top 2 categories */}
        <div className="flex-1 min-h-[44px]">
          {isLoading ? (
            <div className="space-y-2">
              <Pulse w="w-full" />
              <Pulse w="w-3/4" />
            </div>
          ) : hasData ? (
            <div className="space-y-1.5">
              {expense.topCategories.slice(0, 2).map((cat, i) => {
                const pct =
                  expense.total > 0
                    ? Math.round((cat.amount / expense.total) * 100)
                    : 0;
                return (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-[10px] text-text-secondary truncate flex-1 min-w-0 capitalize">
                        {cat.name.toLowerCase()}
                      </p>
                      <p className="text-[10px] font-medium text-text-primary ml-1.5 shrink-0 tabular-nums">
                        {formatCurrency(cat.amount)}
                      </p>
                    </div>
                    <div className="w-full h-1 rounded-full bg-border-light/60 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
                        className="h-full rounded-full bg-red-500/70"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-text-tertiary italic">—</p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

/* ── Summary cards ── */
function SummaryCards({
  grandTotal,
  topBranch,
  lowestBranch,
  isLoading,
}: {
  grandTotal: number;
  topBranch: { name: string; amount: number } | null;
  lowestBranch: { name: string; amount: number } | null;
  isLoading: boolean;
}) {
  const shortName = (n: string) =>
    n.replace("Smart Up ", "").replace("Smart Up", "HQ");

  const cards = [
    {
      label: "Total Expenses",
      numValue: grandTotal,
      icon: Wallet,
      accent: "text-red-600",
      iconColor: "text-red-500",
      iconBg: "bg-red-500/15",
    },
    {
      label: topBranch ? `Highest — ${shortName(topBranch.name)}` : "Highest Expense",
      numValue: topBranch?.amount ?? 0,
      icon: TrendingUp,
      accent: "text-red-600",
      iconColor: "text-red-500",
      iconBg: "bg-red-500/15",
    },
    {
      label: lowestBranch ? `Lowest — ${shortName(lowestBranch.name)}` : "Lowest Expense",
      numValue: lowestBranch?.amount ?? 0,
      icon: TrendingDown,
      accent: "text-emerald-600",
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-xl border border-border-light bg-surface p-4 flex items-center gap-3"
        >
          <div
            className={`w-9 h-9 rounded-lg ${c.iconBg} flex items-center justify-center shrink-0`}
          >
            <c.icon className={`h-4.5 w-4.5 ${c.iconColor}`} />
          </div>
          <div className="min-w-0">
            {isLoading ? (
              <Pulse w="w-20" />
            ) : (
              <AnimatedCurrency
                value={c.numValue}
                decimals
                className={`text-base font-bold ${c.accent}`}
              />
            )}
            <p className="text-[10px] text-text-tertiary truncate mt-0.5">
              {c.label}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Page ── */
export default function ExpensePage() {
  const {
    data: branches,
    isLoading: branchesLoading,
    isError: branchesError,
  } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 300_000,
  });

  const {
    data: expenseData,
    isLoading: expenseLoading,
  } = useQuery({
    queryKey: ["director-expense-summary"],
    queryFn: getExpenseSummary,
    staleTime: 120_000,
  });

  const [search, setSearch] = useState("");

  // Build a map from company name → expense summary
  const expenseMap = useMemo(() => {
    const m = new Map<string, ExpenseBranchSummary>();
    for (const b of expenseData?.branches ?? []) {
      m.set(b.company, b);
    }
    return m;
  }, [expenseData]);

  // All branches (including HQ this time — HQ has major expenses)
  const allBranches = useMemo(() => branches ?? [], [branches]);
  const filtered = search
    ? allBranches.filter((b) =>
      b.name.toLowerCase().includes(search.toLowerCase()),
    )
    : allBranches;

  // Top & lowest expense branches
  const { topBranch, lowestBranch } = useMemo(() => {
    const list = expenseData?.branches ?? [];
    if (!list.length) return { topBranch: null, lowestBranch: null };
    const withExpenses = list.filter((b) => b.total > 0);
    if (!withExpenses.length) return { topBranch: null, lowestBranch: null };
    const sorted = [...withExpenses].sort((a, b) => b.total - a.total);
    return {
      topBranch: { name: sorted[0].company, amount: sorted[0].total },
      lowestBranch: { name: sorted[sorted.length - 1].company, amount: sorted[sorted.length - 1].total },
    };
  }, [expenseData]);

  const isLoading = branchesLoading || expenseLoading;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Expense Overview
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Expenditures across all branches
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <SummaryCards
        grandTotal={expenseData?.grandTotal ?? 0}
        topBranch={topBranch}
        lowestBranch={lowestBranch}
        isLoading={isLoading}
      />

      {/* Classification breakdown */}
      <ClassificationSection
        classTotals={expenseData?.classTotals ?? []}
        isLoading={isLoading}
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <Input
          placeholder="Search branches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Branch grid */}
      {branchesLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : branchesError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load branches</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((branch, i) => (
            <BranchExpenseCard
              key={branch.name}
              branch={branch}
              expense={expenseMap.get(branch.name)}
              isLoading={expenseLoading}
              index={i}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
