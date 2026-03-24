"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  School,
  Loader2,
  RefreshCw,
  User,
  Search,
  IndianRupee,
  Download,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getBatch } from "@/lib/api/batches";
import { getBatchStudentFees } from "@/lib/api/director";
import type { BatchStudentFeeRow } from "@/lib/api/director";
import type { Batch, BatchStudent } from "@/lib/types/batch";
import { useAuthStore } from "@/lib/stores/authStore";
import apiClient from "@/lib/api/client";

function formatCurrency(amount: number): string {
  if (!amount) return "—";
  return "₹" + amount.toLocaleString("en-IN");
}

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
type StatusFilter = "All" | "Active" | "Inactive";
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
  const { id } = useParams<{ id: string }>();
  const decodedId = decodeURIComponent(id);
  const branchName = useAuthStore((s) => s.defaultCompany);

  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("All");

  // Fee data
  const [feeRows, setFeeRows] = useState<BatchStudentFeeRow[]>([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [disabilityMap, setDisabilityMap] = useState<Record<string, string>>({});

  function loadBatch() {
    setLoading(true);
    setError(null);
    getBatch(decodedId)
      .then((res) => setBatch(res.data))
      .catch(() => setError("Failed to load batch details."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadBatch();
  }, [decodedId]);

  // Fetch fee data when batch loads
  useEffect(() => {
    if (!batch?.students?.length || !branchName) return;
    setFeesLoading(true);
    getBatchStudentFees(decodedId, branchName)
      .then((rows) => setFeeRows(rows))
      .catch(() => setFeeRows([]))
      .finally(() => setFeesLoading(false));
  }, [batch, branchName, decodedId]);

  // Fetch disabilities for students
  useEffect(() => {
    const ids = batch?.students?.map((s) => s.student) ?? [];
    if (!ids.length) return;
    apiClient
      .get("/resource/Student", {
        params: {
          fields: JSON.stringify(["name", "custom_disabilities"]),
          filters: JSON.stringify([["name", "in", ids]]),
          limit_page_length: ids.length,
        },
      })
      .then(({ data }) => {
        const map: Record<string, string> = {};
        for (const s of data.data ?? []) {
          if (s.custom_disabilities) map[s.name] = s.custom_disabilities;
        }
        setDisabilityMap(map);
      })
      .catch(() => {});
  }, [batch]);

  const students: BatchStudent[] = batch?.students ?? [];
  const activeStudents = students.filter((s) => s.active !== 0);

  // Fee lookup map
  const feeMap = useMemo(() => {
    const m = new Map<string, BatchStudentFeeRow>();
    for (const r of feeRows) m.set(r.studentId, r);
    return m;
  }, [feeRows]);

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
      if (statusFilter === "Active" && s.active === 0) return false;
      if (statusFilter === "Inactive" && s.active !== 0) return false;
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

  // Fee totals
  const totalFee = feeRows.reduce((sum, r) => sum + r.totalFee, 0);
  const totalPaid = feeRows.reduce((sum, r) => sum + r.paidFee, 0);
  const totalPending = feeRows.reduce((sum, r) => sum + r.pendingFee, 0);

  const backHref = batch?.program
    ? `/dashboard/branch-manager/batches?program=${encodeURIComponent(batch.program)}`
    : "/dashboard/branch-manager/batches";

  function downloadCSV() {
    const headers = ["#", "Student ID", "Name", "Plan", "Total Fee", "Paid", "Pending", "Status"];
    const rows = filteredStudents.map((student, index) => {
      const fee = feeMap.get(student.student);
      return [
        index + 1,
        student.student,
        student.student_name || "",
        fee?.plan || "",
        fee?.totalFee ?? 0,
        fee?.paidFee ?? 0,
        fee?.pendingFee ?? 0,
        student.active === 1 ? "Active" : "Inactive",
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
    link.download = `${decodedId}-students-report.csv`;
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

      {/* Back link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Batches
      </Link>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <p className="text-error text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={loadBatch}>
            Retry
          </Button>
        </div>
      )}

      {batch && !loading && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                {batch.student_group_name}
              </h1>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-text-secondary">
                {batch.program && (
                  <span className="flex items-center gap-1">
                    <School className="h-3.5 w-3.5" />
                    {batch.program}
                  </span>
                )}
                {batch.academic_year && <span>{batch.academic_year}</span>}
                {batch.custom_branch && (
                  <span className="text-text-tertiary">{batch.custom_branch}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={batch.disabled ? "error" : "success"}>
                {batch.disabled ? "Disabled" : "Active"}
              </Badge>
              <Button
                variant="outline"
                size="md"
                onClick={loadBatch}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-text-secondary">Total Students</p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  {students.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-text-secondary">Active</p>
                <p className="text-2xl font-bold text-success mt-1">
                  {activeStudents.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-text-secondary">Inactive</p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  {students.length - activeStudents.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-text-secondary">Total Fee</p>
                <p className="text-lg font-bold text-text-primary mt-1">
                  {feesLoading ? "…" : formatCurrency(totalFee)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-text-secondary">Paid</p>
                <p className="text-lg font-bold text-success mt-1">
                  {feesLoading ? "…" : formatCurrency(totalPaid)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-text-secondary">Pending</p>
                <p className="text-lg font-bold text-error mt-1">
                  {feesLoading ? "…" : formatCurrency(totalPending)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Students Table */}
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Students
                  {isFiltered && (
                    <span className="text-sm font-normal text-text-tertiary">
                      ({filteredStudents.length} of {students.length})
                    </span>
                  )}
                  {!isFiltered && (
                    <span className="text-sm font-normal text-text-tertiary">
                      ({students.length})
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
                  options={["All", "Active", "Inactive"] as StatusFilter[]}
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
            <CardContent>
              {filteredStudents.length === 0 ? (
                <p className="text-center text-text-secondary text-sm py-8">
                  {isFiltered ? "No students match the current filters." : "No students in this batch."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-light">
                        <th className="text-left pb-3 font-semibold text-text-secondary w-12">
                          #
                        </th>
                        <th className="text-left pb-3 font-semibold text-text-secondary">
                          Student ID
                        </th>
                        <th className="text-left pb-3 font-semibold text-text-secondary">
                          Name
                        </th>
                        <th className="text-center pb-3 font-semibold text-text-secondary">
                          Plan
                        </th>
                        <th className="text-right pb-3 font-semibold text-text-secondary">
                          Total Fee
                        </th>
                        <th className="text-right pb-3 font-semibold text-text-secondary">
                          Paid
                        </th>
                        <th className="text-right pb-3 font-semibold text-text-secondary">
                          Pending
                        </th>
                        <th className="text-center pb-3 font-semibold text-text-secondary">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student, index) => {
                        const fee = feeMap.get(student.student);
                        return (
                        <motion.tr
                          key={student.student}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(index * 0.02, 0.5) }}
                          className="border-b border-border-light hover:bg-brand-wash/30 transition-colors"
                        >
                          <td className="py-2.5 text-text-tertiary">
                            {index + 1}
                          </td>
                          <td className="py-2.5">
                            <Link
                              href={`/dashboard/branch-manager/students/${encodeURIComponent(student.student)}`}
                              className="text-primary hover:underline font-medium"
                            >
                              {student.student}
                            </Link>
                          </td>
                          <td className="py-2.5 font-medium text-text-primary flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-text-tertiary flex-shrink-0" />
                            {student.student_name || "—"}
                            {disabilityMap[student.student] && (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">{disabilityMap[student.student]}</span>
                            )}
                          </td>
                          <td className="py-2.5 text-center">
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
                          <td className="py-2.5 text-right font-mono text-xs">
                            {feesLoading ? "…" : formatCurrency(fee?.totalFee ?? 0)}
                          </td>
                          <td className="py-2.5 text-right font-mono text-xs text-success">
                            {feesLoading ? "…" : formatCurrency(fee?.paidFee ?? 0)}
                          </td>
                          <td className="py-2.5 text-right font-mono text-xs text-error">
                            {feesLoading
                              ? "…"
                              : fee?.pendingFee
                              ? formatCurrency(fee.pendingFee)
                              : "—"}
                          </td>
                          <td className="py-2.5 text-center">
                            <Badge
                              variant={
                                student.active === 1 ? "success" : "error"
                              }
                            >
                              {student.active === 1 ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                        </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </motion.div>
  );
}
