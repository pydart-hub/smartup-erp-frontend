"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus, Search, Eye, Pencil, Trash2, ArrowRightLeft,
  ChevronLeft, ChevronRight, Loader2, AlertCircle,
  X, AlertTriangle, UserX, CircleCheck, Star,
  ArrowUpDown, Filter, ChevronDown,
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
type PlanFilter = "all" | "Advanced" | "Intermediate" | "Basic";
type TypeFilter = "all" | "Fresher" | "Existing" | "Rejoining" | "Demo";
type SortOption = "name_asc" | "name_desc" | "newest" | "oldest";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "discontinued", label: "Discontinued" },
];

const PLAN_OPTIONS: { value: PlanFilter; label: string }[] = [
  { value: "all", label: "All Plans" },
  { value: "Advanced", label: "Advanced" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Basic", label: "Basic" },
];

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "Fresher", label: "Fresher" },
  { value: "Existing", label: "Existing" },
  { value: "Rejoining", label: "Rejoining" },
  { value: "Demo", label: "Demo" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
];

function getSortOrderBy(s: SortOption): string {
  switch (s) {
    case "name_asc": return "student_name asc";
    case "name_desc": return "student_name desc";
    case "newest": return "joining_date desc";
    case "oldest": return "joining_date asc";
  }
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function getEnabledParam(f: StatusFilter): 0 | 1 | undefined {
  if (f === "active") return 1;
  if (f === "inactive") return 0;
  if (f === "discontinued") return 0;
  return undefined;
}

function getExtraFilters(f: StatusFilter): (string | string[])[][] {
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

// Fetch parent (Guardian) mobile numbers for a list of student IDs.
// Step 1: fetch guardian IDs per student via dot-notation on Student list.
// Step 2: batch-fetch Guardian docs by ID to get mobile_number.
async function fetchParentMobileMap(
  studentIds: string[]
): Promise<Record<string, string>> {
  if (!studentIds.length) return {};

  // Step 1: get guardian ID for each student
  const step1 = await apiClient.get("/resource/Student", {
    params: {
      filters: JSON.stringify([["name", "in", studentIds]]),
      fields: JSON.stringify(["name", "guardians.guardian"]),
      limit_page_length: studentIds.length * 3,
    },
  });
  const rows: { name: string; guardian?: string }[] = step1.data.data ?? [];

  // Build student → guardianId map & collect unique guardian IDs
  const studentToGuardian: Record<string, string> = {};
  const guardianIds: string[] = [];
  for (const row of rows) {
    if (row.name && row.guardian && !studentToGuardian[row.name]) {
      studentToGuardian[row.name] = row.guardian;
      if (!guardianIds.includes(row.guardian)) guardianIds.push(row.guardian);
    }
  }
  if (!guardianIds.length) return {};

  // Step 2: fetch Guardian docs to get mobile_number
  const step2 = await apiClient.get("/resource/Guardian", {
    params: {
      filters: JSON.stringify([["name", "in", guardianIds]]),
      fields: JSON.stringify(["name", "mobile_number"]),
      limit_page_length: guardianIds.length,
    },
  });
  const guardianMobile: Record<string, string> = {};
  for (const g of step2.data.data ?? []) {
    if (g.name && g.mobile_number) guardianMobile[g.name] = g.mobile_number;
  }

  // Final: student → mobile
  const map: Record<string, string> = {};
  for (const [studentId, guardianId] of Object.entries(studentToGuardian)) {
    if (guardianMobile[guardianId]) map[studentId] = guardianMobile[guardianId];
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
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("name_asc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showPlanMenu, setShowPlanMenu] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [showClassMenu, setShowClassMenu] = useState(false);
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [showBatchMenu, setShowBatchMenu] = useState(false);
  const [page, setPage] = useState(0);

  // Close dropdowns on outside click
  const sortRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const classRef = useRef<HTMLDivElement>(null);
  const batchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortMenu(false);
      if (planRef.current && !planRef.current.contains(e.target as Node)) setShowPlanMenu(false);
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setShowTypeMenu(false);
      if (classRef.current && !classRef.current.contains(e.target as Node)) setShowClassMenu(false);
      if (batchRef.current && !batchRef.current.contains(e.target as Node)) setShowBatchMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
  useEffect(() => { setPage(0); }, [statusFilter, planFilter, typeFilter, sortOption, classFilter, batchFilter]);

  // ── Query 4: fetch Student Groups (classes + batches) for this branch ──
  const { data: classBatchOptions = { classes: [], sgList: [] } } = useQuery({
    queryKey: ["class-batch-options", defaultCompany],
    queryFn: async () => {
      const sgRes = await apiClient.get("/resource/Student Group", {
        params: {
          filters: JSON.stringify([
            ["group_based_on", "=", "Batch"],
            ["custom_branch", "=", defaultCompany],
          ]),
          fields: JSON.stringify(["name", "program"]),
          limit_page_length: 200,
          order_by: "name asc",
        },
      });
      const sgList: { name: string; program: string }[] = sgRes.data.data ?? [];
      const classSet = new Set<string>(sgList.map((sg) => sg.program).filter(Boolean));
      return {
        classes: Array.from(classSet).sort(),
        sgList,
      };
    },
    enabled: !!defaultCompany,
    staleTime: 300_000,
  });

  // Batch options are filtered by the selected class
  const batchOptions = (classBatchOptions.sgList ?? []).filter(
    (sg) => classFilter === "all" || sg.program === classFilter
  );

  // Reset batchFilter when classFilter changes and the current batch no longer applies
  useEffect(() => {
    if (batchFilter !== "all") {
      const still = (classBatchOptions.sgList ?? []).some(
        (sg) => sg.name === batchFilter && (classFilter === "all" || sg.program === classFilter)
      );
      if (!still) setBatchFilter("all");
    }
  }, [classFilter, classBatchOptions.sgList, batchFilter]);

  // ── Query 5: fetch student IDs in the selected Student Group ──
  // student_batch_name on Program Enrollment stores the year code ("Eraveli 26-27"),
  // NOT the SG name. Group membership lives in the Student Group students child table.
  const { data: batchStudentIds = null, isLoading: batchLoading } = useQuery({
    queryKey: ["batch-students", batchFilter],
    queryFn: async () => {
      const { data } = await apiClient.get(`/resource/Student Group/${encodeURIComponent(batchFilter)}`);
      const rows: { student: string; active?: number }[] = data.data?.students ?? [];
      return rows.filter((r) => r.active !== 0).map((r) => r.student);
    },
    enabled: batchFilter !== "all",
    staleTime: 60_000,
  });

  // ── Query 1: students (server-side filtered) ─────────────────
  // When batchFilter is active, wait for batchStudentIds then pass them as a
  // server-side "name in [...]" filter so ALL matching students are returned.
  const batchReady = batchFilter === "all" || batchStudentIds !== null;
  const { data: studentsRes, isLoading: studentsLoading, isError, error } = useQuery({
    queryKey: ["students", search, statusFilter, typeFilter, page, defaultCompany, sortOption, batchFilter, batchStudentIds],
    queryFn: () => {
      const extraFilters = getExtraFilters(statusFilter);
      if (typeFilter !== "all") extraFilters.push(["custom_student_type", "=", typeFilter]);
      if (batchStudentIds && batchStudentIds.length > 0) {
        extraFilters.push(["name", "in", batchStudentIds]);
      } else if (batchStudentIds && batchStudentIds.length === 0) {
        // Empty batch — force no results
        extraFilters.push(["name", "=", "__none__"]);
      }
      return getStudents({
        search: search || undefined,
        enabled: getEnabledParam(statusFilter),
        extraFilters,
        limit_start: page * PAGE_SIZE,
        limit_page_length: PAGE_SIZE,
        order_by: getSortOrderBy(sortOption),
        ...(defaultCompany ? { custom_branch: defaultCompany } : {}),
      });
    },
    enabled: batchReady,
    staleTime: 30_000,
  });

  const isLoading = studentsLoading || batchLoading;

  const allStudents: Student[] = studentsRes?.data ?? [];
  const hasMore = allStudents.length === PAGE_SIZE;

  // ── Query 2: program enrollments for current page ──────────
  const studentIds = allStudents.map((s) => s.name);
  const { data: enrollmentMap = {} } = useQuery({
    queryKey: ["enrollment-map", studentIds],
    queryFn: () => fetchEnrollmentMap(studentIds),
    enabled: studentIds.length > 0,
    staleTime: 60_000,
  });

  // Client-side plan filter only (class uses server-side enrollment, batch is server-side "name in")
  const students = allStudents
    .filter((s) => planFilter === "all" || enrollmentMap[s.name]?.custom_plan === planFilter)
    .filter((s) => classFilter === "all" || enrollmentMap[s.name]?.program === classFilter);

  // ── Query 3: outstanding amounts per student ────────────────
  const customerIds = allStudents.map((s) => s.customer).filter(Boolean) as string[];
  const { data: outstandingMap = {} } = useQuery({
    queryKey: ["outstanding-map", customerIds],
    queryFn: () => fetchOutstandingMap(customerIds),
    enabled: customerIds.length > 0,
    staleTime: 60_000,
  });

  // ── Query 4: parent mobile numbers ───────────────────────────
  const { data: parentMobileMap = {} } = useQuery({
    queryKey: ["parent-mobile-map", studentIds],
    queryFn: () => fetchParentMobileMap(studentIds),
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
        <div className="flex gap-2">
          <Link href="/dashboard/branch-manager/admit?demo=true">
            <Button variant="outline" size="md">
              <Star className="h-4 w-4" />
              Demo Admit
            </Button>
          </Link>
          <Link href="/dashboard/branch-manager/new-admission">
            <Button variant="primary" size="md">
              <UserPlus className="h-4 w-4" />
              Add Student
            </Button>
          </Link>
        </div>
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

      {/* Sort & Plan Filter Row — outside Card so dropdowns float above the table */}
      <div className="flex items-center gap-2 flex-wrap -mt-3">
        {/* Type Filter Dropdown */}
        <div className="relative" ref={typeRef}>
          <button
            onClick={() => { setShowTypeMenu((v) => !v); setShowPlanMenu(false); setShowSortMenu(false); setShowClassMenu(false); setShowBatchMenu(false); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              typeFilter !== "all"
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-border-medium bg-surface-primary text-text-secondary hover:bg-app-bg"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            {TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label}
            <ChevronDown className="h-3 w-3" />
          </button>
          {showTypeMenu && (
            <div className="absolute top-full left-0 mt-1 w-40 bg-surface border border-border-light rounded-xl shadow-xl z-50 py-1">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setTypeFilter(opt.value); setShowTypeMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    typeFilter === opt.value
                      ? "bg-primary/5 text-primary font-semibold"
                      : "text-text-secondary hover:bg-app-bg"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Class Filter Dropdown */}
        <div className="relative" ref={classRef}>
          <button
            onClick={() => { setShowClassMenu((v) => !v); setShowPlanMenu(false); setShowSortMenu(false); setShowTypeMenu(false); setShowBatchMenu(false); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              classFilter !== "all"
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-border-medium bg-surface-primary text-text-secondary hover:bg-app-bg"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            {classFilter === "all" ? "All Classes" : classFilter}
            <ChevronDown className="h-3 w-3" />
          </button>
          {showClassMenu && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-surface border border-border-light rounded-xl shadow-xl z-50 py-1 max-h-60 overflow-y-auto">
              <button
                onClick={() => { setClassFilter("all"); setShowClassMenu(false); }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  classFilter === "all"
                    ? "bg-primary/5 text-primary font-semibold"
                    : "text-text-secondary hover:bg-app-bg"
                }`}
              >
                All Classes
              </button>
              {classBatchOptions.classes.map((cls) => (
                <button
                  key={cls}
                  onClick={() => { setClassFilter(cls); setShowClassMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    classFilter === cls
                      ? "bg-primary/5 text-primary font-semibold"
                      : "text-text-secondary hover:bg-app-bg"
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Batch Filter Dropdown */}
        <div className="relative" ref={batchRef}>
          <button
            onClick={() => { setShowBatchMenu((v) => !v); setShowPlanMenu(false); setShowSortMenu(false); setShowTypeMenu(false); setShowClassMenu(false); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              batchFilter !== "all"
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-border-medium bg-surface-primary text-text-secondary hover:bg-app-bg"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            {batchFilter === "all" ? "All Batches" : batchFilter}
            <ChevronDown className="h-3 w-3" />
          </button>
          {showBatchMenu && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-surface border border-border-light rounded-xl shadow-xl z-50 py-1 max-h-60 overflow-y-auto">
              <button
                onClick={() => { setBatchFilter("all"); setShowBatchMenu(false); }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  batchFilter === "all"
                    ? "bg-primary/5 text-primary font-semibold"
                    : "text-text-secondary hover:bg-app-bg"
                }`}
              >
                All Batches
              </button>
              {batchOptions.map((sg) => (
                <button
                  key={sg.name}
                  onClick={() => { setBatchFilter(sg.name); setShowBatchMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    batchFilter === sg.name
                      ? "bg-primary/5 text-primary font-semibold"
                      : "text-text-secondary hover:bg-app-bg"
                  }`}
                >
                  {sg.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Plan Filter Dropdown */}
        <div className="relative" ref={planRef}>
          <button
            onClick={() => { setShowPlanMenu((v) => !v); setShowSortMenu(false); setShowTypeMenu(false); setShowClassMenu(false); setShowBatchMenu(false); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              planFilter !== "all"
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-border-medium bg-surface-primary text-text-secondary hover:bg-app-bg"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            {PLAN_OPTIONS.find((o) => o.value === planFilter)?.label}
            <ChevronDown className="h-3 w-3" />
          </button>
          {showPlanMenu && (
            <div className="absolute top-full left-0 mt-1 w-40 bg-surface border border-border-light rounded-xl shadow-xl z-50 py-1">
              {PLAN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setPlanFilter(opt.value); setShowPlanMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    planFilter === opt.value
                      ? "bg-primary/5 text-primary font-semibold"
                      : "text-text-secondary hover:bg-app-bg"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => { setShowSortMenu((v) => !v); setShowPlanMenu(false); setShowTypeMenu(false); setShowClassMenu(false); setShowBatchMenu(false); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              sortOption !== "name_asc"
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-border-medium bg-surface-primary text-text-secondary hover:bg-app-bg"
            }`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {SORT_OPTIONS.find((o) => o.value === sortOption)?.label}
            <ChevronDown className="h-3 w-3" />
          </button>
          {showSortMenu && (
            <div className="absolute top-full left-0 mt-1 w-40 bg-surface border border-border-light rounded-xl shadow-xl z-50 py-1">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSortOption(opt.value); setShowSortMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    sortOption === opt.value
                      ? "bg-primary/5 text-primary font-semibold"
                      : "text-text-secondary hover:bg-app-bg"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reset button */}
        {(typeFilter !== "all" || planFilter !== "all" || sortOption !== "name_asc" || classFilter !== "all" || batchFilter !== "all") && (
          <button
            onClick={() => { setTypeFilter("all"); setPlanFilter("all"); setSortOption("name_asc"); setClassFilter("all"); setBatchFilter("all"); }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-text-tertiary hover:text-error hover:bg-error/5 transition-colors"
          >
            <X className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

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
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Parent Number</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Joined</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Type</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Status</th>
                  <th className="text-right px-5 py-3 font-semibold text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-border-light">
                        {Array.from({ length: 9 }).map((_, j) => (
                          <td key={j} className="px-5 py-3">
                            <Skeleton className="h-4 w-full rounded" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : students.length === 0
                  ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-16 text-center text-text-tertiary text-sm">
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

                          {/* Parent Number */}
                          <td className="px-5 py-3 text-text-secondary">
                            {parentMobileMap[student.name] || <span className="text-text-tertiary text-xs">—</span>}
                          </td>

                          {/* Joined date */}
                          <td className="px-5 py-3 text-text-secondary text-xs">
                            {student.joining_date ?? <span className="text-text-tertiary">—</span>}
                          </td>

                          {/* Student Type */}
                          <td className="px-5 py-3">
                            {student.custom_student_type ? (
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-2 py-0.5 ${
                                  student.custom_student_type === "Fresher"
                                    ? "border-green-300 text-green-700"
                                    : student.custom_student_type === "Existing"
                                    ? "border-blue-300 text-blue-700"
                                    : student.custom_student_type === "Demo"
                                    ? "border-amber-400 text-amber-700 bg-amber-50 font-bold"
                                    : "border-amber-300 text-amber-700"
                                }`}
                              >
                                {student.custom_student_type}
                              </Badge>
                            ) : (
                              <span className="text-text-tertiary text-xs">—</span>
                            )}
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
