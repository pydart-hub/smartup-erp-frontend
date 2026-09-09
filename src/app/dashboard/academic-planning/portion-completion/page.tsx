"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap,
  BookOpen,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  X,
  Sparkles,
  Check,
  Eye,
  Pencil,
  Trash2,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getPrograms, getAcademicYears } from "@/lib/api/enrollment";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BranchStatus {
  name: string;
  portion_ref: string;
  branch: string;
  student_group: string;
  class_level: string;
  course: string;
  status: "Pending" | "Completed";
  completed_on?: string;
  completed_by?: string;
}

interface EnrichedPortion {
  name: string;
  class_level: string;
  course: string;
  portion_title: string;
  target_date: string;
  academic_year?: string;
  description?: string;
  creation: string;
  totalBranches: number;
  completedBranches: number;
  pendingBranches: number;
  completionRate: number;
  branchStatuses: BranchStatus[];
}

interface PortionSubject {
  name: string;
  class_level: string;
  subject_name: string;
  description?: string;
}

interface BranchItem {
  branch: string;
  classes: string[];
}

const DEFAULT_CLASSES = [
  "8th CBSE",
  "8th State",
  "9th CBSE",
  "9th State",
  "10th CBSE",
  "10th State",
  "11th Science CBSE",
  "11th Science State",
  "12th Science CBSE",
  "12th Science State",
];

// ── Helper: Grade grouping ───────────────────────────────────────────────────

function gradeKey(programName: string): string {
  if (/plus\s*one|11th/i.test(programName)) return "Plus One";
  if (/plus\s*two|12th/i.test(programName)) return "Plus Two";
  const m = programName.match(/^(\d+)(st|nd|rd|th)/i);
  if (m) return `${m[1]}th`;
  return "Other";
}

const GRADE_ORDER = ["8th", "9th", "10th", "Plus One", "Plus Two", "Other"];

function getSubjectEmoji(subject: PortionSubject): { emoji: string; cleanName: string } {
  if (subject.description && subject.description.trim().length <= 4) {
    return { emoji: subject.description.trim(), cleanName: subject.subject_name };
  }
  const match = subject.subject_name.match(/^(\p{Extended_Pictographic}|\p{Emoji}+)\s*(.+)$/u);
  if (match) {
    return { emoji: match[1], cleanName: match[2] };
  }
  return { emoji: "📚", cleanName: subject.subject_name };
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function APDPortionCompletionPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"curriculum" | "branches">("curriculum");

  // Class View States
  const [expandedProgram, setExpandedProgram] = useState<string | null>("10th State");
  const [expandedSubject, setExpandedSubject] = useState<string | null>("Biology");

  // Inspector Modal
  const [inspectPortion, setInspectPortion] = useState<EnrichedPortion | null>(null);

  // Global Schedule Modal
  const [isGlobalScheduleModalOpen, setIsGlobalScheduleModalOpen] = useState(false);
  const [globalModalClass, setGlobalModalClass] = useState("10th State");
  const [globalModalSubject, setGlobalModalSubject] = useState("");

  // All-branches dashboard query
  const { data: dashboardData, isLoading: loadingDashboard } = useQuery<{
    branches: Array<{
      branch: string;
      totalPortions: number;
      completedPortions: number;
      inProgressPortions: number;
      notStartedPortions: number;
      pendingPortions: number;
      overduePortions: number;
      averageProgress: number;
      classesCount: number;
      batchesCount: number;
    }>;
    overview: {
      totalBranches: number;
      networkTotal: number;
      networkCompleted: number;
      networkPending: number;
      networkOverdue: number;
      networkAvg: number;
    };
  }>({
    queryKey: ["all-branches-portion-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/branch-manager/portions/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard statistics");
      return res.json();
    },
    staleTime: 45_000,
  });

  // 1. Fetch Frappe programs
  const { data: frappePrograms = [], isLoading: loadingPrograms } = useQuery({
    queryKey: ["programs-list"],
    queryFn: getPrograms,
    staleTime: 5 * 60_000,
  });

  // 2. Fetch academic years
  const { data: academicYears = [] } = useQuery({
    queryKey: ["academic-years-list"],
    queryFn: getAcademicYears,
    staleTime: 5 * 60_000,
  });

  // 3. Fetch all portions
  const { data: allPortions = [], isLoading: loadingPortions } = useQuery<EnrichedPortion[]>({
    queryKey: ["apd-portions-list"],
    queryFn: async () => {
      const res = await fetch("/api/academic-planning/portions");
      if (!res.ok) throw new Error("Failed to load academic portions");
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 30_000,
  });

  // 4. Fetch all subjects
  const { data: allSubjects = [], isLoading: loadingSubjects } = useQuery<PortionSubject[]>({
    queryKey: ["portion-subjects-all"],
    queryFn: async () => {
      const res = await fetch("/api/academic-planning/subjects");
      if (!res.ok) throw new Error("Failed to load subjects");
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 30_000,
  });

  // 5. Fetch all branches with their classes
  const { data: branchList = [], isLoading: loadingBranches } = useQuery<BranchItem[]>({
    queryKey: ["academic-branches-list"],
    queryFn: async () => {
      const res = await fetch("/api/academic-planning/branches");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 60_000,
  });

  // Merge default classes with Frappe programs
  const availableClasses = useMemo(() => {
    const list = [...DEFAULT_CLASSES];
    for (const p of frappePrograms) {
      if (p.name && !list.includes(p.name)) {
        list.push(p.name);
      }
    }
    return list;
  }, [frappePrograms]);

  // Aggregate stats per program (for Class-Wise view)
  const programStats = useMemo(() => {
    const map = new Map<
      string,
      {
        subjectCount: number;
        portionCount: number;
        totalBranches: number;
        completedBranches: number;
        completionRate: number;
      }
    >();

    for (const cls of availableClasses) {
      const subjects = allSubjects.filter((s) => s.class_level === cls);
      const portions = allPortions.filter((p) => p.class_level === cls);
      const totalBr = portions.reduce((acc, p) => acc + p.totalBranches, 0);
      const compBr = portions.reduce((acc, p) => acc + p.completedBranches, 0);
      const rate = totalBr > 0 ? Math.round((compBr / totalBr) * 100) : 0;

      map.set(cls, {
        subjectCount: subjects.length,
        portionCount: portions.length,
        totalBranches: totalBr,
        completedBranches: compBr,
        completionRate: rate,
      });
    }
    return map;
  }, [availableClasses, allSubjects, allPortions]);

  // Filtered Grade Groups (for Class-Wise view)
  const gradeGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = availableClasses.filter((cls) => {
      if (!q) return true;
      if (cls.toLowerCase().includes(q)) return true;
      const hasSubject = allSubjects.some(
        (s) => s.class_level === cls && s.subject_name.toLowerCase().includes(q)
      );
      const hasPortion = allPortions.some(
        (p) =>
          p.class_level === cls &&
          (p.portion_title.toLowerCase().includes(q) ||
            p.course.toLowerCase().includes(q))
      );
      return hasSubject || hasPortion;
    });

    const map = new Map<string, string[]>();
    for (const cls of filtered) {
      const g = gradeKey(cls);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(cls);
    }

    return GRADE_ORDER.filter((g) => map.has(g)).map((g) => ({
      grade: g,
      programs: map.get(g)!.sort((a, b) => a.localeCompare(b)),
    }));
  }, [availableClasses, search, allSubjects, allPortions]);

  // Overall KPIs
  const overallKPIs = useMemo(() => {
    const totalP = allPortions.length;
    const totalSlots = allPortions.reduce((acc, p) => acc + p.totalBranches, 0);
    const compSlots = allPortions.reduce((acc, p) => acc + p.completedBranches, 0);
    const avgRate = totalSlots > 0 ? Math.round((compSlots / totalSlots) * 100) : 0;
    const pendingCount = allPortions.filter((p) => p.completionRate < 100).length;
    return { totalP, totalSlots, compSlots, avgRate, pendingCount };
  }, [allPortions]);

  // Filter branches for dashboard view
  const filteredBranchesForDashboard = useMemo(() => {
    if (!dashboardData?.branches) return [];
    if (!search.trim()) return dashboardData.branches;
    const q = search.trim().toLowerCase();
    return dashboardData.branches.filter((b) => b.branch.toLowerCase().includes(q));
  }, [dashboardData, search]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Class & Subject Portion Management
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Plan, schedule, and track syllabus completion class-wise and branch-wise.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Minimal View Toggle */}
          <div className="inline-flex rounded-xl p-1 bg-muted/60 border border-border/60 text-xs">
            <button
              onClick={() => setViewMode("curriculum")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                viewMode === "curriculum"
                  ? "bg-surface text-text-primary shadow-xs font-semibold"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Classes & Topics</span>
            </button>
            <button
              onClick={() => setViewMode("branches")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                viewMode === "branches"
                  ? "bg-surface text-text-primary shadow-xs font-semibold"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>All Branches Dashboard</span>
              {dashboardData?.branches && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold">
                  {dashboardData.branches.length}
                </span>
              )}
            </button>
          </div>

          <Button
            variant="primary"
            onClick={() => {
              setGlobalModalClass(expandedProgram || availableClasses[0]);
              setGlobalModalSubject("");
              setIsGlobalScheduleModalOpen(true);
            }}
            className="rounded-xl text-xs gap-1.5 h-10 bg-primary hover:bg-primary/90 text-white shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Schedule New Portion
          </Button>
        </div>
      </div>

      {/* Quick KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-surface rounded-xl border border-border-light shadow-sm">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider block">
            Total Milestones
          </span>
          <span className="text-xl font-bold text-text-primary mt-0.5 block">
            {viewMode === "branches" && dashboardData?.overview ? dashboardData.overview.networkTotal : overallKPIs.totalP}
          </span>
          <span className="text-[10px] text-text-tertiary block">
            {viewMode === "branches" && dashboardData?.overview
              ? `Across ${dashboardData.overview.totalBranches} branches`
              : "Across all classes"}
          </span>
        </div>

        <div className="p-3.5 bg-surface rounded-xl border border-border-light shadow-sm">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider block">
            Average Completion
          </span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {viewMode === "branches" && dashboardData?.overview ? `${dashboardData.overview.networkAvg}%` : `${overallKPIs.avgRate}%`}
          </span>
          <span className="text-[10px] text-text-tertiary block">
            {viewMode === "branches" && dashboardData?.overview
              ? `${dashboardData.overview.networkCompleted} completed portions`
              : `${overallKPIs.compSlots} of ${overallKPIs.totalSlots} branch slots`}
          </span>
        </div>

        <div className="p-3.5 bg-surface rounded-xl border border-border-light shadow-sm">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider block">
            Pending Milestones
          </span>
          <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
            {viewMode === "branches" && dashboardData?.overview ? dashboardData.overview.networkPending : overallKPIs.pendingCount}
          </span>
          <span className="text-[10px] text-text-tertiary block">Awaiting branch completion</span>
        </div>

        <div className="p-3.5 bg-surface rounded-xl border border-border-light shadow-sm">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider block">
            Active Branches
          </span>
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 block">
            {branchList.length > 0 ? branchList.length : (dashboardData?.overview?.totalBranches ?? 0)}
          </span>
          <span className="text-[10px] text-text-tertiary block">
            Active campus branches
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={viewMode === "branches" ? "Filter branch by name..." : "Filter classes, subjects, or topics…"}
          className="pl-9 text-sm rounded-xl h-10 border-border-light focus:border-primary"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Loading state */}
      {(loadingPrograms || loadingPortions || loadingBranches || loadingSubjects || (viewMode === "branches" && loadingDashboard)) && (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-xs text-text-secondary font-medium">
            Loading curriculum and branch schedules…
          </span>
        </div>
      )}

      {/* VIEW 1: ALL BRANCHES DASHBOARD */}
      {viewMode === "branches" && !loadingDashboard && (
        <div className="space-y-4">
          {filteredBranchesForDashboard.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-dashed border-border p-12 text-center text-text-tertiary">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-text-tertiary/60" />
              <p className="text-sm font-semibold text-text-primary">No branches found</p>
              <p className="text-xs text-text-secondary mt-0.5">Try adjusting your branch filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredBranchesForDashboard.map((b) => (
                <div
                  key={b.branch}
                  className="bg-surface rounded-2xl border border-border/80 p-4 shadow-2xs hover:border-primary/40 hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-text-primary">{b.branch}</h3>
                          <p className="text-[11px] text-text-tertiary">
                            {b.classesCount} Classes · {b.batchesCount} Batches
                          </p>
                        </div>
                      </div>

                      <span className="text-xs font-bold text-text-primary bg-muted/60 px-2 py-0.5 rounded-lg">
                        {b.averageProgress}%
                      </span>
                    </div>

                    {/* 3-Box Stats */}
                    <div className="grid grid-cols-3 gap-1.5 mt-3.5 text-center">
                      <div className="p-2 rounded-xl bg-muted/30">
                        <span className="text-[10px] uppercase font-semibold text-text-tertiary block">
                          Total
                        </span>
                        <span className="text-xs font-bold text-text-primary block mt-0.5">
                          {b.totalPortions}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-500/10">
                        <span className="text-[10px] uppercase font-semibold text-emerald-700 block">
                          Done
                        </span>
                        <span className="text-xs font-bold text-emerald-700 block mt-0.5">
                          {b.completedPortions}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-500/10">
                        <span className="text-[10px] uppercase font-semibold text-amber-700 block">
                          Pending
                        </span>
                        <span className="text-xs font-bold text-amber-700 block mt-0.5">
                          {b.pendingPortions}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar & overdue count */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-text-tertiary">
                      <span>Completion</span>
                      <span className="font-semibold text-text-primary">{b.averageProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${b.averageProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <span className="text-text-tertiary">
                        {b.overduePortions > 0 ? (
                          <span className="text-rose-600 font-medium">
                            {b.overduePortions} overdue
                          </span>
                        ) : (
                          <span className="text-emerald-600">On track</span>
                        )}
                      </span>
                      <span className="text-[10px] text-text-tertiary">
                        {b.inProgressPortions} in progress
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CLASS-WISE HIERARCHICAL VIEW */}
      {viewMode === "curriculum" &&
        !loadingPrograms &&
        !loadingPortions &&
        gradeGroups.map((group) => (
          <div key={group.grade} className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-tertiary px-1">
              {group.grade} Grade
            </h2>
            <div className="space-y-2">
              {group.programs.map((programName) => {
                const stats = programStats.get(programName) || {
                  subjectCount: 0,
                  portionCount: 0,
                  totalBranches: 0,
                  completedBranches: 0,
                  completionRate: 0,
                };
                const isExpanded = expandedProgram === programName;

                return (
                  <ProgramCard
                    key={programName}
                    programName={programName}
                    stats={stats}
                    isExpanded={isExpanded}
                    onToggle={() =>
                      setExpandedProgram((prev) => (prev === programName ? null : programName))
                    }
                    expandedSubject={isExpanded ? expandedSubject : null}
                    onToggleSubject={(sub) =>
                      setExpandedSubject((prev) => (prev === sub ? null : sub))
                    }
                    allPortions={allPortions}
                    allSubjects={allSubjects}
                    academicYears={academicYears}
                    onInspectBranchStatus={(portion) => setInspectPortion(portion)}
                    queryClient={queryClient}
                  />
                );
              })}
            </div>
          </div>
        ))}

      {/* MODAL 1: Schedule Portion */}
      {isGlobalScheduleModalOpen && (
        <SchedulePortionModal
          isOpen={isGlobalScheduleModalOpen}
          onClose={() => setIsGlobalScheduleModalOpen(false)}
          defaultClass={globalModalClass}
          defaultSubject={globalModalSubject}
          availableClasses={availableClasses}
          academicYears={academicYears}
          queryClient={queryClient}
        />
      )}

      {/* MODAL 2: Branch Matrix */}
      {inspectPortion && (
        <BranchMatrixModal
          portion={inspectPortion}
          onClose={() => setInspectPortion(null)}
        />
      )}
    </motion.div>
  );
}

// ── Component: Program Card (Class View) ──────────────────────────────────────

function ProgramCard({
  programName,
  stats,
  isExpanded,
  onToggle,
  expandedSubject,
  onToggleSubject,
  allPortions,
  allSubjects,
  academicYears,
  onInspectBranchStatus,
  queryClient,
}: {
  programName: string;
  stats: {
    subjectCount: number;
    portionCount: number;
    totalBranches: number;
    completedBranches: number;
    completionRate: number;
  };
  isExpanded: boolean;
  onToggle: () => void;
  expandedSubject: string | null;
  onToggleSubject: (s: string) => void;
  allPortions: EnrichedPortion[];
  allSubjects: PortionSubject[];
  academicYears: any[];
  onInspectBranchStatus: (portion: EnrichedPortion) => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const subjects = useMemo(() => {
    return allSubjects.filter((s) => s.class_level === programName);
  }, [allSubjects, programName]);

  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectEmoji, setNewSubjectEmoji] = useState("📚");

  const addSubjectMutation = useMutation({
    mutationFn: async ({ name, emoji }: { name: string; emoji: string }) => {
      const res = await fetch("/api/academic-planning/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_level: programName,
          subject_name: name.trim(),
          description: emoji || "📚",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create subject");
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast.success(`Subject "${vars.name}" created for ${programName}`);
      queryClient.invalidateQueries({ queryKey: ["portion-subjects-all"] });
      setNewSubjectName("");
      setNewSubjectEmoji("📚");
      setAddingSubject(false);
      onToggleSubject(vars.name);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create subject");
    },
  });

  return (
    <Card className="overflow-hidden border border-border-light hover:border-primary/30 transition-all rounded-xl shadow-sm">
      {/* Program Row Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-secondary/40 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-text-primary">{programName}</span>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge variant="outline" className="text-[11px] font-medium border-border-light">
            {stats.subjectCount} subject{stats.subjectCount !== 1 ? "s" : ""}
          </Badge>

          {stats.portionCount > 0 ? (
            <Badge
              className={`text-[11px] font-semibold ${
                stats.completionRate === 100
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-200"
                  : stats.completionRate > 50
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-amber-500/10 text-amber-600 border border-amber-200"
              }`}
            >
              {stats.portionCount} topic{stats.portionCount !== 1 ? "s" : ""} • {stats.completionRate}% Done
            </Badge>
          ) : (
            <span className="text-[11px] text-text-tertiary">No topics yet</span>
          )}

          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-text-tertiary transition-transform" />
          ) : (
            <ChevronRight className="h-4 w-4 text-text-tertiary transition-transform" />
          )}
        </div>
      </button>

      {/* Expanded Subjects Container */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 border-t border-border-light pt-2.5 space-y-2 bg-surface-secondary/20">
              {subjects.length === 0 && !addingSubject && (
                <div className="py-5 text-center">
                  <p className="text-xs text-text-tertiary">
                    No subjects created yet for {programName}. Add your first subject below.
                  </p>
                </div>
              )}

              {subjects.map((sub) => {
                const subjectPortions = allPortions.filter(
                  (p) => p.class_level === programName && p.course === sub.subject_name
                );

                return (
                  <SubjectRow
                    key={sub.name || sub.subject_name}
                    subject={sub}
                    programName={programName}
                    portions={subjectPortions}
                    isExpanded={expandedSubject === sub.subject_name}
                    onToggle={() => onToggleSubject(sub.subject_name)}
                    academicYears={academicYears}
                    onInspectBranchStatus={onInspectBranchStatus}
                    queryClient={queryClient}
                  />
                );
              })}

              {/* Inline Add Subject Form */}
              {addingSubject ? (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-surface border border-border-light rounded-xl space-y-2 shadow-sm"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary block">
                    New Subject for {programName}
                  </span>
                  <div className="flex gap-2">
                    <input
                      value={newSubjectEmoji}
                      onChange={(e) => setNewSubjectEmoji(e.target.value)}
                      className="w-11 h-9 rounded-lg border border-border-light bg-surface text-center text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
                      maxLength={4}
                      placeholder="📚"
                    />
                    <Input
                      autoFocus
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newSubjectName.trim()) {
                          addSubjectMutation.mutate({
                            name: newSubjectName.trim(),
                            emoji: newSubjectEmoji || "📚",
                          });
                        }
                        if (e.key === "Escape") setAddingSubject(false);
                      }}
                      placeholder="Subject name (e.g. Mathematics, Physics, English)"
                      className="flex-1 text-xs rounded-lg h-9"
                    />
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={!newSubjectName.trim() || addSubjectMutation.isPending}
                      onClick={() =>
                        newSubjectName.trim() &&
                        addSubjectMutation.mutate({
                          name: newSubjectName.trim(),
                          emoji: newSubjectEmoji || "📚",
                        })
                      }
                      className="h-9 px-3 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-white gap-1"
                    >
                      {addSubjectMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddingSubject(false)}
                      className="h-9 px-2.5 rounded-lg text-xs"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingSubject(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-text-tertiary hover:text-primary hover:bg-primary/5 border border-dashed border-border-light hover:border-primary/40 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Subject to {programName}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── Component: Subject Row (Level 3) ──────────────────────────────────────────

function SubjectRow({
  subject,
  programName,
  portions,
  isExpanded,
  onToggle,
  academicYears,
  onInspectBranchStatus,
  queryClient,
  filterBranch,
}: {
  subject: PortionSubject;
  programName: string;
  portions: EnrichedPortion[];
  isExpanded: boolean;
  onToggle: () => void;
  academicYears: any[];
  onInspectBranchStatus: (portion: EnrichedPortion) => void;
  queryClient: ReturnType<typeof useQueryClient>;
  filterBranch?: string;
}) {
  const { emoji, cleanName } = getSubjectEmoji(subject);

  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [editedSubjectName, setEditedSubjectName] = useState(cleanName);
  const [editedSubjectEmoji, setEditedSubjectEmoji] = useState(emoji);

  const [inlineAddingPortion, setInlineAddingPortion] = useState(false);
  const [newPortionTitle, setNewPortionTitle] = useState("");
  const [newTargetDate, setNewTargetDate] = useState("");

  const totalBranches = portions.reduce((acc, p) => acc + p.totalBranches, 0);
  const compBranches = portions.reduce((acc, p) => acc + p.completedBranches, 0);
  const avgCompletion = totalBranches > 0 ? Math.round((compBranches / totalBranches) * 100) : 0;

  // 1. Update Subject Mutation
  const updateSubjectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/academic-planning/subjects/${encodeURIComponent(subject.name)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject_name: editedSubjectName.trim(),
            description: editedSubjectEmoji || "📚",
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update subject");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Subject updated");
      queryClient.invalidateQueries({ queryKey: ["portion-subjects-all"] });
      setIsEditingSubject(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update subject"),
  });

  // 2. Delete Subject Mutation
  const deleteSubjectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/academic-planning/subjects/${encodeURIComponent(subject.name)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete subject");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(`Removed subject "${cleanName}"`);
      queryClient.invalidateQueries({ queryKey: ["portion-subjects-all"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete subject"),
  });

  // 3. Create Topic Mutation
  const createPortionMutation = useMutation({
    mutationFn: async (payload: {
      class_level: string;
      course: string;
      portion_title: string;
      target_date: string;
    }) => {
      const res = await fetch("/api/academic-planning/portions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to schedule topic");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(
        `Topic created & assigned across ${data.assignedGroupsCount || "all"} branch batches!`
      );
      queryClient.invalidateQueries({ queryKey: ["apd-portions-list"] });
      setNewPortionTitle("");
      setNewTargetDate("");
      setInlineAddingPortion(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to schedule topic");
    },
  });

  const handleInlineSchedulePortion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortionTitle.trim()) {
      toast.error("Please enter a topic title");
      return;
    }
    if (!newTargetDate) {
      toast.error("Please select a target completion date");
      return;
    }

    createPortionMutation.mutate({
      class_level: programName,
      course: subject.subject_name,
      portion_title: newPortionTitle.trim(),
      target_date: newTargetDate,
    });
  };

  return (
    <div className="rounded-xl border border-border-light overflow-hidden bg-surface shadow-xs">
      {/* Subject Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-surface hover:bg-surface-secondary/40 transition-colors">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <span className="text-base select-none">{emoji}</span>
          <span className="text-xs font-semibold text-text-primary">{cleanName}</span>

          <div className="flex items-center gap-1.5 ml-2">
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-border-light">
              {portions.length} topic{portions.length !== 1 ? "s" : ""}
            </Badge>

            {portions.length > 0 && (
              <Badge
                className={`text-[10px] py-0 px-1.5 font-medium ${
                  avgCompletion === 100
                    ? "bg-emerald-500/10 text-emerald-600"
                    : avgCompletion > 50
                    ? "bg-primary/10 text-primary"
                    : "bg-amber-500/10 text-amber-600"
                }`}
              >
                {avgCompletion}% branches completed
              </Badge>
            )}
          </div>
        </button>

        {/* Action buttons (Edit, Delete, Expand) */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              if (!isExpanded) onToggle();
              setInlineAddingPortion(true);
            }}
            className="h-7 px-2 text-[11px] text-primary hover:text-primary hover:bg-primary/8 rounded-lg gap-1 font-medium"
          >
            <Plus className="h-3 w-3" />
            Add Topic
          </Button>

          {/* Edit Subject */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditedSubjectName(cleanName);
              setEditedSubjectEmoji(emoji);
              setIsEditingSubject(true);
            }}
            className="p-1.5 rounded-md text-text-tertiary hover:text-primary hover:bg-primary/5 transition-colors"
            title="Edit Subject"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          {/* Delete Subject */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (
                window.confirm(
                  `Delete subject "${cleanName}"? ${
                    portions.length > 0
                      ? `This subject currently has ${portions.length} topic(s).`
                      : ""
                  }`
                )
              ) {
                deleteSubjectMutation.mutate();
              }
            }}
            disabled={deleteSubjectMutation.isPending}
            className="p-1.5 rounded-md text-text-tertiary hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Delete Subject"
          >
            {deleteSubjectMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Chevron */}
          <button
            type="button"
            onClick={onToggle}
            className="p-1 rounded-md text-text-tertiary hover:text-text-primary"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Edit Subject Inline Form */}
      <AnimatePresence>
        {isEditingSubject && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border-light bg-surface-secondary/40 p-2.5 flex items-center gap-2"
          >
            <input
              value={editedSubjectEmoji}
              onChange={(e) => setEditedSubjectEmoji(e.target.value)}
              className="w-11 h-8 rounded-lg border border-border-light bg-surface text-center text-sm focus:outline-none"
              maxLength={4}
            />
            <Input
              autoFocus
              value={editedSubjectName}
              onChange={(e) => setEditedSubjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && editedSubjectName.trim()) {
                  updateSubjectMutation.mutate();
                }
                if (e.key === "Escape") setIsEditingSubject(false);
              }}
              className="flex-1 text-xs rounded-lg h-8"
              placeholder="Subject Name"
            />
            <Button
              size="sm"
              variant="primary"
              disabled={!editedSubjectName.trim() || updateSubjectMutation.isPending}
              onClick={() => updateSubjectMutation.mutate()}
              className="h-8 px-2.5 rounded-lg text-xs bg-primary text-white"
            >
              {updateSubjectMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditingSubject(false)}
              className="h-8 px-2 rounded-lg text-xs"
            >
              <X className="h-3 w-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Topics List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border-light bg-surface-secondary/15"
          >
            <div className="p-3 space-y-2">
              {portions.length === 0 && !inlineAddingPortion && (
                <div className="py-4 text-center">
                  <p className="text-xs text-text-tertiary">
                    No topics created yet for {cleanName}.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setInlineAddingPortion(true)}
                    className="mt-2 text-xs rounded-lg gap-1"
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" />
                    Add First Topic
                  </Button>
                </div>
              )}

              {portions.map((portion, idx) => (
                <TopicItem
                  key={portion.name}
                  idx={idx}
                  portion={portion}
                  onInspectBranchStatus={onInspectBranchStatus}
                  queryClient={queryClient}
                  filterBranch={filterBranch}
                />
              ))}

              {/* Inline Add Topic Form (Streamlined: Title & Date only) */}
              {inlineAddingPortion ? (
                <motion.form
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleInlineSchedulePortion}
                  className="p-3 bg-surface border border-primary/30 rounded-xl space-y-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Add Topic to {cleanName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setInlineAddingPortion(false)}
                      className="text-text-tertiary hover:text-text-primary"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-8">
                      <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block mb-0.5">
                        Topic / Chapter Title *
                      </label>
                      <Input
                        autoFocus
                        value={newPortionTitle}
                        onChange={(e) => setNewPortionTitle(e.target.value)}
                        placeholder="e.g. Unit 1: Measurement & Units"
                        className="text-xs rounded-lg h-9"
                        required
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block mb-0.5">
                        Target Completion Date *
                      </label>
                      <Input
                        type="date"
                        value={newTargetDate}
                        onChange={(e) => setNewTargetDate(e.target.value)}
                        className="text-xs rounded-lg h-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setInlineAddingPortion(false)}
                      className="text-xs rounded-lg h-8"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={createPortionMutation.isPending}
                      className="text-xs rounded-lg h-8 bg-primary hover:bg-primary/90 text-white gap-1"
                    >
                      {createPortionMutation.isPending ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" /> Propagating to branches…
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3" /> Schedule & Assign
                        </>
                      )}
                    </Button>
                  </div>
                </motion.form>
              ) : (
                <button
                  type="button"
                  onClick={() => setInlineAddingPortion(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-text-tertiary hover:text-primary hover:bg-primary/5 border border-dashed border-border-light hover:border-primary/40 transition-all font-medium"
                >
                  <Plus className="h-3 w-3" />
                  Add Another Topic
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Component: Topic / Portion Item (Level 4) ─────────────────────────────────

function TopicItem({
  idx,
  portion,
  onInspectBranchStatus,
  queryClient,
  filterBranch,
}: {
  idx: number;
  portion: EnrichedPortion;
  onInspectBranchStatus: (portion: EnrichedPortion) => void;
  queryClient: ReturnType<typeof useQueryClient>;
  filterBranch?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(portion.portion_title);
  const [editDate, setEditDate] = useState(portion.target_date || "");

  const isOverdue =
    portion.target_date &&
    new Date(portion.target_date) < new Date() &&
    portion.completionRate < 100;

  // If in branch view, compute completion for this specific branch
  const branchBatches = useMemo(() => {
    if (!filterBranch) return null;
    return (portion.branchStatuses || []).filter((s) => s.branch === filterBranch);
  }, [portion, filterBranch]);

  const branchCompletedCount = branchBatches?.filter((b) => b.status === "Completed").length ?? 0;
  const branchTotalCount = branchBatches?.length ?? 0;

  // Update Mutation
  const updatePortionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/academic-planning/portions/${encodeURIComponent(portion.name)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            portion_title: editTitle.trim(),
            target_date: editDate,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update topic");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Topic updated");
      queryClient.invalidateQueries({ queryKey: ["apd-portions-list"] });
      setIsEditing(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update topic"),
  });

  // Delete Mutation
  const deletePortionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/academic-planning/portions/${encodeURIComponent(portion.name)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete topic");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(`Removed topic "${portion.portion_title}"`);
      queryClient.invalidateQueries({ queryKey: ["apd-portions-list"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete topic"),
  });

  return (
    <div className="rounded-lg border border-border-light bg-surface hover:border-primary/30 transition-all overflow-hidden shadow-xs">
      <div className="p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Index + Title info */}
        <div className="flex items-start gap-2.5 flex-1">
          <span className="w-5 h-5 rounded-md bg-surface-secondary text-text-secondary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
            {idx + 1}
          </span>
          <div className="space-y-0.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-text-primary">
                {portion.portion_title}
              </span>
              {isOverdue && (
                <Badge className="bg-rose-500/10 text-rose-600 border border-rose-200 text-[10px] py-0 px-1 font-medium gap-0.5">
                  <AlertTriangle className="h-2.5 w-2.5" /> Overdue
                </Badge>
              )}
              {filterBranch && branchBatches && (
                <Badge
                  className={`text-[10px] py-0 px-1.5 font-semibold ${
                    branchCompletedCount === branchTotalCount && branchTotalCount > 0
                      ? "bg-emerald-600 text-white"
                      : branchCompletedCount > 0
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-amber-100 text-amber-800 border-amber-200"
                  }`}
                >
                  {filterBranch}: {branchCompletedCount}/{branchTotalCount} Batches Done
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-text-tertiary pt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-primary" />
                Target: <strong className="text-text-secondary">{portion.target_date || "Not set"}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Progress & Actions */}
        <div className="flex items-center gap-2.5 justify-between md:justify-end shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-border-light">
          <div className="w-28 space-y-1 text-right">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="text-text-tertiary text-[10px]">All Branches</span>
              <span
                className={
                  portion.completionRate === 100
                    ? "text-emerald-600 font-bold"
                    : portion.completionRate > 50
                    ? "text-primary font-bold"
                    : "text-amber-600 font-bold"
                }
              >
                {portion.completionRate}%
              </span>
            </div>
            <div className="w-full bg-border-light rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  portion.completionRate === 100 ? "bg-emerald-500" : "bg-primary"
                }`}
                style={{ width: `${portion.completionRate}%` }}
              />
            </div>
            <span className="text-[10px] text-text-tertiary block">
              {portion.completedBranches}/{portion.totalBranches} Branches
            </span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onInspectBranchStatus(portion)}
            className="h-8 px-2.5 rounded-lg text-xs gap-1 border-border-light hover:border-primary/40 text-text-secondary"
          >
            <Eye className="h-3.5 w-3.5 text-primary" />
            Branch Status
          </Button>

          {/* Edit Topic */}
          <button
            type="button"
            onClick={() => {
              setEditTitle(portion.portion_title);
              setEditDate(portion.target_date || "");
              setIsEditing(!isEditing);
            }}
            className="p-1.5 rounded-md text-text-tertiary hover:text-primary hover:bg-primary/5 transition-colors"
            title="Edit Topic"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          {/* Delete Topic */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete topic "${portion.portion_title}"?`)) {
                deletePortionMutation.mutate();
              }
            }}
            disabled={deletePortionMutation.isPending}
            className="p-1.5 rounded-md text-text-tertiary hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Delete Topic"
          >
            {deletePortionMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Inline Edit Form */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-3 border-t border-border-light bg-surface-secondary/40 space-y-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-8">
                <label className="text-[10px] font-semibold text-text-secondary block mb-0.5">
                  Topic Title
                </label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="text-[10px] font-semibold text-text-secondary block mb-0.5">
                  Target Date
                </label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="h-7 text-xs rounded-lg"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={!editTitle.trim() || updatePortionMutation.isPending}
                onClick={() => updatePortionMutation.mutate()}
                className="h-7 text-xs rounded-lg bg-primary text-white"
              >
                {updatePortionMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Component: Global Schedule Modal ──────────────────────────────────────────

function SchedulePortionModal({
  isOpen,
  onClose,
  defaultClass,
  defaultSubject,
  availableClasses,
  academicYears,
  queryClient,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultClass: string;
  defaultSubject: string;
  availableClasses: string[];
  academicYears: any[];
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [modalClass, setModalClass] = useState(defaultClass || availableClasses[0]);
  const [modalSubject, setModalSubject] = useState(defaultSubject || "");
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const [inlineSubjectMode, setInlineSubjectMode] = useState(false);
  const [inlineSubjectInput, setInlineSubjectInput] = useState("");
  const [inlineSubjectEmoji, setInlineSubjectEmoji] = useState("📚");

  const { data: modalClassSubjects = [] } = useQuery<PortionSubject[]>({
    queryKey: ["portion-subjects", modalClass],
    queryFn: async () => {
      if (!modalClass) return [];
      const res = await fetch(
        `/api/academic-planning/subjects?class_level=${encodeURIComponent(modalClass)}`
      );
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!modalClass,
    staleTime: 30_000,
  });

  React.useEffect(() => {
    if (modalClassSubjects.length > 0 && !modalSubject && !inlineSubjectMode) {
      setModalSubject(modalClassSubjects[0].subject_name);
    }
  }, [modalClassSubjects, modalSubject, inlineSubjectMode]);

  const createSubjectMutation = useMutation({
    mutationFn: async ({ class_level, subject_name, emoji }: { class_level: string; subject_name: string; emoji: string }) => {
      const res = await fetch("/api/academic-planning/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_level, subject_name, description: emoji || "📚" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create subject");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portion-subjects-all"] });
    },
  });

  const createPortionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/academic-planning/portions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to schedule topic");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(
        `Topic scheduled and assigned across ${data.assignedGroupsCount || "all"} branch batches!`
      );
      queryClient.invalidateQueries({ queryKey: ["apd-portions-list"] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to schedule topic");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubject = inlineSubjectMode ? inlineSubjectInput.trim() : modalSubject.trim();

    if (!modalClass) {
      toast.error("Please select a Class");
      return;
    }
    if (!finalSubject) {
      toast.error("Please select or enter a Subject");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a Topic Title");
      return;
    }
    if (!targetDate) {
      toast.error("Please select a Target Completion Date");
      return;
    }

    if (inlineSubjectMode && inlineSubjectInput.trim()) {
      createSubjectMutation.mutate({
        class_level: modalClass,
        subject_name: inlineSubjectInput.trim(),
        emoji: inlineSubjectEmoji || "📚",
      });
    }

    createPortionMutation.mutate({
      class_level: modalClass,
      course: finalSubject,
      portion_title: title.trim(),
      target_date: targetDate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Schedule New Topic / Portion
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Automatically creates branch status tracking records across all active batches.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary p-1 rounded-lg hover:bg-surface-hover"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {/* Class Selector */}
          <div>
            <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
              Class / Program *
            </label>
            <select
              value={modalClass}
              onChange={(e) => {
                setModalClass(e.target.value);
                setModalSubject("");
                setInlineSubjectMode(false);
              }}
              className="w-full text-xs font-semibold border border-border rounded-xl px-3 py-2 bg-surface text-text-primary h-10 focus:outline-none focus:border-primary"
              required
            >
              {availableClasses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                Subject *
              </label>
              <button
                type="button"
                onClick={() => {
                  setInlineSubjectMode(!inlineSubjectMode);
                  setInlineSubjectInput("");
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {inlineSubjectMode ? "← Select Existing" : "+ Create New Subject"}
              </button>
            </div>

            {inlineSubjectMode ? (
              <div className="flex gap-2">
                <input
                  value={inlineSubjectEmoji}
                  onChange={(e) => setInlineSubjectEmoji(e.target.value)}
                  className="w-11 h-10 rounded-xl border border-border-light bg-surface text-center text-base focus:outline-none"
                  maxLength={4}
                />
                <Input
                  value={inlineSubjectInput}
                  onChange={(e) => setInlineSubjectInput(e.target.value)}
                  placeholder={`Enter subject name for ${modalClass} (e.g. Physics)`}
                  className="flex-1 text-xs rounded-xl h-10 border-primary/40 focus:border-primary"
                  autoFocus
                />
              </div>
            ) : (
              <select
                value={modalSubject}
                onChange={(e) => setModalSubject(e.target.value)}
                className="w-full text-xs font-semibold border border-border rounded-xl px-3 py-2 bg-surface text-text-primary h-10 focus:outline-none focus:border-primary"
                required
              >
                <option value="">Select Subject...</option>
                {modalClassSubjects.map((s) => (
                  <option key={s.name || s.subject_name} value={s.subject_name}>
                    {s.subject_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Portion Title */}
          <div>
            <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
              Topic / Portion Title *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Unit 2: Periodic Table & Chemical Bonding"
              className="text-xs rounded-xl h-10"
              required
            />
          </div>

          {/* Target Date */}
          <div>
            <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
              Target Completion Date *
            </label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="text-xs rounded-xl h-10"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createPortionMutation.isPending}
              className="rounded-xl text-xs h-9 bg-primary hover:bg-primary/90 text-white gap-1.5"
            >
              {createPortionMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Propagating…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Schedule Topic
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Component: Branch Matrix Modal (Inspector - Grouped by Branch) ───────────

function BranchMatrixModal({
  portion,
  onClose,
}: {
  portion: EnrichedPortion;
  onClose: () => void;
}) {
  const [filterQuery, setFilterQuery] = useState("");
  const statuses = portion.branchStatuses || [];

  // Group statuses by Branch (Clean and Organized)
  const branchGroups = useMemo(() => {
    const map = new Map<string, BranchStatus[]>();
    for (const st of statuses) {
      const b = st.branch || "General";
      if (!map.has(b)) map.set(b, []);
      map.get(b)!.push(st);
    }
    const q = filterQuery.toLowerCase().trim();
    const result: { branch: string; statuses: BranchStatus[]; completedCount: number }[] = [];

    for (const [branch, items] of map.entries()) {
      const filteredItems = q
        ? items.filter(
            (i) =>
              branch.toLowerCase().includes(q) ||
              i.student_group.toLowerCase().includes(q) ||
              i.status.toLowerCase().includes(q)
          )
        : items;

      if (filteredItems.length > 0) {
        const completedCount = filteredItems.filter((i) => i.status === "Completed").length;
        result.push({
          branch,
          statuses: filteredItems,
          completedCount,
        });
      }
    }
    return result.sort((a, b) => a.branch.localeCompare(b.branch));
  }, [statuses, filterQuery]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface border border-border w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary font-semibold text-[10px] rounded-md">
                {portion.class_level}
              </Badge>
              <Badge className="bg-indigo-500/10 text-indigo-600 font-semibold text-[10px] rounded-md">
                {portion.course}
              </Badge>
            </div>
            <h3 className="text-base font-bold text-text-primary mt-1">
              {portion.portion_title}
            </h3>
            <span className="text-[11px] text-text-tertiary">
              Target: {portion.target_date || "Not set"} • {portion.completedBranches} of {portion.totalBranches} Batches Completed ({portion.completionRate}%)
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary p-1 rounded-lg hover:bg-surface-hover"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-border-light bg-surface-secondary/30 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <Input
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search branch name or batch section…"
              className="pl-8 text-xs rounded-xl h-8"
            />
          </div>
        </div>

        {/* Branch-wise List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {branchGroups.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-tertiary">
              No matching branch records found.
            </div>
          ) : (
            branchGroups.map((bg) => {
              const allDone = bg.completedCount === bg.statuses.length && bg.statuses.length > 0;
              return (
                <div
                  key={bg.branch}
                  className="rounded-xl border border-border-light bg-surface overflow-hidden shadow-xs"
                >
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-surface-secondary/40 border-b border-border-light">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs font-bold text-text-primary">{bg.branch}</span>
                    </div>
                    <Badge
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        allDone
                          ? "bg-emerald-600 text-white"
                          : bg.completedCount > 0
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200"
                      }`}
                    >
                      {bg.completedCount} of {bg.statuses.length} Batches Done
                    </Badge>
                  </div>

                  <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {bg.statuses.map((b) => {
                      const isDone = b.status === "Completed";
                      return (
                        <div
                          key={b.name}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                            isDone
                              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40"
                              : "bg-surface border-border-light"
                          }`}
                        >
                          <div className="space-y-0.5 overflow-hidden">
                            <span className="font-bold block truncate text-text-primary text-[11px]">
                              {b.student_group.replace(new RegExp(`^${bg.branch}\\s*[-–]?\\s*`, "i"), "").replace(new RegExp(`^${portion.class_level}\\s*[-–]?\\s*`, "i"), "") || b.student_group}
                            </span>
                            <span className="text-[10px] text-text-tertiary block truncate">
                              {b.student_group}
                            </span>
                            {isDone && b.completed_on && (
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block truncate font-medium">
                                Done: {b.completed_on}
                              </span>
                            )}
                          </div>
                          <Badge
                            className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                              isDone ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-800 border-amber-200"
                            }`}
                          >
                            {b.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-border flex justify-end shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="text-xs rounded-xl h-8"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
