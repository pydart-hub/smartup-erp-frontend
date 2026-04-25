"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  AlertCircle,
  Info,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { getBranchLoanOverview } from "@/lib/api/director";
import { AnimatedCurrency } from "@/components/dashboard/AnimatedValue";
import { formatCurrencyExact } from "@/lib/utils/formatters";

/* ── helpers ── */
const Pulse = ({ w = "w-20" }: { w?: string }) => (
  <span className={`inline-block ${w} h-5 bg-border-light rounded animate-pulse`} />
);

export default function BranchLoansPage() {
  const { branch } = useParams<{ branch: string }>();
  const branchName = decodeURIComponent(branch);
  const shortName = branchName
    .replace("Smart Up ", "")
    .replace("Smart Up", "HQ");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["branch-loan-overview", branchName],
    queryFn: () => getBranchLoanOverview(branchName),
    staleTime: 120_000,
  });

  const accounts = data?.accounts ?? [];
  const total = data?.total ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/director/accounts/loans"
          className="w-8 h-8 rounded-lg bg-app-bg flex items-center justify-center hover:bg-border-light transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-text-secondary" />
        </Link>
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{shortName}</h1>
          <p className="text-sm text-text-secondary mt-0.5">Loan liabilities</p>
        </div>
      </div>

      {/* Total card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-xl border border-amber-200/50 bg-amber-50/30 dark:bg-amber-900/10 dark:border-amber-700/30 p-4 flex items-center gap-4"
      >
        <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
          <CreditCard className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          {isLoading ? (
            <Pulse w="w-32" />
          ) : (
            <AnimatedCurrency
              value={total}
              decimals
              className="text-2xl font-bold text-amber-600"
            />
          )}
          <p className="text-xs text-amber-600/70 mt-0.5">Total Outstanding Loans</p>
        </div>
      </motion.div>

      {/* Account list */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="rounded-xl border border-border-light bg-surface overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border-light flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-text-primary">Loan Accounts</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="animate-spin h-5 w-5 text-primary" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <AlertCircle className="h-6 w-6 text-error" />
            <p className="text-sm text-error">Failed to load data</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <p className="text-sm text-text-tertiary">No outstanding loan accounts</p>
            <p className="text-xs text-text-tertiary">All loan balances are zero for this branch.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-light/50">
            {accounts.map((acct, i) => {
              const pct = total > 0 ? Math.round((acct.balance / total) * 100) : 0;
              return (
                <motion.div
                  key={acct.account}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  className="px-4 py-3.5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-text-primary capitalize truncate">
                        {acct.account_name.toLowerCase()}
                      </p>
                      <p className="text-[10px] text-text-tertiary mt-0.5">
                        {pct}% of total · {acct.balance >= 0 ? "Credit (liability)" : "Debit (net asset)"}
                      </p>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className={`text-[14px] font-bold tabular-nums ${acct.balance >= 0 ? "text-amber-600" : "text-emerald-600"}`}>
                        {formatCurrencyExact(Math.abs(acct.balance))}
                      </p>
                      <p className="text-[9px] text-text-tertiary mt-0.5">
                        {acct.balance >= 0 ? "Cr" : "Dr"}
                      </p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1 rounded-full bg-border-light/60 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: 0.2 + i * 0.05 }}
                      className="h-full rounded-full bg-amber-500/60"
                    />
                  </div>
                </motion.div>
              );
            })}
            {/* Total row */}
            <div className="flex items-center justify-between px-4 py-3 bg-amber-500/5">
              <span className="text-[13px] font-semibold text-text-primary">Total Outstanding</span>
              <span className="text-[14px] font-bold text-amber-600 tabular-nums">
                <AnimatedCurrency value={total} decimals />
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Info note */}
      <div className="rounded-xl border border-border-light bg-surface/50 p-4 flex gap-3">
        <Info className="h-4 w-4 text-text-tertiary shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-medium text-text-secondary mb-0.5">About these balances</p>
          <p className="text-[11px] text-text-tertiary leading-relaxed">
            These amounts are sourced from the <span className="font-medium">Loans (Liabilities)</span> group in Frappe&apos;s Chart of Accounts for this branch.
            A positive balance (Cr) means the branch owes that amount. These are separate from operating expenses and do not affect the collection or profit figures.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
