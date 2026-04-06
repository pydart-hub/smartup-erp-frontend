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
  Landmark,
  Banknote,
  Smartphone,
  Wifi,
  Wallet,
  FileBarChart,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Input } from "@/components/ui/Input";
import {
  getAllBranches,
  getBranchBankOverview,
  type AccountBalance,
} from "@/lib/api/director";
import { formatCurrencyExact } from "@/lib/utils/formatters";

/* ── helpers ── */
const Pulse = ({ w = "w-14" }: { w?: string }) => (
  <span
    className={`inline-block ${w} h-5 bg-border-light rounded animate-pulse`}
  />
);

function categoriseAccounts(accounts: AccountBalance[]) {
  let cash = 0;
  let bank = 0;
  let razorpay = 0;
  let upi = 0;
  for (const a of accounts) {
    const n = a.account_name.toLowerCase();
    if (n.includes("razorpay")) razorpay += a.balance;
    else if (n.includes("upi")) upi += a.balance;
    else if (a.account_type === "Cash") cash += a.balance;
    else bank += a.balance;
  }
  return { cash, bank, razorpay, upi, total: cash + bank + razorpay + upi };
}

/** Extract the LLP / entity bank account name (not Cash, Razorpay, or UPI). */
function getBankEntityName(accounts: AccountBalance[]): string | null {
  const entity = accounts.find((a) => {
    if (a.account_type !== "Bank") return false;
    const n = a.account_name.toLowerCase();
    return !n.includes("razorpay") && !n.includes("upi");
  });
  return entity?.account_name ?? null;
}

/* ── Branch card ── */
function BranchBankCard({
  branch,
}: {
  branch: { name: string; abbr: string };
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["director-branch-bank-overview", branch.name],
    queryFn: () => getBranchBankOverview(branch.name),
    staleTime: 120_000,
  });

  const shortName = branch.name
    .replace("Smart Up ", "")
    .replace("Smart Up", "HQ");
  const cat = data ? categoriseAccounts(data.accounts) : null;
  const entityName = data ? getBankEntityName(data.accounts) : null;

  return (
    <Link
      href={`/dashboard/director/branches/${encodeURIComponent(branch.name)}/bank`}
    >
      <motion.div
        whileHover={{ y: -2 }}
        className="rounded-xl border border-border-light bg-surface p-4 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer flex flex-col gap-3"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {shortName}
              </p>
              {isLoading ? (
                <Pulse w="w-20" />
              ) : entityName ? (
                <p className="text-[10px] text-text-tertiary truncate max-w-[180px]" title={entityName}>
                  {entityName}
                </p>
              ) : (
                <p className="text-xs text-text-tertiary">{branch.abbr}</p>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-text-tertiary" />
        </div>

        {/* Total balance */}
        <div className="text-center py-1">
          {isLoading ? (
            <Pulse w="w-24" />
          ) : (
            <p className="text-xl font-bold text-text-primary">
              {formatCurrencyExact(cat?.total ?? 0)}
            </p>
          )}
          <p className="text-[10px] text-text-tertiary">Total Balance</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-emerald-500/5 px-2.5 py-1.5">
            <p className="text-[10px] text-emerald-600/80 flex items-center gap-0.5 mb-0.5">
              <Banknote className="h-2.5 w-2.5" /> Cash
            </p>
            {isLoading ? (
              <Pulse />
            ) : (
              <p className="text-sm font-bold text-emerald-600">
                {formatCurrencyExact(cat?.cash ?? 0)}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-sky-500/5 px-2.5 py-1.5">
            <p className="text-[10px] text-sky-600/80 flex items-center gap-0.5 mb-0.5 truncate" title={entityName ?? "Bank"}>
              <Landmark className="h-2.5 w-2.5 shrink-0" /> {entityName ?? "Bank"}
            </p>
            {isLoading ? (
              <Pulse />
            ) : (
              <p className="text-sm font-bold text-sky-600">
                {formatCurrencyExact(cat?.bank ?? 0)}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-blue-500/5 px-2.5 py-1.5">
            <p className="text-[10px] text-blue-600/80 flex items-center gap-0.5 mb-0.5">
              <Wifi className="h-2.5 w-2.5" /> Razorpay
            </p>
            {isLoading ? (
              <Pulse />
            ) : (
              <p className="text-sm font-bold text-blue-600">
                {formatCurrencyExact(cat?.razorpay ?? 0)}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-violet-500/5 px-2.5 py-1.5">
            <p className="text-[10px] text-violet-600/80 flex items-center gap-0.5 mb-0.5">
              <Smartphone className="h-2.5 w-2.5" /> UPI
            </p>
            {isLoading ? (
              <Pulse />
            ) : (
              <p className="text-sm font-bold text-violet-600">
                {formatCurrencyExact(cat?.upi ?? 0)}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

/* ── Aggregate summary ── */
function SummaryCards({ branches }: { branches: { name: string }[] }) {
  const queries = branches.map((b) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ["director-branch-bank-overview", b.name],
      queryFn: () => getBranchBankOverview(b.name),
      staleTime: 120_000,
    }),
  );

  const anyLoading = queries.some((q) => q.isLoading);

  const totals = queries.reduce(
    (acc, q) => {
      if (!q.data) return acc;
      const cat = categoriseAccounts(q.data.accounts);
      acc.cash += cat.cash;
      acc.bank += cat.bank;
      acc.razorpay += cat.razorpay;
      acc.upi += cat.upi;
      acc.total += cat.total;
      return acc;
    },
    { cash: 0, bank: 0, razorpay: 0, upi: 0, total: 0 },
  );

  const cards = [
    {
      label: "Total Balance",
      value: formatCurrencyExact(totals.total),
      icon: Wallet,
      color: "text-text-primary",
      bg: "bg-border-light",
    },
    {
      label: "Cash",
      value: formatCurrencyExact(totals.cash),
      icon: Banknote,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Bank",
      value: formatCurrencyExact(totals.bank),
      icon: Landmark,
      color: "text-sky-600",
      bg: "bg-sky-500/10",
    },
    {
      label: "Razorpay",
      value: formatCurrencyExact(totals.razorpay),
      icon: Wifi,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
    },
    {
      label: "UPI",
      value: formatCurrencyExact(totals.upi),
      icon: Smartphone,
      color: "text-violet-600",
      bg: "bg-violet-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c, i) => (
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
            {anyLoading ? (
              <Pulse w="w-16" />
            ) : (
              <p className={`text-sm font-bold ${c.color}`}>{c.value}</p>
            )}
            <p className="text-[10px] text-text-tertiary">{c.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Page ── */
export default function CollectionPage() {
  const {
    data: branches,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 300_000,
  });

  const [search, setSearch] = useState("");
  const activeBranches = useMemo(
    () => (branches ?? []).filter((b) => b.name !== "Smart Up"),
    [branches],
  );
  const filtered = search
    ? activeBranches.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase()),
      )
    : activeBranches;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <BreadcrumbNav />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Bank & Cash Overview
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Account balances across all branches
          </p>
        </div>
        <Link
          href="/dashboard/director/accounts/collection/consolidated"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm w-fit"
        >
          <FileBarChart className="h-4 w-4" />
          Consolidated Report
        </Link>
      </div>

      {/* Aggregate summary */}
      {!isLoading && !isError && activeBranches.length > 0 && (
        <SummaryCards branches={activeBranches} />
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <Input
          placeholder="Search branches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load branches</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((branch, i) => (
            <motion.div
              key={branch.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <BranchBankCard branch={branch} />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
