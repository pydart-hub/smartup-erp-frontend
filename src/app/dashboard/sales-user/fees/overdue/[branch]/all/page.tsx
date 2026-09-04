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
  Phone,
  User,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Users,
  FileDown,
  Sheet,
  CalendarDays,
  PhoneCall,
  CheckCircle2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getDuesTodayByBranchStudents, getRecentlyPaidClaims } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";
import { FollowUpDrawer } from "@/components/fees/FollowUpDrawer";
import { FollowUpBadge } from "@/components/fees/FollowUpBadge";
import { getBranchFollowUps } from "@/lib/api/followup";
const PAYMENT_OPTION_LABELS: Record<string, string> = {
  "1": "One-Time",
  "4": "Quarterly",
  "6": "Bi-Monthly (6)",
  "8": "Monthly (8)",
};

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Advanced: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  Intermediate: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Basic: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
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

export default function BranchAllStudentsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const branch = decodeURIComponent(params.branch as string);
  const shortBranch = branch.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const asOf = searchParams.get("as_of") || undefined;
  const childQs = asOf ? `?as_of=${asOf}` : "";

  const [planFilter, setPlanFilter] = useState("all");
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [drawerStudent, setDrawerStudent] = useState<{ student_id: string; student_name: string; branch: string } | null>(null);
  const [drawerDefaults, setDrawerDefaults] = useState<{
    callStatus?: string;
    paymentReceived?: boolean;
    amountReceived?: number;
    paymentMode?: string;
    invoiceRef?: string;
    hidePaymentReceived?: boolean;
  } | null>(null);


  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const { data: students, isLoading, isError } = useQuery({
    queryKey: ["branch-all-students", branch, asOf],
    queryFn: () => getDuesTodayByBranchStudents(branch, asOf),
    staleTime: 30_000,
    refetchInterval: 120_000,
  });

  // Follow-up logs keyed by student_id - single branch request
  const { data: allLogs } = useQuery({
    queryKey: ["followup-branch-all", branch],
    queryFn: () => getBranchFollowUps(branch),
    enabled: !!branch,
    staleTime: 60_000,
  });

  const { data: recentlyPaidClaims } = useQuery({
    queryKey: ["recently-paid-claims", branch],
    queryFn: () => getRecentlyPaidClaims(branch),
    enabled: !!branch,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const { planOptions, frequencyOptions, classOptions, batchOptions } = useMemo(() => {
    const plans = new Set<string>();
    const freqs = new Set<string>();
    const classes = new Set<string>();
    const batches = new Set<string>();
    for (const s of students ?? []) {
      if (s.plan) plans.add(s.plan);
      if (s.no_of_instalments) freqs.add(s.no_of_instalments);
      if (s.class_name) classes.add(s.class_name);
      if (s.batch_name) batches.add(s.batch_name);
    }
    return {
      planOptions: Array.from(plans).sort(),
      frequencyOptions: Array.from(freqs).sort((a, b) => Number(a) - Number(b)),
      classOptions: Array.from(classes).sort(),
      batchOptions: Array.from(batches).sort(),
    };
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    const q = search.toLowerCase().trim();
    return students.filter((s) => {
      if (planFilter !== "all" && s.plan !== planFilter) return false;
      if (frequencyFilter !== "all" && s.no_of_instalments !== frequencyFilter) return false;
      if (classFilter !== "all" && s.class_name !== classFilter) return false;
      if (batchFilter !== "all" && s.batch_name !== batchFilter) return false;
      if (q && !s.student_name.toLowerCase().includes(q) && !s.student_id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [students, planFilter, frequencyFilter, classFilter, batchFilter, search]);

  const totalDues = filteredStudents.reduce((s, st) => s + st.total_dues, 0);
  const hasActiveFilters = planFilter !== "all" || frequencyFilter !== "all" || classFilter !== "all" || batchFilter !== "all" || search.trim() !== "";

  function exportToPDF() {
    // Dynamic import to avoid SSR issues
    import("jspdf").then(({ default: jsPDF }) =>
      import("jspdf-autotable").then(({ default: autoTable }) => {
        const doc = new jsPDF({ orientation: "landscape" });
        const title = `${shortBranch} - Overdue Students`;
        const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

        doc.setFontSize(14);
        doc.text(title, 14, 16);
        doc.setFontSize(9);
        doc.text(
          `Generated: ${dateStr} | Total Overdue: ?${totalDues.toLocaleString("en-IN")} | Students: ${filteredStudents.length}`,
          14,
          24
        );

        const rows = filteredStudents.map((s, i) => [
          `${i + 1}`,
          s.student_name,
          s.student_id,
          (s.class_name ?? "").replace(" Tuition Fee", ""),
          s.batch_name ?? "",
          s.plan ?? "",
          PAYMENT_OPTION_LABELS[s.no_of_instalments] ?? s.no_of_instalments ?? "",
          s.guardian_name ?? "",
          s.guardian_phone ?? "",
          `?${s.total_dues.toLocaleString("en-IN")}`,
        ]);

        autoTable(doc, {
          head: [["#", "Name", "Student ID", "Class", "Batch", "Plan", "Frequency", "Guardian", "Phone", "Overdue"]],
          body: rows,
          startY: 30,
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [255, 247, 237] },
          columnStyles: { 9: { halign: "right", fontStyle: "bold" } },
        });

        doc.save(`${shortBranch.replace(/ /g, "-")}-overdue-${new Date().toISOString().slice(0, 10)}.pdf`);
      })
    );
  }

  async function exportToExcel() {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SmartUp ERP";
    workbook.created = new Date();

    const sanitizedSheetName = `${shortBranch.replace(/[\\/*?:[\]]/g, "_").slice(0, 25)} Fees`;
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
    subCell.value = `Branch: ${branch}   |   Report: All Overdue Students   |   Generated: ${todayFormatted}   |   Total Students: ${filteredStudents.length}   |   Report exported from ERP`;
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

    filteredStudents.forEach((s, idx) => {
      const studentBg = isEvenStudent ? "FFF8FAFC" : "FFFFFFFF";
      isEvenStudent = !isEvenStudent;

      const status = "Active";
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

    const buf = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${shortBranch.replace(/ /g, "-")}-overdue-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5 pb-8"
    >
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <Link
          href={`/dashboard/sales-user/fees/overdue${childQs}`}
          className="text-text-tertiary hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {shortBranch} - All Overdue Students
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Complete list - all classes &amp; batches
          </p>
        </div>
        {!isLoading && filteredStudents.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
              title="Export to Excel"
            >
              <Sheet className="h-3.5 w-3.5" />
              Excel
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
              title="Export to PDF"
            >
              <FileDown className="h-3.5 w-3.5" />
              PDF
            </button>
          </div>
        )}
      </motion.div>

      {/* Summary card */}
      <motion.div variants={itemVariants}>
        <Card className="border-orange-200/60">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
              <CalendarClock className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">
                {hasActiveFilters ? "Filtered Overdue" : "Branch Overdue"}
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {isLoading ? "..." : formatCurrency(totalDues)}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-text-secondary">Students</p>
              <p className="text-xl font-bold text-text-primary">
                {isLoading ? "..." : filteredStudents.length}
                {!isLoading && students && filteredStudents.length !== students.length && (
                  <span className="text-sm font-normal text-text-tertiary ml-1">
                    / {students.length}
                  </span>
                )}
              </p>
            </div>
            {!!recentlyPaidClaims?.length && (
              <div className="text-right">
                <p className="text-sm text-text-secondary">Overdue + Paid</p>
                <Link
                  href={`/dashboard/sales-user/fees/overdue/${encodeURIComponent(branch)}/paid-history${childQs}`}
                  className="text-xl font-bold text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                >
                  {recentlyPaidClaims?.length}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {false && !!recentlyPaidClaims?.length && (
        <motion.div variants={itemVariants}>
          <Card className="border-emerald-200/70 bg-emerald-50/40">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-sm font-semibold text-text-primary">Past 4 Days Paid History</h2>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Recent branch payment history for the last 4 days. Use this to log or claim follow-up conversion.
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  {recentlyPaidClaims?.length} student{recentlyPaidClaims?.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-2">
                {recentlyPaidClaims?.map((claim) => (
                  <div
                    key={claim.student_id}
                    className="rounded-xl border border-emerald-200 bg-white/80 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-text-primary">{claim.student_name}</p>
                          <span className="text-[10px] text-text-tertiary font-mono">{claim.student_id}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
                          <span>
                            {claim.latest_followup
                              ? `Last call: ${formatDate(claim.latest_followup.call_date)}`
                              : `Paid on: ${formatDate(claim.recent_payment.posting_date)}`}
                          </span>
                          <span>|</span>
                          <span>
                            {claim.latest_followup
                              ? `by ${claim.latest_followup.called_by.split("@")[0]}`
                              : "No follow-up log yet"}
                          </span>
                          <span>|</span>
                          <span className="text-emerald-700 font-medium">
                            Paid {formatCurrency(claim.recent_payment.paid_amount)}
                          </span>
                          <span>|</span>
                          <span>{claim.recent_payment.mode_of_payment || "Payment received"}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setDrawerStudent({ student_id: claim.student_id, student_name: claim.student_name, branch });
                          setDrawerDefaults({
                            callStatus: "Already Paid",
                            paymentReceived: true,
                            amountReceived: claim.recent_payment.paid_amount,
                            paymentMode: claim.recent_payment.mode_of_payment,
                            invoiceRef: claim.recent_payment.name,
                            hidePaymentReceived: false,
                          });
                        }}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        <PhoneCall className="h-3 w-3" />
                        Claim Conversion
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search + Filters */}
      {!isLoading && students && students.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or ID..."
                className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-border-input bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter label */}
            <div className="flex items-center gap-1.5 text-sm text-text-secondary shrink-0">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </div>

            {planOptions.length > 0 && (
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="text-sm rounded-lg border border-border-input bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Plans</option>
                {planOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}

            {classOptions.length > 0 && (
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="text-sm rounded-lg border border-border-input bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Classes</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>{c.replace(" Tuition Fee", "")}</option>
                ))}
              </select>
            )}

            {batchOptions.length > 0 && (
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="text-sm rounded-lg border border-border-input bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Batches</option>
                {batchOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            )}

            {frequencyOptions.length > 0 && (
              <select
                value={frequencyFilter}
                onChange={(e) => setFrequencyFilter(e.target.value)}
                className="text-sm rounded-lg border border-border-input bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Frequencies</option>
                {frequencyOptions.map((f) => (
                  <option key={f} value={f}>
                    {PAYMENT_OPTION_LABELS[f] ?? `${f} Instalments`}
                  </option>
                ))}
              </select>
            )}

            {hasActiveFilters && (
              <button
                onClick={() => { setPlanFilter("all"); setFrequencyFilter("all"); setClassFilter("all"); setBatchFilter("all"); setSearch(""); }}
                className="text-xs text-primary hover:text-primary/80 underline underline-offset-2 shrink-0"
              >
                Clear all
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Student list */}
      {isLoading ? (
        <GifLoader size="lg" />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load student data</p>
        </div>
      ) : !students?.length ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <CalendarClock className="h-8 w-8 text-success" />
          <p className="text-sm text-success font-medium">No overdue fees for {shortBranch}!</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <Users className="h-8 w-8 text-text-tertiary" />
          <p className="text-sm text-text-secondary">No students match the current filters</p>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-3"
        >
          {filteredStudents.map((student, idx) => {
            const planColor =
              PLAN_COLORS[student.plan] ?? {
                bg: "bg-gray-50",
                text: "text-gray-600",
                border: "border-gray-200",
              };
            const frequencyLabel =
              PAYMENT_OPTION_LABELS[student.no_of_instalments] ??
              (student.no_of_instalments
                ? `${student.no_of_instalments} Inst.`
                : "");
            const isExpanded = expandedIds.has(student.student_id);
            const lastLog = allLogs?.[student.student_id];

            return (
              <motion.div key={student.student_id} variants={itemVariants}>
                <div className="rounded-[12px] border border-border-light bg-surface overflow-hidden">
                  {/* Student header */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-lg bg-brand-wash flex items-center justify-center shrink-0 mt-0.5">
                        <GraduationCap className="h-4 w-4 text-primary" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        {/* Name + badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-text-primary">
                            <span className="text-text-tertiary mr-1.5 font-normal">
                              #{idx + 1}
                            </span>
                            {student.student_name}
                          </p>
                          {student.class_name && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {student.class_name.replace(" Tuition Fee", "")}
                            </span>
                          )}
                          {student.batch_name && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-teal-50 text-teal-700 border border-teal-200">
                              {student.batch_name}
                            </span>
                          )}
                          {student.plan && (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${planColor.bg} ${planColor.text} ${planColor.border}`}
                            >
                              {student.plan}
                            </span>
                          )}
                          {frequencyLabel && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              {frequencyLabel}
                            </span>
                          )}
                        </div>

                        {/* ID */}
                        <p className="text-xs text-text-tertiary font-mono mt-1">
                          {student.student_id}
                        </p>

                        {/* Admission date */}
                        {student.joining_date && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-text-secondary">
                            <CalendarDays className="h-3 w-3 text-text-tertiary shrink-0" />
                            <span>Admitted: {formatDate(student.joining_date)}</span>
                          </div>
                        )}

                        {/* Parent info */}
                        {(student.guardian_name || student.guardian_phone) && (
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {student.guardian_name && (
                              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                                <User className="h-3 w-3 text-text-tertiary" />
                                <span>{student.guardian_name}</span>
                              </div>
                            )}
                            {student.guardian_phone && (
                              <a
                                href={`tel:${student.guardian_phone}`}
                                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                              >
                                <Phone className="h-3 w-3" />
                                <span>{student.guardian_phone}</span>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Follow-up badge or Mark Called button */}
                        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                          {lastLog ? (
                            <>
                              <FollowUpBadge log={lastLog} />
                              <button
                                onClick={() => {
                                  setDrawerStudent({ student_id: student.student_id, student_name: student.student_name, branch });
                                  setDrawerDefaults({
                                    hidePaymentReceived: true,
                                  });
                                }}
                                className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 underline underline-offset-2"
                              >
                                Log Again
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setDrawerStudent({ student_id: student.student_id, student_name: student.student_name, branch });
                                setDrawerDefaults({
                                  hidePaymentReceived: true,
                                });
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5 text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
                            >
                              <PhoneCall className="h-2.5 w-2.5" />
                              Mark Called
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Overdue amount + expand */}
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <p className="text-lg font-bold text-orange-600">
                          {formatCurrency(student.total_dues)}
                        </p>
                        <p className="text-[10px] text-text-tertiary">overdue</p>
                        <button
                          onClick={() => toggleExpand(student.student_id)}
                          className="mt-1 flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
                        >
                          {isExpanded ? (
                            <>Hide <ChevronUp className="h-3 w-3" /></>
                          ) : (
                            <>
                              {student.overdue_invoices.length} instalment
                              {student.overdue_invoices.length !== 1 ? "s" : ""}{" "}
                              <ChevronDown className="h-3 w-3" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Instalment detail (expandable) */}
                  {isExpanded && student.overdue_invoices.length > 0 && (
                    <div className="border-t border-border-light bg-orange-50/20 px-4 py-3 space-y-2">
                      {/* Column headers */}
                      <div className="grid grid-cols-4 gap-2 px-1 mb-1">
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide">
                          Instalment
                        </p>
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide text-right">
                          Total
                        </p>
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide text-right">
                          Paid
                        </p>
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide text-right">
                          Balance
                        </p>
                      </div>

                      {student.overdue_invoices.map((inv) => (
                        <div
                          key={inv.name}
                          className="grid grid-cols-4 gap-2 items-center px-3 py-2.5 rounded-lg bg-white border border-orange-100"
                        >
                          <div className="min-w-0">
                            {inv.instalment_label && (
                              <Badge variant="info" className="text-[10px]">
                                {inv.instalment_label}
                              </Badge>
                            )}
                            <p className="text-[10px] text-text-tertiary mt-0.5">
                              Due: {formatDate(inv.due_date)}
                            </p>
                            <p className="text-[9px] text-text-tertiary/60 font-mono mt-0.5 truncate">
                              {inv.name}
                            </p>
                          </div>
                          <p className="text-xs font-medium text-text-primary text-right tabular-nums">
                            {formatCurrency(inv.grand_total)}
                          </p>
                          <p
                            className={`text-xs font-medium text-right tabular-nums ${(inv.paid ?? 0) > 0 ? "text-success" : "text-text-tertiary"}`}
                          >
                            {formatCurrency(inv.paid ?? 0)}
                          </p>
                          <p className="text-xs font-semibold text-orange-600 text-right tabular-nums">
                            {formatCurrency(inv.amount)}
                          </p>
                        </div>
                      ))}

                      {/* Totals row */}
                      <div className="grid grid-cols-4 gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200/60 mt-1">
                        <p className="text-[10px] font-bold text-text-secondary uppercase">
                          Total
                        </p>
                        <p className="text-xs font-bold text-text-primary text-right tabular-nums">
                          {formatCurrency(
                            student.overdue_invoices.reduce((s, i) => s + (i.grand_total ?? 0), 0)
                          )}
                        </p>
                        <p className="text-xs font-bold text-success text-right tabular-nums">
                          {formatCurrency(
                            student.overdue_invoices.reduce((s, i) => s + (i.paid ?? 0), 0)
                          )}
                        </p>
                        <p className="text-xs font-bold text-orange-600 text-right tabular-nums">
                          {formatCurrency(student.total_dues)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Follow-Up Drawer */}
      <FollowUpDrawer
        key={`${drawerStudent ? "open" : "closed"}-${drawerStudent?.student_id ?? "none"}-${drawerDefaults?.callStatus ?? ""}-${drawerDefaults?.amountReceived ?? ""}-${drawerDefaults?.paymentMode ?? ""}-${drawerDefaults?.invoiceRef ?? ""}-${drawerDefaults?.hidePaymentReceived ?? ""}`}
        open={drawerStudent !== null}
        onClose={() => {
          setDrawerStudent(null);
          setDrawerDefaults(null);
        }}
        student={drawerStudent ?? { student_id: "", student_name: "", branch: "" }}
        invalidateKeys={[["followup-branch-all", branch], ["recently-paid-claims", branch]]}
        initialCallStatus={drawerDefaults?.callStatus}
        initialPaymentReceived={drawerDefaults?.paymentReceived}
        initialAmountReceived={drawerDefaults?.amountReceived}
        initialPaymentMode={drawerDefaults?.paymentMode}
        initialInvoiceRef={drawerDefaults?.invoiceRef}
        hidePaymentReceived={drawerDefaults?.hidePaymentReceived}
      />
    </motion.div>
  );
}
