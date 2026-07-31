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
  Percent
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GifLoader } from "@/components/ui/GifLoader";
import { getBranches } from "@/lib/api/enrollment";
import { getAssessmentGroups, getBatchResults } from "@/lib/api/assessment";

export default function BranchRankingPage() {
  // CWC Selector
  const [selectedCwc, setSelectedCwc] = useState("CWC 1");
  const cwcOptions = ["CWC 1", "CWC 2", "CWC 3"];

  // Drill-down levels: "branches" | "classes" | "report"
  const [level, setLevel] = useState<"branches" | "classes" | "report">("branches");
  
  // Entities selection
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedClass, setSelectedClass] = useState(""); // Student Group ID
  const [selectedClassName, setSelectedClassName] = useState(""); // Student Group name
  const [selectedExamGroup, setSelectedExamGroup] = useState("CWC 1");
  const [selectedFilterSubject, setSelectedFilterSubject] = useState<string | null>(null);

  // Helper to determine tailwind classes based on pass rate percentage
  const getRateColor = (rate: number) => {
    if (rate === 0) return { text: "text-text-tertiary", bg: "bg-text-tertiary" };
    if (rate >= 85) return { text: "text-success", bg: "bg-success" };
    if (rate >= 60) return { text: "text-primary", bg: "bg-primary" };
    return { text: "text-error", bg: "bg-error" };
  };

  // 1. Fetch branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches-for-rates-cwc"],
    queryFn: getBranches,
    staleTime: 5 * 60_000,
  });

  // 2. Fetch assessment plans
  const { data: allPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["all-plans-for-cwc-corner"],
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

  // 3. Fetch assessment results
  const { data: allResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["all-results-for-cwc-corner"],
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

  // Compute branch pass rates strictly filtered by selected CWC Group
  const branchPerformances = useMemo(() => {
    return branches.map((b: any) => {
      const branchPlans = allPlans.filter((p: any) => {
        if (p.custom_branch !== b.name) return false;
        const ag = (p.assessment_group || "").toLowerCase();
        const an = (p.assessment_name || "").toLowerCase();
        
        const match = selectedCwc.toLowerCase().match(/cwc\s*(?:exam\s*)?(\d+)/);
        const cwcNum = match ? match[1] : "";
        if (cwcNum) {
          const targetRegex = new RegExp(`cwc\\s*(?:exam\\s*)?${cwcNum}\\b`, "i");
          return targetRegex.test(ag) || targetRegex.test(an);
        }
        return ag.includes("cwc") || an.includes("cwc");
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
  }, [branches, allPlans, resultsByPlan, selectedCwc]);

  // 4. Fetch student groups when branch is selected
  const { data: studentGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["cwc-student-groups-by-branch", selectedBranch],
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

  // Calculate pass rates for each class in selected branch under the selected CWC group
  const classPerformances = useMemo(() => {
    return studentGroups.map((sg: any) => {
      const classPlans = allPlans.filter((p: any) => {
        if (p.student_group !== sg.name) return false;
        const ag = (p.assessment_group || "").toLowerCase();
        const an = (p.assessment_name || "").toLowerCase();

        const match = selectedCwc.toLowerCase().match(/cwc\s*(?:exam\s*)?(\d+)/);
        const cwcNum = match ? match[1] : "";
        if (cwcNum) {
          const targetRegex = new RegExp(`cwc\\s*(?:exam\\s*)?${cwcNum}\\b`, "i");
          return targetRegex.test(ag) || targetRegex.test(an);
        }
        return ag.includes("cwc") || an.includes("cwc");
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
        passRate: total > 0 ? `${rate}%` : "N/A",
        numericRate: rate,
        examsCount: classPlans.length
      };
    });
  }, [studentGroups, allPlans, resultsByPlan, selectedCwc]);

  // 5. Fetch consolidated results for class CWC
  const { data: batchData, isLoading: batchLoading } = useQuery({
    queryKey: ["cwc-class-batch-results", selectedClass, selectedExamGroup],
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
      const isPassedAll = !st.subjects.some((sub: any) => sub.percentage < 40) && st.passed;
      const isFailedAny = st.subjects.some((sub: any) => sub.percentage < 40);
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
  }, [studentsList, selectedFilter]);

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
            Branch Wise Ranking ({selectedCwc})
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Compare CWC branch standings and drill down into class and student ranking list.
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
          <Link href="/dashboard/curriculum-dept/cwc-corner">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary bg-surface border border-border/60 hover:border-border transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to CWC Corner
            </button>
          </Link>
        </div>
      </div>

      {/* CWC Exam Selector Pills */}
      {level === "branches" && (
        <div className="flex items-center gap-3 bg-surface p-1.5 rounded-2xl border border-border/60 w-fit shadow-sm">
          {cwcOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                setSelectedCwc(opt);
                setSelectedExamGroup(opt);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedCwc === opt
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

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

          {/* LEVEL 2: CLASS CARDS */}
          {level === "classes" && (
            <motion.div
              key="classes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {groupsLoading ? (
                <div className="py-24 flex items-center justify-center">
                  <GifLoader size="lg" />
                </div>
              ) : classPerformances.length === 0 ? (
                <Card className="p-12 text-center border-dashed bg-surface">
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
                          setSelectedExamGroup(selectedCwc);
                          setLevel("report");
                        }}
                        className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm hover:border-slate-200 dark:hover:border-white/[0.12] transition-all group bg-surface"
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

          {/* LEVEL 3: DETAILED REPORT LIST WITH SUBJECT RANKING */}
          {level === "report" && (
            <motion.div
              key="report"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-4"
            >
              {/* Toolbar */}
              <div className="bg-surface border border-slate-100 dark:border-white/[0.06] p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm print:hidden">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-secondary uppercase">Exam:</span>
                    <Badge variant="outline" className="border-amber-500/30 text-amber-600 font-extrabold px-3 py-1 text-xs">
                      {selectedExamGroup}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-secondary uppercase">Filter:</span>
                    <select
                      value={selectedFilter}
                      onChange={(e) => setSelectedFilter(e.target.value)}
                      className="h-8 px-2 text-xs bg-slate-50 dark:bg-slate-800 border border-border-input rounded-[8px] font-semibold text-text-primary focus:outline-none cursor-pointer"
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
                    const clone = document.getElementById("printable-report-card")?.cloneNode(true) as HTMLElement;
                    if (!clone) return;
                    
                    const printContainer = document.createElement("div");
                    printContainer.id = "print-clone-container";
                    printContainer.appendChild(clone);
                    
                    const style = document.createElement("style");
                    style.innerHTML = `
                      @media print {
                        body * {
                          visibility: hidden;
                        }
                        #print-clone-container, #print-clone-container * {
                          visibility: visible;
                        }
                        #print-clone-container {
                          position: absolute;
                          left: 0;
                          top: 0;
                          width: 100%;
                        }
                        #print-clone-container .watermark-container {
                          position: absolute !important;
                          left: 50% !important;
                          top: 40% !important;
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
                    document.body.appendChild(printContainer);
                    
                    window.print();
                    
                    setTimeout(() => {
                      style.remove();
                      printContainer.remove();
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
                <Card className="p-12 text-center border-dashed bg-surface">
                  <h3 className="text-base font-semibold text-text-primary">No consolidated marks found</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    No results have been submitted for this class and CWC exam session.
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

                  {/* Consolidated Mark List Table */}
                  <Card id="printable-report-card" className="border border-slate-100 dark:border-white/[0.06] shadow-sm overflow-hidden bg-surface relative">
                    <div className="watermark-container absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] dark:opacity-[0.05] select-none z-0">
                      <img src="/smartup-logo-v2.png" alt="Watermark" className="watermark-logo w-80 h-auto object-contain max-w-full" />
                    </div>

                    <div className="bg-primary/5 dark:bg-primary/10 px-6 py-5 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <img src="/smartup-logo-v2.png" alt="Smart Up Logo" className="h-10 w-auto object-contain shrink-0" />
                        <div>
                          <h1 className="text-[11px] font-black text-primary tracking-wider uppercase">SmartUp Learning Ventures</h1>
                          <h2 className="text-base font-extrabold text-text-primary tracking-tight mt-0.5">CLASS CONSOLIDATED MARK LIST</h2>
                          <p className="text-[10px] text-text-tertiary mt-0.5 uppercase tracking-wider font-semibold">
                            Exam Session: {selectedExamGroup} • Class: {selectedClassName}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-none font-bold uppercase text-[9px] px-2.5 py-0.5">Official Transcript</Badge>
                    </div>

                    <div className="p-0 overflow-x-auto relative z-10">
                      {selectedFilterSubject && (
                        <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between print:hidden">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-purple-600 text-white text-[10px] font-black">!</span>
                            <span className="text-xs font-bold text-text-primary">
                              Showing Rank List for Subject: <span className="text-purple-600">{uniqueCourses.find(c => c.code === selectedFilterSubject)?.name || selectedFilterSubject}</span>
                            </span>
                          </div>
                          <button onClick={() => setSelectedFilterSubject(null)} className="text-xs font-bold text-text-secondary hover:text-text-primary hover:underline">
                            Clear Subject Filter (Show All)
                          </button>
                        </div>
                      )}

                      <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/50 text-[10px] uppercase font-bold text-text-tertiary tracking-wider">
                            <th className="px-6 py-3.5 w-12 text-center">Rank</th>
                            <th className="px-6 py-3.5">Student Name</th>
                            {uniqueCourses.map((c) => {
                              const isSelected = selectedFilterSubject === c.code;
                              return (
                                <th 
                                  key={c.code} 
                                  className={`px-6 py-3.5 text-center cursor-pointer hover:bg-purple-500/10 transition-colors ${
                                    isSelected ? "bg-purple-500/20 text-purple-600 border-x border-purple-500/20" : ""
                                  }`}
                                  onClick={() => setSelectedFilterSubject(isSelected ? null : c.code)}
                                  title="Click to view student rankings for this subject"
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    <span>{c.name}</span>
                                    <span className="text-[8px] text-text-tertiary font-normal shrink-0">(Rank)</span>
                                  </div>
                                </th>
                              );
                            })}
                            <th className="px-6 py-3.5 text-center font-black bg-slate-100/30 dark:bg-white/[0.02]">Total</th>
                            <th className="px-6 py-3.5 text-center font-black bg-slate-100/30 dark:bg-white/[0.02]">%</th>
                            <th className="px-6 py-3.5 text-center font-black bg-slate-100/30 dark:bg-white/[0.02]">Grade</th>
                            <th className="px-6 py-3.5 text-center font-black bg-slate-100/30 dark:bg-white/[0.02]">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                          {(() => {
                            let rowsToRender = [...filteredStudents];
                            if (selectedFilterSubject) {
                              const subjectScores = rowsToRender.map(st => {
                                const subResult = st.subjects.find((sub: any) => sub.course === selectedFilterSubject);
                                return {
                                  student: st.student,
                                  score: subResult ? subResult.score : -1,
                                  percentage: subResult ? subResult.percentage : -1
                                };
                              });

                              subjectScores.sort((a, b) => b.score - a.score || b.percentage - a.percentage);

                              let curRank = 1;
                              const subjectRankMap = new Map<string, number>();
                              subjectScores.forEach((item, idx) => {
                                if (idx > 0) {
                                  const prev = subjectScores[idx - 1];
                                  if (item.score < prev.score) {
                                    curRank = idx + 1;
                                  }
                                }
                                subjectRankMap.set(item.student, curRank);
                              });

                              rowsToRender = rowsToRender.map(st => ({
                                ...st,
                                subjectRank: subjectRankMap.get(st.student) || st.rank
                              })).sort((a, b) => (a.subjectRank || 0) - (b.subjectRank || 0));
                            }

                            return (rowsToRender as any[]).map((row) => {
                              const hasFailedSubject = row.subjects.some((sub: any) => sub.percentage < 40);
                              const isPassed = !hasFailedSubject && row.passed;
                              const displayRank = selectedFilterSubject ? (row.subjectRank || row.rank) : row.rank;

                              return (
                                <tr key={row.student} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/5 transition-colors">
                                  <td className="px-6 py-3 text-center font-extrabold text-text-secondary">
                                    {displayRank}
                                  </td>
                                  <td className="px-6 py-3 font-bold text-text-primary">
                                    {row.student_name}
                                    <span className="block text-[9px] font-normal text-text-tertiary font-mono mt-0.5">
                                      {row.student}
                                    </span>
                                  </td>
                                  {uniqueCourses.map((c) => {
                                    const subResult = row.subjects.find((sub: any) => sub.course === c.code);
                                    if (!subResult) {
                                      return (
                                        <td key={c.code} className="px-6 py-3 text-center">
                                          <span className="text-[10px] font-bold text-error uppercase tracking-wider">Absent</span>
                                        </td>
                                      );
                                    }
                                    const isSubPass = subResult.percentage >= 40;
                                    return (
                                      <td key={c.code} className="px-6 py-3 text-center">
                                        <div className="flex flex-col items-center">
                                          <span className={`font-bold ${isSubPass ? "text-text-primary" : "text-error"}`}>{subResult.grade || "N/A"}</span>
                                          <span className="text-[9px] text-text-tertiary mt-0.5">{subResult.score} / {subResult.maximum_score}</span>
                                        </div>
                                      </td>
                                    );
                                  })}
                                  <td className="px-6 py-3 text-center font-black text-text-primary bg-slate-100/10 dark:bg-white/[0.01]">
                                    {row.total_score} <span className="text-[9px] font-normal text-text-tertiary">/ {row.total_maximum}</span>
                                  </td>
                                  <td className="px-6 py-3 text-center font-bold text-text-primary bg-slate-100/10 dark:bg-white/[0.01]">{row.overall_percentage.toFixed(1)}%</td>
                                  <td className="px-6 py-3 text-center bg-slate-100/10 dark:bg-white/[0.01]">
                                    <span className="inline-flex items-center justify-center font-bold text-primary px-2 py-0.5 bg-primary/5 border border-primary/10 rounded-md">{row.overall_grade}</span>
                                  </td>
                                  <td className="px-6 py-3 text-center bg-slate-100/10 dark:bg-white/[0.01]">
                                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full ${
                                      isPassed ? "bg-success/10 text-success" : "bg-error/10 text-error"
                                    }`}>
                                      {isPassed ? <><CheckCircle2 className="h-2.5 w-2.5" /> PASS</> : <><XCircle className="h-2.5 w-2.5" /> FAIL</>}
                                    </span>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* Performance Analysis */}
                    <div className="border-t border-slate-100 dark:border-white/[0.06] mt-8 relative z-10 page-break-before-auto">
                      <div className="bg-slate-50/50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Performance Analysis</h3>
                      </div>
                      <div className="p-0 overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-100/30 dark:bg-white/[0.01] text-[10px] uppercase font-bold text-text-tertiary tracking-wider">
                              <th className="px-6 py-3 w-1/4">Criteria</th>
                              <th className="px-6 py-3 text-center w-24">Count</th>
                              <th className="px-6 py-3 w-1/2">Names</th>
                              <th className="px-6 py-3 text-center w-32">% of Class</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                            {analysisData.map((row) => (
                              <tr key={row.criteria} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/5 transition-colors">
                                <td className="px-6 py-2.5 font-bold text-text-primary">{row.criteria}</td>
                                <td className="px-6 py-2.5 text-center font-semibold text-text-secondary">{row.count}</td>
                                <td className="px-6 py-2.5 text-text-secondary">{row.names || "—"}</td>
                                <td className="px-6 py-2.5 text-center font-bold text-text-primary">{row.isPct ? `${row.percentage}%` : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
