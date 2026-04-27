"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Loader2, AlertCircle, Users,
  CheckCircle2, Clock, IndianRupee, Building2, TrendingDown, CalendarCheck2,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/lib/hooks/useAuth";
import { getSalaryRecords, getEmployeeGLStatus, formatPeriod } from "@/lib/api/salary";
import { getEmployees } from "@/lib/api/employees";
import { formatCurrency } from "@/lib/utils/formatters";
import type { SmartUpSalaryRecord } from "@/lib/types/salary";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

type PayStatus = "paid" | "accrued" | "pending" | "no-account";

function StatusBadge({ status }: { status: PayStatus }) {
  if (status === "paid")
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">Paid</span>;
  if (status === "accrued")
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">Balance Due</span>;
  if (status === "pending")
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-text-tertiary bg-surface-secondary px-2 py-0.5 rounded-full">Pending</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-error/70 bg-error/5 px-2 py-0.5 rounded-full">No Account</span>;
}

export default function PaymentStatusPage() {
  const params = useParams();
  const { defaultCompany } = useAuth();

  const year = Number(params.year);
  const month = Number(params.month);
  const periodLabel = formatPeriod(month, year);

  // ── Salary records ──
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

  // ── Employees (for payable account + branch) ──
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

  const employeeBranchMap = useMemo(() => {
    const map: Record<string, string> = {};
    employeesRes?.data?.forEach((e) => {
      if (e.branch) map[e.name] = e.branch;
      else if (e.company) map[e.name] = e.company.replace(/^Smart Up\s*/i, "");
    });
    return map;
  }, [employeesRes]);

  // ── GL status for all payable accounts ──
  const allPayableAccounts = useMemo(() => Object.values(employeePayableMap), [employeePayableMap]);

  const { data: glStatusMap = {}, isLoading: glLoading } = useQuery({
    queryKey: ["hr-salary-gl-status", allPayableAccounts],
    queryFn: () => getEmployeeGLStatus(allPayableAccounts),
    enabled: allPayableAccounts.length > 0,
    staleTime: 60_000,
  });

  // ── Derive status for one record ──
  function getPayStatus(record: SmartUpSalaryRecord): PayStatus {
    const empId = record.custom_employee ?? record.staff;
    const payableAcct = empId ? employeePayableMap[empId] : undefined;
    if (!payableAcct) return "no-account";
    const gl = glStatusMap[payableAcct];
    if (!gl || gl.totalCredit === 0) return "pending";
    if (gl.balance > 0) return "accrued";
    return "paid";
  }

  // ── Aggregated rows with status + balance ──
  const rows = useMemo(() => {
    return records.map((r) => {
      const empId = r.custom_employee ?? r.staff;
      const payableAcct = empId ? employeePayableMap[empId] : undefined;
      const gl = payableAcct ? glStatusMap[payableAcct] : undefined;
      const status = getPayStatus(r);
      const balanceDue = gl?.balance ?? 0;
      const amountPaid = gl?.totalDebit ?? 0;   // actual bank payments (Dr Payable / Cr Bank)
      const branch = (empId ? employeeBranchMap[empId] : undefined) ?? "Unknown";
      return { record: r, status, balanceDue, amountPaid, branch, empId: empId ?? "" };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, employeePayableMap, glStatusMap, employeeBranchMap]);

  // ── Summary stats ──
  const stats = useMemo(() => {
    let paidCount = 0, accruedCount = 0, pendingCount = 0, noAccountCount = 0;
    let totalBalance = 0, totalNet = 0;
    for (const row of rows) {
      totalNet += row.record.net_salary;
      totalBalance += row.balanceDue;
      if (row.status === "paid") paidCount++;
      else if (row.status === "accrued") { accruedCount++; }
      else if (row.status === "pending") pendingCount++;
      else noAccountCount++;
    }
    return { paidCount, accruedCount, pendingCount, noAccountCount, totalBalance, totalNet };
  }, [rows]);

  // ── Leave accrued map (employee → accrued days up to salary year) ──
  const { data: leaveBalanceRes } = useQuery({
    queryKey: ["hr-salary-leave-balance", year],
    queryFn: async () => {
      const res = await fetch(`/api/hr/leave-allocation?year=${year}`);
      if (!res.ok) return null;
      return res.json() as Promise<{ employees: { employee: string; accrued_to_date: number }[] }>;
    },
    staleTime: 120_000,
  });
  const leaveAccruedMap = useMemo(() => {
    const map: Record<string, number> = {};
    leaveBalanceRes?.employees?.forEach((e) => { map[e.employee] = e.accrued_to_date; });
    return map;
  }, [leaveBalanceRes]);

  // ── Group rows by branch ──
  const branchGroups = useMemo(() => {
    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      if (!groups.has(row.branch)) groups.set(row.branch, []);
      groups.get(row.branch)!.push(row);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const loading = isLoading || glLoading;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
      <BreadcrumbNav />

      {/* ── Header ── */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/hr-manager/payroll">
              <button className="p-1.5 rounded-lg hover:bg-surface-secondary transition-colors">
                <ArrowLeft className="h-4 w-4 text-text-secondary" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Payment Status — {periodLabel}</h1>
              <p className="text-text-tertiary text-xs mt-0.5">Derived from GL Entry · Employee Payable Account balance</p>
            </div>
          </div>
          <Link href={`/dashboard/hr-manager/salary/${year}/${month}`}>
            <button className="text-xs text-primary hover:underline flex items-center gap-1">
              View Salary Sheet →
            </button>
          </Link>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-text-tertiary">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading payment data…</span>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center py-16 gap-2 text-error">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">Failed to load records</span>
        </div>
      ) : (
        <>
          {/* ── Summary Cards ── */}
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Card>
                <CardContent className="p-3 flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-text-tertiary opacity-60" />
                  <div>
                    <p className="text-sm font-bold text-text-primary">{records.length}</p>
                    <p className="text-xs text-text-tertiary">Total Staff</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-success opacity-60" />
                  <div>
                    <p className="text-sm font-bold text-success">{stats.paidCount}</p>
                    <p className="text-xs text-text-tertiary">Fully Paid</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 flex items-center gap-2.5">
                  <TrendingDown className="h-4 w-4 text-warning opacity-60" />
                  <div>
                    <p className="text-sm font-bold text-warning">{stats.accruedCount}</p>
                    <p className="text-xs text-text-tertiary">Balance Due</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-text-tertiary opacity-60" />
                  <div>
                    <p className="text-sm font-bold text-text-secondary">{stats.pendingCount}</p>
                    <p className="text-xs text-text-tertiary">Pending (no JE)</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* ── Outstanding Balance Banner ── */}
          {stats.totalBalance > 0 && (
            <motion.div variants={itemVariants}>
              <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <IndianRupee className="h-4 w-4 text-warning" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Total Outstanding Balance</p>
                    <p className="text-xs text-text-tertiary">
                      Salary accrued but not yet paid to {stats.accruedCount} employee{stats.accruedCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <span className="text-lg font-bold text-warning tabular-nums">{formatCurrency(stats.totalBalance)}</span>
              </div>
            </motion.div>
          )}

          {/* ── Branch-wise Tables ── */}
          <motion.div variants={itemVariants} className="space-y-3">
            {branchGroups.map(([branch, branchRows]) => {
              const branchBalance = branchRows.reduce((s, r) => s + r.balanceDue, 0);
              const branchPaid = branchRows.filter(r => r.status === "paid").length;

              return (
                <div key={branch} className="rounded-xl border border-border-main overflow-hidden bg-surface-primary">
                  {/* Branch header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-surface-secondary/50 border-b border-border-main">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      <span className="font-semibold text-sm text-text-primary">{branch}</span>
                      <span className="text-xs text-text-tertiary">· {branchRows.length} staff</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-success font-medium">{branchPaid}/{branchRows.length} paid</span>
                      {branchBalance > 0 && (
                        <span className="text-warning font-medium">{formatCurrency(branchBalance)} due</span>
                      )}
                    </div>
                  </div>

                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-main bg-surface-secondary/30">
                          <th className="py-2 px-4 text-left text-xs font-medium text-text-tertiary">Employee</th>
                          <th className="py-2 px-4 text-right text-xs font-medium text-text-tertiary">Basic</th>
                          <th className="py-2 px-4 text-right text-xs font-medium text-text-tertiary">LOP Deduction</th>
                          <th className="py-2 px-4 text-right text-xs font-medium text-text-tertiary">Other Deduction</th>
                          <th className="py-2 px-4 text-right text-xs font-medium text-text-tertiary">Paid</th>
                          <th className="py-2 px-4 text-right text-xs font-medium text-text-tertiary">Balance</th>
                          <th className="py-2 px-3 text-center text-xs font-medium text-text-tertiary">
                            <div className="flex items-center justify-center gap-1">
                              <CalendarCheck2 className="h-3 w-3" />
                              Avail. Leave
                            </div>
                          </th>
                          <th className="py-2 px-4 text-center text-xs font-medium text-text-tertiary">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {branchRows.map(({ record, status, balanceDue, amountPaid }) => (
                          <tr key={record.name} className="border-b border-border-main/40 hover:bg-surface-secondary/30 transition-colors">
                            <td className="py-2.5 px-4 text-text-primary font-medium">
                              {record.custom_employee_name ?? record.staff_name ?? record.staff}
                            </td>
                            <td className="py-2.5 px-4 text-right tabular-nums text-text-secondary">
                              {formatCurrency(record.basic_salary)}
                            </td>
                            <td className="py-2.5 px-4 text-right tabular-nums">
                              {record.lop_deduction > 0
                                ? <span className="text-error">−{formatCurrency(record.lop_deduction)}</span>
                                : <span className="text-text-tertiary">—</span>
                              }
                            </td>
                            <td className="py-2.5 px-4 text-right tabular-nums">
                              {(record.custom_other_deduction ?? 0) > 0 ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-warning">−{formatCurrency(record.custom_other_deduction!)}</span>
                                  {record.custom_other_deduction_remark && (
                                    <span className="text-[10px] text-text-tertiary">{record.custom_other_deduction_remark}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-text-tertiary">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right tabular-nums">
                              {amountPaid > 0
                                ? <span className="text-success font-medium">{formatCurrency(amountPaid)}</span>
                                : <span className="text-text-tertiary">—</span>
                              }
                            </td>
                            <td className="py-2.5 px-4 text-right tabular-nums">
                              {balanceDue > 0
                                ? <span className="text-warning font-medium">{formatCurrency(balanceDue)}</span>
                                : <span className="text-text-tertiary">—</span>
                              }
                            </td>
                            {/* Available Leave */}
                            <td className="py-2.5 px-3 text-center">
                              {(() => {
                                const empId = record.custom_employee ?? record.staff;
                                const saved = record.custom_available_leave;
                                const accrued = empId ? leaveAccruedMap[empId] : undefined;
                                const display = saved != null ? saved : accrued;
                                if (display == null) return <span className="text-text-tertiary text-xs">—</span>;
                                const color = display <= 0 ? "text-error" : display <= 1.5 ? "text-warning" : "text-success";
                                return (
                                  <span className={`font-semibold text-sm tabular-nums ${color}`}>{display.toFixed(1)}</span>
                                );
                              })()}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <StatusBadge status={status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="sm:hidden divide-y divide-border-main/40">
                      {branchRows.map(({ record, status, balanceDue, amountPaid }) => (
                      <div key={record.name} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {record.custom_employee_name ?? record.staff_name ?? record.staff}
                          </p>
                          <p className="text-xs text-text-tertiary mt-0.5">
                            Basic: {formatCurrency(record.basic_salary)}
                            {record.lop_deduction > 0 && (
                              <span className="text-error ml-1.5">−{formatCurrency(record.lop_deduction)} LOP</span>
                            )}
                            {(record.custom_other_deduction ?? 0) > 0 && (
                              <span className="text-warning ml-1.5">−{formatCurrency(record.custom_other_deduction!)}{record.custom_other_deduction_remark ? ` (${record.custom_other_deduction_remark})` : ""}</span>
                            )}
                          </p>
                          <p className="text-xs mt-0.5">
                            {amountPaid > 0 && <span className="text-success">Paid: {formatCurrency(amountPaid)}</span>}
                            {balanceDue > 0 && <span className="text-warning ml-2">Due: {formatCurrency(balanceDue)}</span>}
                            {(() => {
                              const empId = record.custom_employee ?? record.staff;
                              const saved = record.custom_available_leave;
                              const accrued = empId ? leaveAccruedMap[empId] : undefined;
                              const display = saved != null ? saved : accrued;
                              if (display == null) return null;
                              const color = display <= 0 ? "text-error" : display <= 1.5 ? "text-warning" : "text-success";
                              return <span className={`ml-2 ${color}`}>Leave: {display.toFixed(1)}</span>;
                            })()}
                          </p>
                        </div>
                        <StatusBadge status={status} />
                      </div>
                    ))}
                  </div>

                  {/* Branch subtotal */}
                  <div className="bg-surface-secondary/40 border-t border-border-main px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-text-tertiary">
                    <span>{branchRows.length} employees</span>
                    <div className="flex items-center gap-4">
                      <span className="text-success font-medium">{formatCurrency(branchRows.reduce((s, r) => s + r.record.net_salary, 0))} net</span>
                      {branchBalance > 0 && (
                        <span className="text-warning font-medium">{formatCurrency(branchBalance)} outstanding</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* ── Grand total ── */}
          {rows.length > 0 && (
            <motion.div variants={itemVariants}>
              <div className="rounded-xl border border-border-main bg-surface-secondary/50 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-text-primary">{records.length} staff total</span>
                <div className="flex flex-wrap items-center gap-4 font-medium">
                  <span className="text-success">{formatCurrency(stats.totalNet)} net pay</span>
                  {stats.totalBalance > 0 && (
                    <span className="text-warning">{formatCurrency(stats.totalBalance)} outstanding</span>
                  )}
                  <span className="text-text-tertiary text-xs">
                    {stats.paidCount} paid · {stats.accruedCount} balance · {stats.pendingCount} pending
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
