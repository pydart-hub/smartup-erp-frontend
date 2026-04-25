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
  CreditCard,
  TrendingUp,
  Minus,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Input } from "@/components/ui/Input";
import { getConsolidatedLoanReport, type BranchLoanRow } from "@/lib/api/director";
import { AnimatedCurrency } from "@/components/dashboard/AnimatedValue";
import { formatCurrencyExact } from "@/lib/utils/formatters";

/* ── helpers ── */
const Pulse = ({ w = "w-14" }: { w?: string }) => (
  <span className={`inline-block ${w} h-5 bg-border-light rounded animate-pulse`} />
);

/* ── Branch loan card ── */
function BranchLoanCard({
  row,
  index,
}: {
  row: BranchLoanRow;
  index: number;
}) {
  const shortName = row.branch
    .replace("Smart Up ", "")
    .replace("Smart Up", "HQ");
  const hasLoans = row.total > 0;

  return (
    <Link href={`/dashboard/director/accounts/loans/${encodeURIComponent(row.branch)}`}>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3 }}
        whileHover={{ y: -2 }}
        className="group h-full rounded-xl border border-border-light bg-surface p-3.5 hover:border-amber-500/30 hover:shadow-md transition-all cursor-pointer flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasLoans ? "bg-amber-500/12" : "bg-border-light/60"}`}>
              <Building2 className={`h-3.5 w-3.5 ${hasLoans ? "text-amber-600" : "text-text-tertiary"}`} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-text-primary leading-tight">
                {shortName}
              </p>
              <p className="text-[10px] text-text-tertiary">{row.abbr}</p>
            </div>
          </div>
          <ChevronRight className={`h-3.5 w-3.5 text-text-tertiary group-hover:${hasLoans ? "text-amber-600" : "text-text-secondary"} transition-colors`} />
        </div>

        {/* Total */}
        <div className="mb-3">
          <p className={`text-lg font-bold tabular-nums ${hasLoans ? "text-amber-600" : "text-text-tertiary"}`}>
            {hasLoans ? <AnimatedCurrency value={row.total} decimals /> : "—"}
          </p>
          <p className="text-[10px] text-text-tertiary mt-0.5">
            {hasLoans
              ? `${row.accounts.length} ${row.accounts.length === 1 ? "account" : "accounts"}`
              : "No outstanding loans"}
          </p>
        </div>

        {/* Individual accounts */}
        {hasLoans && (
          <div className="flex-1 space-y-1.5">
            {row.accounts.slice(0, 3).map((acct) => (
              <div key={acct.account} className="flex items-center justify-between">
                <p className="text-[10px] text-text-secondary truncate flex-1 min-w-0 capitalize">
                  {acct.account_name.toLowerCase()}
                </p>
                <p className="text-[10px] font-medium text-amber-600 ml-2 shrink-0 tabular-nums">
                  {formatCurrencyExact(acct.balance)}
                </p>
              </div>
            ))}
            {row.accounts.length > 3 && (
              <p className="text-[9px] text-text-tertiary">+{row.accounts.length - 3} more</p>
            )}
          </div>
        )}
      </motion.div>
    </Link>
  );
}

/* ── Summary cards ── */
function SummaryCards({
  grandTotal,
  highestBranch,
  branchesWithLoans,
  isLoading,
}: {
  grandTotal: number;
  highestBranch: { name: string; amount: number } | null;
  branchesWithLoans: number;
  isLoading: boolean;
}) {
  const shortName = (n: string) =>
    n.replace("Smart Up ", "").replace("Smart Up", "HQ");

  const cards = [
    {
      label: "Total Loans",
      numValue: grandTotal,
      icon: CreditCard,
      accent: "text-amber-600",
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/15",
    },
    {
      label: highestBranch ? `Highest — ${shortName(highestBranch.name)}` : "Highest Liability",
      numValue: highestBranch?.amount ?? 0,
      icon: TrendingUp,
      accent: "text-amber-600",
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/15",
    },
    {
      label: `Branches with Loans`,
      numValue: branchesWithLoans,
      icon: Minus,
      accent: "text-text-primary",
      iconColor: "text-text-secondary",
      iconBg: "bg-border-light",
      isCount: true,
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
          <div className={`w-9 h-9 rounded-lg ${c.iconBg} flex items-center justify-center shrink-0`}>
            <c.icon className={`h-4.5 w-4.5 ${c.iconColor}`} />
          </div>
          <div className="min-w-0">
            {isLoading ? (
              <Pulse w="w-20" />
            ) : c.isCount ? (
              <p className={`text-base font-bold ${c.accent}`}>{branchesWithLoans}</p>
            ) : (
              <AnimatedCurrency
                value={c.numValue}
                decimals
                className={`text-base font-bold ${c.accent}`}
              />
            )}
            <p className="text-[10px] text-text-tertiary truncate mt-0.5">{c.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Page ── */
export default function LoansPage() {
  const { data: loanData, isLoading, isError } = useQuery({
    queryKey: ["consolidated-loans"],
    queryFn: getConsolidatedLoanReport,
    staleTime: 120_000,
  });

  const [search, setSearch] = useState("");

  const allBranches: BranchLoanRow[] = loanData?.branches ?? [];

  const filtered = useMemo(() => {
    const list = search
      ? allBranches.filter((b) =>
          b.branch.toLowerCase().includes(search.toLowerCase()),
        )
      : allBranches;
    // Sort: branches with loans first, then by total desc
    return [...list].sort((a, b) => b.total - a.total);
  }, [allBranches, search]);

  const highestBranch = useMemo(() => {
    const withLoans = allBranches.filter((b) => b.total > 0);
    if (!withLoans.length) return null;
    const top = [...withLoans].sort((a, b) => b.total - a.total)[0];
    return { name: top.branch, amount: top.total };
  }, [allBranches]);

  const branchesWithLoans = useMemo(
    () => allBranches.filter((b) => b.total > 0).length,
    [allBranches],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Loans Overview</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Outstanding liabilities across all branches
          </p>
        </div>
      </div>

      {/* Summary */}
      <SummaryCards
        grandTotal={loanData?.grand_total ?? 0}
        highestBranch={highestBranch}
        branchesWithLoans={branchesWithLoans}
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
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load loan data</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((row, i) => (
            <BranchLoanCard key={row.branch} row={row} index={i} />
          ))}
        </div>
      )}

      {/* Context note */}
      <div className="rounded-xl border border-amber-200/40 bg-amber-50/30 dark:bg-amber-900/10 dark:border-amber-700/30 px-4 py-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mb-0.5">About Loans (Liabilities)</p>
        <p className="text-[11px] text-amber-600/80 dark:text-amber-500/80 leading-relaxed">
          These are amounts borrowed by each branch — recorded under{" "}
          <span className="font-medium">Loans (Liabilities)</span> in the Chart of Accounts.
          They represent outstanding obligations and are separate from operating expenses and collection figures.
        </p>
      </div>
    </motion.div>
  );
}
