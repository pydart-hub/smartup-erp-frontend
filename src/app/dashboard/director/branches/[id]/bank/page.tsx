"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Landmark,
  Banknote,
  Smartphone,
  Wifi,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  CreditCard,
  Filter,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  getBranchGLEntries,
  getBranchPaymentEntries,
  getBranchJournalEntries,
  type AccountBalance,
  type GLEntryRow,
  type PaymentEntryRow,
  type JournalEntryRow,
} from "@/lib/api/director";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

type TabKey = "ledger" | "payments" | "journals";

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

function getBankEntityName(accounts: AccountBalance[]): string | null {
  const bankAcc = accounts.find((a) => {
    const n = a.account_name.toLowerCase();
    return (
      a.account_type === "Bank" && !n.includes("razorpay") && !n.includes("upi")
    );
  });
  return bankAcc?.account_name ?? null;
}

/* ── GL Entry Table ── */
function GLEntryTable({
  entries,
  isLoading,
}: {
  entries: GLEntryRow[];
  isLoading: boolean;
}) {
  if (isLoading)
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="animate-spin h-5 w-5 text-primary" />
      </div>
    );
  if (!entries.length)
    return (
      <p className="text-sm text-text-tertiary text-center py-8">
        No ledger entries found
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-light text-left">
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs">
              Date
            </th>
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs">
              Account
            </th>
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs">
              Voucher
            </th>
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs text-right">
              Debit
            </th>
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs text-right">
              Credit
            </th>
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs">
              Against
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={e.name}
              className="border-b border-border-light/50 hover:bg-surface-hover transition-colors"
            >
              <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">
                {formatDate(e.posting_date)}
              </td>
              <td className="py-2.5 px-3 text-text-primary font-medium text-xs">
                {e.account}
              </td>
              <td className="py-2.5 px-3">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    {e.voucher_type === "Payment Entry"
                      ? "PE"
                      : e.voucher_type === "Journal Entry"
                        ? "JE"
                        : e.voucher_type === "Sales Invoice"
                          ? "SI"
                          : e.voucher_type}
                  </Badge>
                  <span className="text-xs text-text-secondary">
                    {e.voucher_no}
                  </span>
                </div>
              </td>
              <td className="py-2.5 px-3 text-right">
                {e.debit > 0 ? (
                  <span className="text-emerald-600 font-semibold">
                    {formatCurrency(e.debit)}
                  </span>
                ) : (
                  <span className="text-text-tertiary">—</span>
                )}
              </td>
              <td className="py-2.5 px-3 text-right">
                {e.credit > 0 ? (
                  <span className="text-error font-semibold">
                    {formatCurrency(e.credit)}
                  </span>
                ) : (
                  <span className="text-text-tertiary">—</span>
                )}
              </td>
              <td className="py-2.5 px-3 text-xs text-text-tertiary max-w-[200px] truncate">
                {e.party || e.against || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Payment Entry Table ── */
function PaymentEntryTable({
  entries,
  isLoading,
}: {
  entries: PaymentEntryRow[];
  isLoading: boolean;
}) {
  if (isLoading)
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="animate-spin h-5 w-5 text-primary" />
      </div>
    );
  if (!entries.length)
    return (
      <p className="text-sm text-text-tertiary text-center py-8">
        No payment entries found
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-light text-left">
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs">
              Date
            </th>
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs">
              Name
            </th>
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs">
              Party
            </th>
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs text-right">
              Amount
            </th>
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs">
              Mode
            </th>
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs">
              Paid To
            </th>
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs">
              Reference
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((pe) => (
            <tr
              key={pe.name}
              className="border-b border-border-light/50 hover:bg-surface-hover transition-colors"
            >
              <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">
                {formatDate(pe.posting_date)}
              </td>
              <td className="py-2.5 px-3 text-xs text-text-secondary">
                {pe.name}
              </td>
              <td className="py-2.5 px-3 text-text-primary font-medium text-xs">
                {pe.party_name || pe.party}
              </td>
              <td className="py-2.5 px-3 text-right">
                <span className="text-emerald-600 font-semibold">
                  {formatCurrency(pe.paid_amount)}
                </span>
              </td>
              <td className="py-2.5 px-3">
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 ${
                    pe.mode_of_payment === "Razorpay"
                      ? "border-blue-200 text-blue-600"
                      : pe.mode_of_payment === "Cash"
                        ? "border-emerald-200 text-emerald-600"
                        : pe.mode_of_payment === "UPI"
                          ? "border-violet-200 text-violet-600"
                          : "border-border-light text-text-secondary"
                  }`}
                >
                  {pe.mode_of_payment || "Cash"}
                </Badge>
              </td>
              <td className="py-2.5 px-3 text-xs text-text-tertiary max-w-[150px] truncate">
                {pe.paid_to}
              </td>
              <td className="py-2.5 px-3 text-xs text-text-tertiary max-w-[120px] truncate">
                {pe.reference_no || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Journal Entry Table ── */
function JournalEntryTable({
  entries,
  isLoading,
}: {
  entries: JournalEntryRow[];
  isLoading: boolean;
}) {
  if (isLoading)
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="animate-spin h-5 w-5 text-primary" />
      </div>
    );
  if (!entries.length)
    return (
      <p className="text-sm text-text-tertiary text-center py-8">
        No journal entries found
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-light text-left">
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs">
              Date
            </th>
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs">
              Name
            </th>
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs">
              Title
            </th>
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs text-right">
              Debit
            </th>
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs text-right">
              Credit
            </th>
            <th className="py-2 px-3 text-text-tertiary font-medium text-xs">
              Remark
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((je) => (
            <tr
              key={je.name}
              className="border-b border-border-light/50 hover:bg-surface-hover transition-colors"
            >
              <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">
                {formatDate(je.posting_date)}
              </td>
              <td className="py-2.5 px-3 text-xs text-text-secondary">
                {je.name}
              </td>
              <td className="py-2.5 px-3 text-text-primary font-medium text-xs">
                {je.title}
              </td>
              <td className="py-2.5 px-3 text-right">
                <span className="text-emerald-600 font-semibold">
                  {formatCurrency(je.total_debit)}
                </span>
              </td>
              <td className="py-2.5 px-3 text-right">
                <span className="text-error font-semibold">
                  {formatCurrency(je.total_credit)}
                </span>
              </td>
              <td className="py-2.5 px-3 text-xs text-text-tertiary max-w-[200px] truncate">
                {je.user_remark || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Page ── */
export default function BranchBankPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.id as string);
  const shortName = branchName
    .replace("Smart Up ", "")
    .replace("Smart Up", "HQ");
  const encodedBranch = encodeURIComponent(branchName);

  const [activeTab, setActiveTab] = useState<TabKey>("ledger");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [accountFilter, setAccountFilter] = useState("");

  // GL entries + balances
  const {
    data: glData,
    isLoading: loadGL,
    isError: glError,
  } = useQuery({
    queryKey: [
      "director-branch-gl",
      branchName,
      fromDate,
      toDate,
      accountFilter,
    ],
    queryFn: () =>
      getBranchGLEntries(branchName, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        account: accountFilter || undefined,
        limit: 100,
      }),
    staleTime: 60_000,
  });

  // Payment entries
  const { data: paymentEntries, isLoading: loadPE } = useQuery({
    queryKey: ["director-branch-pe", branchName, fromDate, toDate],
    queryFn: () =>
      getBranchPaymentEntries(branchName, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        limit: 100,
      }),
    staleTime: 60_000,
    enabled: activeTab === "payments",
  });

  // Journal entries
  const { data: journalEntries, isLoading: loadJE } = useQuery({
    queryKey: ["director-branch-je", branchName, fromDate, toDate],
    queryFn: () =>
      getBranchJournalEntries(branchName, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        limit: 100,
      }),
    staleTime: 60_000,
    enabled: activeTab === "journals",
  });

  const accounts = glData?.accounts ?? [];
  const cat = useMemo(() => categoriseAccounts(accounts), [accounts]);
  const entityName = useMemo(() => getBankEntityName(accounts), [accounts]);

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "ledger", label: "GL Ledger", icon: FileText },
    { key: "payments", label: "Payment Entries", icon: CreditCard },
    { key: "journals", label: "Journal Entries", icon: ArrowUpRight },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Back */}
      <motion.div variants={itemVariants}>
        <Link
          href="/dashboard/director/bank"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All Branches
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Bank & Cash — {shortName}
            </h1>
            {entityName && (
              <p className="text-xs font-medium text-primary/80 mt-0.5">
                {entityName}
              </p>
            )}
            <p className="text-sm text-text-secondary mt-0.5">
              Account balances &amp; transactions
            </p>
          </div>
          <Badge variant="outline" className="self-start text-xs">
            {branchName}
          </Badge>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 sm:grid-cols-5 gap-4"
      >
        <Card className="border-border-light">
          <CardContent className="p-4 text-center">
            <Wallet className="h-5 w-5 text-text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">
              {loadGL ? "..." : formatCurrency(cat.total)}
            </p>
            <p className="text-xs text-text-tertiary">Total Balance</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200/60">
          <CardContent className="p-4 text-center">
            <Banknote className="h-5 w-5 text-emerald-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-emerald-600">
              {loadGL ? "..." : formatCurrency(cat.cash)}
            </p>
            <p className="text-xs text-text-tertiary">Cash</p>
          </CardContent>
        </Card>
        <Card className="border-sky-200/60">
          <CardContent className="p-4 text-center">
            <Landmark className="h-5 w-5 text-sky-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-sky-600">
              {loadGL ? "..." : formatCurrency(cat.bank)}
            </p>
            <p className="text-xs text-text-tertiary truncate" title={entityName ?? "Bank"}>{entityName ?? "Bank"}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200/60">
          <CardContent className="p-4 text-center">
            <Wifi className="h-5 w-5 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-600">
              {loadGL ? "..." : formatCurrency(cat.razorpay)}
            </p>
            <p className="text-xs text-text-tertiary">Razorpay</p>
          </CardContent>
        </Card>
        <Card className="border-violet-200/60">
          <CardContent className="p-4 text-center">
            <Smartphone className="h-5 w-5 text-violet-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-violet-600">
              {loadGL ? "..." : formatCurrency(cat.upi)}
            </p>
            <p className="text-xs text-text-tertiary">UPI</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Per-account balances */}
      {accounts.length > 0 && (
        <motion.div variants={itemVariants}>
          <h2 className="text-sm font-semibold text-text-secondary mb-2">
            Account Breakdown
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {accounts.map((a) => (
              <button
                key={a.account}
                onClick={() =>
                  setAccountFilter(
                    accountFilter === a.account ? "" : a.account,
                  )
                }
                className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                  accountFilter === a.account
                    ? "border-primary bg-primary/5"
                    : "border-border-light bg-surface hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  {a.account_type === "Cash" ? (
                    <Banknote className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Landmark className="h-3.5 w-3.5 text-sky-500" />
                  )}
                  <span className="text-xs font-medium text-text-primary">
                    {a.account_name}
                  </span>
                </div>
                <span
                  className={`text-sm font-bold ${a.balance >= 0 ? "text-emerald-600" : "text-error"}`}
                >
                  {formatCurrency(a.balance)}
                </span>
              </button>
            ))}
          </div>
          {accountFilter && (
            <button
              onClick={() => setAccountFilter("")}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Clear account filter
            </button>
          )}
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-text-tertiary" />
            <span className="text-xs text-text-tertiary">Filters:</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs border border-border-light rounded-md px-2 py-1.5 bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs border border-border-light rounded-md px-2 py-1.5 bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
              Clear dates
            </button>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <div className="flex gap-1 border-b border-border-light">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-text-tertiary hover:text-text-secondary"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Tab Content */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-0">
            {activeTab === "ledger" && (
              <GLEntryTable
                entries={glData?.gl_entries ?? []}
                isLoading={loadGL}
              />
            )}
            {activeTab === "payments" && (
              <PaymentEntryTable
                entries={paymentEntries ?? []}
                isLoading={loadPE}
              />
            )}
            {activeTab === "journals" && (
              <JournalEntryTable
                entries={journalEntries ?? []}
                isLoading={loadJE}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Error state */}
      {glError && (
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load bank data</p>
        </div>
      )}
    </motion.div>
  );
}
