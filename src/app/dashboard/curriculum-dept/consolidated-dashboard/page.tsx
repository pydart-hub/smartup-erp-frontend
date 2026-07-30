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
  Calendar,
  Sparkles,
  Trophy,
  Activity,
  Award,
  ChevronRight,
  School,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Printer,
  Percent,
  Hash,
  User
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GifLoader } from "@/components/ui/GifLoader";
import { getBranches } from "@/lib/api/enrollment";
import { getExamResults, getReportCard } from "@/lib/api/assessment";

export default function ConsolidatedDashboardPage() {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Drill-down states: "branches" | "classes" | "subjects" | "exams" | "analysis" | "student-report"
  const [level, setLevel] = useState<"branches" | "classes" | "subjects" | "exams" | "analysis" | "student-report">("branches");
  
  // Selected entities
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedClass, setSelectedClass] = useState(""); // Name (ID) of Student Group
  const [selectedClassName, setSelectedClassName] = useState(""); // User-facing name
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedExamName, setSelectedExamName] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedStudentName, setSelectedStudentName] = useState("");

  // Helper to determine tailwind classes based on pass rate percentage (neutral and clean)
  const getRateColor = (rate: number) => {
    if (rate >= 85) {
      return {
        text: "text-success",
        bg: "bg-success"
      };
    }
    if (rate >= 70) {
      return {
        text: "text-amber-500 dark:text-amber-400",
        bg: "bg-amber-500 dark:bg-amber-400"
      };
    }
    if (rate >= 50) {
      return {
        text: "text-orange-500 dark:text-orange-400",
        bg: "bg-orange-500 dark:bg-orange-400"
      };
    }
    return {
      text: "text-red-500 dark:text-red-400",
      bg: "bg-red-500 dark:bg-red-400"
    };
  };

  // 1. Fetch branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    staleTime: 120_000,
  });

  // 2. Fetch all exams (Assessment Plans) across all branches to map metadata
  const { data: allPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["all-assessment-plans-curriculum"],
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
              "from_time",
              "to_time"
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

  // 4. Fetch classes for the selected branch
  const { data: studentGroups = [], isLoading: sgLoading } = useQuery({
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

  // 5. Fetch single exam results when analysis level is reached
  const { data: analysisResponse, isLoading: analysisLoading } = useQuery({
    queryKey: ["exam-results-for-analysis", selectedExam],
    queryFn: () => getExamResults(selectedExam),
    enabled: !!selectedExam && (level === "analysis" || level === "student-report"),
    staleTime: 30_000,
  });

  const examResults = analysisResponse?.data ?? [];

  // Map each plan to its metadata (branch, class, course, etc.) for quick lookup
  const planMetaMap = useMemo(() => {
    const map = new Map<string, any>();
    allPlans.forEach((p: any) => {
      map.set(p.name, p);
    });
    return map;
  }, [allPlans]);

  // 6. Fetch student details for profile header
  const { data: studentInfo, isLoading: studentInfoLoading } = useQuery({
    queryKey: ["student-info", selectedStudent],
    queryFn: async () => {
      if (!selectedStudent) return null;
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: `resource/Student/${encodeURIComponent(selectedStudent)}`,
          method: "GET"
        })
      }).then(r => r.json());
      return res.data;
    },
    enabled: level === "student-report" && !!selectedStudent,
    staleTime: 60_000,
  });

  // 7. Fetch all historical results for the student to build a complete consolidated report card
  const { data: studentAllResults = [], isLoading: studentAllResultsLoading } = useQuery({
    queryKey: ["student-all-results", selectedStudent],
    queryFn: async () => {
      if (!selectedStudent) return [];
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Assessment Result",
          method: "GET",
          payload: {
            fields: JSON.stringify(["name", "course", "assessment_plan", "total_score", "maximum_score", "grade", "assessment_group"]),
            filters: JSON.stringify([["student", "=", selectedStudent], ["docstatus", "=", 1]]),
            limit_page_length: "500"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    enabled: level === "student-report" && !!selectedStudent,
    staleTime: 30_000,
  });

  // Compute the student report card by keeping the latest result for every subject (course)
  const reportData = useMemo(() => {
    if (studentAllResults.length === 0) return null;

    // Group by course
    const courseMap = new Map<string, any[]>();
    studentAllResults.forEach((r: any) => {
      if (!courseMap.has(r.course)) {
        courseMap.set(r.course, []);
      }
      courseMap.get(r.course)!.push(r);
    });

    let totalObtained = 0;
    let totalMax = 0;
    let passStatus = true;

    const subjects = Array.from(courseMap.entries()).map(([courseId, resultsList]) => {
      // Sort to prefer non-zero score and latest date
      resultsList.sort((a, b) => {
        const aHasScore = a.total_score > 0 ? 1 : 0;
        const bHasScore = b.total_score > 0 ? 1 : 0;
        if (aHasScore !== bHasScore) {
          return bHasScore - aHasScore;
        }
        const dateA = planMetaMap.get(a.assessment_plan)?.schedule_date || "";
        const dateB = planMetaMap.get(b.assessment_plan)?.schedule_date || "";
        return dateB.localeCompare(dateA);
      });

      const r = resultsList[0];
      const pct = r.maximum_score > 0 ? (r.total_score / r.maximum_score) * 100 : 0;
      const isPassed = pct >= 40;
      if (!isPassed) passStatus = false;

      totalObtained += r.total_score;
      totalMax += r.maximum_score;

      const meta = planMetaMap.get(r.assessment_plan);

      return {
        courseCode: r.course,
        courseName: r.course.replace(/^\d+\w*\s+/, ""),
        examName: meta?.assessment_name || r.assessment_plan,
        examDate: meta?.schedule_date || "",
        score: r.total_score,
        max: r.maximum_score,
        percentage: pct,
        grade: r.grade || "N/A",
        status: isPassed ? "Pass" : "Fail"
      };
    });

    const overallPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const overallGrade = totalMax > 0 ? calculateOverallGrade(overallPct) : "N/A";

    return {
      subjects,
      totalObtained,
      totalMax,
      overallPct,
      overallGrade,
      resultStatus: passStatus ? "Pass" : "Fail"
    };
  }, [studentAllResults, planMetaMap]);

  // Simple grade calculation based on overall percentage
  function calculateOverallGrade(pct: number): string {
    if (pct >= 90) return "A+";
    if (pct >= 80) return "A";
    if (pct >= 70) return "B+";
    if (pct >= 60) return "B";
    if (pct >= 50) return "C+";
    if (pct >= 40) return "C";
    return "D";
  }

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
      // Find all plans belonging to this branch
      const branchPlans = allPlans.filter((p: any) => p.custom_branch === b.name);
      // Collect all results for these plans
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

  // --- SUBJECT PERFORMANCE COMPUTATION ---
  // Find subjects for the selected class's program
  const selectedSG = useMemo(() => {
    return studentGroups.find((sg: any) => sg.name === selectedClass);
  }, [studentGroups, selectedClass]);

  const { data: programCourses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["program-courses-for-class", selectedSG?.program],
    queryFn: async () => {
      if (!selectedSG?.program) return [];
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: `resource/Program/${encodeURIComponent(selectedSG!.program)}`,
          method: "GET"
        })
      }).then(r => r.json());
      return res.data?.courses ?? [];
    },
    enabled: !!selectedSG?.program && level === "subjects",
    staleTime: 120_000,
  });

  const subjectPerformances = useMemo(() => {
    const uniqueCourses = new Map<string, string>();
    programCourses.forEach((c: any) => {
      uniqueCourses.set(c.course, c.course_name || c.course);
    });

    return Array.from(uniqueCourses.entries()).map(([courseId, courseName]) => {
      const subjectPlans = allPlans.filter((p: any) => p.student_group === selectedClass && p.course === courseId);
      const subjectResultsList: any[] = [];
      subjectPlans.forEach((p: any) => {
        const planResults = resultsByPlan.get(p.name) || [];
        subjectResultsList.push(...planResults);
      });

      const { rate, total } = computePassRate(subjectResultsList);
      return {
        id: courseId,
        name: courseName,
        passRate: total > 0 ? `${rate}%` : "N/A",
        numericRate: rate,
        examsCount: subjectPlans.length
      };
    });
  }, [programCourses, selectedClass, allPlans, resultsByPlan]);

  // --- EXAMS LIST COMPUTATION ---
  const examPerformances = useMemo(() => {
    const subjectPlans = allPlans.filter(
      (p: any) => p.student_group === selectedClass && p.course === selectedSubject
    );

    return subjectPlans.map((p: any) => {
      const planResults = resultsByPlan.get(p.name) || [];
      const { rate, total } = computePassRate(planResults);
      return {
        id: p.name,
        name: p.assessment_name,
        scheduleDate: p.schedule_date,
        fromTime: p.from_time,
        toTime: p.to_time,
        maxScore: p.maximum_assessment_score,
        passRate: total > 0 ? `${rate}%` : "N/A",
        numericRate: rate,
        totalStudents: total
      };
    });
  }, [selectedClass, selectedSubject, allPlans, resultsByPlan]);

  // --- FINAL PERFORMANCE ANALYSIS TABLE ROWS ---
  const analysisRows = useMemo(() => {
    if (examResults.length === 0) return [];

    const totalStudents = examResults.length;
    const highestScore = examResults[0]?.total_score || 0;

    const getNamesArray = (list: any[]) => list.map(r => r.student_name);
    const toppers = examResults.filter(r => r.total_score === highestScore);
    const getTopK = (k: number) => examResults.slice(0, Math.min(k, totalStudents));
    const getPercentAbove = (pctThreshold: number) => {
      return examResults.filter(r => {
        const pct = (r.total_score / r.maximum_score) * 100;
        return pct >= pctThreshold;
      });
    };

    const p90List = getPercentAbove(90);
    const p85List = getPercentAbove(85);
    const p80List = getPercentAbove(80);

    return [
      { name: "Topper", count: toppers.length, students: getNamesArray(toppers), percentage: "—", icon: Trophy, color: "text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" },
      { name: "Top 3", count: Math.min(3, totalStudents), students: getNamesArray(getTopK(3)), percentage: "—", icon: Award, color: "text-slate-500 bg-slate-50 dark:bg-slate-900/50" },
      { name: "Top 5", count: Math.min(5, totalStudents), students: getNamesArray(getTopK(5)), percentage: "—", icon: Award, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/20" },
      { name: "Top 10", count: Math.min(10, totalStudents), students: getNamesArray(getTopK(10)), percentage: "—", icon: Users, color: "text-primary bg-primary/5" },
      { name: "Top 15", count: Math.min(15, totalStudents), students: getNamesArray(getTopK(15)), percentage: "—", icon: Users, color: "text-primary bg-primary/5" },
      { name: "90% & Above", count: p90List.length, students: getNamesArray(p90List), percentage: `${((p90List.length / totalStudents) * 100).toFixed(1)}%`, icon: Sparkles, color: "text-success bg-success/5" },
      { name: "85% & Above", count: p85List.length, students: getNamesArray(p85List), percentage: `${((p85List.length / totalStudents) * 100).toFixed(1)}%`, icon: Activity, color: "text-info bg-info/5" },
      { name: "80% & Above", count: p80List.length, students: getNamesArray(p80List), percentage: `${((p80List.length / totalStudents) * 100).toFixed(1)}%`, icon: Activity, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/20" }
    ];
  }, [examResults]);

  const isLoading = branchesLoading || plansLoading || resultsLoading;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <BreadcrumbNav />

      {/* Header with drilldown navigation trace */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
          <BarChart3 className="h-7 w-7 text-primary" />
          Branch Wise Performance
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
          {selectedClass && level !== "classes" && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
              <span 
                className="hover:underline cursor-pointer text-primary font-medium"
                onClick={() => { setLevel("subjects"); }}
              >
                {selectedClassName}
              </span>
            </>
          )}
          {selectedSubject && level !== "classes" && level !== "subjects" && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
              <span 
                className="hover:underline cursor-pointer text-primary font-medium"
                onClick={() => { setLevel("exams"); }}
              >
                {selectedSubject}
              </span>
            </>
          )}
          {selectedExam && (level === "analysis" || level === "student-report") && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
              <span 
                className="hover:underline cursor-pointer text-primary font-medium"
                onClick={() => { setLevel("analysis"); }}
              >
                {selectedExamName}
              </span>
            </>
          )}
          {selectedStudent && level === "student-report" && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="text-text-tertiary">{selectedStudentName} Report</span>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex items-center justify-center">
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
              {branchPerformances.map((b) => {
                const colors = getRateColor(b.numericRate);
                return (
                  <Card 
                    key={b.name}
                    hover
                    onClick={() => {
                      setSelectedBranch(b.name);
                      setLevel("classes");
                    }}
                    className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm hover:border-slate-200 dark:hover:border-white/[0.12] transition-all group relative"
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
                        {b.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-2">
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-xs text-text-secondary font-medium">Average Pass Rate</span>
                        <span className={`text-2xl font-extrabold tracking-tight ${colors.text}`}>
                          {b.passRate}
                        </span>
                      </div>
                      {/* Visual Progress Bar */}
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
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setLevel("branches")}
                  className="h-8 px-3 text-xs border border-border-input bg-surface rounded-[8px] flex items-center font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Branches
                </button>
              </div>

              {sgLoading ? (
                <div className="py-24 flex items-center justify-center">
                  <GifLoader size="lg" />
                </div>
              ) : classPerformances.length === 0 ? (
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
                        hover
                        onClick={() => {
                          setSelectedClass(c.id);
                          setSelectedClassName(c.name);
                          setLevel("subjects");
                        }}
                        className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm transition-all group"
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

          {/* LEVEL 3: SUBJECT CARDS */}
          {level === "subjects" && (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setLevel("classes")}
                  className="h-8 px-3 text-xs border border-border-input bg-surface rounded-[8px] flex items-center font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Classes
                </button>
              </div>

              {coursesLoading ? (
                <div className="py-24 flex items-center justify-center">
                  <GifLoader size="lg" />
                </div>
              ) : subjectPerformances.length === 0 ? (
                <Card className="p-12 text-center border-dashed">
                  <h3 className="text-base font-semibold text-text-primary">No subjects found</h3>
                  <p className="text-sm text-text-secondary mt-1">This class program does not have any active subjects.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subjectPerformances.map((sub: any) => {
                    const colors = getRateColor(sub.numericRate);
                    return (
                      <Card 
                        key={sub.id} 
                        hover
                        onClick={() => {
                          setSelectedSubject(sub.id);
                          setLevel("exams");
                        }}
                        className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm transition-all group"
                      >
                        <CardHeader className="p-6 pb-2">
                          <div className="flex justify-between items-start">
                            <div className="p-2 bg-slate-50 dark:bg-slate-800/50 text-slate-400 rounded-lg">
                              <BookOpen className="h-5 w-5" />
                            </div>
                            <Badge className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-white/[0.04]">
                              {sub.examsCount} Exams
                            </Badge>
                          </div>
                          <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-primary transition-colors">
                            {sub.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                          <div className="mt-2 flex items-baseline justify-between">
                            <span className="text-xs text-text-secondary font-medium">Pass Rate</span>
                            <span className={`text-xl font-bold ${colors.text}`}>
                              {sub.passRate}
                            </span>
                          </div>
                          {sub.numericRate > 0 && (
                            <div className="w-full bg-slate-50 dark:bg-white/[0.04] h-1.5 rounded-full mt-3 overflow-hidden">
                              <div 
                                className={`h-full ${colors.bg} rounded-full`}
                                style={{ width: `${sub.numericRate}%` }}
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

          {/* LEVEL 4: EXAMS LIST */}
          {level === "exams" && (
            <motion.div
              key="exams"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setLevel("subjects")}
                  className="h-8 px-3 text-xs border border-border-input bg-surface rounded-[8px] flex items-center font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Subjects
                </button>
              </div>

              {examPerformances.length === 0 ? (
                <Card className="p-12 text-center border-dashed">
                  <h3 className="text-base font-semibold text-text-primary">No exams conducted</h3>
                  <p className="text-sm text-text-secondary mt-1">No assessment plans have been scheduled for this subject yet.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {examPerformances.map((ex: any) => {
                    const colors = getRateColor(ex.numericRate);
                    return (
                      <Card 
                        key={ex.id} 
                        hover
                        onClick={() => {
                          setSelectedExam(ex.id);
                          setSelectedExamName(ex.name);
                          setLevel("analysis");
                        }}
                        className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm transition-all group"
                      >
                        <CardHeader className="p-5 pb-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-white/[0.04] font-medium">
                              Max score: {ex.maxScore}
                            </Badge>
                            <span className="text-xs text-text-tertiary font-mono">{ex.id}</span>
                          </div>
                          <CardTitle className="text-base font-bold text-text-primary group-hover:text-primary transition-colors">
                            {ex.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 pt-0">
                          <div className="mt-3 space-y-2 border-t border-slate-100 dark:border-white/[0.06] pt-3">
                            <div className="flex justify-between text-xs text-text-secondary">
                              <span>Date:</span>
                              <span className="font-semibold text-text-primary">{formatDate(ex.scheduleDate)}</span>
                            </div>
                            {ex.fromTime && ex.toTime && (
                              <div className="flex justify-between text-xs text-text-secondary">
                                <span>Time:</span>
                                <span className="font-semibold text-text-primary">
                                  {ex.fromTime.slice(0, 5)} - {ex.toTime.slice(0, 5)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between text-xs text-text-secondary">
                              <span>Examinees:</span>
                              <span className="font-semibold text-text-primary">{ex.totalStudents} Students</span>
                            </div>
                            <div className="flex justify-between text-xs text-text-secondary">
                              <span>Pass Rate:</span>
                              <span className={`font-bold ${colors.text}`}>{ex.passRate}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* LEVEL 5: PERFORMANCE ANALYSIS */}
          {level === "analysis" && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setLevel("exams")}
                  className="h-8 px-3 text-xs border border-border-input bg-surface rounded-[8px] flex items-center font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Exams
                </button>
              </div>

              {analysisLoading ? (
                <div className="py-24 flex items-center justify-center">
                  <GifLoader size="lg" />
                </div>
              ) : examResults.length === 0 ? (
                <Card className="p-12 text-center border-dashed border-warning/30 bg-warning-light/10">
                  <FileText className="mx-auto h-12 w-12 text-warning mb-3" />
                  <h3 className="text-base font-semibold text-warning">Marks Pending</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    No student marks have been recorded or submitted for this exam yet.
                  </p>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Summary row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary font-medium uppercase">Total Students</p>
                          <p className="text-xl font-bold text-text-primary mt-0.5">{examResults.length}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-yellow-100 text-yellow-600 dark:bg-yellow-950/20 dark:text-yellow-500">
                          <Trophy className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary font-medium uppercase">Highest Score</p>
                          <p className="text-xl font-bold text-text-primary mt-0.5">
                            {examResults[0]?.total_score} <span className="text-xs text-text-tertiary">/ {examResults[0]?.maximum_score}</span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-success/10 text-success">
                          <Award className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary font-medium uppercase">Average Score</p>
                          <p className="text-xl font-bold text-text-primary mt-0.5">
                            {(examResults.reduce((acc, curr) => acc + curr.total_score, 0) / examResults.length).toFixed(1)}
                            <span className="text-xs text-text-tertiary"> / {examResults[0]?.maximum_score}</span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Ranked Student List Table */}
                  <Card>
                    <CardHeader className="p-6 pb-2">
                      <CardTitle className="text-lg font-bold text-text-primary flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Rank List: {selectedExamName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/50">
                            <th className="px-6 py-4 font-semibold text-text-secondary w-20 text-center">Rank</th>
                            <th className="px-6 py-4 font-semibold text-text-secondary">Student Name</th>
                            <th className="px-6 py-4 font-semibold text-text-secondary text-center">Score Obtained</th>
                            <th className="px-6 py-4 font-semibold text-text-secondary text-center">Percentage</th>
                            <th className="px-6 py-4 font-semibold text-text-secondary text-center">Grade</th>
                            <th className="px-6 py-4 font-semibold text-text-secondary text-center">Report</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                          {(() => {
                            let currentRank = 1;
                            let prevScore = -1;
                            return examResults.map((row: any, index: number) => {
                              if (row.total_score !== prevScore) {
                                currentRank = index + 1;
                                prevScore = row.total_score;
                              }
                              const percentage = ((row.total_score / row.maximum_score) * 100).toFixed(1);
                              
                              // Stylized rank badge
                              const getRankBadge = (rank: number) => {
                                if (rank === 1) return <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-yellow-100 text-yellow-700 font-bold text-xs">1</span>;
                                if (rank === 2) return <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">2</span>;
                                if (rank === 3) return <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">3</span>;
                                return <span className="text-text-secondary font-medium">{rank}</span>;
                              };

                              return (
                                <tr key={row.name} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                                  <td className="px-6 py-3.5 text-center font-semibold text-text-primary">
                                    {getRankBadge(currentRank)}
                                  </td>
                                  <td className="px-6 py-3.5 font-medium text-text-primary">
                                    {row.student_name}
                                  </td>
                                  <td className="px-6 py-3.5 font-bold text-center text-text-primary">
                                    {row.total_score} <span className="text-xs font-normal text-text-tertiary">/ {row.maximum_score}</span>
                                  </td>
                                  <td className="px-6 py-3.5 font-semibold text-center text-text-primary">
                                    {percentage}%
                                  </td>
                                  <td className="px-6 py-3.5 text-center">
                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-bold">
                                      {row.grade || "N/A"}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-3.5 text-center">
                                    <button
                                      onClick={() => {
                                        setSelectedStudent(row.student);
                                        setSelectedStudentName(row.student_name);
                                        setLevel("student-report");
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-input hover:border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-[11px] font-bold text-primary transition-all"
                                    >
                                      <FileText className="h-3.5 w-3.5" /> View Report
                                    </button>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          )}

          {/* LEVEL 6: INDIVIDUAL STUDENT CONSOLIDATED REPORT */}
          {level === "student-report" && (
            <motion.div
              key="student-report"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
                <button 
                  onClick={() => setLevel("analysis")}
                  className="h-8 px-3 text-xs border border-border-input bg-surface rounded-[8px] flex items-center font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Rank List
                </button>

                <button
                  onClick={() => window.print()}
                  className="h-8 px-3 text-xs font-semibold bg-surface border border-border-input hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-[8px] flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Report
                </button>
              </div>

              {studentAllResultsLoading || studentInfoLoading ? (
                <div className="py-24 flex items-center justify-center">
                  <GifLoader size="lg" />
                </div>
              ) : !reportData ? (
                <Card className="p-12 text-center border-dashed">
                  <h3 className="text-base font-semibold text-text-primary">No report data found</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    No entered exam marks are available for the selected student.
                  </p>
                </Card>
              ) : (
                <Card className="border border-slate-100 dark:border-white/[0.06] shadow-sm overflow-hidden bg-surface relative">
                  {/* Watermark Logo */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] dark:opacity-[0.05] select-none z-0">
                    <img 
                      src="/smartup-logo-v2.png" 
                      alt="Watermark" 
                      className="w-80 h-auto object-contain max-w-full"
                    />
                  </div>

                  {/* Header / Watermark style */}
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
                          ACADEMIC PROGRESS REPORT
                        </h2>
                        <p className="text-[10px] text-text-tertiary mt-0.5 uppercase tracking-wider font-semibold">
                          CONSOLIDATED MARKS (LATEST PER SUBJECT)
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-none font-bold uppercase text-[9px] px-2.5 py-0.5">
                      Official Transcript
                    </Badge>
                  </div>

                  {/* Student Info Grid */}
                  <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 bg-slate-50/30 dark:bg-slate-900/10 border-b border-slate-100 dark:border-white/[0.06] relative z-10">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-text-tertiary uppercase flex items-center gap-1">
                        <User className="h-3 w-3 text-primary" /> Student Name
                      </span>
                      <p className="text-sm font-extrabold text-text-primary">
                        {studentInfo?.student_name || selectedStudentName}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-text-tertiary uppercase flex items-center gap-1">
                        <Hash className="h-3 w-3 text-primary" /> Student ID
                      </span>
                      <p className="text-sm font-semibold text-text-primary font-mono">{selectedStudent}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-text-tertiary uppercase flex items-center gap-1">
                        <GraduationCap className="h-3 w-3 text-primary" /> Class / Program
                      </span>
                      <p className="text-sm font-semibold text-text-primary">
                        {studentInfo?.program || selectedClassName}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-text-tertiary uppercase flex items-center gap-1">
                        <School className="h-3 w-3 text-primary" /> Branch
                      </span>
                      <p className="text-sm font-semibold text-text-primary">
                        {studentInfo?.custom_branch?.replace("Smart Up ", "") || selectedBranch?.replace("Smart Up ", "")}
                      </p>
                    </div>
                  </div>

                  {/* Vertical Subject Report Table */}
                  <div className="p-0 relative z-10">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/50 text-[10px] uppercase font-bold text-text-tertiary tracking-wider">
                          <th className="px-6 py-3">Subject / Course & Exam Details</th>
                          <th className="px-6 py-3 text-center">Marks Obtained</th>
                          <th className="px-6 py-3 text-center">Maximum Marks</th>
                          <th className="px-6 py-3 text-center">Percentage</th>
                          <th className="px-6 py-3 text-center">Grade</th>
                          <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                        {reportData.subjects.map((sub: any, idx: number) => (
                          <tr key={`${sub.courseCode}-${idx}`} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/5 transition-colors">
                            <td className="px-6 py-3.5 font-bold text-text-primary">
                              {sub.courseName}
                              <span className="block text-[9px] font-normal text-text-tertiary font-mono mt-0.5">
                                {sub.examName} • {formatDate(sub.examDate)}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-center font-extrabold text-text-primary text-sm">
                              {sub.score}
                            </td>
                            <td className="px-6 py-3.5 text-center font-semibold text-text-secondary">
                              {sub.max}
                            </td>
                            <td className="px-6 py-3.5 text-center font-semibold text-text-primary">
                              {sub.percentage.toFixed(1)}%
                            </td>
                            <td className="px-6 py-3.5 text-center">
                              <span className="inline-flex items-center justify-center font-bold text-primary px-2 py-0.5 bg-primary/5 border border-primary/10 rounded-md">
                                {sub.grade}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-center">
                              <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                sub.status === "Pass"
                                  ? "bg-success/10 text-success" 
                                  : "bg-error/10 text-error"
                              }`}>
                                {sub.status === "Pass" ? (
                                  <><CheckCircle2 className="h-2.5 w-2.5" /> PASS</>
                                ) : (
                                  <><XCircle className="h-2.5 w-2.5" /> FAIL</>
                                )}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Overall Summary Footer */}
                  <div className="p-6 bg-slate-50/40 dark:bg-white/[0.01] border-t border-slate-100 dark:border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
                    <div className="space-y-0.5 text-center sm:text-left">
                      <span className="text-[9px] font-bold text-text-tertiary uppercase">Total Marks</span>
                      <p className="text-lg font-black text-text-primary mt-0.5">
                        {reportData.totalObtained} <span className="text-xs font-normal text-text-tertiary">/ {reportData.totalMax}</span>
                      </p>
                    </div>
                    <div className="space-y-0.5 text-center sm:text-left">
                      <span className="text-[9px] font-bold text-text-tertiary uppercase">Overall Percentage</span>
                      <p className="text-lg font-black text-text-primary mt-0.5 flex items-center justify-center sm:justify-start gap-0.5">
                        <Percent className="h-4.5 w-4.5 text-primary shrink-0" />
                        {reportData.overallPct.toFixed(1)}%
                      </p>
                    </div>
                    <div className="space-y-0.5 text-center sm:text-left">
                      <span className="text-[9px] font-bold text-text-tertiary uppercase">Overall Grade</span>
                      <p className="text-lg font-black text-text-primary mt-0.5 flex items-center justify-center sm:justify-start gap-1">
                        <Award className="h-4.5 w-4.5 text-primary shrink-0" />
                        {reportData.overallGrade}
                      </p>
                    </div>
                    <div className="space-y-0.5 text-center sm:text-left">
                      <span className="text-[9px] font-bold text-text-tertiary uppercase block">Result Status</span>
                      <div className="mt-1 flex justify-center sm:justify-start">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-3 py-1 rounded-full border ${
                          reportData.resultStatus === "Pass"
                            ? "bg-success/5 text-success border-success/15"
                            : "bg-error/5 text-error border-error/15"
                        }`}>
                          {reportData.resultStatus === "Pass" ? (
                            <><CheckCircle2 className="h-3 w-3" /> PASSED</>
                          ) : (
                            <><XCircle className="h-3 w-3" /> FAILED</>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Official Signature Lines */}
                  <div className="hidden print:flex justify-between items-center px-12 pt-16 pb-8 text-xs text-text-tertiary relative z-10">
                    <div className="text-center border-t border-slate-300 w-36 pt-1.5 mt-6 font-semibold">
                      Class Tutor
                    </div>
                    <div className="text-center border-t border-slate-300 w-36 pt-1.5 mt-6 font-semibold">
                      Academic Director
                    </div>
                  </div>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
