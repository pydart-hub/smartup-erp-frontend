"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  IndianRupee,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/lib/hooks/useAuth";
import { getEmployees } from "@/lib/api/employees";
import { formatPeriod, getSalaryRecords, updateSalaryRecord } from "@/lib/api/salary";
import type { SmartUpSalaryRecord } from "@/lib/types/salary";
import { formatCurrency } from "@/lib/utils/formatters";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function SalaryPaymentStatusPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const { defaultCompany } = useAuth();

  const year = Number(params.year);
  const month = Number(params.month);
  const periodLabel = formatPeriod(month, year);

  const [collapsedBranches, setCollapsedBranches] = useState<Record<string, boolean>>({});
  const [statusSaving, setStatusSaving] = useState<Record<string, boolean>>({});

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

  const { data: employeesRes } = useQuery({
    queryKey: ["hr-employees-branch-map"],
    queryFn: () => getEmployees({ limit_page_length: 500 }),
    staleTime: 120_000,
  });

  const records = recordsRes?.data ?? [];

  const employeeCompanyMap = useMemo(() => {
    const map: Record<string, string> = {};
    employeesRes?.data?.forEach((e) => {
      map[e.name] = e.company;
    });
    return map;
  }, [employeesRes]);

  const employeeBranchMap = useMemo(() => {
    const map: Record<string, string> = {};
    employeesRes?.data?.forEach((e) => {
      if (e.branch) map[e.name] = e.branch;
    });
    return map;
  }, [employeesRes]);

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

  const stats = useMemo(() => {
    let paidCount = 0;
    let draftCount = 0;
    let totalNet = 0;
    let paidNet = 0;

    for (const r of records) {
      totalNet += r.net_salary || 0;
      if (r.status === "Paid") {
        paidCount += 1;
        paidNet += r.net_salary || 0;
      } else {
        draftCount += 1;
      }
    }

    return { paidCount, draftCount, totalNet, paidNet };
  }, [records]);

  function toggleBranch(branch: string) {
    setCollapsedBranches((prev) => ({ ...prev, [branch]: !prev[branch] }));
  }

  const statusMutation = useMutation({
    mutationFn: async ({ recordName, nextStatus }: { recordName: string; nextStatus: "Draft" | "Paid" }) => {
      await updateSalaryRecord(recordName, {
        status: nextStatus,
        ...(nextStatus === "Paid" ? { payment_date: new Date().toISOString().slice(0, 10) } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-salary-records", defaultCompany, year, month] });
      toast.success("Payment status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  async function handleStatusChange(record: SmartUpSalaryRecord, nextStatus: "Draft" | "Paid") {
    if (record.status === nextStatus) return;
    setStatusSaving((prev) => ({ ...prev, [record.name]: true }));
    try {
      await statusMutation.mutateAsync({ recordName: record.name, nextStatus });
    } finally {
      setStatusSaving((prev) => ({ ...prev, [record.name]: false }));
    }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
      <BreadcrumbNav />

      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/hr-manager/salary/${year}/${month}`}>
              <button className="p-1.5 rounded-lg hover:bg-surface-secondary transition-colors" aria-label="Back to salary sheet">
                <ArrowLeft className="h-4 w-4 text-text-secondary" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Payment Status - {periodLabel}</h1>
              <p className="text-text-tertiary text-xs mt-0.5">Based on saved salary sheet records. Mark each employee as Paid or Not Paid.</p>
            </div>
          </div>
        </div>
      </motion.div>

      {!isLoading && records.length > 0 && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card>
            <CardContent className="p-3 flex items-center gap-2.5">
              <Users className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-sm font-bold text-text-primary">{records.length}</p>
                <p className="text-xs text-text-tertiary">Total Staff</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <div>
                <p className="text-sm font-bold text-success">{stats.paidCount}</p>
                <p className="text-xs text-text-tertiary">Paid</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-2.5">
              <Clock3 className="h-4 w-4 text-warning" />
              <div>
                <p className="text-sm font-bold text-warning">{stats.draftCount}</p>
                <p className="text-xs text-text-tertiary">Not Paid</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-2.5">
              <IndianRupee className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-bold text-primary">{formatCurrency(stats.paidNet)}</p>
                <p className="text-xs text-text-tertiary">Paid Amount</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-text-tertiary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading payment status...</span>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-16 gap-2 text-error">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">Failed to load salary records</span>
          </div>
        ) : records.length === 0 ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-10 w-10 text-text-tertiary opacity-20" />
              <div>
                <p className="font-medium text-text-primary">No records for {periodLabel}</p>
                <p className="text-sm text-text-secondary mt-1">Generate and save salary sheet first.</p>
              </div>
              <Link href={`/dashboard/hr-manager/salary/${year}/${month}`}>
                <Button size="sm">Go to Salary Sheet</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {branchGroups.map(([branch, branchRecords]) => {
              const isCollapsed = collapsedBranches[branch] ?? true;
              const paidInBranch = branchRecords.filter((r) => r.status === "Paid").length;
              const branchNet = branchRecords.reduce((sum, r) => sum + (r.net_salary || 0), 0);

              return (
                <div key={branch} className="rounded-xl border border-border-main overflow-hidden bg-surface-primary">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-secondary/60 transition-colors"
                    onClick={() => toggleBranch(branch)}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="font-semibold text-text-primary text-sm">{branch}</span>
                      <span className="text-xs text-text-tertiary bg-surface-secondary px-1.5 py-0.5 rounded-full">
                        {branchRecords.length} staff
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-success">{paidInBranch}/{branchRecords.length} paid</span>
                      <ChevronDown className={`h-4 w-4 text-text-tertiary transition-transform duration-200 ${isCollapsed ? "" : "rotate-180"}`} />
                    </div>
                  </button>

                  {!isCollapsed && (
                    <>
                      <div className="hidden md:block overflow-x-auto border-t border-border-main">
                        <table className="w-full min-w-[980px] text-sm">
                          <thead>
                            <tr className="bg-surface-secondary/70">
                              <th className="text-left py-2.5 px-4 text-[11px] uppercase tracking-wide font-medium text-text-tertiary">Employee</th>
                              <th className="text-right py-2.5 px-4 text-[11px] uppercase tracking-wide font-medium text-text-tertiary">Basic</th>
                              <th className="text-right py-2.5 px-4 text-[11px] uppercase tracking-wide font-medium text-text-tertiary">LOP Deduction</th>
                              <th className="text-right py-2.5 px-4 text-[11px] uppercase tracking-wide font-medium text-text-tertiary">Other Deduction</th>
                              <th className="text-right py-2.5 px-4 text-[11px] uppercase tracking-wide font-medium text-text-tertiary">Net Payable</th>
                              <th className="text-center py-2.5 px-4 text-[11px] uppercase tracking-wide font-medium text-text-tertiary">Avail. Leave</th>
                              <th className="text-center py-2.5 px-4 text-[11px] uppercase tracking-wide font-medium text-text-tertiary">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-main">
                            {branchRecords.map((record) => {
                              const isPaid = record.status === "Paid";
                              const saving = !!statusSaving[record.name];
                              const leaveVal = record.custom_available_leave != null ? record.custom_available_leave.toFixed(1) : "-";
                              const netPayable = record.net_salary || 0;

                              return (
                                <tr key={record.name} className="hover:bg-surface-secondary/30 even:bg-surface-secondary/20 transition-colors">
                                  <td className="py-2.5 px-4 font-medium text-text-primary">{record.custom_employee_name ?? record.staff_name}</td>
                                  <td className="py-2.5 px-4 text-right tabular-nums">{formatCurrency(record.basic_salary)}</td>
                                  <td className="py-2.5 px-4 text-right tabular-nums text-error">{record.lop_deduction > 0 ? `-${formatCurrency(record.lop_deduction)}` : "-"}</td>
                                  <td className="py-2.5 px-4 text-right tabular-nums text-warning">{(record.custom_other_deduction || 0) > 0 ? `-${formatCurrency(record.custom_other_deduction || 0)}` : "-"}</td>
                                  <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-success">{formatCurrency(netPayable)}</td>
                                  <td className="py-2.5 px-4 text-center tabular-nums">
                                    <span className={(record.custom_available_leave || 0) <= 0 ? "text-error" : "text-text-primary"}>{leaveVal}</span>
                                  </td>
                                  <td className="py-2.5 px-4 text-center">
                                    <div className="inline-flex items-center rounded-lg border border-border-main bg-surface-primary p-0.5">
                                      <button
                                        type="button"
                                        disabled={saving}
                                        onClick={() => handleStatusChange(record, "Draft")}
                                        className={`px-2 py-1 text-xs rounded-md transition-colors ${!isPaid ? "bg-warning/15 text-warning font-medium" : "text-text-secondary hover:bg-surface-secondary"}`}
                                      >
                                        Not Paid
                                      </button>
                                      <button
                                        type="button"
                                        disabled={saving}
                                        onClick={() => handleStatusChange(record, "Paid")}
                                        className={`px-2 py-1 text-xs rounded-md transition-colors ${isPaid ? "bg-success/15 text-success font-medium" : "text-text-secondary hover:bg-surface-secondary"}`}
                                      >
                                        Paid
                                      </button>
                                    </div>
                                    {saving && <Loader2 className="h-3 w-3 animate-spin inline ml-2 text-text-tertiary" />}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="md:hidden divide-y divide-border-main border-t border-border-main">
                        {branchRecords.map((record) => {
                          const isPaid = record.status === "Paid";
                          const saving = !!statusSaving[record.name];

                          return (
                            <div key={record.name} className="p-3 space-y-2.5">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium text-text-primary text-sm">{record.custom_employee_name ?? record.staff_name}</p>
                                  <p className="text-xs text-text-tertiary">Net Payable: {formatCurrency(record.net_salary || 0)}</p>
                                </div>
                                <Badge variant={isPaid ? "success" : "warning"}>{isPaid ? "Paid" : "Not Paid"}</Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <p className="text-text-tertiary">Basic</p>
                                  <p className="font-medium">{formatCurrency(record.basic_salary)}</p>
                                </div>
                                <div>
                                  <p className="text-text-tertiary">Avail. Leave</p>
                                  <p className={(record.custom_available_leave || 0) <= 0 ? "font-medium text-error" : "font-medium"}>
                                    {record.custom_available_leave != null ? record.custom_available_leave.toFixed(1) : "-"}
                                  </p>
                                </div>
                              </div>

                              <div className="inline-flex items-center rounded-lg border border-border-main bg-surface-primary p-0.5">
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => handleStatusChange(record, "Draft")}
                                  className={`px-2 py-1 text-xs rounded-md transition-colors ${!isPaid ? "bg-warning/15 text-warning font-medium" : "text-text-secondary hover:bg-surface-secondary"}`}
                                >
                                  Not Paid
                                </button>
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => handleStatusChange(record, "Paid")}
                                  className={`px-2 py-1 text-xs rounded-md transition-colors ${isPaid ? "bg-success/15 text-success font-medium" : "text-text-secondary hover:bg-surface-secondary"}`}
                                >
                                  Paid
                                </button>
                              </div>
                              {saving && <Loader2 className="h-3 w-3 animate-spin text-text-tertiary" />}
                            </div>
                          );
                        })}
                      </div>

                      <div className="bg-surface-secondary/60 border-t border-border-main px-4 py-2 flex items-center justify-between text-xs text-text-tertiary">
                        <span>{branchRecords.length} employees</span>
                        <div className="flex items-center gap-3">
                          <span>{paidInBranch}/{branchRecords.length} paid</span>
                          <span className="font-semibold text-success">{formatCurrency(branchNet)} net</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            <div className="rounded-xl border border-border-main bg-surface-secondary/50 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-text-primary">{records.length} staff total</span>
              <div className="flex items-center gap-4 font-medium">
                <span className="text-success">{stats.paidCount}/{records.length} paid</span>
                <span className="text-primary">{formatCurrency(stats.totalNet)} net total</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
