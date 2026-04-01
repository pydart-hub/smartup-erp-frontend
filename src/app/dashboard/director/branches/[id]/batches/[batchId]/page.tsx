"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  GraduationCap,
  Loader2,
  AlertCircle,
  IndianRupee,
  Search,
  Download,
  CalendarClock,
  Calendar,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getBatchStudents, getBatchStudentFees } from "@/lib/api/director";
import type { BatchStudentFeeRow } from "@/lib/api/director";
import apiClient from "@/lib/api/client";

function formatCurrency(amount: number): string {
  if (!amount) return "—";
  return "₹" + amount.toLocaleString("en-IN");
}

function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const INSTALMENT_LABELS: Record<string, string> = {
  "1": "One-Time",
  "4": "Quarterly",
  "6": "6 Inst.",
  "8": "8 Inst.",
};

function planBadgeVariant(plan: string | null) {
  switch (plan) {
    case "Advanced":
      return "info" as const;
    case "Intermediate":
      return "warning" as const;
    case "Basic":
      return "outline" as const;
    default:
      return "outline" as const;
  }
}

type PlanFilter = "All" | "Basic" | "Intermediate" | "Advanced";
type StatusFilter = "All" | "Active" | "Discontinued";
type PaymentFilter = "All" | "Fully Paid" | "Partial" | "Unpaid";

function FilterSelect<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-text-secondary whitespace-nowrap">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-8 rounded-lg border border-border-light bg-surface px-2.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

export default function BatchDetailPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.id as string);
  const batchName = decodeURIComponent(params.batchId as string);
  const shortBranch = branchName.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const encodedBranch = encodeURIComponent(branchName);

  const {
    data: batchRes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["director-batch-students", batchName],
    queryFn: () => getBatchStudents(batchName),
    staleTime: 120_000,
  });

  const {
    data: feeData,
    isLoading: feesLoading,
  } = useQuery({
    queryKey: ["director-batch-fees", batchName, branchName],
    queryFn: () => getBatchStudentFees(batchName, branchName),
    staleTime: 120_000,
    enabled: !!batchRes?.students?.length,
  });

  const students = batchRes?.students ?? [];
  const activeStudents = students.filter((s) => s.active);

  // Fetch disabilities for all student IDs
  const studentIds = useMemo(() => students.map((s) => s.student), [students]);
  const { data: disabilityMap = {} } = useQuery({
    queryKey: ["student-disabilities", studentIds],
    queryFn: async () => {
      if (!studentIds.length) return {};
      const { data } = await apiClient.get("/resource/Student", {
        params: {
          fields: JSON.stringify(["name", "custom_disabilities"]),
          filters: JSON.stringify([["name", "in", studentIds]]),
          limit_page_length: studentIds.length,
        },
      });
      const map: Record<string, string> = {};
      for (const s of data.data ?? []) {
        if (s.custom_disabilities) map[s.name] = s.custom_disabilities;
      }
      return map;
    },
    enabled: studentIds.length > 0,
    staleTime: 60_000,
  });

  // Build a lookup map from fee data
  const feeMap = new Map<string, BatchStudentFeeRow>();
  if (feeData) {
    for (const row of feeData) {
      feeMap.set(row.studentId, row);
    }
  }

  // Filter state
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("All");

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        if (
          !(s.student_name ?? "").toLowerCase().includes(q) &&
          !s.student.toLowerCase().includes(q)
        )
          return false;
      }
      // Status
      if (statusFilter === "Active" && !s.active) return false;
      if (statusFilter === "Discontinued" && s.active) return false;
      // Plan
      if (planFilter !== "All") {
        const fee = feeMap.get(s.student);
        if (fee?.plan !== planFilter) return false;
      }
      // Payment
      if (paymentFilter !== "All") {
        const fee = feeMap.get(s.student);
        if (!fee || !fee.totalFee) return paymentFilter === "Unpaid";
        const paid = fee.paidFee;
        const pending = fee.pendingFee;
        if (paymentFilter === "Fully Paid" && pending > 0) return false;
        if (paymentFilter === "Partial" && (paid === 0 || pending === 0)) return false;
        if (paymentFilter === "Unpaid" && paid > 0) return false;
      }
      return true;
    });
  }, [students, feeMap, search, planFilter, statusFilter, paymentFilter]);

  const isFiltered = search || planFilter !== "All" || statusFilter !== "All" || paymentFilter !== "All";

  // Totals for the summary cards
  const totalFee = feeData?.reduce((sum, r) => sum + r.totalFee, 0) ?? 0;
  const totalPaid = feeData?.reduce((sum, r) => sum + r.paidFee, 0) ?? 0;
  const totalPending = feeData?.reduce((sum, r) => sum + r.pendingFee, 0) ?? 0;
  const totalDues = feeData?.reduce((sum, r) => sum + r.duesTillToday, 0) ?? 0;

  function downloadCSV() {
    const headers = ["#", "Student ID", "Name", "Plan", "Joining Date", "Payment", "Sibling Discount", "Total Fee", "Paid", "Pending", "Overdue", "Status"];
    const rows = filteredStudents.map((s, idx) => {
      const fee = feeMap.get(s.student);
      return [
        s.group_roll_number || idx + 1,
        s.student,
        s.student_name || "",
        fee?.plan || "",
        fee?.joiningDate || "",
        fee?.noOfInstalments ? (INSTALMENT_LABELS[fee.noOfInstalments] ?? fee.noOfInstalments) : "",
        fee?.siblingDiscount ? "Yes" : "No",
        fee?.totalFee ?? 0,
        fee?.paidFee ?? 0,
        fee?.pendingFee ?? 0,
        fee?.duesTillToday ?? 0,
        s.active ? "Active" : "Discontinued",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${batchName}-students-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Back */}
      <Link
        href={`/dashboard/director/branches/${encodedBranch}/batches`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Batches
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-[10px] bg-brand-wash flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{batchName}</h1>
            <p className="text-sm text-text-tertiary">{shortBranch}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            {activeStudents.length} active / {students.length} total
          </Badge>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <GraduationCap className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{students.length}</p>
            <p className="text-xs text-text-tertiary">Total Enrolled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{activeStudents.length}</p>
            <p className="text-xs text-text-tertiary">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-error mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">
              {students.length - activeStudents.length}
            </p>
            <p className="text-xs text-text-tertiary">Discontinued</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <IndianRupee className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-lg font-bold text-text-primary">
              {feesLoading ? "…" : formatCurrency(totalFee)}
            </p>
            <p className="text-xs text-text-tertiary">Total Fee</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <IndianRupee className="h-5 w-5 text-success mx-auto mb-2" />
            <p className="text-lg font-bold text-success">
              {feesLoading ? "…" : formatCurrency(totalPaid)}
            </p>
            <p className="text-xs text-text-tertiary">Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <IndianRupee className="h-5 w-5 text-error mx-auto mb-2" />
            <p className="text-lg font-bold text-error">
              {feesLoading ? "…" : formatCurrency(totalPending)}
            </p>
            <p className="text-xs text-text-tertiary">Pending</p>
          </CardContent>
        </Card>
        <Card className={`border-orange-200/60 ${totalDues > 0 ? '' : 'opacity-60'}`}>
          <CardContent className="p-4 text-center">
            <CalendarClock className="h-5 w-5 text-orange-500 mx-auto mb-2" />
            <p className={`text-lg font-bold ${totalDues > 0 ? 'text-orange-600' : 'text-text-tertiary'}`}>
              {feesLoading ? "…" : formatCurrency(totalDues)}
            </p>
            <p className="text-xs text-text-tertiary">Overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load batch students</p>
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-text-tertiary">No students enrolled in this batch</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>
                Enrolled Students
                {isFiltered && (
                  <span className="text-sm font-normal text-text-tertiary ml-2">
                    ({filteredStudents.length} of {students.length})
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                  <Input
                    placeholder="Search students..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadCSV}
                  disabled={filteredStudents.length === 0 || feesLoading}
                  title="Download CSV report"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1.5">Download</span>
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <FilterSelect
                label="Plan"
                options={["All", "Basic", "Intermediate", "Advanced"] as PlanFilter[]}
                value={planFilter}
                onChange={setPlanFilter}
              />
              <FilterSelect
                label="Status"
                options={["All", "Active", "Discontinued"] as StatusFilter[]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <FilterSelect
                label="Payment"
                options={["All", "Fully Paid", "Partial", "Unpaid"] as PaymentFilter[]}
                value={paymentFilter}
                onChange={setPaymentFilter}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredStudents.length === 0 ? (
              <p className="text-center text-sm text-text-tertiary py-8">
                No students match the current filters.
              </p>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light bg-app-bg">
                    <th className="text-left px-4 py-3 font-medium text-text-secondary w-12">
                      #
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">
                      Student ID
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">
                      Name
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-text-secondary">
                      Plan
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">
                      Joined
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-text-secondary">
                      Payment
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-text-secondary">
                      Offers
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-text-secondary">
                      Total Fee
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-text-secondary">
                      Paid
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-text-secondary">
                      Pending
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-orange-500">
                      Overdue
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-text-secondary">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, idx) => {
                    const fee = feeMap.get(s.student);
                    return (
                      <tr
                        key={s.student}
                        className="border-b border-border-light last:border-0 hover:bg-app-bg/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-text-tertiary">
                          {s.group_roll_number || idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-text-secondary">
                            {s.student}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-text-primary">
                          {s.student_name}
                          {disabilityMap[s.student] && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">{disabilityMap[s.student]}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {feesLoading ? (
                            <span className="text-text-tertiary text-xs">…</span>
                          ) : fee?.plan ? (
                            <Badge
                              variant={planBadgeVariant(fee.plan)}
                              className="text-[10px]"
                            >
                              {fee.plan}
                            </Badge>
                          ) : (
                            <span className="text-text-tertiary text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                          {feesLoading ? "…" : (
                            fee?.joiningDate ? (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-text-tertiary" />
                                {formatShortDate(fee.joiningDate)}
                              </span>
                            ) : "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {feesLoading ? (
                            <span className="text-text-tertiary text-xs">…</span>
                          ) : fee?.noOfInstalments ? (
                            <Badge
                              variant={fee.noOfInstalments === "1" ? "success" : "outline"}
                              className="text-[10px]"
                            >
                              {INSTALMENT_LABELS[fee.noOfInstalments] ?? `${fee.noOfInstalments} Inst.`}
                            </Badge>
                          ) : (
                            <span className="text-text-tertiary text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {feesLoading ? (
                            <span className="text-text-tertiary text-xs">…</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              {fee?.noOfInstalments === "1" && (
                                <Badge variant="success" className="text-[10px]">Early Bird</Badge>
                              )}
                              {fee?.siblingDiscount && (
                                <Badge variant="info" className="text-[10px]">Sibling</Badge>
                              )}
                              {fee?.noOfInstalments !== "1" && !fee?.siblingDiscount && (
                                <span className="text-text-tertiary text-xs">—</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {feesLoading ? "…" : formatCurrency(fee?.totalFee ?? 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-success">
                          {feesLoading ? "…" : formatCurrency(fee?.paidFee ?? 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-error">
                          {feesLoading
                            ? "…"
                            : fee?.pendingFee
                            ? formatCurrency(fee.pendingFee)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {feesLoading
                            ? "…"
                            : fee?.duesTillToday
                            ? <span className="text-orange-600 font-semibold">{formatCurrency(fee.duesTillToday)}</span>
                            : <span className="text-text-tertiary">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={s.active ? "success" : "error"}
                            className="text-[10px]"
                          >
                            {s.active ? "Active" : "Discontinued"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
