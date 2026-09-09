"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Calendar,
  Search,
  ClipboardList,
  BarChart3,
  ChevronRight,
  Clock,
  Users,
  Building2,
  GraduationCap,
  ArrowLeft,
  X,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/hooks/useAuth";
import { useInstructorBatches } from "@/lib/hooks/useInstructorBatches";
import {
  getAssessmentPlans,
  getAssessmentGroups,
  getSubmittedAssessmentPlanNames,
} from "@/lib/api/assessment";
import type { AssessmentPlan, AssessmentGroup } from "@/lib/types/assessment";

// Helper to detect if a student group represents an individual student (One-to-One), e.g. "karthik (STU-SU EDPLY-26-025)"
function isOneToOneStudentGroup(studentGroup?: string): boolean {
  if (!studentGroup) return false;
  const trimmed = studentGroup.trim();
  if (/STU-[A-Z0-9-]+/i.test(trimmed)) return true;
  if (/one[-_\s]?to[-_\s]?one|1[-_\s]?to[-_\s]?1|1:1/i.test(trimmed)) return true;
  return false;
}

// Helper to extract a friendly batch cohort name, e.g. "Chullickal-10th State-C" -> "Batch C"
function extractBatchName(studentGroup?: string): string {
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

// Helper to extract branch from batch / exam or student group name
function extractBranchName(
  item: { custom_branch?: string; student_group?: string },
  branchLookup: Map<string, string>,
  defaultBranch?: string
): string {
  if (item.custom_branch?.trim()) return item.custom_branch.trim();
  if (item.student_group && branchLookup.has(item.student_group)) {
    return branchLookup.get(item.student_group)!;
  }
  if (item.student_group) {
    const parts = item.student_group.split("-");
    if (parts.length > 1 && parts[0].trim()) return parts[0].trim();
  }
  return defaultBranch?.trim() || "Main Campus";
}

// Helper to extract class / program name
function extractClassName(
  item: { program?: string; student_group?: string },
  classLookup: Map<string, string>
): string {
  if (item.program?.trim()) return item.program.trim();
  if (item.student_group && classLookup.has(item.student_group)) {
    return classLookup.get(item.student_group)!;
  }
  if (item.student_group) {
    const parts = item.student_group.split("-");
    if (parts.length >= 3 && parts[1].trim()) return parts[1].trim();
    if (parts.length === 2 && parts[1].trim() && parts[1].trim().length > 2) return parts[1].trim();
  }
  return "General Program";
}

function formatDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime12h(time?: string) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function InstructorExamsPage() {
  const { defaultCompany, instructorName } = useAuth();
  const { activeBatches, isLoading: batchesLoading } = useInstructorBatches();

  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");

  // Lookup maps from activeBatches
  const { batchNames, branchLookup, classLookup } = useMemo(() => {
    const names: string[] = [];
    const bLookup = new Map<string, string>();
    const cLookup = new Map<string, string>();

    for (const b of activeBatches) {
      names.push(b.name);
      if (b.custom_branch) bLookup.set(b.name, b.custom_branch);
      if (b.program) cLookup.set(b.name, b.program);
    }
    return { batchNames: names, branchLookup: bLookup, classLookup: cLookup };
  }, [activeBatches]);

  // Fetch all exams
  const { data: allExams = [], isLoading: examsLoading } = useQuery({
    queryKey: ["instructor-assessment-plans", defaultCompany],
    queryFn: () => getAssessmentPlans(),
    staleTime: 30_000,
  });

  // Filter to instructor's batches, hide one-to-one individual student groups
  const exams = useMemo(() => {
    return allExams.filter((e) => {
      if (isOneToOneStudentGroup(e.student_group)) return false;
      return batchNames.includes(e.student_group) || e.examiner === instructorName;
    });
  }, [allExams, batchNames, instructorName]);

  // Fetch submitted assessment results to accurately identify exams with entered marks
  const { data: submittedPlanNames = new Set<string>() } = useQuery<Set<string>>({
    queryKey: ["submitted-assessment-plan-names"],
    queryFn: getSubmittedAssessmentPlanNames,
    staleTime: 30_000,
  });

  // Assessment groups (exam types)
  const { data: groups = [] } = useQuery<AssessmentGroup[]>({
    queryKey: ["assessment-groups"],
    queryFn: getAssessmentGroups,
    staleTime: 30_000,
  });

  // Enriched exam items with normalized branch, class, batch, and marks-entered status
  const enrichedExams = useMemo(() => {
    return exams.map((exam) => {
      const branch = extractBranchName(exam, branchLookup, defaultCompany);
      const classLevel = extractClassName(exam, classLookup);
      const batchName = extractBatchName(exam.student_group);
      const hasMarksEntered = submittedPlanNames.has(exam.name);
      return {
        ...exam,
        normalizedBranch: branch,
        normalizedClass: classLevel,
        normalizedBatch: batchName,
        hasMarksEntered,
      };
    });
  }, [exams, branchLookup, classLookup, defaultCompany, submittedPlanNames]);

  // Combine groups from API with any exam types present in actual exams
  const availableExamTypes = useMemo(() => {
    const map = new Map<string, string>(); // lowercase key -> display name

    // Pre-populate standard / desired ones
    [
      "Weekly Exam",
      "Annual Exam",
      "Onam Exam",
      "Half Yearly Exam",
      "Quarterly Exam",
      "Test",
      "Unit Test 1",
      "Unit Test 2",
      "CWC Exam 1",
      "CWC Exam 2",
      "CWC Exam 3",
    ].forEach((name) => {
      map.set(name.toLowerCase(), name);
    });

    groups.forEach((g) => {
      const label = g.assessment_group_name || g.name;
      if (label) map.set(label.toLowerCase(), label);
      if (g.name) map.set(g.name.toLowerCase(), label);
    });

    enrichedExams.forEach((e) => {
      if (e.assessment_group && e.assessment_group.trim()) {
        const ag = e.assessment_group.trim();
        if (!map.has(ag.toLowerCase())) {
          map.set(ag.toLowerCase(), ag);
        }
      }
    });

    // Desired display priority
    const desiredOrder = [
      "Weekly Exam",
      "Annual Exam",
      "Onam Exam",
      "Half Yearly Exam",
      "Quarterly Exam",
      "Test",
      "Unit Test 1",
      "Unit Test 2",
      "CWC Exam 1",
      "CWC Exam 2",
      "CWC Exam 3",
    ];

    const values = Array.from(new Set(map.values()));
    return values.sort((a, b) => {
      const idxA = desiredOrder.indexOf(a);
      const idxB = desiredOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [groups, enrichedExams]);

  // Unique branches across instructor's exams/batches
  const allBranches = useMemo(() => {
    const set = new Set<string>();
    enrichedExams.forEach((e) => set.add(e.normalizedBranch));
    activeBatches.forEach((b) => {
      if (!isOneToOneStudentGroup(b.name)) {
        set.add(b.custom_branch?.trim() || defaultCompany || "Main Campus");
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [enrichedExams, activeBatches, defaultCompany]);

  // Auto-select branch if instructor belongs to only 1 branch
  useEffect(() => {
    if (allBranches.length === 1 && !selectedBranch) {
      setSelectedBranch(allBranches[0]);
    }
  }, [allBranches, selectedBranch]);

  // Date constants for status
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // ─────────────────────────────────────────────────────────────
  // LEVEL 1: Branch Summaries
  // ─────────────────────────────────────────────────────────────
  const branchSummaryList = useMemo(() => {
    const map = new Map<
      string,
      {
        branch: string;
        total: number;
        marksEntered: number;
        marksPending: number;
        upcoming: number;
        completed: number; // alias for marksEntered
        classes: Set<string>;
        batches: Set<string>;
      }
    >();

    enrichedExams.forEach((e) => {
      const b = e.normalizedBranch;
      if (!map.has(b)) {
        map.set(b, {
          branch: b,
          total: 0,
          marksEntered: 0,
          marksPending: 0,
          upcoming: 0,
          completed: 0,
          classes: new Set<string>(),
          batches: new Set<string>(),
        });
      }
      const entry = map.get(b)!;
      entry.total += 1;
      if (e.hasMarksEntered) {
        entry.marksEntered += 1;
        entry.completed += 1;
      } else if (e.schedule_date < todayStr) {
        entry.marksPending += 1;
      } else {
        entry.upcoming += 1;
      }
      entry.classes.add(e.normalizedClass);
      entry.batches.add(e.normalizedBatch);
    });

    const list = Array.from(map.values()).sort((a, b) =>
      a.branch.localeCompare(b.branch)
    );

    if (!search.trim() || selectedBranch) return list;
    const q = search.trim().toLowerCase();
    return list.filter((b) => b.branch.toLowerCase().includes(q));
  }, [enrichedExams, todayStr, search, selectedBranch]);

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
        marksEntered: number;
        marksPending: number;
        upcoming: number;
        completed: number;
        batches: Set<string>;
        courses: Set<string>;
      }
    >();

    enrichedExams
      .filter((e) => e.normalizedBranch === selectedBranch)
      .forEach((e) => {
        const cls = e.normalizedClass;
        if (!map.has(cls)) {
          map.set(cls, {
            classLevel: cls,
            total: 0,
            marksEntered: 0,
            marksPending: 0,
            upcoming: 0,
            completed: 0,
            batches: new Set<string>(),
            courses: new Set<string>(),
          });
        }
        const entry = map.get(cls)!;
        entry.total += 1;
        if (e.hasMarksEntered) {
          entry.marksEntered += 1;
          entry.completed += 1;
        } else if (e.schedule_date < todayStr) {
          entry.marksPending += 1;
        } else {
          entry.upcoming += 1;
        }
        entry.batches.add(e.normalizedBatch);
        if (e.course) entry.courses.add(e.course);
      });

    const list = Array.from(map.values()).sort((a, b) =>
      a.classLevel.localeCompare(b.classLevel)
    );

    if (!search.trim() || selectedClass) return list;
    const q = search.trim().toLowerCase();
    return list.filter((c) => c.classLevel.toLowerCase().includes(q));
  }, [enrichedExams, selectedBranch, todayStr, search, selectedClass]);

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
        marksEntered: number;
        marksPending: number;
        upcoming: number;
        completed: number;
        courses: Set<string>;
      }
    >();

    enrichedExams
      .filter(
        (e) =>
          e.normalizedBranch === selectedBranch &&
          e.normalizedClass === selectedClass
      )
      .forEach((e) => {
        const btc = e.normalizedBatch;
        if (!map.has(btc)) {
          map.set(btc, {
            batchName: btc,
            rawBatch: e.student_group,
            total: 0,
            marksEntered: 0,
            marksPending: 0,
            upcoming: 0,
            completed: 0,
            courses: new Set<string>(),
          });
        }
        const entry = map.get(btc)!;
        entry.total += 1;
        if (e.hasMarksEntered) {
          entry.marksEntered += 1;
          entry.completed += 1;
        } else if (e.schedule_date < todayStr) {
          entry.marksPending += 1;
        } else {
          entry.upcoming += 1;
        }
        if (e.course) entry.courses.add(e.course);
      });

    const list = Array.from(map.values()).sort((a, b) =>
      a.batchName.localeCompare(b.batchName)
    );

    if (!search.trim() || selectedBatch) return list;
    const q = search.trim().toLowerCase();
    return list.filter((b) => b.batchName.toLowerCase().includes(q));
  }, [enrichedExams, selectedBranch, selectedClass, todayStr, search, selectedBatch]);

  // ─────────────────────────────────────────────────────────────
  // LEVEL 4: Exams inside selectedBranch + selectedClass + selectedBatch
  // ─────────────────────────────────────────────────────────────
  const batchExams = useMemo(() => {
    if (!selectedBranch || !selectedClass || !selectedBatch) return [];

    return enrichedExams.filter((e) => {
      if (e.normalizedBranch !== selectedBranch) return false;
      if (e.normalizedClass !== selectedClass) return false;
      if (e.normalizedBatch !== selectedBatch) return false;

      if (groupFilter !== "all") {
        const gf = groupFilter.trim().toLowerCase();
        const eg = (e.assessment_group || "").trim().toLowerCase();
        if (eg !== gf) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const mCourse = e.course?.toLowerCase().includes(q);
        const mName = e.assessment_name?.toLowerCase().includes(q);
        const mGroup = e.assessment_group?.toLowerCase().includes(q);
        if (!mCourse && !mName && !mGroup) return false;
      }
      return true;
    });
  }, [enrichedExams, selectedBranch, selectedClass, selectedBatch, groupFilter, search]);

  // Stats calculation
  const stats = useMemo(() => {
    const marksEntered = enrichedExams.filter((e) => e.hasMarksEntered).length;
    const marksPending = enrichedExams.filter((e) => !e.hasMarksEntered && e.schedule_date < todayStr).length;
    const upcoming = enrichedExams.filter((e) => !e.hasMarksEntered && e.schedule_date >= todayStr).length;
    return {
      total: enrichedExams.length,
      marksEntered,
      marksPending,
      upcoming,
      completed: marksEntered, // backward-compatible alias
    };
  }, [enrichedExams, todayStr]);

  const isLoading = batchesLoading || examsLoading;

  // Determine active view level: 1 (Branch), 2 (Class), 3 (Batch), 4 (Exams)
  const activeLevel = selectedBatch
    ? 4
    : selectedClass
    ? 3
    : selectedBranch && allBranches.length > 1
    ? 2
    : allBranches.length === 1
    ? 2
    : 1;

  const handleResetTo = (level: 1 | 2 | 3) => {
    if (level === 1) {
      if (allBranches.length > 1) setSelectedBranch(null);
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
    <div className="space-y-6 pb-16">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Exams</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Organized branch-wise, class-wise, and batch-wise for easy mark entry
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/instructor/exams/results">
            <Button variant="outline" size="md">
              <BarChart3 className="h-4 w-4" />
              Results
            </Button>
          </Link>
        </div>
      </div>

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface rounded-2xl p-4 text-center border border-border-light shadow-2xs">
          <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
          <p className="text-xs text-text-secondary font-medium mt-1">Total Exams</p>
        </div>
        <div className="bg-success-light rounded-2xl p-4 text-center border border-success/10 shadow-2xs">
          <p className="text-2xl font-bold text-success">{stats.marksEntered}</p>
          <p className="text-xs text-success font-medium mt-1">Marks Entered</p>
        </div>
        <div className="bg-amber-500/10 rounded-2xl p-4 text-center border border-amber-500/20 shadow-2xs">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.marksPending}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">Marks Pending</p>
        </div>
        <div className="bg-brand-wash rounded-2xl p-4 text-center border border-primary/10 shadow-2xs">
          <p className="text-2xl font-bold text-primary">{stats.upcoming}</p>
          <p className="text-xs text-primary font-medium mt-1">Upcoming</p>
        </div>
      </div>

      {/* Interactive Path Tracker / Breadcrumb Bar */}
      <div className="bg-surface rounded-2xl border border-border/80 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-1.5 text-xs">
          {allBranches.length > 1 && (
            <button
              onClick={() => handleResetTo(1)}
              className={`font-semibold transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl ${
                activeLevel === 1
                  ? "bg-primary/10 text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-muted/40"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>All Branches</span>
            </button>
          )}

          {selectedBranch && (
            <>
              {allBranches.length > 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
              )}
              <button
                onClick={() => handleResetTo(2)}
                className={`font-semibold transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl ${
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
                className={`font-semibold transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl ${
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
              <span className="font-semibold text-primary bg-primary/10 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>{selectedBatch}</span>
              </span>
            </>
          )}
        </div>

        {/* Back Button */}
        {(activeLevel > 1 || (allBranches.length === 1 && activeLevel > 2)) && (
          <button
            onClick={() => {
              if (selectedBatch) setSelectedBatch(null);
              else if (selectedClass) setSelectedClass(null);
              else if (selectedBranch && allBranches.length > 1) setSelectedBranch(null);
            }}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary font-medium px-2.5 py-1 rounded-lg border border-border hover:bg-muted/40 transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && <GifLoader />}

      {/* Main Content Areas */}
      {!isLoading && (
        <>
          {/* LEVEL 1: BRANCH CARDS (when instructor teaches at > 1 branch) */}
          {activeLevel === 1 && allBranches.length > 1 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
                  <span>Select Campus Branch</span>
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-muted text-text-secondary">
                    {branchSummaryList.length} branches
                  </span>
                </h2>

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

              {branchSummaryList.length === 0 ? (
                <div className="bg-surface rounded-2xl border border-dashed border-border p-12 text-center text-text-tertiary">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-text-tertiary/60" />
                  <p className="text-sm font-semibold text-text-primary">No branch exams found</p>
                  <p className="text-xs text-text-secondary mt-1">
                    No scheduled exams match your search query.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {branchSummaryList.map((b) => (
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
                        <div className="grid grid-cols-4 gap-1 mt-4 pt-3 border-t border-border/50 text-center">
                          <div className="p-1 rounded-lg bg-muted/20">
                            <span className="text-[9px] uppercase text-text-tertiary font-medium block">
                              Total
                            </span>
                            <span className="text-xs font-bold text-text-primary mt-0.5 block">
                              {b.total}
                            </span>
                          </div>
                          <div className="p-1 rounded-lg bg-success-light border border-success/20">
                            <span className="text-[9px] uppercase text-success font-semibold block">
                              Entered
                            </span>
                            <span className="text-xs font-bold text-success mt-0.5 block">
                              {b.marksEntered}
                            </span>
                          </div>
                          <div className="p-1 rounded-lg bg-amber-500/10">
                            <span className="text-[9px] uppercase text-amber-600 dark:text-amber-400 font-medium block">
                              Pending
                            </span>
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
                              {b.marksPending}
                            </span>
                          </div>
                          <div className="p-1 rounded-lg bg-primary/10">
                            <span className="text-[9px] uppercase text-primary font-medium block">
                              Upcoming
                            </span>
                            <span className="text-xs font-bold text-primary mt-0.5 block">
                              {b.upcoming}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LEVEL 2: CLASS CARDS INSIDE BRANCH */}
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
                <div className="bg-surface rounded-2xl border border-dashed border-border p-12 text-center text-text-tertiary">
                  <GraduationCap className="w-8 h-8 mx-auto mb-2 text-text-tertiary/60" />
                  <p className="text-sm font-semibold text-text-primary">No classes found</p>
                  <p className="text-xs text-text-secondary mt-1">
                    No scheduled exams for classes in this branch.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classSummaryList.map((item) => (
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
                                {item.courses.size} {item.courses.size === 1 ? "Course" : "Courses"}
                              </p>
                            </div>
                          </div>

                          <div className="w-7 h-7 rounded-lg bg-muted/50 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center text-text-tertiary transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>

                        {/* Metric stats */}
                        <div className="grid grid-cols-4 gap-1 mt-4 pt-3 border-t border-border/50 text-center">
                          <div className="p-1 rounded-lg bg-muted/20">
                            <span className="text-[9px] uppercase text-text-tertiary font-medium block">
                              Total
                            </span>
                            <span className="text-xs font-bold text-text-primary mt-0.5 block">
                              {item.total}
                            </span>
                          </div>
                          <div className="p-1 rounded-lg bg-success-light border border-success/20">
                            <span className="text-[9px] uppercase text-success font-semibold block">
                              Entered
                            </span>
                            <span className="text-xs font-bold text-success mt-0.5 block">
                              {item.marksEntered}
                            </span>
                          </div>
                          <div className="p-1 rounded-lg bg-amber-500/10">
                            <span className="text-[9px] uppercase text-amber-600 dark:text-amber-400 font-medium block">
                              Pending
                            </span>
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
                              {item.marksPending}
                            </span>
                          </div>
                          <div className="p-1 rounded-lg bg-primary/10">
                            <span className="text-[9px] uppercase text-primary font-medium block">
                              Upcoming
                            </span>
                            <span className="text-xs font-bold text-primary mt-0.5 block">
                              {item.upcoming}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LEVEL 3: BATCH CARDS (A, B, C) INSIDE CLASS */}
          {activeLevel === 3 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Batches for {selectedClass} ({selectedBranch})
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Click a batch card to see and mark its scheduled exams.
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
                <div className="bg-surface rounded-2xl border border-dashed border-border p-12 text-center text-text-tertiary">
                  <Users className="w-8 h-8 mx-auto mb-2 text-text-tertiary/60" />
                  <p className="text-sm font-semibold text-text-primary">No batches found</p>
                  <p className="text-xs text-text-secondary mt-1">
                    No active batch exams found for this class.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {batchSummaryList.map((batch) => (
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
                                {batch.courses.size} {batch.courses.size === 1 ? "Course" : "Courses"} ·{" "}
                                {batch.total} {batch.total === 1 ? "Exam" : "Exams"}
                              </p>
                            </div>
                          </div>

                          <div className="w-7 h-7 rounded-lg bg-muted/50 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center text-text-tertiary transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>

                        {/* Metric stats */}
                        <div className="grid grid-cols-4 gap-1 mt-4 pt-3 border-t border-border/50 text-center">
                          <div className="p-1 rounded-lg bg-muted/20">
                            <span className="text-[9px] uppercase text-text-tertiary font-medium block">
                              Total
                            </span>
                            <span className="text-xs font-bold text-text-primary mt-0.5 block">
                              {batch.total}
                            </span>
                          </div>
                          <div className="p-1 rounded-lg bg-success-light border border-success/20">
                            <span className="text-[9px] uppercase text-success font-semibold block">
                              Entered
                            </span>
                            <span className="text-xs font-bold text-success mt-0.5 block">
                              {batch.marksEntered}
                            </span>
                          </div>
                          <div className="p-1 rounded-lg bg-amber-500/10">
                            <span className="text-[9px] uppercase text-amber-600 dark:text-amber-400 font-medium block">
                              Pending
                            </span>
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
                              {batch.marksPending}
                            </span>
                          </div>
                          <div className="p-1 rounded-lg bg-primary/10">
                            <span className="text-[9px] uppercase text-primary font-medium block">
                              Upcoming
                            </span>
                            <span className="text-xs font-bold text-primary mt-0.5 block">
                              {batch.upcoming}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LEVEL 4: SCHEDULED EXAMS INSIDE SELECTED BATCH */}
          {activeLevel === 4 && (
            <div className="space-y-4">
              {/* Batch Filter Bar */}
              <div className="bg-surface rounded-2xl border border-border/80 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {selectedBatch?.replace(/batch\s*/i, "").trim() || "B"}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">
                      {selectedBatch} · {selectedClass}
                    </h3>
                    <p className="text-xs text-text-tertiary">
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
                      placeholder="Search exam course..."
                      className="pl-8 text-xs rounded-xl h-8.5 bg-muted/20 border-border/70"
                    />
                  </div>

                  <select
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    className="h-8.5 rounded-xl border border-border bg-surface px-2.5 text-xs text-text-primary min-w-[150px]"
                  >
                    <option value="all">All Exam Types</option>
                    {availableExamTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Exam Cards List */}
              {batchExams.length === 0 ? (
                <div className="bg-surface rounded-2xl border border-dashed border-border p-12 text-center text-text-tertiary">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 text-text-tertiary/60" />
                  <p className="text-sm font-semibold text-text-primary">No scheduled exams found</p>
                  <p className="text-xs text-text-secondary mt-1">
                    Try adjusting your search query or exam type filter.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {batchExams.map((exam) => {
                    const isPast = exam.schedule_date < todayStr;
                    const isToday = exam.schedule_date === todayStr;

                    // Compute true status badge based on marks entry
                    let badgeVariant: "success" | "warning" | "error" | "outline" = "outline";
                    let badgeLabel = "Upcoming";

                    if (exam.hasMarksEntered) {
                      badgeVariant = "success";
                      badgeLabel = "Marks Entered";
                    } else if (isPast) {
                      badgeVariant = "warning";
                      badgeLabel = "Marks Pending";
                    } else if (isToday) {
                      badgeVariant = "warning";
                      badgeLabel = "Today";
                    } else {
                      badgeVariant = "outline";
                      badgeLabel = "Upcoming";
                    }

                    return (
                      <Link
                        key={exam.name}
                        href={`/dashboard/instructor/exams/${encodeURIComponent(exam.name)}`}
                      >
                        <Card className="hover:border-primary/40 hover:shadow-md transition-all cursor-pointer rounded-2xl border border-border/80 bg-surface">
                          <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <h3 className="font-bold text-sm text-text-primary truncate">
                                    {exam.course}
                                  </h3>
                                  <Badge
                                    variant={badgeVariant}
                                    className="text-[10px] px-2 py-0.5 font-medium"
                                  >
                                    {badgeLabel}
                                  </Badge>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary">
                                  <span className="flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5 text-text-tertiary" />
                                    {exam.assessment_group}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
                                    {formatDate(exam.schedule_date)}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-text-tertiary" />
                                    {formatTime12h(exam.from_time)} – {formatTime12h(exam.to_time)}
                                  </span>
                                  <span className="font-medium text-text-primary">
                                    Max: {exam.maximum_assessment_score}
                                  </span>
                                </div>
                              </div>

                              <div className="w-8 h-8 rounded-xl bg-muted/40 group-hover:bg-primary/10 flex items-center justify-center text-text-tertiary shrink-0">
                                <ChevronRight className="h-4 w-4" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
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

