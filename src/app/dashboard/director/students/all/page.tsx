"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Search, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, Star, CircleCheck,
  Download, FileText, FileSpreadsheet, ChevronDown, Calendar,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DisabilityBadge } from "@/components/ui/DisabilityBadge";
import { getStudents } from "@/lib/api/students";
import { getAllBranches, getActiveStudentCount } from "@/lib/api/director";
import { getStudentCount } from "@/lib/api/students";
import apiClient from "@/lib/api/client";
import type { Student } from "@/lib/types/student";

const PAGE_SIZE = 25;

type StatusFilter = "all" | "active" | "inactive" | "discontinued";
type TypeFilter = "all" | "Fresher" | "Existing" | "Rejoining";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "discontinued", label: "Discontinued" },
];

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function getEnabledParam(f: StatusFilter): 0 | 1 | undefined {
  if (f === "active") return 1;
  if (f === "inactive") return 0;
  if (f === "discontinued") return 0;
  return undefined;
}

function getExtraFilters(f: StatusFilter, typeFilter: TypeFilter, dateFrom?: string): string[][] {
  const filters: string[][] = [];
  if (f === "discontinued") filters.push(["custom_discontinuation_date", "is", "set"]);
  if (typeFilter !== "all") filters.push(["custom_student_type", "=", typeFilter]);
  if (dateFrom) filters.push(["joining_date", "=", dateFrom]);
  return filters;
}

async function fetchEnrollmentMap(
  studentIds: string[],
): Promise<Record<string, { program: string; student_batch_name?: string; custom_fee_structure?: string; custom_plan?: string }>> {
  if (!studentIds.length) return {};
  const filters: (string | number | string[])[][] = [
    ["student", "in", studentIds],
    ["docstatus", "=", 1],
  ];
  const { data } = await apiClient.get("/resource/Program Enrollment", {
    params: {
      filters: JSON.stringify(filters),
      fields: JSON.stringify(["student", "program", "student_batch_name", "custom_fee_structure", "custom_plan"]),
      order_by: "enrollment_date desc",
      limit_page_length: studentIds.length * 3,
    },
  });
  const map: Record<string, { program: string; student_batch_name?: string; custom_fee_structure?: string; custom_plan?: string }> = {};
  for (const row of (data.data ?? [])) {
    if (!map[row.student]) {
      map[row.student] = { program: row.program, student_batch_name: row.student_batch_name, custom_fee_structure: row.custom_fee_structure, custom_plan: row.custom_plan };
    }
  }
  return map;
}

async function fetchFeeMap(
  customers: string[],
): Promise<Record<string, { total: number; pending: number }>> {
  if (!customers.length) return {};
  const { data } = await apiClient.get("/resource/Sales Invoice", {
    params: {
      fields: JSON.stringify(["customer", "sum(grand_total) as total_fee", "sum(outstanding_amount) as pending_fee"]),
      filters: JSON.stringify([["docstatus", "=", 1], ["customer", "in", customers]]),
      group_by: "customer",
      limit_page_length: customers.length,
    },
  });
  const map: Record<string, { total: number; pending: number }> = {};
  for (const row of data.data ?? []) {
    map[row.customer] = { total: row.total_fee ?? 0, pending: row.pending_fee ?? 0 };
  }
  return map;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Fetch guardian info (name + mobile) via server-side admin API */
async function fetchGuardianMap(
  studentIds: string[],
): Promise<Record<string, { parentName: string; parentMobile: string }>> {
  if (!studentIds.length) return {};
  const res = await fetch("/api/admin/guardian-mobiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ studentIds }),
  });
  if (!res.ok) return {};
  return res.json();
}

export default function DirectorAllStudentsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [branchFilter, setBranchFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [page, setPage] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(0); }, [statusFilter, branchFilter, typeFilter, dateFrom]);

  // Total count
  const { data: totalCount } = useQuery({
    queryKey: ["director-total-active-students"],
    queryFn: getActiveStudentCount,
    staleTime: 120_000,
  });

  // Filtered count (when date or other filters are active)
  const hasFilters = !!(dateFrom || branchFilter || typeFilter !== "all" || statusFilter !== "all");
  const { data: filteredCount } = useQuery({
    queryKey: ["director-filtered-student-count", statusFilter, branchFilter, typeFilter, dateFrom],
    queryFn: () => {
      const filters: string[][] = [];
      const enabled = getEnabledParam(statusFilter);
      if (enabled !== undefined) filters.push(["enabled", "=", String(enabled)]);
      if (branchFilter) filters.push(["custom_branch", "=", branchFilter]);
      filters.push(...getExtraFilters(statusFilter, typeFilter, dateFrom));
      return getStudentCount(filters.length ? filters : undefined);
    },
    enabled: hasFilters,
    staleTime: 30_000,
  });

  // Branches for filter
  const { data: branches } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 300_000,
  });
  const activeBranches = (branches ?? []).filter((b) => b.name !== "Smart Up");

  // Students query
  const { data: studentsRes, isLoading, isError, error } = useQuery({
    queryKey: ["director-all-students", search, statusFilter, branchFilter, typeFilter, dateFrom, page],
    queryFn: () =>
      getStudents({
        search: search || undefined,
        enabled: getEnabledParam(statusFilter),
        extraFilters: getExtraFilters(statusFilter, typeFilter, dateFrom),
        custom_branch: branchFilter || undefined,
        limit_start: page * PAGE_SIZE,
        limit_page_length: PAGE_SIZE,
        order_by: "student_name asc",
      }),
    staleTime: 30_000,
  });

  const students: Student[] = studentsRes?.data ?? [];
  const hasMore = students.length === PAGE_SIZE;

  // Enrollment map for current page
  const studentIds = students.map((s) => s.name);
  const { data: enrollmentMap = {} } = useQuery({
    queryKey: ["director-all-enrollment-map", studentIds],
    queryFn: () => fetchEnrollmentMap(studentIds),
    enabled: studentIds.length > 0,
    staleTime: 60_000,
  });

  // Fee map (total + pending) for current page
  const customerIds = students.map((s) => s.customer).filter(Boolean) as string[];
  const { data: feeMap = {} } = useQuery({
    queryKey: ["director-all-fee-map", customerIds],
    queryFn: () => fetchFeeMap(customerIds),
    enabled: customerIds.length > 0,
    staleTime: 60_000,
  });

  // Guardian info (name + mobile) for current page
  const { data: guardianMap = {} } = useQuery({
    queryKey: ["director-all-guardian-map", studentIds],
    queryFn: () => fetchGuardianMap(studentIds),
    enabled: studentIds.length > 0,
    staleTime: 60_000,
  });

  // Close export dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Export: fetch ALL matching students (not just current page) ──
  const fetchAllForExport = useCallback(async () => {
    const allStudents: Student[] = [];
    let offset = 0;
    const batchSize = 100;
    // Fetch all pages
    while (true) {
      const res = await getStudents({
        search: search || undefined,
        enabled: getEnabledParam(statusFilter),
        extraFilters: getExtraFilters(statusFilter, typeFilter, dateFrom),
        custom_branch: branchFilter || undefined,
        limit_start: offset,
        limit_page_length: batchSize,
        order_by: "student_name asc",
      });
      allStudents.push(...(res.data ?? []));
      if ((res.data ?? []).length < batchSize) break;
      offset += batchSize;
    }
    // Fetch enrollments for all
    const ids = allStudents.map((s) => s.name);
    const enrMap = await fetchEnrollmentMap(ids);
    // Fetch fees for all
    const custIds = allStudents.map((s) => s.customer).filter(Boolean) as string[];
    const fees = custIds.length ? await fetchFeeMap(custIds) : {} as Record<string, { total: number; pending: number }>;
    // Fetch guardian info for all
    const gInfo = ids.length ? await fetchGuardianMap(ids) : {} as Record<string, { parentName: string; parentMobile: string }>;
    return { students: allStudents, enrollments: enrMap, fees, guardianInfo: gInfo };
  }, [search, statusFilter, branchFilter, typeFilter, dateFrom]);

  const handleExportExcel = useCallback(async () => {
    setExporting(true);
    setExportOpen(false);
    try {
      const { students: all, enrollments, fees, guardianInfo } = await fetchAllForExport();
      const excelMod = await import("exceljs");
      const ExcelJS = excelMod.default ?? excelMod;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Students");
      ws.columns = [
        { header: "Student Name", key: "name", width: 25 },
        { header: "Student ID", key: "id", width: 20 },
        { header: "Class", key: "class", width: 18 },
        { header: "Batch", key: "batch", width: 15 },
        { header: "Branch", key: "branch", width: 18 },
        { header: "Parent Name", key: "parent_name", width: 22 },
        { header: "Parent Mobile", key: "parent_mobile", width: 16 },
        { header: "Total Fee", key: "total_fee", width: 14 },
        { header: "Pending Fee", key: "pending_fee", width: 14 },
        { header: "Mobile", key: "mobile", width: 16 },
        { header: "Joined", key: "joined", width: 14 },
        { header: "Status", key: "status", width: 14 },
      ];
      // Style header
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F5F2" } };
      for (const s of all) {
        const enr = enrollments[s.name];
        const fee = s.customer ? fees[s.customer] : undefined;
        ws.addRow({
          name: s.student_name,
          id: s.name,
          class: enr?.program ?? "",
          batch: enr?.student_batch_name ?? "",
          branch: (s.custom_branch ?? "").replace("Smart Up ", ""),
          parent_name: guardianInfo[s.name]?.parentName ?? "",
          parent_mobile: guardianInfo[s.name]?.parentMobile ?? "",
          total_fee: fee?.total ?? 0,
          pending_fee: fee?.pending ?? 0,
          mobile: s.student_mobile_number ?? "",
          joined: s.joining_date ?? "",
          status: s.enabled === 1 ? "Active" : s.custom_discontinuation_date ? "Discontinued" : "Inactive",
        });
      }
      // Format currency columns
      ws.getColumn("total_fee").numFmt = '₹#,##0';
      ws.getColumn("pending_fee").numFmt = '₹#,##0';
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SmartUp_Students_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Excel export failed:", err);
      alert("Excel export failed. Check console for details.");
    } finally {
      setExporting(false);
    }
  }, [fetchAllForExport]);

  const handleExportPDF = useCallback(async () => {
    setExporting(true);
    setExportOpen(false);
    try {
      const { students: all, enrollments, fees, guardianInfo } = await fetchAllForExport();
      const { jsPDF } = await import("jspdf");
      const autoTableMod = await import("jspdf-autotable");
      const autoTable = autoTableMod.default ?? autoTableMod.autoTable;
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFontSize(16);
      doc.text("SmartUp \u2014 All Students", 14, 15);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Exported: ${new Date().toLocaleDateString("en-IN")} | ${all.length} students`, 14, 21);
      const rows = all.map((s) => {
        const enr = enrollments[s.name];
        const fee = s.customer ? fees[s.customer] : undefined;
        return [
          s.student_name,
          enr?.program ?? "",
          (s.custom_branch ?? "").replace("Smart Up ", ""),
          guardianInfo[s.name]?.parentName ?? "",
          guardianInfo[s.name]?.parentMobile ?? "",
          fee?.total ? formatCurrency(fee.total) : "",
          fee?.pending ? (fee.pending > 0 ? formatCurrency(fee.pending) : "Paid") : "",
          s.enabled === 1 ? "Active" : s.custom_discontinuation_date ? "Disc." : "Inactive",
        ];
      });
      autoTable(doc, {
        startY: 25,
        head: [["Student", "Class", "Branch", "Parent Name", "Parent Mobile", "Total Fee", "Pending", "Status"]],
        body: rows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [26, 158, 143], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 250, 249] },
      });
      doc.save(`SmartUp_Students_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF export failed. Check console for details.");
    } finally {
      setExporting(false);
    }
  }, [fetchAllForExport]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Back */}
      <Link
        href="/dashboard/director/students"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Branches
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">All Students</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {hasFilters
              ? filteredCount !== undefined
                ? `${filteredCount} student${filteredCount !== 1 ? "s" : ""} found${dateFrom ? ` admitted on ${new Date(dateFrom + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}${branchFilter ? ` in ${branchFilter.replace("Smart Up ", "")}` : ""}`
                : "Counting…"
              : totalCount !== undefined
                ? `${totalCount} active students across all branches`
                : "Loading..."}
          </p>
        </div>
        {/* Export Dropdown */}
        <div className="relative" ref={exportRef}>
          <Button
            variant="outline"
            size="md"
            onClick={() => setExportOpen((p) => !p)}
            disabled={exporting || isLoading}
            className="gap-2"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <AnimatePresence>
            {exportOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 mt-1 w-48 bg-surface border border-border-light rounded-lg shadow-dropdown z-50 overflow-hidden"
              >
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-text-primary hover:bg-brand-wash transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4 text-success" />
                  Download Excel
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-text-primary hover:bg-brand-wash transition-colors"
                >
                  <FileText className="h-4 w-4 text-error" />
                  Download PDF
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Search by name…"
                leftIcon={<Search className="h-4 w-4" />}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            {/* Branch filter */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-10 px-3 rounded-[8px] border border-border-input bg-surface text-sm text-text-primary
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="">All Branches</option>
              {activeBranches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name.replace("Smart Up ", "")}
                </option>
              ))}
            </select>
            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="h-10 px-3 rounded-[8px] border border-border-input bg-surface text-sm text-text-primary
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="all">All Types</option>
              <option value="Fresher">Fresher</option>
              <option value="Existing">Existing</option>
              <option value="Rejoining">Rejoining</option>
            </select>
            {/* Date from filter */}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-text-tertiary flex-shrink-0" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-10 px-2.5 rounded-[8px] border border-border-input bg-surface text-sm text-text-primary
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-[140px]"
                title="Joined from"
              />
              {dateFrom && (
                <button
                  onClick={() => setDateFrom("")}
                  className="text-xs text-primary hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            {/* Status tabs */}
            <div className="flex gap-2 flex-shrink-0">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-4 py-2 rounded-[8px] text-xs font-medium transition-all ${
                    statusFilter === tab.value
                      ? "bg-primary text-white"
                      : "bg-app-bg text-text-secondary hover:bg-brand-wash"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-error">
            <AlertCircle className="h-8 w-8" />
            <p className="font-medium">Failed to load students</p>
            <p className="text-xs text-text-tertiary">
              {(error as Error)?.message ?? "Unknown error"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Student</th>
                  <th className="text-center px-5 py-3 font-semibold text-text-secondary">Type</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Class</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Batch</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Branch</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Parent Name</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Parent Mobile</th>
                  <th className="text-right px-5 py-3 font-semibold text-text-secondary">Total Fee</th>
                  <th className="text-right px-5 py-3 font-semibold text-text-secondary">Pending</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary hidden lg:table-cell">Joined</th>
                  <th className="text-center px-5 py-3 font-semibold text-text-secondary">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-border-light">
                        {Array.from({ length: 11 }).map((_, j) => (
                          <td key={j} className="px-5 py-3">
                            <div className="h-4 w-full bg-border-light rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : students.length === 0
                  ? (
                      <tr>
                        <td colSpan={11} className="px-5 py-16 text-center text-text-tertiary text-sm">
                          No students found{search ? ` matching "${search}"` : ""}.
                        </td>
                      </tr>
                    )
                  : students.map((student, index) => {
                      const enr = enrollmentMap[student.name];
                      return (
                        <motion.tr
                          key={student.name}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="border-b border-border-light hover:bg-brand-wash/30 transition-colors"
                        >
                          {/* Student name + ID + badges */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {initials(student.student_name || student.first_name || "?")}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-medium text-text-primary truncate">
                                    {student.student_name}
                                  </p>
                                  {enr?.custom_plan && (
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] px-1.5 py-0 gap-0.5 ${
                                        enr.custom_plan === "Advanced"
                                          ? "border-indigo-300 text-indigo-600"
                                          : "border-gray-300 text-gray-500"
                                      }`}
                                    >
                                      {enr.custom_plan === "Advanced" && <Star className="h-2.5 w-2.5" />}
                                      {enr.custom_plan}
                                    </Badge>
                                  )}
                                  <DisabilityBadge disabilities={student.custom_disabilities} />
                                </div>
                                <p className="text-xs text-text-tertiary truncate">{student.name}</p>
                              </div>
                            </div>
                          </td>

                          {/* Student Type */}
                          <td className="px-5 py-3 text-center">
                            {student.custom_student_type ? (
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-2 py-0.5 ${
                                  student.custom_student_type === "Fresher"
                                    ? "border-green-300 text-green-700"
                                    : student.custom_student_type === "Existing"
                                    ? "border-blue-300 text-blue-700"
                                    : "border-amber-300 text-amber-700"
                                }`}
                              >
                                {student.custom_student_type}
                              </Badge>
                            ) : (
                              <span className="text-text-tertiary text-xs">—</span>
                            )}
                          </td>

                          {/* Class */}
                          <td className="px-5 py-3 text-text-secondary">
                            {enr?.program ?? <span className="text-text-tertiary text-xs">—</span>}
                          </td>

                          {/* Batch */}
                          <td className="px-5 py-3 text-text-secondary">
                            {enr?.student_batch_name ?? <span className="text-text-tertiary text-xs">—</span>}
                          </td>

                          {/* Branch */}
                          <td className="px-5 py-3 text-text-secondary text-xs">
                            {student.custom_branch
                              ? student.custom_branch.replace("Smart Up ", "")
                              : <span className="text-text-tertiary">—</span>}
                          </td>

                          {/* Parent Name */}
                          <td className="px-5 py-3 text-text-secondary text-sm">
                            {guardianMap[student.name]?.parentName || <span className="text-text-tertiary text-xs">—</span>}
                          </td>

                          {/* Parent Mobile */}
                          <td className="px-5 py-3 text-text-secondary text-sm">
                            {guardianMap[student.name]?.parentMobile || <span className="text-text-tertiary text-xs">—</span>}
                          </td>

                          {/* Total Fee */}
                          <td className="px-5 py-3 text-right text-text-secondary text-xs font-medium">
                            {student.customer && feeMap[student.customer]
                              ? formatCurrency(feeMap[student.customer].total)
                              : <span className="text-text-tertiary">—</span>}
                          </td>

                          {/* Pending Fee */}
                          <td className="px-5 py-3 text-right text-xs font-medium">
                            {student.customer && feeMap[student.customer]
                              ? (
                                <span className={feeMap[student.customer].pending > 0 ? "text-error" : "text-success"}>
                                  {feeMap[student.customer].pending > 0
                                    ? formatCurrency(feeMap[student.customer].pending)
                                    : "Paid"}
                                </span>
                              )
                              : <span className="text-text-tertiary">—</span>}
                          </td>

                          {/* Joined */}
                          <td className="px-5 py-3 text-text-secondary text-xs hidden lg:table-cell">
                            {student.joining_date ?? <span className="text-text-tertiary">—</span>}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3 text-center">
                            <Badge variant={
                              student.enabled === 1 ? "success"
                              : student.custom_discontinuation_date ? "error"
                              : "default"
                            }>
                              {student.enabled === 1
                                ? "Active"
                                : student.custom_discontinuation_date
                                ? "Discontinued"
                                : "Inactive"}
                            </Badge>
                          </td>
                        </motion.tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border-light">
          <p className="text-sm text-text-tertiary">
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </span>
            ) : (
              `Page ${page + 1} · ${students.length} students`
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isLoading}
              className="w-8 h-8 rounded-[8px] flex items-center justify-center text-text-tertiary hover:bg-app-bg transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-text-secondary font-medium px-2">{page + 1}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore || isLoading}
              className="w-8 h-8 rounded-[8px] flex items-center justify-center text-text-tertiary hover:bg-app-bg transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
