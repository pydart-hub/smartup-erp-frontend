"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  UserPlus, Search, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, Loader2, AlertCircle,
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
import { useFeatureFlagsStore } from "@/lib/stores/featureFlagsStore";
import { useAuth } from "@/lib/hooks/useAuth";

const PAGE_SIZE = 25;

type StatusFilter = "all" | "active" | "inactive";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function getEnabledParam(f: StatusFilter): 0 | 1 | undefined {
  if (f === "active") return 1;
  if (f === "inactive") return 0;
  return undefined;
}

// Fetch program enrollment map for a list of student IDs (one API call via "in" filter)
async function fetchEnrollmentMap(
  studentIds: string[]
): Promise<Record<string, { program: string; student_batch_name?: string }>> {
  if (!studentIds.length) return {};
  const { data } = await apiClient.get("/resource/Program Enrollment", {
    params: {
      filters: JSON.stringify([
        ["student", "in", studentIds],
        ["docstatus", "=", 1],
      ]),
      fields: JSON.stringify(["student", "program", "student_batch_name"]),
      order_by: "enrollment_date desc",
      limit_page_length: studentIds.length * 3, // allow multiple enrollments per student
    },
  });
  // Keep only the latest enrollment per student
  const map: Record<string, { program: string; student_batch_name?: string }> = {};
  for (const row of (data.data ?? [])) {
    if (!map[row.student]) {
      map[row.student] = { program: row.program, student_batch_name: row.student_batch_name };
    }
  }
  return map;
}

export default function StudentsPage() {
  const { flags } = useFeatureFlagsStore();
  const { defaultCompany } = useAuth();
  if (!flags.students) return null;

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");          // debounced
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);

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
  const { data: enrollmentMap = {} } = useQuery({
    queryKey: ["enrollment-map", studentIds],
    queryFn: () => fetchEnrollmentMap(studentIds),
    enabled: studentIds.length > 0,
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
        {flags.students_create && (
          <Link href="/dashboard/branch-manager/students/new">
            <Button variant="primary" size="md">
              <UserPlus className="h-4 w-4" />
              Add Student
            </Button>
          </Link>
        )}
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
                      return (
                        <motion.tr
                          key={student.name}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="border-b border-border-light hover:bg-brand-wash/30 transition-colors"
                        >
                          {/* Student name + ID */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {initials(student.student_name || student.first_name || "?")}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-text-primary truncate">
                                  {student.student_name}
                                </p>
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

                          {/* Status: enabled 1 = Active, 0 = Inactive */}
                          <td className="px-5 py-3">
                            <Badge variant={student.enabled === 1 ? "success" : "default"}>
                              {student.enabled === 1 ? "Active" : "Inactive"}
                            </Badge>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {flags.students_view && (
                                <Link href={`/dashboard/branch-manager/students/${student.name}`}>
                                  <button className="w-8 h-8 rounded-[8px] flex items-center justify-center text-text-tertiary hover:bg-app-bg hover:text-primary transition-colors">
                                    <Eye className="h-4 w-4" />
                                  </button>
                                </Link>
                              )}
                              {flags.students_edit && (
                                <Link href={`/dashboard/branch-manager/students/${student.name}/edit`}>
                                  <button className="w-8 h-8 rounded-[8px] flex items-center justify-center text-text-tertiary hover:bg-app-bg hover:text-info transition-colors">
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                </Link>
                              )}
                              <button className="w-8 h-8 rounded-[8px] flex items-center justify-center text-text-tertiary hover:bg-error-light hover:text-error transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </button>
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
    </motion.div>
  );
}
