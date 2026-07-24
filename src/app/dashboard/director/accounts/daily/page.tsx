"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Calendar,
  Landmark,
  Receipt,
  TrendingDown,
  TrendingUp,
  Download,
  CalendarRange,
  ArrowUpRight,
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

interface DailyExpenseItem {
  name: string;
  posting_date: string;
  account: string;
  account_name: string;
  debit: number;
  voucher_type: string;
  voucher_no: string;
  against: string;
  remarks: string | null;
  company: string;
}

// ─── 3D Tilt Wrapper ──────────────────────────────────────────────────────────
interface TiltCardProps {
  children: (hovered: boolean) => React.ReactNode;
  href: string;
  accentClass: string; // border-l color
}

function TiltCard({ children, href, accentClass }: TiltCardProps) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [hovered, setHovered] = useState(false);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setRotateY(((e.clientX - r.left) / r.width - 0.5) * 10);
    setRotateX(-(((e.clientY - r.top) / r.height) - 0.5) * 10);
  };

  return (
    <Link href={href} className="block h-full">
      <motion.div
        onMouseMove={onMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setRotateX(0); setRotateY(0); setHovered(false); }}
        animate={{ rotateX, rotateY, scale: hovered ? 1.015 : 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        style={{
          boxShadow: hovered
            ? "0 20px 44px -12px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.05)"
            : "0 4px 16px -4px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
        }}
        className={`relative rounded-2xl bg-surface border-l-4 ${accentClass} border-t border-r border-b border-border-light min-h-[420px] h-full flex flex-col cursor-pointer overflow-hidden`}
      >
        {children(hovered)}
      </motion.div>
    </Link>
  );
}

// ─── Breakdown Row with bar ───────────────────────────────────────────────────
function BreakdownRow({
  label, value, total, barClass,
}: { label: string; value: number; total: number; barClass: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="group/row">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-text-secondary truncate max-w-[120px] group-hover/row:text-text-primary transition-colors" title={label}>
          {label}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-text-tertiary text-[10px]">{pct}%</span>
          <span className="font-semibold text-text-primary tabular-nums">{formatCurrencyExact(value)}</span>
        </div>
      </div>
      <div className="h-1 rounded-full bg-border-light overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
          className={`h-full rounded-full ${barClass}`}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DailyAccountsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(searchParams.get("from_date") || searchParams.get("date") || today);
  const [toDate,   setToDate]   = useState(searchParams.get("to_date")   || searchParams.get("date") || today);

  const { data: collections, isLoading: loadingC } = useQuery<DailyCollectionItem[]>({
    queryKey: ["daily-collected", fromDate, toDate],
    queryFn: async () => {
      const r = await fetch(`/api/director/today-collected?from_date=${fromDate}&to_date=${toDate}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return (await r.json()).data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: expenses, isLoading: loadingE } = useQuery<DailyExpenseItem[]>({
    queryKey: ["daily-expenses", fromDate, toDate],
    queryFn: async () => {
      const r = await fetch(`/api/director/today-expenses?from_date=${fromDate}&to_date=${toDate}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return (await r.json()).data ?? [];
    },
    staleTime: 60_000,
  });

  const isLoading = loadingC || loadingE;

  const totalCollected = useMemo(() => (collections ?? []).reduce((s, i) => s + (i.paid_amount ?? 0), 0), [collections]);
  const totalExpense   = useMemo(() => (expenses   ?? []).reduce((s, i) => s + (i.debit      ?? 0), 0), [expenses]);
  const netBalance     = totalCollected - totalExpense;

  const branchCollections = useMemo(() => {
    const b: Record<string, number> = {};
    for (const c of collections ?? []) {
      const k = c.company.replace("Smart Up ", "").replace("Smart Up", "HQ");
      b[k] = (b[k] ?? 0) + c.paid_amount;
    }
    return Object.entries(b).sort((a, b) => b[1] - a[1]);
  }, [collections]);

  const collectionModes = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of collections ?? []) m[c.mode_of_payment || "Other"] = (m[c.mode_of_payment || "Other"] ?? 0) + c.paid_amount;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [collections]);

  const branchExpenses = useMemo(() => {
    const b: Record<string, number> = {};
    for (const e of expenses ?? []) {
      const k = e.company.replace("Smart Up ", "").replace("Smart Up", "HQ");
      b[k] = (b[k] ?? 0) + e.debit;
    }
    return Object.entries(b).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const expenseCategories = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of expenses ?? []) m[e.account_name || "Other"] = (m[e.account_name || "Other"] ?? 0) + e.debit;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const handleFromDate = (d: string) => { setFromDate(d); router.replace(`/dashboard/director/accounts/daily?from_date=${d}&to_date=${toDate}`); };
  const handleToDate   = (d: string) => { setToDate(d);   router.replace(`/dashboard/director/accounts/daily?from_date=${fromDate}&to_date=${d}`); };

  const dateLabel = useMemo(() => {
    if (fromDate === toDate) return new Date(fromDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    return `${new Date(fromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${new Date(toDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  }, [fromDate, toDate]);

  const handleCSVExport = () => {
    const rows: string[][] = [["Type", "Branch", "Entity/Account", "Ref", "Mode", "Remarks", "Amount"]];
    for (const c of collections ?? []) rows.push(["Collection", c.company, c.party_name, c.reference_no, c.mode_of_payment, "", c.paid_amount.toFixed(2)]);
    for (const e of expenses   ?? []) rows.push(["Expense",    e.company, e.account_name, e.voucher_no, "", e.remarks || "", e.debit.toFixed(2)]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8;" }));
    a.download = `Accounts_${fromDate}_${toDate}.csv`;
    a.click();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-5">
      <BreadcrumbNav />

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            Daily Accounts Summary
          </h1>
          <p className="text-xs text-text-tertiary mt-0.5">
            {dateLabel}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-surface border border-border-light rounded-xl px-3 py-1.5 shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
            <input type="date" value={fromDate} onChange={e => handleFromDate(e.target.value)}
              className="text-xs bg-transparent text-text-primary outline-none w-[110px]" />
            <span className="text-text-tertiary text-xs">–</span>
            <input type="date" value={toDate} onChange={e => handleToDate(e.target.value)}
              className="text-xs bg-transparent text-text-primary outline-none w-[110px]" />
          </div>

          <button onClick={handleCSVExport}
            disabled={isLoading || (!collections?.length && !expenses?.length)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-border-light bg-surface hover:bg-surface-hover text-text-primary transition-all disabled:opacity-40 shadow-sm">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>



      {/* ── Cards ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <GifLoader size="lg" />
          <p className="text-sm text-text-secondary">Loading financial data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── Collection Card ──────────────────────────────────────── */}
          <TiltCard
            href={`/dashboard/director/accounts/daily/collection?from_date=${fromDate}&to_date=${toDate}`}
            accentClass="border-l-emerald-500"
          >
            {(hovered) => (
              <div className="flex flex-col h-full p-6 gap-5" style={{ transform: "translateZ(0)" }}>

                {/* Card header */}
                <div className="flex items-start justify-between" style={{ transform: "translateZ(20px)" }}>
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotateY: hovered ? 360 : 0, scale: hovered ? 1.1 : 1 }}
                      transition={{ duration: 0.55, ease: "easeInOut" }}
                      className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0"
                    >
                      <Landmark className="h-5 w-5 text-emerald-600" />
                    </motion.div>
                    <div>
                      <h2 className="text-base font-bold text-text-primary leading-tight">Daily Collection</h2>
                      <p className="text-xs text-text-tertiary mt-0.5">Incoming receipts · click to expand</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                      {collections?.length ?? 0} txns
                    </span>
                    <motion.div animate={{ opacity: hovered ? 1 : 0.3, x: hovered ? 2 : 0 }} className="text-text-tertiary">
                      <ArrowUpRight className="h-4 w-4" />
                    </motion.div>
                  </div>
                </div>

                {/* Amount */}
                <div style={{ transform: "translateZ(30px)" }}>
                  <p className="text-4xl font-extrabold text-text-primary tabular-nums tracking-tight">
                    {formatCurrencyExact(totalCollected)}
                  </p>
                  <div className="mt-3 h-px bg-border-light" />
                </div>

                {/* Breakdowns */}
                {collections && collections.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 flex-1" style={{ transform: "translateZ(20px)" }}>
                    <div className="space-y-3">
                      <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-widest">Branch</p>
                      <div className="space-y-3">
                        {branchCollections.slice(0, 4).map(([b, v]) => (
                          <BreakdownRow key={b} label={b} value={v} total={totalCollected} barClass="bg-emerald-500" />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3 border-l border-border-light pl-4">
                      <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-widest">Mode</p>
                      <div className="space-y-3">
                        {collectionModes.slice(0, 4).map(([m, v]) => (
                          <BreakdownRow key={m} label={m} value={v} total={totalCollected} barClass="bg-emerald-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center rounded-xl bg-background/60 border border-border-light border-dashed">
                    <p className="text-xs text-text-tertiary">No collections recorded</p>
                  </div>
                )}
              </div>
            )}
          </TiltCard>

          {/* ── Expense Card ─────────────────────────────────────────── */}
          <TiltCard
            href={`/dashboard/director/accounts/daily/expense?from_date=${fromDate}&to_date=${toDate}`}
            accentClass="border-l-rose-500"
          >
            {(hovered) => (
              <div className="flex flex-col h-full p-6 gap-5" style={{ transform: "translateZ(0)" }}>

                {/* Card header */}
                <div className="flex items-start justify-between" style={{ transform: "translateZ(20px)" }}>
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotateY: hovered ? 360 : 0, scale: hovered ? 1.1 : 1 }}
                      transition={{ duration: 0.55, ease: "easeInOut" }}
                      className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0"
                    >
                      <Receipt className="h-5 w-5 text-rose-600" />
                    </motion.div>
                    <div>
                      <h2 className="text-base font-bold text-text-primary leading-tight">Daily Expense</h2>
                      <p className="text-xs text-text-tertiary mt-0.5">Outgoing payments · click to expand</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                      {expenses?.length ?? 0} entries
                    </span>
                    <motion.div animate={{ opacity: hovered ? 1 : 0.3, x: hovered ? 2 : 0 }} className="text-text-tertiary">
                      <ArrowUpRight className="h-4 w-4" />
                    </motion.div>
                  </div>
                </div>

                {/* Amount */}
                <div style={{ transform: "translateZ(30px)" }}>
                  <p className="text-4xl font-extrabold text-text-primary tabular-nums tracking-tight">
                    {formatCurrencyExact(totalExpense)}
                  </p>
                  <div className="mt-3 h-px bg-border-light" />
                </div>

                {/* Breakdowns */}
                {expenses && expenses.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 flex-1" style={{ transform: "translateZ(20px)" }}>
                    <div className="space-y-3">
                      <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-widest">Branch</p>
                      <div className="space-y-3">
                        {branchExpenses.slice(0, 4).map(([b, v]) => (
                          <BreakdownRow key={b} label={b} value={v} total={totalExpense} barClass="bg-rose-500" />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3 border-l border-border-light pl-4">
                      <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-widest">Category</p>
                      <div className="space-y-3">
                        {expenseCategories.slice(0, 4).map(([c, v]) => (
                          <BreakdownRow key={c} label={c} value={v} total={totalExpense} barClass="bg-rose-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center rounded-xl bg-background/60 border border-border-light border-dashed">
                    <p className="text-xs text-text-tertiary">No expenses recorded</p>
                  </div>
                )}
              </div>
            )}
          </TiltCard>

        </div>
      )}
    </motion.div>
  );
}
