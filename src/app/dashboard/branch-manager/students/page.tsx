"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus, Search, Eye, Pencil, Trash2, ArrowRightLeft,
  ChevronLeft, ChevronRight, Loader2, AlertCircle,
  X, AlertTriangle, UserX, CircleCheck, Star,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getStudents } from "@/lib/api/students";
import apiClient from "@/lib/api/client";
import type { Student } from "@/lib/types/student";
import { useAuth } from "@/lib/hooks/useAuth";
import { TransferRequestModal } from "@/components/transfers/TransferRequestModal";
import { DiscontinueStudentModal } from "@/components/students/DiscontinueStudentModal";
import { DisabilityBadge } from "@/components/ui/DisabilityBadge";
// Academic year store not needed — students list always shows latest enrollment

const PAGE_SIZE = 25;

type StatusFilter = "all" | "active" | "inactive" | "discontinued";

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

function getExtraFilters(f: StatusFilter): string[][] {
  if (f === "discontinued") return [["custom_discontinuation_date", "is", "set"]];
  return [];
}

// Fetch program enrollment map for a list of student IDs (one API call via "in" filter)
async function fetchEnrollmentMap(
  studentIds: string[],
  academic_year?: string
): Promise<Record<string, { program: string; student_batch_name?: string; custom_fee_structure?: string; custom_plan?: string }>> {
  if (!studentIds.length) return {};
  const enrollFilters: (string | number | string[])[][] = [
    ["student", "in", studentIds],
    ["docstatus", "=", 1],
  ];
  if (academic_year) enrollFilters.push(["academic_year", "=", academic_year]);
  const { data } = await apiClient.get("/resource/Program Enrollment", {
    params: {
      filters: JSON.stringify(enrollFilters),
      fields: JSON.stringify(["student", "program", "student_batch_name", "custom_fee_structure", "custom_plan"]),
      order_by: "enrollment_date desc",
      limit_page_length: studentIds.length * 3, // allow multiple enrollments per student
    },
  });
  // Keep only the latest enrollment per student
  const map: Record<string, { program: string; student_batch_name?: string; custom_fee_structure?: string; custom_plan?: string }> = {};
  for (const row of (data.data ?? [])) {
    if (!map[row.student]) {
      map[row.student] = { program: row.program, student_batch_name: row.student_batch_name, custom_fee_structure: row.custom_fee_structure, custom_plan: row.custom_plan };
    }
  }
  return map;
}

// Fetch outstanding totals per customer (to detect "fully paid")
async function fetchOutstandingMap(
  customers: string[]
): Promise<Record<string, number>> {
  if (!customers.length) return {};
  const { data } = await apiClient.get("/resource/Sales Invoice", {
    params: {
      fields: JSON.stringify(["customer", "sum(outstanding_amount) as total_out"]),
      filters: JSON.stringify([["docstatus", "=", 1], ["customer", "in", customers]]),
      group_by: "customer",
      limit_page_length: customers.length,
    },
  });
  const map: Record<string, number> = {};
  for (const row of data.data ?? []) {
    map[row.customer] = row.total_out ?? 0;
  }
  return map;
}

export default function StudentsPage() {
  const { defaultCompany } = useAuth();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");          // debounced
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Transfer state
  const [transferTarget, setTransferTarget] = useState<Student | null>(null);

  // Discontinue state
  const [discontinueTarget, setDiscontinueTarget] = useState<Student | null>(null);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/admin/delete-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: deleteTarget.name }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 207) {
        setDeleteError(data.error || "Failed to delete student");
        return;
      }
      if (data.failed?.length > 0) {
        setDeleteError(`Partially deleted. ${data.failed.length} step(s) failed: ${data.failed.map((f: { step: string }) => f.step).join(", ")}`);
        // Keep modal open so user sees the error, but still refresh the list
        queryClient.invalidateQueries({ queryKey: ["students"] });
        queryClient.invalidateQueries({ queryKey: ["enrollment-map"] });
        return;
      }
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["enrollment-map"] });
    } catch {
      setDeleteError("Network error — please try again.");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, queryClient]);

  // Debounce search input (400 ms)
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset page when filter changes
  useEffect(() => { setPage(0); }, [statusFilter]);

  // ── Query 1: students (filtered by branch) ──────────────────
  const { data: studentsRes, isLoading, isError, error } = useQuery({
    queryKey: ["students", search, statusFilter, page, defaultCompany],
    queryFn: () =>
      getStudents({
        search: search || undefined,
        enabled: getEnabledParam(statusFilter),
        extraFilters: getExtraFilters(statusFilter),
        limit_start: page * PAGE_SIZE,
        limit_page_length: PAGE_SIZE,
        order_by: "student_name asc",
        ...(defaultCompany ? { custom_branch: defaultCompany } : {}),
      }),
    staleTime: 30_000,
  });

  const students: Student[] = studentsRes?.data ?? [];
  const hasMore = students.length === PAGE_SIZE;

  // ── Query 2: program enrollments for current page ──────────
  const studentIds = students.map((s) => s.name);
  // Don't filter by academic year — always show the latest enrollment's Class/Batch/Fee Plan
  const { data: enrollmentMap = {} } = useQuery({
    queryKey: ["enrollment-map", studentIds],
    queryFn: () => fetchEnrollmentMap(studentIds),
    enabled: studentIds.length > 0,
    staleTime: 60_000,
  });
  // ── Query 3: outstanding amounts per student ────────────────
  const customerIds = students.map((s) => s.customer).filter(Boolean) as string[];
  const { data: outstandingMap = {} } = useQuery({
    queryKey: ["outstanding-map", customerIds],
    queryFn: () => fetchOutstandingMap(customerIds),
    enabled: customerIds.length > 0,
    staleTime: 60_000,
  });
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Students</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {isLoading ? "Loading…" : `${page * PAGE_SIZE + students.length} students shown`}
          </p>
        </div>
        <Link href="/dashboard/branch-manager/new-admission">
            <Button variant="primary" size="md">
              <UserPlus className="h-4 w-4" />
              Add Student
            </Button>
          </Link>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search by name…"
                leftIcon={<Search className="h-4 w-4" />}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
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

      {/* Students Table */}
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
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Class</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Batch</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Branch</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Mobile</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Joined</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Status</th>
                  <th className="text-right px-5 py-3 font-semibold text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-border-light">
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-5 py-3">
                            <Skeleton className="h-4 w-full rounded" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : students.length === 0
                  ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-16 text-center text-text-tertiary text-sm">
                          No students found{search ? ` matching "${search}"` : ""}.
                        </td>
                      </tr>
                    )
                  : students.map((student, index) => {
                      const enr = enrollmentMap[student.name];
                      const outstanding = student.customer ? (outstandingMap[student.customer] ?? null) : null;
                      const isFullyPaid = outstanding !== null && outstanding <= 0;
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
                                  {isFullyPaid && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0 gap-0.5 border-green-300 text-green-600"
                                    >
                                      <CircleCheck className="h-2.5 w-2.5" />
                                      Fully Paid
                                    </Badge>
                                  )}
                                  <DisabilityBadge disabilities={student.custom_disabilities} />
                                </div>
                                <p className="text-xs text-text-tertiary truncate">{student.name}</p>
                              </div>
                            </div>
                          </td>

                          {/* Class from enrollment */}
                          <td className="px-5 py-3 text-text-secondary">
                            {enr?.program ?? <span className="text-text-tertiary text-xs">—</span>}
                          </td>

                          {/* Batch code */}
                          <td className="px-5 py-3 text-text-secondary">
                            {enr?.student_batch_name ?? <span className="text-text-tertiary text-xs">—</span>}
                          </td>

                          {/* Branch */}
                          <td className="px-5 py-3 text-text-secondary text-xs">
                            {student.custom_branch
                              ? student.custom_branch.replace("Smart Up ", "")
                              : <span className="text-text-tertiary">—</span>}
                          </td>

                          {/* Mobile */}
                          <td className="px-5 py-3 text-text-secondary">
                            {student.student_mobile_number || <span className="text-text-tertiary text-xs">—</span>}
                          </td>

                          {/* Joined date */}
                          <td className="px-5 py-3 text-text-secondary text-xs">
                            {student.joining_date ?? <span className="text-text-tertiary">—</span>}
                          </td>

                          {/* Status: enabled 1 = Active, 0 = Inactive/Discontinued */}
                          <td className="px-5 py-3">
                            <Badge variant={
                              student.enabled === 1 ? "success"
                              : student.custom_discontinuation_date ? "error"
                              : "default"
                            }>
                              {student.enabled === 1 ? "Active" : student.custom_discontinuation_date ? "Discontinued" : "Inactive"}
                            </Badge>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/dashboard/branch-manager/students/${student.name}`}>
                                  <button className="w-8 h-8 rounded-[8px] flex items-center justify-center text-text-tertiary hover:bg-app-bg hover:text-primary transition-colors">
                                    <Eye className="h-4 w-4" />
                                  </button>
                                </Link>
                              <Link href={`/dashboard/branch-manager/students/${student.name}/edit`}>
                                  <button className="w-8 h-8 rounded-[8px] flex items-center justify-center text-text-tertiary hover:bg-app-bg hover:text-info transition-colors">
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                </Link>
                              <button
                                onClick={() => { setDeleteError(null); setDeleteTarget(student); }}
                                className="w-8 h-8 rounded-[8px] flex items-center justify-center text-text-tertiary hover:bg-error-light hover:text-error transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setTransferTarget(student)}
                                title="Transfer to another branch"
                                className="w-8 h-8 rounded-[8px] flex items-center justify-center text-text-tertiary hover:bg-primary-light hover:text-primary transition-colors"
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                              </button>
                              {student.enabled === 1 && (
                                <button
                                  onClick={() => setDiscontinueTarget(student)}
                                  title="Discontinue student"
                                  className="w-8 h-8 rounded-[8px] flex items-center justify-center text-text-tertiary hover:bg-warning/10 hover:text-warning transition-colors"
                                >
                                  <UserX className="h-4 w-4" />
                                </button>
                              )}
                            </div>
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-error/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-error" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Delete Student</h3>
                    <p className="text-sm text-text-secondary">This action cannot be undone</p>
                  </div>
                </div>
                <button
                  onClick={() => !deleting && setDeleteTarget(null)}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="bg-error/5 border border-error/20 rounded-xl p-4 mb-5">
                <p className="text-sm text-text-primary mb-2">
                  You are about to permanently delete:
                </p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-bold">
                    {initials(deleteTarget.student_name || deleteTarget.first_name || "?")}
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{deleteTarget.student_name}</p>
                    <p className="text-xs text-text-tertiary">{deleteTarget.name}</p>
                  </div>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  This will also delete all related records: enrollments, batch memberships,
                  sales orders, invoices, payments, and the linked customer record.
                </p>
              </div>

              {/* Error */}
              {deleteError && (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-4 text-sm text-warning">
                  {deleteError}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="!bg-error hover:!bg-error/90 !text-white gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete Student
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer Modal */}
      {transferTarget && transferTarget.custom_branch && (
        <TransferRequestModal
          student={transferTarget as Student & { custom_branch: string }}
          onClose={() => setTransferTarget(null)}
          onSuccess={() => {
            setTransferTarget(null);
            queryClient.invalidateQueries({ queryKey: ["students"] });
          }}
        />
      )}

      {/* Discontinue Modal */}
      {discontinueTarget && (
        <DiscontinueStudentModal
          student={discontinueTarget}
          onClose={() => setDiscontinueTarget(null)}
          onSuccess={() => {
            setDiscontinueTarget(null);
            queryClient.invalidateQueries({ queryKey: ["students"] });
            queryClient.invalidateQueries({ queryKey: ["enrollment-map"] });
          }}
        />
      )}
    </motion.div>
  );
}
