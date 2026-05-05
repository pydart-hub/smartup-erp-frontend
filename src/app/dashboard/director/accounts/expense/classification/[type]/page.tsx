"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  Receipt,
  Hash,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import {
  getClassOverview,
  type ExpenseParentFilter,
} from "@/lib/api/expenses";
import type { ExpenseClassKey } from "@/lib/utils/expense-classification";
import { formatCurrencyExact } from "@/lib/utils/formatters";
import { AnimatedCurrency } from "@/components/dashboard/AnimatedValue";

/* ── Config per type ──────────────────────────────────────────────── */
type ClassType = "branch" | "ho" | "overall";

const TYPE_CONFIG: Record<ClassType, {
  title: string;
  subtitle: string;
  classParent: ExpenseParentFilter | "ALL";
  slices: Array<{ key: ExpenseClassKey; label: string; color: string }>;
}> = {
  branch: {
    title: "Branch Expenses",
    subtitle: "All branch-level expenditures across locations",
    classParent: "BRANCH",
    slices: [
      { key: "BRANCH_FIXED",    label: "Branch Fixed",    color: "#f43f5e" },
      { key: "BRANCH_VARIABLE", label: "Branch Variable", color: "#fb7185" },
    ],
  },
  ho: {
    title: "Head Office Expenses",
    subtitle: "All head-office level expenditures across locations",
    classParent: "HO",
    slices: [
      { key: "HO_FIXED",    label: "HO Fixed",    color: "#f97316" },
      { key: "HO_VARIABLE", label: "HO Variable", color: "#fdba74" },
    ],
  },
  overall: {
    title: "Overall Expenses",
    subtitle: "All classified expenditures across all branches",
    classParent: "ALL",
    slices: [
      { key: "BRANCH_FIXED",    label: "Branch Fixed",    color: "#f43f5e" },
      { key: "BRANCH_VARIABLE", label: "Branch Variable", color: "#fb7185" },
      { key: "HO_FIXED",        label: "HO Fixed",        color: "#f97316" },
      { key: "HO_VARIABLE",     label: "HO Variable",     color: "#fdba74" },
    ],
  },
};

/* ── Donut helpers ─────────────────────────────────────────────────── */
type ArcSlice = { path: string; color: string; label: string; value: number; pct: number };

function buildArcs(
  slices: Array<{ key: ExpenseClassKey; color: string; label: string }>,
  totalsMap: Map<string, number>,
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

/* ── Pulse skeleton ─────────────────────────────────────────────────── */
const Pulse = ({ w = "w-14" }: { w?: string }) => (
  <span className={`inline-block ${w} h-5 bg-border-light rounded animate-pulse`} />
);

/* ── Page ────────────────────────────────────────────────────────────── */
export default function ClassificationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const typeParam = (params.type as string ?? "").toLowerCase() as ClassType;
  const config = TYPE_CONFIG[typeParam] ?? TYPE_CONFIG.overall;

  const [expandedBranches, setExpandedBranches] = useState(false);
  const [expandedBranchRows, setExpandedBranchRows] = useState<Set<string>>(new Set());
  const [expandedCats, setExpandedCats] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["class-overview", typeParam],
    queryFn: () => getClassOverview(config.classParent === "ALL" ? undefined : config.classParent),
    staleTime: 120_000,
  });

  const totalsMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const ct of data?.classTotals ?? []) m.set(ct.key, ct.total);
    return m;
  }, [data]);

  const total = data?.total ?? 0;
  const entryCount = data?.entryCount ?? 0;
  const avgPerEntry = entryCount > 0 ? total / entryCount : 0;

  const R = 72; const ri = 42; const CC = 90; // viewBox 180×180
  const arcs = buildArcs(config.slices, totalsMap, total, R, ri, CC, CC);

  const shortName = (n: string) => n.replace("Smart Up ", "").replace("Smart Up", "HQ");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-500/15 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{config.title}</h1>
            <p className="text-sm text-text-secondary mt-0.5">{config.subtitle}</p>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Expenses", value: total, icon: Receipt, accent: "text-rose-600", bg: "bg-rose-500/15", iconColor: "text-rose-500" },
          { label: "Journal Entries", value: entryCount, icon: Hash, accent: "text-blue-600", bg: "bg-blue-500/15", iconColor: "text-blue-500", noDecimal: true },
          { label: "Avg Per Entry",   value: avgPerEntry, icon: TrendingDown, accent: "text-amber-600", bg: "bg-amber-500/15", iconColor: "text-amber-500" },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-border-light bg-surface p-4 flex items-center gap-3"
          >
            <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
              <card.icon className={`h-4.5 w-4.5 ${card.iconColor}`} />
            </div>
            <div className="min-w-0">
              {isLoading ? <Pulse w="w-20" /> : (
                <AnimatedCurrency
                  value={card.value}
                  decimals={!card.noDecimal}
                  className={`text-base font-bold ${card.accent}`}
                />
              )}
              <p className="text-[10px] text-text-tertiary mt-0.5 truncate">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main content: donut + legend */}
      <div className="rounded-xl border border-border-light bg-surface p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-5">Classification Breakdown</h3>

        {isLoading ? (
          <div className="flex gap-8 items-center">
            <div className="w-44 h-44 rounded-full bg-border-light/40 animate-pulse shrink-0" />
            <div className="flex-1 space-y-3">{[1,2,3,4].map(i => <Pulse key={i} w="w-full" />)}</div>
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 text-error text-sm"><AlertCircle className="h-5 w-5" />Failed to load data</div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* Donut */}
            <div className="shrink-0">
              <svg width={180} height={180} viewBox="0 0 180 180">
                {arcs.map((sl, i) =>
                  sl.path ? (
                    <motion.path
                      key={i}
                      d={sl.path}
                      fill={sl.color}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="hover:opacity-75 transition-opacity"
                    />
                  ) : null,
                )}
                <text x={CC} y={CC - 8} textAnchor="middle" fill="#6b7280" style={{ fontSize: 11, fontWeight: 600 }}>Total</text>
                <text x={CC} y={CC + 8} textAnchor="middle" fill="#f43f5e" style={{ fontSize: 11, fontWeight: 700 }}>
                  ₹{(total / 1000).toFixed(1)}k
                </text>
              </svg>
            </div>

            {/* Per-slice legend */}
            <div className="flex-1 w-full space-y-3">
              {arcs.map((sl, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: sl.color }} />
                      <span className="text-sm font-medium text-text-primary truncate">{sl.label}</span>
                    </div>
                    <div className="flex items-center gap-2.5 ml-2 shrink-0">
                      <span className="text-[11px] text-text-tertiary">{(sl.pct * 100).toFixed(1)}%</span>
                      <span className="text-sm font-semibold text-rose-600 tabular-nums">{formatCurrencyExact(sl.value)}</span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-border-light/60 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${sl.pct * 100}%` }}
                      transition={{ duration: 0.5, delay: i * 0.07 }}
                      className="h-full rounded-full"
                      style={{ background: sl.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Branch breakdown */}
      <div className="rounded-xl border border-border-light bg-surface overflow-hidden">
        <button
          onClick={() => setExpandedBranches((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-background/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-text-tertiary" />
            <span className="text-sm font-semibold text-text-primary">Branch Breakdown</span>
            {data && <span className="text-[11px] text-text-tertiary ml-1">({data.branchBreakdown.length} branches)</span>}
          </div>
          <motion.span animate={{ rotate: expandedBranches ? 0 : -90 }} transition={{ duration: 0.2 }} className="text-text-tertiary">
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {expandedBranches && (
            <motion.div
              key="branches"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-4 space-y-2.5">
                {isLoading ? (
                  [1,2,3,4].map(i => <Pulse key={i} w="w-full" />)
                ) : (data?.branchBreakdown ?? []).map((branch, i) => {
                  const isOpen = expandedBranchRows.has(branch.company);
                  return (
                    <motion.div
                      key={branch.company}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="rounded-lg border border-border-light/50 overflow-hidden"
                    >
                      {/* Branch header row — clickable */}
                      <button
                        onClick={() => setExpandedBranchRows(prev => {
                          const next = new Set(prev);
                          isOpen ? next.delete(branch.company) : next.add(branch.company);
                          return next;
                        })}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-background/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded bg-rose-500/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-3 w-3 text-rose-500" />
                          </div>
                          <span className="text-xs font-medium text-text-primary truncate">{shortName(branch.company)}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <span className="text-[10px] text-text-tertiary">{branch.pct.toFixed(1)}%</span>
                          <span className="text-xs font-semibold text-rose-600 tabular-nums">{formatCurrencyExact(branch.total)}</span>
                          <motion.span animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.18 }} className="text-text-tertiary ml-0.5">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </motion.span>
                        </div>
                      </button>
                      {/* Progress bar */}
                      <div className="px-3 pb-2">
                        <div className="w-full h-1.5 rounded-full bg-border-light/60 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${branch.pct}%` }}
                            transition={{ duration: 0.45, delay: i * 0.03 }}
                            className="h-full rounded-full bg-rose-400/80"
                          />
                        </div>
                      </div>
                      {/* Expandable Fixed / Variable rows */}
                      <AnimatePresence initial={false}>
                        {isOpen && branch.byClass.length > 0 && (
                          <motion.div
                            key="byclass"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden border-t border-border-light/50"
                          >
                            <div className="px-3 py-2 space-y-1.5 bg-background/30">
                              {branch.byClass.map((cls) => (
                                <div key={cls.key} className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: config.slices.find(s => s.key === cls.key)?.color ?? "#f43f5e" }} />
                                  <span className="text-[11px] text-text-secondary flex-1 truncate">{cls.label}</span>
                                  <span className="text-[10px] text-text-tertiary tabular-nums">{cls.pct.toFixed(1)}%</span>
                                  <span className="text-[11px] font-semibold text-rose-600 tabular-nums">{formatCurrencyExact(cls.total)}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Top categories */}
      <div className="rounded-xl border border-border-light bg-surface overflow-hidden">
        <button
          onClick={() => setExpandedCats((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-background/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-text-tertiary" />
            <span className="text-sm font-semibold text-text-primary">Top Expense Accounts</span>
            {data && <span className="text-[11px] text-text-tertiary ml-1">({data.topCategories.length} accounts)</span>}
          </div>
          <motion.span animate={{ rotate: expandedCats ? 0 : -90 }} transition={{ duration: 0.2 }} className="text-text-tertiary">
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {expandedCats && (
            <motion.div
              key="cats"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-4">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-[10px] font-semibold text-text-tertiary uppercase tracking-wide pb-2 border-b border-border-light mb-2">
                  <span>Account</span>
                  <span className="text-right">Class</span>
                  <span className="text-right">Amount</span>
                </div>
                {isLoading ? (
                  [1,2,3,4,5].map(i => <Pulse key={i} w="w-full" />)
                ) : (
                  <div className="space-y-1">
                    {(data?.topCategories ?? []).map((cat, i) => {
                      const catPct = total > 0 ? (cat.total / total) * 100 : 0;
                      const sliceColor = config.slices.find((s) => s.key === cat.expenseClass)?.color ?? "#94a3b8";
                      return (
                        <motion.div
                          key={`${cat.accountName}-${i}`}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="grid grid-cols-[1fr_auto_auto] gap-2 items-center py-1.5 px-2 rounded-md hover:bg-background/40 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-text-primary truncate">{cat.accountName}</p>
                            <div className="w-full h-1 rounded-full bg-border-light/50 overflow-hidden mt-0.5">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${catPct}%` }}
                                transition={{ duration: 0.4, delay: i * 0.02 }}
                                className="h-full rounded-full"
                                style={{ background: sliceColor }}
                              />
                            </div>
                          </div>
                          <span className="text-[9px] font-medium text-text-tertiary whitespace-nowrap px-1.5 py-0.5 rounded bg-border-light/50">
                            {cat.label.replace(" Expense", "")}
                          </span>
                          <span className="text-xs font-semibold text-text-primary tabular-nums text-right">
                            {formatCurrencyExact(cat.total)}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
