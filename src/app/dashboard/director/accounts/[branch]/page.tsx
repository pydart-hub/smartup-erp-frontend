"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  Landmark,
  Receipt,
  TrendingUp,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { getBranchBankOverview } from "@/lib/api/director";
import { getBranchExpenseDetail } from "@/lib/api/expenses";
import { AnimatedCurrency } from "@/components/dashboard/AnimatedValue";

export default function BranchAccountDetailPage() {
  const { branch } = useParams<{ branch: string }>();
  const branchName = decodeURIComponent(branch);
  const shortName = branchName
    .replace("Smart Up ", "")
    .replace("Smart Up", "HQ");

  /* ── Data ── */
  const { data: bankData, isLoading: bankLoading } = useQuery({
    queryKey: ["branch-bank-overview", branchName],
    queryFn: () => getBranchBankOverview(branchName),
    staleTime: 120_000,
  });

  const { data: expenseData, isLoading: expenseLoading } = useQuery({
    queryKey: ["branch-expense-detail", branchName],
    queryFn: () => getBranchExpenseDetail(branchName),
    staleTime: 120_000,
  });

  const isLoading = bankLoading || expenseLoading;

  const totalCollection = useMemo(() => {
    if (!bankData?.accounts) return 0;
    return bankData.accounts.reduce((s, a) => s + a.balance, 0);
  }, [bankData]);

  const totalExpense = expenseData?.total ?? 0;
  const profit = totalCollection - totalExpense;

  /* ── helpers ── */
  const Pulse = ({ w = "w-20" }: { w?: string }) => (
    <span className={`inline-block ${w} h-5 bg-border-light rounded animate-pulse`} />
  );

  /* ── Bank account breakdown ── */
  const accountGroups = useMemo(() => {
    if (!bankData?.accounts) return { cash: 0, bank: 0, razorpay: 0, upi: 0, bankName: "" };
    let cash = 0, bank = 0, razorpay = 0, upi = 0, bankName = "";
    for (const a of bankData.accounts) {
      const lower = a.account_name.toLowerCase();
      if (lower.includes("razorpay")) razorpay += a.balance;
      else if (lower.includes("upi") || lower.includes("phonepe") || lower.includes("google pay")) upi += a.balance;
      else if (a.account_type === "Cash") cash += a.balance;
      else {
        bank += a.balance;
        if (!bankName && a.balance > 0) bankName = a.account_name;
      }
    }
    return { cash, bank, razorpay, upi, bankName };
  }, [bankData]);

  /* ── Expense categories ── */
  const topCategories = useMemo(() => {
    if (!expenseData?.categories) return [];
    return [...expenseData.categories].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [expenseData]);

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
          href="/dashboard/director/accounts"
          className="w-8 h-8 rounded-lg bg-app-bg flex items-center justify-center hover:bg-border-light transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-text-secondary" />
        </Link>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{shortName}</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Financial summary
          </p>
        </div>
      </div>

      {/* Summary: Collection − Expense = Profit */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total Collection",
            value: totalCollection,
            icon: Landmark,
            iconColor: "text-emerald-500",
            iconBg: "bg-emerald-500/10",
            valueColor: "text-emerald-600",
          },
          {
            label: "Total Expense",
            value: totalExpense,
            icon: Receipt,
            iconColor: "text-red-500",
            iconBg: "bg-red-500/15",
            valueColor: "text-red-600",
          },
          {
            label: "Profit",
            value: profit,
            icon: TrendingUp,
            iconColor: "text-primary",
            iconBg: "bg-primary/10",
            valueColor: profit >= 0 ? "text-primary" : "text-red-600",
          },
        ].map((c, i) => (
          <motion.div
            key={c.label}
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
                <Pulse />
              ) : (
                <AnimatedCurrency
                  value={c.value}
                  decimals
                  className={`text-base font-bold ${c.valueColor}`}
                />
              )}
              <p className="text-[10px] text-text-tertiary mt-0.5">{c.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick links to collection & expense detail */}
      <div className="grid grid-cols-2 gap-3">
        <Link href={`/dashboard/director/accounts/collection`}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -2 }}
            className="rounded-xl border border-border-light bg-surface p-4 hover:border-emerald-400/30 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Landmark className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Collection Details</p>
                <p className="text-[11px] text-text-tertiary">View bank & cash balances</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-emerald-600 transition-colors" />
          </motion.div>
        </Link>
        <Link href={`/dashboard/director/accounts/expense/${encodeURIComponent(branchName)}`}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            whileHover={{ y: -2 }}
            className="rounded-xl border border-border-light bg-surface p-4 hover:border-red-400/30 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center">
                <Receipt className="h-4.5 w-4.5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Expense Details</p>
                <p className="text-[11px] text-text-tertiary">View transactions & categories</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-red-600 transition-colors" />
          </motion.div>
        </Link>
      </div>

      {/* Two-column breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Collection breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-border-light bg-surface overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border-light flex items-center gap-2">
            <Landmark className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-text-primary">Collection Breakdown</h3>
          </div>
          {bankLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="animate-spin h-5 w-5 text-primary" />
            </div>
          ) : (
            <div className="divide-y divide-border-light/50">
              {[
                { label: "Cash", value: accountGroups.cash },
                { label: accountGroups.bankName || "Bank", value: accountGroups.bank },
                { label: "Razorpay", value: accountGroups.razorpay },
                { label: "UPI", value: accountGroups.upi },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px] text-text-secondary">{item.label}</span>
                  <span className="text-[13px] font-medium text-emerald-600 tabular-nums">
                    <AnimatedCurrency value={item.value} decimals />
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3 bg-emerald-500/5">
                <span className="text-[13px] font-semibold text-text-primary">Total</span>
                <span className="text-[14px] font-bold text-emerald-600 tabular-nums">
                  <AnimatedCurrency value={totalCollection} decimals />
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Expense breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl border border-border-light bg-surface overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border-light flex items-center gap-2">
            <Receipt className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold text-text-primary">Top Expense Categories</h3>
          </div>
          {expenseLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="animate-spin h-5 w-5 text-primary" />
            </div>
          ) : topCategories.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-text-tertiary">No expenses recorded</p>
            </div>
          ) : (
            <div className="divide-y divide-border-light/50">
              {topCategories.map((cat) => {
                const pct = totalExpense > 0 ? Math.round((cat.total / totalExpense) * 100) : 0;
                return (
                  <div key={cat.account} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] text-text-secondary truncate flex-1 min-w-0 capitalize">
                        {cat.accountName.toLowerCase()}
                      </span>
                      <span className="text-[12px] font-medium text-red-600 tabular-nums ml-2 shrink-0">
                        <AnimatedCurrency value={cat.total} decimals />
                      </span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-border-light/60 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="h-full rounded-full bg-red-500/60"
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between px-4 py-3 bg-red-500/5">
                <span className="text-[13px] font-semibold text-text-primary">Total</span>
                <span className="text-[14px] font-bold text-red-600 tabular-nums">
                  <AnimatedCurrency value={totalExpense} decimals />
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
