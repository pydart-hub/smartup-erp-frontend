"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Trophy, 
  Award, 
  Users, 
  GraduationCap, 
  Sparkles, 
  School,
  CheckCircle2,
  ChevronRight,
  Search,
  Filter
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GifLoader } from "@/components/ui/GifLoader";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";

const cleanBranchName = (name: string): string => {
  if (!name) return "";
  return name.replace(/^Smart\s+Up\s+/i, "").trim();
};

const extractGrade = (courseOrGroup: string): string => {
  if (!courseOrGroup) return "";
  const text = courseOrGroup.toLowerCase();
  
  if (text.includes("plus two") || text.includes("plus 2") || text.includes("+2") || text.includes("12th") || text.includes("12 th") || /\b12\b/.test(text)) {
    return "12th";
  }
  if (text.includes("plus one") || text.includes("plus 1") || text.includes("+1") || text.includes("11th") || text.includes("11 th") || /\b11\b/.test(text)) {
    return "11th";
  }
  if (text.includes("sslc") || text.includes("10th") || text.includes("10 th") || /\b10\b/.test(text)) {
    return "10th";
  }
  if (text.includes("9th") || text.includes("9 th") || /\b9\b/.test(text)) {
    return "9th";
  }
  if (text.includes("8th") || text.includes("8 th") || /\b8\b/.test(text)) {
    return "8th";
  }
  return "";
};

const extractSyllabus = (str: string): string => {
  if (!str) return "";
  const lower = str.toLowerCase();
  if (lower.includes("cbse")) return "CBSE";
  if (lower.includes("state")) return "State";
  return "";
};

const cleanSubjectName = (course: string): string => {
  if (!course) return "General";
  return course
    .replace(/\b(8|9|10|11|12)(st|nd|rd|th)?\s+(Grade|Std|Standard)?/i, "")
    .replace(/\s+-\s+(8|9|10|11|12)(st|nd|rd|th)?/i, "")
    .replace(/^Smart\s+Up\s+/i, "")
    .trim() || course;
};

const getGradeCode = (pct: number): string => {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C+";
  if (pct >= 40) return "C";
  if (pct >= 33) return "D+";
  return "F";
};

export default function ConsolidatedReportPage() {
  const [selectedGrade, setSelectedGrade] = useState<string>("10th");
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Fetch all assessment plans
  const { data: allPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["consolidated-assessment-plans"],
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
              "maximum_assessment_score",
              "custom_branch"
            ]),
            filters: JSON.stringify([["docstatus", "=", 1]]),
            limit_page_length: "3000"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    staleTime: 120_000,
  });

  // 2. Fetch all assessment results
  const { data: allResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["consolidated-assessment-results"],
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
              "course"
            ]),
            filters: JSON.stringify([["docstatus", "=", 1]]),
            limit_page_length: "15000"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    staleTime: 120_000,
  });

  const planMetaMap = useMemo(() => {
    const map = new Map<string, any>();
    allPlans.forEach((p: any) => map.set(p.name, p));
    return map;
  }, [allPlans]);

  // Aggregate student performance globally for the selected grade
  const studentLeaderboard = useMemo(() => {
    if (allPlans.length === 0 || allResults.length === 0) return [];

    const studentMap = new Map<string, {
      studentId: string;
      studentName: string;
      branch: string;
      grade: string;
      syllabus: string;
      totalObtained: number;
      totalMax: number;
      subjectScoresMap: Map<string, { score: number; maxScore: number }>;
    }>();

    allResults.forEach((r: any) => {
      const plan = planMetaMap.get(r.assessment_plan);
      if (!plan) return;

      const rawCourse = plan.course || r.course || "General";
      const subjectName = cleanSubjectName(rawCourse);
      const planGrade = extractGrade(plan.student_group) || extractGrade(rawCourse);
      const syllabus = extractSyllabus(plan.student_group) || extractSyllabus(rawCourse) || extractSyllabus(plan.assessment_name) || "State";
      
      // Filter strictly for selectedGrade (e.g. "10th")
      if (planGrade && selectedGrade && planGrade.toLowerCase() !== selectedGrade.toLowerCase()) return;

      const studentId = r.student || r.student_name;
      const studentName = r.student_name || r.student || "Student";
      const branch = cleanBranchName(plan.custom_branch) || "Main Branch";

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          studentId,
          studentName,
          branch,
          grade: planGrade,
          syllabus,
          totalObtained: 0,
          totalMax: 0,
          subjectScoresMap: new Map()
        });
      }

      const entry = studentMap.get(studentId)!;
      const obtd = Number(r.total_score) || 0;
      const max = Number(r.maximum_score) || 100;

      entry.totalObtained += obtd;
      entry.totalMax += max;

      const existingSub = entry.subjectScoresMap.get(subjectName) || { score: 0, maxScore: 0 };
      entry.subjectScoresMap.set(subjectName, {
        score: existingSub.score + obtd,
        maxScore: existingSub.maxScore + max
      });
    });

    const list = Array.from(studentMap.values()).map((s) => {
      const overallPct = s.totalMax > 0 ? (s.totalObtained / s.totalMax) * 100 : 0;
      const subjectScores = Array.from(s.subjectScoresMap.entries()).map(([subject, data]) => ({
        subject,
        score: data.score,
        maxScore: data.maxScore,
        pct: data.maxScore > 0 ? (data.score / data.maxScore) * 100 : 0
      }));

      const isFullMarks = s.totalObtained > 0 && s.totalObtained === s.totalMax;
      const isFullAPlus = subjectScores.length > 0 && subjectScores.every(sub => sub.pct >= 90);

      return {
        ...s,
        subjectScores,
        overallPct,
        isFullMarks,
        isFullAPlus,
      };
    });

    // Sort descending by overall percentage
    list.sort((a, b) => b.overallPct - a.overallPct);

    return list.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  }, [allPlans, allResults, planMetaMap, selectedGrade]);

  const allGradeSubjects = useMemo(() => {
    const set = new Set<string>();
    studentLeaderboard.forEach(s => {
      s.subjectScores.forEach(sub => {
        if (sub.subject) set.add(sub.subject);
      });
    });
    return Array.from(set).sort();
  }, [studentLeaderboard]);

  // Build PDF specification analysis categories
  const analysisReport = useMemo(() => {
    if (studentLeaderboard.length === 0) return [];

    const totalStudents = studentLeaderboard.length;

    const getSlice = (n: number) => studentLeaderboard.slice(0, Math.min(n, totalStudents));

    const topper = getSlice(1);
    const top3 = getSlice(3);
    const top5 = getSlice(5);
    const top10 = getSlice(10);
    const top15 = getSlice(15);

    const fullMarks = studentLeaderboard.filter(s => s.isFullMarks);
    const fullAPlus = studentLeaderboard.filter(s => s.isFullAPlus);

    const above90 = studentLeaderboard.filter(s => s.overallPct >= 90);
    const above85 = studentLeaderboard.filter(s => s.overallPct >= 85);
    const above80 = studentLeaderboard.filter(s => s.overallPct >= 80);
    const above75 = studentLeaderboard.filter(s => s.overallPct >= 75);
    const above70 = studentLeaderboard.filter(s => s.overallPct >= 70);
    const above60 = studentLeaderboard.filter(s => s.overallPct >= 60);
    const above50 = studentLeaderboard.filter(s => s.overallPct >= 50);
    const above40 = studentLeaderboard.filter(s => s.overallPct >= 40);

    return [
      { label: "Smart Up Topper", list: topper, highlight: true },
      { label: "Top 3", list: top3 },
      { label: "Top 5", list: top5 },
      { label: "Top 10", list: top10 },
      { label: "Top 15", list: top15 },
      { label: "Full Mark Achievers", list: fullMarks, badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" },
      { label: "Full A+ Achievers", list: fullAPlus, badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300" },
      { label: "90% & Above", list: above90 },
      { label: "85% & Above", list: above85 },
      { label: "80% & Above", list: above80 },
      { label: "75% & Above", list: above75 },
      { label: "70% & Above", list: above70 },
      { label: "60% & Above", list: above60 },
      { label: "50% & Above", list: above50 },
      { label: "40% & Above", list: above40 },
    ];
  }, [studentLeaderboard]);

  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery) return studentLeaderboard;
    const q = searchQuery.toLowerCase();
    return studentLeaderboard.filter(s => 
      s.studentName.toLowerCase().includes(q) || s.branch.toLowerCase().includes(q)
    );
  }, [studentLeaderboard, searchQuery]);

  const isLoading = plansLoading || resultsLoading;

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-400" />
            <h1 className="text-2xl font-bold">SmartUp Consolidated Report</h1>
          </div>
          <p className="text-sm text-purple-200">
            Organization-wide student ranking analysis combining all branches for {selectedGrade} Grade.
          </p>
        </div>

        {/* Grade Selection Tabs */}
        <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/10 self-start md:self-auto">
          {["8th", "9th", "10th", "11th", "12th"].map((grade) => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedGrade === grade
                  ? "bg-amber-400 text-slate-950 shadow-md scale-105"
                  : "text-purple-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              {grade}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center items-center">
          <GifLoader size="md" />
        </div>
      ) : (
        <>
          {/* Summary Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-purple-500 shadow-sm">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-secondary font-medium">Students Evaluated</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">{studentLeaderboard.length}</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-purple-600 dark:text-purple-400">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="border-l-4 border-l-amber-500 shadow-sm">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-secondary font-medium">SmartUp Topper ({selectedGrade})</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1 truncate max-w-[150px]">
                    {studentLeaderboard[0]?.studentName || "N/A"}
                  </p>
                  {studentLeaderboard[0] && (
                    <span className="text-[11px] text-amber-600 font-semibold">
                      {studentLeaderboard[0].overallPct.toFixed(1)}% ({studentLeaderboard[0].branch})
                    </span>
                  )}
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
                  <Trophy className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="border-l-4 border-l-emerald-500 shadow-sm">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-secondary font-medium">Full A+ Achievers</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">
                    {studentLeaderboard.filter(s => s.isFullAPlus).length}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="border-l-4 border-l-indigo-500 shadow-sm">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-secondary font-medium">90% & Above</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">
                    {studentLeaderboard.filter(s => s.overallPct >= 90).length}
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <Award className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* PDF Specification Analysis Report Table */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 py-4">
              <CardTitle className="text-base font-bold text-text-primary flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Consolidated Performance Analysis ({selectedGrade} Grade)
                </span>
                <Badge variant="outline" className="text-xs">PDF Standard Format</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">
                      <th className="px-6 py-3.5 w-64 border-r border-slate-200 dark:border-slate-800">Analysis</th>
                      <th className="px-4 py-3.5 w-24 text-center border-r border-slate-200 dark:border-slate-800">Count</th>
                      <th className="px-6 py-3.5">Names</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {analysisReport.map((row) => (
                      <tr 
                        key={row.label} 
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          row.highlight ? "bg-amber-50/40 dark:bg-amber-950/20 font-semibold" : ""
                        }`}
                      >
                        <td className="px-6 py-3.5 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            {row.highlight ? (
                              <Trophy className="w-4 h-4 text-amber-500" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-purple-500 opacity-60" />
                            )}
                            {row.label}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs ${
                            row.list.length > 0 ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                          }`}>
                            {row.list.length}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          {row.list.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">No students match this criteria</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {row.list.map((student) => (
                                <span
                                  key={student.studentId}
                                  className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-lg text-xs font-medium shadow-2xs"
                                >
                                  <span>{student.studentName}</span>
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 font-bold">
                                    {student.branch}
                                  </span>
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                                    ({student.overallPct.toFixed(1)}%)
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Full Organization Student Leaderboard */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-base font-bold text-text-primary flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Full Student Leaderboard ({selectedGrade} Grade)
                </CardTitle>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search student or branch..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-text-secondary bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-center w-12 whitespace-nowrap font-bold">Rank</th>
                      <th className="px-6 py-3 whitespace-nowrap font-bold">Student</th>
                      <th className="px-4 py-3 whitespace-nowrap font-bold">Branch</th>
                      {allGradeSubjects.map((sub) => (
                        <React.Fragment key={sub}>
                          <th className="px-3 py-3 text-center whitespace-nowrap bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-300 font-bold border-l border-slate-200/60 dark:border-slate-800/60">
                            {sub}
                          </th>
                          <th className="px-3 py-3 text-center whitespace-nowrap bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-300 font-bold border-r border-slate-200/60 dark:border-slate-800/60">
                            Grade
                          </th>
                        </React.Fragment>
                      ))}
                      <th className="px-4 py-3 text-center whitespace-nowrap font-bold">Total</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap font-bold">%</th>
                      <th className="px-6 py-3 text-center whitespace-nowrap font-bold">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {filteredLeaderboard.map((student) => {
                      const isPassed = student.subjectScores.length > 0 && student.subjectScores.every(s => s.pct >= 33);
                      return (
                        <tr key={student.studentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs">
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              student.rank === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500' :
                              student.rank === 2 ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
                              student.rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-500' :
                              'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {student.rank}
                            </span>
                          </td>
                          <td className="px-6 py-3 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {student.studentName}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                {student.branch}
                              </span>
                              {student.syllabus && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  student.syllabus === 'CBSE' 
                                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300' 
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                }`}>
                                  {student.syllabus}
                                </span>
                              )}
                            </div>
                          </td>
                          {allGradeSubjects.map((sub) => {
                            const subScore = student.subjectScores.find(s => s.subject === sub);
                            const grade = subScore ? getGradeCode(subScore.pct) : "-";
                            return (
                              <React.Fragment key={sub}>
                                <td className="px-3 py-3 text-center border-l border-slate-100 dark:border-slate-800/50 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                                  {subScore ? `${subScore.score}/${subScore.maxScore}` : "—"}
                                </td>
                                <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-800/50 whitespace-nowrap font-bold">
                                  {subScore ? (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                      grade === 'A+' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                      grade === 'A' ? 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300' :
                                      grade.startsWith('B') ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                                      grade.startsWith('C') ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                                      grade === 'D+' ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300' :
                                      'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                    }`}>
                                      {grade}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-normal">—</span>
                                  )}
                                </td>
                              </React.Fragment>
                            );
                          })}
                          <td className="px-4 py-3 text-center font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {student.totalObtained} / {student.totalMax}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                            {student.overallPct.toFixed(1)}%
                          </td>
                          <td className="px-6 py-3 text-center whitespace-nowrap">
                            {isPassed ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                Pass
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                Needs Imp.
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredLeaderboard.length === 0 && (
                      <tr>
                        <td colSpan={6 + allGradeSubjects.length * 2} className="px-6 py-12 text-center text-slate-500">
                          No student records found for {selectedGrade} Grade.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
