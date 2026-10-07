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
  BookMarked,
  GraduationCap,
  TrendingUp,
  Search,
  Layers,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GifLoader } from "@/components/ui/GifLoader";

interface BranchPerformanceHubProps {
  branchName: string;
  defaultTab?: "class_wise" | "subject_wise";
  hideTabSwitcher?: boolean;
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

const extractAcademicClass = (studentGroup: string, course?: string, program?: string): string => {
  if (program && program.trim()) {
    return program.trim();
  }
  const raw = (studentGroup || course || "").trim();
  if (!raw) return "General Class";

  const branchPattern = /^(?:Smart\s+Up\s+)?[A-Za-z\s]+-\s*([\d]+(?:st|nd|rd|th)?(?:\s+[A-Za-z0-9]+)*?)(?:-[A-Za-z0-9]+)?$/i;
  const match = raw.match(branchPattern);
  if (match && match[1]) {
    return match[1].trim();
  }

  const standardMatch = raw.match(/\b(\d+(?:st|nd|rd|th)?(?:\s+(?:Science|Commerce))?\s+(?:State|CBSE))\b/i);
  if (standardMatch) {
    return standardMatch[1].trim();
  }

  const gradeMatch = raw.match(/\b(\d+(?:st|nd|rd|th)?)\b/i);
  if (gradeMatch) {
    return `${gradeMatch[1]} Standard`;
  }

  return raw;
};

const getRateColor = (rate: number) => {
  if (rate === 0) return { text: "text-text-tertiary", bg: "bg-text-tertiary" };
  if (rate >= 85) return { text: "text-success", bg: "bg-success" };
  if (rate >= 60) return { text: "text-primary", bg: "bg-primary" };
  return { text: "text-error", bg: "bg-error" };
};

export default function BranchPerformanceHub({
  branchName,
  defaultTab = "class_wise",
  hideTabSwitcher = false,
}: BranchPerformanceHubProps) {
  // Mode: "class_wise" | "subject_wise"
  const [activeTab, setActiveTab] = useState<"class_wise" | "subject_wise">(defaultTab);

  // Navigation states for Class-Wise mode: "classes" -> "batches" -> "batch_details"
  const [classLevel, setClassLevel] = useState<"classes" | "batches" | "batch_details">("classes");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedBatchName, setSelectedBatchName] = useState<string>("");

  // Navigation states for Subject-Wise mode: "subjects" -> "classes" -> "batches" -> "batch_details"
  const [subjectLevel, setSubjectLevel] = useState<"subjects" | "classes" | "batches" | "batch_details">("subjects");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedSubClass, setSelectedSubClass] = useState<string>("");
  const [selectedSubBatchId, setSelectedSubBatchId] = useState<string>("");
  const [selectedSubBatchName, setSelectedSubBatchName] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");

  // 1. Fetch Student Groups strictly for this branch
  const { data: studentGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["branch-student-groups-hub", branchName],
    queryFn: async () => {
      if (!branchName) return [];
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Student Group",
          method: "GET",
          payload: {
            fields: JSON.stringify(["name", "student_group_name", "program", "custom_branch"]),
            filters: JSON.stringify([["custom_branch", "=", branchName], ["disabled", "=", 0]]),
            limit_page_length: "500",
          },
        }),
      }).then((r) => r.json());
      return res.data ?? [];
    },
    enabled: !!branchName,
    staleTime: 5 * 60_000,
  });

  const studentGroupMap = useMemo(() => {
    const map = new Map<string, any>();
    studentGroups.forEach((sg: any) => {
      map.set(sg.name, sg);
    });
    return map;
  }, [studentGroups]);

  // 2. Fetch Assessment Plans strictly for this branch
  const { data: branchPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["branch-plans-hub", branchName],
    queryFn: async () => {
      if (!branchName) return [];
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Assessment Plan",
          method: "GET",
          payload: {
            fields: JSON.stringify([
              "name",
              "student_group",
              "assessment_name",
              "course",
              "schedule_date",
              "maximum_assessment_score",
              "custom_branch",
              "examiner",
              "examiner_name",
            ]),
            filters: JSON.stringify([["custom_branch", "=", branchName], ["docstatus", "=", 1]]),
            limit_page_length: "2000",
          },
        }),
      }).then((r) => r.json());
      return res.data ?? [];
    },
    enabled: !!branchName,
    staleTime: 60_000,
  });

  // 3. Fetch Assessment Results strictly for plans belonging to this branch
  const { data: allResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["branch-results-hub", branchName],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Assessment Result",
          method: "GET",
          payload: {
            fields: JSON.stringify([
              "name",
              "student",
              "student_name",
              "assessment_plan",
              "total_score",
              "maximum_score",
              "course",
            ]),
            filters: JSON.stringify([["docstatus", "=", 1]]),
            limit_page_length: "15000",
          },
        }),
      }).then((r) => r.json());
      return res.data ?? [];
    },
    enabled: !!branchName,
    staleTime: 60_000,
  });

  // Build Results Map by Assessment Plan
  const resultsByPlan = useMemo(() => {
    const map = new Map<string, any[]>();
    const planNameSet = new Set(branchPlans.map((p: any) => p.name));

    allResults.forEach((r: any) => {
      if (planNameSet.has(r.assessment_plan)) {
        if (!map.has(r.assessment_plan)) {
          map.set(r.assessment_plan, []);
        }
        map.get(r.assessment_plan)!.push(r);
      }
    });
    return map;
  }, [allResults, branchPlans]);

  // Stats computation helper
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

  // =========================================================================
  // DATA MEMOS FOR MODE 1: CLASS-WISE
  // =========================================================================

  // All Academic Classes in this Branch
  const branchClassList = useMemo(() => {
    if (!branchPlans.length && !studentGroups.length) return [];

    const classMap = new Map<
      string,
      { className: string; batches: Set<string>; plans: any[]; results: any[] }
    >();

    // Seed from active student groups
    studentGroups.forEach((sg: any) => {
      const clsName = extractAcademicClass(sg.name, undefined, sg.program);
      if (!classMap.has(clsName)) {
        classMap.set(clsName, { className: clsName, batches: new Set(), plans: [], results: [] });
      }
      classMap.get(clsName)!.batches.add(sg.name);
    });

    // Populate plans and results
    branchPlans.forEach((plan: any) => {
      const sgInfo = studentGroupMap.get(plan.student_group);
      const clsName = extractAcademicClass(plan.student_group, plan.course, sgInfo?.program);

      if (!classMap.has(clsName)) {
        classMap.set(clsName, { className: clsName, batches: new Set(), plans: [], results: [] });
      }
      const entry = classMap.get(clsName)!;
      entry.plans.push(plan);
      if (plan.student_group) entry.batches.add(plan.student_group);

      const pResults = resultsByPlan.get(plan.name) || [];
      entry.results.push(...pResults);
    });

    return Array.from(classMap.values())
      .map((entry) => {
        const stats = computeStats(entry.results);
        return {
          className: entry.className,
          batchesCount: entry.batches.size,
          examsCount: entry.plans.length,
          totalAssessments: stats.total,
          passRate: `${stats.passRate.toFixed(1)}%`,
          numericRate: stats.passRate,
          avgScore: stats.avgScore.toFixed(1),
        };
      })
      .sort((a, b) => {
        const gradeA = parseInt(a.className) || 0;
        const gradeB = parseInt(b.className) || 0;
        if (gradeA !== gradeB) return gradeB - gradeA;
        return b.examsCount - a.examsCount;
      });
  }, [branchPlans, studentGroups, resultsByPlan, studentGroupMap]);

  // Batches in selected Class (Mode 1)
  const batchesForSelectedClass = useMemo(() => {
    if (!selectedClass) return [];

    const batchMap = new Map<
      string,
      { batchId: string; batchName: string; program?: string; plans: any[]; results: any[]; examiners: Set<string> }
    >();

    studentGroups.forEach((sg: any) => {
      const clsName = extractAcademicClass(sg.name, undefined, sg.program);
      if (clsName === selectedClass) {
        batchMap.set(sg.name, {
          batchId: sg.name,
          batchName: sg.student_group_name || sg.name,
          program: sg.program,
          plans: [],
          results: [],
          examiners: new Set(),
        });
      }
    });

    branchPlans.forEach((plan: any) => {
      const sgInfo = studentGroupMap.get(plan.student_group);
      const clsName = extractAcademicClass(plan.student_group, plan.course, sgInfo?.program);
      if (clsName !== selectedClass) return;

      const batchId = plan.student_group;
      if (!batchId) return;

      if (!batchMap.has(batchId)) {
        batchMap.set(batchId, {
          batchId,
          batchName: sgInfo?.student_group_name || batchId,
          program: sgInfo?.program,
          plans: [],
          results: [],
          examiners: new Set(),
        });
      }
      const entry = batchMap.get(batchId)!;
      entry.plans.push(plan);
      if (plan.examiner_name || plan.examiner) {
        entry.examiners.add(plan.examiner_name || plan.examiner);
      }
      const pResults = resultsByPlan.get(plan.name) || [];
      entry.results.push(...pResults);
    });

    return Array.from(batchMap.values())
      .map((entry) => {
        const stats = computeStats(entry.results);
        return {
          batchId: entry.batchId,
          batchName: entry.batchName,
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
  }, [selectedClass, studentGroups, branchPlans, resultsByPlan, studentGroupMap]);

  // Deep dive for selected batch in Mode 1
  const classBatchDeepDive = useMemo(() => {
    if (!selectedBatchId) return null;

    const bPlans = branchPlans.filter((p: any) => p.student_group === selectedBatchId);
    const bResults: any[] = [];
    bPlans.forEach((p: any) => {
      const pRes = resultsByPlan.get(p.name) || [];
      pRes.forEach((r: any) => {
        bResults.push({
          ...r,
          examName: p.assessment_name || p.name,
          course: p.course,
          date: p.schedule_date,
          maxScore: p.maximum_assessment_score || r.maximum_score,
        });
      });
    });

    const stats = computeStats(bResults);
    const examBreakdown = bPlans.map((plan: any) => {
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

    return { stats, examBreakdown, totalExams: bPlans.length };
  }, [selectedBatchId, branchPlans, resultsByPlan]);

  // =========================================================================
  // DATA MEMOS FOR MODE 2: SUBJECT-WISE
  // =========================================================================

  // All Subjects taught in this Branch
  const branchSubjectList = useMemo(() => {
    if (!branchPlans.length) return [];

    const subjectMap = new Map<
      string,
      { baseName: string; plans: any[]; classSet: Set<string>; results: any[] }
    >();

    branchPlans.forEach((plan: any) => {
      if (!plan.course) return;
      const baseName = getBaseSubject(plan.course);
      if (!baseName) return;

      if (!subjectMap.has(baseName)) {
        subjectMap.set(baseName, {
          baseName,
          plans: [],
          classSet: new Set(),
          results: [],
        });
      }
      const entry = subjectMap.get(baseName)!;
      entry.plans.push(plan);

      const sgInfo = studentGroupMap.get(plan.student_group);
      const clsName = extractAcademicClass(plan.student_group, plan.course, sgInfo?.program);
      entry.classSet.add(clsName);

      const pResults = resultsByPlan.get(plan.name) || [];
      entry.results.push(...pResults);
    });

    return Array.from(subjectMap.values())
      .map((entry) => {
        const stats = computeStats(entry.results);
        return {
          baseName: entry.baseName,
          classesCount: entry.classSet.size,
          examsCount: entry.plans.length,
          totalAssessments: stats.total,
          passRate: `${stats.passRate.toFixed(1)}%`,
          numericRate: stats.passRate,
          avgScore: stats.avgScore.toFixed(1),
        };
      })
      .sort((a, b) => b.examsCount - a.examsCount);
  }, [branchPlans, resultsByPlan, studentGroupMap]);

  // Classes taking selected Subject in this branch (Mode 2)
  const classesForSelectedSubject = useMemo(() => {
    if (!selectedSubject || !branchPlans.length) return [];

    const classMap = new Map<
      string,
      { className: string; batches: Set<string>; plans: any[]; results: any[] }
    >();

    branchPlans.forEach((plan: any) => {
      if (!plan.course || getBaseSubject(plan.course) !== selectedSubject) return;

      const sgInfo = studentGroupMap.get(plan.student_group);
      const clsName = extractAcademicClass(plan.student_group, plan.course, sgInfo?.program);
      if (!clsName) return;

      if (!classMap.has(clsName)) {
        classMap.set(clsName, { className: clsName, batches: new Set(), plans: [], results: [] });
      }
      const entry = classMap.get(clsName)!;
      entry.plans.push(plan);
      if (plan.student_group) entry.batches.add(plan.student_group);

      const pResults = resultsByPlan.get(plan.name) || [];
      entry.results.push(...pResults);
    });

    return Array.from(classMap.values())
      .map((entry) => {
        const stats = computeStats(entry.results);
        return {
          className: entry.className,
          batchesCount: entry.batches.size,
          examsCount: entry.plans.length,
          totalAssessments: stats.total,
          passRate: `${stats.passRate.toFixed(1)}%`,
          numericRate: stats.passRate,
          avgScore: stats.avgScore.toFixed(1),
        };
      })
      .sort((a, b) => {
        const gradeA = parseInt(a.className) || 0;
        const gradeB = parseInt(b.className) || 0;
        if (gradeA !== gradeB) return gradeB - gradeA;
        return b.examsCount - a.examsCount;
      });
  }, [selectedSubject, branchPlans, resultsByPlan, studentGroupMap]);

  // Batches taking selected Subject and Class (Mode 2)
  const batchesForSubClass = useMemo(() => {
    if (!selectedSubject || !selectedSubClass || !branchPlans.length) return [];

    const batchMap = new Map<
      string,
      { batchId: string; batchName: string; program?: string; plans: any[]; results: any[]; examiners: Set<string> }
    >();

    branchPlans.forEach((plan: any) => {
      if (!plan.course || getBaseSubject(plan.course) !== selectedSubject) return;

      const sgInfo = studentGroupMap.get(plan.student_group);
      const clsName = extractAcademicClass(plan.student_group, plan.course, sgInfo?.program);
      if (clsName !== selectedSubClass) return;

      const batchId = plan.student_group;
      if (!batchId) return;

      if (!batchMap.has(batchId)) {
        batchMap.set(batchId, {
          batchId,
          batchName: sgInfo?.student_group_name || batchId,
          program: sgInfo?.program,
          plans: [],
          results: [],
          examiners: new Set(),
        });
      }
      const entry = batchMap.get(batchId)!;
      entry.plans.push(plan);
      if (plan.examiner_name || plan.examiner) {
        entry.examiners.add(plan.examiner_name || plan.examiner);
      }
      const pResults = resultsByPlan.get(plan.name) || [];
      entry.results.push(...pResults);
    });

    return Array.from(batchMap.values())
      .map((entry) => {
        const stats = computeStats(entry.results);
        return {
          batchId: entry.batchId,
          batchName: entry.batchName,
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
  }, [selectedSubject, selectedSubClass, branchPlans, resultsByPlan, studentGroupMap]);

  // Deep dive for selected batch in Mode 2
  const subBatchDeepDive = useMemo(() => {
    if (!selectedSubBatchId || !selectedSubject) return null;

    const bPlans = branchPlans.filter(
      (p: any) => p.student_group === selectedSubBatchId && getBaseSubject(p.course) === selectedSubject
    );
    const bResults: any[] = [];
    bPlans.forEach((p: any) => {
      const pRes = resultsByPlan.get(p.name) || [];
      pRes.forEach((r: any) => {
        bResults.push({
          ...r,
          examName: p.assessment_name || p.name,
          course: p.course,
          date: p.schedule_date,
          maxScore: p.maximum_assessment_score || r.maximum_score,
        });
      });
    });

    const stats = computeStats(bResults);
    const examBreakdown = bPlans.map((plan: any) => {
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

    return { stats, examBreakdown, totalExams: bPlans.length };
  }, [selectedSubBatchId, selectedSubject, branchPlans, resultsByPlan]);

  const isLoading = groupsLoading || plansLoading || resultsLoading;

  if (isLoading) {
    return (
      <div className="py-28 flex flex-col justify-center items-center gap-3">
        <GifLoader size="lg" />
        <p className="text-xs text-text-tertiary font-semibold animate-pulse">
          Loading branch academic performance records...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      {!hideTabSwitcher && (
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              onClick={() => {
                setActiveTab("class_wise");
                setClassLevel("classes");
                setSelectedClass("");
                setSelectedBatchId("");
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "class_wise"
                  ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <School className="w-4 h-4" /> Class-Wise Performance
            </button>

            <button
              onClick={() => {
                setActiveTab("subject_wise");
                setSubjectLevel("subjects");
                setSelectedSubject("");
                setSelectedSubClass("");
                setSelectedSubBatchId("");
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "subject_wise"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <BookOpen className="w-4 h-4" /> Subject-Wise Performance
            </button>
          </div>

          <div className="text-xs text-text-secondary font-medium">
            Branch: <span className="font-bold text-text-primary">{branchName.replace(/^Smart\s+Up\s+/i, "")}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 1: CLASS-WISE PERFORMANCE VIEW                                       */}
      {/* ========================================================================= */}
      {activeTab === "class_wise" && (
        <div className="space-y-6 animate-fade-in">
          {/* Breadcrumb Bar */}
          <div className="flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-sm text-xs">
            <div className="flex items-center gap-2 flex-wrap font-medium">
              <span
                onClick={() => {
                  setClassLevel("classes");
                  setSelectedClass("");
                  setSelectedBatchId("");
                }}
                className={`cursor-pointer font-bold ${
                  classLevel === "classes" ? "text-primary" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                All Classes
              </span>

              {selectedClass && (
                <>
                  <span className="text-text-tertiary">/</span>
                  <span
                    onClick={() => {
                      setClassLevel("batches");
                      setSelectedBatchId("");
                    }}
                    className={`cursor-pointer font-bold ${
                      classLevel === "batches" ? "text-primary" : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {selectedClass}
                  </span>
                </>
              )}

              {selectedBatchName && classLevel === "batch_details" && (
                <>
                  <span className="text-text-tertiary">/</span>
                  <span className="font-bold text-primary">{selectedBatchName}</span>
                </>
              )}
            </div>

            {classLevel !== "classes" && (
              <button
                onClick={() => {
                  if (classLevel === "batch_details") {
                    setClassLevel("batches");
                    setSelectedBatchId("");
                  } else {
                    setClassLevel("classes");
                    setSelectedClass("");
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-text-primary rounded-lg transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {/* Level 1: Classes Grid */}
            {classLevel === "classes" && (
              <motion.div
                key="c_classes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" /> Classes in {branchName.replace(/^Smart\s+Up\s+/i, "")}
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Select a class to see batches and exam statistics.
                    </p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-none font-bold">
                    {branchClassList.length} Classes
                  </Badge>
                </div>

                {branchClassList.length === 0 ? (
                  <Card className="p-12 text-center border-dashed bg-surface">
                    <p className="text-sm text-text-secondary">No classes found for this branch.</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {branchClassList.map((cls) => {
                      const colors = getRateColor(cls.numericRate);
                      return (
                        <Card
                          key={cls.className}
                          hover
                          onClick={() => {
                            setSelectedClass(cls.className);
                            setClassLevel("batches");
                          }}
                          className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm hover:border-primary/20 transition-all group overflow-hidden bg-surface"
                        >
                          <CardHeader className="p-6 pb-2">
                            <div className="flex justify-between items-start">
                              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                                <Layers className="h-6 w-6" />
                              </div>
                              <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none font-bold">
                                {cls.batchesCount} Batches
                              </Badge>
                            </div>
                            <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-primary transition-colors">
                              {cls.className}
                            </CardTitle>
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
                              <span>{cls.examsCount} Exams</span>
                              <span>{cls.totalAssessments} Submissions</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* Level 2: Batches Grid */}
            {classLevel === "batches" && (
              <motion.div
                key="c_batches"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" /> Batches in {selectedClass}
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Select a batch to inspect exam breakdowns and performance.
                    </p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-none font-bold">
                    {batchesForSelectedClass.length} Batches
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {batchesForSelectedClass.map((batch) => {
                    const colors = getRateColor(batch.numericRate);
                    return (
                      <Card
                        key={batch.batchId}
                        hover
                        onClick={() => {
                          setSelectedBatchId(batch.batchId);
                          setSelectedBatchName(batch.batchName);
                          setClassLevel("batch_details");
                        }}
                        className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm hover:border-primary/20 transition-all group overflow-hidden bg-surface"
                      >
                        <CardHeader className="p-6 pb-2">
                          <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                              <Users className="h-6 w-6" />
                            </div>
                            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none font-bold">
                              {batch.examsCount} Exams
                            </Badge>
                          </div>
                          <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-primary transition-colors">
                            {batch.batchName}
                          </CardTitle>
                          {batch.examiners && (
                            <p className="text-xs text-text-secondary mt-1 truncate">
                              Teacher: <span className="font-semibold text-text-primary">{batch.examiners}</span>
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                          <div className="mt-2 flex items-baseline justify-between">
                            <span className="text-xs text-text-secondary font-medium">Batch Pass Rate</span>
                            <span className={`text-2xl font-extrabold tracking-tight ${colors.text}`}>
                              {batch.passRate}
                            </span>
                          </div>
                          {batch.numericRate > 0 && (
                            <div className="w-full bg-slate-50 dark:bg-white/[0.04] h-1.5 rounded-full mt-3.5 overflow-hidden">
                              <div
                                className={`h-full ${colors.bg} rounded-full`}
                                style={{ width: `${batch.numericRate}%` }}
                              />
                            </div>
                          )}
                          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[10px] text-text-tertiary font-bold uppercase tracking-wider">
                            <span>{batch.totalAssessments} Submissions</span>
                            <span>{batch.fullMarks} Full Marks</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Level 3: Batch Details */}
            {classLevel === "batch_details" && classBatchDeepDive && (
              <motion.div
                key="c_details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card className="border border-slate-100 dark:border-white/[0.06] shadow-sm bg-surface p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                        <Trophy className="h-6 w-6 text-primary" />
                        {selectedBatchName}
                      </h2>
                      <p className="text-xs text-text-secondary mt-1">
                        Class: <span className="font-semibold text-text-primary">{selectedClass}</span> • Total Exams:{" "}
                        <span className="font-semibold text-text-primary">{classBatchDeepDive.totalExams}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-xs text-text-secondary font-medium block">Average Pass Rate</span>
                        <span
                          className={`text-2xl font-extrabold ${
                            getRateColor(classBatchDeepDive.stats.passRate).text
                          }`}
                        >
                          {classBatchDeepDive.stats.passRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-text-secondary font-medium block">Average Score</span>
                        <span className="text-2xl font-extrabold text-primary">
                          {classBatchDeepDive.stats.avgScore.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-white/[0.06]">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-text-tertiary tracking-wider block">
                        Submissions
                      </span>
                      <span className="text-lg font-bold text-text-primary">{classBatchDeepDive.stats.total}</span>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider block">
                        Passed (≥40%)
                      </span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {classBatchDeepDive.stats.passCount}
                      </span>
                    </div>
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 tracking-wider block">
                        Failed (&lt;40%)
                      </span>
                      <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                        {classBatchDeepDive.stats.failCount}
                      </span>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 tracking-wider block">
                        Full Marks
                      </span>
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {classBatchDeepDive.stats.fullMarks}
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
                        {classBatchDeepDive.examBreakdown.map((exam: any) => {
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
      )}

      {/* ========================================================================= */}
      {/* MODE 2: SUBJECT-WISE PERFORMANCE VIEW                                     */}
      {/* ========================================================================= */}
      {activeTab === "subject_wise" && (
        <div className="space-y-6 animate-fade-in">
          {/* Breadcrumb Bar */}
          <div className="flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-sm text-xs">
            <div className="flex items-center gap-2 flex-wrap font-medium">
              <span
                onClick={() => {
                  setSubjectLevel("subjects");
                  setSelectedSubject("");
                  setSelectedSubClass("");
                  setSelectedSubBatchId("");
                }}
                className={`cursor-pointer font-bold ${
                  subjectLevel === "subjects" ? "text-primary" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                All Subjects
              </span>

              {selectedSubject && (
                <>
                  <span className="text-text-tertiary">/</span>
                  <span
                    onClick={() => {
                      setSubjectLevel("classes");
                      setSelectedSubClass("");
                      setSelectedSubBatchId("");
                    }}
                    className={`cursor-pointer font-bold ${
                      subjectLevel === "classes" ? "text-primary" : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {selectedSubject}
                  </span>
                </>
              )}

              {selectedSubClass && (
                <>
                  <span className="text-text-tertiary">/</span>
                  <span
                    onClick={() => {
                      setSubjectLevel("batches");
                      setSelectedSubBatchId("");
                    }}
                    className={`cursor-pointer font-bold ${
                      subjectLevel === "batches" ? "text-primary" : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {selectedSubClass}
                  </span>
                </>
              )}

              {selectedSubBatchName && subjectLevel === "batch_details" && (
                <>
                  <span className="text-text-tertiary">/</span>
                  <span className="font-bold text-primary">{selectedSubBatchName}</span>
                </>
              )}
            </div>

            {subjectLevel !== "subjects" && (
              <button
                onClick={() => {
                  if (subjectLevel === "batch_details") {
                    setSubjectLevel("batches");
                    setSelectedSubBatchId("");
                  } else if (subjectLevel === "batches") {
                    setSubjectLevel("classes");
                    setSelectedSubClass("");
                  } else {
                    setSubjectLevel("subjects");
                    setSelectedSubject("");
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-text-primary rounded-lg transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {/* Level 1: Subjects Grid */}
            {subjectLevel === "subjects" && (
              <motion.div
                key="s_subjects"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                      <BookMarked className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Subjects Taught in {branchName.replace(/^Smart\s+Up\s+/i, "")}
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Select a subject to drill down into classes, batches, and exams.
                    </p>
                  </div>
                  <Badge className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-none font-bold">
                    {branchSubjectList.length} Subjects
                  </Badge>
                </div>

                {branchSubjectList.length === 0 ? (
                  <Card className="p-12 text-center border-dashed bg-surface">
                    <p className="text-sm text-text-secondary">No recorded exams for any subject in this branch.</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {branchSubjectList.map((sub) => {
                      const colors = getRateColor(sub.numericRate);
                      return (
                        <Card
                          key={sub.baseName}
                          hover
                          onClick={() => {
                            setSelectedSubject(sub.baseName);
                            setSubjectLevel("classes");
                          }}
                          className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm hover:border-emerald-500/20 transition-all group overflow-hidden bg-surface"
                        >
                          <CardHeader className="p-6 pb-2">
                            <div className="flex justify-between items-start">
                              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                <BookOpen className="h-6 w-6" />
                              </div>
                              <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none font-bold">
                                {sub.classesCount} Classes
                              </Badge>
                            </div>
                            <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {sub.baseName}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-6 pt-2">
                            <div className="mt-2 flex items-baseline justify-between">
                              <span className="text-xs text-text-secondary font-medium">Branch Pass Rate</span>
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

            {/* Level 2: Classes for Subject */}
            {subjectLevel === "classes" && (
              <motion.div
                key="s_classes"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Classes Studying {selectedSubject}
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Select a class to view batch sections in this branch.
                    </p>
                  </div>
                  <Badge className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-none font-bold">
                    {classesForSelectedSubject.length} Classes
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {classesForSelectedSubject.map((cls) => {
                    const colors = getRateColor(cls.numericRate);
                    return (
                      <Card
                        key={cls.className}
                        hover
                        onClick={() => {
                          setSelectedSubClass(cls.className);
                          setSubjectLevel("batches");
                        }}
                        className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm hover:border-emerald-500/20 transition-all group overflow-hidden bg-surface"
                      >
                        <CardHeader className="p-6 pb-2">
                          <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                              <Layers className="h-6 w-6" />
                            </div>
                            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none font-bold">
                              {cls.batchesCount} Batches
                            </Badge>
                          </div>
                          <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {cls.className}
                          </CardTitle>
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
                            <span>{cls.examsCount} Exams</span>
                            <span>{cls.totalAssessments} Submissions</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Level 3: Batches for Subject and Class */}
            {subjectLevel === "batches" && (
              <motion.div
                key="s_batches"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                      <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Batches in {selectedSubClass} ({selectedSubject})
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Select a batch to inspect exam breakdowns and teacher performance.
                    </p>
                  </div>
                  <Badge className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-none font-bold">
                    {batchesForSubClass.length} Batches
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {batchesForSubClass.map((batch) => {
                    const colors = getRateColor(batch.numericRate);
                    return (
                      <Card
                        key={batch.batchId}
                        hover
                        onClick={() => {
                          setSelectedSubBatchId(batch.batchId);
                          setSelectedSubBatchName(batch.batchName);
                          setSubjectLevel("batch_details");
                        }}
                        className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm hover:border-emerald-500/20 transition-all group overflow-hidden bg-surface"
                      >
                        <CardHeader className="p-6 pb-2">
                          <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                              <Users className="h-6 w-6" />
                            </div>
                            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none font-bold">
                              {batch.examsCount} Exams
                            </Badge>
                          </div>
                          <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {batch.batchName}
                          </CardTitle>
                          {batch.examiners && (
                            <p className="text-xs text-text-secondary mt-1 truncate">
                              Teacher: <span className="font-semibold text-text-primary">{batch.examiners}</span>
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                          <div className="mt-2 flex items-baseline justify-between">
                            <span className="text-xs text-text-secondary font-medium">Batch Pass Rate</span>
                            <span className={`text-2xl font-extrabold tracking-tight ${colors.text}`}>
                              {batch.passRate}
                            </span>
                          </div>
                          {batch.numericRate > 0 && (
                            <div className="w-full bg-slate-50 dark:bg-white/[0.04] h-1.5 rounded-full mt-3.5 overflow-hidden">
                              <div
                                className={`h-full ${colors.bg} rounded-full`}
                                style={{ width: `${batch.numericRate}%` }}
                              />
                            </div>
                          )}
                          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[10px] text-text-tertiary font-bold uppercase tracking-wider">
                            <span>{batch.totalAssessments} Submissions</span>
                            <span>{batch.fullMarks} Full Marks</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Level 4: Batch Details for Subject */}
            {subjectLevel === "batch_details" && subBatchDeepDive && (
              <motion.div
                key="s_details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card className="border border-slate-100 dark:border-white/[0.06] shadow-sm bg-surface p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                        <Trophy className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        {selectedSubBatchName} — {selectedSubject}
                      </h2>
                      <p className="text-xs text-text-secondary mt-1">
                        Class: <span className="font-semibold text-text-primary">{selectedSubClass}</span> • Total Exams:{" "}
                        <span className="font-semibold text-text-primary">{subBatchDeepDive.totalExams}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-xs text-text-secondary font-medium block">Average Pass Rate</span>
                        <span
                          className={`text-2xl font-extrabold ${
                            getRateColor(subBatchDeepDive.stats.passRate).text
                          }`}
                        >
                          {subBatchDeepDive.stats.passRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-text-secondary font-medium block">Average Score</span>
                        <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                          {subBatchDeepDive.stats.avgScore.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-white/[0.06]">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-text-tertiary tracking-wider block">
                        Submissions
                      </span>
                      <span className="text-lg font-bold text-text-primary">{subBatchDeepDive.stats.total}</span>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider block">
                        Passed (≥40%)
                      </span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {subBatchDeepDive.stats.passCount}
                      </span>
                    </div>
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 tracking-wider block">
                        Failed (&lt;40%)
                      </span>
                      <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                        {subBatchDeepDive.stats.failCount}
                      </span>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 tracking-wider block">
                        Full Marks
                      </span>
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {subBatchDeepDive.stats.fullMarks}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Exam Breakdown Table */}
                <Card className="border border-slate-100 dark:border-white/[0.06] shadow-sm overflow-hidden bg-surface">
                  <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                    <CardTitle className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Exam-Wise Results
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
                        {subBatchDeepDive.examBreakdown.map((exam: any) => {
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
                              <td className="px-6 py-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
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
      )}
    </div>
  );
}
