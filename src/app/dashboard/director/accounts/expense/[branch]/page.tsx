"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Receipt,
  Hash,
  TrendingDown,
  Calendar,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  FolderOpen,
  Folder,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import {
  getBranchExpenseDetail,
  getBranchExpenseTransactions,
  type ExpenseCategory,
  type ExpenseGroup,
} from "@/lib/api/expenses";
import { formatCurrencyExact, formatDate } from "@/lib/utils/formatters";

/* ── helpers ── */
const Pulse = ({ w = "w-14" }: { w?: string }) => (
  <span
    className={`inline-block ${w} h-5 bg-border-light rounded animate-pulse`}
  />
);

const PAGE_SIZE = 50;

/* ── Category bar chart (grouped by parent account) ── */
function CategoryBreakdown({
  categories,
  groups,
  total,
  isLoading,
}: {
  categories: ExpenseCategory[];
  groups: ExpenseGroup[];
  total: number;
  isLoading: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Group categories by parentGroup
  const grouped = useMemo(() => {
    const map = new Map<string, ExpenseCategory[]>();
    for (const cat of categories) {
      const key = cat.parentGroup ?? "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(cat);
    }
    // Sort children within each group by total desc
    for (const children of map.values()) {
      children.sort((a, b) => b.total - a.total);
    }
    return map;
  }, [categories]);

  const toggle = (groupName: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border-light bg-surface p-4 space-y-3">
        <Pulse w="w-40" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-1">
            <Pulse w="w-full" />
            <Pulse w="w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-border-light bg-surface p-6 text-center">
        <p className="text-sm text-text-tertiary">No expenses recorded</p>
      </div>
    );
  }

  const maxGroupTotal = groups.length > 0 ? groups[0].total : 1;

  return (
    <div className="rounded-xl border border-border-light bg-surface p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        Expense Breakdown by Category
      </h3>
      <div className="space-y-2">
        {groups.map((group, gi) => {
          const isOpen = expanded.has(group.name);
          const children = grouped.get(group.name) ?? [];
          const pct = total > 0 ? (group.total / total) * 100 : 0;
          const barW = maxGroupTotal > 0 ? (group.total / maxGroupTotal) * 100 : 0;
          const maxChildTotal = children.length > 0 ? children[0].total : 1;

          return (
            <motion.div
              key={group.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.04 }}
            >
              {/* Group header — clickable */}
              <button
                onClick={() => toggle(group.name)}
                className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-background/60 transition-colors group/row"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <motion.div
                      animate={{ rotate: isOpen ? 90 : 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
                    </motion.div>
                    {isOpen ? (
                      <FolderOpen className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    ) : (
                      <Folder className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                    )}
                    <span className="text-[13px] font-semibold text-text-primary truncate">
                      {group.name}
                    </span>
                    <span className="text-[10px] text-text-tertiary shrink-0">
                      ({children.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 ml-2 shrink-0">
                    <span className="text-[10px] text-text-tertiary font-medium">
                      {pct.toFixed(1)}%
                    </span>
                    <span className="text-[13px] font-bold text-rose-600 tabular-nums">
                      {formatCurrencyExact(group.total)}
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-border-light overflow-hidden ml-7">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barW}%` }}
                    transition={{ duration: 0.5, delay: gi * 0.04 }}
                    className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500"
                  />
                </div>
              </button>

              {/* Expanded children */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-7 pl-3 border-l-2 border-rose-200/40 space-y-1.5 py-2">
                      {children.map((cat, ci) => {
                        const catPct = total > 0 ? (cat.total / total) * 100 : 0;
                        const catBarW = maxChildTotal > 0 ? (cat.total / maxChildTotal) * 100 : 0;
                        return (
                          <motion.div
                            key={cat.account}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: ci * 0.02 }}
                            className="px-2 py-1.5 rounded-md hover:bg-background/40 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <p className="text-xs text-text-secondary truncate flex-1 min-w-0">
                                {cat.accountName}
                              </p>
                              <div className="flex items-center gap-2 ml-2 shrink-0">
                                <span className="text-[10px] text-text-tertiary">
                                  {catPct.toFixed(1)}%
                                </span>
                                <span className="text-xs font-semibold text-text-primary tabular-nums">
                                  {formatCurrencyExact(cat.total)}
                                </span>
                              </div>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-border-light/60 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${catBarW}%` }}
                                transition={{ duration: 0.4, delay: ci * 0.02 }}
                                className="h-full rounded-full bg-rose-300/80"
                              />
                            </div>
                            <p className="text-[10px] text-text-tertiary mt-0.5">
                              {cat.entryCount} {cat.entryCount === 1 ? "entry" : "entries"}
                            </p>
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
    </div>
  );
}

/* ── Transaction table ── */
function TransactionTable({
  branch,
  fromDate,
  toDate,
}: {
  branch: string;
  fromDate: string;
  toDate: string;
}) {
  const [page, setPage] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "expense-transactions",
      branch,
      fromDate,
      toDate,
      page,
    ],
    queryFn: () =>
      getBranchExpenseTransactions(branch, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    staleTime: 60_000,
  });

  const transactions = data?.transactions ?? [];
  const totalCount = data?.total_count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  /** Strip company suffix from account name for display */
  function shortAccount(account: string): string {
    const parts = account.split(" - ");
    return parts.length > 1 ? parts.slice(0, -1).join(" - ") : account;
  }

  /** Clean up Frappe remarks */
  function cleanRemarks(remarks: string | null): string {
    if (!remarks) return "—";
    return remarks.replace(/^Note:\s*/i, "").trim() || "—";
  }

  return (
    <div className="rounded-xl border border-border-light bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-border-light flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <FileText className="h-4 w-4 text-text-tertiary" />
          Expense Transactions
          {!isLoading && (
            <span className="text-[10px] font-normal text-text-tertiary">
              ({totalCount} total)
            </span>
          )}
        </h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="animate-spin h-5 w-5 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <AlertCircle className="h-5 w-5 text-error" />
          <p className="text-sm text-error">Failed to load transactions</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-text-tertiary">No transactions found</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background text-text-secondary text-[11px] uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5 font-medium">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium">
                    Voucher
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium">
                    Account
                  </th>
                  <th className="text-right px-4 py-2.5 font-medium">
                    Amount
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <motion.tr
                    key={tx.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.01 }}
                    className="border-t border-border-light hover:bg-background/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap text-text-secondary">
                      {formatDate(tx.posting_date)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] font-mono text-text-tertiary">
                        {tx.voucher_no}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text-primary font-medium">
                      {shortAccount(tx.account)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-rose-600">
                      {formatCurrencyExact(tx.debit)}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary max-w-[200px] truncate">
                      {cleanRemarks(tx.remarks)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-border-light flex items-center justify-between">
              <p className="text-xs text-text-tertiary">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded-lg border border-border-light hover:bg-background disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-border-light hover:bg-background disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Page ── */
export default function BranchExpenseDetailPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.branch as string);
  const shortName = branchName
    .replace("Smart Up ", "")
    .replace("Smart Up", "HQ");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["expense-branch-detail", branchName, fromDate, toDate],
    queryFn: () =>
      getBranchExpenseDetail(branchName, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      }),
    staleTime: 120_000,
  });

  const avgPerEntry =
    data && data.entryCount > 0 ? data.total / data.entryCount : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Back & title */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/director/accounts/expense"
          className="p-2 rounded-lg border border-border-light hover:bg-background transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-text-secondary" />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {shortName} Expenses
            </h1>
            <p className="text-sm text-text-secondary">{branchName}</p>
          </div>
        </div>
      </div>

      {/* Date filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-text-tertiary" />
          <span className="text-xs text-text-secondary">From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-border-light bg-surface text-text-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">To</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-border-light bg-surface text-text-primary"
          />
        </div>
        {(fromDate || toDate) && (
          <button
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
            className="text-xs text-primary hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Stat cards */}
      {isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load expense data</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: "Total Expenses",
                value: formatCurrencyExact(data?.total ?? 0),
                icon: Receipt,
                color: "text-rose-600",
                bg: "bg-rose-500/10",
              },
              {
                label: "Journal Entries",
                value: String(data?.entryCount ?? 0),
                icon: Hash,
                color: "text-sky-600",
                bg: "bg-sky-500/10",
              },
              {
                label: "Avg Per Entry",
                value: formatCurrencyExact(avgPerEntry),
                icon: TrendingDown,
                color: "text-amber-600",
                bg: "bg-amber-500/10",
              },
              {
                label: "Categories",
                value: String(data?.categories.length ?? 0),
                icon: FileText,
                color: "text-violet-600",
                bg: "bg-violet-500/10",
              },
            ].map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border-light bg-surface p-3 flex items-center gap-3"
              >
                <div
                  className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}
                >
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                </div>
                <div>
                  {isLoading ? (
                    <Pulse w="w-16" />
                  ) : (
                    <p className={`text-sm font-bold ${c.color}`}>{c.value}</p>
                  )}
                  <p className="text-[10px] text-text-tertiary">{c.label}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Category breakdown */}
          <CategoryBreakdown
            categories={data?.categories ?? []}
            groups={data?.groups ?? []}
            total={data?.total ?? 0}
            isLoading={isLoading}
          />

          {/* Transaction table */}
          <TransactionTable
            branch={branchName}
            fromDate={fromDate}
            toDate={toDate}
          />
        </>
      )}
    </motion.div>
  );
}
