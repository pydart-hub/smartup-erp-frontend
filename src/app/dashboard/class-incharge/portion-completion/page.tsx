"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  BookOpen,
  Users,
  Search,
  Calendar,
  AlertCircle,
  Loader2,
  GraduationCap,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Check,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/hooks/useAuth";

interface PortionStatusItem {
  name: string;
  portion_ref: string;
  branch: string;
  student_group: string;
  class_level: string;
  course: string;
  portion_title: string;
  target_date: string;
  status: "Pending" | "Completed";
  completed_on?: string;
  completed_by?: string;
  remarks?: string;
}

const SNAP_POINTS = [0, 25, 50, 75, 100];

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

// Helper to parse completion percentage from portion item
function getPortionPercentage(item: PortionStatusItem): number {
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

// Color theme helper based on completion percentage
function getProgressColor(pct: number) {
  if (pct >= 100) return { text: "text-emerald-600", bg: "bg-emerald-500", border: "border-emerald-300", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (pct >= 75) return { text: "text-indigo-600", bg: "bg-indigo-500", border: "border-indigo-300", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" };
  if (pct >= 50) return { text: "text-amber-600", bg: "bg-amber-500", border: "border-amber-300", badge: "bg-amber-50 text-amber-700 border-amber-200" };
  if (pct >= 25) return { text: "text-blue-600", bg: "bg-blue-500", border: "border-blue-300", badge: "bg-blue-50 text-blue-700 border-blue-200" };
  return { text: "text-slate-500", bg: "bg-slate-400", border: "border-slate-300", badge: "bg-muted text-text-tertiary border-border" };
}

export default function ClassInchargePortionCompletionPage() {
  const queryClient = useQueryClient();
  const { defaultCompany, allowedCompanies } = useAuth();
  const branch = defaultCompany || (allowedCompanies && allowedCompanies[0]) || "";

  // Drill-down Card Navigation State:
  // Step 1: select class (selectedClass === null -> show Classes Cards)
  // Step 2: select batch (selectedClass !== null && selectedBatch === null -> show Batches Cards)
  // Step 3: show Subject cards with portions (selectedClass !== null && selectedBatch !== null)
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Overdue" | "Incomplete" | "Completed">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Local drag values for smooth slider dragging before commit
  const [dragValues, setDragValues] = useState<Record<string, number>>({});

  // Fetch portions for this branch
  const { data: portions = [], isLoading } = useQuery<PortionStatusItem[]>({
    queryKey: ["ci-portions", branch],
    queryFn: async () => {
      if (!branch) return [];
      const res = await fetch(`/api/branch-manager/portions?branch=${encodeURIComponent(branch)}`);
      if (!res.ok) throw new Error("Failed to load branch portions");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!branch,
    staleTime: 30_000,
  });

  // Mutation to update percentage
  const updatePercentageMutation = useMutation({
    mutationFn: async ({
      statusId,
      percentage,
    }: {
      statusId: string;
      percentage: number;
    }) => {
      setUpdatingId(statusId);
      const res = await fetch("/api/branch-manager/portions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statusId,
          percentage,
          status: percentage === 100 ? "Completed" : "Pending",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update portion percentage");
      }
      return res.json();
    },
    onMutate: async ({ statusId, percentage }) => {
      await queryClient.cancelQueries({ queryKey: ["ci-portions", branch] });
      const previous = queryClient.getQueryData<PortionStatusItem[]>(["ci-portions", branch]);

      if (previous) {
        queryClient.setQueryData<PortionStatusItem[]>(
          ["ci-portions", branch],
          previous.map((item) => {
            if (item.name === statusId) {
              return {
                ...item,
                status: percentage === 100 ? "Completed" : "Pending",
                remarks: `[progress:${percentage}%]`,
                completed_on:
                  percentage === 100
                    ? new Date().toISOString().split("T")[0]
                    : undefined,
              };
            }
            return item;
          })
        );
      }
      return { previous };
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.percentage === 100
          ? "Portion marked 100% Completed!"
          : `Progress set to ${vars.percentage}%`
      );
      queryClient.invalidateQueries({ queryKey: ["ci-portions"] });
    },
    onError: (err: any, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["ci-portions", branch], context.previous);
      }
      toast.error(err.message || "Failed to update percentage");
    },
    onSettled: () => {
      setUpdatingId(null);
    },
  });

  // Stats Calculations
  const todayStr = new Date().toISOString().split("T")[0];
  const totalCount = portions.length;

  const totalSumPercentages = useMemo(() => {
    return portions.reduce((acc, p) => acc + getPortionPercentage(p), 0);
  }, [portions]);

  const completedCount = portions.filter((p) => getPortionPercentage(p) === 100).length;
  const inProgressCount = portions.filter((p) => {
    const pct = getPortionPercentage(p);
    return pct > 0 && pct < 100;
  }).length;
  const overdueCount = portions.filter((p) => {
    return getPortionPercentage(p) < 100 && p.target_date && p.target_date < todayStr;
  }).length;

  const overallRate = totalCount > 0 ? Math.round(totalSumPercentages / totalCount) : 0;

  // 1. Group by Class Level (with weighted % roll-up)
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
        batches: Set<string>;
        subjects: Set<string>;
      }
    >();

    portions.forEach((p) => {
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

    return Array.from(map.values()).sort((a, b) => a.classLevel.localeCompare(b.classLevel));
  }, [portions, todayStr]);

  // 2. Batches inside the selected Class (with weighted % roll-up)
  const batchSummaryList = useMemo(() => {
    if (!selectedClass) return [];
    const map = new Map<
      string,
      {
        batchName: string;
        total: number;
        completed: number;
        inProgress: number;
        notStarted: number;
        overdue: number;
        sumPercentages: number;
        subjects: Set<string>;
      }
    >();

    portions
      .filter((p) => (p.class_level || "Other Class") === selectedClass)
      .forEach((p) => {
        const btc = extractBatchName(p.student_group);
        if (!map.has(btc)) {
          map.set(btc, {
            batchName: btc,
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

    return Array.from(map.values()).sort((a, b) => a.batchName.localeCompare(b.batchName));
  }, [portions, selectedClass, todayStr]);

  // 3. Subjects & Portions inside Selected Class & Selected Batch
  const subjectsMap = useMemo(() => {
    if (!selectedClass || !selectedBatch) return {};

    const items = portions.filter((p) => {
      const cls = p.class_level || "Other Class";
      const btc = extractBatchName(p.student_group);
      if (cls !== selectedClass) return false;
      if (btc !== selectedBatch) return false;

      const pct = getPortionPercentage(p);
      const isDone = pct === 100;
      const isOverdue = !isDone && p.target_date && p.target_date < todayStr;

      if (statusFilter === "Completed" && !isDone) return false;
      if (statusFilter === "Incomplete" && isDone) return false;
      if (statusFilter === "Overdue" && !isOverdue) return false;

      if (search) {
        const q = search.toLowerCase();
        const mTitle = p.portion_title?.toLowerCase().includes(q);
        const mCourse = p.course?.toLowerCase().includes(q);
        if (!mTitle && !mCourse) return false;
      }
      return true;
    });

    const groups: Record<string, PortionStatusItem[]> = {};
    items.forEach((p) => {
      const sub = p.course || "General Subject";
      if (!groups[sub]) groups[sub] = [];
      groups[sub].push(p);
    });

    return groups;
  }, [portions, selectedClass, selectedBatch, statusFilter, search, todayStr]);

  // Overdue count inside selected class & batch
  const overdueCountInBatch = useMemo(() => {
    if (!selectedClass || !selectedBatch) return 0;
    return portions.filter((p) => {
      const cls = p.class_level || "Other Class";
      const btc = extractBatchName(p.student_group);
      if (cls !== selectedClass || btc !== selectedBatch) return false;
      const pct = getPortionPercentage(p);
      return pct < 100 && p.target_date && p.target_date < todayStr;
    }).length;
  }, [portions, selectedClass, selectedBatch, todayStr]);

  return (
    <div className="space-y-5 pb-16">
      <BreadcrumbNav />

      {/* Header & Overview Bar */}
      <div className="bg-surface rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Portion Completion
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/5 text-primary font-medium border border-primary/20">
              {branch || "Your Branch"}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Slide each chapter portion to set and update progress (0%, 25%, 50%, 75%, 100%).
          </p>
        </div>

        {/* Global Stats Bar */}
        <div className="flex items-center flex-wrap gap-3 sm:gap-4 bg-muted/40 px-4 py-2 rounded-xl border border-border/60 text-xs">
          <div>
            <span className="text-text-tertiary">Total: </span>
            <span className="font-semibold text-text-primary">{totalCount}</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-text-tertiary">100% Done: </span>
            <span className="font-semibold text-emerald-600">{completedCount}</span>
          </div>
          {inProgressCount > 0 && (
            <>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-text-tertiary">In Progress: </span>
                <span className="font-semibold text-blue-600">{inProgressCount}</span>
              </div>
            </>
          )}
          {overdueCount > 0 && (
            <>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-text-tertiary">Overdue: </span>
                <span className="font-semibold text-rose-600">{overdueCount}</span>
              </div>
            </>
          )}
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-text-primary">{overallRate}% Total</span>
            <div className="w-16 h-2 bg-border rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${overallRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Breadcrumb Bar */}
      <div className="bg-surface rounded-xl border border-border/80 px-4 py-2.5 flex items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setSelectedClass(null);
              setSelectedBatch(null);
            }}
            className={`font-semibold transition-colors flex items-center gap-1.5 px-2 py-1 rounded-lg ${
              !selectedClass
                ? "text-primary bg-primary/10"
                : "text-text-secondary hover:text-text-primary hover:bg-muted/50"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Classes
          </button>

          {selectedClass && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
              <button
                onClick={() => setSelectedBatch(null)}
                className={`font-semibold transition-colors flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                  !selectedBatch
                    ? "text-primary bg-primary/10"
                    : "text-text-secondary hover:text-text-primary hover:bg-muted/50"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                {selectedClass}
              </button>
            </>
          )}

          {selectedClass && selectedBatch && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
              <span className="font-semibold text-primary bg-primary/10 px-2 py-1 rounded-lg flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                {selectedBatch}
              </span>
            </>
          )}
        </div>

        {/* Back button if drilled in */}
        {(selectedClass || selectedBatch) && (
          <button
            onClick={() => {
              if (selectedBatch) setSelectedBatch(null);
              else if (selectedClass) setSelectedClass(null);
            }}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary font-medium px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        )}
      </div>

      {/* Main Interactive Views */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-text-secondary gap-3 bg-surface rounded-2xl border border-border/80">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <span className="text-xs">Loading portions for {branch}...</span>
        </div>
      ) : portions.length === 0 ? (
        <div className="py-20 text-center bg-surface rounded-2xl border border-dashed border-border/80 p-8">
          <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3 text-text-tertiary">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-text-primary">No Portions Found</h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto mt-1">
            No portions have been assigned yet to {branch}. Portions assigned by the Academic Planning department will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* STEP 1: CLASS SELECTION CARDS */}
          {!selectedClass && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <span>Select a Class</span>
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-muted text-text-secondary">
                    {classSummaryList.length} classes
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classSummaryList.map((item) => {
                  const classPct =
                    item.total > 0 ? Math.round(item.sumPercentages / item.total) : 0;

                  return (
                    <button
                      key={item.classLevel}
                      onClick={() => setSelectedClass(item.classLevel)}
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

                        {/* Portion Metrics Breakdown */}
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/50 text-center">
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

                      {/* Progress bar */}
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
                        <div className="flex items-center justify-between text-[11px] pt-0.5 text-text-tertiary">
                          <span>
                            {item.overdue > 0 ? (
                              <span className="text-rose-600 font-semibold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                {item.overdue} overdue
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-medium">On track</span>
                            )}
                          </span>
                          <span>{item.inProgress} in progress</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: BATCH SELECTION CARDS */}
          {selectedClass && !selectedBatch && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <span>{selectedClass} Batches</span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-muted text-text-secondary">
                      {batchSummaryList.length} batches
                    </span>
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Select a batch to inspect and adjust chapter completion percentages.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {batchSummaryList.map((batch) => {
                  const bPct =
                    batch.total > 0 ? Math.round(batch.sumPercentages / batch.total) : 0;

                  return (
                    <button
                      key={batch.batchName}
                      onClick={() => setSelectedBatch(batch.batchName)}
                      className="group text-left bg-surface rounded-2xl border border-border/80 p-5 hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                              <Users className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-sm text-text-primary group-hover:text-primary transition-colors">
                                {batch.batchName}
                              </h3>
                              <p className="text-xs text-text-tertiary">
                                {batch.subjects.size} {batch.subjects.size === 1 ? "Subject" : "Subjects"}
                              </p>
                            </div>
                          </div>

                          <div className="w-7 h-7 rounded-lg bg-muted/50 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center text-text-tertiary transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>

                        {/* Breakdown Metrics */}
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/50 text-center">
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
                              {bPct}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-tertiary text-[11px]">Batch Progress</span>
                          <span className="font-bold text-text-primary text-[11px]">{bPct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${bPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-0.5 text-text-tertiary">
                          <span>
                            {batch.overdue > 0 ? (
                              <span className="text-rose-600 font-semibold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                {batch.overdue} overdue
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-medium">On track</span>
                            )}
                          </span>
                          <span>{batch.inProgress} in progress</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: SUBJECT PORTIONS WITH SNAP PERCENTAGE SLIDERS */}
          {selectedClass && selectedBatch && (
            <div className="space-y-5">
              {/* Filter bar */}
              <div className="bg-surface rounded-2xl border border-border/80 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {selectedClass.slice(0, 3)}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                      <span>{selectedClass}</span>
                      <span className="text-text-tertiary">/</span>
                      <span className="text-primary">{selectedBatch}</span>
                    </h2>
                    <p className="text-[11px] text-text-secondary">
                      {Object.keys(subjectsMap).length} subjects · {overdueCountInBatch} overdue
                    </p>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  {/* Status Pills */}
                  <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/50 text-xs">
                    {(["all", "Incomplete", "Completed", "Overdue"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setStatusFilter(mode)}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                          statusFilter === mode
                            ? "bg-surface text-text-primary shadow-xs font-semibold"
                            : "text-text-tertiary hover:text-text-secondary"
                        }`}
                      >
                        {mode === "all" ? "All" : mode}
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="relative w-44">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <Input
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 text-xs h-8 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Subjects Group List */}
              {Object.keys(subjectsMap).length === 0 ? (
                <div className="py-16 text-center bg-surface rounded-2xl border border-dashed border-border/80 p-8">
                  <BookOpen className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                  <p className="font-semibold text-sm text-text-primary">No Portions Found</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    No portion items match the selected filter.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(subjectsMap).map(([subjectName, items]) => {
                    const subTotal = items.length;
                    const subDone = items.filter((i) => getPortionPercentage(i) === 100).length;
                    const subSumPct = items.reduce((acc, i) => acc + getPortionPercentage(i), 0);
                    const subProgress = subTotal > 0 ? Math.round(subSumPct / subTotal) : 0;
                    const subOverdue = items.filter((i) => {
                      const p = getPortionPercentage(i);
                      return p < 100 && i.target_date && i.target_date < todayStr;
                    }).length;

                    return (
                      <div
                        key={subjectName}
                        className="bg-surface rounded-2xl border border-border/80 overflow-hidden shadow-xs"
                      >
                        {/* Subject Header */}
                        <div className="p-4 bg-muted/20 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="font-bold text-sm text-text-primary">
                                {subjectName}
                              </h3>
                              <p className="text-xs text-text-tertiary">
                                {subDone}/{subTotal} portions finished (100%)
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {subOverdue > 0 && (
                              <Badge className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-semibold">
                                {subOverdue} overdue
                              </Badge>
                            )}

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-text-primary">
                                {subProgress}%
                              </span>
                              <div className="w-20 h-2 bg-border rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${subProgress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Portion Items */}
                        <div className="divide-y divide-border/60">
                          {items.map((item) => {
                            const storedPct = getPortionPercentage(item);
                            const displayPct =
                              dragValues[item.name] !== undefined
                                ? dragValues[item.name]
                                : storedPct;
                            const isDone = storedPct === 100;
                            const isOverdue =
                              !isDone && item.target_date && item.target_date < todayStr;
                            const isBusy = updatingId === item.name;
                            const color = getProgressColor(displayPct);

                            return (
                              <div
                                key={item.name}
                                className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-muted/10 transition-colors"
                              >
                                {/* Left Info */}
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex items-center flex-wrap gap-2">
                                    <h4 className="font-semibold text-sm text-text-primary">
                                      {item.portion_title}
                                    </h4>

                                    {/* Percentage badge */}
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] font-bold px-2 py-0.5 ${color.badge}`}
                                    >
                                      {displayPct}% Done
                                    </Badge>

                                    {isOverdue && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] font-semibold bg-rose-50 text-rose-600 border-rose-200"
                                      >
                                        Overdue
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="flex items-center flex-wrap gap-3 text-xs text-text-tertiary">
                                    {item.target_date && (
                                      <span className="flex items-center gap-1 text-[11px]">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Target:{" "}
                                        <span className="font-medium text-text-secondary">
                                          {item.target_date}
                                        </span>
                                      </span>
                                    )}

                                    {item.completed_on && isDone && (
                                      <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Done on {item.completed_on}
                                      </span>
                                    )}

                                    {item.completed_by && isDone && (
                                      <span className="text-[11px] text-text-tertiary">
                                        by {item.completed_by.split("@")[0]}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Right: Snap Slider Control & Quick Complete */}
                                <div className="w-full lg:w-72 space-y-2 shrink-0 bg-muted/20 p-3 rounded-xl border border-border/50">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-text-tertiary font-medium text-[11px]">
                                      Progress
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      {isBusy ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                      ) : null}
                                      <span className={`font-bold text-xs ${color.text}`}>
                                        {displayPct}%
                                      </span>
                                      {displayPct < 100 && (
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() => {
                                            updatePercentageMutation.mutate({
                                              statusId: item.name,
                                              percentage: 100,
                                            });
                                          }}
                                          className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-md transition-colors ml-1 cursor-pointer"
                                        >
                                          Set 100%
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Slider with step 25 */}
                                  <div className="relative pt-1 pb-1">
                                    <input
                                      type="range"
                                      min={0}
                                      max={100}
                                      step={25}
                                      disabled={isBusy}
                                      value={displayPct}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setDragValues((prev) => ({ ...prev, [item.name]: val }));
                                      }}
                                      onMouseUp={(e) => {
                                        const val = Number((e.target as HTMLInputElement).value);
                                        setDragValues((prev) => {
                                          const next = { ...prev };
                                          delete next[item.name];
                                          return next;
                                        });
                                        if (val !== storedPct) {
                                          updatePercentageMutation.mutate({
                                            statusId: item.name,
                                            percentage: val,
                                          });
                                        }
                                      }}
                                      onTouchEnd={(e) => {
                                        const val = Number((e.target as HTMLInputElement).value);
                                        setDragValues((prev) => {
                                          const next = { ...prev };
                                          delete next[item.name];
                                          return next;
                                        });
                                        if (val !== storedPct) {
                                          updatePercentageMutation.mutate({
                                            statusId: item.name,
                                            percentage: val,
                                          });
                                        }
                                      }}
                                      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted/70 accent-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                      style={{
                                        background: `linear-gradient(to right, ${
                                          displayPct >= 100
                                            ? "#10b981"
                                            : displayPct >= 75
                                            ? "#6366f1"
                                            : displayPct >= 50
                                            ? "#f59e0b"
                                            : displayPct >= 25
                                            ? "#3b82f6"
                                            : "#94a3b8"
                                        } 0%, ${
                                          displayPct >= 100
                                            ? "#10b981"
                                            : displayPct >= 75
                                            ? "#6366f1"
                                            : displayPct >= 50
                                            ? "#f59e0b"
                                            : displayPct >= 25
                                            ? "#3b82f6"
                                            : "#94a3b8"
                                        } ${displayPct}%, var(--border, #e2e8f0) ${displayPct}%, var(--border, #e2e8f0) 100%)`,
                                      }}
                                    />
                                  </div>

                                  {/* Snap markers: 0%, 25%, 50%, 75%, 100% */}
                                  <div className="flex justify-between items-center px-0.5 text-[10px] text-text-tertiary">
                                    {SNAP_POINTS.map((pt) => {
                                      const isCurrent = displayPct === pt;
                                      return (
                                        <button
                                          key={pt}
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() => {
                                            if (pt !== storedPct) {
                                              updatePercentageMutation.mutate({
                                                statusId: item.name,
                                                percentage: pt,
                                              });
                                            }
                                          }}
                                          className={`hover:text-primary transition-colors cursor-pointer flex flex-col items-center ${
                                            isCurrent
                                              ? "font-bold text-text-primary"
                                              : "text-text-tertiary"
                                          }`}
                                        >
                                          <span>{pt}%</span>
                                        </button>
                                      );
                                    })}
                                  </div>
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
