"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GifLoader } from "@/components/ui/GifLoader";
import { Trophy, ArrowLeft, Sparkles, School, Search } from "lucide-react";

const cleanBranchName = (name: string): string => {
  if (!name) return "Main Branch";
  return name.replace(/^Smart\s+Up\s+/i, "").trim();
};

export default function SmartUpRankingPage() {
  const [selectedCwc, setSelectedCwc] = useState("CWC 1");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<"all" | "Advanced" | "Basic">("all");

  const cwcOptions = ["CWC 1", "CWC 2", "CWC 3"];

  // Fetch Program Enrollments to map student -> custom_plan
  const { data: programEnrollments = [] } = useQuery({
    queryKey: ["all-program-enrollments-plan"],
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
            limit_page_length: "15000"
          }
        })
      }).then(r => r.json());
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

  // 1. Fetch all assessment plans
  const { data: allPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["cwc-assessment-plans"],
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
              "custom_branch"
            ]),
            filters: JSON.stringify([["docstatus", "=", 1]]),
            limit_page_length: "3000"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  // 2. Fetch all assessment results
  const { data: allResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["cwc-assessment-results"],
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
    staleTime: 60_000,
  });

  const planMetaMap = useMemo(() => {
    const map = new Map<string, any>();
    allPlans.forEach((p: any) => map.set(p.name, p));
    return map;
  }, [allPlans]);

  // Aggregate and rank all students across all branches for selected CWC exam
  const leaderboardData = useMemo(() => {
    if (allPlans.length === 0 || allResults.length === 0) return [];

    const searchKey = selectedCwc.toLowerCase();

    // Map student ID -> score aggregation
    const studentMap = new Map<string, {
      studentId: string;
      studentName: string;
      branch: string;
      studentGroup: string;
      customPlan?: string;
      totalObtained: number;
      totalMax: number;
      subjects: any[];
      standard: string;
    }>();

    allResults.forEach((r: any) => {
      const plan = planMetaMap.get(r.assessment_plan);
      if (!plan) return;

      const ag = (plan.assessment_group || "").toLowerCase();
      const an = (plan.assessment_name || "").toLowerCase();

      const match = selectedCwc.toLowerCase().match(/cwc\s*(?:exam\s*)?(\d+)/);
      const cwcNum = match ? match[1] : "";
      
      let matchesCwc = false;
      if (cwcNum) {
        // Strict match: must contain CWC/cwc and the specific exam number (e.g. CWC 1)
        const targetRegex = new RegExp(`cwc\\s*(?:exam\\s*)?${cwcNum}\\b`, "i");
        matchesCwc = targetRegex.test(ag) || targetRegex.test(an);
      } else {
        matchesCwc = ag.includes("cwc") || an.includes("cwc");
      }

      if (!matchesCwc) return;

      const studentId = r.student || r.student_name;
      const studentName = r.student_name || r.student || "Student";
      const branch = cleanBranchName(plan.custom_branch);
      const studentGroup = plan.student_group || "";
      const courseName = plan.course ? plan.course.replace(/-.*/, "") : "Subject";

      // Parse grade standard (e.g., "8th", "9th", "10th", "11th", "12th") from studentGroup like "Edappally-10th CBSE-A"
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
          standard
        });
      }

      const entry = studentMap.get(studentId)!;
      entry.totalObtained += Number(r.total_score) || 0;
      entry.totalMax += Number(r.maximum_score) || 100;
      
      if (!entry.hasOwnProperty("subjects")) {
        (entry as any).subjects = [];
      }
      (entry as any).subjects.push({
        course: courseName,
        score: Number(r.total_score) || 0,
        max: Number(r.maximum_score) || 100
      });
    });

    const list = Array.from(studentMap.values())
      .map(s => {
        const standardSubjectCount = 4;
        const attendedCount = s.subjects.length;
        
        // 1. Pure Academic Percentage (average percentage of attended exams)
        const percentagesList = s.subjects.map((sub: any) => (sub.score / sub.max) * 100);
        const avgPercentage = percentagesList.reduce((sum: number, p: number) => sum + p, 0) / (attendedCount || 1);
        
        // 2. Exam Completion Score (Capped at 100%)
        const completionScore = Math.min(100, (attendedCount / standardSubjectCount) * 100);
        
        // 3. Subject Consistency Score (100 - score range width)
        let consistencyScore = 100;
        if (attendedCount > 1) {
          const maxPct = Math.max(...percentagesList);
          const minPct = Math.min(...percentagesList);
          consistencyScore = Math.max(0, 100 - (maxPct - minPct));
        } else if (attendedCount === 1) {
          // Penalty for sitting only 1 subject (range cannot be calculated)
          consistencyScore = 50;
        }
        
        // Final Ranking Score calculation
        const rankingScore = (avgPercentage * 0.60) + (completionScore * 0.25) + (consistencyScore * 0.15);
        
        let grade = "F";
        if (rankingScore >= 90) grade = "A+";
        else if (rankingScore >= 80) grade = "A";
        else if (rankingScore >= 70) grade = "B+";
        else if (rankingScore >= 60) grade = "B";
        else if (rankingScore >= 50) grade = "C+";
        else if (rankingScore >= 40) grade = "C";

        return {
          ...s,
          percentage: Number(rankingScore.toFixed(1)), // Represents the final combined Weighted Ranking Score
          rawPercentage: Number(avgPercentage.toFixed(1)),
          grade,
          passed: avgPercentage >= 40,
          attendedCount
        };
      });

    // Sort strictly by final weighted Ranking Score DESC
    list.sort((a, b) => b.percentage - a.percentage || b.totalObtained - a.totalObtained);

    // Assign dense rankings based on weighted ranking score
    let currentRank = 1;
    return list.map((item, idx, array) => {
      if (idx > 0) {
        const prev = array[idx - 1];
        if (item.percentage < prev.percentage) {
          currentRank = idx + 1;
        }
      }
      return { ...item, rank: currentRank };
    });
  }, [allPlans, allResults, planMetaMap, selectedCwc]);

  // Unique branches for dropdown filter
  const branchOptions = useMemo(() => {
    const set = new Set<string>();
    leaderboardData.forEach(item => set.add(item.branch));
    return Array.from(set).sort();
  }, [leaderboardData]);

  // Unique grade standards for dropdown filter (e.g. 10th CBSE, 9th State)
  const classOptions = useMemo(() => {
    const set = new Set<string>();
    leaderboardData.forEach(item => {
      if (item.standard && item.standard !== "Other") {
        set.add(item.standard);
      }
    });
    return Array.from(set).sort((a, b) => {
      // Sort standard names cleanly (extracting digit prefix first)
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
  }, [leaderboardData]);

  // Filtered leaderboard
  const filteredLeaderboard = useMemo(() => {
    return leaderboardData.filter(item => {
      const matchesSearch = item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.branch.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBranch = selectedBranchFilter === "all" || item.branch === selectedBranchFilter;
      const matchesClass = selectedClassFilter === "all" || item.standard === selectedClassFilter;
      const planName = (item.customPlan || "").toLowerCase();
      const matchesPlan = selectedPlanFilter === "all"
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
            SmartUp Overall Ranking ({selectedCwc})
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Institute-wide overall student leaderboard across all SmartUp branches for {selectedCwc}.
          </p>
          {/* Ranking Calculation Info / Hint */}
          <div className="mt-3 inline-flex items-center gap-2 p-2 px-3 bg-purple-500/10 text-purple-700 rounded-lg text-xs font-semibold border border-purple-500/20 shadow-sm animate-pulse">
            <span className="flex h-2 w-2 rounded-full bg-purple-600 shrink-0" />
            <span>
              <strong>Ranking Formula:</strong> (Avg Academic % × 0.60) + (Exam Completion % × 0.25) + (Subject Consistency % × 0.15).
            </span>
          </div>
        </div>

        <Link href="/dashboard/curriculum-dept/cwc-corner">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary bg-surface border border-border/60 hover:border-border transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to CWC Corner
          </button>
        </Link>
      </div>

      {/* Control Bar: CWC Select Pills + Search + Branch Filter */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* CWC Exam Selector Pills */}
        <div className="flex items-center gap-2 bg-surface p-1.5 rounded-2xl border border-border/60 shadow-sm">
          {cwcOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setSelectedCwc(opt)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedCwc === opt
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
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
            <option value="all">All Classes</option>
            {classOptions.map(cOpt => (
              <option key={cOpt} value={cOpt}>{cOpt}</option>
            ))}
          </select>

          {/* Branch Filter */}
          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="h-10 px-3 text-xs bg-surface border border-border-input rounded-xl font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-purple-600 cursor-pointer"
          >
            <option value="all">All Branches</option>
            {branchOptions.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search student or branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-surface border border-border-input rounded-xl text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-purple-600"
            />
          </div>
        </div>
      </div>

      {pageLoading ? (
        <div className="py-32 flex justify-center items-center">
          <GifLoader size="lg" />
        </div>
      ) : filteredLeaderboard.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-600 w-fit mx-auto mb-3">
            <Sparkles className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-text-primary">No CWC Ranking Data Found</h3>
          <p className="text-sm text-text-secondary mt-1">
            No assessment results submitted yet for {selectedCwc}.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Top 3 Podium Cards */}
          {filteredLeaderboard.length >= 3 && selectedBranchFilter === "all" && searchQuery === "" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Rank 2 */}
              <Card className="border border-slate-200 dark:border-white/10 p-5 bg-gradient-to-b from-slate-50 to-surface dark:from-slate-900/40 relative overflow-hidden shadow-sm">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="bg-slate-200 text-slate-700 border-slate-300 font-extrabold px-2.5 py-0.5">
                    🥈 Rank #2
                  </Badge>
                  <span className="text-xs font-semibold text-text-tertiary">{filteredLeaderboard[1].branch}</span>
                </div>
                <h4 className="text-base font-bold text-text-primary mt-3 truncate">{filteredLeaderboard[1].studentName}</h4>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/40 text-xs">
                  <span className="font-mono text-text-secondary">{filteredLeaderboard[1].totalObtained} / {filteredLeaderboard[1].totalMax} Marks</span>
                  <span className="font-black text-purple-600">{filteredLeaderboard[1].percentage}%</span>
                </div>
              </Card>

              {/* Rank 1 */}
              <Card className="border-2 border-amber-500/50 p-6 bg-gradient-to-b from-amber-500/10 via-surface to-surface relative overflow-hidden shadow-lg transform -translate-y-1">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="bg-amber-500 text-white border-amber-500 font-extrabold px-3 py-1 text-xs">
                    👑 Rank #1 (SmartUp Topper)
                  </Badge>
                  <span className="text-xs font-bold text-amber-600">{filteredLeaderboard[0].branch}</span>
                </div>
                <h4 className="text-lg font-extrabold text-text-primary mt-3 truncate">{filteredLeaderboard[0].studentName}</h4>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-amber-500/20 text-xs">
                  <span className="font-mono text-text-secondary font-semibold">{filteredLeaderboard[0].totalObtained} / {filteredLeaderboard[0].totalMax} Marks</span>
                  <span className="text-base font-black text-amber-600">{filteredLeaderboard[0].percentage}%</span>
                </div>
              </Card>

              {/* Rank 3 */}
              <Card className="border border-amber-600/30 p-5 bg-gradient-to-b from-amber-500/5 to-surface relative overflow-hidden shadow-sm">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="bg-amber-700/10 text-amber-700 border-amber-600/30 font-extrabold px-2.5 py-0.5">
                    🥉 Rank #3
                  </Badge>
                  <span className="text-xs font-semibold text-text-tertiary">{filteredLeaderboard[2].branch}</span>
                </div>
                <h4 className="text-base font-bold text-text-primary mt-3 truncate">{filteredLeaderboard[2].studentName}</h4>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/40 text-xs">
                  <span className="font-mono text-text-secondary">{filteredLeaderboard[2].totalObtained} / {filteredLeaderboard[2].totalMax} Marks</span>
                  <span className="font-black text-purple-600">{filteredLeaderboard[2].percentage}%</span>
                </div>
              </Card>
            </div>
          )}

          {/* Full Leaderboard Table */}
          <Card className="border border-border/60 overflow-hidden bg-surface shadow-sm">
            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-border/60 flex justify-between items-center">
              <span className="text-xs font-bold text-text-primary flex items-center gap-2">
                <Trophy className="h-4 w-4 text-purple-600" />
                All Branch Student Leaderboard ({filteredLeaderboard.length} Students)
              </span>
              <Badge variant="outline" className="border-purple-500/30 text-purple-600 text-xs font-semibold">
                {selectedCwc}
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-border/60 bg-slate-100/40 dark:bg-white/[0.02] text-[10px] uppercase font-extrabold text-text-tertiary tracking-wider">
                    <th className="px-6 py-3.5 w-16 text-center">Rank</th>
                    <th className="px-6 py-3.5">Student Name</th>
                    <th className="px-6 py-3.5">Branch</th>
                    <th className="px-6 py-3.5 text-center">Total Marks</th>
                    <th className="px-6 py-3.5 text-center font-black">%</th>
                    <th className="px-6 py-3.5 text-center font-black">Grade</th>
                    <th className="px-6 py-3.5 text-center font-black">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredLeaderboard.map((st) => (
                    <tr key={st.studentId} className="hover:bg-purple-500/5 transition-colors">
                      <td className="px-6 py-3 text-center">
                        {st.rank === 1 ? (
                          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-500 text-white font-extrabold text-xs shadow-sm">
                            1
                          </span>
                        ) : st.rank === 2 ? (
                          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-slate-300 text-slate-800 font-extrabold text-xs shadow-sm">
                            2
                          </span>
                        ) : st.rank === 3 ? (
                          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-700/20 text-amber-800 font-extrabold text-xs">
                            3
                          </span>
                        ) : (
                          <span className="font-bold text-text-secondary">#{st.rank}</span>
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
                        <span className="block text-[10px] font-normal text-text-tertiary font-mono">
                          {st.studentId}
                        </span>
                        {/* Subject Marks Breakdown */}
                        {st.subjects && st.subjects.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5 pt-1.5 border-t border-border/30">
                            {st.subjects.map((sub: any, sIdx: number) => {
                              // Extract only the subject name (e.g. Physics, Chemistry) out of "9th Physics"
                              const displayName = sub.course.replace(/^\d+(?:st|nd|rd|th)?\s+/i, "");
                              return (
                                <span key={sIdx} className="inline-flex items-center text-[9px] font-semibold text-text-secondary bg-purple-500/5 px-2 py-0.5 rounded-full border border-purple-500/10">
                                  <span className="text-purple-600 mr-1">{displayName}:</span>
                                  <span className="font-mono text-text-primary">{sub.score}/{sub.max}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant="outline" className="border-border/60 text-text-secondary text-[11px] font-semibold bg-surface">
                          <School className="h-3 w-3 mr-1 text-primary/70" />
                          {st.branch}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-center font-mono font-semibold text-text-primary">
                        {st.totalObtained} / {st.totalMax}
                      </td>
                      <td className="px-6 py-3 text-center font-extrabold text-purple-600">
                        {st.percentage}%
                      </td>
                      <td className="px-6 py-3 text-center font-black">
                        <Badge 
                          className={
                            st.grade === "A+" ? "bg-emerald-500 text-white" :
                            st.grade === "A" ? "bg-emerald-600 text-white" :
                            st.grade.startsWith("B") ? "bg-blue-600 text-white" :
                            "bg-slate-500 text-white"
                          }
                        >
                          {st.grade}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-center">
                        {st.passed ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                            Passed
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/30">
                            Failed
                          </Badge>
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
  );
}
