"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  School,
  Users,
  Trophy,
  Sparkles,
  Search,
  ChevronRight,
  ChevronDown,
  Printer,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Layers,
  Filter,
  Calendar
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GifLoader } from "@/components/ui/GifLoader";
import { getBranches } from "@/lib/api/enrollment";
import { getAssessmentGroups } from "@/lib/api/assessment";

// Helpers
const cleanBranchName = (name: string): string => {
  if (!name) return "Main Branch";
  return name.replace(/^Smart\s+Up\s+/i, "").trim();
};

const getBaseSubject = (courseCode: string): string => {
  if (!courseCode) return "";
  return courseCode
    .replace(/^\d+(?:st|nd|rd|th)?\s+Grade\s+/i, "")
    .replace(/^\d+(?:st|nd|rd|th)?\s+/i, "")
    .replace(/^Language\d+\s+/i, "")
    .trim();
};

const extractStandard = (text: string): string => {
  if (!text) return "Other";
  const m = text.match(/\b(8th|9th|10th|11th|12th|8|9|10|11|12)\b/i);
  if (!m) return "Other";
  let val = m[1].toLowerCase();
  if (val === "8") return "8th";
  if (val === "9") return "9th";
  if (val === "10") return "10th";
  if (val === "11") return "11th";
  if (val === "12") return "12th";
  return val;
};

const getRateColor = (rate: number) => {
  if (rate === 0) return { text: "text-text-tertiary", bg: "bg-text-tertiary" };
  if (rate >= 85) return { text: "text-emerald-600", bg: "bg-emerald-500" };
  if (rate >= 60) return { text: "text-blue-600", bg: "bg-blue-500" };
  return { text: "text-rose-600", bg: "bg-rose-500" };
};

export default function ExamSubjectRankingPage() {
  // 3-Level Drill-Down: "classes" | "subjects" | "ranking"
  const [level, setLevel] = useState<"classes" | "subjects" | "ranking">("classes");

  const [selectedExam, setSelectedExam] = useState("Quarterly Exam");
  const [selectedSubject, setSelectedSubject] = useState("Physics");
  const [selectedStandard, setSelectedStandard] = useState("10th");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<"all" | "Advanced" | "Basic">("all");
  const [rankingSortBy, setRankingSortBy] = useState<"passRate" | "averageScore" | "topperCount">("passRate");
  const [selectedStudentFilter, setSelectedStudentFilter] = useState("all");

  const studentFilterOptions = [
    { label: "All Students", value: "all" },
    { label: "Class Topper", value: "topper" },
    { label: "Top 3", value: "top3" },
    { label: "Top 5", value: "top5" },
    { label: "Top 10", value: "top10" },
    { label: "Top 15", value: "top15" },
    { label: "Full Mark Achievers", value: "full_mark" },
    { label: "Full A+ Achievers", value: "full_aplus" },
    { label: "90% & Above", value: "p90" },
    { label: "85% & Above", value: "p85" },
    { label: "80% & Above", value: "p80" },
    { label: "75% & Above", value: "p75" },
    { label: "70% & Above", value: "p70" },
    { label: "60% & Above", value: "p60" },
    { label: "50% & Above", value: "p50" },
    { label: "30% & Above", value: "p30" },
    { label: "Below 70%", value: "below70" },
    { label: "Below 60%", value: "below60" },
    { label: "Below 50%", value: "below50" },
    { label: "Below 30% (Failed)", value: "failed_30" },
    { label: "Passed", value: "passed" },
  ];

  // Selected Branch for Drill-down / Detailed Student list
  const [drillDownBranch, setDrillDownBranch] = useState<string | null>(null);

  // 1. Fetch available assessment groups
  const { data: assessmentGroups = [] } = useQuery({
    queryKey: ["all-assessment-groups-subject"],
    queryFn: getAssessmentGroups,
    staleTime: 5 * 60_000,
  });

  const examOptions = useMemo(() => {
    const list = assessmentGroups
      .map(g => g.name)
      .filter(name => !name.toLowerCase().startsWith("cwc"));
    const defaults = ["Quarterly Exam", "Onam Exam", "Monthly Exam", "Weekly Exam", "Diagnosis Exam", "Annual Exam"];
    return Array.from(new Set([...list, ...defaults])).filter(Boolean);
  }, [assessmentGroups]);

  React.useEffect(() => {
    if (examOptions.length > 0 && !examOptions.includes(selectedExam)) {
      setSelectedExam(examOptions[0]);
    }
  }, [examOptions, selectedExam]);

  // 2. Fetch branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches-for-subject-exam"],
    queryFn: getBranches,
    staleTime: 5 * 60_000,
  });

  // 3. Fetch assessment plans
  const { data: allPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["all-plans-for-subject-exam"],
    queryFn: async () => {
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
              "assessment_group",
            ]),
            filters: JSON.stringify([["docstatus", "=", 1]]),
            limit_page_length: "2000",
          },
        }),
      }).then((r) => r.json());
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  // 4. Fetch Program Enrollments to map student -> custom_plan
  const { data: programEnrollments = [] } = useQuery({
    queryKey: ["all-program-enrollments-exam-subject"],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Program Enrollment",
          method: "GET",
          payload: {
            fields: JSON.stringify(["student", "custom_plan"]),
            filters: JSON.stringify([["docstatus", "=", 1]]),
            limit_page_length: "15000",
          },
        }),
      }).then((r) => r.json());
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  const studentPlanMap = useMemo(() => {
    const map = new Map<string, string>();
    programEnrollments.forEach((pe: any) => {
      if (pe.student && pe.custom_plan) {
        map.set(pe.student, pe.custom_plan);
      }
    });
    return map;
  }, [programEnrollments]);

  // 5. Fetch assessment results
  const { data: allResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["all-results-for-subject-exam"],
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
            limit_page_length: "20000",
          },
        }),
      }).then((r) => r.json());
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  // Fast mapping of results by Assessment Plan name
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

  const matchesSelectedExam = (plan: any) => {
    const ag = (plan.assessment_group || "").toLowerCase();
    const an = (plan.assessment_name || "").toLowerCase();
    const sel = selectedExam.toLowerCase();
    return ag === sel || an.includes(sel) || ag.includes(sel);
  };

  // Extract available subjects & standards strictly for the chosen Exam
  const { availableSubjects, availableStandards, examPlansFiltered } = useMemo(() => {
    const filteredPlans = allPlans.filter(matchesSelectedExam);

    const subSet = new Set<string>();
    const stdSet = new Set<string>();

    filteredPlans.forEach((p: any) => {
      if (p.course) {
        const baseSub = getBaseSubject(p.course);
        if (baseSub) subSet.add(baseSub);
      }
      const std = extractStandard(p.student_group || p.course || "");
      if (std && std !== "Other") {
        stdSet.add(std);
      }
    });

    const sortedStandards = Array.from(stdSet).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
    const sortedSubjects = Array.from(subSet).sort();

    return {
      availableSubjects: sortedSubjects,
      availableStandards: sortedStandards,
      examPlansFiltered: filteredPlans,
    };
  }, [allPlans, selectedExam]);

  // Adjust fallback if currently selected subject/standard isn't in options
  React.useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(selectedSubject)) {
      const hasPhysics = availableSubjects.find((s) => s.toLowerCase() === "physics");
      setSelectedSubject(hasPhysics || availableSubjects[0]);
    }
  }, [availableSubjects, selectedSubject]);

  React.useEffect(() => {
    if (availableStandards.length > 0 && selectedStandard !== "all" && !availableStandards.includes(selectedStandard)) {
      const has10th = availableStandards.find((s) => s === "10th");
      setSelectedStandard(has10th || "all");
    }
  }, [availableStandards, selectedStandard]);

  // Level 1: Class Summaries Calculation
  const classSummaries = useMemo(() => {
    const defaultStandards = ["8th", "9th", "10th", "11th", "12th"];
    const standardKeys = Array.from(new Set([...availableStandards, ...defaultStandards]))
      .sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));

    return standardKeys.map((stdKey) => {
      const stdPlans = examPlansFiltered.filter((p: any) => {
        const std = extractStandard(p.student_group || p.course || "");
        return std.toLowerCase() === stdKey.toLowerCase();
      });

      const subjectsSet = new Set<string>();
      const resultsList: any[] = [];

      stdPlans.forEach((p: any) => {
        if (p.course) {
          const baseSub = getBaseSubject(p.course);
          if (baseSub) subjectsSet.add(baseSub);
        }
        const resList = resultsByPlan.get(p.name) || [];
        resultsList.push(...resList);
      });

      let passedCount = 0;
      resultsList.forEach((r: any) => {
        const score = Number(r.total_score) || 0;
        const max = Number(r.maximum_score) || 100;
        const pct = max > 0 ? (score / max) * 100 : 0;
        if (pct >= 40) passedCount++;
      });

      const totalResults = resultsList.length;
      const passRate = totalResults > 0 ? Math.round((passedCount / totalResults) * 100) : 0;

      let label = `${stdKey} Grade`;
      if (stdKey === "11th") label = "11th Grade (Plus One)";
      if (stdKey === "12th") label = "12th Grade (Plus Two)";

      return {
        standard: stdKey,
        label,
        subjectsCount: subjectsSet.size,
        examsCount: stdPlans.length,
        totalAppeared: totalResults,
        passRate,
        subjects: Array.from(subjectsSet),
      };
    });
  }, [availableStandards, examPlansFiltered, resultsByPlan]);

  // Level 2: Subject Summaries Calculation for selected standard
  const subjectsForStandard = useMemo(() => {
    const stdPlans = examPlansFiltered.filter((p: any) => {
      if (selectedStandard === "all") return true;
      const std = extractStandard(p.student_group || p.course || "");
      return std.toLowerCase() === selectedStandard.toLowerCase();
    });

    const subMap = new Map<string, { plans: any[]; results: any[] }>();

    stdPlans.forEach((p: any) => {
      const baseSub = getBaseSubject(p.course);
      if (!baseSub) return;
      if (!subMap.has(baseSub)) {
        subMap.set(baseSub, { plans: [], results: [] });
      }
      const entry = subMap.get(baseSub)!;
      entry.plans.push(p);
      const resList = resultsByPlan.get(p.name) || [];
      entry.results.push(...resList);
    });

    return Array.from(subMap.entries()).map(([subName, data]) => {
      let passedCount = 0;
      let totalScore = 0;
      let totalMax = 0;

      data.results.forEach((r: any) => {
        const score = Number(r.total_score) || 0;
        const max = Number(r.maximum_score) || 100;
        const pct = max > 0 ? (score / max) * 100 : 0;
        if (pct >= 40) passedCount++;
        totalScore += score;
        totalMax += max;
      });

      const totalStudents = data.results.length;
      const passRate = totalStudents > 0 ? Math.round((passedCount / totalStudents) * 100) : 0;
      const averageScore = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

      return {
        subject: subName,
        plansCount: data.plans.length,
        studentsCount: totalStudents,
        passRate,
        averageScore,
      };
    }).sort((a, b) => b.passRate - a.passRate);
  }, [examPlansFiltered, selectedStandard, resultsByPlan]);

  // Level 3: Branch Ranking Calculation for selected standard & subject
  const branchRankings = useMemo(() => {
    const targetPlans = examPlansFiltered.filter((p: any) => {
      const matchSubject = getBaseSubject(p.course).toLowerCase() === selectedSubject.toLowerCase();
      const matchStandard =
        selectedStandard === "all" ||
        extractStandard(p.student_group || p.course || "").toLowerCase() === selectedStandard.toLowerCase();
      return matchSubject && matchStandard;
    });

    const branchMap = new Map<
      string,
      {
        branchName: string;
        branchClean: string;
        plans: any[];
        results: any[];
        classes: Set<string>;
      }
    >();

    targetPlans.forEach((p: any) => {
      const branchKey = p.custom_branch || "Main Branch";
      if (!branchMap.has(branchKey)) {
        branchMap.set(branchKey, {
          branchName: branchKey,
          branchClean: cleanBranchName(branchKey),
          plans: [],
          results: [],
          classes: new Set<string>(),
        });
      }
      const entry = branchMap.get(branchKey)!;
      entry.plans.push(p);
      if (p.student_group) entry.classes.add(p.student_group);

      const resList = resultsByPlan.get(p.name) || [];
      entry.results.push(
        ...resList.map((r) => ({
          ...r,
          studentGroup: p.student_group,
          customBranch: branchKey,
          maximumScore: Number(p.maximum_assessment_score) || Number(r.maximum_score) || 100,
        }))
      );
    });

    const list = Array.from(branchMap.values()).map((b) => {
      const totalStudents = b.results.length;
      let passedCount = 0;
      let fullMarksCount = 0;
      let p90Count = 0;
      let p80Count = 0;
      let failedCount = 0;
      let totalObtained = 0;
      let totalMax = 0;

      b.results.forEach((r: any) => {
        const score = Number(r.total_score) || 0;
        const max = Number(r.maximum_score) || Number(r.maximumScore) || 100;
        const pct = max > 0 ? (score / max) * 100 : 0;

        totalObtained += score;
        totalMax += max;

        if (pct >= 40) passedCount++;
        else failedCount++;

        if (score >= max && max > 0) fullMarksCount++;
        if (pct >= 90) p90Count++;
        if (pct >= 80) p80Count++;
      });

      const passRate = totalStudents > 0 ? Math.round((passedCount / totalStudents) * 100) : 0;
      const averageScore = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

      return {
        ...b,
        totalStudents,
        passedCount,
        failedCount,
        fullMarksCount,
        p90Count,
        p80Count,
        passRate,
        averageScore,
        classesCount: b.classes.size,
      };
    });

    // Sort by chosen metric
    list.sort((a, b) => {
      if (rankingSortBy === "passRate") {
        return (
          b.passRate - a.passRate ||
          b.fullMarksCount - a.fullMarksCount ||
          b.p90Count - a.p90Count ||
          b.averageScore - a.averageScore ||
          b.totalStudents - a.totalStudents
        );
      }
      if (rankingSortBy === "averageScore") {
        return (
          b.averageScore - a.averageScore ||
          b.fullMarksCount - a.fullMarksCount ||
          b.passRate - a.passRate
        );
      }
      return (
        b.fullMarksCount - a.fullMarksCount ||
        b.p90Count - a.p90Count ||
        b.passRate - a.passRate ||
        b.averageScore - a.averageScore
      );
    });

    return list;
  }, [examPlansFiltered, selectedSubject, selectedStandard, resultsByPlan, rankingSortBy]);

  // Drill-down data: Detailed student rank list for selected branch
  const drillDownDetails = useMemo(() => {
    if (!drillDownBranch) return null;
    const branchInfo = branchRankings.find(
      (b) => b.branchName === drillDownBranch || b.branchClean === drillDownBranch
    );
    if (!branchInfo) return null;

    const sortedStudents = [...branchInfo.results].map((r: any) => {
      const score = Number(r.total_score) || 0;
      const max = Number(r.maximumScore) || Number(r.maximum_score) || 100;
      const pct = max > 0 ? Number(((score / max) * 100).toFixed(1)) : 0;
      let grade = "F";
      if (pct >= 90) grade = "A+";
      else if (pct >= 80) grade = "A";
      else if (pct >= 70) grade = "B+";
      else if (pct >= 60) grade = "B";
      else if (pct >= 50) grade = "C+";
      else if (pct >= 40) grade = "C";

      return {
        student: r.student,
        studentName: r.student_name || r.student,
        studentGroup: r.studentGroup,
        customPlan: studentPlanMap.get(r.student) || "",
        score,
        max,
        pct,
        grade,
        passed: pct >= 40,
      };
    });

    let filtered = sortedStudents;
    if (selectedPlanFilter === "Advanced") {
      filtered = filtered.filter((s) => (s.customPlan || "").toLowerCase().includes("advanced"));
    } else if (selectedPlanFilter === "Basic") {
      filtered = filtered.filter((s) => (s.customPlan || "").toLowerCase().includes("basic") || !s.customPlan);
    }

    filtered.sort((a, b) => b.score - a.score || b.pct - a.pct);

    let rank = 1;
    const rankedList = filtered.map((st, idx, arr) => {
      if (idx > 0 && st.pct < arr[idx - 1].pct) {
        rank = idx + 1;
      }
      return { ...st, rank };
    });

    // Filter students by selected criteria
    const filteredStudents = rankedList.filter((st) => {
      switch (selectedStudentFilter) {
        case "topper":
          return st.rank === 1;
        case "top3":
          return st.rank <= 3;
        case "top5":
          return st.rank <= 5;
        case "top10":
          return st.rank <= 10;
        case "top15":
          return st.rank <= 15;
        case "full_mark":
          return st.score >= st.max && st.max > 0;
        case "full_aplus":
          return st.pct >= 90;
        case "p90":
          return st.pct >= 90;
        case "p85":
          return st.pct >= 85;
        case "p80":
          return st.pct >= 80;
        case "p75":
          return st.pct >= 75;
        case "p70":
          return st.pct >= 70;
        case "p60":
          return st.pct >= 60;
        case "p50":
          return st.pct >= 50;
        case "p30":
          return st.pct >= 30;
        case "below70":
          return st.pct < 70;
        case "below60":
          return st.pct < 60;
        case "below50":
          return st.pct < 50;
        case "failed_30":
          return !st.passed || st.pct < 30;
        case "passed":
          return st.passed;
        default:
          return true;
      }
    });

    // Performance analysis calculation (computed over ALL ranked students in the branch, unaffected by the table filter)
    const total = rankedList.length;
    const getNames = (list: typeof rankedList) => 
      list.length > 0 ? list.map((st) => st.studentName).join(", ") : "—";

    const topperList = rankedList.filter((st) => st.rank === 1);
    const top3List = rankedList.filter((st) => st.rank <= 3);
    const top5List = rankedList.filter((st) => st.rank <= 5);
    const top10List = rankedList.filter((st) => st.rank <= 10);
    const top15List = rankedList.filter((st) => st.rank <= 15);
    const fullMarkList = rankedList.filter((st) => st.score >= st.max && st.max > 0);
    const fullAPlusList = rankedList.filter((st) => st.pct >= 90);
    const p90List = rankedList.filter((st) => st.pct >= 90);
    const p85List = rankedList.filter((st) => st.pct >= 85);
    const p80List = rankedList.filter((st) => st.pct >= 80);
    const p75List = rankedList.filter((st) => st.pct >= 75);
    const p70List = rankedList.filter((st) => st.pct >= 70);
    const p60List = rankedList.filter((st) => st.pct >= 60);
    const p50List = rankedList.filter((st) => st.pct >= 50);
    const p30List = rankedList.filter((st) => st.pct >= 30);
    const below70List = rankedList.filter((st) => st.pct < 70);
    const below60List = rankedList.filter((st) => st.pct < 60);
    const below50List = rankedList.filter((st) => st.pct < 50);
    const failedList = rankedList.filter((st) => !st.passed || st.pct < 40);
    const passedList = rankedList.filter((st) => st.passed);

    const rows = [
      { key: "Class Topper", list: topperList, isPct: false },
      { key: "Top 3", list: top3List, isPct: false },
      { key: "Top 5", list: top5List, isPct: false },
      { key: "Top 10", list: top10List, isPct: false },
      { key: "Top 15", list: top15List, isPct: false },
      { key: "Full Mark Achievers", list: fullMarkList, isPct: true },
      { key: "Full A+ Achievers", list: fullAPlusList, isPct: true },
      { key: "90% & Above", list: p90List, isPct: true },
      { key: "85% & Above", list: p85List, isPct: true },
      { key: "80% & Above", list: p80List, isPct: true },
      { key: "75% & Above", list: p75List, isPct: true },
      { key: "70% & Above", list: p70List, isPct: true },
      { key: "60% & Above", list: p60List, isPct: true },
      { key: "50% & Above", list: p50List, isPct: true },
      { key: "30% & Above", list: p30List, isPct: true },
      { key: "Below 70%", list: below70List, isPct: true },
      { key: "Below 60%", list: below60List, isPct: true },
      { key: "Below 50%", list: below50List, isPct: true },
      { key: "Below 30% (Failed in Subject)", list: rankedList.filter((st) => st.pct < 30 || !st.passed), isPct: true },
      { key: "Passed in Subject", list: passedList, isPct: true },
    ];

    const analysisData = rows.map((r) => ({
      criteria: r.key,
      count: r.list.length,
      percentage: total > 0 ? Math.round((r.list.length / total) * 100) : 0,
      isPct: r.isPct,
      names: getNames(r.list),
    }));

    return {
      branchInfo,
      students: rankedList,
      filteredStudents,
      analysisData,
    };
  }, [drillDownBranch, branchRankings, selectedPlanFilter, studentPlanMap, selectedStudentFilter]);

  const pageLoading = branchesLoading || plansLoading || resultsLoading;

  const handlePrintTranscript = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <BreadcrumbNav />
          <h1 className="text-2xl font-bold text-text-primary mt-1 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-emerald-600" />
            Subject Wise Ranking ({selectedExam})
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Compare all branches across specific subjects and classes for {selectedExam}.
          </p>
        </div>

        <div className="flex gap-2">
          {level !== "classes" && (
            <button
              onClick={() => {
                if (level === "ranking") setLevel("subjects");
                else if (level === "subjects") setLevel("classes");
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary bg-surface border border-border/60 hover:border-border transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
          <Link href="/dashboard/curriculum-dept/exam-corner">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary bg-surface border border-border/60 hover:border-border transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Exam Corner
            </button>
          </Link>
        </div>
      </div>

      {/* Dynamic Exam Selector */}
      <div className="flex flex-wrap items-center gap-3 bg-surface p-2.5 rounded-2xl border border-border/60 shadow-sm w-fit">
        <div className="flex items-center gap-2 px-2 text-xs font-semibold text-text-secondary">
          <Calendar className="h-4 w-4 text-emerald-600" />
          <span>Choose Exam:</span>
        </div>
        <select
          value={selectedExam}
          onChange={(e) => setSelectedExam(e.target.value)}
          className="h-9 px-3 text-xs bg-surface border border-border-input rounded-xl font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        >
          {examOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <div className="hidden sm:flex items-center gap-1.5 border-l border-border/60 pl-3">
          {examOptions.slice(0, 4).map((opt) => (
            <button
              key={opt}
              onClick={() => setSelectedExam(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedExam === opt
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation History Path */}
      {level !== "classes" && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-text-secondary mt-1">
          <span
            className="hover:underline cursor-pointer text-emerald-600 font-medium"
            onClick={() => setLevel("classes")}
          >
            All Grades
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
          <span
            className="hover:underline cursor-pointer text-emerald-600 font-medium"
            onClick={() => setLevel("subjects")}
          >
            {selectedStandard} Grade
          </span>
          {level === "ranking" && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="text-text-tertiary">{selectedSubject} Leaderboard</span>
            </>
          )}
        </div>
      )}

      {pageLoading ? (
        <div className="py-32 flex justify-center items-center">
          <GifLoader size="lg" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* LEVEL 1: GRADE / CLASS SELECTION CARDS */}
          {level === "classes" && (
            <motion.div
              key="classes"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {classSummaries.map((c) => {
                  const colors = getRateColor(c.passRate);
                  return (
                    <Card
                      key={c.standard}
                      className="hover:border-emerald-500/40 hover:shadow-lg cursor-pointer transition-all duration-200 group bg-surface overflow-hidden relative"
                      onClick={() => {
                        setSelectedStandard(c.standard);
                        setLevel("subjects");
                      }}
                    >
                      <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 w-full" />
                      <CardHeader className="p-6 pb-2">
                        <div className="flex justify-between items-start">
                          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl group-hover:scale-105 transition-transform">
                            <GraduationCap className="h-7 w-7" />
                          </div>
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-semibold">
                            {c.subjectsCount} Subjects
                          </Badge>
                        </div>
                        <CardTitle className="text-lg font-bold text-text-primary mt-4 group-hover:text-emerald-600 transition-colors">
                          {c.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 pt-2">
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-xs text-text-secondary font-medium">Overall Pass Rate</span>
                          <span className={`text-2xl font-black ${colors.text}`}>{c.passRate}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 mt-3 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${colors.bg}`} style={{ width: `${c.passRate}%` }} />
                        </div>
                        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-text-tertiary">
                          <span>{c.totalAppeared} student exam records</span>
                          <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* LEVEL 2: SUBJECT SELECTION */}
          {level === "subjects" && (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between bg-surface p-4 rounded-2xl border border-border/60">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">{selectedStandard} Grade – Choose Subject</h2>
                  <p className="text-xs text-text-secondary">Select a subject to view comparative branch rankings for {selectedExam}</p>
                </div>
              </div>

              {subjectsForStandard.length === 0 ? (
                <div className="py-24 text-center text-text-tertiary">
                  No subject exams recorded for {selectedStandard} Grade under {selectedExam}.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subjectsForStandard.map((s) => {
                    const colors = getRateColor(s.passRate);
                    return (
                      <Card
                        key={s.subject}
                        className="hover:border-emerald-500/40 hover:shadow-lg cursor-pointer transition-all duration-200 group bg-surface"
                        onClick={() => {
                          setSelectedSubject(s.subject);
                          setLevel("ranking");
                        }}
                      >
                        <CardHeader className="p-6 pb-2">
                          <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                              <BookOpen className="h-6 w-6" />
                            </div>
                            <Badge className="bg-slate-50 dark:bg-slate-800 text-text-secondary border border-border/60">
                              {s.plansCount} Plans
                            </Badge>
                          </div>
                          <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-emerald-600 transition-colors">
                            {s.subject}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                          <div className="mt-2 flex items-baseline justify-between">
                            <span className="text-xs text-text-secondary font-medium">Pass Rate</span>
                            <span className={`text-2xl font-black ${colors.text}`}>{s.passRate}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 mt-3 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${colors.bg}`} style={{ width: `${s.passRate}%` }} />
                          </div>
                          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-text-tertiary">
                            <span>Average Score: {s.averageScore}%</span>
                            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* LEVEL 3: BRANCH RANKINGS TABLE FOR SELECTED SUBJECT */}
          {level === "ranking" && (
            <motion.div
              key="ranking"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Filter & Metric Selector Bar */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-border/60">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    {selectedStandard} Grade {selectedSubject} – {selectedExam} Leaderboard
                  </h2>
                  <p className="text-xs text-text-secondary">Branch comparative rankings and metrics</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary font-medium">Plan:</span>
                    <select
                      value={selectedPlanFilter}
                      onChange={(e) => setSelectedPlanFilter(e.target.value as any)}
                      className="h-9 px-3 text-xs bg-surface border border-border-input rounded-xl font-semibold text-text-primary"
                    >
                      <option value="all">All Plans</option>
                      <option value="Advanced">⚡ Advanced Students</option>
                      <option value="Basic">📘 Basic Students</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary font-medium">Sort By:</span>
                    <select
                      value={rankingSortBy}
                      onChange={(e) => setRankingSortBy(e.target.value as any)}
                      className="h-9 px-3 text-xs bg-surface border border-border-input rounded-xl font-semibold text-text-primary"
                    >
                      <option value="passRate">Highest Pass Rate</option>
                      <option value="averageScore">Highest Average Score</option>
                      <option value="topperCount">Most Full Marks</option>
                    </select>
                  </div>

                  <button
                    onClick={handlePrintTranscript}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                </div>
              </div>

              {!drillDownBranch ? (
                /* VIEW 1: Branch Rankings Table */
                <div className="bg-surface rounded-2xl border border-border/60 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-border/60 text-text-secondary">
                        <tr>
                          <th className="p-3.5 pl-6 font-bold w-12">Rank</th>
                          <th className="p-3.5 font-bold">Branch Name</th>
                          <th className="p-3.5 font-bold text-center">Batches</th>
                          <th className="p-3.5 font-bold text-center">Students</th>
                          <th className="p-3.5 font-bold text-center">Pass Rate</th>
                          <th className="p-3.5 font-bold text-center">Average Score</th>
                          <th className="p-3.5 font-bold text-center">Full Marks</th>
                          <th className="p-3.5 font-bold text-center">90%+ Achievers</th>
                          <th className="p-3.5 font-bold text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {branchRankings.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-center py-12 text-text-tertiary">
                              No branch records found for this subject and exam.
                            </td>
                          </tr>
                        ) : (
                          branchRankings.map((b, idx) => {
                            const colors = getRateColor(b.passRate);
                            return (
                              <tr 
                                key={b.branchName} 
                                onClick={() => setDrillDownBranch(b.branchName)}
                                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                              >
                                <td className="p-3.5 pl-6 font-bold text-text-primary">
                                  {idx === 0 ? (
                                    <span className="p-1 px-2 rounded-md bg-amber-500/10 text-amber-600 font-black">#1</span>
                                  ) : (
                                    `#${idx + 1}`
                                  )}
                                </td>
                                <td className="p-3.5 font-bold text-text-primary flex items-center gap-2 group-hover:text-emerald-600 transition-colors">
                                  <School className="h-4 w-4 text-text-tertiary" />
                                  {b.branchClean}
                                </td>
                                <td className="p-3.5 text-center text-text-secondary">{b.classesCount}</td>
                                <td className="p-3.5 text-center font-semibold text-text-primary">{b.totalStudents}</td>
                                <td className="p-3.5 text-center font-bold">
                                  <span className={colors.text}>{b.passRate}%</span>
                                </td>
                                <td className="p-3.5 text-center font-bold text-text-primary">{b.averageScore}%</td>
                                <td className="p-3.5 text-center text-amber-600 font-bold">{b.fullMarksCount}</td>
                                <td className="p-3.5 text-center text-purple-600 font-bold">{b.p90Count}</td>
                                <td className="p-3.5 text-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDrillDownBranch(b.branchName);
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg transition-colors"
                                  >
                                    <span>View Students</span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* VIEW 2: Students Rank List for the Selected Branch */
                <div className="space-y-6">
                  {/* Top Bar with Navigation and Filter Controls */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-border/60 shadow-sm print:hidden">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setDrillDownBranch(null);
                          setSelectedStudentFilter("all");
                        }}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <div>
                        <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                          <School className="h-5 w-5 text-emerald-600" />
                          {drillDownDetails?.branchInfo.branchClean} — {selectedStandard} Grade {selectedSubject} Students
                        </h3>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {selectedStudentFilter !== "all" 
                            ? `Showing ${drillDownDetails?.filteredStudents.length} of ${drillDownDetails?.students.length} students ranked by ${selectedExam} score`
                            : `${drillDownDetails?.students.length} students ranked by ${selectedExam} score`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Filter Students Dropdown */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider">
                          Filter Students:
                        </span>
                        <select
                          value={selectedStudentFilter}
                          onChange={(e) => setSelectedStudentFilter(e.target.value)}
                          className="h-8 px-2.5 text-xs bg-surface border border-border-input rounded-[8px] font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          {studentFilterOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Plan Filter */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider">Plan:</span>
                        <select
                          value={selectedPlanFilter}
                          onChange={(e) => setSelectedPlanFilter(e.target.value as any)}
                          className="h-8 px-2.5 text-xs bg-surface border border-border-input rounded-[8px] font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        >
                          <option value="all">All Plans</option>
                          <option value="Advanced">⚡ Advanced Students</option>
                          <option value="Basic">📘 Basic Students</option>
                        </select>
                      </div>

                      {/* Back button */}
                      <button
                        onClick={() => {
                          setDrillDownBranch(null);
                          setSelectedStudentFilter("all");
                        }}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold rounded-xl text-text-secondary transition-colors"
                      >
                        Back to All Branches
                      </button>

                      {/* Print Button */}
                      <button
                        onClick={() => {
                          const element = document.getElementById("printable-subject-ranking-card");
                          if (!element) return;
                          
                          const clone = element.cloneNode(true) as HTMLElement;
                          clone.id = "print-clone-container";
                          
                          const style = document.createElement("style");
                          style.id = "print-style-block";
                          style.innerHTML = `
                            @media print {
                              @page {
                                size: A4 portrait;
                                margin: 12mm 15mm;
                              }
                              body > * {
                                display: none !important;
                              }
                              body > #print-clone-container {
                                display: block !important;
                              }
                              #print-clone-container {
                                display: block !important;
                                width: 100% !important;
                                height: auto !important;
                                overflow: visible !important;
                                position: static !important;
                                background: white !important;
                                border: none !important;
                                box-shadow: none !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                              }
                              #print-clone-container *:not(img):not(.watermark-container) {
                                visibility: visible !important;
                                opacity: 1 !important;
                              }
                              #print-clone-container .watermark-container {
                                display: none !important;
                              }
                              #print-clone-container::after {
                                content: "" !important;
                                display: block !important;
                                visibility: visible !important;
                                position: fixed !important;
                                left: 50% !important;
                                top: 45% !important;
                                transform: translate(-50%, -50%) !important;
                                width: 300px !important;
                                height: 300px !important;
                                background-image: url('/smartup-logo-v2.png') !important;
                                background-repeat: no-repeat !important;
                                background-position: center !important;
                                background-size: contain !important;
                                opacity: 0.05 !important;
                                z-index: -1000 !important;
                                pointer-events: none !important;
                              }
                              #print-clone-container table {
                                width: 100% !important;
                                table-layout: auto !important;
                                border-collapse: collapse !important;
                              }
                              #print-clone-container tr {
                                page-break-inside: avoid !important;
                              }
                              #print-clone-container th, #print-clone-container td {
                                font-size: 8px !important;
                                padding: 5px 6px !important;
                                border-bottom: 1px solid #eee !important;
                              }
                            }
                          `;
                          document.head.appendChild(style);
                          document.body.appendChild(clone);
                          
                          window.print();
                          
                          setTimeout(() => {
                            style.remove();
                            clone.remove();
                          }, 1000);
                        }}
                        className="h-8 px-3 text-xs font-semibold bg-surface border border-border-input hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-[8px] flex items-center gap-1.5 transition-colors"
                      >
                        <Printer className="h-3.5 w-3.5" /> Print Report
                      </button>
                    </div>
                  </div>

                  {/* Printable Card Container */}
                  <Card id="printable-subject-ranking-card" className="border border-slate-100 dark:border-white/[0.06] shadow-sm overflow-hidden bg-surface relative">
                    {/* Watermark Logo */}
                    <div className="watermark-container absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] dark:opacity-[0.05] select-none z-0">
                      <img 
                        src="/smartup-logo-v2.png" 
                        alt="Watermark" 
                        className="watermark-logo w-80 h-auto object-contain max-w-full"
                      />
                    </div>

                    {/* Official Report Header */}
                    <div className="bg-emerald-500/5 dark:bg-emerald-500/10 px-6 py-5 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <img 
                          src="/smartup-logo-v2.png" 
                          alt="Smart Up Logo" 
                          className="h-10 w-auto object-contain shrink-0"
                        />
                        <div>
                          <h1 className="text-[11px] font-black text-emerald-600 tracking-wider uppercase">
                            SmartUp Learning Ventures
                          </h1>
                          <h2 className="text-base font-extrabold text-text-primary tracking-tight mt-0.5">
                            {selectedStandard} GRADE {selectedSubject.toUpperCase()} RANK LIST
                          </h2>
                          <p className="text-[10px] text-text-tertiary mt-0.5 uppercase tracking-wider font-semibold">
                            Exam: {selectedExam} • Branch: {drillDownDetails?.branchInfo.branchClean}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-bold uppercase text-[9px] px-2.5 py-0.5">
                        Official Transcript
                      </Badge>
                    </div>

                    {/* Active Filter Notice */}
                    {selectedStudentFilter !== "all" && (
                      <div className="m-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between print:hidden relative z-10">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-600 text-white text-[10px] font-black">!</span>
                          <span className="text-xs font-bold text-text-primary">
                            Filter Active: <span className="text-emerald-600">{studentFilterOptions.find(o => o.value === selectedStudentFilter)?.label}</span> ({drillDownDetails?.filteredStudents.length} Students)
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedStudentFilter("all")}
                          className="text-xs font-bold text-text-secondary hover:text-text-primary hover:underline"
                        >
                          Clear Filter (Show All)
                        </button>
                      </div>
                    )}

                    {/* Students Rank Table */}
                    <div className="overflow-x-auto relative z-10">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-border/60 text-text-secondary">
                          <tr>
                            <th className="p-3.5 pl-6 font-bold w-12">Rank</th>
                            <th className="p-3.5 font-bold">Student Name</th>
                            <th className="p-3.5 font-bold">Student ID</th>
                            <th className="p-3.5 font-bold">Batch / Class</th>
                            <th className="p-3.5 font-bold text-center">Score / Max</th>
                            <th className="p-3.5 font-bold text-center">% Score</th>
                            <th className="p-3.5 font-bold text-center">Grade</th>
                            <th className="p-3.5 font-bold text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {drillDownDetails?.filteredStudents.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="text-center py-12 text-text-tertiary">
                                No students found matching the selected filter criteria.
                              </td>
                            </tr>
                          ) : (
                            drillDownDetails?.filteredStudents.map((st) => (
                              <tr key={st.student} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="p-3.5 pl-6 font-bold text-text-primary">
                                  {st.rank === 1 ? (
                                    <span className="p-1 px-2 rounded-md bg-amber-500/10 text-amber-600 font-black">#1</span>
                                  ) : (
                                    `#${st.rank}`
                                  )}
                                </td>
                                <td className="p-3.5 font-bold text-text-primary">
                                  <div className="flex items-center gap-2">
                                    <span>{st.studentName}</span>
                                    {st.customPlan && (st.customPlan || "").toLowerCase().includes("advanced") && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-purple-500/10 text-purple-600 border border-purple-500/30">
                                        ⚡ Advanced
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3.5 text-text-secondary font-mono">{st.student}</td>
                                <td className="p-3.5 text-text-secondary">
                                  <Badge variant="outline" className="text-[10px] border-border/60">
                                    {st.studentGroup?.replace(/^Smart\s+Up\s+|^[A-Za-z0-9]+-/, "") || "General"}
                                  </Badge>
                                </td>
                                <td className="p-3.5 font-mono font-bold text-center text-text-primary">
                                  {st.score} <span className="text-[10px] text-text-tertiary font-normal">/ {st.max}</span>
                                </td>
                                <td className="p-3.5 font-black text-center text-emerald-600">
                                  {st.pct}%
                                </td>
                                <td className="p-3.5 text-center font-bold">
                                  <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-xs">
                                    {st.grade}
                                  </Badge>
                                </td>
                                <td className="p-3.5 text-center">
                                  {st.passed ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px]">
                                      Passed
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[10px]">
                                      Failed
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Performance Analysis Table */}
                    <div className="border-t border-slate-100 dark:border-white/[0.06] mt-8 relative z-10 page-break-before-auto">
                      <div className="bg-slate-50/50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                          Performance Analysis
                        </h3>
                      </div>
                      <div className="p-0 overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-100/30 dark:bg-white/[0.01] text-[10px] uppercase font-bold text-text-tertiary tracking-wider">
                              <th className="px-6 py-3 w-1/4">Analysis</th>
                              <th className="px-6 py-3 text-center w-24">Count</th>
                              <th className="px-6 py-3 w-1/2">Names</th>
                              <th className="px-6 py-3 text-center w-32">% of Class</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                            {drillDownDetails?.analysisData.map((row) => (
                              <tr key={row.criteria} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/5 transition-colors">
                                <td className="px-6 py-2.5 font-bold text-text-primary">{row.criteria}</td>
                                <td className="px-6 py-2.5 text-center font-semibold text-text-secondary">{row.count}</td>
                                <td className="px-6 py-2.5 text-text-secondary">{row.names}</td>
                                <td className="px-6 py-2.5 text-center font-bold text-text-primary">{row.isPct ? `${row.percentage}%` : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Official Signature Lines (Print Mode Only) */}
                    <div className="hidden print:flex justify-between items-center px-12 pt-16 pb-8 text-xs text-text-tertiary relative z-10">
                      <div className="text-center border-t border-slate-300 w-36 pt-1.5 mt-6 font-semibold">
                        Subject Teacher
                      </div>
                      <div className="text-center border-t border-slate-300 w-36 pt-1.5 mt-6 font-semibold">
                        Branch Coordinator
                      </div>
                      <div className="text-center border-t border-slate-300 w-36 pt-1.5 mt-6 font-semibold">
                        Academic Director
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
