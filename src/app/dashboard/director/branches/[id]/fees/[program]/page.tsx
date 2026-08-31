"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  IndianRupee,
  Users,
  CircleCheck,
  Clock,
  TriangleAlert,
  AlertCircle,
  Search,
  UserX,
  Star,
  Banknote,
  Wifi,
  Filter,
  CalendarClock,
  ChevronDown,
  Receipt,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { getBranchProgramStudentFees } from "@/lib/api/director";
import type { StudentFeeRow } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

const PAYMENT_OPTION_LABELS: Record<string, string> = {
  "1": "One-Time Payment",
  "4": "Quarterly",
  "6": "Bi-Monthly (6 Inst.)",
  "8": "Monthly (8 Inst.)",
};

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Advanced: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-300" },
  Intermediate: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300" },
  Basic: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300" },
};

/* ── Instalment status helpers ── */
function instalmentStatus(inv: { outstanding_amount: number; due_date: string; grand_total: number }) {
  const today = new Date().toISOString().split("T")[0];
  if (inv.outstanding_amount === 0) return "paid" as const;
  if (inv.due_date <= today) return "overdue" as const;
  return "upcoming" as const;
}

const STATUS_STYLE = {
  paid: { bg: "bg-success/10", text: "text-success", label: "Paid", icon: CircleCheck },
  overdue: { bg: "bg-orange-500/10", text: "text-orange-600", label: "Overdue", icon: CalendarClock },
  upcoming: { bg: "bg-primary/5", text: "text-primary", label: "Upcoming", icon: Clock },
} as const;

/* ── Student row with expandable instalments ── */
function StudentRow({
  student,
  expanded,
  onToggle,
}: {
  student: StudentFeeRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const pending = student.totalOutstanding;
  const isDiscontinued = student.enabled === 0;
  const planColor = PLAN_COLORS[student.feePlan ?? ""] ?? { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-300" };
  const frequencyLabel = PAYMENT_OPTION_LABELS[student.noOfInstalments ?? ""] ?? "";
  const hasInstalments = student.instalments && student.instalments.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`rounded-[10px] border bg-surface transition-colors ${
        isDiscontinued
          ? "border-amber-200/60 opacity-75"
          : expanded
          ? "border-primary/30 shadow-sm"
          : "border-border-light"
      }`}
    >
      {/* Main row — clickable */}
      <button
        type="button"
        onClick={hasInstalments ? onToggle : undefined}
        className={`flex items-center gap-3 p-3 w-full text-left ${hasInstalments ? "cursor-pointer" : "cursor-default"}`}
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          isDiscontinued ? "bg-amber-50" : "bg-brand-wash"
        }`}>
          {isDiscontinued ? (
            <UserX className="h-4 w-4 text-amber-500" />
          ) : (
            <Users className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {student.studentName}
            {student.disabilities && (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">{student.disabilities}</span>
            )}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs text-text-tertiary truncate">{student.studentId}</p>
            {isDiscontinued && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-300">
                Discontinued
              </Badge>
            )}
            {student.feePlan && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${planColor.bg} ${planColor.text}`}>
                {student.feePlan === "Advanced" && (
                  <Star className="h-2.5 w-2.5 mr-0.5" />
                )}
                {student.feePlan}
              </span>
            )}
            {frequencyLabel && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600">
                {frequencyLabel}
              </span>
            )}
            {student.paymentMode && (
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 gap-0.5 ${
                  student.paymentMode === "Online"
                    ? "border-blue-300 text-blue-600"
                    : "border-green-300 text-green-600"
                }`}
              >
                {student.paymentMode === "Online" ? (
                  <Wifi className="h-2.5 w-2.5" />
                ) : (
                  <Banknote className="h-2.5 w-2.5" />
                )}
                {student.paymentMode}
              </Badge>
            )}
            {!isDiscontinued && student.totalOutstanding === 0 && student.totalInvoiced > 0 && (
              <Badge variant="success" className="text-[10px] px-1.5 py-0 gap-0.5">
                <CircleCheck className="h-2.5 w-2.5" /> Fully Paid
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-text-primary">{formatCurrency(student.totalInvoiced)}</p>
            <p className="text-[10px] text-text-tertiary">total</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-success">{formatCurrency(student.totalCollected)}</p>
            <p className="text-[10px] text-success/70 flex items-center justify-end gap-0.5">
              <CircleCheck className="h-2.5 w-2.5" /> paid
            </p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-bold ${pending > 0 ? (isDiscontinued ? "text-amber-600" : "text-error") : "text-text-tertiary"}`}>
              {formatCurrency(pending)}
            </p>
            <p className={`text-[10px] flex items-center justify-end gap-0.5 ${
              pending > 0 ? (isDiscontinued ? "text-amber-500/70" : "text-error/70") : "text-text-tertiary"
            }`}>
              {pending > 0 ? (
                isDiscontinued ? (
                  <><TriangleAlert className="h-2.5 w-2.5" /> forfeited</>
                ) : (
                  <><Clock className="h-2.5 w-2.5" /> pending</>
                )
              ) : (
                "cleared"
              )}
            </p>
          </div>
          {student.duesTillToday > 0 && (
            <div className="text-right">
              <p className="text-sm font-bold text-orange-600">
                {formatCurrency(student.duesTillToday)}
              </p>
              <p className="text-[10px] text-orange-500/80 flex items-center justify-end gap-0.5">
                <CalendarClock className="h-2.5 w-2.5" /> overdue
              </p>
            </div>
          )}
          {hasInstalments && (
            <ChevronDown
              className={`h-4 w-4 text-text-tertiary transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          )}
        </div>
      </button>

      {/* Expandable instalment details */}
      <AnimatePresence>
        {expanded && hasInstalments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border-light mx-3" />
            <div className="px-3 pb-3 pt-2 space-y-1.5">
              <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider flex items-center gap-1 mb-2">
                <Receipt className="h-3 w-3" />
                Instalment Breakdown ({student.instalments.length})
              </p>
              {student.instalments.map((inv, idx) => {
                const status = instalmentStatus(inv);
                const style = STATUS_STYLE[status];
                const StatusIcon = style.icon;
                const paidPct = inv.grand_total > 0
                  ? Math.round((inv.paid / inv.grand_total) * 100)
                  : 0;

                return (
                  <motion.div
                    key={inv.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 ${style.bg}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <StatusIcon className={`h-3.5 w-3.5 shrink-0 ${style.text}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-text-primary">
                          Instalment {idx + 1}
                        </p>
                        <p className="text-[10px] text-text-tertiary">
                          Due: {new Date(inv.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-bold text-text-primary">{formatCurrency(inv.grand_total)}</p>
                        <p className="text-[10px] text-text-tertiary">amount</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold ${status === "paid" ? "text-success" : "text-text-secondary"}`}>
                          {formatCurrency(inv.paid)}
                        </p>
                        <p className="text-[10px] text-text-tertiary">paid</p>
                      </div>
                      {inv.outstanding_amount > 0 && (
                        <div className="text-right">
                          <p className={`text-xs font-bold ${status === "overdue" ? "text-orange-600" : "text-error"}`}>
                            {formatCurrency(inv.outstanding_amount)}
                          </p>
                          <p className="text-[10px] text-text-tertiary">due</p>
                        </div>
                      )}
                      <div className="w-16 hidden sm:block">
                        <div className="h-1.5 rounded-full bg-border-light overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              status === "paid" ? "bg-success" : status === "overdue" ? "bg-orange-500" : "bg-primary/40"
                            }`}
                            style={{ width: `${paidPct}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-text-tertiary text-right mt-0.5">{paidPct}%</p>
                      </div>
                      <Badge
                        variant={status === "paid" ? "success" : status === "overdue" ? "warning" : "info"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {style.label}
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ProgramStudentFeesPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.id as string);
  const programName = decodeURIComponent(params.program as string);
  const shortName = branchName.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const encodedBranch = encodeURIComponent(branchName);

  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  const { data: students, isLoading, isError } = useQuery({
    queryKey: ["director-program-student-fees", branchName, programName],
    queryFn: () => getBranchProgramStudentFees(branchName, programName),
    staleTime: 60_000,
    refetchOnMount: "always",
  });

  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // Derive available filter options from the data
  const { planOptions, frequencyOptions } = useMemo(() => {
    const plans = new Set<string>();
    const freqs = new Set<string>();
    for (const s of students ?? []) {
      if (s.feePlan) plans.add(s.feePlan);
      if (s.noOfInstalments) freqs.add(s.noOfInstalments);
    }
    return {
      planOptions: Array.from(plans).sort(),
      frequencyOptions: Array.from(freqs).sort((a, b) => Number(a) - Number(b)),
    };
  }, [students]);

  const filtered = useMemo(() => {
    return (students ?? []).filter((s) => {
      if (search && !s.studentName.toLowerCase().includes(search.toLowerCase()) && !s.studentId.toLowerCase().includes(search.toLowerCase())) return false;
      if (planFilter !== "all" && s.feePlan !== planFilter) return false;
      if (frequencyFilter !== "all" && s.noOfInstalments !== frequencyFilter) return false;
      return true;
    });
  }, [students, search, planFilter, frequencyFilter]);

  const hasActiveFilters = planFilter !== "all" || frequencyFilter !== "all";

  // Summary totals
  const totalFees = filtered.reduce((sum, s) => sum + s.totalInvoiced, 0);
  const totalCollected = filtered.reduce((sum, s) => sum + s.totalCollected, 0);
  const totalPending = filtered.reduce((sum, s) => sum + s.totalOutstanding, 0);
  const discontinuedCount = filtered.filter((s) => s.enabled === 0).length;
  const totalDues = filtered.reduce((sum, s) => sum + s.duesTillToday, 0);

  const exportToExcel = async () => {
    if (!filtered || filtered.length === 0) return;
    try {
      setIsExporting(true);
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "SmartUp ERP";
      workbook.created = new Date();

      const sanitizedSheetName = `${programName.replace(/[\\/*?:[\]]/g, "_").slice(0, 25)} Fees`;
      const sheet = workbook.addWorksheet(sanitizedSheetName, {
        views: [{ state: "frozen", ySplit: 4 }],
      });

      // ── Title & Meta Header Block ──
      sheet.mergeCells("A1:Q1");
      const titleCell = sheet.getCell("A1");
      titleCell.value = `SmartUp ERP — ${programName} Student Fee & Instalment Statement`;
      titleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF581C87" } }; // Deep brand purple
      titleCell.alignment = { vertical: "middle", horizontal: "center" };
      sheet.getRow(1).height = 30;

      sheet.mergeCells("A2:Q2");
      const subCell = sheet.getCell("A2");
      const todayFormatted = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      subCell.value = `Branch: ${branchName}   |   Class / Program: ${programName}   |   Generated: ${todayFormatted}   |   Total Students: ${filtered.length}`;
      subCell.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FF3730A3" } };
      subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } }; // Soft indigo tint
      subCell.alignment = { vertical: "middle", horizontal: "center" };
      sheet.getRow(2).height = 20;

      // Blank spacing row
      sheet.getRow(3).height = 8;

      // Column Definitions
      sheet.columns = [
        { header: "#", key: "idx", width: 6 },
        { header: "Student ID", key: "studentId", width: 22 },
        { header: "Student Name", key: "studentName", width: 28 },
        { header: "Status", key: "status", width: 14 },
        { header: "Fee Plan", key: "feePlan", width: 14 },
        { header: "Frequency", key: "frequency", width: 22 },
        { header: "Payment Mode", key: "paymentMode", width: 14 },
        { header: "Total Fee (₹)", key: "totalInvoiced", width: 16 },
        { header: "Total Paid (₹)", key: "totalCollected", width: 16 },
        { header: "Total Pending (₹)", key: "totalOutstanding", width: 16 },
        { header: "Overdue (₹)", key: "duesTillToday", width: 16 },
        { header: "Instalment", key: "instalment", width: 16 },
        { header: "Due Date", key: "dueDate", width: 16 },
        { header: "Inst. Amount (₹)", key: "instGrandTotal", width: 16 },
        { header: "Inst. Paid (₹)", key: "instPaid", width: 16 },
        { header: "Inst. Due (₹)", key: "instOutstanding", width: 16 },
        { header: "Inst. Status", key: "instStatus", width: 14 },
      ];

      // Table Header on Row 4
      const headerRow = sheet.getRow(4);
      headerRow.values = [
        "#",
        "Student ID",
        "Student Name",
        "Status",
        "Fee Plan",
        "Frequency",
        "Payment Mode",
        "Total Fee (₹)",
        "Total Paid (₹)",
        "Total Pending (₹)",
        "Overdue (₹)",
        "Instalment",
        "Due Date",
        "Inst. Amount (₹)",
        "Inst. Paid (₹)",
        "Inst. Due (₹)",
        "Inst. Status",
      ];
      headerRow.height = 24;
      headerRow.font = { name: "Segoe UI", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };

      const thinBorder: any = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      const numFmt = "₹#,##0.00";
      let isEvenStudent = false;

      filtered.forEach((student, studentIndex) => {
        const studentBg = isEvenStudent ? "FFF8FAFC" : "FFFFFFFF";
        isEvenStudent = !isEvenStudent;

        const hasInstalments = student.instalments && student.instalments.length > 0;
        const totalRows = hasInstalments ? student.instalments.length : 1;

        for (let idx = 0; idx < totalRows; idx++) {
          const inv = hasInstalments ? student.instalments[idx] : null;
          const status = inv ? instalmentStatus(inv) : null;
          const isFirstRow = idx === 0;

          const row = sheet.addRow({
            idx: isFirstRow ? studentIndex + 1 : "",
            studentId: isFirstRow ? student.studentId : "",
            studentName: isFirstRow ? (student.studentName + (student.disabilities ? ` (${student.disabilities})` : "")) : "",
            status: isFirstRow ? (student.enabled === 0 ? "Discontinued" : "Active") : "",
            feePlan: isFirstRow ? (student.feePlan || "-") : "",
            frequency: isFirstRow ? (PAYMENT_OPTION_LABELS[student.noOfInstalments ?? ""] || student.noOfInstalments || "-") : "",
            paymentMode: isFirstRow ? (student.paymentMode || "-") : "",
            totalInvoiced: isFirstRow ? student.totalInvoiced : "",
            totalCollected: isFirstRow ? student.totalCollected : "",
            totalOutstanding: isFirstRow ? student.totalOutstanding : "",
            duesTillToday: isFirstRow ? student.duesTillToday : "",
            instalment: inv ? `Instalment ${idx + 1}` : "-",
            dueDate: inv?.due_date
              ? new Date(inv.due_date).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "-",
            instGrandTotal: inv ? inv.grand_total : student.totalInvoiced,
            instPaid: inv ? inv.paid : student.totalCollected,
            instOutstanding: inv ? inv.outstanding_amount : student.totalOutstanding,
            instStatus: status
              ? status === "paid"
                ? "Paid"
                : status === "overdue"
                ? "Overdue"
                : "Upcoming"
              : student.totalOutstanding === 0
              ? "Paid"
              : student.duesTillToday > 0
              ? "Overdue"
              : "Pending",
          });

          row.height = 20;
          row.font = { name: "Segoe UI", size: 9.5 };

          // Format cells
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: studentBg } };
            cell.border = thinBorder;
            cell.alignment = { vertical: "middle" };

            // Center align specific text columns
            if ([1, 2, 4, 5, 6, 7, 12, 13, 17].includes(colNumber)) {
              cell.alignment = { vertical: "middle", horizontal: "center" };
            }
            // Right align number columns
            if ([8, 9, 10, 11, 14, 15, 16].includes(colNumber)) {
              cell.alignment = { vertical: "middle", horizontal: "right" };
              if (typeof cell.value === "number") {
                cell.numFmt = numFmt;
              }
            }
          });

          // Discontinued status color
          if (student.enabled === 0 && isFirstRow) {
            row.getCell("status").font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFD97706" } };
          }

          // Total Paid highlighting
          if (isFirstRow && student.totalCollected > 0) {
            row.getCell("totalCollected").font = { name: "Segoe UI", size: 9.5, color: { argb: "FF16A34A" } };
          }
          // Total Pending highlighting
          if (isFirstRow && student.totalOutstanding > 0) {
            row.getCell("totalOutstanding").font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFDC2626" } };
          }
          // Overdue highlighting
          if (isFirstRow && student.duesTillToday > 0) {
            row.getCell("duesTillToday").font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFEA580C" } };
          }

          // Instalment status colors
          const statusCell = row.getCell("instStatus");
          if (statusCell.value === "Paid") {
            statusCell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF16A34A" } };
          } else if (statusCell.value === "Overdue") {
            statusCell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFDC2626" } };
          } else if (statusCell.value === "Upcoming" || statusCell.value === "Pending") {
            statusCell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF2563EB" } };
          }

          // Instalment due highlighting
          const instDueCell = row.getCell("instOutstanding");
          if (typeof instDueCell.value === "number" && instDueCell.value > 0) {
            if (status === "overdue") {
              instDueCell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFDC2626" } };
            }
          }
        }
      });

      // ── Blank Row & Summary Footer ──
      sheet.addRow({}).height = 8;

      const summaryRow = sheet.addRow({
        studentName: "GRAND TOTAL",
        totalInvoiced: totalFees,
        totalCollected: totalCollected,
        totalOutstanding: totalPending,
        duesTillToday: totalDues,
      });

      summaryRow.height = 24;
      summaryRow.font = { name: "Segoe UI", bold: true, size: 10 };
      summaryRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3E8FF" } };
        cell.border = {
          top: { style: "medium", color: { argb: "FF7C3AED" } },
          bottom: { style: "double", color: { argb: "FF7C3AED" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        if ([8, 9, 10, 11].includes(colNumber)) {
          cell.alignment = { vertical: "middle", horizontal: "right" };
          cell.numFmt = numFmt;
        }
      });

      summaryRow.getCell("studentName").alignment = { vertical: "middle", horizontal: "center" };
      summaryRow.getCell("totalCollected").font = { name: "Segoe UI", bold: true, size: 10, color: { argb: "FF16A34A" } };
      summaryRow.getCell("totalOutstanding").font = { name: "Segoe UI", bold: true, size: 10, color: { argb: "FFDC2626" } };
      if (totalDues > 0) {
        summaryRow.getCell("duesTillToday").font = { name: "Segoe UI", bold: true, size: 10, color: { argb: "FFEA580C" } };
      }

      // Generate buffer and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileDate = new Date().toISOString().split("T")[0];
      const safeBranch = shortName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeProg = programName.replace(/[^a-zA-Z0-9_-]/g, "_");
      link.download = `${safeBranch}_${safeProg}_Fees_${fileDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export Excel:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* Back */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Link
          href={`/dashboard/director/branches/${encodedBranch}/fees`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {shortName} Fees
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{programName}</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {shortName} · Student-wise fee details
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={exportToExcel}
              disabled={isExporting || isLoading || filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              title="Download Excel statement of student fees and instalments"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5" />
              )}
              {isExporting ? "Exporting Excel..." : "Download Excel"}
            </button>
            <Badge variant="outline" className="text-xs">{branchName}</Badge>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      {!isLoading && !isError && (students?.length ?? 0) > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card className="border-border-light">
            <CardContent className="p-4 text-center">
              <IndianRupee className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalFees)}</p>
              <p className="text-xs text-text-tertiary">
                {hasActiveFilters ? "Filtered Total" : "Total Fees"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-success/20">
            <CardContent className="p-4 text-center">
              <CircleCheck className="h-5 w-5 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-success">{formatCurrency(totalCollected)}</p>
              <p className="text-xs text-text-tertiary">Collected</p>
            </CardContent>
          </Card>
          <Card className="border-error/20">
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 text-error mx-auto mb-2" />
              <p className="text-2xl font-bold text-error">{formatCurrency(totalPending)}</p>
              <p className="text-xs text-text-tertiary">Pending</p>
            </CardContent>
          </Card>
          <Card className={`border-orange-200/60 ${totalDues > 0 ? '' : 'opacity-60'}`}>
            <CardContent className="p-4 text-center">
              <CalendarClock className="h-5 w-5 text-orange-500 mx-auto mb-2" />
              <p className={`text-2xl font-bold ${totalDues > 0 ? 'text-orange-600' : 'text-text-tertiary'}`}>{formatCurrency(totalDues)}</p>
              <p className="text-xs text-text-tertiary">Overdue</p>
            </CardContent>
          </Card>
          <Card className="border-border-light">
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-primary">{filtered.length}</p>
              <p className="text-xs text-text-tertiary">Students</p>
              {discontinuedCount > 0 && (
                <p className="text-[10px] text-amber-500 mt-1">{discontinuedCount} discontinued</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search + Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {!isLoading && (planOptions.length > 0 || frequencyOptions.length > 0) && (
          <>
            <div className="flex items-center gap-1.5 text-sm text-text-secondary">
              <Filter className="h-4 w-4" />
            </div>

            {planOptions.length > 0 && (
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="text-sm rounded-lg border border-border-input bg-surface px-3 py-1.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Plans</option>
                {planOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}

            {frequencyOptions.length > 0 && (
              <select
                value={frequencyFilter}
                onChange={(e) => setFrequencyFilter(e.target.value)}
                className="text-sm rounded-lg border border-border-input bg-surface px-3 py-1.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Frequencies</option>
                {frequencyOptions.map((f) => (
                  <option key={f} value={f}>{PAYMENT_OPTION_LABELS[f] ?? `${f} Instalments`}</option>
                ))}
              </select>
            )}

            {hasActiveFilters && (
              <button
                onClick={() => { setPlanFilter("all"); setFrequencyFilter("all"); }}
                className="text-xs text-primary hover:text-primary/80 underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </>
        )}

        {/* Quick Excel export in filter row */}
        {!isLoading && filtered.length > 0 && (
          <button
            type="button"
            onClick={exportToExcel}
            disabled={isExporting}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            )}
            Excel ({filtered.length})
          </button>
        )}
      </motion.div>

      {/* Student List */}
      <div>
        {isLoading ? (
          <GifLoader />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <AlertCircle className="h-8 w-8 text-error" />
            <p className="text-sm text-error">Failed to load student fee details</p>
          </div>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            {search || hasActiveFilters ? (
              <>
                <Filter className="h-8 w-8 text-text-tertiary" />
                <p className="text-sm text-text-tertiary">
                  No students match your {search ? "search" : "filters"}
                </p>
              </>
            ) : (
              <>
                <Users className="h-8 w-8 text-text-tertiary" />
                <p className="text-sm text-text-tertiary">No students found for this class</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((student) => (
              <StudentRow
                key={student.studentId}
                student={student}
                expanded={expandedStudent === student.studentId}
                onToggle={() =>
                  setExpandedStudent(
                    expandedStudent === student.studentId ? null : student.studentId
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
