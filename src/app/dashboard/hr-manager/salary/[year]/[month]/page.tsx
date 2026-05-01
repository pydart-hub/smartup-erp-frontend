"use client";

import React, { useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays, ArrowLeft, Loader2, AlertCircle,
  Save, IndianRupee, TrendingDown,
  Users, Download, ChevronDown, Building2, CalendarCheck2,
  FileSpreadsheet, FileText,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getSalaryRecords,
  updateSalaryRecord,
  calculateSalary,
  formatPeriod,
} from "@/lib/api/salary";
import { getEmployees } from "@/lib/api/employees";
import type { SmartUpSalaryRecord } from "@/lib/types/salary";
import { formatCurrency } from "@/lib/utils/formatters";
import { toast } from "sonner";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

interface RowEdit {
  lop_days: string;
  total_working_days: string;
  other_deduction: string;
  other_remark: string;
  available_leave: string;
  dirty: boolean;
  saving: boolean;
}

export default function SalarySheetPage() {
  const params = useParams();
  const { defaultCompany } = useAuth();
  const queryClient = useQueryClient();

  const year = Number(params.year);
  const month = Number(params.month);
  const periodLabel = formatPeriod(month, year);

  const { data: recordsRes, isLoading, isError } = useQuery({
    queryKey: ["hr-salary-records", defaultCompany, year, month],
    queryFn: () =>
      getSalaryRecords({
        ...(defaultCompany ? { company: defaultCompany } : {}),
        salary_year: year,
        salary_month: month,
      }),
    staleTime: 30_000,
  });

  const records = recordsRes?.data ?? [];

  // ── Leave balance map (employee → available days for the salary year) ──
  const { data: leaveBalanceRes } = useQuery({
    queryKey: ["hr-salary-leave-balance", year],
    queryFn: async () => {
      const res = await fetch(`/api/hr/leave-allocation?year=${year}`);
      if (!res.ok) return null;
      return res.json() as Promise<{ employees: { employee: string; available: number; accrued_to_date: number }[] }>;
    },
    staleTime: 120_000,
  });
  const leaveAccruedMap = useMemo(() => {
    const map: Record<string, number> = {};
    leaveBalanceRes?.employees?.forEach((e) => { map[e.employee] = e.accrued_to_date; });
    return map;
  }, [leaveBalanceRes]);

  // ── Employee branch/company maps (all companies) ──
  const { data: employeesRes } = useQuery({
    queryKey: ["hr-employee-payable-map"],
    queryFn: () => getEmployees({ limit_page_length: 500 }),
    staleTime: 120_000,
  });
  const employeeCompanyMap = useMemo(() => {
    const map: Record<string, string> = {};
    employeesRes?.data?.forEach((e) => { map[e.name] = e.company; });
    return map;
  }, [employeesRes]);
  const employeeBranchMap = useMemo(() => {
    const map: Record<string, string> = {};
    employeesRes?.data?.forEach((e) => { if (e.branch) map[e.name] = e.branch; });
    return map;
  }, [employeesRes]);

  // ── Branch grouping ──
  const branchGroups = useMemo(() => {
    const groups = new Map<string, SmartUpSalaryRecord[]>();
    for (const r of records) {
      const empId = r.custom_employee ?? r.staff;
      const branch =
        (empId ? employeeBranchMap[empId] : undefined) ||
        (empId ? employeeCompanyMap[empId]?.replace(/^Smart Up\s*/i, "") : undefined) ||
        (r.company ? r.company.replace(/^Smart Up\s*/i, "") : undefined) ||
        "Unknown";
      if (!groups.has(branch)) groups.set(branch, []);
      groups.get(branch)!.push(r);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [records, employeeBranchMap, employeeCompanyMap]);

  // ── Collapse state per branch ──
  const [collapsedBranches, setCollapsedBranches] = useState<Record<string, boolean>>({});
  function toggleBranch(branch: string) {
    setCollapsedBranches(prev => ({ ...prev, [branch]: !prev[branch] }));
  }

  // ── Global working days (applies to all staff) ──
  const [globalWorkingDays, setGlobalWorkingDays] = useState(26);
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  // ── Local edit state per row ──
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});

  function getEdit(record: SmartUpSalaryRecord): RowEdit {
    return (
      edits[record.name] ?? {
        lop_days: String(record.lop_days ?? 0),
        total_working_days: String(globalWorkingDays),
        other_deduction: String(record.custom_other_deduction ?? 0),
        other_remark: record.custom_other_deduction_remark ?? "",
        available_leave: record.custom_available_leave != null ? String(record.custom_available_leave) : "",
        dirty: false,
        saving: false,
      }
    );
  }

  function handleLopChange(name: string, record: SmartUpSalaryRecord, value: string) {
    setEdits((prev) => ({
      ...prev,
      [name]: {
        ...(prev[name] ?? getEdit(record)),
        lop_days: value,
        dirty: true,
      },
    }));
  }

  function handleOtherDeductionChange(name: string, record: SmartUpSalaryRecord, value: string) {
    setEdits((prev) => ({
      ...prev,
      [name]: {
        ...(prev[name] ?? getEdit(record)),
        other_deduction: value,
        dirty: true,
      },
    }));
  }

  function handleOtherRemarkChange(name: string, record: SmartUpSalaryRecord, value: string) {
    setEdits((prev) => ({
      ...prev,
      [name]: {
        ...(prev[name] ?? getEdit(record)),
        other_remark: value,
        dirty: true,
      },
    }));
  }

  function handleAvailableLeaveChange(name: string, record: SmartUpSalaryRecord, value: string) {
    setEdits((prev) => ({
      ...prev,
      [name]: {
        ...(prev[name] ?? getEdit(record)),
        available_leave: value,
        dirty: true,
      },
    }));
  }

  // ── Save a single row ──
  const saveMutation = useMutation({
    mutationFn: async ({
      name,
      basic_salary,
      lop_days,
      total_working_days,
      other_deduction,
      other_remark,
      available_leave,
    }: {
      name: string;
      basic_salary: number;
      lop_days: number;
      total_working_days: number;
      other_deduction: number;
      other_remark: string;
      available_leave: number | null;
    }) => {
      const { lopDeduction, netSalary } = calculateSalary(
        basic_salary,
        lop_days,
        total_working_days
      );
      return updateSalaryRecord(name, {
        lop_days,
        total_working_days,
        lop_deduction: lopDeduction,
        custom_other_deduction: other_deduction,
        custom_other_deduction_remark: other_remark,
        custom_available_leave: available_leave ?? undefined,
        net_salary: netSalary - other_deduction,
      });
    },
    onSuccess: (_, vars) => {
      setEdits((prev) => ({
        ...prev,
        [vars.name]: { ...prev[vars.name], dirty: false, saving: false },
      }));
      queryClient.invalidateQueries({
        queryKey: ["hr-salary-records", defaultCompany, year, month],
      });
    },
    onError: (_, vars) => {
      setEdits((prev) => ({
        ...prev,
        [vars.name]: { ...prev[vars.name], saving: false },
      }));
      toast.error("Failed to save");
    },
  });

  async function handleSaveRow(record: SmartUpSalaryRecord) {
    const edit = getEdit(record);
    const lop = parseFloat(edit.lop_days) || 0;
    if (lop < 0 || lop > globalWorkingDays) { toast.error("LOP days cannot exceed working days"); return; }
    const otherDeduction = parseFloat(edit.other_deduction) || 0;
    const availLeave = edit.available_leave !== "" ? parseFloat(edit.available_leave) : null;
    setEdits((prev) => ({ ...prev, [record.name]: { ...edit, saving: true } }));
    saveMutation.mutate({
      name: record.name,
      basic_salary: record.basic_salary,
      lop_days: lop,
      total_working_days: globalWorkingDays,
      other_deduction: otherDeduction,
      other_remark: edit.other_remark,
      available_leave: availLeave,
    });
  }

  const [saveAllLoading, setSaveAllLoading] = useState(false);
  async function handleSaveAll() {
    const dirtyRecords = records.filter(r => edits[r.name]?.dirty);
    if (dirtyRecords.length === 0) return;
    setSaveAllLoading(true);
    // Mark all as saving
    setEdits(prev => {
      const next = { ...prev };
      dirtyRecords.forEach(r => { next[r.name] = { ...next[r.name], saving: true }; });
      return next;
    });
    let saved = 0, failed = 0;
    for (const r of dirtyRecords) {
      const edit = edits[r.name];
      const lop = parseFloat(edit.lop_days) || 0;
      if (lop < 0 || lop > globalWorkingDays) { failed++; continue; }
      const otherDeduction = parseFloat(edit.other_deduction) || 0;
      const availLeave = edit.available_leave !== "" ? parseFloat(edit.available_leave) : null;
      const { lopDeduction, netSalary } = calculateSalary(r.basic_salary, lop, globalWorkingDays);
      try {
        await updateSalaryRecord(r.name, {
          lop_days: lop,
          total_working_days: globalWorkingDays,
          lop_deduction: lopDeduction,
          custom_other_deduction: otherDeduction,
          custom_other_deduction_remark: edit.other_remark,
          custom_available_leave: availLeave ?? undefined,
          net_salary: netSalary - otherDeduction,
        });
        saved++;
        setEdits(prev => ({ ...prev, [r.name]: { ...prev[r.name], dirty: false, saving: false } }));
      } catch {
        failed++;
        setEdits(prev => ({ ...prev, [r.name]: { ...prev[r.name], saving: false } }));
      }
    }
    setSaveAllLoading(false);
    await queryClient.invalidateQueries({ queryKey: ["hr-salary-records", defaultCompany, year, month] });
    if (saved > 0) toast.success(`Saved LOP for ${saved} employee${saved > 1 ? "s" : ""}`);
    if (failed > 0) toast.error(`Failed to save ${failed} record${failed > 1 ? "s" : ""}`);
  }



  // ── Aggregates (use globalWorkingDays + live LOP edits) ──
  const stats = useMemo(() => {
    let totalBasic = 0, totalLop = 0, totalOther = 0, totalNet = 0;
    for (const r of records) {
      totalBasic += r.basic_salary;
      const edit = edits[r.name];
      const lop = edit?.dirty ? (parseFloat(edit.lop_days) || 0) : (r.lop_days || 0);
      const other = edit?.dirty ? (parseFloat(edit.other_deduction) || 0) : (r.custom_other_deduction || 0);
      const { lopDeduction, netSalary } = calculateSalary(r.basic_salary, lop, globalWorkingDays);
      totalLop += lopDeduction;
      totalOther += other;
      totalNet += netSalary - other;
    }
    void totalBasic;
    const dirtyCount = Object.values(edits).filter(e => e.dirty).length;
    return { totalBasic, totalLop, totalOther, totalNet, dirtyCount };
  }, [records, edits, globalWorkingDays]);

  const isCompact = density === "compact";

  // ── Preview computed values (always uses globalWorkingDays) ──
  function previewNet(record: SmartUpSalaryRecord): { lopDeduction: number; otherDeduction: number; net: number } {
    const edit = edits[record.name];
    const lop = edit?.dirty ? (parseFloat(edit.lop_days) || 0) : (record.lop_days || 0);
    const other = edit?.dirty
      ? (parseFloat(edit.other_deduction) || 0)
      : (record.custom_other_deduction || 0);
    const { lopDeduction, netSalary } = calculateSalary(record.basic_salary, lop, globalWorkingDays);
    return { lopDeduction, otherDeduction: other, net: netSalary - other };
  }

  // ── Export CSV ──
  function handleExportCSV() {
    const rows: (string | number)[][] = [
      ["Branch", "Staff Name", "Basic Salary", "Working Days", "LOP Days", "LOP Deduction", "Other Deduction", "Other Remark", "Net Pay"],
    ];
    for (const [branch, branchRecords] of branchGroups) {
      for (const r of branchRecords) {
        const edit = edits[r.name];
        const lop = edit?.dirty ? (parseFloat(edit.lop_days) || 0) : (r.lop_days || 0);
        const other = edit?.dirty ? (parseFloat(edit.other_deduction) || 0) : (r.custom_other_deduction || 0);
        const remark = edit?.dirty ? edit.other_remark : (r.custom_other_deduction_remark || "");
        const { lopDeduction, netSalary } = calculateSalary(r.basic_salary, lop, globalWorkingDays);
        rows.push([
          branch,
          r.custom_employee_name ?? r.staff_name,
          r.basic_salary,
          globalWorkingDays,
          lop,
          lopDeduction,
          other,
          remark,
          netSalary - other,
        ]);
      }
    }
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salary-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Export Excel ──
  async function handleExportExcel() {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Salary Sheet");

    // Title row
    ws.mergeCells("A1:I1");
    const titleCell = ws.getCell("A1");
    titleCell.value = `Salary Sheet — ${periodLabel}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: "center" };
    ws.getRow(1).height = 24;

    // Working days row
    ws.mergeCells("A2:I2");
    const wdCell = ws.getCell("A2");
    wdCell.value = `Working Days: ${globalWorkingDays}`;
    wdCell.font = { italic: true, size: 10, color: { argb: "FF888888" } };
    wdCell.alignment = { horizontal: "center" };

    ws.addRow([]); // spacer

    // Header row
    const HEADERS = ["Branch", "Staff Name", "Basic Salary", "Working Days", "LOP Days", "LOP Deduction", "Other Deduction", "Other Remark", "Net Pay"];
    const headerRow = ws.addRow(HEADERS);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
      cell.alignment = { horizontal: "center" };
      cell.border = { bottom: { style: "thin", color: { argb: "FFBBBBBB" } } };
    });
    ws.getRow(4).height = 18;

    ws.columns = [
      { width: 22 }, { width: 28 }, { width: 14 }, { width: 14 },
      { width: 10 }, { width: 16 }, { width: 16 }, { width: 24 }, { width: 14 },
    ];

    for (const [branch, branchRecords] of branchGroups) {
      let branchBasic = 0, branchLopDed = 0, branchOther = 0, branchNet = 0;

      for (const r of branchRecords) {
        const edit = edits[r.name];
        const lop = edit?.dirty ? (parseFloat(edit.lop_days) || 0) : (r.lop_days || 0);
        const other = edit?.dirty ? (parseFloat(edit.other_deduction) || 0) : (r.custom_other_deduction || 0);
        const remark = edit?.dirty ? edit.other_remark : (r.custom_other_deduction_remark || "");
        const { lopDeduction, netSalary } = calculateSalary(r.basic_salary, lop, globalWorkingDays);
        const net = netSalary - other;
        branchBasic += r.basic_salary; branchLopDed += lopDeduction; branchOther += other; branchNet += net;

        const dataRow = ws.addRow([
          branch, r.custom_employee_name ?? r.staff_name,
          r.basic_salary, globalWorkingDays, lop, lopDeduction, other, remark, net,
        ]);
        [3, 4, 5, 6, 7, 9].forEach(col => {
          dataRow.getCell(col).alignment = { horizontal: "right" };
          dataRow.getCell(col).numFmt = "#,##0";
        });
      }

      // Branch subtotal
      const subRow = ws.addRow(["" + branch + " — Subtotal", "", branchBasic, "", "", branchLopDed, branchOther, "", branchNet]);
      subRow.eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4FF" } };
      });
      [3, 6, 7, 9].forEach(col => {
        subRow.getCell(col).numFmt = "#,##0";
        subRow.getCell(col).alignment = { horizontal: "right" };
      });
    }

    // Grand total
    ws.addRow([]);
    const totalRow = ws.addRow(["Grand Total", `${records.length} staff`, stats.totalBasic, "", "", stats.totalLop, stats.totalOther, "", stats.totalNet]);
    totalRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    });
    [3, 6, 7, 9].forEach(col => {
      totalRow.getCell(col).numFmt = "#,##0";
      totalRow.getCell(col).alignment = { horizontal: "right" };
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salary-${year}-${String(month).padStart(2, "0")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel exported");
  }

  // ── Export PDF ──
  async function handleExportPDF() {
    const jsPDFModule = await import("jspdf");
    const autoTableModule = await import("jspdf-autotable");
    const jsPDF = jsPDFModule.default;
    const autoTable = autoTableModule.default;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Salary Sheet — ${periodLabel}`, 14, 16);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Working Days: ${globalWorkingDays}  |  Total Staff: ${records.length}  |  Net Pay: ${formatCurrency(stats.totalNet)}`, 14, 22);
    doc.setTextColor(0);

    let startY = 28;

    for (const [branch, branchRecords] of branchGroups) {
      let branchBasic = 0, branchLopDed = 0, branchOther = 0, branchNet = 0;
      const tableBody: (string | number)[][] = branchRecords.map(r => {
        const edit = edits[r.name];
        const lop = edit?.dirty ? (parseFloat(edit.lop_days) || 0) : (r.lop_days || 0);
        const other = edit?.dirty ? (parseFloat(edit.other_deduction) || 0) : (r.custom_other_deduction || 0);
        const remark = edit?.dirty ? edit.other_remark : (r.custom_other_deduction_remark || "");
        const { lopDeduction, netSalary } = calculateSalary(r.basic_salary, lop, globalWorkingDays);
        branchBasic += r.basic_salary; branchLopDed += lopDeduction; branchOther += other; branchNet += netSalary - other;
        return [
          r.custom_employee_name ?? r.staff_name,
          r.basic_salary.toLocaleString("en-IN"),
          lop,
          lopDeduction.toLocaleString("en-IN"),
          other > 0 ? `${other.toLocaleString("en-IN")}${remark ? ` (${remark})` : ""}` : "—",
          (netSalary - other).toLocaleString("en-IN"),
        ];
      });
      tableBody.push([
        `Subtotal (${branchRecords.length} staff)`,
        branchBasic.toLocaleString("en-IN"),
        "",
        branchLopDed.toLocaleString("en-IN"),
        branchOther > 0 ? branchOther.toLocaleString("en-IN") : "—",
        branchNet.toLocaleString("en-IN"),
      ]);

      autoTable(doc, {
        head: [[branch, "Basic", "LOP Days", "LOP Ded.", "Other Ded.", "Net Pay"]],
        body: tableBody,
        startY,
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        didParseCell: (data) => {
          if (data.row.index === tableBody.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [240, 244, 255];
          }
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { halign: "right" },
          2: { halign: "center", cellWidth: 18 },
          3: { halign: "right" },
          4: { halign: "right" },
          5: { halign: "right", fontStyle: "bold" },
        },
        margin: { left: 14, right: 14 },
      });
      startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    }

    // Grand total footer bar
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(14, startY, doc.internal.pageSize.width - 28, 8, 1, 1, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(
      `Grand Total: ${records.length} staff  |  LOP: ${formatCurrency(stats.totalLop)}  |  Other: ${formatCurrency(stats.totalOther)}  |  Net Pay: ${formatCurrency(stats.totalNet)}`,
      doc.internal.pageSize.width / 2,
      startY + 5.5,
      { align: "center" }
    );
    doc.setTextColor(0);
    doc.save(`salary-${year}-${String(month).padStart(2, "0")}.pdf`);
    toast.success("PDF exported");
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
      <BreadcrumbNav />

      {/* ── Header ── */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/hr-manager/salary">
              <button className="p-1.5 rounded-lg hover:bg-surface-secondary transition-colors">
                <ArrowLeft className="h-4 w-4 text-text-secondary" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Salary Sheet — {periodLabel}</h1>
              <p className="text-text-tertiary text-xs mt-0.5">Click a branch to expand · Enter LOP days · Net auto-calculates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/hr-manager/salary/${year}/${month}/payment-status`}>
              <Button variant="outline" size="sm" disabled={records.length === 0}>
                Payment Status
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={records.length === 0}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={records.length === 0}>
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={records.length === 0}>
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              PDF
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Global Working Days ── */}
      {!isLoading && records.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex flex-wrap items-center gap-2.5 bg-surface-secondary/70 rounded-xl border border-border-main px-4 py-2.5 sm:sticky sm:top-2 sm:z-20 backdrop-blur supports-[backdrop-filter]:bg-surface-secondary/70">
            <CalendarDays className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium text-text-primary">Working Days</span>
            <Input
              type="number" min="1" max="31"
              className="w-20 text-center h-8 text-sm px-1 font-semibold"
              value={globalWorkingDays}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 1 && v <= 31) setGlobalWorkingDays(v);
              }}
            />
            <span className="text-xs text-text-tertiary sm:flex-1">days — applies to all staff · LOP is per employee</span>
            <div className="inline-flex items-center rounded-lg border border-border-main bg-surface-primary p-0.5">
              <button
                type="button"
                onClick={() => setDensity("comfortable")}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${!isCompact ? "bg-primary text-primary-foreground" : "text-text-secondary hover:bg-surface-secondary"}`}
              >
                Comfortable
              </button>
              <button
                type="button"
                onClick={() => setDensity("compact")}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${isCompact ? "bg-primary text-primary-foreground" : "text-text-secondary hover:bg-surface-secondary"}`}
              >
                Compact
              </button>
            </div>
            {stats.dirtyCount > 0 && (
              <Button size="sm" onClick={handleSaveAll} disabled={saveAllLoading} className="flex-shrink-0">
                {saveAllLoading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  : <Save className="h-3.5 w-3.5 mr-1.5" />}
                Save All ({stats.dirtyCount})
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Summary strip ── */}
      {!isLoading && records.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { icon: <Users className="h-3.5 w-3.5" />, value: records.length, label: "Staff", color: "text-text-primary" },
              { icon: <IndianRupee className="h-3.5 w-3.5" />, value: formatCurrency(stats.totalNet), label: "Total Net Pay", color: "text-success" },
              { icon: <TrendingDown className="h-3.5 w-3.5" />, value: formatCurrency(stats.totalLop), label: "LOP Deductions", color: "text-error" },
            ].map(({ icon, value, label, color }) => (
              <Card key={label}>
                <CardContent className="p-3 flex items-center gap-2.5">
                  <span className={`${color} opacity-60`}>{icon}</span>
                  <div>
                    <p className={`text-sm font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-text-tertiary">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Salary Table ── */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-text-tertiary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading salary records…</span>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-16 gap-2 text-error">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">Failed to load records</span>
          </div>
        ) : records.length === 0 ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
              <CalendarDays className="h-10 w-10 text-text-tertiary opacity-20" />
              <div>
                <p className="font-medium text-text-primary">No records for {periodLabel}</p>
                <p className="text-sm text-text-secondary mt-1">Generate salary records first.</p>
              </div>
              <Link href="/dashboard/hr-manager/salary/process">
                <Button size="sm">Generate Salary Records</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {branchGroups.map(([branch, branchRecords]) => {
              const isCollapsed = collapsedBranches[branch] ?? true;
              const branchDirtyCount = branchRecords.filter((r) => edits[r.name]?.dirty).length;

              let branchLop = 0, branchOther = 0, branchNet = 0;
              for (const r of branchRecords) {
                const { lopDeduction, otherDeduction, net } = previewNet(r);
                branchLop += lopDeduction;
                branchOther += otherDeduction;
                branchNet += net;
              }

              return (
                <div key={branch} className="rounded-xl border border-border-main overflow-hidden bg-surface-primary">
                  {/* Branch header */}
                  <button
                    className={`w-full flex items-center justify-between px-4 hover:bg-surface-secondary/60 transition-colors ${isCompact ? "py-2.5" : "py-3"}`}
                    onClick={() => toggleBranch(branch)}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="font-semibold text-text-primary text-sm">{branch}</span>
                      <span className="text-xs text-text-tertiary bg-surface-secondary px-1.5 py-0.5 rounded-full">
                        {branchRecords.length}
                      </span>
                      {branchDirtyCount > 0 && (
                        <span className="text-[11px] font-medium text-warning bg-warning/10 px-1.5 py-0.5 rounded-full">
                          {branchDirtyCount} unsaved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center gap-3 text-xs">
                        <span className="font-medium text-success">{formatCurrency(branchNet)}</span>
                        {branchLop > 0 && <span className="text-error">−{formatCurrency(branchLop)}</span>}
                      </div>
                      <ChevronDown className={`h-4 w-4 text-text-tertiary transition-transform duration-200 ${isCollapsed ? "" : "rotate-180"}`} />
                    </div>
                  </button>

                  {/* Table (hidden when collapsed) */}
                  {!isCollapsed && (
                    <>
                      {/* Desktop */}
                      <div className="hidden md:block overflow-x-auto border-t border-border-main">
                        <table className="w-full min-w-[980px] text-sm">
                          <thead>
                            <tr className="bg-surface-secondary/70">
                              <th className={`text-left px-4 text-[11px] uppercase tracking-wide font-medium text-text-tertiary ${isCompact ? "py-2" : "py-3"}`}>Staff</th>
                              <th className={`text-right px-4 text-[11px] uppercase tracking-wide font-medium text-text-tertiary ${isCompact ? "py-2" : "py-3"}`}>Basic</th>
                              <th className={`text-center px-4 text-[11px] uppercase tracking-wide font-medium text-text-tertiary ${isCompact ? "py-2" : "py-3"}`}>LOP</th>
                              <th className={`text-center px-3 text-[11px] uppercase tracking-wide font-medium text-text-tertiary ${isCompact ? "py-2" : "py-3"}`}>Other Deduction</th>
                              <th className={`text-right px-4 text-[11px] uppercase tracking-wide font-medium text-text-tertiary ${isCompact ? "py-2" : "py-3"}`}>Net Pay</th>
                              <th className={`text-center px-3 text-[11px] uppercase tracking-wide font-medium text-text-tertiary ${isCompact ? "py-2" : "py-3"}`}>
                                <div className="flex items-center justify-center gap-1">
                                  <CalendarCheck2 className="h-3 w-3" />
                                  Avail. Leave
                                </div>
                              </th>
                              <th className="py-2.5 px-2 w-10" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-main">
                            {branchRecords.map((record) => {
                              const edit = getEdit(record);
                              const { lopDeduction, otherDeduction, net } = previewNet(record);
                              const isDirty = edit.dirty;
                              const isSaving = edit.saving;

                              return (
                                <tr key={record.name} className="hover:bg-surface-secondary/30 even:bg-surface-secondary/20 transition-colors">
                                  <td className={`px-4 ${isCompact ? "py-1.5" : "py-2.5"}`}>
                                    <span className="font-medium text-text-primary text-sm">
                                      {record.custom_employee_name ?? record.staff_name}
                                    </span>
                                  </td>
                                  <td className={`px-4 text-right text-text-primary tabular-nums ${isCompact ? "py-1.5" : "py-2.5"}`}>
                                    {formatCurrency(record.basic_salary)}
                                  </td>
                                  {/* LOP input */}
                                  <td className={`px-4 text-center ${isCompact ? "py-1.5" : "py-2.5"}`}>
                                    <div className="flex flex-col items-center gap-0.5">
                                      <Input type="number" min="0" step="0.5"
                                        className={`text-center mx-auto text-sm px-1 font-medium ${isCompact ? "w-16 h-7" : "w-20 h-8"} ${parseFloat(edit.lop_days) > 0 ? "border-error/50 text-error" : ""}`}
                                        value={edit.lop_days}
                                        onChange={(e) => handleLopChange(record.name, record, e.target.value)} />
                                      {lopDeduction > 0 && (
                                        <span className="text-error text-[10px] tabular-nums">−{formatCurrency(lopDeduction)}</span>
                                      )}
                                    </div>
                                  </td>
                                  {/* Other Deduction */}
                                  <td className={`px-3 text-center ${isCompact ? "py-1.5" : "py-2"}`}>
                                    <div className={`flex flex-col items-center ${isCompact ? "gap-1 min-w-[150px]" : "gap-1.5 min-w-[180px]"}`}>
                                      <Input type="number" min="0" step="1"
                                        placeholder="0"
                                        className={`text-center mx-auto text-sm px-1 font-medium ${isCompact ? "w-24 h-7" : "w-28 h-8"} ${otherDeduction > 0 ? "border-warning/60 text-warning" : ""}`}
                                        value={edit.other_deduction === "0" ? "" : edit.other_deduction}
                                        onChange={(e) => handleOtherDeductionChange(record.name, record, e.target.value || "0")} />
                                      <Input
                                        placeholder="Reason…"
                                        className={`w-full text-xs px-2 text-text-tertiary ${isCompact ? "h-6" : "h-7"}`}
                                        value={edit.other_remark}
                                        onChange={(e) => handleOtherRemarkChange(record.name, record, e.target.value)} />
                                    </div>
                                  </td>
                                  <td className={`px-4 text-right tabular-nums ${isCompact ? "py-1.5" : "py-2.5"}`}>
                                    <span className="font-semibold text-success">{formatCurrency(net)}</span>
                                  </td>
                                  {/* Available Leave till this month — editable input, saved to Frappe */}
                                  <td className={`px-3 text-center ${isCompact ? "py-1.5" : "py-2.5"}`}>
                                    {(() => {
                                      const empId = record.custom_employee ?? record.staff;
                                      const apiAccrued = empId ? leaveAccruedMap[empId] : undefined;
                                      const placeholder = apiAccrued != null ? apiAccrued.toFixed(1) : "—";
                                      const inputVal = edit.available_leave;
                                      const numVal = inputVal !== "" ? parseFloat(inputVal) : NaN;
                                      const color = !isNaN(numVal)
                                        ? numVal <= 0 ? "border-error/50 text-error"
                                          : numVal <= 1.5 ? "border-warning/50 text-warning"
                                          : "border-success/40 text-success"
                                        : "";
                                      return (
                                        <Input
                                          type="number" min="0" step="0.5"
                                          placeholder={placeholder}
                                          className={`text-center mx-auto text-sm px-1 font-medium ${isCompact ? "w-16 h-7" : "w-20 h-8"} ${color}`}
                                          value={inputVal}
                                          onChange={(e) => handleAvailableLeaveChange(record.name, record, e.target.value)}
                                        />
                                      );
                                    })()}
                                  </td>
                                  <td className={`px-2 text-center ${isCompact ? "py-1.5" : "py-2.5"}`}>
                                    {isDirty && (
                                      <Button size="sm" variant="outline" className={`${isCompact ? "h-7 w-7" : "h-8 w-8"} p-0`}
                                        onClick={() => handleSaveRow(record)} disabled={isSaving}>
                                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile */}
                      <div className="md:hidden divide-y divide-border-main border-t border-border-main">
                        {branchRecords.map((record) => {
                          const edit = getEdit(record);
                          const { lopDeduction, otherDeduction, net } = previewNet(record);
                          const isDirty = edit.dirty;
                          const isSaving = edit.saving;
                          return (
                            <div key={record.name} className={`${isCompact ? "p-2.5 space-y-2.5" : "p-3 space-y-3"}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium text-text-primary text-sm">{record.custom_employee_name ?? record.staff_name}</p>
                                  <p className="text-xs text-text-tertiary">{formatCurrency(record.basic_salary)}</p>
                                </div>
                                <span className="font-semibold text-success text-sm whitespace-nowrap">{formatCurrency(net)}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-xs text-text-tertiary mb-1">LOP Days</p>
                                  <Input type="number" min="0" step="0.5"
                                    className={`w-full text-center text-sm font-medium ${isCompact ? "h-8" : "h-9"} ${parseFloat(edit.lop_days) > 0 ? "border-error/50 text-error" : ""}`}
                                    value={edit.lop_days}
                                    onChange={(e) => handleLopChange(record.name, record, e.target.value)} />
                                  {lopDeduction > 0 && (
                                    <p className="text-error text-[11px] mt-1">−{formatCurrency(lopDeduction)}</p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs text-text-tertiary mb-1">Avail. Leave</p>
                                  {(() => {
                                    const empId = record.custom_employee ?? record.staff;
                                    const apiAccrued = empId ? leaveAccruedMap[empId] : undefined;
                                    const placeholder = apiAccrued != null ? apiAccrued.toFixed(1) : "—";
                                    const inputVal = edit.available_leave;
                                    const numVal = inputVal !== "" ? parseFloat(inputVal) : NaN;
                                    const color = !isNaN(numVal)
                                      ? numVal <= 0 ? "border-error/50 text-error"
                                        : numVal <= 1.5 ? "border-warning/50 text-warning"
                                        : "border-success/40 text-success"
                                      : "";
                                    return (
                                      <Input
                                        type="number" min="0" step="0.5"
                                        placeholder={placeholder}
                                        className={`w-full text-center text-sm font-medium ${isCompact ? "h-8" : "h-9"} ${color}`}
                                        value={inputVal}
                                        onChange={(e) => handleAvailableLeaveChange(record.name, record, e.target.value)}
                                      />
                                    );
                                  })()}
                                </div>
                              </div>
                              {/* Other Deduction row */}
                              <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-1">
                                  <p className="text-xs text-text-tertiary mb-1">Other Deduction</p>
                                  <Input type="number" min="0" step="1"
                                    placeholder="0"
                                    className={`w-full text-center text-sm font-medium ${isCompact ? "h-8" : "h-9"} ${otherDeduction > 0 ? "border-warning/60 text-warning" : ""}`}
                                    value={edit.other_deduction === "0" ? "" : edit.other_deduction}
                                    onChange={(e) => handleOtherDeductionChange(record.name, record, e.target.value || "0")} />
                                </div>
                                <div className="col-span-2">
                                  <p className="text-xs text-text-tertiary mb-1">Reason</p>
                                  <Input
                                    placeholder="e.g. Advance recovery"
                                    className={`${isCompact ? "h-8" : "h-9"} text-xs`}
                                    value={edit.other_remark}
                                    onChange={(e) => handleOtherRemarkChange(record.name, record, e.target.value)} />
                                </div>
                              </div>
                              <div className="flex items-center justify-end">
                                <div className="flex items-center gap-2">
                                  {isDirty && (
                                    <Button size="sm" variant="outline" className={isCompact ? "h-7" : "h-8"} onClick={() => handleSaveRow(record)} disabled={isSaving}>
                                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                      <span className="ml-1">Save</span>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Branch subtotal bar */}
                      <div className="bg-surface-secondary/60 border-t border-border-main px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-text-tertiary">
                        <span>{branchRecords.length} employees</span>
                        <div className="flex items-center gap-4">
                          {branchLop > 0 && <span className="text-error">−{formatCurrency(branchLop)} LOP</span>}
                          {branchOther > 0 && <span className="text-warning">−{formatCurrency(branchOther)} other</span>}
                          <span className="font-semibold text-success">{formatCurrency(branchNet)} net</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* Grand total */}
            <div className="rounded-xl border border-border-main bg-surface-secondary/50 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-text-primary">{records.length} staff total</span>
              <div className="flex flex-wrap items-center gap-4 font-medium">
                {stats.totalLop > 0 && <span className="text-error text-xs">−{formatCurrency(stats.totalLop)} LOP</span>}
                {stats.totalOther > 0 && <span className="text-warning text-xs">−{formatCurrency(stats.totalOther)} other deductions</span>}
                <span className="text-success">{formatCurrency(stats.totalNet)} net pay</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Save All bottom bar ── */}
      <AnimatePresence>
        {stats.dirtyCount > 0 && (
          <motion.div key="save-all-bar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2.5 flex-1">
                <Save className="h-4 w-4 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {stats.dirtyCount} unsaved change{stats.dirtyCount > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">Save changes to Frappe before exporting</p>
                </div>
              </div>
              <Button size="sm" onClick={handleSaveAll} disabled={saveAllLoading} className="flex-shrink-0">
                {saveAllLoading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  : <Save className="h-3.5 w-3.5 mr-1.5" />}
                Save All ({stats.dirtyCount})
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
