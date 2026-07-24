"use client";

import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { GifLoader } from "@/components/ui/GifLoader";
import { formatCurrencyExact } from "@/lib/utils/formatters";

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

export default function DailyCollectionDetails() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFromDate = searchParams.get("from_date") || searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const initialToDate = searchParams.get("to_date") || searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);

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

  // Group by branch
  const branchGroups = useMemo(() => {
    const groups: Record<string, { total: number; items: DailyCollectionItem[] }> = {};
    for (const c of collections ?? []) {
      const branchName = c.company.replace("Smart Up ", "").replace("Smart Up", "HQ");
      if (!groups[branchName]) {
        groups[branchName] = { total: 0, items: [] };
      }
      groups[branchName].total += c.paid_amount;
      groups[branchName].items.push(c);
    }
    return Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
  }, [collections]);

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
                    {/* Branch Summary Panel (Button) */}
                    <button
                      onClick={() => setExpandedBranch(isExpanded ? null : branchName)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-hover/50 transition-colors focus:outline-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10 shrink-0">
                          <Landmark className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-primary">{branchName}</p>
                          <p className="text-xs text-text-tertiary mt-0.5">{data.items.length} payments collected</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-base font-extrabold text-emerald-600">
                            {formatCurrencyExact(data.total)}
                          </p>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-text-tertiary transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {/* Detailed Transactions List */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-border-light bg-background/30 overflow-hidden"
                        >
                          <div className="p-4 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-border-light text-[10px] uppercase font-bold text-text-tertiary bg-background/50">
                                  <th className="px-4 py-3">Student Name</th>
                                  <th className="px-4 py-3">Ref/Receipt No</th>
                                  <th className="px-4 py-3">Payment Mode</th>
                                  <th className="px-4 py-3 text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border-light/40 text-xs text-text-primary">
                                {data.items.map((item) => (
                                  <tr key={item.name} className="hover:bg-background/20 transition-colors">
                                    <td className="px-4 py-3 font-semibold flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                        <User className="h-3 w-3 text-emerald-600" />
                                      </div>
                                      <span>{item.party_name}</span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[10px] text-text-tertiary">{item.reference_no || item.name}</td>
                                    <td className="px-4 py-3">
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-[10px] font-medium text-emerald-600">
                                        {item.mode_of_payment}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                      {formatCurrencyExact(item.paid_amount)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
