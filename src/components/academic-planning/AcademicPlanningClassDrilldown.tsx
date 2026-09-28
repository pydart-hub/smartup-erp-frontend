"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  BookOpen,
  Building2,
  Users,
  ChevronRight,
  ArrowLeft,
  Search,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Loader2,
  Sparkles,
  X,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  isCanonicalBatchGroup,
  extractBatchName,
} from "@/lib/utils/studentGroupUtils";

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

// Subject emoji helper
function getSubjectBadgeEmoji(subjectName: string): string {
  const s = subjectName.toLowerCase();
  if (s.includes("math")) return "📐";
  if (s.includes("physic")) return "⚡";
  if (s.includes("chem")) return "🧪";
  if (s.includes("bio")) return "🌿";
  if (s.includes("eng")) return "📖";
  if (s.includes("social") || s.includes("hist") || s.includes("geo")) return "🌍";
  if (s.includes("malayalam")) return "✍️";
  if (s.includes("hindi")) return "🇮🇳";
  if (s.includes("arabic")) return "📜";
  if (s.includes("account") || s.includes("commerce")) return "📊";
  if (s.includes("econ")) return "📈";
  if (s.includes("comp") || s.includes("cs")) return "💻";
  return "📚";
}

export function AcademicPlanningClassDrilldown({
  preselectedClass,
}: {
  preselectedClass?: string;
}) {
  const [selectedClass, setSelectedClass] = useState<string | null>(
    preselectedClass && preselectedClass !== "all" ? preselectedClass : null
  );
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Overdue" | "Incomplete" | "Completed">("all");

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

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

  // Filter out one-to-one AND subject-wise tuition groups, and deduplicate milestones per batch
  const batchRecords = useMemo(() => {
    const valid = records.filter((p) => isCanonicalBatchGroup(p.student_group));

    const dedupMap = new Map<string, PortionRecord>();
    for (const item of valid) {
      const btc = extractBatchName(item.student_group);
      const portionKey = item.portion_ref || `${item.course}-${item.portion_title}`;
      const uniqueKey = `${item.branch || "Smart Up"}__${item.class_level || ""}__${btc}__${portionKey}`;

      if (!dedupMap.has(uniqueKey)) {
        dedupMap.set(uniqueKey, item);
      } else {
        const existing = dedupMap.get(uniqueKey)!;
        const currentPct = getPortionPercentage(item);
        const existingPct = getPortionPercentage(existing);

        if (currentPct > existingPct) {
          dedupMap.set(uniqueKey, item);
        } else if (currentPct === existingPct) {
          const isCurrentCanonical = item.student_group.toLowerCase().includes((item.class_level || "").toLowerCase());
          if (isCurrentCanonical) dedupMap.set(uniqueKey, item);
        }
      }
    }

    return Array.from(dedupMap.values());
  }, [records]);

  // ─────────────────────────────────────────────────────────────
  // LEVEL 1: Class Summaries across all branches
  // ─────────────────────────────────────────────────────────────
  const classSummaryList = useMemo(() => {
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
        branches: Set<string>;
        batches: Set<string>;
        subjects: Set<string>;
      }
    >();

    batchRecords.forEach((p) => {
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
          branches: new Set<string>(),
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
      if (p.branch) entry.branches.add(p.branch);
      if (p.student_group) entry.batches.add(extractBatchName(p.student_group));
      if (p.course) entry.subjects.add(p.course);
    });

    const list = Array.from(map.values()).sort((a, b) => {
      // Natural grade sort
      const numA = parseInt(a.classLevel.match(/\d+/)?.[0] || "999", 10);
      const numB = parseInt(b.classLevel.match(/\d+/)?.[0] || "999", 10);
      if (numA !== numB) return numA - numB;
      return a.classLevel.localeCompare(b.classLevel);
    });

    if (!search.trim() || selectedClass) return list;
    const q = search.trim().toLowerCase();
    return list.filter((c) => c.classLevel.toLowerCase().includes(q));
  }, [batchRecords, todayStr, search, selectedClass]);

  // ─────────────────────────────────────────────────────────────
  // LEVEL 2: Subject Summaries inside selectedClass
  // ─────────────────────────────────────────────────────────────
  const subjectSummaryList = useMemo(() => {
    if (!selectedClass) return [];
    const map = new Map<
      string,
      {
        subjectName: string;
        total: number;
        completed: number;
        inProgress: number;
        notStarted: number;
        overdue: number;
        sumPercentages: number;
        branches: Set<string>;
        batches: Set<string>;
      }
    >();

    batchRecords
      .filter((p) => (p.class_level || "Other Class") === selectedClass)
      .forEach((p) => {
        const sub = p.course || "General Subject";
        if (!map.has(sub)) {
          map.set(sub, {
            subjectName: sub,
            total: 0,
            completed: 0,
            inProgress: 0,
            notStarted: 0,
            overdue: 0,
            sumPercentages: 0,
            branches: new Set<string>(),
            batches: new Set<string>(),
          });
        }
        const entry = map.get(sub)!;
        const pct = getPortionPercentage(p);
        entry.total += 1;
        entry.sumPercentages += pct;
        if (pct === 100) entry.completed += 1;
        else if (pct > 0) entry.inProgress += 1;
        else entry.notStarted += 1;

        if (pct < 100 && p.target_date && p.target_date < todayStr) entry.overdue += 1;
        if (p.branch) entry.branches.add(p.branch);
        if (p.student_group) entry.batches.add(extractBatchName(p.student_group));
      });

    const list = Array.from(map.values()).sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName)
    );

    if (!search.trim() || selectedSubject) return list;
    const q = search.trim().toLowerCase();
    return list.filter((s) => s.subjectName.toLowerCase().includes(q));
  }, [batchRecords, selectedClass, todayStr, search, selectedSubject]);

  // ─────────────────────────────────────────────────────────────
  // LEVEL 3: Branch breakdown inside selectedClass & selectedSubject
  // ─────────────────────────────────────────────────────────────
  const branchBreakdownList = useMemo(() => {
    if (!selectedClass || !selectedSubject) return [];

    const items = batchRecords.filter((p) => {
      if ((p.class_level || "Other Class") !== selectedClass) return false;
      if ((p.course || "General Subject") !== selectedSubject) return false;

      const pct = getPortionPercentage(p);
      const isDone = pct === 100;
      const isOverdue = !isDone && p.target_date && p.target_date < todayStr;

      if (statusFilter === "Completed" && !isDone) return false;
      if (statusFilter === "Incomplete" && isDone) return false;
      if (statusFilter === "Overdue" && !isOverdue) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const mBranch = (p.branch || "").toLowerCase().includes(q);
        const mTitle = (p.portion_title || "").toLowerCase().includes(q);
        const mBatch = (p.student_group || "").toLowerCase().includes(q);
        if (!mBranch && !mTitle && !mBatch) return false;
      }
      return true;
    });

    const map = new Map<
      string,
      {
        branchName: string;
        portions: PortionRecord[];
        total: number;
        completed: number;
        inProgress: number;
        overdue: number;
        sumPercentages: number;
        batches: Set<string>;
      }
    >();

    items.forEach((p) => {
      const b = p.branch || "Smart Up";
      if (!map.has(b)) {
        map.set(b, {
          branchName: b,
          portions: [],
          total: 0,
          completed: 0,
          inProgress: 0,
          overdue: 0,
          sumPercentages: 0,
          batches: new Set<string>(),
        });
      }
      const entry = map.get(b)!;
      entry.portions.push(p);
      const pct = getPortionPercentage(p);
      entry.total += 1;
      entry.sumPercentages += pct;
      if (pct === 100) entry.completed += 1;
      else if (pct > 0) entry.inProgress += 1;

      if (pct < 100 && p.target_date && p.target_date < todayStr) entry.overdue += 1;
      if (p.student_group) entry.batches.add(extractBatchName(p.student_group));
    });

    return Array.from(map.values()).sort((a, b) =>
      a.branchName.localeCompare(b.branchName)
    );
  }, [batchRecords, selectedClass, selectedSubject, statusFilter, search, todayStr]);

  // Overdue count inside selected class & subject
  const overdueCountInSubject = useMemo(() => {
    if (!selectedClass || !selectedSubject) return 0;
    return batchRecords.filter((p) => {
      if ((p.class_level || "Other Class") !== selectedClass) return false;
      if ((p.course || "General Subject") !== selectedSubject) return false;
      const pct = getPortionPercentage(p);
      return pct < 100 && p.target_date && p.target_date < todayStr;
    }).length;
  }, [batchRecords, selectedClass, selectedSubject, todayStr]);

  // Current active level
  const activeLevel = selectedSubject ? 3 : selectedClass ? 2 : 1;

  const handleResetTo = (level: 1 | 2) => {
    if (level === 1) {
      setSelectedClass(null);
      setSelectedSubject(null);
    } else if (level === 2) {
      setSelectedSubject(null);
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
            <GraduationCap className="w-3.5 h-3.5" />
            <span>All Classes</span>
          </button>

          {selectedClass && (
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
                <BookOpen className="w-3.5 h-3.5 text-text-tertiary" />
                <span>{selectedClass}</span>
              </button>
            </>
          )}

          {selectedSubject && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
              <span className="font-semibold text-primary bg-primary/10 px-2 py-1 rounded-lg flex items-center gap-1.5">
                <span>{getSubjectBadgeEmoji(selectedSubject)}</span>
                <span>{selectedSubject}</span>
              </span>
            </>
          )}
        </div>

        {/* Back Button */}
        {activeLevel > 1 && (
          <button
            onClick={() => {
              if (selectedSubject) setSelectedSubject(null);
              else if (selectedClass) setSelectedClass(null);
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
          <p className="text-xs font-medium">Loading syllabus portion tracking records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-dashed border-border p-12 text-center text-text-tertiary">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-text-tertiary/60" />
          <p className="text-sm font-semibold text-text-primary">No portion records found</p>
          <p className="text-xs text-text-secondary mt-1">
            There are currently no portion tracking records assigned across classes.
          </p>
        </div>
      ) : (
        <>
          {/* LEVEL 1: ALL CLASSES CARDS */}
          {activeLevel === 1 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
                    <span>Select a Class / Grade</span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-muted text-text-secondary">
                      {classSummaryList.length} classes
                    </span>
                  </h2>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search class (e.g. 10th)..."
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
                {classSummaryList.map((c) => {
                  const avgPct =
                    c.total > 0 ? Math.round(c.sumPercentages / c.total) : 0;

                  return (
                    <button
                      key={c.classLevel}
                      onClick={() => {
                        setSelectedClass(c.classLevel);
                        setSearch("");
                      }}
                      className="group text-left bg-surface rounded-2xl border border-border/80 p-5 hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm group-hover:scale-105 group-hover:bg-primary group-hover:text-white transition-all">
                              <GraduationCap className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-sm text-text-primary group-hover:text-primary transition-colors">
                                {c.classLevel}
                              </h3>
                              <p className="text-xs text-text-tertiary">
                                {c.subjects.size} {c.subjects.size === 1 ? "Subject" : "Subjects"} · {c.branches.size} Campus {c.branches.size === 1 ? "Branch" : "Branches"}
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
                              {c.total}
                            </span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-emerald-500/10">
                            <span className="text-[10px] uppercase text-emerald-600 font-medium block">
                              100% Done
                            </span>
                            <span className="text-xs font-bold text-emerald-600 mt-0.5 block">
                              {c.completed}
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
                          <span className="text-text-tertiary text-[11px]">Class Progress</span>
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
                            {c.overdue > 0 ? (
                              <span className="text-rose-600 font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                {c.overdue} overdue
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-medium">On track</span>
                            )}
                          </span>
                          <span>{c.inProgress} in progress</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* LEVEL 2: SUBJECTS INSIDE SELECTED CLASS */}
          {activeLevel === 2 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Subjects in {selectedClass}
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Click any subject to view its syllabus breakdown across all branches.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search subjects (e.g. Physics)..."
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

              {subjectSummaryList.length === 0 ? (
                <div className="bg-surface rounded-2xl border border-dashed border-border p-8 text-center text-text-tertiary">
                  <p className="text-sm font-semibold text-text-primary">No subjects found</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    No active portion data found for subjects in this class.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjectSummaryList.map((sub) => {
                    const subPct =
                      sub.total > 0 ? Math.round(sub.sumPercentages / sub.total) : 0;
                    const emoji = getSubjectBadgeEmoji(sub.subjectName);

                    return (
                      <button
                        key={sub.subjectName}
                        onClick={() => {
                          setSelectedSubject(sub.subjectName);
                          setSearch("");
                        }}
                        className="group text-left bg-surface rounded-2xl border border-border/80 p-5 hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg group-hover:scale-105 group-hover:bg-primary group-hover:text-white transition-all">
                                {emoji}
                              </div>
                              <div>
                                <h3 className="font-bold text-sm text-text-primary group-hover:text-primary transition-colors">
                                  {sub.subjectName}
                                </h3>
                                <p className="text-xs text-text-tertiary">
                                  {sub.branches.size} {sub.branches.size === 1 ? "Branch" : "Branches"} · {sub.batches.size} {sub.batches.size === 1 ? "Batch" : "Batches"}
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
                                {sub.total}
                              </span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-emerald-500/10">
                              <span className="text-[10px] uppercase text-emerald-600 font-medium block">
                                100% Done
                              </span>
                              <span className="text-xs font-bold text-emerald-600 mt-0.5 block">
                                {sub.completed}
                              </span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-blue-500/10">
                              <span className="text-[10px] uppercase text-blue-600 font-medium block">
                                Progress
                              </span>
                              <span className="text-xs font-bold text-blue-600 mt-0.5 block">
                                {subPct}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-text-tertiary text-[11px]">Subject Progress</span>
                            <span className="font-bold text-text-primary text-[11px]">{subPct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${subPct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] pt-0.5 text-text-tertiary">
                            <span>
                              {sub.overdue > 0 ? (
                                <span className="text-rose-600 font-semibold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                  {sub.overdue} overdue
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-medium">On track</span>
                              )}
                            </span>
                            <span>{sub.inProgress} in progress</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* LEVEL 3: ALL BRANCHES DATA FOR SELECTED CLASS & SUBJECT */}
          {activeLevel === 3 && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="bg-surface rounded-2xl border border-border/80 p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                    {selectedSubject && getSubjectBadgeEmoji(selectedSubject)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-text-primary">
                      {selectedSubject} · {selectedClass}
                    </h3>
                    <p className="text-[11px] text-text-tertiary">
                      All campus branches progression and milestone breakdown
                    </p>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2.5">
                  <div className="relative w-full sm:w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search branch/topic..."
                      className="pl-8 text-xs rounded-xl h-8 bg-muted/20 border-border/70"
                    />
                  </div>

                  {/* Status filter toggle */}
                  <div className="inline-flex rounded-xl p-0.5 bg-muted/40 border border-border/60">
                    <button
                      onClick={() => setStatusFilter("all")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        statusFilter === "all"
                          ? "bg-surface text-text-primary shadow-xs font-semibold"
                          : "text-text-tertiary hover:text-text-secondary"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setStatusFilter("Overdue")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                        statusFilter === "Overdue"
                          ? "bg-rose-600 text-white shadow-xs font-semibold"
                          : overdueCountInSubject > 0
                          ? "text-rose-600 font-semibold hover:bg-rose-50"
                          : "text-text-tertiary hover:text-text-secondary"
                      }`}
                    >
                      <span>Overdue</span>
                      {overdueCountInSubject > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            statusFilter === "Overdue"
                              ? "bg-white text-rose-600"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {overdueCountInSubject}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setStatusFilter("Incomplete")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        statusFilter === "Incomplete"
                          ? "bg-surface text-text-primary shadow-xs font-semibold"
                          : "text-text-tertiary hover:text-text-secondary"
                      }`}
                    >
                      Incomplete
                    </button>
                    <button
                      onClick={() => setStatusFilter("Completed")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        statusFilter === "Completed"
                          ? "bg-surface text-text-primary shadow-xs font-semibold"
                          : "text-text-tertiary hover:text-text-secondary"
                      }`}
                    >
                      Completed
                    </button>
                  </div>
                </div>
              </div>

              {/* Overdue Alert Banner if subject has overdue portions */}
              {overdueCountInSubject > 0 && (
                <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-medium">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      <strong>{overdueCountInSubject} milestone portion{overdueCountInSubject > 1 ? "s" : ""}</strong> are past target completion date across branches.
                    </span>
                  </div>
                  <button
                    onClick={() => setStatusFilter(statusFilter === "Overdue" ? "all" : "Overdue")}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] transition-colors shadow-2xs"
                  >
                    {statusFilter === "Overdue" ? "Show All Portions" : "View Overdue Only"}
                  </button>
                </div>
              )}

              {/* Branch Cards Grid */}
              {branchBreakdownList.length === 0 ? (
                <div className="bg-surface rounded-2xl border border-dashed border-border p-10 text-center text-text-tertiary">
                  <p className="text-sm font-semibold text-text-primary">No branch records found</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Try changing your search query or status filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {branchBreakdownList.map((branchItem) => {
                    const avgBranchPct =
                      branchItem.total > 0
                        ? Math.round(branchItem.sumPercentages / branchItem.total)
                        : 0;

                    return (
                      <div
                        key={branchItem.branchName}
                        className="bg-surface rounded-2xl border border-border/80 shadow-xs overflow-hidden flex flex-col justify-between"
                      >
                        {/* Branch Header */}
                        <div className="p-4 bg-muted/20 border-b border-border/60 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-text-primary">
                                {branchItem.branchName}
                              </h3>
                              <span className="text-[11px] text-text-tertiary">
                                {branchItem.batches.size} {branchItem.batches.size === 1 ? "Batch" : "Batches"} · {branchItem.completed} of {branchItem.total} completed
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <div className="w-16 h-2 bg-border rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${avgBranchPct}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-text-primary">
                              {avgBranchPct}%
                            </span>
                          </div>
                        </div>

                        {/* Portion Items List inside this Branch */}
                        <div className="p-3.5 space-y-2.5">
                          {branchItem.portions.map((item) => {
                            const pct = getPortionPercentage(item);
                            const isDone = pct === 100;
                            const isOverdue =
                              !isDone && item.target_date && item.target_date < todayStr;
                            const batchName = extractBatchName(item.student_group);

                            return (
                              <div
                                key={item.name}
                                className={`rounded-xl border p-3 transition-all space-y-2 ${
                                  isDone
                                    ? "bg-emerald-500/5 border-emerald-500/20"
                                    : isOverdue
                                    ? "bg-rose-50/30 border-rose-200"
                                    : "bg-surface border-border/70 hover:border-primary/40 hover:shadow-2xs"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p
                                        className={`text-xs font-semibold truncate ${
                                          isDone
                                            ? "text-emerald-950 font-bold"
                                            : "text-text-primary"
                                        }`}
                                      >
                                        {item.portion_title}
                                      </p>
                                      {batchName && (
                                        <Badge variant="outline" className="text-[10px] py-0 px-1 border-border/80 text-text-secondary bg-muted/30">
                                          {batchName}
                                        </Badge>
                                      )}
                                      {isDone && (
                                        <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-semibold shrink-0 flex items-center gap-1">
                                          <CheckCircle2 className="w-2.5 h-2.5" />
                                          Done
                                        </span>
                                      )}
                                      {isOverdue && (
                                        <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded font-medium shrink-0">
                                          Overdue
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2.5 text-[11px] text-text-tertiary mt-1">
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
