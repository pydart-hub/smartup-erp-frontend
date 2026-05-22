"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Search, GraduationCap, Users, School, ChevronLeft, ChevronRight,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getBatches } from "@/lib/api/batches";
import { getStudentsPost, getStudentGroupMembers } from "@/lib/api/students";
import type { Student } from "@/lib/types/student";
import type { Batch } from "@/lib/types/batch";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAcademicYearStore } from "@/lib/stores/academicYearStore";

const PAGE_SIZE = 25;

export default function ClassInchargeStudentsPage() {
  const { defaultCompany } = useAuth();
  const { selectedYear } = useAcademicYearStore();

  const [search, setSearch] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [page, setPage] = useState(1);

  // ── Batches for filter dropdown ──
  const { data: batchesRes } = useQuery({
    queryKey: ["ci-batches-list", defaultCompany, selectedYear],
    queryFn: () =>
      getBatches({
        limit_page_length: 500,
        ...(defaultCompany ? { custom_branch: defaultCompany } : {}),
        academic_year: selectedYear,
      }),
    staleTime: 5 * 60_000,
    enabled: !!defaultCompany,
  });
  const batches = (batchesRes?.data ?? []).filter((b: Batch) => !b.disabled);

  // ── Batch members (student IDs) when a specific batch is selected ──
  const { data: batchMemberIds = [] } = useQuery({
    queryKey: ["ci-batch-members", selectedBatch],
    queryFn: () => getStudentGroupMembers(selectedBatch),
    staleTime: 5 * 60_000,
    enabled: selectedBatch !== "all",
  });

  // ── Students ──
  const { data: studentsRes, isLoading } = useQuery({
    queryKey: ["ci-students", defaultCompany, selectedYear, selectedBatch, batchMemberIds],
    queryFn: () =>
      getStudentsPost({
        limit_page_length: 500,
        custom_branch: defaultCompany || undefined,
        ...(selectedBatch !== "all" && batchMemberIds.length > 0
          ? { extraFilters: [["name", "in", batchMemberIds]] }
          : {}),
      }),
    staleTime: 5 * 60_000,
    enabled: !!defaultCompany && (selectedBatch === "all" || batchMemberIds.length > 0),
  });
  const allStudents: Student[] = studentsRes?.data ?? [];

  // ── Client-side search + pagination ──
  const filtered = useMemo(() => {
    if (!search.trim()) return allStudents;
    const q = search.toLowerCase();
    return allStudents.filter(
      (s) =>
        s.student_name?.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q)
    );
  }, [allStudents, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function onSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Students
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {defaultCompany} — {filtered.length} student{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Search + batch filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search by name or ID…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={selectedBatch}
          onChange={(e) => { setSelectedBatch(e.target.value); setPage(1); }}
          className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary"
        >
          <option value="all">All Batches</option>
          {batches.map((b: Batch) => (
            <option key={b.name} value={b.name}>{b.student_group_name ?? b.name}</option>
          ))}
        </select>
      </div>

      {/* Student list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-[12px]" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-10 w-10 mx-auto mb-3 text-text-tertiary" />
          <p className="font-medium text-text-secondary">No students found</p>
          {search && <p className="text-xs text-text-tertiary mt-1">Try a different search term</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((student, index) => (
            <motion.div
              key={student.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand-wash flex items-center justify-center shrink-0">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary truncate">{student.student_name}</p>
                    <p className="text-xs text-text-tertiary font-mono">{student.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {student.custom_branch_abbr && (
                      <Badge variant="info" className="text-[10px]">{student.custom_branch_abbr}</Badge>
                    )}
                    <Badge
                      variant={student.enabled ? "success" : "error"}
                      className="text-[10px]"
                    >
                      {student.enabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-text-secondary">
            Page {page} of {totalPages} — {filtered.length} students
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-[8px] border border-border-input disabled:opacity-40 hover:bg-surface transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-[8px] border border-border-input disabled:opacity-40 hover:bg-surface transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
