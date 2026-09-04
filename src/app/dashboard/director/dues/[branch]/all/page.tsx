"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  AlertCircle,
  CalendarClock,
  ArrowLeft,
  Filter,
  Download,
  Calendar,
  Phone,
  Search,
  X,
  Users,
  BookOpen,
  Sheet,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getDuesTodayByBranchStudents, type DuesTodayStudentRow } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

const PAYMENT_OPTION_LABELS: Record<string, string> = {
  "1": "One-Time Payment",
  "4": "Quarterly",
  "6": "Bi-Monthly (6 Inst.)",
  "8": "Monthly (8 Inst.)",
};

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  Advanced: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-300" },
  Intermediate: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300" },
  Basic: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300" },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function exportBranchStudentsCSV(
  students: DuesTodayStudentRow[],
  branchName: string
) {
  const headers = [
    "Sl No",
    "Student Name",
    "Student ID",
    "Class",
    "Batch",
    "Admission Date",
    "Plan",
    "Payment Frequency",
    "Instalment",
    "Invoice No",
    "Due Date",
    "Invoice Total (INR)",
    "Invoice Paid (INR)",
    "Invoice Overdue (INR)",
    "Student Total Fee (INR)",
    "Student Total Paid (INR)",
    "Student Overdue (INR)",
    "Remaining Balance (INR)",
    "Fee Status",
    "Guardian Name",
    "Guardian Phone",
    "Branch",
  ];

  const rows: (string | number)[][] = [];

  students.forEach((s, idx) => {
    const status =
      s.total_dues > 0
        ? "Overdue"
        : (s.balance_fee ?? 0) === 0
        ? "Fully Paid"
        : "Up-to-Date";

    const invs = s.overdue_invoices ?? [];

    if (invs.length === 0) {
      rows.push([
        idx + 1,
        s.student_name,
        s.student_id,
        s.class_name ? s.class_name.replace(" Tuition Fee", "") : "—",
        s.batch_name || "—",
        s.admission_date ? formatDate(s.admission_date) : "—",
        s.plan || "—",
        PAYMENT_OPTION_LABELS[s.no_of_instalments] || s.no_of_instalments || "—",
        "—",
        "—",
        "—",
        s.total_fee ?? 0,
        s.paid_fee ?? 0,
        s.total_dues ?? 0,
        s.total_fee ?? 0,
        s.paid_fee ?? 0,
        s.total_dues ?? 0,
        s.balance_fee ?? 0,
        status,
        s.guardian_name || "—",
        s.guardian_phone || "—",
        branchName,
      ]);
    } else {
      invs.forEach((inv, invIdx) => {
        rows.push([
          invIdx === 0 ? idx + 1 : "",
          invIdx === 0 ? s.student_name : "",
          invIdx === 0 ? s.student_id : "",
          invIdx === 0 ? (s.class_name ? s.class_name.replace(" Tuition Fee", "") : "—") : "",
          invIdx === 0 ? (s.batch_name || "—") : "",
          invIdx === 0 ? (s.admission_date ? formatDate(s.admission_date) : "—") : "",
          invIdx === 0 ? (s.plan || "—") : "",
          invIdx === 0 ? (PAYMENT_OPTION_LABELS[s.no_of_instalments] || s.no_of_instalments || "—") : "",
          inv.instalment_label || `Instalment ${invIdx + 1}`,
          inv.name,
          inv.due_date ? formatDate(inv.due_date) : "—",
          inv.grand_total ?? 0,
          inv.paid ?? 0,
          inv.amount ?? 0,
          invIdx === 0 ? (s.total_fee ?? 0) : "",
          invIdx === 0 ? (s.paid_fee ?? 0) : "",
          invIdx === 0 ? (s.total_dues ?? 0) : "",
          invIdx === 0 ? (s.balance_fee ?? 0) : "",
          invIdx === 0 ? status : "",
          invIdx === 0 ? (s.guardian_name || "—") : "",
          invIdx === 0 ? (s.guardian_phone || "—") : "",
          invIdx === 0 ? branchName : "",
        ]);
      });
    }
  });

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const cleanBranch = branchName.replace(/[^a-zA-Z0-9-_]/g, "_");
  link.href = url;
  link.setAttribute(
    "download",
    `${cleanBranch}_All_Overdue_Students_Report_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function exportBranchStudentsExcel(
  students: DuesTodayStudentRow[],
  branchName: string
) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SmartUp ERP";
  workbook.created = new Date();

  const sanitizedSheetName = `${branchName.replace(/[\\/*?:[\]]/g, "_").slice(0, 25)} Fees`;
  const sheet = workbook.addWorksheet(sanitizedSheetName, {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  // ── Row 1: Title Header Bar ──
  sheet.mergeCells("A1:S1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "Inst. Status";
  titleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A154B" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(1).height = 30;

  // ── Row 2: Sub-Banner Line ──
  sheet.mergeCells("A2:S2");
  const subCell = sheet.getCell("A2");
  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  subCell.value = `Branch: ${branchName}   |   Report: All Overdue Students   |   Generated: ${todayFormatted}   |   Total Students: ${students.length}   |   Report exported from ERP`;
  subCell.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FF3730A3" } };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
  subCell.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(2).height = 20;

  // ── Row 3: Blank Spacing Row ──
  sheet.getRow(3).height = 8;

  // ── Column Definitions ──
  sheet.columns = [
    { header: "#", key: "idx", width: 6 },
    { header: "Student ID", key: "student_id", width: 22 },
    { header: "Student Name", key: "name", width: 28 },
    { header: "Status", key: "status", width: 12 },
    { header: "Fee Plan", key: "plan", width: 14 },
    { header: "Frequency", key: "freq", width: 22 },
    { header: "Payment Mode", key: "payment_mode", width: 14 },
    { header: "Total Fee (₹)", key: "total_fee", width: 16 },
    { header: "Total Paid (₹)", key: "total_paid", width: 16 },
    { header: "Total Pending (₹)", key: "total_pending", width: 16 },
    { header: "Overdue (₹)", key: "student_overdue", width: 16 },
    { header: "Instalment", key: "instalment", width: 16 },
    { header: "Due Date", key: "due_date", width: 16 },
    { header: "Invoice No", key: "invoice_no", width: 22 },
    { header: "Inst. Amount (₹)", key: "inv_total", width: 16 },
    { header: "Inst. Paid (₹)", key: "inv_paid", width: 16 },
    { header: "Inst. Due (₹)", key: "inv_overdue", width: 16 },
    { header: "Guardian Name", key: "guardian", width: 22 },
    { header: "Guardian Phone", key: "phone", width: 16 },
  ];

  // ── Row 4: Column Header Formatting ──
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
    "Invoice No",
    "Inst. Amount (₹)",
    "Inst. Paid (₹)",
    "Inst. Due (₹)",
    "Guardian Name",
    "Guardian Phone",
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

  students.forEach((s, idx) => {
    const studentBg = isEvenStudent ? "FFF8FAFC" : "FFFFFFFF";
    isEvenStudent = !isEvenStudent;

    const status =
      s.total_dues > 0
        ? "Active"
        : (s.balance_fee ?? 0) === 0
        ? "Active"
        : "Active";

    const invs = s.overdue_invoices ?? [];

    if (invs.length === 0) {
      const addedRow = sheet.addRow({
        idx: idx + 1,
        student_id: s.student_id,
        name: s.student_name,
        status,
        plan: s.plan || "Basic",
        freq: PAYMENT_OPTION_LABELS[s.no_of_instalments] || s.no_of_instalments || "—",
        payment_mode: "—",
        total_fee: s.total_fee ?? 0,
        total_paid: s.paid_fee ?? 0,
        total_pending: s.balance_fee ?? 0,
        student_overdue: s.total_dues ?? 0,
        instalment: "—",
        due_date: "—",
        invoice_no: "—",
        inv_total: s.total_fee ?? 0,
        inv_paid: s.paid_fee ?? 0,
        inv_overdue: s.total_dues ?? 0,
        guardian: s.guardian_name || "—",
        phone: s.guardian_phone || "—",
      });

      addedRow.height = 20;

      sheet.columns.forEach((col) => {
        if (!col.key) return;
        const cell = addedRow.getCell(col.key);
        cell.font = { name: "Segoe UI", size: 9.5 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: studentBg } };
        cell.border = thinBorder;
        cell.alignment = { vertical: "middle" };
      });

      addedRow.getCell("total_fee").numFmt = numFmt;
      addedRow.getCell("total_paid").numFmt = numFmt;
      addedRow.getCell("total_paid").font = { name: "Segoe UI", size: 9.5, color: { argb: "FF16A34A" } };
      addedRow.getCell("total_pending").numFmt = numFmt;
      addedRow.getCell("total_pending").font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFDC2626" } };
      addedRow.getCell("student_overdue").numFmt = numFmt;
      addedRow.getCell("student_overdue").font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFEA580C" } };

      addedRow.getCell("inv_total").numFmt = numFmt;
      addedRow.getCell("inv_paid").numFmt = numFmt;
      addedRow.getCell("inv_overdue").numFmt = numFmt;
    } else {
      invs.forEach((inv, invIdx) => {
        const addedRow = sheet.addRow({
          idx: invIdx === 0 ? idx + 1 : "",
          student_id: invIdx === 0 ? s.student_id : "",
          name: invIdx === 0 ? s.student_name : "",
          status: invIdx === 0 ? status : "",
          plan: invIdx === 0 ? (s.plan || "Basic") : "",
          freq: invIdx === 0 ? (PAYMENT_OPTION_LABELS[s.no_of_instalments] || s.no_of_instalments || "—") : "",
          payment_mode: invIdx === 0 ? "—" : "",
          total_fee: invIdx === 0 ? (s.total_fee ?? 0) : "",
          total_paid: invIdx === 0 ? (s.paid_fee ?? 0) : "",
          total_pending: invIdx === 0 ? (s.balance_fee ?? 0) : "",
          student_overdue: invIdx === 0 ? (s.total_dues ?? 0) : "",
          instalment: inv.instalment_label || `Instalment ${invIdx + 1}`,
          due_date: inv.due_date ? formatDate(inv.due_date) : "—",
          invoice_no: inv.name,
          inv_total: inv.grand_total ?? 0,
          inv_paid: inv.paid ?? 0,
          inv_overdue: inv.amount ?? 0,
          guardian: invIdx === 0 ? (s.guardian_name || "—") : "",
          phone: invIdx === 0 ? (s.guardian_phone || "—") : "",
        });

        addedRow.height = 20;

        sheet.columns.forEach((col) => {
          if (!col.key) return;
          const cell = addedRow.getCell(col.key);
          cell.font = { name: "Segoe UI", size: 9.5 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: studentBg } };
          cell.border = thinBorder;
          cell.alignment = { vertical: "middle" };
        });

        addedRow.getCell("inv_total").numFmt = numFmt;
        addedRow.getCell("inv_paid").numFmt = numFmt;
        if ((inv.paid ?? 0) > 0) {
          addedRow.getCell("inv_paid").font = { name: "Segoe UI", size: 9.5, color: { argb: "FF16A34A" } };
        }
        addedRow.getCell("inv_overdue").numFmt = numFmt;
        addedRow.getCell("inv_overdue").font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFEA580C" } };

        if (invIdx === 0) {
          addedRow.getCell("total_fee").numFmt = numFmt;
          addedRow.getCell("total_paid").numFmt = numFmt;
          addedRow.getCell("total_paid").font = { name: "Segoe UI", size: 9.5, color: { argb: "FF16A34A" } };
          addedRow.getCell("total_pending").numFmt = numFmt;
          addedRow.getCell("total_pending").font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFDC2626" } };
          addedRow.getCell("student_overdue").numFmt = numFmt;
          addedRow.getCell("student_overdue").font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFEA580C" } };
        }
      });
    }
  });

  const cleanBranch = branchName.replace(/[^a-zA-Z0-9-_]/g, "_");
  const buf = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${cleanBranch}_All_Overdue_Students_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DirectorBranchAllStudentsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const branch = decodeURIComponent(params.branch as string);
  const shortBranch = branch.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const asOf = searchParams.get("as_of") || undefined;
  const childQs = asOf ? `?as_of=${asOf}` : "";

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");

  const { data: students, isLoading, isError } = useQuery({
    queryKey: ["director-branch-all-students", branch, asOf],
    queryFn: () => getDuesTodayByBranchStudents(branch, asOf),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Extract filter options
  const { classOptions, batchOptions, planOptions, frequencyOptions } = useMemo(() => {
    const classes = new Set<string>();
    const batches = new Set<string>();
    const plans = new Set<string>();
    const freqs = new Set<string>();

    for (const s of students ?? []) {
      if (s.class_name) classes.add(s.class_name);
      if (s.batch_name) batches.add(s.batch_name);
      if (s.plan) plans.add(s.plan);
      if (s.no_of_instalments) freqs.add(s.no_of_instalments);
    }

    return {
      classOptions: Array.from(classes).sort(),
      batchOptions: Array.from(batches).sort(),
      planOptions: Array.from(plans).sort(),
      frequencyOptions: Array.from(freqs).sort((a, b) => Number(a) - Number(b)),
    };
  }, [students]);

  // Filter students
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    const q = searchQuery.trim().toLowerCase();

    return students.filter((s) => {
      if (classFilter !== "all" && s.class_name !== classFilter) return false;
      if (batchFilter !== "all" && s.batch_name !== batchFilter) return false;
      if (planFilter !== "all" && s.plan !== planFilter) return false;
      if (frequencyFilter !== "all" && s.no_of_instalments !== frequencyFilter) return false;

      if (q) {
        const nameMatch = s.student_name.toLowerCase().includes(q);
        const idMatch = s.student_id.toLowerCase().includes(q);
        const phoneMatch = (s.guardian_phone || "").includes(q);
        const classMatch = (s.class_name || "").toLowerCase().includes(q);
        const batchMatch = (s.batch_name || "").toLowerCase().includes(q);
        if (!nameMatch && !idMatch && !phoneMatch && !classMatch && !batchMatch) return false;
      }

      return true;
    });
  }, [students, classFilter, batchFilter, planFilter, frequencyFilter, searchQuery]);

  const totalOverdue = filteredStudents.reduce((sum, s) => sum + s.total_dues, 0);
  const totalBilled = filteredStudents.reduce((sum, s) => sum + (s.total_fee ?? 0), 0);
  const totalPaid = filteredStudents.reduce((sum, s) => sum + (s.paid_fee ?? 0), 0);
  const hasActiveFilters =
    classFilter !== "all" ||
    batchFilter !== "all" ||
    planFilter !== "all" ||
    frequencyFilter !== "all" ||
    searchQuery.length > 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/director/dues${childQs}`}
            className="text-text-tertiary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              {shortBranch} — All Overdue Students
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Complete student-wise overdue list across all classes at {shortBranch}
            </p>
          </div>
        </div>

        {/* Download Excel / CSV Report Buttons */}
        {students && students.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              onClick={() => exportBranchStudentsExcel(filteredStudents, shortBranch)}
              className="rounded-xl inline-flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow-xs px-3 py-2 cursor-pointer"
              title="Export to Excel (.xlsx)"
            >
              <Sheet className="w-4 h-4" />
              <span>Excel ({filteredStudents.length})</span>
            </Button>
            <Button
              onClick={() => exportBranchStudentsCSV(filteredStudents, shortBranch)}
              className="rounded-xl inline-flex items-center gap-1.5 bg-[#5f2ea8] text-white hover:bg-[#5f2ea8]/90 text-xs font-bold shadow-xs px-3 py-2 cursor-pointer"
              title="Export to CSV (.csv)"
            >
              <Download className="w-4 h-4" />
              <span>CSV ({filteredStudents.length})</span>
            </Button>
          </div>
        )}
      </motion.div>

      {/* Summary Card */}
      <motion.div variants={itemVariants}>
        <Card className="border-orange-200/60 dark:border-slate-800 bg-white dark:bg-[#0E1526]/85">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center shrink-0">
                  <CalendarClock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-text-secondary font-medium">Branch Overdue</p>
                  <p className="text-xl font-bold text-orange-600">
                    {isLoading ? "..." : formatCurrency(totalOverdue)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 border-l border-slate-100 dark:border-slate-800/80 pl-4">
                <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-text-secondary font-medium">Total Billed</p>
                  <p className="text-xl font-bold text-text-primary">
                    {isLoading ? "..." : formatCurrency(totalBilled)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 border-l border-slate-100 dark:border-slate-800/80 pl-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                  <CalendarClock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-text-secondary font-medium">Collected / Paid</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {isLoading ? "..." : formatCurrency(totalPaid)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 border-l border-slate-100 dark:border-slate-800/80 pl-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-text-secondary font-medium">Overdue Students</p>
                  <p className="text-xl font-bold text-text-primary">
                    {isLoading ? "..." : `${filteredStudents.length} / ${(students ?? []).length}`}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filter Bar */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white/70 dark:bg-[#0E1526]/70 p-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 backdrop-blur shadow-xs">
        {/* Search */}
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            placeholder="Search student, class, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-7 py-1.5 text-xs bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-[#5f2ea8]/20 focus:border-[#5f2ea8] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary p-0.5 rounded-full"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {classOptions.length > 0 && (
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1526] px-2.5 py-1.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-[#5f2ea8]/20 max-w-[150px] truncate"
            >
              <option value="all">All Classes</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c.replace(" Tuition Fee", "")}
                </option>
              ))}
            </select>
          )}

          {batchOptions.length > 0 && (
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1526] px-2.5 py-1.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-[#5f2ea8]/20 max-w-[150px] truncate"
            >
              <option value="all">All Batches</option>
              {batchOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}

          {planOptions.length > 0 && (
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1526] px-2.5 py-1.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-[#5f2ea8]/20"
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
              className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1526] px-2.5 py-1.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-[#5f2ea8]/20"
            >
              <option value="all">All Frequencies</option>
              {frequencyOptions.map((f) => (
                <option key={f} value={f}>{PAYMENT_OPTION_LABELS[f] ?? `${f} Inst.`}</option>
              ))}
            </select>
          )}

          {hasActiveFilters && (
            <button
              onClick={() => {
                setClassFilter("all");
                setBatchFilter("all");
                setPlanFilter("all");
                setFrequencyFilter("all");
                setSearchQuery("");
              }}
              className="text-xs text-[#5f2ea8] hover:underline font-bold px-1"
            >
              Reset
            </button>
          )}
        </div>
      </motion.div>

      {/* Student Cards List */}
      {isLoading ? (
        <GifLoader />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 bg-white dark:bg-[#0E1526]/85 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error font-medium">Failed to load branch overdue students</p>
        </div>
      ) : !students?.length ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 bg-white dark:bg-[#0E1526]/85 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <CalendarClock className="h-8 w-8 text-success" />
          <p className="text-sm text-success font-medium">No overdue students in {shortBranch} — all caught up!</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 bg-white dark:bg-[#0E1526]/85 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <Filter className="h-8 w-8 text-text-tertiary" />
          <p className="text-sm text-text-secondary font-medium">No students match the selected filters</p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setClassFilter("all");
                setBatchFilter("all");
                setPlanFilter("all");
                setFrequencyFilter("all");
                setSearchQuery("");
              }}
              className="rounded-xl text-xs font-bold text-[#5f2ea8]"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-3">
          {filteredStudents.map((student, idx) => {
            const planColor = PLAN_COLORS[student.plan] ?? { bg: "bg-gray-50", text: "text-gray-600" };
            const frequencyLabel = PAYMENT_OPTION_LABELS[student.no_of_instalments] ?? "";
            const displayClassName = student.class_name ? student.class_name.replace(" Tuition Fee", "") : "";

            return (
              <motion.div key={student.student_id} variants={itemVariants}>
                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#0E1526]/90 shadow-xs hover:border-[#5f2ea8]/30 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                    {/* Student Info, Class & Admission Date */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center shrink-0 mt-0.5">
                        <GraduationCap className="h-5 w-5 text-[#5f2ea8] dark:text-purple-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-base font-bold text-text-primary">
                            <span className="text-text-tertiary mr-2 font-mono text-xs">#{idx + 1}</span>
                            {student.student_name}
                          </p>

                          {/* Student Class Badge */}
                          {displayClassName && (
                            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold bg-[#5f2ea8]/10 text-[#5f2ea8] dark:bg-purple-950/50 dark:text-purple-300 border border-[#5f2ea8]/20">
                              <BookOpen className="w-3 h-3" />
                              <span>{displayClassName}</span>
                            </span>
                          )}

                          {/* Batch Name */}
                          {student.batch_name && (
                            <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-text-secondary border border-slate-200/60 dark:border-slate-800">
                              {student.batch_name}
                            </span>
                          )}

                          {student.plan && (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${planColor.bg} ${planColor.text}`}>
                              {student.plan}
                            </span>
                          )}

                          {frequencyLabel && (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-text-secondary">
                              {frequencyLabel}
                            </span>
                          )}
                        </div>

                        {/* ID, Admission Date & Contact */}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-text-tertiary">
                          <span className="font-mono text-text-secondary font-medium">{student.student_id}</span>
                          {student.admission_date && (
                            <span className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-800 font-medium text-text-secondary">
                              <Calendar className="w-3 h-3 text-[#5f2ea8]" />
                              <span>Admitted: {formatDate(student.admission_date)}</span>
                            </span>
                          )}
                          {student.guardian_phone && (
                            <div className="flex items-center gap-1 font-mono text-text-secondary">
                              <Phone className="w-3 h-3 text-text-tertiary" />
                              <span>{student.guardian_phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Financial Summary: Total Fee, Paid Fee, Overdue */}
                    <div className="flex items-center gap-4 sm:gap-6 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                      {student.total_fee !== undefined && student.total_fee > 0 && (
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-bold">Total Fee</p>
                          <p className="text-xs sm:text-sm font-bold text-text-primary">
                            {formatCurrency(student.total_fee)}
                          </p>
                        </div>
                      )}

                      {student.paid_fee !== undefined && (
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">Paid Fee</p>
                          <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(student.paid_fee)}
                          </p>
                        </div>
                      )}

                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-orange-600 font-bold">Overdue</p>
                        <p className="text-base sm:text-lg font-black text-orange-600">
                          {formatCurrency(student.total_dues)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Overdue invoices detail */}
                  {student.overdue_invoices.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                      <p className="text-[11px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider">
                        Overdue Invoices ({student.overdue_invoices.length}):
                      </p>
                      {student.overdue_invoices.map((inv) => (
                        <div
                          key={inv.name}
                          className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] font-mono text-text-tertiary border-slate-200 dark:border-slate-800">
                              {inv.name}
                            </Badge>
                            {inv.instalment_label && (
                              <Badge variant="info" className="text-[10px]">
                                {inv.instalment_label}
                              </Badge>
                            )}
                            <span className="text-text-secondary text-[11px]">
                              Due: {formatDate(inv.due_date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <p className="text-[10px] text-text-tertiary">Invoice Total</p>
                              <p className="font-medium text-text-primary text-xs">{formatCurrency(inv.grand_total)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-orange-600 font-bold">Pending</p>
                              <p className="font-bold text-orange-600 text-xs">{formatCurrency(inv.amount)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
