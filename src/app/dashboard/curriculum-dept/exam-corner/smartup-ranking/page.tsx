"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GifLoader } from "@/components/ui/GifLoader";
import { Trophy, ArrowLeft, Sparkles, School, Search, Calendar } from "lucide-react";
import { getAssessmentGroups } from "@/lib/api/assessment";

const cleanBranchName = (name: string): string => {
  if (!name) return "Main Branch";
  return name.replace(/^Smart\s+Up\s+/i, "").trim();
};

export default function ExamSmartUpRankingPage() {
  const [selectedExam, setSelectedExam] = useState("Quarterly Exam");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<"all" | "Advanced" | "Basic">("all");

  // 1. Fetch available assessment groups
  const { data: assessmentGroups = [] } = useQuery({
    queryKey: ["all-assessment-groups-smartup"],
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

  // 2. Fetch Program Enrollments to map student -> custom_plan
  const { data: programEnrollments = [] } = useQuery({
    queryKey: ["all-program-enrollments-exam-smartup"],
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

  // 3. Fetch all assessment plans
  const { data: allPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["exam-all-plans-smartup"],
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
              "assessment_group",
              "course",
              "maximum_assessment_score",
              "custom_branch",
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

  // 4. Fetch all assessment results
  const { data: allResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["exam-all-results-smartup"],
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

  const planMetaMap = useMemo(() => {
    const map = new Map<string, any>();
    allPlans.forEach((p: any) => map.set(p.name, p));
    return map;
  }, [allPlans]);

  const matchesSelectedExam = (plan: any) => {
    const ag = (plan.assessment_group || "").toLowerCase();
    const an = (plan.assessment_name || "").toLowerCase();
    const sel = selectedExam.toLowerCase();
    return ag === sel || an.includes(sel) || ag.includes(sel);
  };

  // Aggregate and rank all students across all branches for selected Exam
  const leaderboardData = useMemo(() => {
    if (allPlans.length === 0 || allResults.length === 0) return [];

    const studentMap = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        branch: string;
        studentGroup: string;
        customPlan?: string;
        totalObtained: number;
        totalMax: number;
        subjects: any[];
        standard: string;
      }
    >();

    allResults.forEach((r: any) => {
      const plan = planMetaMap.get(r.assessment_plan);
      if (!plan) return;

      if (!matchesSelectedExam(plan)) return;

      const studentId = r.student || r.student_name;
      const studentName = r.student_name || r.student || "Student";
      const branch = cleanBranchName(plan.custom_branch);
      const studentGroup = plan.student_group || "";
      const courseName = plan.course ? plan.course.replace(/-.*/, "") : "Subject";

      let standard = "Other";
      const stdMatch = studentGroup.match(/\b(8th|9th|10th|11th|12th|8|9|10|11|12)\b/i);
      if (stdMatch) {
        let val = stdMatch[1].toLowerCase();
        if (val === "8") val = "8th";
        if (val === "9") val = "9th";
        if (val === "10") val = "10th";
        if (val === "11") val = "11th";
        if (val === "12") val = "12th";
        standard = val;
      }

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          studentId,
          studentName,
          branch,
          studentGroup,
          customPlan: studentPlanMap.get(r.student) || "",
          totalObtained: 0,
          totalMax: 0,
          subjects: [] as any[],
          standard,
        });
      }

      const entry = studentMap.get(studentId)!;
      entry.totalObtained += Number(r.total_score) || 0;
      entry.totalMax += Number(r.maximum_score) || 100;

      entry.subjects.push({
        course: courseName,
        score: Number(r.total_score) || 0,
        max: Number(r.maximum_score) || 100,
      });
    });

    const list = Array.from(studentMap.values()).map((s) => {
      const standardSubjectCount = 4;
      const attendedCount = s.subjects.length;

      // 1. Pure Academic Percentage
      const percentagesList = s.subjects.map((sub: any) => (sub.score / sub.max) * 100);
      const avgPercentage = percentagesList.reduce((sum: number, p: number) => sum + p, 0) / (attendedCount || 1);

      // 2. Exam Completion Score (Capped at 100%)
      const completionScore = Math.min(100, (attendedCount / standardSubjectCount) * 100);

      // 3. Subject Consistency Score
      let consistencyScore = 100;
      if (attendedCount > 1) {
        const maxPct = Math.max(...percentagesList);
        const minPct = Math.min(...percentagesList);
        consistencyScore = Math.max(0, 100 - (maxPct - minPct));
      } else if (attendedCount === 1) {
        consistencyScore = 50;
      }

      const rankingScore = avgPercentage * 0.6 + completionScore * 0.25 + consistencyScore * 0.15;

      let grade = "F";
      if (rankingScore >= 90) grade = "A+";
      else if (rankingScore >= 80) grade = "A";
      else if (rankingScore >= 70) grade = "B+";
      else if (rankingScore >= 60) grade = "B";
      else if (rankingScore >= 50) grade = "C+";
      else if (rankingScore >= 40) grade = "C";

      return {
        ...s,
        percentage: Number(rankingScore.toFixed(1)),
        rawPercentage: Number(avgPercentage.toFixed(1)),
        grade,
        passed: avgPercentage >= 40,
        attendedCount,
      };
    });

    list.sort((a, b) => b.percentage - a.percentage || b.totalObtained - a.totalObtained);

    let currentRank = 1;
    return list.map((item, index) => {
      if (index > 0 && item.percentage < list[index - 1].percentage) {
        currentRank = index + 1;
      }
      return {
        ...item,
        rank: currentRank,
      };
    });
  }, [allPlans, allResults, planMetaMap, selectedExam, studentPlanMap]);

  // Extract distinct branches & standards for filters
  const distinctBranches = useMemo(() => {
    const set = new Set<string>();
    leaderboardData.forEach((s) => {
      if (s.branch) set.add(s.branch);
    });
    return Array.from(set).sort();
  }, [leaderboardData]);

  const distinctStandards = useMemo(() => {
    const set = new Set<string>();
    leaderboardData.forEach((s) => {
      if (s.standard && s.standard !== "Other") set.add(s.standard);
    });
    return Array.from(set).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
  }, [leaderboardData]);

  const filteredStudents = useMemo(() => {
    return leaderboardData.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.branch.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBranch = selectedBranchFilter === "all" || item.branch === selectedBranchFilter;
      const matchesClass = selectedClassFilter === "all" || item.standard === selectedClassFilter;
      const planName = (item.customPlan || "").toLowerCase();
      const matchesPlan =
        selectedPlanFilter === "all"
          ? true
          : selectedPlanFilter === "Advanced"
          ? planName.includes("advanced")
          : planName.includes("basic") || !planName;
      return matchesSearch && matchesBranch && matchesClass && matchesPlan;
    });
  }, [leaderboardData, searchQuery, selectedBranchFilter, selectedClassFilter, selectedPlanFilter]);

  const pageLoading = plansLoading || resultsLoading;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <BreadcrumbNav />
          <h1 className="text-2xl font-bold text-text-primary mt-1 flex items-center gap-2.5">
            <Trophy className="h-7 w-7 text-purple-600" />
            SmartUp Overall Ranking ({selectedExam})
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Institute-wide overall student leaderboard across all SmartUp branches for {selectedExam}.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 p-2 px-3 bg-purple-500/10 text-purple-700 rounded-lg text-xs font-semibold border border-purple-500/20 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-purple-600 shrink-0" />
            <span>
              <strong>Ranking Formula:</strong> (Avg Academic % × 0.60) + (Exam Completion % × 0.25) + (Subject Consistency % × 0.15).
            </span>
          </div>
        </div>

        <Link href="/dashboard/curriculum-dept/exam-corner">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary bg-surface border border-border/60 hover:border-border transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Exam Corner
          </button>
        </Link>
      </div>

      {/* Control Bar: Dynamic Exam Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 bg-surface p-2.5 rounded-2xl border border-border/60 shadow-sm">
          <div className="flex items-center gap-2 px-2 text-xs font-semibold text-text-secondary">
            <Calendar className="h-4 w-4 text-purple-600" />
            <span>Choose Exam:</span>
          </div>
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            className="h-9 px-3 text-xs bg-surface border border-border-input rounded-xl font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
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
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Plan Filter */}
          <select
            value={selectedPlanFilter}
            onChange={(e) => setSelectedPlanFilter(e.target.value as any)}
            className="h-10 px-3 text-xs bg-surface border border-border-input rounded-xl font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-purple-600 cursor-pointer"
          >
            <option value="all">All Plans</option>
            <option value="Advanced">⚡ Advanced Students</option>
            <option value="Basic">📘 Basic Students</option>
          </select>

          {/* Class Filter */}
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="h-10 px-3 text-xs bg-surface border border-border-input rounded-xl font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-purple-600 cursor-pointer"
          >
            <option value="all">All Grades</option>
            {distinctStandards.map((std) => (
              <option key={std} value={std}>
                {std} Grade
              </option>
            ))}
          </select>

          {/* Branch Filter */}
          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="h-10 px-3 text-xs bg-surface border border-border-input rounded-xl font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-purple-600 cursor-pointer"
          >
            <option value="all">All Branches</option>
            {distinctBranches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative flex-1 md:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search student or branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-xs bg-surface border border-border-input rounded-xl text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-purple-600"
            />
          </div>
        </div>
      </div>

      {pageLoading ? (
        <div className="py-32 flex justify-center items-center">
          <GifLoader size="lg" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="py-24 text-center text-text-tertiary bg-surface rounded-2xl border border-border/60">
          No student rankings found for {selectedExam}.
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-border/60 text-text-secondary">
                <tr>
                  <th className="p-3.5 pl-6 font-bold w-14">Rank</th>
                  <th className="p-3.5 font-bold">Student</th>
                  <th className="p-3.5 font-bold">Branch</th>
                  <th className="p-3.5 font-bold text-center">Batch / Class</th>
                  <th className="p-3.5 font-bold text-center">Exams Attended</th>
                  <th className="p-3.5 font-bold text-center">Marks Scored</th>
                  <th className="p-3.5 font-bold text-center">Academic %</th>
                  <th className="p-3.5 font-bold text-center">Ranking Score</th>
                  <th className="p-3.5 font-bold text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredStudents.map((st) => (
                  <tr key={st.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 pl-6 font-bold text-text-primary">
                      {st.rank === 1 ? (
                        <span className="p-1 px-2.5 rounded-md bg-amber-500/10 text-amber-600 font-black">#1</span>
                      ) : st.rank <= 3 ? (
                        <span className="p-1 px-2 rounded-md bg-purple-500/10 text-purple-600 font-black">#{st.rank}</span>
                      ) : (
                        `#${st.rank}`
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-text-primary">{st.studentName}</div>
                      <div className="text-[10px] text-text-tertiary">{st.studentId}</div>
                    </td>
                    <td className="p-3.5 font-medium text-text-secondary flex items-center gap-1.5">
                      <School className="h-3.5 w-3.5 text-text-tertiary" />
                      {st.branch}
                    </td>
                    <td className="p-3.5 text-center text-text-secondary">
                      <Badge variant="outline" className="text-[10px] border-border/60">
                        {st.studentGroup}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-center font-semibold text-text-primary">
                      {st.attendedCount} subjects
                    </td>
                    <td className="p-3.5 text-center font-bold text-text-primary">
                      {st.totalObtained} <span className="text-[10px] text-text-tertiary font-normal">/ {st.totalMax}</span>
                    </td>
                    <td className="p-3.5 text-center font-semibold text-text-secondary">
                      {st.rawPercentage}%
                    </td>
                    <td className="p-3.5 text-center font-black text-purple-600 text-sm">
                      {st.percentage}%
                    </td>
                    <td className="p-3.5 text-center font-bold">
                      <Badge className="bg-purple-500/10 text-purple-700 border border-purple-500/20 text-xs">
                        {st.grade}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
