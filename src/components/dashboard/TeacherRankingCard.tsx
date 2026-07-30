"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Award, BookOpen, MapPin } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { GifLoader } from "@/components/ui/GifLoader";

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

const getEquivalentSubjects = (baseSubject: string): string[] => {
  const normalized = baseSubject.toLowerCase().replace(/\s+/g, "");
  if (normalized === "language1") {
    return [baseSubject, "Malayalam", "Arabic", "Sanskrit", "Urdu"];
  }
  if (normalized === "language2") {
    return [baseSubject, "Hindi", "French", "Malayalam"];
  }
  if (normalized === "malayalam" || normalized === "arabic" || normalized === "sanskrit" || normalized === "urdu") {
    return [baseSubject, "Language1", "Language 1", "Language2", "Language 2"];
  }
  if (normalized === "hindi" || normalized === "french") {
    return [baseSubject, "Language2", "Language 2"];
  }
  return [baseSubject];
};

const matchCourse = (courseA: string, courseB: string): boolean => {
  if (!courseA || !courseB) return false;
  const gradeA = courseA.match(/^\d+(st|nd|rd|th)?/i)?.[0]?.toLowerCase() || "a";
  const gradeB = courseB.match(/^\d+(st|nd|rd|th)?/i)?.[0]?.toLowerCase() || "b";
  if (gradeA !== gradeB) return false;

  const baseA = getBaseSubject(courseA);
  const baseB = getBaseSubject(courseB);
  const equivalents = getEquivalentSubjects(baseA);
  return equivalents.some(eq => eq.toLowerCase().replace(/\s+/g, "") === baseB.toLowerCase().replace(/\s+/g, ""));
};

interface TeacherRankingCardProps {
  instructorId: string;
}

export function TeacherRankingCard({ instructorId }: TeacherRankingCardProps) {
  // 1. Fetch all assessment plans
  const { data: allPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["assessment-plans-teacher-card"],
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
              "custom_branch",
              "examiner"
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
    queryKey: ["assessment-results-teacher-card"],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Assessment Result",
          method: "GET",
          payload: {
            fields: JSON.stringify(["assessment_plan", "total_score", "maximum_score", "course"]),
            filters: JSON.stringify([["docstatus", "=", 1]]),
            limit_page_length: "10000"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  // 3. Fetch all instructors
  const { data: allInstructors = [], isLoading: instructorsLoading } = useQuery({
    queryKey: ["all-instructors-teacher-card"],
    queryFn: async () => {
      try {
        const instrRes = await fetch("/api/curriculum-dept/admin-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: "resource/Instructor",
            method: "GET",
            payload: {
              fields: JSON.stringify(["name", "instructor_name", "employee", "custom_company"]),
              limit_page_length: "1000"
            }
          })
        }).then(r => r.json());
        
        const instList: any[] = instrRes.data ?? [];
        if (!instList.length) return [];

        const fullDocs = [];
        const chunkSize = 10;
        for (let i = 0; i < instList.length; i += chunkSize) {
          const chunk = instList.slice(i, i + chunkSize);
          const chunkDocs = await Promise.all(
            chunk.map(async (ins) => {
              try {
                const docRes = await fetch("/api/curriculum-dept/admin-proxy", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    path: `resource/Instructor/${encodeURIComponent(ins.name)}`,
                    method: "GET",
                    payload: {}
                  })
                }).then(r => r.json());
                return { ...ins, ...docRes.data, instructor_log: docRes.data?.instructor_log ?? [] };
              } catch (e) {
                return { ...ins, instructor_log: [] };
              }
            })
          );
          fullDocs.push(...chunkDocs);
        }

        return fullDocs.map(ins => {
          const subjects = [...new Set(
            ins.instructor_log
              .filter((entry: any) => !!entry.course)
              .map((entry: any) => entry.course as string)
          )];
          const teachingBranches = [...new Set(
            ins.instructor_log
              .filter((entry: any) => !!(entry.branch || entry.custom_branch))
              .map((entry: any) => cleanBranchName(entry.branch || entry.custom_branch))
          )];
          return { ...ins, subjects, teachingBranches };
        }).filter(ins => ins.subjects.length > 0);
      } catch (err) {
        console.warn("Instructor fetch failed:", err);
        return [];
      }
    },
    staleTime: 120_000,
  });

  const planMetaMap = useMemo(() => {
    const map = new Map<string, any>();
    allPlans.forEach((p: any) => map.set(p.name, p));
    return map;
  }, [allPlans]);

  // Calculate ranking branch-wise
  const rankingSummary = useMemo(() => {
    if (allPlans.length === 0 || allResults.length === 0 || allInstructors.length === 0 || !instructorId) return [];

    const currentTeacher = allInstructors.find((ins: any) => ins.name === instructorId);
    if (!currentTeacher) return [];

    // Find all branches the current teacher is associated with (Home branch + teaching branches)
    const homeBranch = cleanBranchName(currentTeacher.custom_company);
    const associatedBranches = Array.from(new Set([homeBranch, ...currentTeacher.teachingBranches])).filter(Boolean);

    const branchRankings: any[] = [];

    associatedBranches.forEach((branch) => {
      // Find all teachers in this branch
      const branchTeachers = allInstructors.filter((ins: any) => {
        const hBranch = cleanBranchName(ins.custom_company);
        return hBranch === branch || ins.teachingBranches?.includes(branch);
      });

      // Calculate score for each teacher in this branch
      const teacherScores = branchTeachers.map((teacher: any) => {
        // Find classes (courses) handled by this teacher in this branch
        const teacherBranchCourses = teacher.instructor_log
          .filter((entry: any) => cleanBranchName(entry.branch || entry.custom_branch) === branch)
          .map((entry: any) => entry.course)
          .filter(Boolean);

        const uniqueCourses = Array.from(new Set(teacherBranchCourses));
        if (uniqueCourses.length === 0) return { name: teacher.name, displayName: teacher.instructor_name, avgScore: 0, classesCount: 0, subjects: [] };

        // For each class, calculate the 30-point score
        let totalScoreSum = 0;
        let subjectsSet = new Set<string>();
        let totalExamsCount = 0;

        uniqueCourses.forEach((course: any) => {
          subjectsSet.add(getBaseSubject(course));

          // Get results for this course in this branch
          const courseResults = allResults.filter((r: any) => {
            const plan = planMetaMap.get(r.assessment_plan);
            if (!plan) return false;
            if (!matchCourse(plan.course, course)) return false;
            return cleanBranchName(plan.custom_branch) === branch;
          });

          let p90 = 0;
          let p60 = 0;
          let passCount = 0;

          courseResults.forEach((r: any) => {
            const pct = (r.total_score / r.maximum_score) * 100;
            if (pct >= 90) p90++;
            if (pct >= 60) p60++;
            if (pct >= 30) passCount++;
          });

          const totalExams = courseResults.length;
          totalExamsCount += totalExams;
          const pctAbove60 = totalExams > 0 ? (p60 / totalExams) * 100 : 0;
          const pctAbove90 = totalExams > 0 ? (p90 / totalExams) * 100 : 0;
          const passPct = totalExams > 0 ? (passCount / totalExams) * 100 : 0;

          const score60 = pctAbove60 / 10;
          const scorePass = passPct / 10;
          const score90 = pctAbove90 / 10;
          const classScore = score60 + scorePass + score90;

          totalScoreSum += classScore;
        });

        const avgScore = totalExamsCount > 0 ? totalScoreSum / uniqueCourses.length : null;

        return {
          name: teacher.name,
          displayName: teacher.instructor_name,
          avgScore: avgScore !== null ? Number(avgScore.toFixed(1)) : null,
          classesCount: uniqueCourses.length,
          subjects: Array.from(subjectsSet),
        };
      });

      // Filter out teachers who have 0 classes (no data)
      const activeTeacherScores = teacherScores.filter((t) => t.classesCount > 0);

      // Sort branch teachers by avgScore descending to determine rank
      // Put teachers with no exam data at the bottom
      activeTeacherScores.sort((a, b) => {
        if (a.avgScore === null) return 1;
        if (b.avgScore === null) return -1;
        return b.avgScore - a.avgScore;
      });

      // Find current teacher's rank in this branch
      const currentTeacherDataIndex = activeTeacherScores.findIndex((t) => t.name === instructorId);
      if (currentTeacherDataIndex !== -1) {
        const myData = activeTeacherScores[currentTeacherDataIndex];
        branchRankings.push({
          branch: branch.charAt(0).toUpperCase() + branch.slice(1),
          subjects: myData.subjects.join(", "),
          classesCount: myData.classesCount,
          rank: currentTeacherDataIndex + 1,
          totalTeachers: activeTeacherScores.length
        });
      }
    });

    return branchRankings;
  }, [allPlans, allResults, allInstructors, instructorId, planMetaMap]);

  const isLoading = plansLoading || resultsLoading || instructorsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-purple-500" />
            Performance & Rank Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <GifLoader size="sm" />
        </CardContent>
      </Card>
    );
  }

  if (rankingSummary.length === 0) {
    return null;
  }

  return (
    <Card className="border border-purple-100 dark:border-purple-900/50 shadow-sm bg-gradient-to-br from-purple-50/10 to-transparent">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="flex items-center gap-2 text-text-primary">
          <Trophy className="h-5 w-5 text-purple-500" />
          Branch Performance Rankings
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {rankingSummary.map((item) => (
          <div key={item.branch} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary text-sm flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-purple-500" /> {item.branch}
                </span>
                <span className="text-[10px] font-medium bg-purple-100/50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded">
                  {item.subjects}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                Classes Handled: <span className="font-medium text-text-primary">{item.classesCount}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/30 px-3 py-1.5 rounded-lg self-start sm:self-auto">
              <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <div className="text-left">
                <p className="text-[9px] text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider">Branch Rank</p>
                <p className="text-sm font-bold text-purple-700 dark:text-purple-300 mt-0.5">
                  #{item.rank} <span className="text-[10px] font-normal text-purple-500/80">of {item.totalTeachers}</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
