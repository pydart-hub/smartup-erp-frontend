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
  Filter
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GifLoader } from "@/components/ui/GifLoader";
import { getBranches } from "@/lib/api/enrollment";

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

export default function SubjectRankingPage() {
  // 3-Level Drill-Down: "classes" | "subjects" | "ranking"
  const [level, setLevel] = useState<"classes" | "subjects" | "ranking">("classes");

  const [selectedCwc, setSelectedCwc] = useState("CWC 1");
  const [selectedSubject, setSelectedSubject] = useState("Physics");
  const [selectedStandard, setSelectedStandard] = useState("10th");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<"all" | "Advanced" | "Basic">("all");
  const [rankingSortBy, setRankingSortBy] = useState<"passRate" | "averageScore" | "topperCount">("passRate");

  // Selected Branch for Drill-down / Detailed Student list
  const [drillDownBranch, setDrillDownBranch] = useState<string | null>(null);

  const cwcOptions = ["CWC 1", "CWC 2", "CWC 3"];

  // 1. Fetch branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches-for-subject-cwc"],
    queryFn: getBranches,
    staleTime: 5 * 60_000,
  });

  // 2. Fetch assessment plans
  const { data: allPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["all-plans-for-subject-cwc"],
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
            limit_page_length: "3000",
          },
        }),
      }).then((r) => r.json());
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  // 3. Fetch assessment results
  const { data: allResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["all-results-for-subject-cwc"],
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

  // Extract available subjects & standards strictly for CWC
  const { availableSubjects, availableStandards, cwcPlansFiltered } = useMemo(() => {
    const match = selectedCwc.toLowerCase().match(/cwc\s*(?:exam\s*)?(\d+)/);
    const cwcNum = match ? match[1] : "";
    const targetRegex = cwcNum ? new RegExp(`cwc\\s*(?:exam\\s*)?${cwcNum}\\b`, "i") : /cwc/i;

    const filteredPlans = allPlans.filter((p: any) => {
      const ag = (p.assessment_group || "").toLowerCase();
      const an = (p.assessment_name || "").toLowerCase();
      return targetRegex.test(ag) || targetRegex.test(an);
    });

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
      cwcPlansFiltered: filteredPlans,
    };
  }, [allPlans, selectedCwc]);

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
      const stdPlans = cwcPlansFiltered.filter((p: any) => {
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
        key: stdKey,
        label,
        subjectsCount: subjectsSet.size,
        totalStudents: totalResults,
        passRate: totalResults > 0 ? `${passRate}%` : "N/A",
        numericRate: passRate,
        plansCount: stdPlans.length,
      };
    });
  }, [availableStandards, cwcPlansFiltered, resultsByPlan]);

  // Level 2: Subject Summaries Calculation for Selected Class
  const subjectSummariesForSelectedClass = useMemo(() => {
    if (!selectedStandard) return [];

    const stdPlans = cwcPlansFiltered.filter((p: any) => {
      if (selectedStandard === "all") return true;
      const std = extractStandard(p.student_group || p.course || "");
      return std.toLowerCase() === selectedStandard.toLowerCase();
    });

    const subMap = new Map<string, {
      subjectName: string;
      plans: any[];
      branchMap: Map<string, { total: number; passed: number }>;
    }>();

    stdPlans.forEach((p: any) => {
      const sub = getBaseSubject(p.course);
      if (!sub) return;
      if (!subMap.has(sub)) {
        subMap.set(sub, { subjectName: sub, plans: [], branchMap: new Map() });
      }
      const entry = subMap.get(sub)!;
      entry.plans.push(p);

      const branchKey = cleanBranchName(p.custom_branch || "Other");
      if (!entry.branchMap.has(branchKey)) {
        entry.branchMap.set(branchKey, { total: 0, passed: 0 });
      }
      const branchEntry = entry.branchMap.get(branchKey)!;

      const resList = resultsByPlan.get(p.name) || [];
      resList.forEach((r: any) => {
        const score = Number(r.total_score) || 0;
        const max = Number(r.maximum_score) || 100;
        const pct = max > 0 ? (score / max) * 100 : 0;
        branchEntry.total += 1;
        if (pct >= 40) branchEntry.passed += 1;
      });
    });

    return Array.from(subMap.values()).map((s) => {
      let totalStudents = 0;
      let totalPassed = 0;
      let topBranchName = "N/A";
      let topBranchRate = -1;

      s.branchMap.forEach((bData, bName) => {
        totalStudents += bData.total;
        totalPassed += bData.passed;
        const rate = bData.total > 0 ? (bData.passed / bData.total) * 100 : 0;
        if (rate > topBranchRate && bData.total > 0) {
          topBranchRate = rate;
          topBranchName = bName;
        }
      });

      const passRate = totalStudents > 0 ? Math.round((totalPassed / totalStudents) * 100) : 0;

      return {
        name: s.subjectName,
        branchesCount: s.branchMap.size,
        totalStudents,
        passRate: totalStudents > 0 ? `${passRate}%` : "N/A",
        numericRate: passRate,
        topBranchName: topBranchRate >= 0 ? topBranchName : "N/A",
        topBranchRate: topBranchRate >= 0 ? `${Math.round(topBranchRate)}%` : "N/A",
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedStandard, cwcPlansFiltered, resultsByPlan]);

  // Calculate Branch Performance for Selected Subject + Selected Standard in selected CWC
  const { branchRankingData, networkStats } = useMemo(() => {
    if (cwcPlansFiltered.length === 0 || !selectedSubject) {
      return { branchRankingData: [], networkStats: null };
    }

    // Filter plans that match selected subject and standard
    const matchingPlans = cwcPlansFiltered.filter((p: any) => {
      const baseSub = getBaseSubject(p.course);
      if (baseSub.toLowerCase() !== selectedSubject.toLowerCase()) return false;

      if (selectedStandard !== "all") {
        const std = extractStandard(p.student_group || p.course || "");
        if (std.toLowerCase() !== selectedStandard.toLowerCase()) return false;
      }
      return true;
    });

    // Group plans and results by branch
    const branchMap = new Map<
      string,
      {
        branchRaw: string;
        branchClean: string;
        plans: any[];
        results: any[];
        classes: Set<string>;
      }
    >();

    // Initialize all existing branches to display complete comparisons
    branches.forEach((b: any) => {
      branchMap.set(b.name, {
        branchRaw: b.name,
        branchClean: cleanBranchName(b.name),
        plans: [],
        results: [],
        classes: new Set<string>(),
      });
    });

    matchingPlans.forEach((p: any) => {
      const branchKey = p.custom_branch || "Other";
      if (!branchMap.has(branchKey)) {
        branchMap.set(branchKey, {
          branchRaw: branchKey,
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

    let networkTotalStudents = 0;
    let networkPassedStudents = 0;
    let networkTotalScore = 0;
    let networkTotalMax = 0;

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

      networkTotalStudents += totalStudents;
      networkPassedStudents += passedCount;
      networkTotalScore += totalObtained;
      networkTotalMax += totalMax;

      const passRate = totalStudents > 0 ? Math.round((passedCount / totalStudents) * 100) : 0;
      const avgScorePct = totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(1)) : 0;

      return {
        branchRaw: b.branchRaw,
        branchClean: b.branchClean,
        batchesCount: b.classes.size,
        classesList: Array.from(b.classes),
        totalStudents,
        passedCount,
        failedCount,
        passRate,
        numericRate: passRate,
        avgScorePct,
        fullMarksCount,
        p90Count,
        p80Count,
        results: b.results,
        examsCount: b.plans.length,
      };
    });

    // Filter out branches with 0 exams only if search is active or keep all active branches
    const activeBranchesList = list.filter((b) => b.examsCount > 0 || b.totalStudents > 0);

    // Sort branches according to chosen criteria
    activeBranchesList.sort((a, b) => {
      if (rankingSortBy === "passRate") {
        return b.passRate - a.passRate || b.avgScorePct - a.avgScorePct || b.totalStudents - a.totalStudents;
      }
      if (rankingSortBy === "averageScore") {
        return b.avgScorePct - a.avgScorePct || b.passRate - a.passRate;
      }
      return b.fullMarksCount - a.fullMarksCount || b.p90Count - a.p90Count || b.passRate - a.passRate;
    });

    // Assign rank
    let curRank = 1;
    const rankedBranches = activeBranchesList.map((item, idx, arr) => {
      if (idx > 0) {
        const prev = arr[idx - 1];
        const isTie =
          rankingSortBy === "passRate"
            ? item.passRate === prev.passRate && item.avgScorePct === prev.avgScorePct
            : item.avgScorePct === prev.avgScorePct;
        if (!isTie) {
          curRank = idx + 1;
        }
      }
      return { ...item, rank: curRank };
    });

    const netPassRate = networkTotalStudents > 0 ? Math.round((networkPassedStudents / networkTotalStudents) * 100) : 0;
    const netAvgScore = networkTotalMax > 0 ? Number(((networkTotalScore / networkTotalMax) * 100).toFixed(1)) : 0;

    return {
      branchRankingData: rankedBranches,
      networkStats: {
        totalStudents: networkTotalStudents,
        passRate: netPassRate,
        avgScore: netAvgScore,
        activeBranchesCount: rankedBranches.length,
      },
    };
  }, [cwcPlansFiltered, selectedSubject, selectedStandard, branches, resultsByPlan, rankingSortBy]);

  // Filtered branches by search query
  const displayedBranches = useMemo(() => {
    if (!searchQuery.trim()) return branchRankingData;
    const q = searchQuery.toLowerCase();
    return branchRankingData.filter(
      (b) => b.branchClean.toLowerCase().includes(q) || b.classesList.some((c) => c.toLowerCase().includes(q))
    );
  }, [branchRankingData, searchQuery]);

  // Drill-down data: Detailed student rank list for selected branch
  const drillDownDetails = useMemo(() => {
    if (!drillDownBranch) return null;
    const branchInfo = branchRankingData.find((b) => b.branchRaw === drillDownBranch || b.branchClean === drillDownBranch);
    if (!branchInfo) return null;

    // Group student results
    const sortedStudents = [...branchInfo.results].map((r: any) => {
      const score = Number(r.total_score) || 0;
      const max = Number(r.maximum_score) || 100;
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
        customPlan: r.custom_plan || "",
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

    return {
      branchInfo,
      students: rankedList,
    };
  }, [drillDownBranch, branchRankingData, selectedPlanFilter]);

  const pageLoading = branchesLoading || plansLoading || resultsLoading;

  // Print function for the student transcript
  const handlePrintTranscript = () => {
    const clone = document.getElementById("subject-printable-card")?.cloneNode(true) as HTMLElement;
    if (!clone) return;

    const printContainer = document.createElement("div");
    printContainer.id = "print-subject-container";
    printContainer.appendChild(clone);

    const style = document.createElement("style");
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #print-subject-container, #print-subject-container * { visibility: visible; }
        #print-subject-container { position: absolute; left: 0; top: 0; width: 100%; }
        #print-subject-container table { width: 100% !important; border-collapse: collapse !important; }
        #print-subject-container th, #print-subject-container td { font-size: 9px !important; padding: 6px 8px !important; border-bottom: 1px solid #ddd !important; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(printContainer);

    window.print();

    setTimeout(() => {
      style.remove();
      printContainer.remove();
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <BreadcrumbNav />
          <h1 className="text-2xl font-bold text-text-primary mt-1 flex items-center gap-2.5">
            <BookOpen className="h-7 w-7 text-emerald-600" />
            Subject Wise Ranking ({selectedCwc})
          </h1>
          {/* Interactive Navigation Breadcrumbs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary mt-1">
            <span 
              className={`hover:underline cursor-pointer font-medium ${level === "classes" ? "text-text-primary font-bold" : "text-emerald-600"}`}
              onClick={() => { setLevel("classes"); setDrillDownBranch(null); }}
            >
              All Classes
            </span>
            {level !== "classes" && selectedStandard && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
                <span 
                  className={`hover:underline cursor-pointer font-medium ${level === "subjects" ? "text-text-primary font-bold" : "text-emerald-600"}`}
                  onClick={() => { setLevel("subjects"); setDrillDownBranch(null); }}
                >
                  {selectedStandard === "all" ? "All Classes" : `${selectedStandard} Grade`}
                </span>
              </>
            )}
            {level === "ranking" && selectedSubject && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
                <span className="text-text-primary font-bold">{selectedSubject} Standings</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {level === "ranking" && drillDownBranch && (
            <button
              onClick={() => setDrillDownBranch(null)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary bg-surface border border-border/60 hover:border-border transition-colors shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Standings
            </button>
          )}
          {level === "ranking" && !drillDownBranch && (
            <button
              onClick={() => setLevel("subjects")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary bg-surface border border-border/60 hover:border-border transition-colors shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Subjects
            </button>
          )}
          {level === "subjects" && (
            <button
              onClick={() => setLevel("classes")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary bg-surface border border-border/60 hover:border-border transition-colors shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" /> Back to All Classes
            </button>
          )}
          <Link href="/dashboard/curriculum-dept/cwc-corner">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary bg-surface border border-border/60 hover:border-border transition-colors shadow-sm">
              <ArrowLeft className="h-4 w-4" /> CWC Corner Hub
            </button>
          </Link>
        </div>
      </div>

      {/* CWC Exam Selector Pills (Always visible for switching CWC context) */}
      <div className="flex items-center gap-3 bg-surface p-1.5 rounded-2xl border border-border/60 w-fit shadow-sm">
        {cwcOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => {
              setSelectedCwc(opt);
              setDrillDownBranch(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedCwc === opt
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {pageLoading ? (
        <div className="py-32 flex justify-center items-center">
          <GifLoader size="lg" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* LEVEL 1: CLASS SELECTION CARDS */}
          {level === "classes" && (
            <motion.div
              key="classes"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center bg-surface p-4 rounded-2xl border border-slate-100 dark:border-white/[0.06] shadow-sm">
                <div>
                  <h2 className="text-base font-extrabold text-text-primary">Select Class / Grade for Subject Ranking</h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Click a class card to explore its subject-wise performance breakdown across all branches.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {classSummaries.map((c) => {
                  const colors = getRateColor(c.numericRate);
                  return (
                    <Card
                      key={c.key}
                      onClick={() => {
                        setSelectedStandard(c.key);
                        setLevel("subjects");
                        setDrillDownBranch(null);
                      }}
                      className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm hover:border-emerald-500/40 hover:shadow-md transition-all group bg-surface"
                    >
                      <CardHeader className="p-6 pb-2">
                        <div className="flex justify-between items-start">
                          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-xl">
                            <GraduationCap className="h-6 w-6" />
                          </div>
                          <Badge className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-white/[0.04]">
                            {c.subjectsCount} Subjects
                          </Badge>
                        </div>
                        <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-emerald-600 transition-colors">
                          {c.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 pt-2">
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-xs text-text-secondary font-medium">Assessed Pass Rate</span>
                          <span className={`text-xl font-bold ${colors.text}`}>{c.passRate}</span>
                        </div>
                        {c.numericRate > 0 && (
                          <div className="w-full bg-slate-50 dark:bg-white/[0.04] h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className={`h-full ${colors.bg} rounded-full`} style={{ width: `${c.numericRate}%` }} />
                          </div>
                        )}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-text-tertiary font-semibold group-hover:text-emerald-600 transition-colors">
                          <span>{c.totalStudents} Students Assessed</span>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* LEVEL 2: SUBJECT SELECTION CARDS */}
          {level === "subjects" && (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center bg-surface p-4 rounded-2xl border border-slate-100 dark:border-white/[0.06] shadow-sm">
                <div>
                  <h2 className="text-base font-extrabold text-text-primary">
                    Subjects in {selectedStandard === "all" ? "All Classes" : `${selectedStandard} Grade`}
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Click a subject card to view cross-branch standings and detailed student rankings.
                  </p>
                </div>
              </div>

              {subjectSummariesForSelectedClass.length === 0 ? (
                <Card className="p-16 text-center border-dashed bg-surface">
                  <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-base font-bold text-text-primary">No Subjects Found</h3>
                  <p className="text-xs text-text-secondary mt-1">No exam records match this grade for {selectedCwc}.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subjectSummariesForSelectedClass.map((s) => {
                    const colors = getRateColor(s.numericRate);
                    return (
                      <Card
                        key={s.name}
                        onClick={() => {
                          setSelectedSubject(s.name);
                          setLevel("ranking");
                          setDrillDownBranch(null);
                        }}
                        className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm hover:border-emerald-500/40 hover:shadow-md transition-all group bg-surface"
                      >
                        <CardHeader className="p-6 pb-2">
                          <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-xl">
                              <BookOpen className="h-6 w-6" />
                            </div>
                            <Badge className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-white/[0.04]">
                              {s.branchesCount} Branches
                            </Badge>
                          </div>
                          <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-emerald-600 transition-colors">
                            {s.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                          <div className="mt-2 flex items-baseline justify-between">
                            <span className="text-xs text-text-secondary font-medium">Network Pass Rate</span>
                            <span className={`text-xl font-bold ${colors.text}`}>{s.passRate}</span>
                          </div>
                          {s.numericRate > 0 && (
                            <div className="w-full bg-slate-50 dark:bg-white/[0.04] h-1.5 rounded-full mt-3 overflow-hidden">
                              <div className={`h-full ${colors.bg} rounded-full`} style={{ width: `${s.numericRate}%` }} />
                            </div>
                          )}
                          <div className="mt-3 text-xs text-text-tertiary flex items-center justify-between">
                            <span className="font-semibold text-emerald-600">Topper: {s.topBranchName} ({s.topBranchRate})</span>
                            <span className="font-semibold">{s.totalStudents} Students</span>
                          </div>
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-text-tertiary font-semibold group-hover:text-emerald-600 transition-colors">
                            <span>View Branch Standings</span>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* LEVEL 3: CROSS-BRANCH SUBJECT STANDINGS */}
          {level === "ranking" && (
            <motion.div
              key="ranking"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              {/* Quick Switchers & Search Bar */}
              <Card className="border border-border/60 bg-surface shadow-sm p-4 rounded-2xl">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {/* Subject Selector */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-border-input px-3 py-1.5 rounded-xl">
                      <BookOpen className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-[11px] font-bold text-text-secondary uppercase">Subject:</span>
                      <select
                        value={selectedSubject}
                        onChange={(e) => {
                          setSelectedSubject(e.target.value);
                          setDrillDownBranch(null);
                        }}
                        className="text-xs bg-transparent font-bold text-text-primary focus:outline-none cursor-pointer"
                      >
                        {availableSubjects.map((sub) => (
                          <option key={sub} value={sub} className="bg-surface text-text-primary font-medium">
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Class Selector */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-border-input px-3 py-1.5 rounded-xl">
                      <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-[11px] font-bold text-text-secondary uppercase">Class:</span>
                      <select
                        value={selectedStandard}
                        onChange={(e) => {
                          setSelectedStandard(e.target.value);
                          setDrillDownBranch(null);
                        }}
                        className="text-xs bg-transparent font-bold text-text-primary focus:outline-none cursor-pointer"
                      >
                        <option value="all" className="bg-surface text-text-primary">
                          All Classes
                        </option>
                        {availableStandards.map((std) => (
                          <option key={std} value={std} className="bg-surface text-text-primary font-medium">
                            {std} Grade
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sort Criteria */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-border-input px-3 py-1.5 rounded-xl">
                      <Filter className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-[11px] font-bold text-text-secondary uppercase">Rank By:</span>
                      <select
                        value={rankingSortBy}
                        onChange={(e) => setRankingSortBy(e.target.value as any)}
                        className="text-xs bg-transparent font-bold text-text-primary focus:outline-none cursor-pointer"
                      >
                        <option value="passRate" className="bg-surface text-text-primary">
                          Pass Rate (%)
                        </option>
                        <option value="averageScore" className="bg-surface text-text-primary">
                          Average Score (%)
                        </option>
                        <option value="topperCount" className="bg-surface text-text-primary">
                          Full Mark / 90%+ Count
                        </option>
                      </select>
                    </div>

                    {/* Student Plan Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-border-input px-3 py-1.5 rounded-xl">
                      <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
                      <span className="text-[11px] font-bold text-text-secondary uppercase">Plan:</span>
                      <select
                        value={selectedPlanFilter}
                        onChange={(e) => setSelectedPlanFilter(e.target.value as any)}
                        className="text-xs bg-transparent font-bold text-text-primary focus:outline-none cursor-pointer"
                      >
                        <option value="all" className="bg-surface text-text-primary font-medium">
                          All Plans
                        </option>
                        <option value="Advanced" className="bg-surface text-purple-600 font-bold">
                          ⚡ Advanced Students
                        </option>
                        <option value="Basic" className="bg-surface text-text-primary font-medium">
                          📘 Basic Students
                        </option>
                      </select>
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 sm:w-48">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-tertiary" />
                      <input
                        type="text"
                        placeholder="Search branch..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-border-input rounded-xl text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {displayedBranches.length === 0 ? (
                <Card className="p-16 text-center border-dashed bg-surface">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-600 w-fit mx-auto mb-3">
                    <BookOpen className="h-10 w-10" />
                  </div>
                  <h3 className="text-base font-bold text-text-primary">No Subject Assessment Records Found</h3>
                  <p className="text-xs text-text-secondary mt-1 max-w-md mx-auto">
                    No assessment results were submitted for {selectedCwc} in {selectedStandard === "all" ? "" : `${selectedStandard} `}
                    {selectedSubject}. Try selecting another CWC exam or subject from the filters above.
                  </p>
                </Card>
              ) : (
                <div className="space-y-6">
          {/* Network Summary Bar */}
          {networkStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border border-border/60 bg-surface p-4">
                <p className="text-[10px] font-bold text-text-secondary uppercase">Branches Evaluated</p>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-text-primary">{networkStats.activeBranchesCount}</span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                    Network-wide
                  </Badge>
                </div>
              </Card>

              <Card className="border border-border/60 bg-surface p-4">
                <p className="text-[10px] font-bold text-text-secondary uppercase">Students Assessed</p>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-text-primary">{networkStats.totalStudents}</span>
                  <Users className="h-4 w-4 text-text-tertiary" />
                </div>
              </Card>
            </div>
          )}

          {/* Top 3 Branch Podium for this Subject */}
          {!drillDownBranch && displayedBranches.length >= 2 && searchQuery === "" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {/* Rank 2 Podium */}
              {displayedBranches[1] && (
                <Card
                  onClick={() => setDrillDownBranch(displayedBranches[1].branchRaw)}
                  className="border border-slate-200 dark:border-white/10 p-5 bg-gradient-to-b from-slate-100/50 to-surface dark:from-slate-900/40 relative overflow-hidden shadow-sm cursor-pointer hover:border-emerald-500/50 transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="bg-slate-200 text-slate-700 border-slate-300 font-black px-2.5 py-0.5 text-xs">
                      🥈 Rank #2
                    </Badge>
                    <span className="text-xs font-semibold text-text-tertiary">{displayedBranches[1].totalStudents} Students</span>
                  </div>
                  <h4 className="text-base font-extrabold text-text-primary mt-3 truncate group-hover:text-emerald-600 transition-colors">
                    {displayedBranches[1].branchClean}
                  </h4>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/40 text-xs">
                    <span className="text-text-secondary">
                      Avg Score: <strong className="text-text-primary">{displayedBranches[1].avgScorePct}%</strong>
                    </span>
                    <span className="font-black text-emerald-600">{displayedBranches[1].passRate}% Pass</span>
                  </div>
                </Card>
              )}

              {/* Rank 1 Podium */}
              {displayedBranches[0] && (
                <Card
                  onClick={() => setDrillDownBranch(displayedBranches[0].branchRaw)}
                  className="border-2 border-emerald-500/50 p-6 bg-gradient-to-b from-emerald-500/10 via-surface to-surface relative overflow-hidden shadow-lg cursor-pointer transform hover:-translate-y-1 transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <Badge className="bg-emerald-600 text-white border-emerald-600 font-black px-3 py-1 text-xs shadow-sm">
                      👑 Rank #1 Branch Topper
                    </Badge>
                    <span className="text-xs font-bold text-emerald-600">{displayedBranches[0].totalStudents} Students</span>
                  </div>
                  <h4 className="text-lg font-black text-text-primary mt-3 truncate group-hover:text-emerald-600 transition-colors">
                    {displayedBranches[0].branchClean}
                  </h4>
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-emerald-500/20 text-xs">
                    <span className="text-text-secondary">
                      Avg Score: <strong className="text-text-primary text-sm">{displayedBranches[0].avgScorePct}%</strong>
                    </span>
                    <span className="text-base font-black text-emerald-600">{displayedBranches[0].passRate}% Pass</span>
                  </div>
                </Card>
              )}

              {/* Rank 3 Podium */}
              {displayedBranches[2] && (
                <Card
                  onClick={() => setDrillDownBranch(displayedBranches[2].branchRaw)}
                  className="border border-amber-600/30 p-5 bg-gradient-to-b from-amber-500/5 to-surface relative overflow-hidden shadow-sm cursor-pointer hover:border-emerald-500/50 transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="bg-amber-700/10 text-amber-700 border-amber-600/30 font-black px-2.5 py-0.5 text-xs">
                      🥉 Rank #3
                    </Badge>
                    <span className="text-xs font-semibold text-text-tertiary">{displayedBranches[2].totalStudents} Students</span>
                  </div>
                  <h4 className="text-base font-extrabold text-text-primary mt-3 truncate group-hover:text-emerald-600 transition-colors">
                    {displayedBranches[2].branchClean}
                  </h4>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/40 text-xs">
                    <span className="text-text-secondary">
                      Avg Score: <strong className="text-text-primary">{displayedBranches[2].avgScorePct}%</strong>
                    </span>
                    <span className="font-black text-emerald-600">{displayedBranches[2].passRate}% Pass</span>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* VIEW A: ALL BRANCH RANKING TABLE */}
          {!drillDownBranch ? (
            <Card className="border border-border/60 overflow-hidden bg-surface shadow-sm">
              <div className="p-4 bg-slate-50/70 dark:bg-slate-900/60 border-b border-border/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <School className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-extrabold text-text-primary uppercase tracking-wider">
                    All Branch Standings for {selectedStandard === "all" ? "" : `${selectedStandard} `}
                    {selectedSubject} ({displayedBranches.length} Branches)
                  </span>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 text-xs font-semibold">
                  Exam: {selectedCwc}
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse min-w-[750px]">
                  <thead>
                    <tr className="border-b border-border/60 bg-slate-100/50 dark:bg-white/[0.02] text-[10px] uppercase font-black text-text-tertiary tracking-wider">
                      <th className="px-6 py-3.5 w-16 text-center">Rank</th>
                      <th className="px-6 py-3.5">Branch Name</th>
                      <th className="px-6 py-3.5">Batches / Classes</th>
                      <th className="px-6 py-3.5 text-center">Students</th>
                      <th className="px-6 py-3.5 text-center">Passed</th>
                      <th className="px-6 py-3.5 text-center font-black">Pass Rate</th>
                      <th className="px-6 py-3.5 text-center font-black">Avg Score %</th>
                      <th className="px-6 py-3.5 text-center">Full Marks</th>
                      <th className="px-6 py-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {displayedBranches.map((b) => {
                      const colors = getRateColor(b.numericRate);
                      return (
                        <tr
                          key={b.branchRaw}
                          className="hover:bg-emerald-500/5 transition-colors cursor-pointer group"
                          onClick={() => setDrillDownBranch(b.branchRaw)}
                        >
                          <td className="px-6 py-3.5 text-center">
                            {b.rank === 1 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-500 text-white font-black text-xs shadow-sm">
                                1
                              </span>
                            ) : b.rank === 2 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-300 text-slate-800 font-black text-xs shadow-sm">
                                2
                              </span>
                            ) : b.rank === 3 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-700/20 text-amber-800 font-black text-xs">
                                3
                              </span>
                            ) : (
                              <span className="font-bold text-text-secondary">#{b.rank}</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 font-bold text-text-primary group-hover:text-emerald-600 transition-colors">
                            <div className="flex items-center gap-2">
                              <School className="h-4 w-4 text-text-tertiary" />
                              <span>{b.branchClean}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {b.classesList.map((cls, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-text-secondary px-2 py-0.5 rounded-md"
                                >
                                  {cls.replace(/^Smart\s+Up\s+|^[A-Za-z0-9]+-/, "")}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-center font-semibold text-text-secondary">{b.totalStudents}</td>
                          <td className="px-6 py-3.5 text-center font-semibold text-emerald-600">
                            {b.passedCount} <span className="text-text-tertiary text-[10px]">/ {b.totalStudents}</span>
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <div className="flex flex-col items-center">
                              <span className={`font-black text-sm ${colors.text}`}>{b.passRate}%</span>
                              <div className="w-16 bg-slate-100 dark:bg-white/[0.06] h-1.5 rounded-full mt-1 overflow-hidden">
                                <div className={`h-full ${colors.bg} rounded-full`} style={{ width: `${b.passRate}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-center font-black text-text-primary">{b.avgScorePct}%</td>
                          <td className="px-6 py-3.5 text-center">
                            {b.fullMarksCount > 0 ? (
                              <Badge className="bg-amber-500/10 text-amber-700 border border-amber-500/20 text-[10px] font-bold">
                                {b.fullMarksCount} Students
                              </Badge>
                            ) : (
                              <span className="text-text-tertiary">-</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDrillDownBranch(b.branchRaw);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              <span>View Students</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            /* VIEW B: DRILL-DOWN STUDENT MARKS & CLASS BREAKDOWN FOR SELECTED BRANCH */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-surface p-4 rounded-2xl border border-border/60 shadow-sm print:hidden">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDrillDownBranch(null)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h2 className="text-base font-black text-text-primary flex items-center gap-2">
                      <School className="h-5 w-5 text-emerald-600" />
                      {drillDownDetails?.branchInfo.branchClean} — {selectedStandard === "all" ? "" : `${selectedStandard} `}
                      {selectedSubject} Marks & Ranking
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {drillDownDetails?.students.length} students across {drillDownDetails?.branchInfo.batchesCount} classes in this branch
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePrintTranscript}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border-input hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl text-text-primary transition-colors shadow-sm"
                  >
                    <Printer className="h-3.5 w-3.5 text-text-secondary" />
                    Print Rank List
                  </button>
                </div>
              </div>

              {/* Printable Table Card */}
              <Card id="subject-printable-card" className="border border-border/60 shadow-sm overflow-hidden bg-surface relative">
                <div className="bg-emerald-500/10 px-6 py-5 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src="/smartup-logo-v2.png" alt="Smart Up Logo" className="h-9 w-auto object-contain shrink-0" />
                    <div>
                      <h3 className="text-[11px] font-black text-emerald-700 tracking-wider uppercase">SmartUp Learning Ventures</h3>
                      <h4 className="text-base font-extrabold text-text-primary tracking-tight">
                        {drillDownDetails?.branchInfo.branchClean.toUpperCase()} — {selectedSubject.toUpperCase()} CWC RANK LIST
                      </h4>
                      <p className="text-[10px] text-text-tertiary mt-0.5 font-semibold uppercase">
                        Exam Session: {selectedCwc} • Class Standard: {selectedStandard === "all" ? "All Classes" : selectedStandard}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-600 text-white font-bold text-[9px] px-2.5 py-0.5 uppercase">
                    Official Branch Subject Transcript
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-border/60 bg-slate-100/50 dark:bg-white/[0.02] text-[10px] uppercase font-black text-text-tertiary tracking-wider">
                        <th className="px-6 py-3 w-16 text-center">Rank</th>
                        <th className="px-6 py-3">Student Name</th>
                        <th className="px-6 py-3">Class Batch</th>
                        <th className="px-6 py-3 text-center">Score / Max</th>
                        <th className="px-6 py-3 text-center font-black">% Score</th>
                        <th className="px-6 py-3 text-center font-black">Grade</th>
                        <th className="px-6 py-3 text-center font-black">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {drillDownDetails?.students.map((st: any) => (
                        <tr key={st.student} className="hover:bg-emerald-500/5 transition-colors">
                          <td className="px-6 py-3 text-center font-black text-text-secondary">
                            {st.rank === 1 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-500 text-white font-black text-xs">
                                1
                              </span>
                            ) : st.rank === 2 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-300 text-slate-800 font-black text-xs">
                                2
                              </span>
                            ) : st.rank === 3 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-700/20 text-amber-800 font-black text-xs">
                                3
                              </span>
                            ) : (
                              `#${st.rank}`
                            )}
                          </td>
                          <td className="px-6 py-3 font-bold text-text-primary">
                            <div className="flex items-center gap-2">
                              <span>{st.studentName}</span>
                              {st.customPlan && (st.customPlan || "").toLowerCase().includes("advanced") && (
                                <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-purple-500/10 text-purple-600 border border-purple-500/30 shrink-0 flex items-center gap-0.5">
                                  ⚡ Advanced
                                </span>
                              )}
                            </div>
                            <span className="block text-[9px] font-normal text-text-tertiary font-mono">{st.student}</span>
                          </td>
                          <td className="px-6 py-3 font-medium text-text-secondary">
                            {st.studentGroup?.replace(/^Smart\s+Up\s+|^[A-Za-z0-9]+-/, "") || "General"}
                          </td>
                          <td className="px-6 py-3 text-center font-mono font-bold text-text-primary">
                            {st.score} <span className="text-text-tertiary font-normal">/ {st.max}</span>
                          </td>
                          <td className="px-6 py-3 text-center font-black text-emerald-600">{st.pct}%</td>
                          <td className="px-6 py-3 text-center font-black">
                            <Badge
                              className={
                                st.grade === "A+"
                                  ? "bg-emerald-500 text-white"
                                  : st.grade === "A"
                                  ? "bg-emerald-600 text-white"
                                  : st.grade.startsWith("B")
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-500 text-white"
                              }
                            >
                              {st.grade}
                            </Badge>
                          </td>
                          <td className="px-6 py-3 text-center">
                            {st.passed ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">Passed</Badge>
                            ) : (
                              <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/30">Failed</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )}
        </AnimatePresence>
      )}
    </div>
  );
}
