"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart3, 
  ArrowLeft, 
  Users, 
  BookOpen, 
  FileText, 
  Sparkles,
  Award,
  ChevronRight,
  School,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Printer,
  Percent
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GifLoader } from "@/components/ui/GifLoader";
import { getBranches } from "@/lib/api/enrollment";
import { getAssessmentGroups, getBatchResults } from "@/lib/api/assessment";

export default function ClassPerformancePage() {
  // Drill-down states: "branches" | "classes" | "report"
  const [level, setLevel] = useState<"branches" | "classes" | "report">("branches");
  
  // Selected entities
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedClass, setSelectedClass] = useState(""); // ID of Student Group
  const [selectedClassName, setSelectedClassName] = useState(""); // User-facing name
  const [selectedExamGroup, setSelectedExamGroup] = useState("Test"); // Selected Assessment Group (default: Test)

  // Helper to determine tailwind classes based on pass rate percentage
  const getRateColor = (rate: number) => {
    if (rate === 0) return { text: "text-text-tertiary", bg: "bg-text-tertiary" };
    if (rate >= 85) return { text: "text-success", bg: "bg-success" };
    if (rate >= 60) return { text: "text-primary", bg: "bg-primary" };
    return { text: "text-error", bg: "bg-error" };
  };

  // 1. Fetch branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches-for-rates"],
    queryFn: getBranches,
    staleTime: 5 * 60_000,
  });

  // 2. Fetch all assessment plans to calculate pass rates dynamically in frontend
  const { data: allPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["all-assessment-plans-for-rates"],
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
            limit_page_length: "1000"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  // 3. Fetch all assessment results to calculate pass rates dynamically in frontend
  const { data: allResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["all-assessment-results-for-rates"],
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
            limit_page_length: "10000"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  // 4. Fetch classes (student groups) for selected branch
  const { data: studentGroups = [], isLoading: classesLoading } = useQuery({
    queryKey: ["student-groups-for-branch", selectedBranch],
    queryFn: async () => {
      if (!selectedBranch) return [];
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Student Group",
          method: "GET",
          payload: {
            fields: JSON.stringify(["name", "student_group_name", "program", "custom_branch", "custom_subject"]),
            filters: JSON.stringify([["custom_branch", "=", selectedBranch]]),
            limit_page_length: "200"
          }
        })
      }).then(r => r.json());
      return (res.data ?? []).filter((sg: any) => !sg.custom_subject);
    },
    staleTime: 60_000,
    enabled: !!selectedBranch && level === "classes",
  });

  // 5. Fetch all assessment groups for exam session selector dropdown
  const { data: assessmentGroups = [], isLoading: examsLoading } = useQuery({
    queryKey: ["assessment-groups-for-selector"],
    queryFn: getAssessmentGroups,
    staleTime: 5 * 60_000,
  });

  // Group results by plan name
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

  // Helper to compute pass rate of a list of results
  const computePassRate = (resultsList: any[]) => {
    if (!resultsList || resultsList.length === 0) return { rate: 0, total: 0, passed: 0 };
    const passed = resultsList.filter(r => (r.total_score / r.maximum_score) >= 0.4).length;
    return {
      rate: Math.round((passed / resultsList.length) * 100),
      total: resultsList.length,
      passed
    };
  };

  // --- BRANCH PERFORMANCE COMPUTATION ---
  const branchPerformances = useMemo(() => {
    return branches.map((b: any) => {
      const branchPlans = allPlans.filter((p: any) => p.custom_branch === b.name);
      const branchResultsList: any[] = [];
      branchPlans.forEach((p: any) => {
        const planResults = resultsByPlan.get(p.name) || [];
        branchResultsList.push(...planResults);
      });

      const { rate, total } = computePassRate(branchResultsList);
      return {
        name: b.name,
        passRate: total > 0 ? `${rate}%` : "N/A",
        numericRate: rate,
        examsCount: branchPlans.length,
        totalScoresCount: total
      };
    });
  }, [branches, allPlans, resultsByPlan]);

  // --- CLASS PERFORMANCE COMPUTATION ---
  const classPerformances = useMemo(() => {
    return studentGroups.map((sg: any) => {
      const classPlans = allPlans.filter((p: any) => p.student_group === sg.name);
      const classResultsList: any[] = [];
      classPlans.forEach((p: any) => {
        const planResults = resultsByPlan.get(p.name) || [];
        classResultsList.push(...planResults);
      });

      const { rate, total } = computePassRate(classResultsList);
      return {
        id: sg.name,
        name: sg.student_group_name,
        program: sg.program,
        passRate: total > 0 ? `${rate}%` : "N/A",
        numericRate: rate,
        examsCount: classPlans.length
      };
    });
  }, [studentGroups, allPlans, resultsByPlan]);

  // 6. Fetch batch consolidated results directly for selected class and selected exam group
  const { data: batchData, isLoading: batchLoading } = useQuery({
    queryKey: ["class-batch-results", selectedClass, selectedExamGroup],
    queryFn: () => getBatchResults({
      student_group: selectedClass,
      assessment_group: selectedExamGroup
    }),
    enabled: level === "report" && !!selectedClass && !!selectedExamGroup,
    staleTime: 30_000,
  });

  const studentsList = batchData?.data ?? [];
  const batchSummary = batchData?.summary;

  const [selectedFilter, setSelectedFilter] = useState("all");

  const filterOptions = [
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
    { label: "Below 30% (Failed in Any Subject)", value: "failed_any" },
    { label: "Passed in All Subjects", value: "passed_all" },
  ];

  const filteredStudents = useMemo(() => {
    if (selectedFilter === "all") return studentsList;
    return studentsList.filter((st) => {
      const isPassedAll = !st.subjects.some((sub) => sub.percentage < 40) && st.passed;
      const isFailedAny = st.subjects.some((sub) => sub.percentage < 40);
      switch (selectedFilter) {
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
          return st.subjects.length > 0 && st.subjects.every((sub) => sub.grade === "A+");
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
  }, [studentsList, selectedFilter]);

  const analysisData = useMemo(() => {
    const total = studentsList.length;
    if (total === 0) return [];

    const getNames = (list: any[]) => list.map(st => st.student_name).join(", ");
    
    const topperList = studentsList.filter(st => st.rank === 1);
    const top3List = studentsList.filter(st => st.rank <= 3);
    const top5List = studentsList.filter(st => st.rank <= 5);
    const top10List = studentsList.filter(st => st.rank <= 10);
    const top15List = studentsList.filter(st => st.rank <= 15);
    const fullMarkList = studentsList.filter(st => st.total_score === st.total_maximum);
    const fullAPlusList = studentsList.filter(st => st.subjects.length > 0 && st.subjects.every(sub => sub.grade === "A+"));
    const p90List = studentsList.filter(st => st.overall_percentage >= 90);
    const p85List = studentsList.filter(st => st.overall_percentage >= 85);
    const p80List = studentsList.filter(st => st.overall_percentage >= 80);
    const p75List = studentsList.filter(st => st.overall_percentage >= 75);
    const p70List = studentsList.filter(st => st.overall_percentage >= 70);
    const p60List = studentsList.filter(st => st.overall_percentage >= 60);
    const p50List = studentsList.filter(st => st.overall_percentage >= 50);
    const p30List = studentsList.filter(st => st.overall_percentage >= 30);
    const below70List = studentsList.filter(st => st.overall_percentage < 70);
    const below60List = studentsList.filter(st => st.overall_percentage < 60);
    const below50List = studentsList.filter(st => st.overall_percentage < 50);
    const failedAnyList = studentsList.filter(st => st.subjects.some(sub => sub.percentage < 40));
    const passedAllList = studentsList.filter(st => !st.subjects.some(sub => sub.percentage < 40) && st.passed);

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
      { key: "Below 30% (Failed in Any Subject)", list: failedAnyList, isPct: true },
      { key: "Passed in All Subjects", list: passedAllList, isPct: true },
    ];

    return rows.map(r => ({
      analysis: r.key,
      count: r.list.length,
      names: getNames(r.list) || "—",
      pct: r.isPct ? `${((r.list.length / total) * 100).toFixed(1)}%` : "—"
    }));
  }, [studentsList]);

  // Extract all unique courses (subjects) across the batch results
  const uniqueCourses = useMemo(() => {
    const coursesMap = new Map<string, string>(); // courseCode -> courseName
    studentsList.forEach((st) => {
      st.subjects.forEach((sub) => {
        const cleanName = sub.course.replace(/^\d+\w*\s+/, "");
        coursesMap.set(sub.course, cleanName);
      });
    });
    return Array.from(coursesMap.entries()).map(([code, name]) => ({ code, name }));
  }, [studentsList]);

  // Overall loading indicator
  const pageLoading = branchesLoading || plansLoading || resultsLoading;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <BreadcrumbNav />

      {/* Header section with navigation trace */}
      <div className="flex flex-col gap-1 print:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
          <GraduationCap className="h-7 w-7 text-primary" />
          Class Consolidated Performance
        </h1>
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
      </div>

      {pageLoading ? (
        <div className="py-32 flex justify-center items-center">
          <GifLoader size="lg" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* LEVEL 1: SELECT BRANCH */}
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
                    className="hover:border-primary/30 hover:shadow-md cursor-pointer transition-all duration-200 group relative overflow-hidden"
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
                    </CardContent>
                  </Card>
                );
              })}
            </motion.div>
          )}

          {/* LEVEL 2: SELECT CLASS */}
          {level === "classes" && (
            <motion.div
              key="classes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setLevel("branches")}
                  className="h-8 px-3 text-xs border border-border-input bg-surface rounded-[8px] flex items-center font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Branches
                </button>
              </div>

              {classPerformances.length === 0 ? (
                <Card className="p-12 text-center border-dashed">
                  <h3 className="text-base font-semibold text-text-primary">No classes found</h3>
                  <p className="text-sm text-text-secondary mt-1">This branch does not have any active student groups.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {classPerformances.map((c: any) => {
                    const colors = getRateColor(c.numericRate);
                    return (
                      <Card 
                        key={c.id} 
                        onClick={() => {
                          setSelectedClass(c.id);
                          setSelectedClassName(c.name);
                          // Default to "Test" or select the first session
                          setSelectedExamGroup("Test");
                          setLevel("report");
                        }}
                        className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm hover:border-slate-200 dark:hover:border-white/[0.12] transition-all group"
                      >
                        <CardHeader className="p-6 pb-2">
                          <div className="flex justify-between items-start">
                            <div className="p-2 bg-slate-50 dark:bg-slate-800/50 text-slate-400 rounded-lg">
                              <Users className="h-5 w-5" />
                            </div>
                            <Badge className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-white/[0.04]">
                              {c.examsCount} Exams
                            </Badge>
                          </div>
                          <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-primary transition-colors">
                            {c.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                          <div className="mt-2 flex items-baseline justify-between">
                            <span className="text-xs text-text-secondary font-medium">Pass Rate</span>
                            <span className={`text-xl font-bold ${colors.text}`}>
                              {c.passRate}
                            </span>
                          </div>
                          {c.numericRate > 0 && (
                            <div className="w-full bg-slate-50 dark:bg-white/[0.04] h-1.5 rounded-full mt-3 overflow-hidden">
                              <div 
                                className={`h-full ${colors.bg} rounded-full`}
                                style={{ width: `${c.numericRate}%` }}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* LEVEL 3: CLASS CONSOLIDATED REPORT */}
          {level === "report" && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setLevel("classes")}
                    className="h-8 px-3 text-xs border border-border-input bg-surface rounded-[8px] flex items-center font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Classes
                  </button>

                  {/* Exam Session Selection Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider">Exam Session:</span>
                    <select
                      value={selectedExamGroup}
                      onChange={(e) => setSelectedExamGroup(e.target.value)}
                      className="h-8 px-2 text-xs bg-surface border border-border-input rounded-[8px] font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      {assessmentGroups.map((g: any) => (
                        <option key={g.name} value={g.name}>
                          {g.assessment_group_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter Students Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider">Filter Students:</span>
                    <select
                      value={selectedFilter}
                      onChange={(e) => setSelectedFilter(e.target.value)}
                      className="h-8 px-2 text-xs bg-surface border border-border-input rounded-[8px] font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      {filterOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const element = document.getElementById("printable-report-card");
                    if (!element) return;
                    
                    // Clone element and append to body to bypass scroll/layout wrappers
                    const clone = element.cloneNode(true) as HTMLElement;
                    clone.id = "print-clone-container";
                    
                    const style = document.createElement("style");
                    style.id = "print-style-block";
                    style.innerHTML = `
                      @media print {
                        @page {
                          size: A4 landscape;
                          margin: 12mm 15mm;
                        }
                        /* Hide everything inside next.js container */
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
                          display: none !important; /* Hide inline watermark in print to use fixed pseudo-element */
                        }
                        /* Render watermark on every page using position: fixed pseudo-element */
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
                          opacity: 0.05 !important; /* Extremely neat and subtle opacity */
                          z-index: -1000 !important;
                          pointer-events: none !important;
                        }
                        #print-clone-container img:not(.watermark-logo) {
                          visibility: visible !important;
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

              {batchLoading ? (
                <div className="py-24 flex items-center justify-center">
                  <GifLoader size="lg" />
                </div>
              ) : studentsList.length === 0 ? (
                <Card className="p-12 text-center border-dashed">
                  <h3 className="text-base font-semibold text-text-primary">No consolidated marks found</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    No results have been submitted for this class and exam session ({selectedExamGroup}).
                  </p>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                    <Card className="border border-slate-100 dark:border-white/[0.06] bg-surface">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary/5 text-primary">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary font-medium uppercase">Total Students</p>
                          <p className="text-xl font-bold text-text-primary mt-0.5">
                            {batchSummary?.total_students || studentsList.length}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-slate-100 dark:border-white/[0.06] bg-surface">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-success/10 text-success">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary font-medium uppercase">Passed count</p>
                          <p className="text-xl font-bold text-text-primary mt-0.5">
                            {batchSummary?.pass_count || 0}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-slate-100 dark:border-white/[0.06] bg-surface">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-success/10 text-success">
                          <Percent className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary font-medium uppercase">Pass Rate</p>
                          <p className="text-xl font-bold text-text-primary mt-0.5">
                            {batchSummary?.pass_rate?.toFixed(1) || 0}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-slate-100 dark:border-white/[0.06] bg-surface">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary/5 text-primary">
                          <Award className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary font-medium uppercase">Average %</p>
                          <p className="text-xl font-bold text-text-primary mt-0.5">
                            {batchSummary?.average_percentage?.toFixed(1) || 0}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Dynamic Consolidated Table Card */}
                  <Card id="printable-report-card" className="border border-slate-100 dark:border-white/[0.06] shadow-sm overflow-hidden bg-surface relative">
                    {/* Watermark Logo */}
                    <div className="watermark-container absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] dark:opacity-[0.05] select-none z-0">
                      <img 
                        src="/smartup-logo-v2.png" 
                        alt="Watermark" 
                        className="watermark-logo w-80 h-auto object-contain max-w-full"
                      />
                    </div>

                    {/* Report Header */}
                    <div className="bg-primary/5 dark:bg-primary/10 px-6 py-5 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <img 
                          src="/smartup-logo-v2.png" 
                          alt="Smart Up Logo" 
                          className="h-10 w-auto object-contain shrink-0"
                        />
                        <div>
                          <h1 className="text-[11px] font-black text-primary tracking-wider uppercase">
                            SmartUp Learning Ventures
                          </h1>
                          <h2 className="text-base font-extrabold text-text-primary tracking-tight mt-0.5">
                            CLASS CONSOLIDATED MARK LIST
                          </h2>
                          <p className="text-[10px] text-text-tertiary mt-0.5 uppercase tracking-wider font-semibold">
                            Exam Session: {selectedExamGroup} • Class: {selectedClassName}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-none font-bold uppercase text-[9px] px-2.5 py-0.5">
                        Official Transcript
                      </Badge>
                    </div>

                    {/* Dynamic Table Grid */}
                    <div className="p-0 overflow-x-auto relative z-10">
                      <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/50 text-[10px] uppercase font-bold text-text-tertiary tracking-wider">
                            <th className="px-6 py-3.5 w-12 text-center">Rank</th>
                            <th className="px-6 py-3.5">Student Name</th>
                            {uniqueCourses.map((c) => (
                              <th key={c.code} className="px-6 py-3.5 text-center">
                                {c.name}
                              </th>
                            ))}
                            <th className="px-6 py-3.5 text-center font-black bg-slate-100/30 dark:bg-white/[0.02]">Total</th>
                            <th className="px-6 py-3.5 text-center font-black bg-slate-100/30 dark:bg-white/[0.02]">%</th>
                            <th className="px-6 py-3.5 text-center font-black bg-slate-100/30 dark:bg-white/[0.02]">Grade</th>
                            <th className="px-6 py-3.5 text-center font-black bg-slate-100/30 dark:bg-white/[0.02]">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                          {filteredStudents.map((row) => {
                            // Determine Pass/Fail strictly based on all subjects being passed (>= 40%)
                            const hasFailedSubject = row.subjects.some((sub) => sub.percentage < 40);
                            const isPassed = !hasFailedSubject && row.passed;

                            return (
                              <tr key={row.student} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/5 transition-colors">
                                <td className="px-6 py-3 text-center font-extrabold text-text-secondary">
                                  {row.rank}
                                </td>
                                <td className="px-6 py-3 font-bold text-text-primary">
                                  {row.student_name}
                                  <span className="block text-[9px] font-normal text-text-tertiary font-mono mt-0.5">
                                    {row.student}
                                  </span>
                                </td>
                                {uniqueCourses.map((c) => {
                                  const subResult = row.subjects.find((sub) => sub.course === c.code);
                                  if (!subResult) {
                                    return (
                                      <td key={c.code} className="px-6 py-3 text-center">
                                        <span className="text-[10px] font-bold text-error uppercase tracking-wider">
                                          Absent
                                        </span>
                                      </td>
                                    );
                                  }
                                  const isSubPass = subResult.percentage >= 40;
                                  return (
                                    <td key={c.code} className="px-6 py-3 text-center">
                                      <div className="flex flex-col items-center">
                                        <span className={`font-bold ${isSubPass ? "text-text-primary" : "text-error"}`}>
                                          {subResult.grade || "N/A"}
                                        </span>
                                        <span className="text-[9px] text-text-tertiary mt-0.5">
                                          {subResult.score} <span className="text-[8px]">/ {subResult.maximum_score}</span>
                                        </span>
                                      </div>
                                    </td>
                                  );
                                })}
                                {/* Aggregates */}
                                <td className="px-6 py-3 text-center font-black text-text-primary bg-slate-100/10 dark:bg-white/[0.01]">
                                  {row.total_score} <span className="text-[9px] font-normal text-text-tertiary">/ {row.total_maximum}</span>
                                </td>
                                <td className="px-6 py-3 text-center font-bold text-text-primary bg-slate-100/10 dark:bg-white/[0.01]">
                                  {row.overall_percentage.toFixed(1)}%
                                </td>
                                <td className="px-6 py-3 text-center bg-slate-100/10 dark:bg-white/[0.01]">
                                  <span className="inline-flex items-center justify-center font-bold text-primary px-2 py-0.5 bg-primary/5 border border-primary/10 rounded-md">
                                    {row.overall_grade}
                                  </span>
                                </td>
                                <td className="px-6 py-3 text-center bg-slate-100/10 dark:bg-white/[0.01]">
                                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full ${
                                    isPassed 
                                      ? "bg-success/10 text-success" 
                                      : "bg-error/10 text-error"
                                  }`}>
                                    {isPassed ? (
                                      <><CheckCircle2 className="h-2.5 w-2.5" /> PASS</>
                                    ) : (
                                      <><XCircle className="h-2.5 w-2.5" /> FAIL</>
                                    )}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
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
                        <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-100/30 dark:bg-white/[0.01] text-[10px] uppercase font-bold text-text-tertiary tracking-wider">
                              <th className="px-6 py-3 w-1/4">Analysis</th>
                              <th className="px-6 py-3 text-center w-24">Count</th>
                              <th className="px-6 py-3 w-1/2">Names</th>
                              <th className="px-6 py-3 text-center w-32">% of Class</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                            {analysisData.map((row) => (
                              <tr key={row.analysis} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/5 transition-colors">
                                <td className="px-6 py-2.5 font-bold text-text-primary">{row.analysis}</td>
                                <td className="px-6 py-2.5 text-center font-semibold text-text-secondary">{row.count}</td>
                                <td className="px-6 py-2.5 text-text-secondary">{row.names}</td>
                                <td className="px-6 py-2.5 text-center font-bold text-text-primary">{row.pct}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Official Signature Lines (Print Mode Only) */}
                    <div className="hidden print:flex justify-between items-center px-12 pt-16 pb-8 text-xs text-text-tertiary relative z-10">
                      <div className="text-center border-t border-slate-300 w-36 pt-1.5 mt-6 font-semibold">
                        Class Tutor
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
