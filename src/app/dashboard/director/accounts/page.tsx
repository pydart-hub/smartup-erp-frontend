"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  Landmark,
  Receipt,
  ChevronRight,
  Loader2,
  TrendingUp,
  Building2,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  CreditCard,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import {
  getAllBranches,
  getConsolidatedBankReport,
  getConsolidatedLoanReport,
} from "@/lib/api/director";
import { getExpenseSummary } from "@/lib/api/expenses";
import { AnimatedCurrency } from "@/components/dashboard/AnimatedValue";

/* ── Export helpers ── */

function fmtINR(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type BranchRow = { name: string; abbr: string; shortName: string; collection: number; expense: number; profit: number; loans: number };

function exportAccountsToExcel(rows: BranchRow[], totals: { collection: number; expense: number; profit: number; loans: number }) {
  const headers = ["#", "Branch", "Collection", "Expense", "Profit", "Loans"];
  const dataRows = rows.map((r, i) => [
    String(i + 1),
    r.shortName,
    r.collection.toFixed(2),
    r.expense.toFixed(2),
    r.profit.toFixed(2),
    r.loans.toFixed(2),
  ]);
  dataRows.push(["", "GRAND TOTAL", totals.collection.toFixed(2), totals.expense.toFixed(2), totals.profit.toFixed(2), totals.loans.toFixed(2)]);

  const csv = [headers, ...dataRows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Accounts_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAccountsToPDF(rows: BranchRow[], totals: { collection: number; expense: number; profit: number; loans: number }) {
  import("jspdf").then(({ jsPDF }) => {
    import("jspdf-autotable").then((mod) => {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const autoTable = mod.default;
      const TEAL = [26, 158, 143] as const;
      const TEAL_DARK = [18, 120, 108] as const;
      const TEAL_LIGHT = [224, 245, 242] as const;
      const WHITE = [255, 255, 255] as const;
      const TEXT_DARK = [30, 41, 59] as const;
      const dateLabel = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

      doc.setFillColor(...TEAL);
      doc.rect(0, 0, 297, 28, "F");
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...WHITE);
      doc.text("SmartUp", 14, 14);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Consolidated Accounts Report", 14, 21);
      doc.setFontSize(9);
      doc.text(`Generated: ${dateLabel}`, 283, 14, { align: "right" });

      const tableRows = rows.map((r, i) => [String(i + 1), r.shortName, fmtINR(r.collection), fmtINR(r.expense), fmtINR(r.profit), fmtINR(r.loans)]);
      tableRows.push(["", "GRAND TOTAL", fmtINR(totals.collection), fmtINR(totals.expense), fmtINR(totals.profit), fmtINR(totals.loans)]);

      autoTable(doc, {
        startY: 34,
        head: [["#", "Branch", "Collection (Rs.)", "Expense (Rs.)", "Profit (Rs.)", "Loans (Rs.)"]],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body: tableRows,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, lineColor: [200, 200, 200], lineWidth: 0.2, textColor: [...TEXT_DARK] },
        headStyles: { fillColor: [...TEAL], textColor: [...WHITE], fontStyle: "bold", fontSize: 9, halign: "center" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { halign: "center", cellWidth: 12 },
          1: { halign: "left", cellWidth: 50 },
          2: { halign: "right", cellWidth: 42 },
          3: { halign: "right", cellWidth: 42 },
          4: { halign: "right", cellWidth: 42, fontStyle: "bold" },
          5: { halign: "right", cellWidth: 42 },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        didParseCell: (data: any) => {
          if (data.row.index === tableRows.length - 1) {
            data.cell.styles.fillColor = [...TEAL_LIGHT];
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = [...TEAL_DARK];
            data.cell.styles.fontSize = 10;
          }
        },
      });

      const ph = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("Smart Up Learning Ventures | smartuplearningventures@gmail.com | +91 7356072106", 14, ph - 8);
      doc.text("All amounts in Indian Rupees (INR)", 283, ph - 8, { align: "right" });

      doc.save(`Accounts_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    });
  });
}

export default function AccountsDashboardPage() {
  const { data: bankData, isLoading: bankLoading } = useQuery({
    queryKey: ["consolidated-bank"],
    queryFn: () => getConsolidatedBankReport(),
    staleTime: 120_000,
  });

  const { data: expenseData, isLoading: expenseLoading } = useQuery({
    queryKey: ["director-expense-summary"],
    queryFn: getExpenseSummary,
    staleTime: 120_000,
  });

  const { data: loanData, isLoading: loanLoading } = useQuery({
    queryKey: ["consolidated-loans"],
    queryFn: getConsolidatedLoanReport,
    staleTime: 120_000,
  });

  const { data: branches } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 300_000,
  });

  const isLoading = bankLoading || expenseLoading || loanLoading;
  const totalCollection = bankData?.grand_total.total ?? 0;
  const totalExpense = expenseData?.grandTotal ?? 0;
  const totalLoans = loanData?.grand_total ?? 0;
  const profit = totalCollection - totalExpense;

  // Build per-branch data
  const branchRows = useMemo(() => {
    if (!branches) return [];
    const bankMap = new Map<string, number>();
    for (const b of bankData?.branches ?? []) {
      bankMap.set(b.branch, b.total);
    }
    const expMap = new Map<string, number>();
    for (const b of expenseData?.branches ?? []) {
      expMap.set(b.company, b.total);
    }
    const loanMap = new Map<string, number>();
    for (const b of loanData?.branches ?? []) {
      loanMap.set(b.branch, b.total);
    }
    return branches.map((b) => {
      const col = bankMap.get(b.name) ?? 0;
      const exp = expMap.get(b.name) ?? 0;
      const loans = loanMap.get(b.name) ?? 0;
      return {
        name: b.name,
        abbr: b.abbr,
        shortName: b.name.replace("Smart Up ", "").replace("Smart Up", "HQ"),
        collection: col,
        expense: exp,
        profit: col - exp,
        loans,
      };
    }).sort((a, b) => b.profit - a.profit);
  }, [branches, bankData, expenseData, loanData]);

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const grandTotals = { collection: totalCollection, expense: totalExpense, profit, loans: totalLoans };

  const Pulse = ({ w = "w-20" }: { w?: string }) => (
    <span className={`inline-block ${w} h-5 bg-border-light rounded animate-pulse`} />
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Accounts</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Financial overview across all branches
          </p>
        </div>

        {/* Export dropdown */}
        {!isLoading && branchRows.length > 0 && (
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border-light bg-surface hover:bg-surface-hover text-text-primary transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export
              <ChevronDown className={`h-3 w-3 transition-transform ${exportOpen ? "rotate-180" : ""}`} />
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-1 w-40 rounded-lg border border-border-light bg-surface shadow-lg z-20 py-1">
                <button
                  onClick={() => { exportAccountsToPDF(branchRows, grandTotals); setExportOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-surface-hover transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 text-rose-500" />
                  Download PDF
                </button>
                <button
                  onClick={() => { exportAccountsToExcel(branchRows, grandTotals); setExportOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-surface-hover transition-colors"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                  Download Excel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            iconColor: "text-rose-500",
            iconBg: "bg-rose-500/10",
            valueColor: "text-rose-600",
          },
          {
            label: "Total Loans",
            value: totalLoans,
            icon: CreditCard,
            iconColor: "text-amber-500",
            iconBg: "bg-amber-500/10",
            valueColor: "text-amber-600",
          },
          {
            label: "Profit",
            value: profit,
            icon: TrendingUp,
            iconColor: "text-primary",
            iconBg: "bg-primary/10",
            valueColor: profit >= 0 ? "text-primary" : "text-rose-600",
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

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/dashboard/director/accounts/collection">
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
                <p className="text-sm font-semibold text-text-primary">Collection</p>
                <p className="text-[11px] text-text-tertiary">Bank & cash balances</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-emerald-600 transition-colors" />
          </motion.div>
        </Link>
        <Link href="/dashboard/director/accounts/expense">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            whileHover={{ y: -2 }}
            className="rounded-xl border border-border-light bg-surface p-4 hover:border-rose-400/30 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <Receipt className="h-4.5 w-4.5 text-rose-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Expense</p>
                <p className="text-[11px] text-text-tertiary">Track expenses</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-rose-600 transition-colors" />
          </motion.div>
        </Link>
        <Link href="/dashboard/director/accounts/loans">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ y: -2 }}
            className="rounded-xl border border-border-light bg-surface p-4 hover:border-amber-400/30 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <CreditCard className="h-4.5 w-4.5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Loans</p>
                <p className="text-[11px] text-text-tertiary">Outstanding liabilities</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-amber-600 transition-colors" />
          </motion.div>
        </Link>
      </div>

      {/* Branch breakdown */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-3">
          Branch Breakdown
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="animate-spin h-5 w-5 text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {branchRows.map((row, i) => (
              <Link key={row.name} href={`/dashboard/director/accounts/${encodeURIComponent(row.name)}`}>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.035 }}
                  whileHover={{ y: -2 }}
                  className="group rounded-xl border border-border-light bg-surface p-3.5 hover:border-primary/20 hover:shadow-md transition-all cursor-pointer"
                >
                  {/* Branch name */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-text-primary leading-tight truncate">
                          {row.shortName}
                        </p>
                        <p className="text-[10px] text-text-tertiary">{row.abbr}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-text-tertiary group-hover:text-primary transition-colors" />
                  </div>

                {/* Collection − Expense = Profit */}
                <div className="flex items-center gap-1.5">
                  {/* Collection */}
                  <div className="flex-1 rounded-lg bg-emerald-500/8 px-2.5 py-2 text-center">
                    <p className="text-[13px] font-semibold text-emerald-500 tabular-nums">
                      <AnimatedCurrency value={row.collection} decimals />
                    </p>
                    <p className="text-[9px] text-text-tertiary mt-0.5">Collection</p>
                  </div>

                  <span className="text-text-tertiary text-sm font-medium shrink-0">−</span>

                  {/* Expense */}
                  <div className="flex-1 rounded-lg bg-rose-500/8 px-2.5 py-2 text-center">
                    <p className="text-[13px] font-semibold text-rose-500 tabular-nums">
                      <AnimatedCurrency value={row.expense} decimals />
                    </p>
                    <p className="text-[9px] text-text-tertiary mt-0.5">Expense</p>
                  </div>

                  <span className="text-text-tertiary text-sm font-medium shrink-0">=</span>

                  {/* Profit */}
                  <div className={`flex-1 rounded-lg px-2.5 py-2 text-center ${row.profit >= 0 ? "bg-primary/8" : "bg-rose-500/8"}`}>
                    <p className={`text-[13px] font-bold tabular-nums ${row.profit >= 0 ? "text-primary" : "text-rose-600"}`}>
                      <AnimatedCurrency value={row.profit} decimals />
                    </p>
                    <p className="text-[9px] text-text-tertiary mt-0.5">Profit</p>
                  </div>
                </div>

                {/* Loans badge — only shown when non-zero */}
                {row.loans > 0 && (
                  <div className="mt-2 rounded-lg bg-amber-500/8 px-2.5 py-1.5 flex items-center justify-between">
                    <p className="text-[9px] text-amber-600/80 flex items-center gap-1">
                      <CreditCard className="h-2.5 w-2.5" /> Loans (Liabilities)
                    </p>
                    <p className="text-[11px] font-semibold text-amber-600 tabular-nums">
                      <AnimatedCurrency value={row.loans} decimals />
                    </p>
                  </div>
                )}
              </motion.div>
            </Link>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
