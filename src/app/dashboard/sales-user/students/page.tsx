"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Eye, ChevronLeft, ChevronRight, Loader2, AlertCircle, Building2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getStudents } from "@/lib/api/students";
import { getAllBranches, getActiveStudentCountForBranch } from "@/lib/api/director";
import apiClient from "@/lib/api/client";
import type { Student } from "@/lib/types/student";
import { useAuth } from "@/lib/hooks/useAuth";

const PAGE_SIZE = 25;

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// Fetch program enrollment map for a list of student IDs
async function fetchEnrollmentMap(
  studentIds: string[],
): Promise<Record<string, { program: string; student_batch_name?: string; custom_fee_structure?: string; custom_plan?: string }>> {
  if (!studentIds.length) return {};
  const enrollFilters: (string | number | string[])[][] = [
    ["student", "in", studentIds],
    ["docstatus", "=", 1],
  ];
  const { data } = await apiClient.get("/resource/Program Enrollment", {
    params: {
      filters: JSON.stringify(enrollFilters),
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

export default function SalesUserStudentsPage() {
  const { defaultCompany } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Students list (active only, branch-scoped) ───────────
  const { data: studentsRes, isLoading, isError, error } = useQuery({
    queryKey: ["sales-students", search, page, defaultCompany],
    queryFn: () =>
      getStudents({
        search: search || undefined,
        enabled: 1,
        limit_start: page * PAGE_SIZE,
        limit_page_length: PAGE_SIZE,
        order_by: "creation desc",
        ...(defaultCompany ? { custom_branch: defaultCompany } : {}),
      }),
    staleTime: 30_000,
  });

  const students: Student[] = studentsRes?.data ?? [];
  const hasMore = students.length === PAGE_SIZE;

  // ── Branch-wise counts ───────────────────────────────────
  const { data: allBranches = [] } = useQuery({
    queryKey: ["sales-students-branches"],
    queryFn: getAllBranches,
    staleTime: 300_000,
  });

  const { data: branchCounts = [] } = useQuery({
    queryKey: ["sales-students-branch-counts", allBranches.map((b) => b.name)],
    queryFn: () => Promise.all(allBranches.map((b) => getActiveStudentCountForBranch(b.name))),
    enabled: allBranches.length > 0,
    staleTime: 120_000,
  });

  // ── Enrollment data ──────────────────────────────────────
  const studentIds = students.map((s) => s.name);
  const { data: enrollmentMap = {} } = useQuery({
    queryKey: ["sales-enrollment-map", studentIds],
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
      </div>

      {/* Branch-wise counts */}
      {allBranches.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {allBranches.map((branch, i) => {
            const count = branchCounts[i];
            const isOwn = branch.name === defaultCompany;
            const shortName = branch.name.replace("Smart Up ", "").replace("Smart Up", "HQ");
            return (
              <motion.div
                key={branch.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className={isOwn ? "ring-2 ring-primary ring-offset-1" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="w-8 h-8 rounded-[8px] bg-brand-wash flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      {isOwn && (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full leading-none">
                          Mine
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-bold text-text-primary tabular-nums">
                      {count == null ? <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" /> : count}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5 leading-tight">{shortName}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search by name…"
            leftIcon={<Search className="h-4 w-4" />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
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
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Fee Plan</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Mobile</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Joined</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Status</th>
                  <th className="text-right px-5 py-3 font-semibold text-text-secondary">View</th>
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
                          <td className="px-5 py-3 text-text-secondary">
                            {enr?.program ?? <span className="text-text-tertiary text-xs">—</span>}
                          </td>
                          <td className="px-5 py-3 text-text-secondary">
                            {enr?.student_batch_name ?? <span className="text-text-tertiary text-xs">—</span>}
                          </td>
                          <td className="px-5 py-3 text-text-secondary text-xs">
                            {enr?.custom_plan
                              ? <span>{enr.custom_plan}</span>
                              : <span className="text-text-tertiary">—</span>}
                          </td>
                          <td className="px-5 py-3 text-text-secondary">
                            {student.student_mobile_number || <span className="text-text-tertiary text-xs">—</span>}
                          </td>
                          <td className="px-5 py-3 text-text-secondary text-xs">
                            {student.joining_date ?? <span className="text-text-tertiary">—</span>}
                          </td>
                          <td className="px-5 py-3">
                            <Badge variant={student.enabled === 1 ? "success" : "default"}>
                              {student.enabled === 1 ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end">
                              <Link href={`/dashboard/sales-user/students/${student.name}`}>
                                <button className="w-8 h-8 rounded-[8px] flex items-center justify-center text-text-tertiary hover:bg-app-bg hover:text-primary transition-colors">
                                  <Eye className="h-4 w-4" />
                                </button>
                              </Link>
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
