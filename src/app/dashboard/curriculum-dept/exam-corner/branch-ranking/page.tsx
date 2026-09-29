"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Users, 
  Sparkles,
  Award,
  ChevronRight,
  School,
  CheckCircle2,
  XCircle,
  Printer,
  Percent,
  Calendar
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GifLoader } from "@/components/ui/GifLoader";
import { getBranches } from "@/lib/api/enrollment";
import { getAssessmentGroups, getBatchResults } from "@/lib/api/assessment";

export default function ExamBranchRankingPage() {
  // Selected Exam Group State
  const [selectedExam, setSelectedExam] = useState("Quarterly Exam");

  // Drill-down levels: "branches" | "classes" | "report"
  const [level, setLevel] = useState<"branches" | "classes" | "report">("branches");
  const [viewMode, setViewMode] = useState<"combined" | "separate">("combined");
  
  // Entities selection
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedClass, setSelectedClass] = useState(""); // Student Group ID or comma-separated IDs
  const [selectedClassName, setSelectedClassName] = useState(""); // Student Group name
  const [selectedSubBatches, setSelectedSubBatches] = useState<{ id: string; name: string; division: string }[]>([]);
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState("all");
  const [selectedFilterSubject, setSelectedFilterSubject] = useState<string | null>(null);

  // Helper to determine tailwind classes based on pass rate percentage
  const getRateColor = (rate: number) => {
    if (rate === 0) return { text: "text-text-tertiary", bg: "bg-text-tertiary" };
    if (rate >= 85) return { text: "text-success", bg: "bg-success" };
    if (rate >= 60) return { text: "text-primary", bg: "bg-primary" };
    return { text: "text-error", bg: "bg-error" };
  };

  // 1. Fetch available assessment groups
  const { data: assessmentGroups = [] } = useQuery({
    queryKey: ["all-assessment-groups"],
    queryFn: getAssessmentGroups,
    staleTime: 5 * 60_000,
  });

  // Filter or list standard exam groups
  const examOptions = useMemo(() => {
    const list = assessmentGroups
      .map(g => g.name)
      .filter(name => !name.toLowerCase().startsWith("cwc")); // Show non-CWC or standard exams first, though user can pick any
    
    // Ensure standard exams exist if Frappe list is empty or slow
    const defaults = ["Quarterly Exam", "Onam Exam", "Monthly Exam", "Weekly Exam", "Diagnosis Exam", "Annual Exam"];
    const merged = Array.from(new Set([...list, ...defaults])).filter(Boolean);
    return merged;
  }, [assessmentGroups]);

  // If initial selectedExam not in list, pick the first
  React.useEffect(() => {
    if (examOptions.length > 0 && !examOptions.includes(selectedExam)) {
      setSelectedExam(examOptions[0]);
    }
  }, [examOptions, selectedExam]);

  // 2. Fetch branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches-for-rates-exam"],
    queryFn: getBranches,
    staleTime: 5 * 60_000,
  });

  // 3. Fetch assessment plans
  const { data: allPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["all-plans-for-exam-corner"],
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
              "assessment_group"
            ]),
            filters: JSON.stringify([["docstatus", "=", 1]]),
            limit_page_length: "2000"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  // 4. Fetch assessment results
  const { data: allResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["all-results-for-exam-corner"],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Assessment Result",
          method: "GET",
          payload: {
            fields: JSON.stringify(["assessment_plan", "total_score", "maximum_score"]),
            filters: JSON.stringify([["docstatus", "=", 1]]),
            limit_page_length: "15000"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  // Map results by assessment plan
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

  const computePassRate = (results: any[]) => {
    if (!results.length) return { rate: 0, total: 0 };
    let passed = 0;
    results.forEach(r => {
      if (r.maximum_score > 0 && (r.total_score / r.maximum_score) * 100 >= 40) {
        passed++;
      }
    });
    return {
      rate: Math.round((passed / results.length) * 100),
      total: results.length
    };
  };

  const matchesSelectedExam = (plan: any) => {
    const ag = (plan.assessment_group || "").toLowerCase();
    const an = (plan.assessment_name || "").toLowerCase();
    const sel = selectedExam.toLowerCase();
    return ag === sel || an.includes(sel) || ag.includes(sel);
  };

  // Compute branch pass rates strictly filtered by selected Exam Group
  const branchPerformances = useMemo(() => {
    return branches.map((b: any) => {
      const branchPlans = allPlans.filter((p: any) => {
        if (p.custom_branch !== b.name) return false;
        return matchesSelectedExam(p);
      });
      const branchResultsList: any[] = [];
      branchPlans.forEach((p: any) => {
        const resList = resultsByPlan.get(p.name) || [];
        branchResultsList.push(...resList);
      });

      const { rate, total } = computePassRate(branchResultsList);
      return {
        name: b.name,
        passRate: total > 0 ? `${rate}%` : "N/A",
        numericRate: rate,
        examsCount: branchPlans.length
      };
    });
  }, [branches, allPlans, resultsByPlan, selectedExam]);

  // 5. Fetch student groups when branch is selected
  const { data: studentGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["exam-student-groups-by-branch", selectedBranch],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Student Group",
          method: "GET",
          payload: {
            fields: JSON.stringify(["name", "student_group_name", "program", "custom_branch"]),
            filters: JSON.stringify([["custom_branch", "=", selectedBranch], ["disabled", "=", 0]]),
            limit_page_length: "500"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    enabled: level === "classes" && !!selectedBranch,
    staleTime: 5 * 60_000,
  });

  // Calculate pass rates for each class in selected branch under the selected exam group
  const classPerformances = useMemo(() => {
    return studentGroups.map((sg: any) => {
      const classPlans = allPlans.filter((p: any) => {
        if (p.student_group !== sg.name) return false;
        return matchesSelectedExam(p);
      });
      const classResultsList: any[] = [];
      classPlans.forEach((p: any) => {
        const resList = resultsByPlan.get(p.name) || [];
        classResultsList.push(...resList);
      });

      const { rate, total } = computePassRate(classResultsList);
      return {
        id: sg.name,
        name: sg.student_group_name,
        program: sg.program,
        subBatches: [{ id: sg.name, name: sg.student_group_name, division: "" }],
        divisions: [],
        passRate: total > 0 ? `${rate}%` : "N/A",
        numericRate: rate,
        examsCount: classPlans.length,
        isCombined: false
      };
    });
  }, [studentGroups, allPlans, resultsByPlan, selectedExam]);

  const parseBatchInfo = (name: string) => {
    if (!name) return { baseName: "", division: "" };
    const match = name.match(/^(.*?)[-_\s]+(?:sec(?:tion)?|div(?:ision)?\s*)?([A-Z0-9])$/i);
    if (match) {
      return { baseName: match[1].trim(), division: match[2].toUpperCase() };
    }
    return { baseName: name.trim(), division: "" };
  };

  // Aggregated pass rates combining section batches into one combined class entity
  const combinedClassPerformances = useMemo(() => {
    const groupsMap = new Map<string, {
      baseName: string;
      program: string;
      subBatches: { id: string; name: string; division: string }[];
      classPlans: any[];
      classResultsList: any[];
    }>();

    studentGroups.forEach((sg: any) => {
      const { baseName, division } = parseBatchInfo(sg.student_group_name);
      
      const plansForSg = allPlans.filter((p: any) => {
        if (p.student_group !== sg.name) return false;
        return matchesSelectedExam(p);
      });

      if (!groupsMap.has(baseName)) {
        groupsMap.set(baseName, {
          baseName,
          program: sg.program,
          subBatches: [],
          classPlans: [],
          classResultsList: [],
        });
      }

      const group = groupsMap.get(baseName)!;
      group.subBatches.push({
        id: sg.name,
        name: sg.student_group_name,
        division: division || sg.student_group_name,
      });

      plansForSg.forEach((p: any) => {
        if (!group.classPlans.some((existingP: any) => existingP.name === p.name)) {
          group.classPlans.push(p);
        }
        const resList = resultsByPlan.get(p.name) || [];
        group.classResultsList.push(...resList);
      });
    });

    return Array.from(groupsMap.values()).map((g) => {
      const { rate, total } = computePassRate(g.classResultsList);
      const subBatchIds = g.subBatches.map((sb) => sb.id).join(",");
      const divisions = g.subBatches.map((sb) => sb.division).filter(Boolean);

      return {
        id: subBatchIds,
        name: g.baseName,
        program: g.program,
        subBatches: g.subBatches,
        divisions,
        passRate: total > 0 ? `${rate}%` : "N/A",
        numericRate: rate,
        examsCount: g.classPlans.length,
        isCombined: g.subBatches.length > 1
      };
    });
  }, [studentGroups, allPlans, resultsByPlan, selectedExam]);

  // 6. Fetch consolidated results for class Exam
  const { data: batchData, isLoading: batchLoading } = useQuery({
    queryKey: ["exam-class-batch-results", selectedClass, selectedExam],
    queryFn: () => getBatchResults({
      student_group: selectedClass,
      assessment_group: selectedExam
    }),
    enabled: level === "report" && !!selectedClass && !!selectedExam,
    staleTime: 30_000,
  });

  const studentsList = batchData?.data ?? [];
  const batchSummary = batchData?.summary;

  const [selectedFilter, setSelectedFilter] = useState("all");

  const filterOptions = [
    { label: "All Students", value: "all" },
    { label: "⚡ Advanced Students Only", value: "advanced_only" },
    { label: "📘 Basic Students Only", value: "basic_only" },
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
    { label: "Below 30% (Failed in Any Subject)", value: "failed_any" },
    { label: "Passed in All Subjects", value: "passed_all" },
  ];

  const filteredStudents = useMemo(() => {
    let list = studentsList;
    if (selectedDivisionFilter !== "all") {
      list = list.filter((st: any) => st.student_group === selectedDivisionFilter);
    }
    if (selectedFilter === "all") return list;
    return list.filter((st: any) => {
      const isPassedAll = !st.subjects.some((sub: any) => sub.percentage < 40) && st.passed;
      const isFailedAny = st.subjects.some((sub: any) => sub.percentage < 40);
      const planName = (st.custom_plan || "").toLowerCase();
      switch (selectedFilter) {
        case "advanced_only":
          return planName.includes("advanced");
        case "basic_only":
          return planName.includes("basic") || !planName;
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
          return st.total_score === st.total_maximum;
        case "full_aplus":
          return st.subjects.length > 0 && !st.subjects.some((sub: any) => sub.grade !== "A+");
        case "p90":
          return st.overall_percentage >= 90;
        case "p85":
          return st.overall_percentage >= 85;
        case "p80":
          return st.overall_percentage >= 80;
        case "p75":
          return st.overall_percentage >= 75;
        case "p70":
          return st.overall_percentage >= 70;
        case "p60":
          return st.overall_percentage >= 60;
        case "p50":
          return st.overall_percentage >= 50;
        case "p30":
          return st.overall_percentage >= 30;
        case "below70":
          return st.overall_percentage < 70;
        case "below60":
          return st.overall_percentage < 60;
        case "below50":
          return st.overall_percentage < 50;
        case "failed_any":
          return isFailedAny;
        case "passed_all":
          return isPassedAll;
        default:
          return true;
      }
    });
  }, [studentsList, selectedFilter, selectedDivisionFilter]);

  const uniqueCourses = useMemo(() => {
    const map = new Map<string, string>();
    studentsList.forEach((st) => {
      st.subjects.forEach((sub: any) => {
        if (!map.has(sub.course)) {
          map.set(sub.course, sub.course.replace(/-.*/, ""));
        }
      });
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [studentsList]);

  const analysisCriteria = [
    { title: "Topper", filterVal: "topper" },
    { title: "Top 3", filterVal: "top3" },
    { title: "Top 5", filterVal: "top5" },
    { title: "90% & Above", filterVal: "p90" },
    { title: "80% & Above", filterVal: "p80" },
    { title: "Below 30% (Failed in Any Subject)", filterVal: "failed_any" }
  ];

  const analysisData = useMemo(() => {
    const total = studentsList.length;
    if (total === 0) return [];
    return analysisCriteria.map((crit) => {
      const list = studentsList.filter((st) => {
        const isFailedAny = st.subjects.some((sub: any) => sub.percentage < 40);
        switch (crit.filterVal) {
          case "topper":
            return st.rank === 1;
          case "top3":
            return st.rank <= 3;
          case "top5":
            return st.rank <= 5;
          case "p90":
            return st.overall_percentage >= 90;
          case "p80":
            return st.overall_percentage >= 80;
          case "failed_any":
            return isFailedAny;
          default:
            return false;
        }
      });

      return {
        criteria: crit.title,
        count: list.length,
        names: list.map((st) => st.student_name).join(", "),
        percentage: Number(((list.length / total) * 100).toFixed(1)),
        isPct: crit.filterVal !== "topper" && crit.filterVal !== "top3" && crit.filterVal !== "top5"
      };
    });
  }, [studentsList]);

  const pageLoading = branchesLoading || plansLoading || resultsLoading;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <BreadcrumbNav />
          <h1 className="text-2xl font-bold text-text-primary mt-1 flex items-center gap-2">
            <Award className="h-7 w-7 text-amber-500" />
            Branch Wise Ranking ({selectedExam})
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Compare branch standings for the chosen exam and drill down into class and student ranking list.
          </p>
        </div>

        <div className="flex gap-2">
          {level !== "branches" && (
            <button
              onClick={() => {
                if (level === "report") setLevel("classes");
                else if (level === "classes") setLevel("branches");
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary bg-surface border border-border/60 hover:border-border transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {level === "report" ? selectedBranch : "All Branches"}
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
          <Calendar className="h-4 w-4 text-primary" />
          <span>Choose Exam:</span>
        </div>
        <select
          value={selectedExam}
          onChange={(e) => setSelectedExam(e.target.value)}
          className="h-9 px-3 text-xs bg-surface border border-border-input rounded-xl font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
        >
          {examOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        {/* Quick buttons for top 3 options */}
        <div className="hidden sm:flex items-center gap-1.5 border-l border-border/60 pl-3">
          {examOptions.slice(0, 4).map((opt) => (
            <button
              key={opt}
              onClick={() => setSelectedExam(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedExam === opt
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation History Path */}
      {level !== "branches" && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-text-secondary mt-1">
          <span 
            className="hover:underline cursor-pointer text-primary font-medium"
            onClick={() => { setLevel("branches"); }}
          >
            All Branches
          </span>
          {selectedBranch && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
              <span 
                className="hover:underline cursor-pointer text-primary font-medium"
                onClick={() => { setLevel("classes"); }}
              >
                {selectedBranch}
              </span>
            </>
          )}
          {selectedClass && level === "report" && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="text-text-tertiary">{selectedClassName} Consolidated Report</span>
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
          {/* LEVEL 1: BRANCH CARDS */}
          {level === "branches" && (
            <motion.div
              key="branches"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {branchPerformances.map((b: any) => {
                const colors = getRateColor(b.numericRate);
                return (
                  <Card 
                    key={b.name}
                    className="hover:border-primary/30 hover:shadow-md cursor-pointer transition-all duration-200 group relative overflow-hidden bg-surface"
                    onClick={() => {
                      setSelectedBranch(b.name);
                      setLevel("classes");
                    }}
                  >
                    <CardHeader className="p-6 pb-2">
                      <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 text-slate-400 rounded-xl">
                          <School className="h-6 w-6" />
                        </div>
                        <Badge className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-white/[0.04]">
                          {b.examsCount} Exams
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-primary transition-colors">
                        {b.name.replace("Smart Up ", "")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-2">
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-xs text-text-secondary font-medium">Average Pass Rate</span>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-2xl font-black ${colors.text}`}>
                            {b.passRate}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${colors.bg}`}
                          style={{ width: b.passRate === "N/A" ? "0%" : b.passRate }}
                        />
                      </div>
                      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-text-tertiary">
                        <span>Click to view batches</span>
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </motion.div>
          )}

          {/* LEVEL 2: CLASS STANDINGS */}
          {level === "classes" && (
            <motion.div
              key="classes"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-4 rounded-2xl border border-border/60">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">{selectedBranch}</h2>
                  <p className="text-xs text-text-secondary">Batches and standings for {selectedExam}</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                  <button
                    onClick={() => setViewMode("combined")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === "combined"
                        ? "bg-white dark:bg-slate-700 text-text-primary shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Combined Classes
                  </button>
                  <button
                    onClick={() => setViewMode("separate")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === "separate"
                        ? "bg-white dark:bg-slate-700 text-text-primary shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Separate Divisions
                  </button>
                </div>
              </div>

              {groupsLoading ? (
                <div className="py-24 flex justify-center"><GifLoader size="md" /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(viewMode === "combined" ? combinedClassPerformances : classPerformances).map((c: any) => {
                    const colors = getRateColor(c.numericRate);
                    return (
                      <Card
                        key={c.id}
                        className="hover:border-primary/30 hover:shadow-md cursor-pointer transition-all duration-200 group bg-surface"
                        onClick={() => {
                          setSelectedClass(c.id);
                          setSelectedClassName(c.name);
                          setSelectedSubBatches(c.subBatches || []);
                          setSelectedDivisionFilter("all");
                          setLevel("report");
                        }}
                      >
                        <CardHeader className="p-6 pb-2">
                          <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 text-slate-400 rounded-xl">
                              <Users className="h-6 w-6" />
                            </div>
                            <Badge className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-white/[0.04]">
                              {c.examsCount} Exams
                            </Badge>
                          </div>
                          <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-primary transition-colors">
                            {c.name}
                          </CardTitle>
                          {c.isCombined && (
                            <p className="text-xs text-text-tertiary">
                              Divisions: {c.divisions.join(", ")}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                          <div className="mt-2 flex items-baseline justify-between">
                            <span className="text-xs text-text-secondary font-medium">Pass Rate</span>
                            <span className={`text-2xl font-black ${colors.text}`}>{c.passRate}</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 mt-3 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${colors.bg}`}
                              style={{ width: c.passRate === "N/A" ? "0%" : c.passRate }}
                            />
                          </div>
                          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-text-tertiary">
                            <span>View detailed rank report</span>
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

          {/* LEVEL 3: DETAILED REPORT */}
          {level === "report" && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {batchLoading ? (
                <div className="py-24 flex justify-center"><GifLoader size="md" /></div>
              ) : (
                <>
                  {/* Summary & Filters Bar */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-border/60">
                    <div>
                      <h2 className="text-xl font-bold text-text-primary">
                        {selectedClassName} – {selectedExam}
                      </h2>
                      <p className="text-xs text-text-secondary mt-1">
                        Total Enrolled: {batchSummary?.total_students ?? studentsList.length} | 
                        Passed: {batchSummary?.pass_count ?? 0} | 
                        Batch Pass Rate: {batchSummary?.pass_rate ?? 0}%
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Division selector if combined batch */}
                      {selectedSubBatches.length > 1 && (
                        <select
                          value={selectedDivisionFilter}
                          onChange={(e) => setSelectedDivisionFilter(e.target.value)}
                          className="h-9 px-3 text-xs bg-surface border border-border-input rounded-xl font-semibold text-text-primary"
                        >
                          <option value="all">All Divisions</option>
                          {selectedSubBatches.map((sb) => (
                            <option key={sb.id} value={sb.id}>{sb.name}</option>
                          ))}
                        </select>
                      )}

                      {/* Criteria Filter */}
                      <select
                        value={selectedFilter}
                        onChange={(e) => setSelectedFilter(e.target.value)}
                        className="h-9 px-3 text-xs bg-surface border border-border-input rounded-xl font-semibold text-text-primary"
                      >
                        {filterOptions.map((f) => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
                      >
                        <Printer className="h-4 w-4" />
                        Print
                      </button>
                    </div>
                  </div>

                  {/* Student Table */}
                  <div className="bg-surface rounded-2xl border border-border/60 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-border/60 text-text-secondary">
                          <tr>
                            <th className="p-3.5 pl-6 font-bold w-12">Rank</th>
                            <th className="p-3.5 font-bold">Student Name</th>
                            <th className="p-3.5 font-bold">Student ID</th>
                            <th className="p-3.5 font-bold text-center">Total Marks</th>
                            <th className="p-3.5 font-bold text-center">Overall %</th>
                            <th className="p-3.5 font-bold text-center">Status</th>
                            {uniqueCourses.map((c) => (
                              <th key={c.code} className="p-3.5 font-bold text-center">{c.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {filteredStudents.length === 0 ? (
                            <tr>
                              <td colSpan={6 + uniqueCourses.length} className="text-center py-12 text-text-tertiary">
                                No student records found matching the chosen criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredStudents.map((st: any) => (
                              <tr key={st.student} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="p-3.5 pl-6 font-bold text-text-primary">
                                  {st.rank === 1 ? (
                                    <span className="p-1 px-2 rounded-md bg-amber-500/10 text-amber-600 font-black">#1</span>
                                  ) : (
                                    `#${st.rank}`
                                  )}
                                </td>
                                <td className="p-3.5 font-bold text-text-primary">{st.student_name}</td>
                                <td className="p-3.5 text-text-secondary">{st.student}</td>
                                <td className="p-3.5 font-semibold text-center text-text-primary">
                                  {st.total_score} / {st.total_maximum}
                                </td>
                                <td className="p-3.5 font-bold text-center">
                                  <span className={getRateColor(st.overall_percentage).text}>
                                    {st.overall_percentage}%
                                  </span>
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
                                {uniqueCourses.map((c) => {
                                  const sub = st.subjects.find((s: any) => s.course === c.code);
                                  if (!sub) return <td key={c.code} className="p-3.5 text-center text-text-tertiary">-</td>;
                                  return (
                                    <td key={c.code} className="p-3.5 text-center">
                                      <span className="font-semibold text-text-primary">{sub.score}</span>
                                      <span className="text-[10px] text-text-tertiary">/{sub.max}</span>
                                      <div className={`text-[10px] font-bold ${getRateColor(sub.percentage).text}`}>
                                        {sub.grade || `${Math.round(sub.percentage)}%`}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
