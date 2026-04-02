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
  Calendar,
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

function exportToExcel(
  branches: ConsolidatedBranchRow[],
  grandTotal: { cash: number; bank: number; razorpay: number; upi: number; total: number },
  dateLabel: string,
) {
  // Build CSV content (Excel-compatible)
  const headers = ["Branch", "Cash", "Bank", "Razorpay", "UPI", "Total Balance"];
  const rows = branches.map((b) => [
    b.branch.replace("Smart Up ", ""),
    b.cash.toFixed(2),
    b.bank.toFixed(2),
    b.razorpay.toFixed(2),
    b.upi.toFixed(2),
    b.total.toFixed(2),
  ]);
  rows.push([
    "GRAND TOTAL",
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

      // Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("SmartUp - Consolidated Bank Report", 14, 18);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${dateLabel}`, 14, 25);

      // Table data
      const tableRows = branches.map((b) => [
        b.branch.replace("Smart Up ", ""),
        formatCurrencyExact(b.cash),
        formatCurrencyExact(b.bank),
        formatCurrencyExact(b.razorpay),
        formatCurrencyExact(b.upi),
        formatCurrencyExact(b.total),
      ]);

      // Grand total row
      tableRows.push([
        "GRAND TOTAL",
        formatCurrencyExact(grandTotal.cash),
        formatCurrencyExact(grandTotal.bank),
        formatCurrencyExact(grandTotal.razorpay),
        formatCurrencyExact(grandTotal.upi),
        formatCurrencyExact(grandTotal.total),
      ]);

      autoTable(doc, {
        startY: 32,
        head: [["Branch", "Cash", "Bank", "Razorpay", "UPI", "Total Balance"]],
        body: tableRows,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { halign: "left", cellWidth: 55 },
          1: { halign: "right", cellWidth: 38 },
          2: { halign: "right", cellWidth: 38 },
          3: { halign: "right", cellWidth: 38 },
          4: { halign: "right", cellWidth: 38 },
          5: { halign: "right", cellWidth: 45, fontStyle: "bold" },
        },
        // Style the last row (grand total) differently
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        didParseCell: (data: any) => {
          if (data.row.index === tableRows.length - 1) {
            data.cell.styles.fillColor = [219, 234, 254];
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = [30, 64, 175];
          }
        },
      });

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
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["consolidated-bank", fromDate, toDate],
    queryFn: () =>
      getConsolidatedBankReport({
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      }),
    staleTime: 60_000,
  });

  const dateLabel = useMemo(() => {
    if (fromDate && toDate) return `${fromDate}_to_${toDate}`;
    if (fromDate) return `from_${fromDate}`;
    if (toDate) return `to_${toDate}`;
    return new Date().toISOString().split("T")[0];
  }, [fromDate, toDate]);

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

      {/* Date filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-text-secondary mb-1 block">From Date</label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm rounded-lg border border-border-light bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-text-secondary mb-1 block">To Date</label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none" />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm rounded-lg border border-border-light bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        {(fromDate || toDate) && (
          <button
            onClick={() => { setFromDate(""); setToDate(""); }}
            className="px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors"
          >
            Clear dates
          </button>
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
