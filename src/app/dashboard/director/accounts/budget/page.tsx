"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  PencilLine,
  X,
  Save,
  ChevronDown,
  IndianRupee,
  BarChart3,
  CircleDashed,
  RefreshCw,
  Settings2,
  Plus,
  Trash2,
  type LucideProps,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { GifLoader } from "@/components/ui/GifLoader";
import {
  getBudgetData, saveBudgetEntry,
  getAccountMappings, addAccountMapping, deleteAccountMapping,
  type BudgetCategory, type BudgetStatus,
} from "@/lib/api/budget";
import { formatCurrencyExact } from "@/lib/utils/formatters";

// ── Helpers ───────────────────────────────────────────────────────────────────
const FISCAL_YEARS = ["2026-2027", "2025-2026", "2024-2025"];

const STATUS_CONFIG: Record<
  BudgetStatus,
  { label: string; color: string; bg: string; border: string; Icon: React.FC<LucideProps> }
> = {
  on_track:   { label: "On Track",     color: "text-emerald-600", bg: "bg-emerald-50",  border: "border-emerald-200",  Icon: CheckCircle2  },
  warning:    { label: "Near Limit",   color: "text-amber-600",   bg: "bg-amber-50",    border: "border-amber-200",    Icon: AlertTriangle },
  over_budget:{ label: "Over Budget",  color: "text-rose-600",    bg: "bg-rose-50",     border: "border-rose-200",     Icon: TrendingUp    },
  no_budget:  { label: "No Budget",    color: "text-slate-500",   bg: "bg-slate-50",    border: "border-slate-200",    Icon: CircleDashed  },
};

const CATEGORY_ICONS: Record<string, string | undefined> = {
  "Head Office Expense": "🏛️",
  "EMI": "💳",
  "Maintenance": "🔧",
  "Tab": "📱",
  "Projector": "📽️",
  "Sticker": "🏷️",
  "Board": "📋",
  "A/C": "❄️",
  "Projector Screen": "🖥️",
  "Sunpack Board": "🪧",
  "Notice Banner": "📢",
  "Marketing": "📣",
  "Other": "📦",
};

function Pulse({ w = "w-14" }: { w?: string }) {
  return <span className={`inline-block ${w} h-5 bg-border-light rounded animate-pulse`} />;
}

function formatCurrencyShort(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

// ── Edit Budget Modal ─────────────────────────────────────────────────────────
function EditBudgetModal({
  category,
  currentBudget,
  fiscalYear,
  docName,
  onClose,
  onSaved,
}: {
  category: string;
  currentBudget: number | null;
  fiscalYear: string;
  docName: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(
    currentBudget !== null ? String(currentBudget) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const amount = parseFloat(value);
    if (isNaN(amount) || amount < 0) {
      setError("Enter a valid amount (0 or more)");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveBudgetEntry({
        fiscal_year: fiscalYear,
        category,
        budget_amount: amount,
        doc_name: docName,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="bg-surface rounded-2xl border border-border-light shadow-xl w-full max-w-sm p-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500/12 flex items-center justify-center text-lg">
                {CATEGORY_ICONS[category] ?? "📋"}
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{category}</p>
                <p className="text-xs text-text-tertiary">Set Budget · {fiscalYear}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-background/60 transition-colors"
            >
              <X className="w-4 h-4 text-text-tertiary" />
            </button>
          </div>

          {/* Input */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Annual Budget Amount (₹)
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="number"
                min="0"
                step="1000"
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="e.g. 500000"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border-light bg-background text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition"
                autoFocus
              />
            </div>
            {value && !isNaN(parseFloat(value)) && (
              <p className="text-[11px] text-text-tertiary mt-1 ml-1">
                = {formatCurrencyExact(parseFloat(value))}
              </p>
            )}
            {error && (
              <p className="text-[11px] text-rose-600 mt-1 ml-1">{error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border-light text-sm font-medium text-text-secondary hover:bg-background/60 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !value}
              className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saving ? "Saving…" : "Save Budget"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Category Row ──────────────────────────────────────────────────────────────
function CategoryRow({
  item,
  index,
  fiscalYear,
  onEdit,
}: {
  item: BudgetCategory;
  index: number;
  fiscalYear: string;
  onEdit: (item: BudgetCategory) => void;
}) {
  const cfg = STATUS_CONFIG[item.status];
  const Icon = cfg.Icon;
  const hasBudget = item.budget !== null && item.budget > 0;
  const barPct = Math.min(item.pct ?? 0, 100);
  const barColor =
    item.status === "over_budget"
      ? "bg-rose-500"
      : item.status === "warning"
      ? "bg-amber-500"
      : "bg-teal-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 + index * 0.02, duration: 0.25 }}
      className="group rounded-xl border border-border-light bg-surface p-3.5 hover:border-teal-500/30 hover:shadow-sm transition-all"
    >
      {/* Top row */}
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center text-base shrink-0">
          {CATEGORY_ICONS[item.category] ?? "📋"}
        </div>

        {/* Category name + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-text-primary">{item.category}</span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}
            >
              <Icon className="w-3 h-3" />
              {cfg.label}
            </span>
          </div>
          <p className="text-[11px] text-text-tertiary mt-0.5">
            Actual: <span className="font-semibold text-text-secondary">{formatCurrencyShort(item.actual)}</span>
            {hasBudget && (
              <>
                {" "}· Budget: <span className="font-semibold">{formatCurrencyShort(item.budget!)}</span>
              </>
            )}
          </p>
        </div>

        {/* Edit button */}
        <button
          onClick={() => onEdit(item)}
          className="shrink-0 p-2 rounded-lg border border-border-light hover:border-teal-500/50 hover:bg-teal-50 text-text-tertiary hover:text-teal-600 transition-all opacity-0 group-hover:opacity-100"
          title={hasBudget ? "Edit Budget" : "Set Budget"}
        >
          <PencilLine className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar (only if budget set) */}
      {hasBudget && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-text-tertiary">
              {item.pct?.toFixed(1)}% used
            </span>
            <span className={`text-[10px] font-medium ${item.variance! >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {item.variance! >= 0
                ? `₹${formatCurrencyShort(item.variance!)} remaining`
                : `₹${formatCurrencyShort(Math.abs(item.variance!))} over`}
            </span>
          </div>
          <div className="w-full h-2 bg-border-light/60 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${barPct}%` }}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.02 }}
              className={`h-full rounded-full ${barColor}`}
            />
          </div>
          {/* Amounts row */}
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-text-tertiary tabular-nums">{formatCurrencyExact(item.actual)}</span>
            <span className="text-[10px] text-text-tertiary tabular-nums">{formatCurrencyExact(item.budget!)}</span>
          </div>
        </div>
      )}

      {/* No budget set CTA */}
      {!hasBudget && (
        <button
          onClick={() => onEdit(item)}
          className="mt-2.5 w-full py-1.5 rounded-lg border border-dashed border-border-light text-[11px] text-text-tertiary hover:border-teal-500/50 hover:text-teal-600 hover:bg-teal-50 transition-all"
        >
          + Set budget for this category
        </button>
      )}
    </motion.div>
  );
}

// ── Account Mappings Panel ────────────────────────────────────────────────────
function AccountMappingsPanel({ onMappingChange }: { onMappingChange: () => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selAccount, setSelAccount] = useState("");
  const [selCategory, setSelCategory] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["budget-account-mappings"],
    queryFn: getAccountMappings,
    staleTime: 120_000,
    enabled: open,
  });

  const mappings = data?.mappings ?? [];
  const allAccounts = data?.all_accounts ?? [];
  const categories = data?.categories ?? [];

  // accounts not yet mapped
  const mappedSet = new Set(mappings.map(m => m.account));
  const unmappedAccounts = allAccounts.filter(a => !mappedSet.has(a));

  const handleAdd = async () => {
    if (!selAccount || !selCategory) return;
    setAdding(true);
    setAddError(null);
    try {
      await addAccountMapping(selAccount, selCategory);
      setSelAccount("");
      setSelCategory("");
      qc.invalidateQueries({ queryKey: ["budget-account-mappings"] });
      refetch();
      onMappingChange();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await deleteAccountMapping(name);
      qc.invalidateQueries({ queryKey: ["budget-account-mappings"] });
      refetch();
      onMappingChange();
    } catch { /* silent */ }
  };

  // Group mappings by category for display
  const grouped = useMemo(() => {
    const map: Record<string, typeof mappings> = {};
    for (const m of mappings) {
      if (!map[m.category]) map[m.category] = [];
      map[m.category].push(m);
    }
    return map;
  }, [mappings]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl border border-border-light bg-surface overflow-hidden"
    >
      {/* Header — toggle */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-background/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-500/12 flex items-center justify-center">
            <Settings2 className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-text-primary">Account Mappings</p>
            <p className="text-[10px] text-text-tertiary">
              {mappings.length > 0 ? `${mappings.length} accounts mapped` : "Manage which GL accounts map to each category"}
            </p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border-light space-y-4 pt-3">
              {/* Add new mapping */}
              <div>
                <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wide mb-2">Add Mapping</p>
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={selAccount}
                    onChange={e => setSelAccount(e.target.value)}
                    className="flex-1 min-w-[180px] px-3 py-2 text-sm rounded-lg border border-border-light bg-background text-text-primary focus:outline-none focus:border-violet-400"
                  >
                    <option value="">Select GL account…</option>
                    {unmappedAccounts.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <select
                    value={selCategory}
                    onChange={e => setSelCategory(e.target.value)}
                    className="flex-1 min-w-[160px] px-3 py-2 text-sm rounded-lg border border-border-light bg-background text-text-primary focus:outline-none focus:border-violet-400"
                  >
                    <option value="">Select category…</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAdd}
                    disabled={!selAccount || !selCategory || adding}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 disabled:opacity-40 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {adding ? "Adding…" : "Add"}
                  </button>
                </div>
                {addError && <p className="text-xs text-rose-600 mt-1">{addError}</p>}
              </div>

              {/* Existing mappings */}
              {isLoading ? (
                <div className="flex justify-center py-6"><GifLoader /></div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
                    <div key={cat}>
                      <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide mb-1.5">
                        {CATEGORY_ICONS[cat] ?? "📋"} {cat}
                      </p>
                      <div className="space-y-1">
                        {items.map(m => (
                          <div key={m.name} className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                            <span className="text-xs text-text-secondary font-mono">{m.account}</span>
                            <button
                              onClick={() => handleDelete(m.name)}
                              className="p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-text-tertiary transition-colors"
                              title="Remove mapping"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {mappings.length === 0 && (
                    <p className="text-sm text-text-tertiary text-center py-4">No mappings found</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BudgetPage() {
  const [fiscalYear, setFiscalYear] = useState("2026-2027");
  const [fyOpen, setFyOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetCategory | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["director-budget", fiscalYear],
    queryFn: () => getBudgetData(fiscalYear),
    staleTime: 30_000,
  });

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ["director-budget", fiscalYear] });
    refetch();
  };

  const categories = data?.categories ?? [];
  const totals = data?.totals ?? { actual: 0, budget: 0 };

  const budgetedCount  = categories.filter((c) => c.budget !== null && c.budget > 0).length;
  const overBudgetCount = categories.filter((c) => c.status === "over_budget").length;
  const warningCount   = categories.filter((c) => c.status === "warning").length;
  const totalVariance  = totals.budget > 0 ? totals.budget - totals.actual : null;
  const overallPct     = totals.budget > 0 ? Math.round((totals.actual / totals.budget) * 100) : null;

  const handleSaved = () => {
    qc.invalidateQueries({ queryKey: ["director-budget", fiscalYear] });
  };

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbNav />

      <div className="px-4 pt-4 pb-8 max-w-3xl mx-auto space-y-5">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3"
        >
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/15 flex items-center justify-center">
                <Target className="w-4 h-4 text-teal-600" />
              </div>
              <h1 className="text-xl font-bold text-text-primary">Budget & Actuals</h1>
            </div>
            <p className="text-xs text-text-tertiary mt-0.5 ml-10">
              Set budgets and track actual expenses by category
            </p>
          </div>

          {/* Refresh + Fiscal year picker */}
          <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            title="Refresh data from Frappe"
            className="w-8 h-8 rounded-xl border border-border-light bg-surface flex items-center justify-center hover:border-teal-500/50 hover:bg-teal-50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-text-tertiary ${isFetching ? "animate-spin text-teal-600" : ""}`} />
          </button>
          <div className="relative">
            <button
              onClick={() => setFyOpen((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-light bg-surface text-sm font-medium text-text-primary hover:border-teal-500/50 transition-all"
            >
              {fiscalYear}
              <ChevronDown className={`w-3.5 h-3.5 text-text-tertiary transition-transform ${fyOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {fyOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  className="absolute right-0 top-full mt-1 bg-surface border border-border-light rounded-xl shadow-lg z-20 overflow-hidden min-w-[140px]"
                >
                  {FISCAL_YEARS.map((fy) => (
                    <button
                      key={fy}
                      onClick={() => { setFiscalYear(fy); setFyOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${fy === fiscalYear ? "bg-teal-50 text-teal-700 font-semibold" : "text-text-primary hover:bg-background"}`}
                    >
                      {fy}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </div>
        </motion.div>

        {/* ── Loading ── */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <GifLoader />
          </div>
        )}

        {/* ── Error ── */}
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            Failed to load budget data: {(error as Error).message}
          </motion.div>
        )}

        {/* ── Data ── */}
        {data && !isLoading && (
          <>
            {/* ── Summary cards ── */}
            <div className="grid grid-cols-2 gap-3">
              {/* Total Actual */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-xl border border-border-light bg-surface p-3.5"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-[11px] text-text-tertiary font-medium">Total Actual</span>
                </div>
                <p className="text-xl font-bold text-text-primary tabular-nums">
                  {formatCurrencyShort(totals.actual)}
                </p>
                <p className="text-[10px] text-text-tertiary mt-0.5">{categories.length} categories</p>
              </motion.div>

              {/* Total Budget */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="rounded-xl border border-border-light bg-surface p-3.5"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Target className="w-3.5 h-3.5 text-teal-600" />
                  <span className="text-[11px] text-text-tertiary font-medium">Total Budget</span>
                </div>
                <p className="text-xl font-bold text-text-primary tabular-nums">
                  {totals.budget > 0 ? formatCurrencyShort(totals.budget) : "—"}
                </p>
                <p className="text-[10px] text-text-tertiary mt-0.5">{budgetedCount} of {categories.length} budgeted</p>
              </motion.div>

              {/* Variance */}
              {totals.budget > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.11 }}
                  className={`rounded-xl border p-3.5 ${totalVariance! >= 0 ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {totalVariance! >= 0 ? (
                      <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
                    )}
                    <span className="text-[11px] text-text-tertiary font-medium">Variance</span>
                  </div>
                  <p className={`text-xl font-bold tabular-nums ${totalVariance! >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {totalVariance! >= 0 ? "+" : ""}{formatCurrencyShort(totalVariance!)}
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {overallPct}% of budget used
                  </p>
                </motion.div>
              )}

              {/* Alerts */}
              {(overBudgetCount > 0 || warningCount > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14 }}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-3.5"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[11px] text-text-tertiary font-medium">Alerts</span>
                  </div>
                  <div className="space-y-0.5">
                    {overBudgetCount > 0 && (
                      <p className="text-sm font-bold text-rose-700">
                        {overBudgetCount} over budget
                      </p>
                    )}
                    {warningCount > 0 && (
                      <p className="text-sm font-semibold text-amber-700">
                        {warningCount} near limit
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* ── Overall progress bar ── */}
            {totals.budget > 0 && overallPct !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="rounded-xl border border-border-light bg-surface p-3.5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-text-primary">Overall Budget Utilisation</span>
                  <span className={`text-xs font-bold ${overallPct >= 100 ? "text-rose-600" : overallPct >= 80 ? "text-amber-600" : "text-emerald-600"}`}>
                    {overallPct}%
                  </span>
                </div>
                <div className="w-full h-3 bg-border-light/60 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(overallPct, 100)}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className={`h-full rounded-full ${overallPct >= 100 ? "bg-rose-500" : overallPct >= 80 ? "bg-amber-500" : "bg-teal-500"}`}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-text-tertiary">₹0</span>
                  <span className="text-[10px] text-text-tertiary">{formatCurrencyShort(totals.budget)}</span>
                </div>
              </motion.div>
            )}

            {/* ── Category list ── */}
            <div>
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-3">
                Expense Categories ({categories.length})
              </p>
              <div className="space-y-2.5">
                {categories.map((item, i) => (
                  <CategoryRow
                    key={item.category}
                    item={item}
                    index={i}
                    fiscalYear={fiscalYear}
                    onEdit={setEditTarget}
                  />
                ))}
              </div>

              {categories.length === 0 && (
                <div className="text-center py-12 text-text-tertiary text-sm">
                  No expense data found for {fiscalYear}
                </div>
              )}
            </div>

            {/* ── Account Mappings Panel ── */}
            <AccountMappingsPanel onMappingChange={handleRefresh} />
          </>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editTarget && (
        <EditBudgetModal
          category={editTarget.category}
          currentBudget={editTarget.budget}
          fiscalYear={fiscalYear}
          docName={editTarget.budget_doc_name}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
