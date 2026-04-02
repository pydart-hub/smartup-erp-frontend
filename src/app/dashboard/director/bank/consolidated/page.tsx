"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Download,
  FileSpreadsheet,
  FileText,
  Wallet,
  Banknote,
  Landmark,
  Wifi,
  Smartphone,
  ChevronDown,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import {
  getConsolidatedBankReport,
  type ConsolidatedBranchRow,
} from "@/lib/api/director";
import { formatCurrencyExact } from "@/lib/utils/formatters";

/* ── Export helpers (client-side) ── */

/** Format number in Indian locale without ₹ symbol (jsPDF can't render ₹) */
function fmtINR(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function exportToExcel(
  branches: ConsolidatedBranchRow[],
  grandTotal: { cash: number; bank: number; razorpay: number; upi: number; total: number },
  dateLabel: string,
) {
  // Build CSV content (Excel-compatible)
  const headers = ["#", "Branch", "Bank Entity", "Cash", "Bank", "Razorpay", "UPI", "Total Balance"];
  const sorted = [...branches].sort((a, b) => b.total - a.total);
  const rows = sorted.map((b, i) => [
    String(i + 1),
    b.branch.replace("Smart Up ", ""),
    b.bank_entity_name || "-",
    b.cash.toFixed(2),
    b.bank.toFixed(2),
    b.razorpay.toFixed(2),
    b.upi.toFixed(2),
    b.total.toFixed(2),
  ]);
  rows.push([
    "",
    "GRAND TOTAL",
    "",
    grandTotal.cash.toFixed(2),
    grandTotal.bank.toFixed(2),
    grandTotal.razorpay.toFixed(2),
    grandTotal.upi.toFixed(2),
    grandTotal.total.toFixed(2),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Consolidated_Bank_Report_${dateLabel}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToPDF(
  branches: ConsolidatedBranchRow[],
  grandTotal: { cash: number; bank: number; razorpay: number; upi: number; total: number },
  dateLabel: string,
) {
  import("jspdf").then(({ jsPDF }) => {
    import("jspdf-autotable").then((autoTableModule) => {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const autoTable = autoTableModule.default;

      // SmartUp brand colors
      const TEAL = [26, 158, 143] as const;        // #1A9E8F
      const TEAL_DARK = [18, 120, 108] as const;   // darker teal for text
      const TEAL_LIGHT = [224, 245, 242] as const;  // #E0F5F2 light teal bg
      const WHITE = [255, 255, 255] as const;
      const TEXT_DARK = [30, 41, 59] as const;       // slate-800

      // ── Header bar ──
      doc.setFillColor(...TEAL);
      doc.rect(0, 0, 297, 28, "F");
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...WHITE);
      doc.text("SmartUp", 14, 14);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Consolidated Bank Report", 14, 21);
      // Date on right
      doc.setFontSize(9);
      doc.text(`Generated: ${dateLabel}`, 283, 14, { align: "right" });

      // Sort branches by total (desc)
      const sorted = [...branches].sort((a, b) => b.total - a.total);

      // Table data — use fmtINR (no ₹ symbol, Indian number format)
      const tableRows = sorted.map((b, i) => [
        String(i + 1),
        b.branch.replace("Smart Up ", ""),
        b.bank_entity_name || "-",
        fmtINR(b.cash),
        fmtINR(b.bank),
        fmtINR(b.razorpay),
        fmtINR(b.upi),
        fmtINR(b.total),
      ]);

      // Grand total row
      tableRows.push([
        "",
        "GRAND TOTAL",
        "",
        fmtINR(grandTotal.cash),
        fmtINR(grandTotal.bank),
        fmtINR(grandTotal.razorpay),
        fmtINR(grandTotal.upi),
        fmtINR(grandTotal.total),
      ]);

      autoTable(doc, {
        startY: 34,
        head: [["#", "Branch", "Bank Entity", "Cash (Rs.)", "Bank (Rs.)", "Razorpay (Rs.)", "UPI (Rs.)", "Total Balance (Rs.)"]],
        body: tableRows,
        theme: "grid",
        styles: {
          fontSize: 8.5,
          cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
          lineColor: [200, 200, 200],
          lineWidth: 0.2,
          textColor: [...TEXT_DARK],
        },
        headStyles: {
          fillColor: [...TEAL],
          textColor: [...WHITE],
          fontStyle: "bold",
          fontSize: 8.5,
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],  // very light gray
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { halign: "left", cellWidth: 38 },
          2: { halign: "left", cellWidth: 42, fontSize: 7.5, textColor: [100, 116, 139] },
          3: { halign: "right", cellWidth: 30 },
          4: { halign: "right", cellWidth: 30 },
          5: { halign: "right", cellWidth: 30 },
          6: { halign: "right", cellWidth: 30 },
          7: { halign: "right", cellWidth: 38, fontStyle: "bold" },
        },
        // Style the grand total row
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        didParseCell: (data: any) => {
          if (data.row.index === tableRows.length - 1) {
            data.cell.styles.fillColor = [...TEAL_LIGHT];
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = [...TEAL_DARK];
            data.cell.styles.fontSize = 9;
          }
        },
      });

      // Footer
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("Smart Up Learning Ventures | smartuplearningventures@gmail.com | +91 7356072106", 14, pageHeight - 8);
      doc.text("All amounts in Indian Rupees (INR)", 283, pageHeight - 8, { align: "right" });

      doc.save(`Consolidated_Bank_Report_${dateLabel}.pdf`);
    });
  });
}

/* ── Summary cards row ── */
function GrandTotalCards({
  totals,
}: {
  totals: { cash: number; bank: number; razorpay: number; upi: number; total: number };
}) {
  const cards = [
    { label: "Total Balance", value: totals.total, icon: Wallet, color: "text-text-primary", bg: "bg-border-light" },
    { label: "Cash", value: totals.cash, icon: Banknote, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { label: "Bank", value: totals.bank, icon: Landmark, color: "text-sky-600", bg: "bg-sky-500/10" },
    { label: "Razorpay", value: totals.razorpay, icon: Wifi, color: "text-blue-600", bg: "bg-blue-500/10" },
    { label: "UPI", value: totals.upi, icon: Smartphone, color: "text-violet-600", bg: "bg-violet-500/10" },
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
          <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
            <c.icon className={`h-4 w-4 ${c.color}`} />
          </div>
          <div>
            <p className={`text-sm font-bold ${c.color}`}>{formatCurrencyExact(c.value)}</p>
            <p className="text-[10px] text-text-tertiary">{c.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Export dropdown ── */
function ExportDropdown({
  onExportExcel,
  onExportPDF,
}: {
  onExportExcel: () => void;
  onExportPDF: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Download className="h-4 w-4" />
        Export
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute right-0 mt-1 w-48 rounded-lg border border-border-light bg-surface shadow-lg z-20 overflow-hidden"
          >
            <button
              onClick={() => { onExportExcel(); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-text-primary hover:bg-surface-secondary transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Export as Excel
            </button>
            <button
              onClick={() => { onExportPDF(); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-text-primary hover:bg-surface-secondary transition-colors"
            >
              <FileText className="h-4 w-4 text-red-500" />
              Export as PDF
            </button>
          </motion.div>
        </>
      )}
    </div>
  );
}

/* ── Page ── */
export default function ConsolidatedBankReportPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["consolidated-bank"],
    queryFn: () => getConsolidatedBankReport(),
    staleTime: 60_000,
  });

  const dateLabel = new Date().toISOString().split("T")[0];

  const handleExportExcel = useCallback(() => {
    if (!data) return;
    exportToExcel(data.branches, data.grand_total, dateLabel);
  }, [data, dateLabel]);

  const handleExportPDF = useCallback(() => {
    if (!data) return;
    exportToPDF(data.branches, data.grand_total, dateLabel);
  }, [data, dateLabel]);

  // Sort branches by total balance (desc)
  const sortedBranches = useMemo(
    () => [...(data?.branches ?? [])].sort((a, b) => b.total - a.total),
    [data],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/director/bank"
            className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-text-secondary" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Consolidated Bank Report
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Cross-branch bank &amp; cash balance summary
            </p>
          </div>
        </div>

        {data && (
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
          />
        )}
      </div>

      {/* Grand totals */}
      {data && <GrandTotalCards totals={data.grand_total} />}

      {/* Loading / Error */}
      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load consolidated report</p>
        </div>
      )}

      {/* Table */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border-light bg-surface overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-secondary border-b border-border-light">
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Branch</th>
                  <th className="text-right px-4 py-3 font-semibold text-emerald-600">
                    <span className="inline-flex items-center gap-1"><Banknote className="h-3.5 w-3.5" /> Cash</span>
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-sky-600">
                    <span className="inline-flex items-center gap-1"><Landmark className="h-3.5 w-3.5" /> Bank</span>
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-blue-600">
                    <span className="inline-flex items-center gap-1"><Wifi className="h-3.5 w-3.5" /> Razorpay</span>
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-violet-600">
                    <span className="inline-flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" /> UPI</span>
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-text-primary">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {sortedBranches.map((row, i) => (
                  <tr
                    key={row.branch}
                    className="hover:bg-surface-secondary/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-text-tertiary">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-text-primary">
                          {row.branch.replace("Smart Up ", "")}
                        </p>
                        {row.bank_entity_name && (
                          <p className="text-[10px] text-text-tertiary truncate max-w-[200px]">
                            {row.bank_entity_name}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {formatCurrencyExact(row.cash)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-sky-600">
                      {formatCurrencyExact(row.bank)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-blue-600">
                      {formatCurrencyExact(row.razorpay)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-violet-600">
                      {formatCurrencyExact(row.upi)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-text-primary">
                      {formatCurrencyExact(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-primary/5 border-t-2 border-primary/20">
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 font-bold text-primary">GRAND TOTAL</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">
                    {formatCurrencyExact(data.grand_total.cash)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-sky-700">
                    {formatCurrencyExact(data.grand_total.bank)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">
                    {formatCurrencyExact(data.grand_total.razorpay)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-violet-700">
                    {formatCurrencyExact(data.grand_total.upi)}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-primary text-base">
                    {formatCurrencyExact(data.grand_total.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
