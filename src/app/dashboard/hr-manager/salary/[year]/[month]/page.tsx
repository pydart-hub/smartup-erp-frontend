"use client";

import React, { useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays, ArrowLeft, Loader2, AlertCircle,
  Save, CheckCircle2, IndianRupee, TrendingDown,
  Users, Download, BookOpen, AlertTriangle,
  ChevronDown, Building2, BarChart3, CalendarCheck2,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getSalaryRecords,
  updateSalaryRecord,
  calculateSalary,
  formatPeriod,
  createJournalEntry,
  submitDocument,
  getEmployeeGLStatus,
} from "@/lib/api/salary";
import { getEmployees } from "@/lib/api/employees";
import apiClient from "@/lib/api/client";
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

type PayStatus = "pending" | "accrued" | "paid" | "no-account";

function PayStatusBadge({ status }: { status: PayStatus }) {
  if (status === "paid")
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">Paid</span>;
  if (status === "accrued")
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">Balance</span>;
  if (status === "pending")
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-text-tertiary bg-surface-secondary px-2 py-0.5 rounded-full">Pending</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-error/70 bg-error/5 px-2 py-0.5 rounded-full">No Account</span>;
}

export default function SalarySheetPage() {
  const params = useParams();
  const { defaultCompany } = useAuth();
  const queryClient = useQueryClient();

  // ── JE state ──
  const [jeLoading, setJeLoading] = useState(false);
  const [showJeConfirm, setShowJeConfirm] = useState(false);

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

  // ── Company abbr map ──
  const { data: companiesRes } = useQuery({
    queryKey: ["companies-abbr"],
    queryFn: async () => {
      const { data } = await apiClient.get("/resource/Company?fields=[\"name\",\"abbr\"]&limit_page_length=50");
      return data as { data: { name: string; abbr: string }[] };
    },
    staleTime: 300_000,
  });
  const companyAbbrMap = useMemo(() => {
    const map: Record<string, string> = {};
    companiesRes?.data?.forEach((c) => { map[c.name] = c.abbr; });
    return map;
  }, [companiesRes]);

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

  // ── Employee payable account + company maps (all companies, no filter) ──
  const { data: employeesRes } = useQuery({
    queryKey: ["hr-employee-payable-map"],
    queryFn: () => getEmployees({ limit_page_length: 500 }),
    staleTime: 120_000,
  });
  const employeePayableMap = useMemo(() => {
    const map: Record<string, string> = {};
    employeesRes?.data?.forEach((e) => {
      if (e.custom_payable_account) map[e.name] = e.custom_payable_account;
    });
    return map;
  }, [employeesRes]);
  // Fallback: look up company from employee record when salary record has no company stored
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

  // ── All payable accounts for GL status query ──
  const allPayableAccounts = useMemo(() => Object.values(employeePayableMap), [employeePayableMap]);

  const { data: glStatusMap = {} } = useQuery({
    queryKey: ["hr-salary-gl-status", allPayableAccounts],
    queryFn: () => getEmployeeGLStatus(allPayableAccounts),
    enabled: allPayableAccounts.length > 0,
    staleTime: 60_000,
  });

  /** Derive GL-based pay status for one record */
  function getGLPayStatus(record: SmartUpSalaryRecord): "pending" | "accrued" | "paid" | "no-account" {
    const empId = record.custom_employee ?? record.staff;
    const payableAcct = empId ? employeePayableMap[empId] : undefined;
    if (!payableAcct) return "no-account";
    const gl = glStatusMap[payableAcct];
    if (!gl || gl.totalCredit === 0) return "pending";
    if (gl.balance > 0) return "accrued";
    return "paid";
  }

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
        ...(prev[name] ?? {
          lop_days: String(record.lop_days ?? 0),
          total_working_days: String(globalWorkingDays),
          other_deduction: String(record.custom_other_deduction ?? 0),
          other_remark: record.custom_other_deduction_remark ?? "",
          available_leave: record.custom_available_leave != null ? String(record.custom_available_leave) : "",
          dirty: false,
          saving: false,
        }),
        lop_days: value,
        dirty: true,
      },
    }));
  }

  function handleOtherDeductionChange(name: string, record: SmartUpSalaryRecord, value: string) {
    setEdits((prev) => ({
      ...prev,
      [name]: {
        ...(prev[name] ?? {
          lop_days: String(record.lop_days ?? 0),
          total_working_days: String(globalWorkingDays),
          other_deduction: String(record.custom_other_deduction ?? 0),
          other_remark: record.custom_other_deduction_remark ?? "",
          available_leave: record.custom_available_leave != null ? String(record.custom_available_leave) : "",
          dirty: false,
          saving: false,
        }),
        other_deduction: value,
        dirty: true,
      },
    }));
  }

  function handleOtherRemarkChange(name: string, record: SmartUpSalaryRecord, value: string) {
    setEdits((prev) => ({
      ...prev,
      [name]: {
        ...(prev[name] ?? {
          lop_days: String(record.lop_days ?? 0),
          total_working_days: String(globalWorkingDays),
          other_deduction: String(record.custom_other_deduction ?? 0),
          other_remark: record.custom_other_deduction_remark ?? "",
          available_leave: record.custom_available_leave != null ? String(record.custom_available_leave) : "",
          dirty: false,
          saving: false,
        }),
        other_remark: value,
        dirty: true,
      },
    }));
  }

  function handleAvailableLeaveChange(name: string, record: SmartUpSalaryRecord, value: string) {
    setEdits((prev) => ({
      ...prev,
      [name]: {
        ...(prev[name] ?? {
          lop_days: String(record.lop_days ?? 0),
          total_working_days: String(globalWorkingDays),
          other_deduction: String(record.custom_other_deduction ?? 0),
          other_remark: record.custom_other_deduction_remark ?? "",
          available_leave: record.custom_available_leave != null ? String(record.custom_available_leave) : "",
          dirty: false,
          saving: false,
        }),
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
    let paidCount = 0, accruedCount = 0, pendingCount = 0;
    for (const r of records) {
      totalBasic += r.basic_salary;
      const empId = r.custom_employee ?? r.staff;
      const payableAcct = empId ? employeePayableMap[empId] : undefined;
      const gl = payableAcct ? glStatusMap[payableAcct] : undefined;
      if (!payableAcct || !gl || gl.totalCredit === 0) pendingCount++;
      else if (gl.balance > 0) accruedCount++;
      else paidCount++;
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
    return { totalBasic, totalLop, totalOther, totalNet, paidCount, accruedCount, pendingCount, dirtyCount };
  }, [records, edits, employeePayableMap, glStatusMap, globalWorkingDays]);

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

  // ── Create Journal Entry ──
  async function handleCreateJE() {
    setJeLoading(true);
    setShowJeConfirm(false);
    try {
      // Last day of the salary month
      const lastDay = new Date(year, month, 0).getDate();
      const postingDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      // Group records by company — each JE must belong to a single company
      // r.company may be empty for records created before the fix; fall back to employee's company
      const byCompany = new Map<string, typeof records>();
      for (const r of records) {
        const employeeId = r.custom_employee ?? r.staff;
        const co = r.company || (employeeId ? employeeCompanyMap[employeeId] : "") || defaultCompany || "";
        if (!co) continue;
        if (!byCompany.has(co)) byCompany.set(co, []);
        byCompany.get(co)!.push(r);
      }

      if (byCompany.size === 0) {
        toast.error("Could not determine company for any record.");
        return;
      }

      const skipped: string[] = [];
      const created: string[] = [];

      for (const [company, compRecords] of byCompany) {
        const abbr = companyAbbrMap[company];
        if (!abbr) {
          compRecords.forEach(r => skipped.push(r.custom_employee_name ?? r.staff_name ?? company));
          continue;
        }
        const salaryAccount = `Salary - ${abbr}`;

        type JELine = { account: string; debit_in_account_currency?: number; credit_in_account_currency?: number; party_type?: string; party?: string };
        const jeLines: JELine[] = [];

        for (const r of compRecords) {
          // Use previewNet so local LOP edits are reflected without needing to save first
          const net = previewNet(r).net;
          if (!net || net <= 0) continue;

          const employeeId = r.custom_employee ?? r.staff;
          const payableAccount = employeeId ? employeePayableMap[employeeId] : undefined;

          if (!payableAccount) {
            skipped.push(r.custom_employee_name ?? r.staff_name);
            continue;
          }

          // Dr Salary Expense
          jeLines.push({ account: salaryAccount, debit_in_account_currency: net });
          // Cr Employee Payable — requires party_type + party for Payable accounts
          jeLines.push({
            account: payableAccount,
            credit_in_account_currency: net,
            party_type: "Employee",
            party: employeeId,
          });
        }

        if (jeLines.length === 0) continue;

        const res = await createJournalEntry({
          company,
          posting_date: postingDate,
          user_remark: `Salary Payable — ${formatPeriod(month, year)}`,
          accounts: jeLines,
        });

        if (res.data?.name) {
          const jeName = res.data.name;
          // Auto-submit the Journal Entry
          try {
            await submitDocument("Journal Entry", jeName);
          } catch {
            // Submission failed but JE was created — note it
            toast.warning(`JE ${jeName} created but could not be submitted. Please submit manually in Frappe.`);
          }
          created.push(jeName);
        } else {
          toast.error(`Failed to create JE for ${company}`);
        }
      }

      if (created.length > 0) {
        toast.success(`Submitted ${created.length} Journal Entr${created.length > 1 ? "ies" : "y"}: ${created.join(", ")}`);
      }
      if (skipped.length > 0) {
        toast.warning(`Skipped (no payable account): ${skipped.join(", ")}`);
      }
      if (created.length === 0 && skipped.length === 0) {
        toast.error("No employees with a payable account found. Generate salary first.");
      }
    } catch {
      toast.error("Failed to create Journal Entry");
    } finally {
      setJeLoading(false);
    }
  }

  // ── CSV Export ──
  function handleExport() {
    const rows = [
      ["Staff Name", "Basic Salary", "Working Days", "LOP Days", "LOP Deduction", "Net Salary", "Pay Status"],
      ...records.map((r) => {
        const payStatus = getGLPayStatus(r);
        return [
          r.custom_employee_name ?? r.staff_name,
          r.basic_salary,
          r.total_working_days,
          r.lop_days,
          r.lop_deduction,
          r.net_salary,
          payStatus === "paid" ? "Paid" : payStatus === "accrued" ? "Accrued (Balance)" : "Pending",
        ];
      }),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salary-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
              <Button variant="outline" size="sm">
                <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                Payment Status
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={records.length === 0}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Global Working Days ── */}
      {!isLoading && records.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 bg-surface-secondary/50 rounded-xl border border-border-main px-4 py-2.5">
            <CalendarDays className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium text-text-primary">Working Days</span>
            <Input
              type="number" min="1" max="31"
              className="w-16 text-center h-7 text-sm px-1"
              value={globalWorkingDays}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 1 && v <= 31) setGlobalWorkingDays(v);
              }}
            />
            <span className="text-xs text-text-tertiary flex-1">days — applies to all staff · LOP is per employee</span>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: <Users className="h-3.5 w-3.5" />, value: records.length, label: "Staff", color: "text-text-primary" },
              { icon: <IndianRupee className="h-3.5 w-3.5" />, value: formatCurrency(stats.totalNet), label: "Total Net Pay", color: "text-success" },
              { icon: <CheckCircle2 className="h-3.5 w-3.5" />, value: `${stats.paidCount}/${records.length}`, label: "Fully Paid", color: "text-success" },
              { icon: <TrendingDown className="h-3.5 w-3.5" />, value: stats.accruedCount, label: "Balance Pending", color: "text-warning" },
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

              let branchBasic = 0, branchLop = 0, branchOther = 0, branchNet = 0, branchLopDays = 0, branchPaid = 0;
              for (const r of branchRecords) {
                branchBasic += r.basic_salary;
                branchPaid += getGLPayStatus(r) === "paid" ? 1 : 0;
                const { lopDeduction, otherDeduction, net } = previewNet(r);
                branchLop += lopDeduction;
                branchOther += otherDeduction;
                branchNet += net;
                const edit = edits[r.name];
                branchLopDays += edit?.dirty ? (parseFloat(edit.lop_days) || 0) : r.lop_days;
              }
              void branchBasic; void branchLopDays;

              return (
                <div key={branch} className="rounded-xl border border-border-main overflow-hidden bg-surface-primary">
                  {/* Branch header */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-secondary/60 transition-colors"
                    onClick={() => toggleBranch(branch)}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="font-semibold text-text-primary text-sm">{branch}</span>
                      <span className="text-xs text-text-tertiary bg-surface-secondary px-1.5 py-0.5 rounded-full">
                        {branchRecords.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center gap-3 text-xs">
                        <span className="font-medium text-success">{formatCurrency(branchNet)}</span>
                        {branchLop > 0 && <span className="text-error">−{formatCurrency(branchLop)}</span>}
                        <span className="text-text-tertiary">
                          {branchPaid === branchRecords.length
                            ? <span className="text-success font-medium">All paid</span>
                            : `${branchPaid}/${branchRecords.length} paid`}
                        </span>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-text-tertiary transition-transform duration-200 ${isCollapsed ? "" : "rotate-180"}`} />
                    </div>
                  </button>

                  {/* Table (hidden when collapsed) */}
                  {!isCollapsed && (
                    <>
                      {/* Desktop */}
                      <div className="hidden md:block overflow-x-auto border-t border-border-main">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-surface-secondary/50">
                              <th className="text-left py-2.5 px-4 text-xs font-medium text-text-tertiary">Staff</th>
                              <th className="text-right py-2.5 px-4 text-xs font-medium text-text-tertiary">Basic</th>
                              <th className="text-center py-2.5 px-4 text-xs font-medium text-text-tertiary">LOP</th>
                              <th className="text-center py-2.5 px-3 text-xs font-medium text-text-tertiary">Other Deduction</th>
                              <th className="text-right py-2.5 px-4 text-xs font-medium text-text-tertiary">Net Pay</th>
                              <th className="text-center py-2.5 px-3 text-xs font-medium text-text-tertiary">
                                <div className="flex items-center justify-center gap-1">
                                  <CalendarCheck2 className="h-3 w-3" />
                                  Avail. Leave
                                </div>
                              </th>
                              <th className="text-center py-2.5 px-4 text-xs font-medium text-text-tertiary">Status</th>
                              <th className="py-2.5 px-2 w-10" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-main">
                            {branchRecords.map((record) => {
                              const edit = getEdit(record);
                              const { lopDeduction, otherDeduction, net } = previewNet(record);
                              const isDirty = edit.dirty;
                              const isSaving = edit.saving;
                              const empId = record.custom_employee ?? record.staff;
                              const hasPayable = empId ? !!employeePayableMap[empId] : false;
                              const payStatus = getGLPayStatus(record);

                              return (
                                <tr key={record.name} className="hover:bg-surface-secondary/30 transition-colors">
                                  <td className="py-2.5 px-4">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-medium text-text-primary text-sm">
                                        {record.custom_employee_name ?? record.staff_name}
                                      </span>
                                      {!hasPayable && (
                                        <span title="No payable account — JE will skip">
                                          <AlertTriangle className="h-3 w-3 text-warning flex-shrink-0" />
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-4 text-right text-text-primary tabular-nums">
                                    {formatCurrency(record.basic_salary)}
                                  </td>
                                  {/* LOP input */}
                                  <td className="py-2.5 px-4 text-center">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <Input type="number" min="0" step="0.5"
                                        className={`w-16 text-center mx-auto h-7 text-xs px-1 ${parseFloat(edit.lop_days) > 0 ? "border-error/50 text-error" : ""}`}
                                        value={edit.lop_days}
                                        onChange={(e) => handleLopChange(record.name, record, e.target.value)}
                                        disabled={payStatus === "paid"} />
                                      {lopDeduction > 0 && (
                                        <span className="text-error text-[10px] tabular-nums">−{formatCurrency(lopDeduction)}</span>
                                      )}
                                    </div>
                                  </td>
                                  {/* Other Deduction: amount + remark */}
                                  <td className="py-2 px-3 text-center">
                                    <div className="flex flex-col items-center gap-1 min-w-[140px]">
                                      <Input type="number" min="0" step="1"
                                        placeholder="0"
                                        className={`w-24 text-center mx-auto h-7 text-xs px-1 ${otherDeduction > 0 ? "border-warning/60 text-warning" : ""}`}
                                        value={edit.other_deduction === "0" ? "" : edit.other_deduction}
                                        onChange={(e) => handleOtherDeductionChange(record.name, record, e.target.value || "0")}
                                        disabled={payStatus === "paid"} />
                                      <Input
                                        placeholder="Reason…"
                                        className="w-full h-6 text-[10px] px-1.5 text-text-tertiary"
                                        value={edit.other_remark}
                                        onChange={(e) => handleOtherRemarkChange(record.name, record, e.target.value)}
                                        disabled={payStatus === "paid"} />
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-4 text-right tabular-nums">
                                    <span className="font-semibold text-success">{formatCurrency(net)}</span>
                                  </td>
                                  {/* Available Leave till this month — editable input, saved to Frappe */}
                                  <td className="py-2.5 px-3 text-center">
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
                                          className={`w-16 text-center mx-auto h-7 text-xs px-1 ${color}`}
                                          value={inputVal}
                                          onChange={(e) => handleAvailableLeaveChange(record.name, record, e.target.value)}
                                          disabled={payStatus === "paid"}
                                        />
                                      );
                                    })()}
                                  </td>
                                  <td className="py-2.5 px-4 text-center">
                                    <PayStatusBadge status={payStatus} />
                                  </td>
                                  <td className="py-2.5 px-2 text-center">
                                    {isDirty && (
                                      <Button size="sm" variant="outline" className="h-7 w-7 p-0"
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
                          const empIdMob = record.custom_employee ?? record.staff;
                          const payStatusMob = getGLPayStatus(record);
                          return (
                            <div key={record.name} className="p-3 space-y-2.5">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-medium text-text-primary text-sm">{record.custom_employee_name ?? record.staff_name}</p>
                                    {empIdMob && !employeePayableMap[empIdMob] && (
                                      <AlertTriangle className="h-3 w-3 text-warning" />
                                    )}
                                  </div>
                                  <p className="text-xs text-text-tertiary">{formatCurrency(record.basic_salary)}</p>
                                </div>
                                <PayStatusBadge status={payStatusMob} />
                              </div>
                              {/* LOP row */}
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="text-xs text-text-tertiary mb-1">LOP Days</p>
                                  <Input type="number" min="0" step="0.5"
                                    className={`w-24 text-center h-8 text-sm ${parseFloat(edit.lop_days) > 0 ? "border-error/50 text-error" : ""}`}
                                    value={edit.lop_days}
                                    onChange={(e) => handleLopChange(record.name, record, e.target.value)}
                                    disabled={payStatusMob === "paid"} />
                                </div>
                                {lopDeduction > 0 && (
                                  <span className="text-error text-xs mt-4">−{formatCurrency(lopDeduction)}</span>
                                )}
                              </div>
                              {/* Other Deduction row */}
                              <div className="flex items-start gap-2">
                                <div className="flex-shrink-0">
                                  <p className="text-xs text-text-tertiary mb-1">Other Deduction</p>
                                  <Input type="number" min="0" step="1"
                                    placeholder="0"
                                    className={`w-24 text-center h-8 text-sm ${otherDeduction > 0 ? "border-warning/60 text-warning" : ""}`}
                                    value={edit.other_deduction === "0" ? "" : edit.other_deduction}
                                    onChange={(e) => handleOtherDeductionChange(record.name, record, e.target.value || "0")}
                                    disabled={payStatusMob === "paid"} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-text-tertiary mb-1">Reason</p>
                                  <Input
                                    placeholder="e.g. Advance recovery"
                                    className="h-8 text-xs"
                                    value={edit.other_remark}
                                    onChange={(e) => handleOtherRemarkChange(record.name, record, e.target.value)}
                                    disabled={payStatusMob === "paid"} />
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span />
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-success text-sm">{formatCurrency(net)}</span>
                                  {isDirty && (
                                    <Button size="sm" variant="outline" className="h-7" onClick={() => handleSaveRow(record)} disabled={isSaving}>
                                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
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
                          <span>{branchPaid}/{branchRecords.length} paid</span>
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
                <span className="text-text-tertiary text-xs">{stats.paidCount}/{records.length} paid</span>
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
                  <p className="text-xs text-text-tertiary mt-0.5">Save LOP to backend before posting Journal Entry</p>
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

      {/* ── Post to Accounts ── */}
      <AnimatePresence>
        {records.length > 0 && (
          <motion.div key="post-to-accounts" variants={itemVariants} initial="hidden" animate="visible" exit={{ opacity: 0 }}>
            <div className="rounded-xl border border-border-main bg-surface-primary p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary text-sm">Post to Accounts</p>
                    <p className="text-xs text-text-tertiary mt-0.5 truncate">
                      Dr Salary Expense / Cr Employee Payable · one JE per branch
                    </p>
                  </div>
                </div>

                {(() => {
                  const missing = records.filter(r => {
                    const empId = r.custom_employee ?? r.staff;
                    return empId ? !employeePayableMap[empId] : true;
                  });
                  return missing.length > 0 ? (
                    <span className="text-xs text-warning flex items-center gap-1 flex-shrink-0">
                      <AlertTriangle className="h-3 w-3" />
                      {missing.length} will be skipped
                    </span>
                  ) : null;
                })()}

                {stats.dirtyCount > 0 ? (
                  <div className="flex items-center gap-2 flex-shrink-0 text-xs text-warning">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Save {stats.dirtyCount} unsaved change{stats.dirtyCount > 1 ? "s" : ""} first</span>
                    <Button size="sm" variant="outline" onClick={handleSaveAll} disabled={saveAllLoading}>
                      {saveAllLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                      Save All
                    </Button>
                  </div>
                ) : !showJeConfirm ? (
                  <Button size="sm" className="flex-shrink-0" onClick={() => setShowJeConfirm(true)} disabled={jeLoading}>
                    <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                    Post Journal Entry
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-text-tertiary">Confirm for {records.length} staff?</span>
                    <Button size="sm" onClick={handleCreateJE} disabled={jeLoading}>
                      {jeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                      Confirm
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowJeConfirm(false)} disabled={jeLoading}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
