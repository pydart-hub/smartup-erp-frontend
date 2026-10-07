"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  School,
  Users,
  Trophy,
  Sparkles,
  BookMarked,
  GraduationCap,
  Percent,
  CheckCircle2,
  XCircle,
  FileText,
  TrendingUp,
  Search,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GifLoader } from "@/components/ui/GifLoader";

interface SubjectWiseRankingViewProps {
  onBack: () => void;
  allResults: any[];
  allPlans: any[];
  planMetaMap: Map<string, any>;
  branches: any[];
}

// Helpers
const getBaseSubject = (courseCode: string): string => {
  if (!courseCode) return "";
  return courseCode
    .replace(/^\d+(st|nd|rd|th)?\s+Grade\s+/i, "")
    .replace(/^\d+(st|nd|rd|th)?\s+/i, "")
    .replace(/^Language\d+\s+/i, "")
    .trim();
};

const cleanBranchName = (name: string): string => {
  if (!name) return "";
  return name.replace(/^Smart\s+Up\s+/i, "").trim().toLowerCase();
};

const getRateColor = (rate: number) => {
  if (rate === 0) return { text: "text-text-tertiary", bg: "bg-text-tertiary" };
  if (rate >= 85) return { text: "text-success", bg: "bg-success" };
  if (rate >= 60) return { text: "text-primary", bg: "bg-primary" };
  return { text: "text-error", bg: "bg-error" };
};

export default function SubjectWiseRankingView({
  onBack,
  allResults,
  allPlans,
  planMetaMap,
  branches,
}: SubjectWiseRankingViewProps) {
  // Navigation level: "subjects" -> "branches" -> "classes" -> "class_details"
  const [level, setLevel] = useState<"subjects" | "branches" | "classes" | "class_details">("subjects");

  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedClassName, setSelectedClassName] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");

  // Map results to assessment plans for fast lookup
  const resultsByPlan = useMemo(() => {
    const map = new Map<string, any[]>();
    allResults.forEach((r: any) => {
      if (!map.has(r.assessment_plan)) {
        map.set(r.assessment_plan, []);
      }
      map.get(r.assessment_plan)!.push(r);
    });
    return map;
  }, [allResults]);

  // Helper to compute pass rate & stats for a set of results
  const computeStats = (resultsList: any[]) => {
    if (!resultsList.length) {
      return { passRate: 0, avgScore: 0, fullMarks: 0, aplus: 0, total: 0, passCount: 0, failCount: 0 };
    }
    let passCount = 0;
    let failCount = 0;
    let fullMarks = 0;
    let aplus = 0;
    let totalObtained = 0;
    let totalMax = 0;

    resultsList.forEach((r) => {
      totalObtained += r.total_score || 0;
      totalMax += r.maximum_score || 0;
      const pct = r.maximum_score > 0 ? (r.total_score / r.maximum_score) * 100 : 0;
      if (pct >= 40) passCount++;
      else failCount++;
      if (r.total_score === r.maximum_score && r.maximum_score > 0) fullMarks++;
      if (pct >= 90) aplus++;
    });

    const passRate = (passCount / resultsList.length) * 100;
    const avgScore = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

    return {
      passRate,
      avgScore,
      fullMarks,
      aplus,
      total: resultsList.length,
      passCount,
      failCount,
    };
  };

  // 1. ALL SUBJECTS SUMMARY (Across entire organization)
  const allSubjectsSummary = useMemo(() => {
    if (!allPlans.length) return [];

    const subjectMap = new Map<
      string,
      { baseName: string; plans: any[]; branchSet: Set<string>; results: any[] }
    >();

    allPlans.forEach((plan: any) => {
      if (!plan.course) return;
      const baseName = getBaseSubject(plan.course);
      if (!baseName) return;

      if (!subjectMap.has(baseName)) {
        subjectMap.set(baseName, {
          baseName,
          plans: [],
          branchSet: new Set<string>(),
          results: [],
        });
      }

      const entry = subjectMap.get(baseName)!;
      entry.plans.push(plan);
      if (plan.custom_branch) {
        entry.branchSet.add(plan.custom_branch);
      }

      const pResults = resultsByPlan.get(plan.name) || [];
      entry.results.push(...pResults);
    });

    return Array.from(subjectMap.values())
      .map((entry) => {
        const stats = computeStats(entry.results);
        return {
          baseName: entry.baseName,
          branchesCount: entry.branchSet.size,
          examsCount: entry.plans.length,
          totalAssessments: stats.total,
          passRate: `${stats.passRate.toFixed(1)}%`,
          numericRate: stats.passRate,
          avgScore: stats.avgScore.toFixed(1),
        };
      })
      .sort((a, b) => b.examsCount - a.examsCount);
  }, [allPlans, resultsByPlan]);

  // 2. BRANCHES FOR SELECTED SUBJECT
  const branchesForSubject = useMemo(() => {
    if (!selectedSubject || !allPlans.length) return [];

    const branchMap = new Map<
      string,
      { branchName: string; plans: any[]; classSet: Set<string>; results: any[] }
    >();

    allPlans.forEach((plan: any) => {
      if (!plan.course || getBaseSubject(plan.course) !== selectedSubject) return;
      const branchName = plan.custom_branch || "Main Branch";

      if (!branchMap.has(branchName)) {
        branchMap.set(branchName, {
          branchName,
          plans: [],
          classSet: new Set<string>(),
          results: [],
        });
      }

      const entry = branchMap.get(branchName)!;
      entry.plans.push(plan);
      if (plan.student_group) {
        entry.classSet.add(plan.student_group);
      }
      const pResults = resultsByPlan.get(plan.name) || [];
      entry.results.push(...pResults);
    });

    return Array.from(branchMap.values())
      .map((entry) => {
        const stats = computeStats(entry.results);
        return {
          branchName: entry.branchName,
          displayName: entry.branchName.replace(/^Smart\s+Up\s+/i, ""),
          classesCount: entry.classSet.size,
          examsCount: entry.plans.length,
          totalAssessments: stats.total,
          passRate: `${stats.passRate.toFixed(1)}%`,
          numericRate: stats.passRate,
          avgScore: stats.avgScore.toFixed(1),
        };
      })
      .sort((a, b) => b.numericRate - a.numericRate);
  }, [selectedSubject, allPlans, resultsByPlan]);

  // Fetch Student Groups for the selected branch (to get official names & programs)
  const { data: branchStudentGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["student-groups-for-subject-flow", selectedBranch],
    queryFn: async () => {
      if (!selectedBranch) return [];
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Student Group",
          method: "GET",
          payload: {
            fields: JSON.stringify(["name", "student_group_name", "program", "custom_branch"]),
            filters: JSON.stringify([["custom_branch", "=", selectedBranch], ["disabled", "=", 0]]),
            limit_page_length: "500",
          },
        }),
      }).then((r) => r.json());
      return res.data ?? [];
    },
    enabled: !!selectedBranch,
    staleTime: 5 * 60_000,
  });

  const studentGroupMap = useMemo(() => {
    const map = new Map<string, any>();
    branchStudentGroups.forEach((sg: any) => {
      map.set(sg.name, sg);
    });
    return map;
  }, [branchStudentGroups]);

  // 3. CLASSES / BATCHES IN SELECTED BRANCH FOR THIS SUBJECT
  const classesForBranchAndSubject = useMemo(() => {
    if (!selectedSubject || !selectedBranch || !allPlans.length) return [];

    const classMap = new Map<
      string,
      {
        classId: string;
        className: string;
        program?: string;
        plans: any[];
        results: any[];
        examiners: Set<string>;
      }
    >();

    allPlans.forEach((plan: any) => {
      if (
        !plan.course ||
        getBaseSubject(plan.course) !== selectedSubject ||
        cleanBranchName(plan.custom_branch) !== cleanBranchName(selectedBranch)
      ) {
        return;
      }

      const classId = plan.student_group;
      if (!classId) return;

      if (!classMap.has(classId)) {
        const sgInfo = studentGroupMap.get(classId);
        classMap.set(classId, {
          classId,
          className: sgInfo?.student_group_name || classId,
          program: sgInfo?.program,
          plans: [],
          results: [],
          examiners: new Set<string>(),
        });
      }

      const entry = classMap.get(classId)!;
      entry.plans.push(plan);
      if (plan.examiner_name || plan.examiner) {
        entry.examiners.add(plan.examiner_name || plan.examiner);
      }
      const pResults = resultsByPlan.get(plan.name) || [];
      entry.results.push(...pResults);
    });

    return Array.from(classMap.values())
      .map((entry) => {
        const stats = computeStats(entry.results);
        return {
          classId: entry.classId,
          className: entry.className,
          program: entry.program,
          examiners: Array.from(entry.examiners).filter(Boolean).join(", "),
          examsCount: entry.plans.length,
          totalAssessments: stats.total,
          passRate: `${stats.passRate.toFixed(1)}%`,
          numericRate: stats.passRate,
          avgScore: stats.avgScore.toFixed(1),
          fullMarks: stats.fullMarks,
          aplus: stats.aplus,
        };
      })
      .sort((a, b) => b.numericRate - a.numericRate);
  }, [selectedSubject, selectedBranch, allPlans, resultsByPlan, studentGroupMap]);

  // 4. CLASS DETAILS BREAKDOWN (For selected class)
  const classDeepDive = useMemo(() => {
    if (!selectedClassId || !selectedSubject || !selectedBranch) return null;

    const classPlans = allPlans.filter(
      (p: any) =>
        p.student_group === selectedClassId &&
        getBaseSubject(p.course) === selectedSubject &&
        cleanBranchName(p.custom_branch) === cleanBranchName(selectedBranch)
    );

    const classResults: any[] = [];
    classPlans.forEach((p: any) => {
      const pRes = resultsByPlan.get(p.name) || [];
      pRes.forEach((r: any) => {
        classResults.push({
          ...r,
          examName: p.assessment_name || p.name,
          course: p.course,
          date: p.schedule_date,
          maxScore: p.maximum_assessment_score || r.maximum_score,
        });
      });
    });

    const stats = computeStats(classResults);

    // Group by Exam Plan
    const examBreakdown = classPlans.map((plan: any) => {
      const examResults = resultsByPlan.get(plan.name) || [];
      const examStats = computeStats(examResults);
      return {
        planName: plan.name,
        assessmentName: plan.assessment_name || plan.name,
        course: plan.course,
        date: plan.schedule_date,
        maxScore: plan.maximum_assessment_score,
        examineesCount: examResults.length,
        passRate: `${examStats.passRate.toFixed(1)}%`,
        numericRate: examStats.passRate,
        avgScore: examStats.avgScore.toFixed(1),
        fullMarks: examStats.fullMarks,
      };
    });

    return {
      stats,
      examBreakdown,
      totalExams: classPlans.length,
    };
  }, [selectedClassId, selectedSubject, selectedBranch, allPlans, resultsByPlan]);

  // Filter lists based on search query
  const filteredSubjects = useMemo(() => {
    if (!searchQuery) return allSubjectsSummary;
    return allSubjectsSummary.filter((s) =>
      s.baseName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allSubjectsSummary, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Navigation Breadcrumb Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-sm">
        <div className="flex items-center gap-2.5 flex-wrap text-sm">
          <button
            onClick={() => {
              if (level === "subjects") {
                onBack();
              } else if (level === "branches") {
                setLevel("subjects");
                setSelectedSubject("");
              } else if (level === "classes") {
                setLevel("branches");
                setSelectedBranch("");
              } else if (level === "class_details") {
                setLevel("classes");
                setSelectedClassId("");
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-text-primary rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {level === "subjects"
              ? "Menu"
              : level === "branches"
              ? "Subjects"
              : level === "classes"
              ? "Branches"
              : "Classes"}
          </button>

          <span className="text-text-tertiary">/</span>

          <span
            onClick={() => {
              setLevel("subjects");
              setSelectedSubject("");
              setSelectedBranch("");
              setSelectedClassId("");
            }}
            className={`cursor-pointer font-bold ${
              level === "subjects" ? "text-primary" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            All Subjects
          </span>

          {selectedSubject && (
            <>
              <span className="text-text-tertiary">/</span>
              <span
                onClick={() => {
                  setLevel("branches");
                  setSelectedBranch("");
                  setSelectedClassId("");
                }}
                className={`cursor-pointer font-bold ${
                  level === "branches" ? "text-primary" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {selectedSubject}
              </span>
            </>
          )}

          {selectedBranch && (
            <>
              <span className="text-text-tertiary">/</span>
              <span
                onClick={() => {
                  setLevel("classes");
                  setSelectedClassId("");
                }}
                className={`cursor-pointer font-bold ${
                  level === "classes" ? "text-primary" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {selectedBranch.replace(/^Smart\s+Up\s+/i, "")}
              </span>
            </>
          )}

          {selectedClassName && level === "class_details" && (
            <>
              <span className="text-text-tertiary">/</span>
              <span className="font-bold text-primary">{selectedClassName}</span>
            </>
          )}
        </div>

        {level === "subjects" && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* ========================================================= */}
        {/* LEVEL 1: ALL SUBJECTS VIEW                                */}
        {/* ========================================================= */}
        {level === "subjects" && (
          <motion.div
            key="subjects"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <BookMarked className="h-5 w-5 text-primary" /> Select Subject
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Choose a subject to examine branch-wise and class-level academic performance.
                </p>
              </div>
              <Badge className="bg-primary/10 text-primary border-none font-bold">
                {allSubjectsSummary.length} Subjects Active
              </Badge>
            </div>

            {filteredSubjects.length === 0 ? (
              <Card className="p-12 text-center border-dashed bg-surface">
                <h3 className="text-base font-semibold text-text-primary">No subjects found</h3>
                <p className="text-sm text-text-secondary mt-1">
                  No academic assessment records exist matching your search.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSubjects.map((sub) => {
                  const colors = getRateColor(sub.numericRate);
                  return (
                    <Card
                      key={sub.baseName}
                      hover
                      onClick={() => {
                        setSelectedSubject(sub.baseName);
                        setLevel("branches");
                      }}
                      className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm hover:border-primary/20 transition-all group overflow-hidden bg-surface"
                    >
                      <CardHeader className="p-6 pb-2">
                        <div className="flex justify-between items-start">
                          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                            <BookOpen className="h-6 w-6" />
                          </div>
                          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none font-bold">
                            {sub.branchesCount} Branches
                          </Badge>
                        </div>
                        <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-primary transition-colors">
                          {sub.baseName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 pt-2">
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-xs text-text-secondary font-medium">Overall Pass Rate</span>
                          <span className={`text-2xl font-extrabold tracking-tight ${colors.text}`}>
                            {sub.passRate}
                          </span>
                        </div>
                        {sub.numericRate > 0 && (
                          <div className="w-full bg-slate-50 dark:bg-white/[0.04] h-1.5 rounded-full mt-3.5 overflow-hidden">
                            <div
                              className={`h-full ${colors.bg} rounded-full`}
                              style={{ width: `${sub.numericRate}%` }}
                            />
                          </div>
                        )}
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[10px] text-text-tertiary font-bold uppercase tracking-wider">
                          <span>{sub.examsCount} Exams</span>
                          <span>{sub.totalAssessments} Submissions</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* LEVEL 2: BRANCHES OFFERING SELECTED SUBJECT               */}
        {/* ========================================================= */}
        {level === "branches" && (
          <motion.div
            key="branches"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <School className="h-5 w-5 text-primary" /> Branches Teaching {selectedSubject}
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Select a branch to see individual class batches and their teachers.
                </p>
              </div>
              <Badge className="bg-primary/10 text-primary border-none font-bold">
                {branchesForSubject.length} Branches
              </Badge>
            </div>

            {branchesForSubject.length === 0 ? (
              <Card className="p-12 text-center border-dashed bg-surface">
                <h3 className="text-base font-semibold text-text-primary">No branches found</h3>
                <p className="text-sm text-text-secondary mt-1">
                  No branch currently has recorded exams for {selectedSubject}.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branchesForSubject.map((b) => {
                  const colors = getRateColor(b.numericRate);
                  return (
                    <Card
                      key={b.branchName}
                      hover
                      onClick={() => {
                        setSelectedBranch(b.branchName);
                        setLevel("classes");
                      }}
                      className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm hover:border-primary/20 transition-all group overflow-hidden bg-surface"
                    >
                      <CardHeader className="p-6 pb-2">
                        <div className="flex justify-between items-start">
                          <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl">
                            <School className="h-6 w-6" />
                          </div>
                          <Badge className="bg-primary/10 text-primary border-none font-bold">
                            {b.classesCount} Classes
                          </Badge>
                        </div>
                        <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-primary transition-colors">
                          {b.displayName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 pt-2">
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-xs text-text-secondary font-medium">Branch Pass Rate</span>
                          <span className={`text-2xl font-extrabold tracking-tight ${colors.text}`}>
                            {b.passRate}
                          </span>
                        </div>
                        {b.numericRate > 0 && (
                          <div className="w-full bg-slate-50 dark:bg-white/[0.04] h-1.5 rounded-full mt-3.5 overflow-hidden">
                            <div
                              className={`h-full ${colors.bg} rounded-full`}
                              style={{ width: `${b.numericRate}%` }}
                            />
                          </div>
                        )}
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[10px] text-text-tertiary font-bold uppercase tracking-wider">
                          <span>{b.examsCount} Exams</span>
                          <span>{b.totalAssessments} Submissions</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* LEVEL 3: CLASSES / BATCHES INSIDE BRANCH                  */}
        {/* ========================================================= */}
        {level === "classes" && (
          <motion.div
            key="classes"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" /> Classes in{" "}
                  {selectedBranch.replace(/^Smart\s+Up\s+/i, "")} ({selectedSubject})
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Select a class to view in-depth student performance and exam breakdowns.
                </p>
              </div>
              <Badge className="bg-primary/10 text-primary border-none font-bold">
                {classesForBranchAndSubject.length} Batches
              </Badge>
            </div>

            {groupsLoading ? (
              <div className="py-24 flex justify-center items-center">
                <GifLoader size="lg" />
              </div>
            ) : classesForBranchAndSubject.length === 0 ? (
              <Card className="p-12 text-center border-dashed bg-surface">
                <h3 className="text-base font-semibold text-text-primary">No classes found</h3>
                <p className="text-sm text-text-secondary mt-1">
                  No batches have completed exams for {selectedSubject} in this branch.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classesForBranchAndSubject.map((cls) => {
                  const colors = getRateColor(cls.numericRate);
                  return (
                    <Card
                      key={cls.classId}
                      hover
                      onClick={() => {
                        setSelectedClassId(cls.classId);
                        setSelectedClassName(cls.className);
                        setLevel("class_details");
                      }}
                      className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm hover:border-primary/20 transition-all group overflow-hidden bg-surface"
                    >
                      <CardHeader className="p-6 pb-2">
                        <div className="flex justify-between items-start">
                          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                            <Users className="h-6 w-6" />
                          </div>
                          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none font-bold">
                            {cls.examsCount} Exams
                          </Badge>
                        </div>
                        <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-primary transition-colors">
                          {cls.className}
                        </CardTitle>
                        {cls.examiners && (
                          <p className="text-xs text-text-secondary mt-1 truncate">
                            Teacher: <span className="font-semibold text-text-primary">{cls.examiners}</span>
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="p-6 pt-2">
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-xs text-text-secondary font-medium">Class Pass Rate</span>
                          <span className={`text-2xl font-extrabold tracking-tight ${colors.text}`}>
                            {cls.passRate}
                          </span>
                        </div>
                        {cls.numericRate > 0 && (
                          <div className="w-full bg-slate-50 dark:bg-white/[0.04] h-1.5 rounded-full mt-3.5 overflow-hidden">
                            <div
                              className={`h-full ${colors.bg} rounded-full`}
                              style={{ width: `${cls.numericRate}%` }}
                            />
                          </div>
                        )}
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[10px] text-text-tertiary font-bold uppercase tracking-wider">
                          <span>{cls.totalAssessments} Submissions</span>
                          <span>{cls.fullMarks} Full Marks</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* LEVEL 4: CLASS DETAILS & EXAM-WISE PERFORMANCE            */}
        {/* ========================================================= */}
        {level === "class_details" && classDeepDive && (
          <motion.div
            key="class_details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Header Card */}
            <Card className="border border-slate-100 dark:border-white/[0.06] shadow-sm bg-surface p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-primary" />
                    {selectedClassName} — {selectedSubject}
                  </h2>
                  <p className="text-xs text-text-secondary mt-1">
                    Branch:{" "}
                    <span className="font-semibold text-text-primary">
                      {selectedBranch.replace(/^Smart\s+Up\s+/i, "")}
                    </span>{" "}
                    • Total Exams Conducted:{" "}
                    <span className="font-semibold text-text-primary">{classDeepDive.totalExams}</span>
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-xs text-text-secondary font-medium block">Average Pass Rate</span>
                    <span
                      className={`text-2xl font-extrabold ${
                        getRateColor(classDeepDive.stats.passRate).text
                      }`}
                    >
                      {classDeepDive.stats.passRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-text-secondary font-medium block">Average Score</span>
                    <span className="text-2xl font-extrabold text-primary">
                      {classDeepDive.stats.avgScore.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Stat Highlights Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-white/[0.06]">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-text-tertiary tracking-wider block">
                    Submissions
                  </span>
                  <span className="text-lg font-bold text-text-primary">{classDeepDive.stats.total}</span>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider block">
                    Passed (≥40%)
                  </span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {classDeepDive.stats.passCount}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 tracking-wider block">
                    Failed (&lt;40%)
                  </span>
                  <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                    {classDeepDive.stats.failCount}
                  </span>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 tracking-wider block">
                    Full Marks
                  </span>
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {classDeepDive.stats.fullMarks}
                  </span>
                </div>
              </div>
            </Card>

            {/* Exam Breakdown Table */}
            <Card className="border border-slate-100 dark:border-white/[0.06] shadow-sm overflow-hidden bg-surface">
              <CardHeader className="bg-primary/5 dark:bg-primary/10 px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                <CardTitle className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Exam-Wise Results
                </CardTitle>
              </CardHeader>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/50 text-[10px] uppercase font-bold text-text-tertiary tracking-wider">
                      <th className="px-6 py-3.5">Exam Name</th>
                      <th className="px-6 py-3.5">Course / Paper</th>
                      <th className="px-6 py-3.5 text-center">Max Marks</th>
                      <th className="px-6 py-3.5 text-center">Examinees</th>
                      <th className="px-6 py-3.5 text-center">Avg Score</th>
                      <th className="px-6 py-3.5 text-center">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                    {classDeepDive.examBreakdown.map((exam) => {
                      const colors = getRateColor(exam.numericRate);
                      return (
                        <tr
                          key={exam.planName}
                          className="hover:bg-slate-50/20 dark:hover:bg-slate-800/5 transition-colors"
                        >
                          <td className="px-6 py-4 font-bold text-text-primary">
                            {exam.assessmentName}
                            {exam.date && (
                              <span className="block text-[10px] font-normal text-text-tertiary">
                                {exam.date}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-text-secondary">{exam.course}</td>
                          <td className="px-6 py-4 text-center font-semibold text-text-secondary">
                            {exam.maxScore}
                          </td>
                          <td className="px-6 py-4 text-center font-semibold text-text-secondary">
                            {exam.examineesCount}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-primary">
                            {exam.avgScore}%
                          </td>
                          <td className="px-6 py-4 text-center font-extrabold">
                            <span className={colors.text}>{exam.passRate}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
