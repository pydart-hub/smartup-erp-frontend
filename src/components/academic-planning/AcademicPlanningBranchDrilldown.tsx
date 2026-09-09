"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  GraduationCap,
  Users,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Sparkles,
  Calendar,
  X,
  Layers,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

export interface PortionRecord {
  name: string;
  portion_ref: string;
  branch: string;
  student_group: string;
  class_level: string;
  course: string;
  portion_title: string;
  target_date: string;
  status: "Pending" | "Completed";
  remarks?: string;
  completed_on?: string;
}

// Helper to detect if a student group represents an individual student (One-to-One), e.g. "karthik (STU-SU EDPLY-26-025)"
export function isOneToOneStudentGroup(studentGroup: string): boolean {
  if (!studentGroup) return false;
  const trimmed = studentGroup.trim();
  // Check for student ID patterns: "(STU-" or "STU-"
  if (/STU-[A-Z0-9-]+/i.test(trimmed)) return true;
  // Check for explicit one-to-one indicators
  if (/one[-_\s]?to[-_\s]?one|1[-_\s]?to[-_\s]?1|1:1/i.test(trimmed)) return true;
  return false;
}

// Helper to extract a friendly batch name, e.g. "Palluruthy-10th State-A" -> "Batch A"
function extractBatchName(studentGroup: string): string {
  if (!studentGroup) return "General";
  const trimmed = studentGroup.trim();
  const dashMatch = trimmed.match(/-([A-Za-z0-9]+)$/);
  if (dashMatch && dashMatch[1]) {
    const code = dashMatch[1].toUpperCase();
    return code.length <= 2 ? `Batch ${code}` : dashMatch[1];
  }
  const batchMatch = trimmed.match(/batch\s*([A-Za-z0-9]+)/i);
  if (batchMatch && batchMatch[1]) {
    return `Batch ${batchMatch[1].toUpperCase()}`;
  }
  return trimmed;
}

// Helper to parse completion percentage
function getPortionPercentage(item: PortionRecord): number {
  if (item.remarks) {
    const match = item.remarks.match(/\[progress:(\d+)%\]/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num)) {
        return Math.min(100, Math.max(0, num));
      }
    }
  }
  return item.status === "Completed" ? 100 : 0;
}

export function AcademicPlanningBranchDrilldown({
  preselectedBranch,
}: {
  preselectedBranch?: string;
}) {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(
    preselectedBranch && preselectedBranch !== "all" ? preselectedBranch : null
  );
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Incomplete" | "Completed">("all");

  // Keep state synced if parent dropdown changes branch
  React.useEffect(() => {
    if (preselectedBranch && preselectedBranch !== "all") {
      setSelectedBranch(preselectedBranch);
    }
  }, [preselectedBranch]);

  // Fetch all branch portion status items
  const { data: records = [], isLoading } = useQuery<PortionRecord[]>({
    queryKey: ["apd-branch-portion-records-all"],
    queryFn: async () => {
      const res = await fetch("/api/academic-planning/portions/all-statuses");
      if (res.ok) {
        const json = await res.json();
        return json.data ?? [];
      }
      return [];
    },
    staleTime: 45_000,
  });

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Filter out one-to-one student groups (e.g. "karthik (STU-SU EDPLY-26-025)")
  const batchRecords = useMemo(() => {
    return records.filter((p) => !isOneToOneStudentGroup(p.student_group));
  }, [records]);

  // ─────────────────────────────────────────────────────────────
  // LEVEL 1: Branch Summaries
  // ─────────────────────────────────────────────────────────────
  const branchSummaryList = useMemo(() => {
    const map = new Map<
      string,
      {
        branch: string;
        total: number;
        completed: number;
        inProgress: number;
        notStarted: number;
        overdue: number;
        sumPercentages: number;
        classes: Set<string>;
        batches: Set<string>;
        subjects: Set<string>;
      }
    >();

    batchRecords.forEach((p) => {
      const b = p.branch || "Smart Up";
      if (!map.has(b)) {
        map.set(b, {
          branch: b,
          total: 0,
          completed: 0,
          inProgress: 0,
          notStarted: 0,
          overdue: 0,
          sumPercentages: 0,
          classes: new Set<string>(),
          batches: new Set<string>(),
          subjects: new Set<string>(),
        });
      }
      const entry = map.get(b)!;
      const pct = getPortionPercentage(p);
      entry.total += 1;
      entry.sumPercentages += pct;
      if (pct === 100) entry.completed += 1;
      else if (pct > 0) entry.inProgress += 1;
      else entry.notStarted += 1;

      if (pct < 100 && p.target_date && p.target_date < todayStr) entry.overdue += 1;
      if (p.class_level) entry.classes.add(p.class_level);
      if (p.student_group) entry.batches.add(p.student_group);
      if (p.course) entry.subjects.add(p.course);
    });

    const list = Array.from(map.values()).sort((a, b) => {
      return b.total - a.total || a.branch.localeCompare(b.branch);
    });

    if (!search.trim() || selectedBranch) return list;
    const q = search.trim().toLowerCase();
    return list.filter((b) => b.branch.toLowerCase().includes(q));
  }, [records, todayStr, search, selectedBranch]);

  // ─────────────────────────────────────────────────────────────
  // LEVEL 2: Class Summaries inside selectedBranch
  // ─────────────────────────────────────────────────────────────
  const classSummaryList = useMemo(() => {
    if (!selectedBranch) return [];
    const map = new Map<
      string,
      {
        classLevel: string;
        total: number;
        completed: number;
        inProgress: number;
        notStarted: number;
        overdue: number;
        sumPercentages: number;
        batches: Set<string>;
        subjects: Set<string>;
      }
    >();

    batchRecords
      .filter((p) => (p.branch || "Smart Up") === selectedBranch)
      .forEach((p) => {
        const cls = p.class_level || "Other Class";
        if (!map.has(cls)) {
          map.set(cls, {
            classLevel: cls,
            total: 0,
            completed: 0,
            inProgress: 0,
            notStarted: 0,
            overdue: 0,
            sumPercentages: 0,
            batches: new Set<string>(),
            subjects: new Set<string>(),
          });
        }
        const entry = map.get(cls)!;
        const pct = getPortionPercentage(p);
        entry.total += 1;
        entry.sumPercentages += pct;
        if (pct === 100) entry.completed += 1;
        else if (pct > 0) entry.inProgress += 1;
        else entry.notStarted += 1;

        if (pct < 100 && p.target_date && p.target_date < todayStr) entry.overdue += 1;
        if (p.student_group) entry.batches.add(extractBatchName(p.student_group));
        if (p.course) entry.subjects.add(p.course);
      });

    const list = Array.from(map.values()).sort((a, b) =>
      a.classLevel.localeCompare(b.classLevel)
    );

    if (!search.trim() || selectedClass) return list;
    const q = search.trim().toLowerCase();
    return list.filter((c) => c.classLevel.toLowerCase().includes(q));
  }, [batchRecords, selectedBranch, todayStr, search, selectedClass]);

  // ─────────────────────────────────────────────────────────────
  // LEVEL 3: Batch Summaries inside selectedBranch & selectedClass
  // ─────────────────────────────────────────────────────────────
  const batchSummaryList = useMemo(() => {
    if (!selectedBranch || !selectedClass) return [];
    const map = new Map<
      string,
      {
        batchName: string;
        rawBatch: string;
        total: number;
        completed: number;
        inProgress: number;
        notStarted: number;
        overdue: number;
        sumPercentages: number;
        subjects: Set<string>;
      }
    >();

    batchRecords
      .filter(
        (p) =>
          (p.branch || "Smart Up") === selectedBranch &&
          (p.class_level || "Other Class") === selectedClass
      )
      .forEach((p) => {
        const btc = extractBatchName(p.student_group);
        if (!map.has(btc)) {
          map.set(btc, {
            batchName: btc,
            rawBatch: p.student_group,
            total: 0,
            completed: 0,
            inProgress: 0,
            notStarted: 0,
            overdue: 0,
            sumPercentages: 0,
            subjects: new Set<string>(),
          });
        }
        const entry = map.get(btc)!;
        const pct = getPortionPercentage(p);
        entry.total += 1;
        entry.sumPercentages += pct;
        if (pct === 100) entry.completed += 1;
        else if (pct > 0) entry.inProgress += 1;
        else entry.notStarted += 1;

        if (pct < 100 && p.target_date && p.target_date < todayStr) entry.overdue += 1;
        if (p.course) entry.subjects.add(p.course);
      });

    const list = Array.from(map.values()).sort((a, b) =>
      a.batchName.localeCompare(b.batchName)
    );

    if (!search.trim() || selectedBatch) return list;
    const q = search.trim().toLowerCase();
    return list.filter((b) => b.batchName.toLowerCase().includes(q));
  }, [batchRecords, selectedBranch, selectedClass, todayStr, search, selectedBatch]);

  // ─────────────────────────────────────────────────────────────
  // LEVEL 4: Subject Portions inside selectedBranch + selectedClass + selectedBatch
  // ─────────────────────────────────────────────────────────────
  const subjectsMap = useMemo(() => {
    if (!selectedBranch || !selectedClass || !selectedBatch) return {};

    const items = batchRecords.filter((p) => {
      if ((p.branch || "Smart Up") !== selectedBranch) return false;
      if ((p.class_level || "Other Class") !== selectedClass) return false;
      if (extractBatchName(p.student_group) !== selectedBatch) return false;

      const pct = getPortionPercentage(p);
      if (statusFilter === "Completed" && pct !== 100) return false;
      if (statusFilter === "Incomplete" && pct === 100) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const mTitle = p.portion_title?.toLowerCase().includes(q);
        const mCourse = p.course?.toLowerCase().includes(q);
        if (!mTitle && !mCourse) return false;
      }
      return true;
    });

    const groups: Record<string, PortionRecord[]> = {};
    items.forEach((p) => {
      const sub = p.course || "General Subject";
      if (!groups[sub]) groups[sub] = [];
      groups[sub].push(p);
    });

    return groups;
  }, [batchRecords, selectedBranch, selectedClass, selectedBatch, statusFilter, search]);

  // Active level calculation
  const activeLevel = selectedBatch ? 4 : selectedClass ? 3 : selectedBranch ? 2 : 1;

  const handleResetTo = (level: 1 | 2 | 3) => {
    if (level === 1) {
      setSelectedBranch(null);
      setSelectedClass(null);
      setSelectedBatch(null);
    } else if (level === 2) {
      setSelectedClass(null);
      setSelectedBatch(null);
    } else if (level === 3) {
      setSelectedBatch(null);
    }
    setSearch("");
  };

  return (
    <div className="space-y-4">
      {/* Interactive Breadcrumb Path */}
      <div className="bg-surface rounded-2xl border border-border/80 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-1.5 text-xs">
          <button
            onClick={() => handleResetTo(1)}
            className={`font-semibold transition-colors flex items-center gap-1.5 px-2 py-1 rounded-lg ${
              activeLevel === 1
                ? "bg-primary/10 text-primary"
                : "text-text-secondary hover:text-text-primary hover:bg-muted/40"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>All Branches</span>
          </button>

          {selectedBranch && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
              <button
                onClick={() => handleResetTo(2)}
                className={`font-semibold transition-colors flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                  activeLevel === 2
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-muted/40"
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-text-tertiary" />
                <span>{selectedBranch}</span>
              </button>
            </>
          )}

          {selectedClass && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
              <button
                onClick={() => handleResetTo(3)}
                className={`font-semibold transition-colors flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                  activeLevel === 3
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-muted/40"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-text-tertiary" />
                <span>{selectedClass}</span>
              </button>
            </>
          )}

          {selectedBatch && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
              <span className="font-semibold text-primary bg-primary/10 px-2 py-1 rounded-lg flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>{selectedBatch}</span>
              </span>
            </>
          )}
        </div>

        {/* Back Button */}
        {activeLevel > 1 && (
          <button
            onClick={() => {
              if (selectedBatch) setSelectedBatch(null);
              else if (selectedClass) setSelectedClass(null);
              else if (selectedBranch) setSelectedBranch(null);
            }}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary font-medium px-2.5 py-1 rounded-lg border border-border hover:bg-muted/40 transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="py-20 text-center text-text-tertiary">
          <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-xs font-medium">Loading branch portion completion...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-dashed border-border p-12 text-center text-text-tertiary">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-text-tertiary/60" />
          <p className="text-sm font-semibold text-text-primary">No portion records found</p>
          <p className="text-xs text-text-secondary mt-1">
            There are currently no portion tracking records assigned across branches.
          </p>
        </div>
      ) : (
        <>
          {/* LEVEL 1: ALL BRANCHES CARDS */}
          {activeLevel === 1 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
                    <span>Select a Campus Branch</span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-muted text-text-secondary">
                      {branchSummaryList.length} branches
                    </span>
                  </h2>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search branch..."
                    className="pl-8 text-xs rounded-xl h-8.5 border-border/80 focus:border-primary"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {branchSummaryList.map((b) => {
                  const avgPct =
                    b.total > 0 ? Math.round(b.sumPercentages / b.total) : 0;

                  return (
                    <button
                      key={b.branch}
                      onClick={() => {
                        setSelectedBranch(b.branch);
                        setSearch("");
                      }}
                      className="group text-left bg-surface rounded-2xl border border-border/80 p-5 hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm group-hover:scale-105 group-hover:bg-primary group-hover:text-white transition-all">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-sm text-text-primary group-hover:text-primary transition-colors">
                                {b.branch}
                              </h3>
                              <p className="text-xs text-text-tertiary">
                                {b.classes.size} Classes · {b.batches.size} Batches
                              </p>
                            </div>
                          </div>

                          <div className="w-7 h-7 rounded-lg bg-muted/50 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center text-text-tertiary transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>

                        {/* Metric stats */}
                        <div className="grid grid-cols-3 gap-1.5 mt-4 pt-3 border-t border-border/50 text-center">
                          <div className="p-1.5 rounded-lg bg-muted/20">
                            <span className="text-[10px] uppercase text-text-tertiary font-medium block">
                              Total
                            </span>
                            <span className="text-xs font-bold text-text-primary mt-0.5 block">
                              {b.total}
                            </span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-emerald-500/10">
                            <span className="text-[10px] uppercase text-emerald-600 font-medium block">
                              100% Done
                            </span>
                            <span className="text-xs font-bold text-emerald-600 mt-0.5 block">
                              {b.completed}
                            </span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-blue-500/10">
                            <span className="text-[10px] uppercase text-blue-600 font-medium block">
                              Progress
                            </span>
                            <span className="text-xs font-bold text-blue-600 mt-0.5 block">
                              {avgPct}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-tertiary text-[11px]">Branch Progress</span>
                          <span className="font-bold text-text-primary text-[11px]">{avgPct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${avgPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-0.5 text-text-tertiary">
                          <span>
                            {b.overdue > 0 ? (
                              <span className="text-rose-600 font-medium">
                                {b.overdue} overdue
                              </span>
                            ) : (
                              <span className="text-emerald-600">On track</span>
                            )}
                          </span>
                          <span>{b.inProgress} in progress</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* LEVEL 2: CLASSES INSIDE SELECTED BRANCH */}
          {activeLevel === 2 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    Classes in {selectedBranch}
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Click a class card to inspect its batches (A, B, C).
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search classes..."
                    className="pl-8 text-xs rounded-xl h-8.5 border-border/80 focus:border-primary"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {classSummaryList.length === 0 ? (
                <div className="bg-surface rounded-2xl border border-dashed border-border p-8 text-center text-text-tertiary">
                  <p className="text-sm font-semibold text-text-primary">No classes found</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    No active portion data found for classes in this branch.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classSummaryList.map((item) => {
                    const classPct =
                      item.total > 0 ? Math.round(item.sumPercentages / item.total) : 0;

                    return (
                      <button
                        key={item.classLevel}
                        onClick={() => {
                          setSelectedClass(item.classLevel);
                          setSearch("");
                        }}
                        className="group text-left bg-surface rounded-2xl border border-border/80 p-5 hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm group-hover:scale-105 group-hover:bg-primary group-hover:text-white transition-all">
                                {item.classLevel.slice(0, 3)}
                              </div>
                              <div>
                                <h3 className="font-bold text-sm text-text-primary group-hover:text-primary transition-colors">
                                  {item.classLevel}
                                </h3>
                                <p className="text-xs text-text-tertiary">
                                  {item.batches.size} {item.batches.size === 1 ? "Batch" : "Batches"} ·{" "}
                                  {item.subjects.size} {item.subjects.size === 1 ? "Subject" : "Subjects"}
                                </p>
                              </div>
                            </div>

                            <div className="w-7 h-7 rounded-lg bg-muted/50 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center text-text-tertiary transition-colors">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-1.5 mt-4 pt-3 border-t border-border/50 text-center">
                            <div className="p-1.5 rounded-lg bg-muted/20">
                              <span className="text-[10px] uppercase text-text-tertiary font-medium block">
                                Total
                              </span>
                              <span className="text-xs font-bold text-text-primary mt-0.5 block">
                                {item.total}
                              </span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-emerald-500/10">
                              <span className="text-[10px] uppercase text-emerald-600 font-medium block">
                                100% Done
                              </span>
                              <span className="text-xs font-bold text-emerald-600 mt-0.5 block">
                                {item.completed}
                              </span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-blue-500/10">
                              <span className="text-[10px] uppercase text-blue-600 font-medium block">
                                Progress
                              </span>
                              <span className="text-xs font-bold text-blue-600 mt-0.5 block">
                                {classPct}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-text-tertiary text-[11px]">Class Progress</span>
                            <span className="font-bold text-text-primary text-[11px]">{classPct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${classPct}%` }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* LEVEL 3: BATCHES (A, B, C) INSIDE SELECTED CLASS */}
          {activeLevel === 3 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Batches for {selectedClass} ({selectedBranch})
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Select a batch to see all subjects and portions.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search batches..."
                    className="pl-8 text-xs rounded-xl h-8.5 border-border/80 focus:border-primary"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {batchSummaryList.length === 0 ? (
                <div className="bg-surface rounded-2xl border border-dashed border-border p-8 text-center text-text-tertiary">
                  <p className="text-sm font-semibold text-text-primary">No batches found</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    No active batch records found for this class.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {batchSummaryList.map((batch) => {
                    const batchPct =
                      batch.total > 0 ? Math.round(batch.sumPercentages / batch.total) : 0;

                    return (
                      <button
                        key={batch.batchName}
                        onClick={() => {
                          setSelectedBatch(batch.batchName);
                          setSearch("");
                        }}
                        className="group text-left bg-surface rounded-2xl border border-border/80 p-5 hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-sm group-hover:scale-105 group-hover:bg-primary group-hover:text-white transition-all">
                                {batch.batchName.replace(/batch\s*/i, "").trim() || "B"}
                              </div>
                              <div>
                                <h3 className="font-bold text-sm text-text-primary group-hover:text-primary transition-colors">
                                  {batch.batchName}
                                </h3>
                                <p className="text-xs text-text-tertiary">
                                  {batch.subjects.size} {batch.subjects.size === 1 ? "Subject" : "Subjects"} ·{" "}
                                  {batch.total} Portions
                                </p>
                              </div>
                            </div>

                            <div className="w-7 h-7 rounded-lg bg-muted/50 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center text-text-tertiary transition-colors">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-1.5 mt-4 pt-3 border-t border-border/50 text-center">
                            <div className="p-1.5 rounded-lg bg-muted/20">
                              <span className="text-[10px] uppercase text-text-tertiary font-medium block">
                                Total
                              </span>
                              <span className="text-xs font-bold text-text-primary mt-0.5 block">
                                {batch.total}
                              </span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-emerald-500/10">
                              <span className="text-[10px] uppercase text-emerald-600 font-medium block">
                                100% Done
                              </span>
                              <span className="text-xs font-bold text-emerald-600 mt-0.5 block">
                                {batch.completed}
                              </span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-blue-500/10">
                              <span className="text-[10px] uppercase text-blue-600 font-medium block">
                                Progress
                              </span>
                              <span className="text-xs font-bold text-blue-600 mt-0.5 block">
                                {batchPct}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-text-tertiary text-[11px]">Batch Progress</span>
                            <span className="font-bold text-text-primary text-[11px]">{batchPct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${batchPct}%` }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* LEVEL 4: SUBJECT WISE CARDS & TOPIC LIST INSIDE SELECTED BATCH */}
          {activeLevel === 4 && (
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="bg-surface rounded-2xl border border-border/80 p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {selectedBatch?.replace(/batch\s*/i, "").trim() || "B"}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-text-primary">
                      {selectedBatch} · {selectedClass}
                    </h3>
                    <p className="text-[11px] text-text-tertiary">
                      Campus: {selectedBranch}
                    </p>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2.5">
                  <div className="relative w-full sm:w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search portions..."
                      className="pl-8 text-xs rounded-xl h-8 bg-muted/20 border-border/70"
                    />
                  </div>

                  {/* Status filter toggle */}
                  <div className="inline-flex rounded-xl p-0.5 bg-muted/40 border border-border/60">
                    {(["all", "Incomplete", "Completed"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          statusFilter === st
                            ? "bg-surface text-text-primary shadow-xs font-semibold"
                            : "text-text-tertiary hover:text-text-secondary"
                        }`}
                      >
                        {st === "all" ? "All" : st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Subject Cards */}
              {Object.keys(subjectsMap).length === 0 ? (
                <div className="bg-surface rounded-2xl border border-dashed border-border p-10 text-center text-text-tertiary">
                  <p className="text-sm font-semibold text-text-primary">No portions found</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Try changing your search query or status filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(subjectsMap).map(([subjectName, items]) => {
                    const sumPct = items.reduce(
                      (acc, i) => acc + getPortionPercentage(i),
                      0
                    );
                    const totalSubj = items.length;
                    const subAvgPct =
                      totalSubj > 0 ? Math.round(sumPct / totalSubj) : 0;
                    const done100 = items.filter(
                      (i) => getPortionPercentage(i) === 100
                    ).length;

                    return (
                      <div
                        key={subjectName}
                        className="bg-surface rounded-2xl border border-border/80 shadow-xs overflow-hidden flex flex-col justify-between"
                      >
                        {/* Subject Header */}
                        <div className="p-4 bg-muted/20 border-b border-border/60 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-text-primary">
                                {subjectName}
                              </h3>
                              <span className="text-[11px] text-text-tertiary">
                                {done100} of {totalSubj} fully completed · {subAvgPct}% average
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <div className="w-16 h-2 bg-border rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${subAvgPct}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-text-primary">
                              {subAvgPct}%
                            </span>
                          </div>
                        </div>

                        {/* Portion Items List inside this Subject */}
                        <div className="p-3.5 space-y-3">
                          {items.map((item) => {
                            const pct = getPortionPercentage(item);
                            const isDone = pct === 100;
                            const isOverdue =
                              !isDone && item.target_date && item.target_date < todayStr;

                            return (
                              <div
                                key={item.name}
                                className={`rounded-xl border p-3 transition-all space-y-2.5 ${
                                  isDone
                                    ? "bg-emerald-500/5 border-emerald-500/20"
                                    : isOverdue
                                    ? "bg-rose-50/30 border-rose-200"
                                    : "bg-surface border-border/70 hover:border-primary/40 hover:shadow-2xs"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <p
                                        className={`text-xs font-semibold truncate ${
                                          isDone
                                            ? "text-emerald-950 font-bold"
                                            : "text-text-primary"
                                        }`}
                                      >
                                        {item.portion_title}
                                      </p>
                                      {isDone && (
                                        <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-semibold shrink-0 flex items-center gap-1">
                                          <CheckCircle2 className="w-2.5 h-2.5" />
                                          Completed
                                        </span>
                                      )}
                                      {isOverdue && (
                                        <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded font-medium shrink-0">
                                          Overdue
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2.5 text-[11px] text-text-tertiary mt-0.5">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-text-tertiary" />
                                        Target:{" "}
                                        <span
                                          className={
                                            isOverdue
                                              ? "text-rose-600 font-medium"
                                              : "text-text-secondary"
                                          }
                                        >
                                          {item.target_date || "No date set"}
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  {/* Percentage Pill */}
                                  <span
                                    className={`text-xs font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                                      isDone
                                        ? "bg-emerald-100 text-emerald-800"
                                        : pct >= 50
                                        ? "bg-indigo-100 text-indigo-800"
                                        : pct > 0
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-muted text-text-tertiary"
                                    }`}
                                  >
                                    {pct}%
                                  </span>
                                </div>

                                {/* Progress Bar Visual */}
                                <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      isDone
                                        ? "bg-emerald-500"
                                        : pct >= 50
                                        ? "bg-indigo-500"
                                        : pct > 0
                                        ? "bg-amber-500"
                                        : "bg-slate-300"
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
