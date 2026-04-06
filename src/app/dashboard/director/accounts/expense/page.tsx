"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Building2,
  ChevronRight,
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
import { formatCurrency } from "@/lib/utils/formatters";
import { AnimatedCurrency } from "@/components/dashboard/AnimatedValue";

/* ── helpers ── */
const Pulse = ({ w = "w-14" }: { w?: string }) => (
  <span
    className={`inline-block ${w} h-5 bg-border-light rounded animate-pulse`}
  />
);

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
