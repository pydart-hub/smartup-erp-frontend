"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Loader2,
  Calendar,
  Clock,
  Hash,
  BookOpen,
  Users,
  FileText,
  Building2,
  Trash2,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronRight,
  Filter,
  ArrowDown,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import { getBranches } from "@/lib/api/enrollment";
import type { AssessmentGroup } from "@/lib/types/assessment";

interface StudentGroupItem {
  name: string;
  student_group_name: string;
  program: string;
  custom_branch?: string;
  custom_subject?: string;
}

interface CourseItem {
  course: string;
  course_name: string;
}

export default function CurriculumCreateExamPage() {
  const router = useRouter();

  // 1. Common Exam Configuration
  const [assessmentGroup, setAssessmentGroup] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [fromTime, setFromTime] = useState("09:00");
  const [toTime, setToTime] = useState("12:00");
  const [maxScore, setMaxScore] = useState("100");

  // 2. Multi-Branch & Class Selection
  const [addedBranches, setAddedBranches] = useState<string[]>([]);
  const [branchToSelect, setBranchToSelect] = useState("");
  const [branchGroupsMap, setBranchGroupsMap] = useState<Record<string, StudentGroupItem[]>>({});
  const [loadingBranches, setLoadingBranches] = useState<Record<string, boolean>>({});
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  // 3. Program -> Course Mapping & Per-Class Overrides
  const [programCoursesMap, setProgramCoursesMap] = useState<Record<string, CourseItem[]>>({});
  const [loadingPrograms, setLoadingPrograms] = useState<Record<string, boolean>>({});
  const [programSubjectMap, setProgramSubjectMap] = useState<Record<string, string>>({});
  const [programTopicMap, setProgramTopicMap] = useState<Record<string, string>>({});
  const [classSubjectOverrides, setClassSubjectOverrides] = useState<Record<string, string>>({});
  const [classTopicOverrides, setClassTopicOverrides] = useState<Record<string, string>>({});
  const [showPerClassCustomization, setShowPerClassCustomization] = useState(false);

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    staleTime: 120_000,
  });

  // Fetch Assessment Groups (Exam Types)
  const { data: groups = [] } = useQuery<AssessmentGroup[]>({
    queryKey: ["assessment-groups-curriculum"],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Assessment Group",
          method: "GET",
          payload: {
            fields: JSON.stringify(["name", "assessment_group_name", "parent_assessment_group"]),
            limit_page_length: "200",
          },
        }),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      return (res.data ?? []).filter(
        (g: any) =>
          g.name !== "All Assessment Groups" &&
          g.assessment_group_name !== "All Assessment Groups",
      );
    },
    staleTime: 120_000,
  });

  // Fetch courses for a specific program
  async function loadCoursesForProgram(progName: string) {
    if (!progName || programCoursesMap[progName] || loadingPrograms[progName]) return;
    setLoadingPrograms((prev) => ({ ...prev, [progName]: true }));
    try {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: `resource/Program/${encodeURIComponent(progName)}`,
          method: "GET",
        }),
      }).then((r) => r.json());

      const rawCourses = res.data?.courses || [];
      const courseItems: CourseItem[] = Array.from(
        new Map<string, CourseItem>(
          rawCourses.map((c: any) => [c.course, { course: c.course, course_name: c.course_name || c.course }]),
        ).values(),
      );

      setProgramCoursesMap((prev) => ({ ...prev, [progName]: courseItems }));
      if (courseItems.length > 0) {
        setProgramSubjectMap((prev) => ({
          ...prev,
          [progName]: prev[progName] || courseItems[0].course,
        }));
      }
    } catch (err: any) {
      console.error(`Failed to load courses for ${progName}:`, err);
    } finally {
      setLoadingPrograms((prev) => ({ ...prev, [progName]: false }));
    }
  }

  // Load student groups for a branch
  async function loadBranchClasses(branchName: string) {
    if (branchGroupsMap[branchName]) return;
    setLoadingBranches((prev) => ({ ...prev, [branchName]: true }));
    try {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Student Group",
          method: "GET",
          payload: {
            fields: JSON.stringify([
              "name",
              "student_group_name",
              "program",
              "custom_branch",
              "custom_subject",
            ]),
            filters: JSON.stringify([["custom_branch", "=", branchName]]),
            limit_page_length: "200",
          },
        }),
      }).then((r) => r.json());

      const raw = res.data ?? [];
      const nonSubjectGroups: StudentGroupItem[] = raw.filter((sg: any) => !sg.custom_subject);
      setBranchGroupsMap((prev) => ({ ...prev, [branchName]: nonSubjectGroups }));

      // Pre-fetch courses for all programs in this branch
      const programs = Array.from(new Set(nonSubjectGroups.map((g) => g.program).filter(Boolean)));
      programs.forEach((prog) => loadCoursesForProgram(prog));
    } catch (err: any) {
      toast.error(`Failed to load classes for ${branchName}: ${err.message}`);
    } finally {
      setLoadingBranches((prev) => ({ ...prev, [branchName]: false }));
    }
  }

  // Add branch
  function handleAddBranch(branchName: string) {
    if (!branchName) return;
    if (addedBranches.includes(branchName)) {
      toast.info(`${branchName} is already added.`);
      setBranchToSelect("");
      return;
    }
    setAddedBranches((prev) => [...prev, branchName]);
    loadBranchClasses(branchName);
    setBranchToSelect("");
  }

  // Remove branch
  function handleRemoveBranch(branchName: string) {
    setAddedBranches((prev) => prev.filter((b) => b !== branchName));
    const classesOfBranch = branchGroupsMap[branchName] || [];
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      classesOfBranch.forEach((c) => next.delete(c.name));
      return next;
    });
  }

  // Toggle single class
  function toggleClass(className: string, programName?: string) {
    if (programName) {
      loadCoursesForProgram(programName);
    }
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(className)) {
        next.delete(className);
      } else {
        next.add(className);
      }
      return next;
    });
  }

  // Select all in branch
  function selectAllInBranch(branchName: string) {
    const classes = branchGroupsMap[branchName] || [];
    const filtered =
      gradeFilter === "all"
        ? classes
        : classes.filter((c) => c.program?.toLowerCase().includes(gradeFilter.toLowerCase()));

    filtered.forEach((c) => {
      if (c.program) loadCoursesForProgram(c.program);
    });

    setSelectedGroups((prev) => {
      const next = new Set(prev);
      filtered.forEach((c) => next.add(c.name));
      return next;
    });
  }

  // Deselect all in branch
  function deselectAllInBranch(branchName: string) {
    const classes = branchGroupsMap[branchName] || [];
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      classes.forEach((c) => next.delete(c.name));
      return next;
    });
  }

  // Select all globally
  function selectAllGlobally() {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      addedBranches.forEach((b) => {
        const classes = branchGroupsMap[b] || [];
        const filtered =
          gradeFilter === "all"
            ? classes
            : classes.filter((c) => c.program?.toLowerCase().includes(gradeFilter.toLowerCase()));
        filtered.forEach((c) => {
          if (c.program) loadCoursesForProgram(c.program);
          next.add(c.name);
        });
      });
      return next;
    });
  }

  // Clear selections
  function clearAllSelections() {
    setSelectedGroups(new Set());
  }

  // Map of all loaded classes
  const allLoadedClasses = useMemo(() => {
    const map: Record<string, StudentGroupItem> = {};
    Object.values(branchGroupsMap).forEach((groups) => {
      groups.forEach((g) => {
        map[g.name] = g;
      });
    });
    return map;
  }, [branchGroupsMap]);

  // Selected classes grouped by program
  const selectedByProgram = useMemo(() => {
    const grouped: Record<string, StudentGroupItem[]> = {};
    Array.from(selectedGroups).forEach((groupId) => {
      const item = allLoadedClasses[groupId] || {
        name: groupId,
        student_group_name: groupId,
        program: "General",
      };
      const prog = item.program || "General";
      if (!grouped[prog]) grouped[prog] = [];
      grouped[prog].push(item);
    });
    return grouped;
  }, [selectedGroups, allLoadedClasses]);

  // Available programs
  const availablePrograms = useMemo(() => {
    const set = new Set<string>();
    Object.values(branchGroupsMap).forEach((groups) => {
      groups.forEach((g) => {
        if (g.program) set.add(g.program);
      });
    });
    return Array.from(set).sort();
  }, [branchGroupsMap]);

  useEffect(() => {
    Object.keys(selectedByProgram).forEach((prog) => {
      if (prog !== "General") loadCoursesForProgram(prog);
    });
  }, [selectedByProgram]);

  const effectiveCourseForGroup = (sg: StudentGroupItem) => {
    return classSubjectOverrides[sg.name] || programSubjectMap[sg.program] || "";
  };

  const effectiveTopicForGroup = (sg: StudentGroupItem) => {
    return classTopicOverrides[sg.name] || programTopicMap[sg.program] || "";
  };

  const branchCounts = useMemo(() => {
    const counts: Record<string, { total: number; selected: number }> = {};
    addedBranches.forEach((b) => {
      const classes = branchGroupsMap[b] || [];
      const selected = classes.filter((c) => selectedGroups.has(c.name)).length;
      counts[b] = { total: classes.length, selected };
    });
    return counts;
  }, [addedBranches, branchGroupsMap, selectedGroups]);

  const branchesWithSelection = addedBranches.filter(
    (b) => (branchCounts[b]?.selected ?? 0) > 0,
  ).length;

  // Bulk publish mutation
  const bulkCreateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/exams/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: (res) => {
      if (res.failedCount === 0) {
        toast.success(
          `Successfully published ${assessmentGroup} for all ${res.createdCount} classes!`,
        );
        router.push("/dashboard/curriculum-dept/marks-entry");
      } else if (res.createdCount > 0) {
        toast.warning(
          `Published ${res.createdCount} exams, but ${res.failedCount} had timetable conflicts.`,
        );
        router.push("/dashboard/curriculum-dept/marks-entry");
      } else {
        toast.error(`Failed to publish: ${res.failed[0]?.reason || "Validation error"}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to publish exams");
    },
  });

  const isSubmitting = bulkCreateMutation.isPending;

  function handlePublish(e: React.FormEvent) {
    e.preventDefault();

    if (!assessmentGroup) {
      toast.error("Please select an Exam Name (e.g. Weekly Exam).");
      return;
    }
    if (!scheduleDate || !fromTime || !toTime) {
      toast.error("Please specify exam date and schedule times.");
      return;
    }
    if (selectedGroups.size === 0) {
      toast.error("Please select at least one class to publish to.");
      return;
    }

    const groupCourses: Record<string, string> = {};
    const groupTopics: Record<string, string> = {};
    const unassignedClasses: string[] = [];

    Array.from(selectedGroups).forEach((groupId) => {
      const sg = allLoadedClasses[groupId];
      if (!sg) return;
      const course = effectiveCourseForGroup(sg);
      const topic = effectiveTopicForGroup(sg);

      if (!course) {
        unassignedClasses.push(sg.student_group_name || sg.name);
      } else {
        groupCourses[groupId] = course;
        if (topic) groupTopics[groupId] = topic;
      }
    });

    if (unassignedClasses.length > 0) {
      toast.error(
        `Please choose a subject for: ${unassignedClasses.slice(0, 3).join(", ")}${
          unassignedClasses.length > 3 ? "..." : ""
        }`,
      );
      return;
    }

    bulkCreateMutation.mutate({
      student_groups: Array.from(selectedGroups),
      group_courses: groupCourses,
      group_topics: groupTopics,
      assessment_group: assessmentGroup,
      schedule_date: scheduleDate,
      from_time: fromTime,
      to_time: toTime,
      maximum_assessment_score: Number(maxScore),
    });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8 selection:bg-primary selection:text-white">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Curriculum Unified Publisher
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Publish Exam in Single Schedule
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Choose branches and classes, match their respective subjects, and publish unified exams in one operation.
          </p>
        </div>

        {/* Global Counter Badge */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
            {selectedGroups.size}
          </div>
          <div className="text-xs">
            <p className="font-semibold text-text-primary">
              {selectedGroups.size} {selectedGroups.size === 1 ? "Class" : "Classes"} Selected
            </p>
            <p className="text-text-tertiary">
              Across {branchesWithSelection} {branchesWithSelection === 1 ? "Branch" : "Branches"}
            </p>
          </div>
          {selectedGroups.size > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                document.getElementById("step-3-subjects")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="ml-2 text-xs gap-1 h-8"
            >
              Choose Subjects <ArrowDown className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={handlePublish} className="space-y-6">
        {/* Step 1: Unified Schedule & Exam Type */}
        <div className="space-y-4">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 py-4 px-6">
              <CardTitle className="text-base font-bold text-text-primary flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                1. Unified Schedule & Exam Type
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Exam Name (Assessment Group) */}
                <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <label className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-text-tertiary" />
                    Exam Name <span className="text-error">*</span>
                  </label>
                  <select
                    value={assessmentGroup}
                    onChange={(e) => setAssessmentGroup(e.target.value)}
                    required
                    className="h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  >
                    <option value="">Select exam name...</option>
                    {groups.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.assessment_group_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-text-tertiary" />
                    Date <span className="text-error">*</span>
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    required
                    className="h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>

                {/* Time Range */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-text-tertiary" />
                    From Time <span className="text-error">*</span>
                  </label>
                  <input
                    type="time"
                    value={fromTime}
                    onChange={(e) => setFromTime(e.target.value)}
                    required
                    className="h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-text-tertiary" />
                    To Time <span className="text-error">*</span>
                  </label>
                  <input
                    type="time"
                    value={toTime}
                    onChange={(e) => setToTime(e.target.value)}
                    required
                    className="h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>

              {/* Max Score */}
              <div className="max-w-xs">
                <label className="text-sm font-semibold text-text-primary flex items-center gap-1.5 mb-1.5">
                  <Hash className="h-4 w-4 text-text-tertiary" />
                  Subject Total Score <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  required
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step 2: Choose Branches and Select Classes */}
        <div className="space-y-4">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 py-4 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base font-bold text-text-primary flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                2. Target Branches & Classes
              </CardTitle>

              {addedBranches.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllGlobally}
                    className="text-xs gap-1.5 h-8"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-primary" />
                    Select All Classes
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAllSelections}
                    className="text-xs gap-1.5 h-8 text-text-tertiary hover:text-error"
                  >
                    <Square className="w-3.5 h-3.5" />
                    Clear All
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Branch Selector Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50/80 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Choose Branch to Add to This Schedule
                  </label>
                  <select
                    value={branchToSelect}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) handleAddBranch(val);
                    }}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  >
                    <option value="">Select branch to add...</option>
                    {branches
                      .filter((b) => !addedBranches.includes(b.name))
                      .map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                  </select>
                </div>

                {availablePrograms.length > 0 && (
                  <div className="sm:w-64">
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                      <Filter className="inline w-3 h-3 mr-1" /> Filter Grade / Program
                    </label>
                    <select
                      value={gradeFilter}
                      onChange={(e) => setGradeFilter(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    >
                      <option value="all">All Grades / Programs</option>
                      {availablePrograms.map((prog) => (
                        <option key={prog} value={prog}>
                          {prog}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Added Branches */}
              {addedBranches.length === 0 ? (
                <div className="p-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Building2 className="mx-auto h-10 w-10 text-text-tertiary/40 mb-3" />
                  <p className="text-sm font-semibold text-text-primary">No branches added yet</p>
                  <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                    Select a branch from the dropdown above to view its classes and choose batches for this exam schedule.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {addedBranches.map((branchName) => {
                    const classes = branchGroupsMap[branchName] || [];
                    const isLoading = loadingBranches[branchName];
                    const filteredClasses =
                      gradeFilter === "all"
                        ? classes
                        : classes.filter((c) =>
                            c.program?.toLowerCase().includes(gradeFilter.toLowerCase()),
                          );
                    const stats = branchCounts[branchName] || { total: 0, selected: 0 };

                    return (
                      <div
                        key={branchName}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-xs"
                      >
                        {/* Branch Header */}
                        <div className="p-4 bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-text-primary">{branchName}</h3>
                              <p className="text-xs text-text-tertiary">
                                {stats.selected} of {stats.total} classes selected
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => selectAllInBranch(branchName)}
                              className="h-7 text-xs px-2.5"
                              disabled={isLoading || classes.length === 0}
                            >
                              Select All
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => deselectAllInBranch(branchName)}
                              className="h-7 text-xs px-2.5"
                              disabled={isLoading || stats.selected === 0}
                            >
                              Deselect All
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveBranch(branchName)}
                              className="h-7 text-xs px-2 text-text-tertiary hover:text-error hover:bg-error/10"
                              title="Remove branch from schedule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Branch Classes */}
                        <div className="p-4">
                          {isLoading ? (
                            <div className="py-6 flex items-center justify-center gap-2 text-xs text-text-tertiary">
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              Loading batches for {branchName}...
                            </div>
                          ) : classes.length === 0 ? (
                            <p className="py-4 text-center text-xs text-text-tertiary">
                              No active classes found for this branch.
                            </p>
                          ) : filteredClasses.length === 0 ? (
                            <p className="py-4 text-center text-xs text-text-tertiary">
                              No classes match grade filter &ldquo;{gradeFilter}&rdquo;.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                              {filteredClasses.map((sg) => {
                                const isSelected = selectedGroups.has(sg.name);
                                return (
                                  <button
                                    key={sg.name}
                                    type="button"
                                    onClick={() => toggleClass(sg.name, sg.program)}
                                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                                      isSelected
                                        ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20 text-text-primary"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-text-secondary hover:border-slate-300 dark:hover:border-slate-700"
                                    }`}
                                  >
                                    <div
                                      className={`w-4 h-4 rounded flex items-center justify-center transition-colors shrink-0 ${
                                        isSelected
                                          ? "bg-primary text-white"
                                          : "border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                                      }`}
                                    >
                                      {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold truncate leading-tight">
                                        {sg.student_group_name || sg.name}
                                      </p>
                                      {sg.program && (
                                        <p className="text-[10px] text-text-tertiary truncate mt-0.5 font-medium">
                                          {sg.program}
                                        </p>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Banner to Step 3 */}
              {selectedGroups.size > 0 && (
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/10 border-2 border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary text-white shadow-sm shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary">
                        {selectedGroups.size} Classes Selected across {branchesWithSelection} Branches
                      </p>
                      <p className="text-xs text-text-secondary">
                        Classes chosen! Next: select the curriculum subject for each grade in <strong>Step 3 (Choose Subjects)</strong> below.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      document.getElementById("step-3-subjects")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="gap-2 shadow-sm shrink-0"
                  >
                    Go to Choose Subjects <ArrowDown className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Step 3: Subject Assignment for Selected Classes - ALWAYS VISIBLE */}
        <div id="step-3-subjects" className="space-y-4 scroll-mt-6">
          <Card className="border-2 border-primary/30 dark:border-primary/40 shadow-md overflow-hidden ring-4 ring-primary/5">
            <CardHeader className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white dark:from-purple-950/50 dark:via-slate-900/60 dark:to-slate-950 border-b border-purple-100 dark:border-purple-900/40 py-4 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary mb-1 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Step 3 of 3
                </div>
                <CardTitle className="text-lg font-extrabold text-text-primary flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Choose Subjects for Selected Classes
                </CardTitle>
                <p className="text-xs text-text-secondary mt-0.5">
                  Select the subject for each curriculum/grade below. Each grade only displays its valid curriculum subjects.
                </p>
              </div>

              {selectedGroups.size > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPerClassCustomization(!showPerClassCustomization)}
                  className="text-xs gap-1.5 h-8 bg-white dark:bg-slate-900 shadow-xs"
                >
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  {showPerClassCustomization ? "Hide Class Breakdown" : "Customize Per Class"}
                  {showPerClassCustomization ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              {selectedGroups.size === 0 ? (
                <div className="py-8 text-center text-text-tertiary">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 text-primary/40" />
                  <p className="text-sm font-semibold text-text-primary">No classes selected yet</p>
                  <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                    Choose branches and select classes in Step 2 above. Once classes are checked, their curriculum subjects will appear here for you to choose.
                  </p>
                </div>
              ) : (
                <>
                  {/* Program-wise subject cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedByProgram).map(([programName, classes]) => {
                      const programCourses = programCoursesMap[programName] || [];
                      const isLoadingCourses = loadingPrograms[programName];
                      const selectedCourse = programSubjectMap[programName] || "";

                      return (
                        <div
                          key={programName}
                          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                              <h4 className="text-sm font-bold text-text-primary">{programName}</h4>
                            </div>
                            <Badge variant="outline" className="text-[11px] bg-slate-50 dark:bg-slate-900">
                              {classes.length} {classes.length === 1 ? "class" : "classes"}
                            </Badge>
                          </div>

                          {/* Subject Select */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-text-secondary">
                              Subject (Course) for {programName} <span className="text-error">*</span>
                            </label>
                            {isLoadingCourses ? (
                              <div className="h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center px-3 gap-2 text-xs text-text-tertiary">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                Loading subjects for {programName}...
                              </div>
                            ) : (
                              <select
                                value={selectedCourse}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProgramSubjectMap((prev) => ({ ...prev, [programName]: val }));
                                }}
                                required
                                className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                              >
                                <option value="">Select subject for {programName}...</option>
                                {programCourses.map((c) => (
                                  <option key={c.course} value={c.course}>
                                    {c.course_name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Optional Topic */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-text-tertiary">
                              Topic for {programName} (optional)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Quadratic Equations"
                              value={programTopicMap[programName] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setProgramTopicMap((prev) => ({ ...prev, [programName]: val }));
                              }}
                              className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Optional Class-Level Granular Breakdown */}
                  {showPerClassCustomization && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                        Granular Class-by-Class Subject Mapping
                      </h4>
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {Array.from(selectedGroups).map((groupId) => {
                          const sg = allLoadedClasses[groupId];
                          if (!sg) return null;
                          const progCourses = programCoursesMap[sg.program] || [];
                          const currentCourse = effectiveCourseForGroup(sg);

                          return (
                            <div
                              key={groupId}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-text-primary truncate">
                                  {sg.student_group_name || sg.name}
                                </p>
                                <p className="text-[11px] text-text-tertiary">
                                  {sg.custom_branch} • {sg.program}
                                </p>
                              </div>

                              <div className="sm:w-64">
                                <select
                                  value={currentCourse}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setClassSubjectOverrides((prev) => ({
                                      ...prev,
                                      [groupId]: val,
                                    }));
                                  }}
                                  className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 text-xs focus:border-primary focus:outline-none"
                                >
                                  <option value="">Select subject...</option>
                                  {progCourses.map((c) => (
                                    <option key={c.course} value={c.course}>
                                      {c.course_name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Step 4: Publish Review & Action */}
        <div className="space-y-4">
          <Card className="border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50/50 to-purple-50/20 dark:from-slate-900 dark:via-slate-950 dark:to-purple-950/10 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Ready to Publish Unified Exam Schedule
                </h3>
                <p className="text-xs text-text-secondary mt-1">
                  {selectedGroups.size > 0 && assessmentGroup && scheduleDate ? (
                    <span>
                      Publishing <strong>{assessmentGroup}</strong> for{" "}
                      <strong>{selectedGroups.size} classes</strong> across{" "}
                      <strong>{branchesWithSelection} branches</strong> on{" "}
                      <strong>
                        {new Date(scheduleDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </strong>{" "}
                      ({fromTime} – {toTime}) with respective curriculum subjects.
                    </span>
                  ) : (
                    "Complete schedule details, add branches, and select classes to publish."
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting || selectedGroups.size === 0}
                  className="gap-2 shadow-md hover:shadow-lg transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publishing to {selectedGroups.size} Classes...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Publish Exam ({selectedGroups.size} Classes)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
