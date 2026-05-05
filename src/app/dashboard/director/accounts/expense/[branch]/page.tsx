"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  FileText,
  FolderOpen,
  Folder,
  ChevronDown,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import {
  EXPENSE_CLASS_LABELS,
  EXPENSE_CLASS_ORDER,
  type ExpenseClassKey,
} from "@/lib/utils/expense-classification";
import {
  getBranchExpenseDetail,
  getBranchExpenseTransactions,
  type ExpenseNatureFilter,
  type ExpenseParentFilter,
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

type BreakdownView = "class" | "category";
type ExpenseMainFilter = "ALL" | ExpenseParentFilter;
type ExpenseSubFilter = "ALL" | ExpenseNatureFilter;

const CLASS_TREE: Array<{
  key: ExpenseParentFilter;
  label: string;
  children: Array<{ key: ExpenseClassKey; nature: ExpenseNatureFilter }>;
}> = [
  {
    key: "BRANCH",
    label: "Branch",
    children: [
      { key: "BRANCH_FIXED", nature: "FIXED" },
      { key: "BRANCH_VARIABLE", nature: "VARIABLE" },
    ],
  },
  {
    key: "HO",
    label: "Head Office",
    children: [
      { key: "HO_FIXED", nature: "FIXED" },
      { key: "HO_VARIABLE", nature: "VARIABLE" },
    ],
  },
];

const MAIN_FILTER_OPTIONS: { value: ExpenseMainFilter; label: string }[] = [
  { value: "ALL", label: "All Types" },
  { value: "BRANCH", label: "Branch" },
  { value: "HO", label: "Head Office" },
];

const SUB_FILTER_OPTIONS: { value: ExpenseSubFilter; label: string }[] = [
  { value: "ALL", label: "All Natures" },
  { value: "FIXED", label: "Fixed" },
  { value: "VARIABLE", label: "Variable" },
];

/* ── Expense breakdown (class or category view) ── */
function CategoryBreakdown({
  categories,
  groups,
  total,
  isLoading,
  viewMode,
  parentFilter,
  natureFilter,
}: {
  categories: ExpenseCategory[];
  groups: ExpenseGroup[];
  total: number;
  isLoading: boolean;
  viewMode: BreakdownView;
  parentFilter: ExpenseMainFilter;
  natureFilter: ExpenseSubFilter;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  const groupedByParent = useMemo(() => {
    const map = new Map<string, ExpenseCategory[]>();
    for (const cat of categories) {
      const key = cat.parentGroup ?? "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(cat);
    }
    for (const children of map.values()) {
      children.sort((a, b) => b.total - a.total);
    }
    return map;
  }, [categories]);

  const groupedByClass = useMemo(() => {
    const map = new Map<ExpenseClassKey, { label: string; children: ExpenseCategory[] }>();
    for (const cat of categories) {
      const existing = map.get(cat.expenseClass) ?? {
        label: cat.expenseClassLabel,
        children: [],
      };
      existing.children.push(cat);
      map.set(cat.expenseClass, existing);
    }
    for (const entry of map.values()) {
      entry.children.sort((a, b) => b.total - a.total);
    }
    return EXPENSE_CLASS_ORDER
      .map((key) => {
        const row = map.get(key);
        if (!row) return null;
        const classTotal = row.children.reduce((sum, c) => sum + c.total, 0);
        return {
          key,
          name: row.label,
          total: classTotal,
          children: row.children,
        };
      })
      .filter((item): item is { key: ExpenseClassKey; name: string; total: number; children: ExpenseCategory[] } => item !== null);
  }, [categories]);

  const renderGroups = useMemo(() => {
    if (viewMode === "class") {
      return groupedByClass.map((g) => ({
        key: `class:${g.key}`,
        name: g.name,
        total: g.total,
        children: g.children,
      }));
    }
    return groups.map((group) => ({
      key: `group:${group.name}`,
      name: group.name,
      total: group.total,
      children: groupedByParent.get(group.name) ?? [],
    }));
  }, [groupedByClass, groupedByParent, groups, viewMode]);

  const toggle = (groupKey: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
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

  if (viewMode === "class") {
    const classTotals = new Map<ExpenseClassKey, { total: number; entryCount: number }>();
    for (const cat of categories) {
      const row = classTotals.get(cat.expenseClass) ?? { total: 0, entryCount: 0 };
      row.total += cat.total;
      row.entryCount += cat.entryCount;
      classTotals.set(cat.expenseClass, row);
    }

    // ── Donut chart data ─────────────────────────────────────────────────
    const PIE_SLICES: Array<{
      key: ExpenseClassKey;
      label: string;
      color: string;
      groupLabel: string;
    }> = [
      { key: "BRANCH_FIXED",    label: "Branch Fixed",    color: "#f43f5e", groupLabel: "Branch" },
      { key: "BRANCH_VARIABLE", label: "Branch Variable", color: "#fb7185", groupLabel: "Branch" },
      { key: "HO_FIXED",        label: "HO Fixed",        color: "#f97316", groupLabel: "Head Office" },
      { key: "HO_VARIABLE",     label: "HO Variable",     color: "#fdba74", groupLabel: "Head Office" },
    ];

    const pieTotal = PIE_SLICES.reduce((s, sl) => s + (classTotals.get(sl.key)?.total ?? 0), 0);

    // Helper: build arc paths for a given slice set + their own total
    type ArcSlice = { path: string; color: string; label: string; value: number; pct: number };
    function buildArcs(
      slices: typeof PIE_SLICES,
      subTotal: number,
      Ro: number, Ri: number, ccx: number, ccy: number,
    ): ArcSlice[] {
      const result: ArcSlice[] = [];
      let sa = -Math.PI / 2;
      for (const sl of slices) {
        const value = classTotals.get(sl.key)?.total ?? 0;
        const pct = subTotal > 0 ? value / subTotal : 0;
        if (pct === 0) { result.push({ path: "", color: sl.color, label: sl.label, value, pct }); continue; }
        // Full circle: SVG can't draw a 360° arc in one command — use two 180° half-donut arcs
        if (pct >= 1) {
          // top half + bottom half of donut ring
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

    const branchSlices  = PIE_SLICES.filter((s) => s.groupLabel === "Branch");
    const hoSlices      = PIE_SLICES.filter((s) => s.groupLabel === "Head Office");
    const branchTotal   = branchSlices.reduce((s, sl) => s + (classTotals.get(sl.key)?.total ?? 0), 0);
    const hoTotal       = hoSlices.reduce((s, sl) => s + (classTotals.get(sl.key)?.total ?? 0), 0);

    const R = 44; const ri = 24; const CC = 50; // viewBox 100×100
    const chartDefs: Array<{ title: string; slices: typeof PIE_SLICES; subTotal: number; centerLabel: string }> = [
      { title: "Branch",      slices: branchSlices, subTotal: branchTotal, centerLabel: "Branch" },
      { title: "Head Office", slices: hoSlices,     subTotal: hoTotal,     centerLabel: "HO"     },
      { title: "Overall",     slices: PIE_SLICES,   subTotal: pieTotal,    centerLabel: "Total"  },
    ];

    const visibleParents = CLASS_TREE.filter((node) =>
      parentFilter === "ALL" ? true : node.key === parentFilter,
    );

    return (
      <div className="rounded-xl border border-border-light bg-surface p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Expense Breakdown by Classification
        </h3>

        {/* ── Three donut charts ─────────────────────────────── */}
        {pieTotal > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {chartDefs.map((chart, ci) => {
              const arcs = buildArcs(chart.slices, chart.subTotal, R, ri, CC, CC);
              return (
                <motion.div
                  key={chart.title}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ci * 0.08 }}
                  className="rounded-lg border border-border-light/70 bg-background/30 p-3 flex flex-col items-center gap-2"
                >
                  <p className="text-[11px] font-semibold text-text-secondary">{chart.title}</p>
                  {/* SVG donut */}
                  <svg width={100} height={100} viewBox="0 0 100 100">
                    {arcs.map((sl, i) =>
                      sl.path ? (
                        <motion.path
                          key={i}
                          d={sl.path}
                          fill={sl.color}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: ci * 0.08 + i * 0.06 }}
                          className="hover:opacity-75 transition-opacity cursor-default"
                        />
                      ) : null,
                    )}
                    <text x={CC} y={CC - 5} textAnchor="middle" fill="#6b7280" style={{ fontSize: 8, fontWeight: 600 }}>
                      {chart.centerLabel}
                    </text>
                    <text x={CC} y={CC + 7} textAnchor="middle" fill="#f43f5e" style={{ fontSize: 7.5, fontWeight: 700 }}>
                      ₹{(chart.subTotal / 1000).toFixed(1)}k
                    </text>
                  </svg>
                  {/* Per-slice legend */}
                  <div className="w-full space-y-1.5">
                    {arcs.map((sl, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: sl.color }} />
                            <span className="text-[9px] text-text-secondary truncate">{sl.label}</span>
                          </div>
                          <span className="text-[9px] font-semibold text-text-primary tabular-nums ml-1 shrink-0">
                            {sl.pct > 0 ? `${(sl.pct * 100).toFixed(0)}%` : "—"}
                          </span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-border-light/50 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${sl.pct * 100}%` }}
                            transition={{ duration: 0.45, delay: ci * 0.08 + i * 0.05 }}
                            className="h-full rounded-full"
                            style={{ background: sl.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-rose-600 tabular-nums mt-0.5">{formatCurrencyExact(chart.subTotal)}</p>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="space-y-4">
          {visibleParents.map((parent, pIndex) => {
            const visibleChildren = parent.children.filter((child) =>
              natureFilter === "ALL" ? true : child.nature === natureFilter,
            );

            const parentTotal = visibleChildren.reduce((sum, child) => {
              return sum + (classTotals.get(child.key)?.total ?? 0);
            }, 0);

            const isParentOpen = expandedParents.has(parent.key);

            const toggleParent = () => {
              setExpandedParents((prev) => {
                const next = new Set(prev);
                if (next.has(parent.key)) next.delete(parent.key);
                else next.add(parent.key);
                return next;
              });
            };

            return (
              <motion.div
                key={parent.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: pIndex * 0.05 }}
                className="rounded-lg border border-border-light/80 overflow-hidden"
              >
                <button
                  onClick={toggleParent}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-background/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: isParentOpen ? 0 : -90 }}
                      transition={{ duration: 0.2 }}
                      className="text-text-tertiary"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.span>
                    <p className="text-sm font-semibold text-text-primary">{parent.label}</p>
                  </div>
                  <p className="text-sm font-bold text-rose-600">{formatCurrencyExact(parentTotal)}</p>
                </button>

                <AnimatePresence initial={false}>
                  {isParentOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                <div className="space-y-2 px-3 pb-3">
                  {visibleChildren.map((child, cIndex) => {
                    const childData = classTotals.get(child.key) ?? { total: 0, entryCount: 0 };
                    const pct = total > 0 ? (childData.total / total) * 100 : 0;
                    const barW = parentTotal > 0 ? (childData.total / parentTotal) * 100 : 0;
                    return (
                      <motion.div
                        key={child.key}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: cIndex * 0.03 }}
                        className="px-2 py-1.5 rounded-md hover:bg-background/40 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-xs font-medium text-text-secondary truncate">
                            {EXPENSE_CLASS_LABELS[child.key]}
                          </p>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            <span className="text-[10px] text-text-tertiary">
                              {pct.toFixed(1)}%
                            </span>
                            <span className="text-xs font-semibold text-text-primary tabular-nums">
                              {formatCurrencyExact(childData.total)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-border-light/60 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${barW}%` }}
                            transition={{ duration: 0.4, delay: cIndex * 0.03 }}
                            className="h-full rounded-full bg-rose-300/80"
                          />
                        </div>
                        <p className="text-[10px] text-text-tertiary mt-0.5">
                          {childData.entryCount} {childData.entryCount === 1 ? "entry" : "entries"}
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

  const maxGroupTotal = renderGroups.length > 0 ? renderGroups[0].total : 1;

  return (
    <div className="rounded-xl border border-border-light bg-surface p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        Expense Breakdown by Category
      </h3>
      <div className="space-y-2">
        {renderGroups.map((group, gi) => {
          const isOpen = expanded.has(group.key);
          const children = group.children;
          const pct = total > 0 ? (group.total / total) * 100 : 0;
          const barW = maxGroupTotal > 0 ? (group.total / maxGroupTotal) * 100 : 0;
          const maxChildTotal = children.length > 0 ? children[0].total : 1;

          return (
            <motion.div
              key={group.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.04 }}
            >
              <button
                onClick={() => toggle(group.key)}
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
  parentFilter,
  natureFilter,
}: {
  branch: string;
  fromDate: string;
  toDate: string;
  parentFilter: ExpenseMainFilter;
  natureFilter: ExpenseSubFilter;
}) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [branch, fromDate, toDate, parentFilter, natureFilter]);

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "expense-transactions",
      branch,
      fromDate,
      toDate,
      parentFilter,
      natureFilter,
      page,
    ],
    queryFn: () =>
      getBranchExpenseTransactions(branch, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        class_parent: parentFilter === "ALL" ? undefined : parentFilter,
        class_nature: natureFilter === "ALL" ? undefined : natureFilter,
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

  function classBadgeClasses(key: ExpenseClassKey): string {
    if (key === "BRANCH_VARIABLE") return "bg-blue-50 text-blue-700 border-blue-200";
    if (key === "BRANCH_FIXED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (key === "HO_FIXED") return "bg-amber-50 text-amber-700 border-amber-200";
    if (key === "HO_VARIABLE") return "bg-violet-50 text-violet-700 border-violet-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
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
                  <th className="text-left px-4 py-2.5 font-medium">
                    Class
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
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${classBadgeClasses(tx.expenseClass)}`}>
                        {tx.expenseClassLabel}
                      </span>
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
  const [parentFilter, setParentFilter] = useState<ExpenseMainFilter>("ALL");
  const [natureFilter, setNatureFilter] = useState<ExpenseSubFilter>("ALL");
  const [viewMode, setViewMode] = useState<BreakdownView>("class");

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "expense-branch-detail",
      branchName,
      fromDate,
      toDate,
      parentFilter,
      natureFilter,
    ],
    queryFn: () =>
      getBranchExpenseDetail(branchName, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        class_parent: parentFilter === "ALL" ? undefined : parentFilter,
        class_nature: natureFilter === "ALL" ? undefined : natureFilter,
      }),
    staleTime: 120_000,
  });

  const avgPerEntry =
    data && data.entryCount > 0 ? data.total / data.entryCount : 0;
  const activeClassCount = data?.classTotals.filter((c) => c.total > 0).length ?? 0;
  const unmappedTotal = data?.classTotals.find((c) => c.key === "UNMAPPED")?.total ?? 0;

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

      {/* Date and two-level filters */}
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">Type</span>
          <select
            value={parentFilter}
            onChange={(e) => setParentFilter(e.target.value as ExpenseMainFilter)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-border-light bg-surface text-text-primary"
          >
            {MAIN_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">Nature</span>
          <select
            value={natureFilter}
            onChange={(e) => setNatureFilter(e.target.value as ExpenseSubFilter)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-border-light bg-surface text-text-primary"
          >
            {SUB_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">View</span>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as BreakdownView)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-border-light bg-surface text-text-primary"
          >
            <option value="class">Grouped by Class</option>
            <option value="category">Grouped by Category</option>
          </select>
        </div>
        {(fromDate || toDate || parentFilter !== "ALL" || natureFilter !== "ALL" || viewMode !== "class") && (
          <button
            onClick={() => {
              setFromDate("");
              setToDate("");
              setParentFilter("ALL");
              setNatureFilter("ALL");
              setViewMode("class");
            }}
            className="text-xs text-primary hover:underline"
          >
            Reset Filters
          </button>
        )}
      </div>

      {unmappedTotal > 0 && (parentFilter !== "ALL" || natureFilter !== "ALL") ? null : unmappedTotal > 0 ? (
        <div className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5">
          <p className="text-xs text-amber-700">
            Unmapped expenses: {formatCurrencyExact(unmappedTotal)}. Update classification mapping if needed.
          </p>
        </div>
      ) : null}

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
                label: "Active Classes",
                value: String(activeClassCount),
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
            viewMode={viewMode}
            parentFilter={parentFilter}
            natureFilter={natureFilter}
          />

          {/* Transaction table */}
          <TransactionTable
            branch={branchName}
            fromDate={fromDate}
            toDate={toDate}
            parentFilter={parentFilter}
            natureFilter={natureFilter}
          />
        </>
      )}
    </motion.div>
  );
}
