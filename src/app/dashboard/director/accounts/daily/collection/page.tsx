"use client";

import React, { Suspense, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Landmark,
  ChevronLeft,
  ChevronDown,
  User,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Smartphone,
  Banknote,
  Building2,
  Receipt,
  Layers,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { GifLoader } from "@/components/ui/GifLoader";
import { formatCurrencyExact } from "@/lib/utils/formatters";

function getModeIcon(mode: string) {
  const m = mode.toLowerCase();
  if (m.includes("upi") || m.includes("gpay") || m.includes("phonepe") || m.includes("paytm")) {
    return <Smartphone className="h-4 w-4" />;
  }
  if (m.includes("bank") || m.includes("transfer") || m.includes("neft") || m.includes("rtgs")) {
    return <Building2 className="h-4 w-4" />;
  }
  if (m.includes("cofee") || m.includes("co-fee") || m.includes("fee")) {
    return <Receipt className="h-4 w-4" />;
  }
  if (m.includes("cash")) {
    return <Banknote className="h-4 w-4" />;
  }
  return <CreditCard className="h-4 w-4" />;
}

function getModeTheme(mode: string) {
  const m = mode.toLowerCase();
  if (m.includes("upi")) {
    return {
      activeCard: "border-purple-600 bg-purple-500/[0.04] ring-1 ring-purple-500/30",
      activeTab: "bg-purple-600 text-white shadow-sm shadow-purple-600/25",
      badge: "bg-purple-50 text-purple-700 border-purple-200/80",
      iconBg: "bg-purple-100/70 text-purple-700",
      dot: "bg-purple-500",
      text: "text-purple-700",
    };
  }
  if (m.includes("bank")) {
    return {
      activeCard: "border-blue-600 bg-blue-500/[0.04] ring-1 ring-blue-500/30",
      activeTab: "bg-blue-600 text-white shadow-sm shadow-blue-600/25",
      badge: "bg-blue-50 text-blue-700 border-blue-200/80",
      iconBg: "bg-blue-100/70 text-blue-700",
      dot: "bg-blue-500",
      text: "text-blue-700",
    };
  }
  if (m.includes("cofee") || m.includes("fee")) {
    return {
      activeCard: "border-amber-600 bg-amber-500/[0.04] ring-1 ring-amber-500/30",
      activeTab: "bg-amber-600 text-white shadow-sm shadow-amber-600/25",
      badge: "bg-amber-50 text-amber-800 border-amber-200/80",
      iconBg: "bg-amber-100/70 text-amber-800",
      dot: "bg-amber-500",
      text: "text-amber-800",
    };
  }
  if (m.includes("cash")) {
    return {
      activeCard: "border-emerald-600 bg-emerald-500/[0.04] ring-1 ring-emerald-500/30",
      activeTab: "bg-emerald-600 text-white shadow-sm shadow-emerald-600/25",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      iconBg: "bg-emerald-100/70 text-emerald-700",
      dot: "bg-emerald-500",
      text: "text-emerald-700",
    };
  }
  return {
    activeCard: "border-slate-600 bg-slate-500/[0.04] ring-1 ring-slate-500/30",
    activeTab: "bg-slate-700 text-white shadow-sm shadow-slate-700/25",
    badge: "bg-slate-50 text-slate-700 border-slate-200/80",
    iconBg: "bg-slate-100/70 text-slate-700",
    dot: "bg-slate-500",
    text: "text-slate-700",
  };
}

interface DailyCollectionItem {
  name: string;
  party: string;
  party_name: string;
  company: string;
  posting_date: string;
  paid_amount: number;
  mode_of_payment: string;
  reference_no: string;
}

function DailyCollectionDetailsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFromDate = searchParams.get("from_date") || searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const initialToDate = searchParams.get("to_date") || searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [selectedModes, setSelectedModes] = useState<Record<string, string | null>>({});

  // Fetch Collections
  const { data: collections, isLoading } = useQuery<DailyCollectionItem[]>({
    queryKey: ["director-today-collected", fromDate, toDate],
    queryFn: async () => {
      const res = await fetch(`/api/director/today-collected?from_date=${fromDate}&to_date=${toDate}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch collections");
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 60_000,
  });

  const totalCollected = useMemo(() => {
    return (collections ?? []).reduce((sum, item) => sum + (item.paid_amount ?? 0), 0);
  }, [collections]);

  // Group by branch, then inside each branch group by mode of payment
  const branchGroups = useMemo(() => {
    interface ModeGroup {
      mode: string;
      total: number;
      items: DailyCollectionItem[];
    }
    const groups: Record<
      string,
      {
        total: number;
        items: DailyCollectionItem[];
        modes: Record<string, ModeGroup>;
      }
    > = {};

    for (const c of collections ?? []) {
      const branchName = c.company.replace("Smart Up ", "").replace("Smart Up", "HQ");
      if (!groups[branchName]) {
        groups[branchName] = { total: 0, items: [], modes: {} };
      }
      groups[branchName].total += c.paid_amount;
      groups[branchName].items.push(c);

      const modeKey = (c.mode_of_payment || "Other").trim();
      if (!groups[branchName].modes[modeKey]) {
        groups[branchName].modes[modeKey] = { mode: modeKey, total: 0, items: [] };
      }
      groups[branchName].modes[modeKey].total += c.paid_amount;
      groups[branchName].modes[modeKey].items.push(c);
    }

    return Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
  }, [collections]);

  const toggleBranch = (branchName: string) => {
    if (expandedBranch === branchName) {
      setExpandedBranch(null);
    } else {
      setExpandedBranch(branchName);
      // Auto-select first mode if not already selected
      const group = branchGroups.find(([b]) => b === branchName);
      if (group && !selectedModes[branchName]) {
        const firstMode = Object.keys(group[1].modes)[0] ?? null;
        setSelectedModes((prev) => ({ ...prev, [branchName]: firstMode }));
      }
    }
  };

  const handleSelectMode = (branchName: string, mode: string) => {
    setSelectedModes((prev) => ({
      ...prev,
      [branchName]: prev[branchName] === mode ? null : mode,
    }));
  };

  const handleFromDateChange = (date: string) => {
    setFromDate(date);
    router.replace(`/dashboard/director/accounts/daily/collection?from_date=${date}&to_date=${toDate}`);
  };

  const handleToDateChange = (date: string) => {
    setToDate(date);
    router.replace(`/dashboard/director/accounts/daily/collection?from_date=${fromDate}&to_date=${date}`);
  };

  const formattedDateRange = useMemo(() => {
    if (fromDate === toDate) {
      return new Date(fromDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    const f = new Date(fromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const t = new Date(toDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    return `${f} - ${t}`;
  }, [fromDate, toDate]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/director/accounts/daily?from_date=${fromDate}&to_date=${toDate}`)}
            className="w-10 h-10 rounded-xl border border-border-light hover:bg-surface-hover flex items-center justify-center text-text-secondary hover:text-text-primary transition-all shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <Landmark className="h-6 w-6 text-emerald-600" /> Daily Collections by Branch
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Financial break down for {formattedDateRange}
            </p>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => handleFromDateChange(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm rounded-lg border border-border-light bg-surface hover:bg-surface-hover text-text-primary focus:border-primary outline-none transition-colors"
            />
          </div>
          <span className="text-text-secondary text-xs">to</span>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
            <input
              type="date"
              value={toDate}
              onChange={(e) => handleToDateChange(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm rounded-lg border border-border-light bg-surface hover:bg-surface-hover text-text-primary focus:border-primary outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <GifLoader size="lg" />
          <p className="text-sm text-text-secondary">Loading branch collections...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Total Collections Card */}
          <div className="rounded-2xl border border-border-light bg-surface p-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-text-tertiary">Grand Total Collections</p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-0.5">
                  {formatCurrencyExact(totalCollected)}
                </p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-text-tertiary">Active Branches</p>
              <p className="text-lg font-bold text-text-primary mt-0.5">{branchGroups.length} Branches</p>
            </div>
          </div>

          {/* Branch-wise breakdown list */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider px-1">
              Branches List (Click a branch to view detailed transactions)
            </h2>

            {branchGroups.length > 0 ? (
              branchGroups.map(([branchName, data]) => {
                const isExpanded = expandedBranch === branchName;
                return (
                  <div
                    key={branchName}
                    className="border border-border-light rounded-2xl bg-surface overflow-hidden shadow-sm hover:border-emerald-500/10 transition-colors"
                  >
                    {/* Branch Summary Header Bar */}
                    <button
                      onClick={() => toggleBranch(branchName)}
                      className={`w-full flex items-center justify-between p-5 text-left transition-colors focus:outline-none ${
                        isExpanded ? "bg-surface-hover/40" : "hover:bg-surface-hover/30"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-colors shrink-0 ${
                            isExpanded
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                              : "bg-background border-border-light text-text-secondary"
                          }`}
                        >
                          <Landmark className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-text-primary tracking-tight">
                            {branchName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-text-secondary font-medium">
                              {data.items.length} payments
                            </span>
                            <span className="text-text-tertiary text-xs">•</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {Object.entries(data.modes).map(([mName, mInfo]) => (
                                <span
                                  key={mName}
                                  className="text-[10px] font-semibold text-text-tertiary bg-background/80 border border-border-light/60 px-1.5 py-0.5 rounded-md"
                                >
                                  {mName}: {mInfo.items.length}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-extrabold text-text-primary tabular-nums">
                            {formatCurrencyExact(data.total)}
                          </p>
                          <p className="text-[11px] text-text-tertiary">
                            {Object.keys(data.modes).length} payment modes
                          </p>
                        </div>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-border-light bg-background/50 text-text-tertiary transition-transform duration-200 ${isExpanded ? "rotate-180 bg-surface shadow-xs" : ""}`}>
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                    </button>

                    {/* Modes Breakdown & Detailed Transactions */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="border-t border-border-light bg-slate-50/50 dark:bg-background/40"
                        >
                          <div className="p-5 sm:p-6 space-y-5">
                            {/* Segmented Mode Selector Bar */}
                            <div>
                              <div className="flex items-center justify-between mb-2.5">
                                <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
                                  Collection by Mode
                                </span>
                                <span className="text-xs text-text-tertiary">
                                  Select a mode to filter entries
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {Object.entries(data.modes)
                                  .sort((a, b) => b[1].total - a[1].total)
                                  .map(([modeName, modeData]) => {
                                    const isModeActive = selectedModes[branchName] === modeName;
                                    const theme = getModeTheme(modeName);
                                    return (
                                      <button
                                        key={modeName}
                                        type="button"
                                        onClick={() => handleSelectMode(branchName, modeName)}
                                        className={`group relative flex flex-col p-3.5 rounded-xl border text-left transition-all duration-150 ${
                                          isModeActive
                                            ? `${theme.activeCard} bg-surface shadow-xs`
                                            : "bg-surface hover:bg-surface-hover/70 border-border-light/80 hover:border-border text-text-primary"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between w-full mb-2">
                                          <div className="flex items-center gap-2">
                                            <div
                                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                                isModeActive
                                                  ? theme.iconBg
                                                  : "bg-surface-hover text-text-secondary group-hover:text-text-primary"
                                              }`}
                                            >
                                              {getModeIcon(modeName)}
                                            </div>
                                            <span className="text-xs font-bold text-text-primary">
                                              {modeName}
                                            </span>
                                          </div>
                                          <span
                                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                              isModeActive
                                                ? `${theme.badge}`
                                                : "bg-background text-text-secondary border-border-light"
                                            }`}
                                          >
                                            {modeData.items.length} txns
                                          </span>
                                        </div>

                                        <div className="flex items-baseline justify-between mt-1">
                                          <span className="text-base font-extrabold text-text-primary tabular-nums tracking-tight">
                                            {formatCurrencyExact(modeData.total)}
                                          </span>
                                          <span className="text-[10px] text-text-tertiary font-medium">
                                            {((modeData.total / data.total) * 100).toFixed(0)}%
                                          </span>
                                        </div>

                                        {/* Bottom active accent indicator bar */}
                                        {isModeActive && (
                                          <motion.div
                                            layoutId={`active-bar-${branchName}`}
                                            className={`absolute -bottom-[1px] left-3 right-3 h-[2px] rounded-full ${theme.dot}`}
                                          />
                                        )}
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>

                            {/* Mode Specific Transactions Table */}
                            {selectedModes[branchName] && data.modes[selectedModes[branchName]!] ? (
                              <div className="border border-border-light rounded-xl bg-surface overflow-hidden shadow-xs">
                                <div className="px-4 py-3 bg-surface border-b border-border-light/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2.5">
                                    <span
                                      className={`w-2.5 h-2.5 rounded-full ${
                                        getModeTheme(selectedModes[branchName]!).dot
                                      }`}
                                    />
                                    <span className="text-xs font-bold text-text-primary">
                                      {selectedModes[branchName]} Transactions
                                    </span>
                                    <span className="text-[11px] text-text-tertiary">
                                      ({data.modes[selectedModes[branchName]!].items.length} records)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-text-tertiary">Subtotal:</span>
                                    <span className="text-sm font-extrabold text-emerald-600 tabular-nums">
                                      {formatCurrencyExact(data.modes[selectedModes[branchName]!].total)}
                                    </span>
                                  </div>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="border-b border-border-light/60 text-[10px] uppercase font-bold text-text-tertiary bg-slate-50/70 dark:bg-background/50">
                                        <th className="px-4 py-2.5">Student Name</th>
                                        <th className="px-4 py-2.5">Receipt / Ref No</th>
                                        <th className="px-4 py-2.5">Date</th>
                                        <th className="px-4 py-2.5 text-right">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-light/40 text-xs text-text-primary">
                                      {data.modes[selectedModes[branchName]!].items.map((item) => (
                                        <tr key={item.name} className="hover:bg-surface-hover/40 transition-colors">
                                          <td className="px-4 py-3 font-semibold">
                                            <div className="flex items-center gap-2.5">
                                              <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                                <User className="h-3.5 w-3.5" />
                                              </div>
                                              <div>
                                                <span className="text-text-primary">{item.party_name}</span>
                                                <p className="text-[10px] text-text-tertiary font-mono">{item.party}</p>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                                            {item.reference_no || item.name}
                                          </td>
                                          <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                                            {item.posting_date}
                                          </td>
                                          <td className="px-4 py-3 text-right font-extrabold text-text-primary tabular-nums whitespace-nowrap">
                                            {formatCurrencyExact(item.paid_amount)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              <div className="py-8 text-center border border-dashed border-border-light rounded-xl bg-surface/60">
                                <p className="text-xs text-text-secondary font-medium">
                                  Click any payment mode card above to view transactions.
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center bg-surface border border-border-light rounded-2xl shadow-sm">
                <p className="text-sm text-text-tertiary">No collections recorded for this date.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function DailyCollectionDetails() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
      <DailyCollectionDetailsInner />
    </Suspense>
  );
}
