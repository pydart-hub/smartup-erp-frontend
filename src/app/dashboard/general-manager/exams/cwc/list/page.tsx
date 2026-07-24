"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  Coffee,
  Calendar,
  MapPin,
  Users,
  Search,
  BookOpen,
  CheckCircle2,
  Clock,
  ClipboardList,
  Trophy,
  GraduationCap,
  BookOpenCheck,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 25 } },
};

const branchItem = {
  hidden: { opacity: 0, y: 20, rotateX: -8, scale: 0.96 },
  show: { opacity: 1, y: 0, rotateX: 0, scale: 1, transition: { type: "spring" as const, stiffness: 220, damping: 20 } },
};

function parseClassLevel(studentGroup?: string) {
  if (!studentGroup) return "Other";
  const match = studentGroup.match(/(\d+)(?:st|nd|rd|th)/i);
  if (match) return `${match[1]}th`;
  const matchNum = studentGroup.match(/(\d+)/);
  if (matchNum) return `${matchNum[1]}th`;
  return "Other";
}

function cleanSubjectName(courseName?: string) {
  if (!courseName) return "Other";
  return courseName.replace(/^\d+(?:st|nd|rd|th)?\s*/i, "").trim();
}

function getPassRateStyles(passRate: number | null) {
  if (passRate === null) {
    return {
      bg: "bg-slate-50 dark:bg-slate-500/5",
      border: "border-slate-100 dark:border-slate-500/10",
      textValue: "text-slate-400 dark:text-slate-500",
      textLabel: "text-slate-400"
    };
  }
  if (passRate >= 75) {
    return {
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      border: "border-emerald-100 dark:border-emerald-500/20",
      textValue: "text-emerald-600 dark:text-emerald-400",
      textLabel: "text-emerald-500"
    };
  }
  if (passRate >= 40) {
    return {
      bg: "bg-amber-50 dark:bg-amber-500/10",
      border: "border-amber-100 dark:border-amber-500/20",
      textValue: "text-amber-600 dark:text-amber-400",
      textLabel: "text-amber-500"
    };
  }
  return {
    bg: "bg-rose-50 dark:bg-rose-500/10",
    border: "border-rose-100 dark:border-rose-500/20",
    textValue: "text-rose-600 dark:text-rose-400",
    textLabel: "text-rose-500"
  };
}

function GMCwcExamsListContent() {
  const searchParams = useSearchParams();
  const groupFilter = searchParams.get("group") || "all";
  const [searchQuery, setSearchQuery] = useState("");
  
  // Drilldown states
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const { data: allExams = [], isLoading: examsLoading } = useQuery({
    queryKey: ["director-all-exams"],
    queryFn: () => getAssessmentPlans(),
    staleTime: 30_000,
  });

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 60_000,
  });

  const cwcExams = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return allExams
      .filter((e) => {
        const matchesCwc = e.assessment_group && e.assessment_group.toLowerCase().includes("cwc");
        if (!matchesCwc) return false;
        if (groupFilter !== "all") {
          return e.assessment_group?.toLowerCase().includes(groupFilter.toLowerCase());
        }
        return true;
      })
      .map((e) => {
        const isUpcoming = e.schedule_date >= today;
        return {
          ...e,
          status: isUpcoming ? "upcoming" : "completed",
        };
      });
  }, [allExams, groupFilter]);

  const completedExams = useMemo(() => {
    return cwcExams.filter((e) => e.status === "completed");
  }, [cwcExams]);

  const { data: examResults = {}, isLoading: resultsLoading } = useQuery({
    queryKey: ["cwc-exams-results", completedExams.map((e) => e.name).join(",")],
    queryFn: async () => {
      const resultsMap: Record<string, any> = {};
      await Promise.all(
        completedExams.map(async (exam) => {
          try {
            const res = await getExamPlanResults(exam.name);
            resultsMap[exam.name] = res.summary;
          } catch (e) {
            console.error(`Failed to fetch results for ${exam.name}`, e);
          }
        })
      );
      return resultsMap;
    },
    enabled: completedExams.length > 0,
    staleTime: 60_000,
  });

  const isLoading = examsLoading || branchesLoading || (completedExams.length > 0 && resultsLoading);

  const stats = useMemo(() => {
    const total = cwcExams.length;
    const upcoming = cwcExams.filter((e) => e.status === "upcoming").length;
    const completed = cwcExams.filter((e) => e.status === "completed").length;
    return { total, upcoming, completed };
  }, [cwcExams]);

  // 1. Branch stats calculation
  const branchStats = useMemo(() => {
    return branches
      .filter((b) => b.name !== "Smart Up" && b.company_name !== "Smart Up")
      .map((b) => {
        const branchExams = cwcExams.filter((e) => e.custom_branch === b.name);
        const completedBranchExams = branchExams.filter((e) => e.status === "completed");

        let totalPassRate = 0;
        let ratedExamsCount = 0;
        completedBranchExams.forEach((exam) => {
          const resSummary = examResults[exam.name];
          if (resSummary && typeof resSummary.pass_rate === "number") {
            totalPassRate += resSummary.pass_rate;
            ratedExamsCount++;
          }
        });
        const avgPassRate = ratedExamsCount > 0 ? Math.round(totalPassRate / ratedExamsCount) : null;

        return {
          branch: b.name,
          branchLabel: b.company_name,
          total: branchExams.length,
          upcoming: branchExams.filter((e) => e.status === "upcoming").length,
          completed: branchExams.filter((e) => e.status === "completed").length,
          passRate: avgPassRate,
        };
      });
  }, [cwcExams, branches, examResults]);

  // 2. Class stats calculation (for the selected branch)
  const classStats = useMemo(() => {
    if (!selectedBranch) return [];
    const branchExams = cwcExams.filter((e) => e.custom_branch === selectedBranch);
    
    // Group by class level
    const classGroups = new Map<string, typeof cwcExams>();
    branchExams.forEach((exam) => {
      const cls = parseClassLevel(exam.student_group);
      if (!classGroups.has(cls)) classGroups.set(cls, []);
      classGroups.get(cls)!.push(exam);
    });

    return Array.from(classGroups.entries()).map(([cls, examsList]) => {
      const completedList = examsList.filter((e) => e.status === "completed");
      let totalPassRate = 0;
      let ratedExamsCount = 0;
      completedList.forEach((exam) => {
        const resSummary = examResults[exam.name];
        if (resSummary && typeof resSummary.pass_rate === "number") {
          totalPassRate += resSummary.pass_rate;
          ratedExamsCount++;
        }
      });
      const avgPassRate = ratedExamsCount > 0 ? Math.round(totalPassRate / ratedExamsCount) : null;

      return {
        className: cls,
        total: examsList.length,
        completed: completedList.length,
        upcoming: examsList.filter((e) => e.status === "upcoming").length,
        passRate: avgPassRate,
      };
    });
  }, [cwcExams, selectedBranch, examResults]);

  // 3. Subject stats calculation (for selected branch + class)
  const subjectStats = useMemo(() => {
    if (!selectedBranch || !selectedClass) return [];
    const classExams = cwcExams.filter(
      (e) => e.custom_branch === selectedBranch && parseClassLevel(e.student_group) === selectedClass
    );

    // Group by cleaned subject name
    const subjectGroups = new Map<string, typeof cwcExams>();
    classExams.forEach((exam) => {
      const sub = cleanSubjectName(exam.course);
      if (!subjectGroups.has(sub)) subjectGroups.set(sub, []);
      subjectGroups.get(sub)!.push(exam);
    });

    return Array.from(subjectGroups.entries()).map(([sub, examsList]) => {
      const completedList = examsList.filter((e) => e.status === "completed");
      let totalPassRate = 0;
      let ratedExamsCount = 0;
      completedList.forEach((exam) => {
        const resSummary = examResults[exam.name];
        if (resSummary && typeof resSummary.pass_rate === "number") {
          totalPassRate += resSummary.pass_rate;
          ratedExamsCount++;
        }
      });
      const avgPassRate = ratedExamsCount > 0 ? Math.round(totalPassRate / ratedExamsCount) : null;

      return {
        subjectName: sub,
        total: examsList.length,
        completed: completedList.length,
        upcoming: examsList.filter((e) => e.status === "upcoming").length,
        passRate: avgPassRate,
      };
    });
  }, [cwcExams, selectedBranch, selectedClass, examResults]);

  // 4. Filtering exams list based on selections
  const filteredExams = useMemo(() => {
    let result = cwcExams;
    if (selectedBranch) {
      result = result.filter((e) => e.custom_branch === selectedBranch);
    }
    if (selectedClass) {
      result = result.filter((e) => parseClassLevel(e.student_group) === selectedClass);
    }
    if (selectedSubject) {
      result = result.filter((e) => cleanSubjectName(e.course) === selectedSubject);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.assessment_name?.toLowerCase().includes(q) ||
          e.custom_branch?.toLowerCase().includes(q) ||
          e.student_group?.toLowerCase().includes(q) ||
          e.course?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [cwcExams, searchQuery, selectedBranch, selectedClass, selectedSubject]);

  const pageTitle = groupFilter === "all" ? "Overall CWC Exams" : `${groupFilter} Exams`;

  const summaryCards = [
    {
      label: "Total CWC Exams",
      value: stats.total,
      icon: ClipboardList,
      gradient: "from-amber-400 to-orange-500",
      glow: "shadow-orange-500/25",
      ring: "ring-orange-500/20",
      text: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-500/10 dark:bg-orange-500/15",
      border: "border-orange-500/20 dark:border-orange-400/20",
    },
    {
      label: "Upcoming",
      value: stats.upcoming,
      icon: Clock,
      gradient: "from-indigo-400 to-blue-500",
      glow: "shadow-blue-500/25",
      ring: "ring-blue-500/20",
      text: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
      border: "border-indigo-500/20 dark:border-indigo-400/20",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      gradient: "from-emerald-400 to-teal-500",
      glow: "shadow-emerald-500/25",
      ring: "ring-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      border: "border-emerald-500/20 dark:border-emerald-400/20",
    },
  ];

  // Dynamic filter title helpers
  const filterSummaryText = useMemo(() => {
    const parts = [];
    if (selectedBranch) parts.push(selectedBranch);
    if (selectedClass) parts.push(`Class ${selectedClass}`);
    if (selectedSubject) parts.push(selectedSubject);
    return parts.length > 0 ? parts.join(" — ") : "All Branches";
  }, [selectedBranch, selectedClass, selectedSubject]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      <BreadcrumbNav />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/general-manager/exams/cwc">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <Coffee className="h-6 w-6 text-amber-500" />
              {pageTitle}
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Interactive CWC analytics drilldown: Branch &rarr; Class &rarr; Subject.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <GifLoader />
      ) : (
        <>
          {/* Summary stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="grid grid-cols-3 gap-3"
          >
            {summaryCards.map((s) => (
              <div
                key={s.label}
                className={`relative overflow-hidden rounded-2xl border ${s.border} ${s.bg} p-4 flex items-center gap-3.5 ring-1 ${s.ring}`}
              >
                <div className={`shrink-0 p-2.5 rounded-xl bg-gradient-to-br ${s.gradient} shadow-lg ${s.glow}`}>
                  <s.icon className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className={`text-2xl font-bold tabular-nums leading-none ${s.text}`}>{s.value}</p>
                  <p className={`text-[11px] font-medium mt-1 ${s.text} opacity-75`}>{s.label}</p>
                </div>
                <div className={`pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full bg-gradient-to-br ${s.gradient} opacity-[0.08]`} />
              </div>
            ))}
          </motion.div>

          {/* Drilldown breadcrumbs / control bar */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-text-secondary">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-text-tertiary">Active Filter:</span>
              <button
                onClick={() => {
                  setSelectedBranch(null);
                  setSelectedClass(null);
                  setSelectedSubject(null);
                }}
                className={`hover:underline ${!selectedBranch ? "text-primary font-bold" : ""}`}
              >
                All Branches
              </button>
              {selectedBranch && (
                <>
                  <ChevronRight className="h-3 w-3 text-slate-400" />
                  <button
                    onClick={() => {
                      setSelectedClass(null);
                      setSelectedSubject(null);
                    }}
                    className={`hover:underline ${!selectedClass ? "text-primary font-bold" : ""}`}
                  >
                    {selectedBranch}
                  </button>
                </>
              )}
              {selectedClass && (
                <>
                  <ChevronRight className="h-3 w-3 text-slate-400" />
                  <button
                    onClick={() => setSelectedSubject(null)}
                    className={`hover:underline ${!selectedSubject ? "text-primary font-bold" : ""}`}
                  >
                    Class {selectedClass}
                  </button>
                </>
              )}
              {selectedSubject && (
                <>
                  <ChevronRight className="h-3 w-3 text-slate-400" />
                  <span className="text-primary font-bold">{selectedSubject}</span>
                </>
              )}
            </div>
            {(selectedBranch || selectedClass || selectedSubject) && (
              <button
                onClick={() => {
                  setSelectedBranch(null);
                  setSelectedClass(null);
                  setSelectedSubject(null);
                }}
                className="text-primary font-semibold hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          {/* DRILLDOWN DASHBOARD CONTAINER */}
          <AnimatePresence mode="wait">
            {/* LEVEL 1: BRANCH SELECTION */}
            {!selectedBranch && (
              <motion.section
                key="branches-drilldown"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                <h2 className="text-lg font-bold text-text-primary">1. Select Branch</h2>
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  style={{ perspective: 1200, transformStyle: "preserve-3d" }}
                >
                  {branchStats.map((bs) => (
                    <motion.div
                      key={bs.branch}
                      variants={branchItem}
                      whileHover={{ scale: 1.03, rotateX: 4, rotateY: -4, z: 10 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <div
                        onClick={() => setSelectedBranch(bs.branch)}
                        className="group relative overflow-hidden rounded-2xl cursor-pointer bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all duration-200 p-5"
                      >
                        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        <div className="flex items-start justify-between mb-4">
                          <div className="min-w-0 pr-2">
                            <h3 className="font-semibold text-sm leading-tight text-slate-800 dark:text-slate-100 truncate">
                              {bs.branchLabel}
                            </h3>
                            <p className="text-[10px] mt-0.5 text-slate-400 dark:text-slate-500 truncate">
                              {bs.branch}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-1.5 mt-4 text-[10px]">
                          <div className="flex flex-col items-center justify-center rounded-xl py-2 px-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                            <span className="font-bold tabular-nums text-slate-700 dark:text-slate-300">
                              {bs.completed} / {bs.total}
                            </span>
                            <span className="text-[8px] mt-0.5 text-slate-500 text-center leading-none">Exams Done</span>
                          </div>
                          <div className="flex flex-col items-center justify-center rounded-xl py-2 px-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                            <span className="font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                              {bs.upcoming}
                            </span>
                            <span className="text-[8px] mt-0.5 text-indigo-500 text-center leading-none">Upcoming</span>
                          </div>
                          <div className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 border ${(() => { const s = getPassRateStyles(bs.passRate); return `${s.bg} ${s.border}`; })()}`}>
                            <span className={`font-bold tabular-nums ${(() => { const s = getPassRateStyles(bs.passRate); return s.textValue; })()}`}>
                              {bs.passRate !== null ? `${bs.passRate}%` : "—"}
                            </span>
                            <span className={`text-[8px] mt-0.5 text-center leading-none ${(() => { const s = getPassRateStyles(bs.passRate); return s.textLabel; })()}`}>Pass Rate</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.section>
            )}

            {/* LEVEL 2: CLASS SELECTION */}
            {selectedBranch && !selectedClass && (
              <motion.section
                key="classes-drilldown"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-text-primary">2. Select Class ({selectedBranch})</h2>
                  <Button variant="outline" size="sm" onClick={() => setSelectedBranch(null)} className="text-xs">
                    Change Branch
                  </Button>
                </div>
                {classStats.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <p className="text-xs text-text-tertiary">No classes with CWC exams found for this branch.</p>
                  </div>
                ) : (
                  <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    style={{ perspective: 1200, transformStyle: "preserve-3d" }}
                  >
                    {classStats.map((cs) => (
                      <motion.div
                        key={cs.className}
                        variants={branchItem}
                        whileHover={{ scale: 1.03, rotateX: 4, rotateY: -4, z: 10 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <div
                          onClick={() => setSelectedClass(cs.className)}
                          className="group relative overflow-hidden rounded-2xl cursor-pointer bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all duration-200 p-5"
                        >
                          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                              <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-500 shrink-0">
                                <GraduationCap className="h-5 w-5" />
                              </div>
                              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                                Class {cs.className}
                              </h3>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 mt-4 text-[10px]">
                            <div className="flex flex-col items-center justify-center rounded-xl py-2 px-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                              <span className="font-bold tabular-nums text-slate-700 dark:text-slate-300">
                                {cs.completed} / {cs.total}
                              </span>
                              <span className="text-[8px] mt-0.5 text-slate-500 text-center leading-none">Exams Done</span>
                            </div>
                            <div className="flex flex-col items-center justify-center rounded-xl py-2 px-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                              <span className="font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                                {cs.upcoming}
                              </span>
                              <span className="text-[8px] mt-0.5 text-indigo-500 text-center leading-none">Upcoming</span>
                            </div>
                            <div className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 border ${(() => { const s = getPassRateStyles(cs.passRate); return `${s.bg} ${s.border}`; })()}`}>
                              <span className={`font-bold tabular-nums ${(() => { const s = getPassRateStyles(cs.passRate); return s.textValue; })()}`}>
                                {cs.passRate !== null ? `${cs.passRate}%` : "—"}
                              </span>
                              <span className={`text-[8px] mt-0.5 text-center leading-none ${(() => { const s = getPassRateStyles(cs.passRate); return s.textLabel; })()}`}>Pass Rate</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </motion.section>
            )}

            {/* LEVEL 3: SUBJECT SELECTION */}
            {selectedBranch && selectedClass && !selectedSubject && (
              <motion.section
                key="subjects-drilldown"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-text-primary">3. Select Subject ({selectedBranch} &bull; Class {selectedClass})</h2>
                  <Button variant="outline" size="sm" onClick={() => setSelectedClass(null)} className="text-xs">
                    Change Class
                  </Button>
                </div>
                {subjectStats.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <p className="text-xs text-text-tertiary">No subjects found with CWC exams.</p>
                  </div>
                ) : (
                  <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    style={{ perspective: 1200, transformStyle: "preserve-3d" }}
                  >
                    {subjectStats.map((ss) => (
                      <motion.div
                        key={ss.subjectName}
                        variants={branchItem}
                        whileHover={{ scale: 1.03, rotateX: 4, rotateY: -4, z: 10 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <div
                          onClick={() => setSelectedSubject(ss.subjectName)}
                          className="group relative overflow-hidden rounded-2xl cursor-pointer bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all duration-200 p-5"
                        >
                          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                              <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-500 shrink-0">
                                <BookOpenCheck className="h-5 w-5" />
                              </div>
                              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                                {ss.subjectName}
                              </h3>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 mt-4 text-[10px]">
                            <div className="flex flex-col items-center justify-center rounded-xl py-2 px-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                              <span className="font-bold tabular-nums text-slate-700 dark:text-slate-300">
                                {ss.completed} / {ss.total}
                              </span>
                              <span className="text-[8px] mt-0.5 text-slate-500 text-center leading-none">Exams Done</span>
                            </div>
                            <div className="flex flex-col items-center justify-center rounded-xl py-2 px-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                              <span className="font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                                {ss.upcoming}
                              </span>
                              <span className="text-[8px] mt-0.5 text-indigo-500 text-center leading-none">Upcoming</span>
                            </div>
                            <div className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 border ${(() => { const s = getPassRateStyles(ss.passRate); return `${s.bg} ${s.border}`; })()}`}>
                              <span className={`font-bold tabular-nums ${(() => { const s = getPassRateStyles(ss.passRate); return s.textValue; })()}`}>
                                {ss.passRate !== null ? `${ss.passRate}%` : "—"}
                              </span>
                              <span className={`text-[8px] mt-0.5 text-center leading-none ${(() => { const s = getPassRateStyles(ss.passRate); return s.textLabel; })()}`}>Pass Rate</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* Search bar and Filters */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-primary">
                Exams List ({filterSummaryText})
              </h2>
            </div>
            
            <div className="flex items-center gap-3 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder={`Search filtered CWC exams...`}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Exams list */}
          {filteredExams.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-white/[0.01]">
              <Coffee className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">No Exams found</h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                No active exams match the current filters.
              </p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {filteredExams.map((exam) => (
                <motion.div key={exam.name} variants={item}>
                  <Link
                    href={`/dashboard/general-manager/exams/regular/${encodeURIComponent(
                      exam.custom_branch || ""
                    )}/${encodeURIComponent(exam.name)}`}
                    className="block group"
                  >
                    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md hover:border-amber-500/30 transition-all duration-200 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                              exam.status === "upcoming"
                                ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-150"
                                : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-150"
                            }`}
                          >
                            {exam.status}
                          </span>
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-amber-600 transition-colors">
                            {exam.assessment_name || exam.name}
                          </h3>
                          <p className="text-xs text-text-tertiary font-medium">
                            {exam.assessment_group}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate font-medium">{exam.custom_branch}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate font-medium">{exam.student_group}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate font-medium">
                            {exam.schedule_date
                              ? new Date(exam.schedule_date).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "Undated"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <BookOpen className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate font-medium">{exam.course || "No Course"}</span>
                        </div>
                        
                        {exam.status === "completed" && examResults[exam.name] !== undefined && (() => {
                          const rate = examResults[exam.name].pass_rate;
                          const s = getPassRateStyles(rate !== undefined ? rate : null);
                          return (
                            <div className={`flex items-center gap-1.5 min-w-0 col-span-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/50 font-bold ${s.textValue}`}>
                              <Trophy className="h-3.5 w-3.5 shrink-0" />
                              <span>Pass Rate: {rate !== undefined ? `${rate}%` : "N/A"}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

export default function GMCwcExamsListPage() {
  return (
    <Suspense fallback={<GifLoader />}>
      <GMCwcExamsListContent />
    </Suspense>
  );
}


import { getAssessmentPlans, getExamPlanResults } from "@/lib/api/assessment";
import { getAllBranches } from "@/lib/api/director";
