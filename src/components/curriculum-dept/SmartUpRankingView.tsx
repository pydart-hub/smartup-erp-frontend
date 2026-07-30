"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  ArrowLeft, 
  BookMarked
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { GifLoader } from "@/components/ui/GifLoader";

// Helpers
const getBaseSubject = (courseCode: string): string => {
  if (!courseCode) return "";
  return courseCode
    .replace(/^\d+(st|nd|rd|th)?\s+Grade\s+/i, "")
    .replace(/^\d+(st|nd|rd|th)?\s+/i, "")
    .replace(/^Language\d+\s+/i, "")
    .trim();
};

const getRateColor = (rate: number) => {
  if (rate >= 80) return "text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800";
  if (rate >= 60) return "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800";
  if (rate >= 40) return "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800";
  return "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800";
};

// Helper for matching generic language subjects with specific ones
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

interface SmartUpRankingViewProps {
  onBack: () => void;
  allResults: any[];
  allPlans: any[];
  planMetaMap: Map<string, any>;
}

export default function SmartUpRankingView({ onBack, allResults, allPlans, planMetaMap }: SmartUpRankingViewProps) {
  const [level, setLevel] = useState<"subjects" | "teachers">("subjects");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [rankingBase, setRankingBase] = useState<"performance_score" | "pass_rate" | "failed_students">("performance_score");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Fetch ALL instructors globally
  const { data: allOrgInstructors = [], isLoading: instructorsLoading } = useQuery({
    queryKey: ["all-org-instructors-smartup"],
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
        
        const allInstructors: any[] = instrRes.data ?? [];
        if (!allInstructors.length) return [];

        const fullDocs = [];
        const chunkSize = 5;
        for (let i = 0; i < allInstructors.length; i += chunkSize) {
          const chunk = allInstructors.slice(i, i + chunkSize);
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

        // Add subjects array to each instructor for easier filtering later
        return fullDocs.map(ins => {
          const subjects = [...new Set(
            ins.instructor_log
              .filter((entry: any) => !!entry.course)
              .map((entry: any) => entry.course as string)
          )];
          const teachingBranches = [...new Set(
            ins.instructor_log
              .filter((entry: any) => !!(entry.branch || entry.custom_branch))
              .map((entry: any) => (entry.branch || entry.custom_branch).replace(/^Smart\s+Up\s+/i, "").trim())
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

  // Calculate global subjects summary
  const subjectsSummary = useMemo(() => {
    if (allPlans.length === 0) return [];
    
    const subjectGroups = new Map<string, { baseName: string; results: any[]; plans: any[] }>();

    allPlans.forEach((p: any) => {
      if (!p.course) return;
      const baseName = getBaseSubject(p.course);
      if (!subjectGroups.has(baseName)) {
        subjectGroups.set(baseName, { baseName, results: [], plans: [] });
      }
      subjectGroups.get(baseName)!.plans.push(p);

      // Aggregate into equivalent generic categories (e.g. pushing Hindi plans into Language2)
      const equivalents = getEquivalentSubjects(baseName);
      equivalents.forEach(eq => {
        if (eq !== baseName && subjectGroups.has(eq)) {
          subjectGroups.get(eq)!.plans.push(p);
        }
      });
    });

    allResults.forEach((r: any) => {
      if (!r.course) return;
      const baseName = getBaseSubject(r.course);
      
      if (subjectGroups.has(baseName)) {
        subjectGroups.get(baseName)!.results.push(r);
      }

      // Aggregate into equivalent generic categories
      const equivalents = getEquivalentSubjects(baseName);
      equivalents.forEach(eq => {
        if (eq !== baseName && subjectGroups.has(eq)) {
          subjectGroups.get(eq)!.results.push(r);
        }
      });
    });

    return Array.from(subjectGroups.values()).map((sg) => {
      let passCount = 0;
      sg.results.forEach((r: any) => {
        if ((r.total_score / r.maximum_score) >= 0.4) {
          passCount++;
        }
      });

      const passRate = sg.results.length > 0 ? (passCount / sg.results.length) * 100 : 0;

      // Count instructors globally for this subject using equivalent subjects matching
      const equivalents = getEquivalentSubjects(sg.baseName);
      const instructorsCount = allOrgInstructors.filter((ins: any) =>
        ins.subjects?.some((s: string) => equivalents.includes(getBaseSubject(s)))
      ).length;

      return {
        baseName: sg.baseName,
        passRate: sg.results.length > 0 ? `${passRate.toFixed(1)}%` : "0%",
        numericRate: passRate,
        examsCount: sg.plans.length,
        instructorsCount,
        totalAssessments: sg.results.length
      };
    })
    .filter(sg => sg.baseName.toLowerCase().replace(/\s+/g, "") !== "language1" && sg.baseName.toLowerCase().replace(/\s+/g, "") !== "language2")
    .sort((a, b) => b.numericRate - a.numericRate);
  }, [allPlans, allResults, allOrgInstructors]);

  // Calculate teacher rankings globally for the selected subject
  const teacherRankings = useMemo(() => {
    if (!selectedSubject || allResults.length === 0 || allOrgInstructors.length === 0) return [];

    const equivalents = getEquivalentSubjects(selectedSubject);
    
    const subjectInstructors = allOrgInstructors.filter((ins: any) =>
      ins.subjects?.some((s: string) => equivalents.includes(getBaseSubject(s)))
    );

    const courseToInstructors = new Map<string, any[]>();
    subjectInstructors.forEach((ins: any) => {
      ins.subjects
        .filter((s: string) => equivalents.includes(getBaseSubject(s)))
        .forEach((course: string) => {
          if (!courseToInstructors.has(course)) courseToInstructors.set(course, []);
          courseToInstructors.get(course)!.push(ins);
        });
    });

    const subjectPlans = allPlans.filter((p: any) => 
      p.course && equivalents.includes(getBaseSubject(p.course)) && courseToInstructors.has(p.course)
    );
    const planNames = new Set(subjectPlans.map((p: any) => p.name));
    const subjectResults = allResults.filter((r: any) => planNames.has(r.assessment_plan));

    const teacherGroups = new Map<string, { name: string; branch: string; visitingBranches: string[]; courses: Set<string>; results: any[] }>();
    subjectInstructors.forEach((ins: any) => {
      if (!teacherGroups.has(ins.name)) {
        const assignedCourses = ins.subjects.filter((s: string) => equivalents.includes(getBaseSubject(s)));
        const homeBranch = ins.custom_company?.replace(/^Smart\s+Up\s+/i, "").trim() || "Unknown";
        const visitingBranches = ins.teachingBranches?.filter((b: string) => b.toLowerCase() !== homeBranch.toLowerCase()) || [];

        teacherGroups.set(ins.name, { 
          name: ins.instructor_name, 
          branch: homeBranch,
          visitingBranches,
          courses: new Set<string>(assignedCourses), 
          results: [] 
        });
      }
    });

    const cleanBranchName = (name: string): string => {
      if (!name) return "";
      return name.replace(/^Smart\s+Up\s+/i, "").trim().toLowerCase();
    };

    subjectResults.forEach((r: any) => {
      const plan = planMetaMap.get(r.assessment_plan);
      const course = plan?.course;
      if (!course) return;

      const planBranch = cleanBranchName(plan?.custom_branch);
      const instructorsForCourse = courseToInstructors.get(course) ?? [];
      if (instructorsForCourse.length === 0) return;

      instructorsForCourse.forEach((assigned: any) => {
        const homeBranchClean = cleanBranchName(assigned.custom_company);
        const teachesInBranch = homeBranchClean === planBranch || 
          assigned.teachingBranches?.some((b: string) => cleanBranchName(b) === planBranch);

        if (teachesInBranch) {
          teacherGroups.get(assigned.name)!.results.push(r);
          teacherGroups.get(assigned.name)!.courses.add(course);
        }
      });
    });

    const list = Array.from(teacherGroups.values()).map((t) => {
      let p90 = 0;
      let p60 = 0;
      let passCount = 0;
      let failCount = 0;

      t.results.forEach((r) => {
        const pct = (r.total_score / r.maximum_score) * 100;
        if (pct >= 90) p90++;
        if (pct >= 60) p60++;
        if (pct >= 30) passCount++;
        else failCount++;
      });

      const totalExams = t.results.length;
      const pctAbove60 = totalExams > 0 ? (p60 / totalExams) * 100 : 0;
      const pctAbove90 = totalExams > 0 ? (p90 / totalExams) * 100 : 0;
      const passPct = totalExams > 0 ? (passCount / totalExams) * 100 : 0;

      const score60 = Number((pctAbove60 / 10).toFixed(1));
      const scorePass = Number((passPct / 10).toFixed(1));
      const score90 = Number((pctAbove90 / 10).toFixed(1));
      const performanceScore = Number((score60 + scorePass + score90).toFixed(1));

      return {
        name: t.name,
        branch: t.branch,
        visitingBranches: t.visitingBranches,
        courses: Array.from(t.courses).sort().join(", "),
        failCount,
        examinees: totalExams,
        p60,
        passCount,
        p90,
        score60,
        scorePass,
        score90,
        performanceScore,
        passRate: passPct,
      };
    });

    list.sort((a, b) => {
      let valA = 0, valB = 0;
      switch (rankingBase) {
        case "performance_score": valA = a.performanceScore; valB = b.performanceScore; break;
        case "pass_rate": valA = a.passRate; valB = b.passRate; break;
        case "failed_students": valA = a.failCount; valB = b.failCount; break;
        default: valA = a.performanceScore; valB = b.performanceScore; break;
      }
      if (rankingBase === "failed_students") {
        return sortOrder === "desc" ? valA - valB : valB - valA;
      } else {
        return sortOrder === "desc" ? valB - valA : valA - valB;
      }
    });

    return list.map((item, index) => ({ ...item, rank: index + 1 }));
  }, [selectedSubject, allResults, allOrgInstructors, allPlans, planMetaMap, rankingBase, sortOrder]);

  return (
    <AnimatePresence mode="wait">
      {level === "subjects" && (
        <motion.div
          key="subjects"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-md shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Menu
              </button>
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Trophy className="h-5 w-5 text-purple-500" /> Select Global Subject
              </h2>
            </div>
          </div>
          
          {instructorsLoading ? (
            <div className="py-20 flex justify-center"><GifLoader size="md" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {subjectsSummary.map((sub: any) => {
                const colors = getRateColor(sub.numericRate);
                return (
                  <Card 
                    key={sub.baseName}
                    hover
                    onClick={() => {
                      setSelectedSubject(sub.baseName);
                      setLevel("teachers");
                    }}
                    className="cursor-pointer border-t-4 border-t-purple-500 group"
                  >
                    <div className="p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-md text-purple-600 dark:text-purple-400">
                            <BookMarked className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate pr-2" title={sub.baseName}>
                            {sub.baseName}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className={`px-2 py-1.5 rounded-md border flex flex-col items-center justify-center ${colors}`}>
                          <span className="text-[10px] font-medium opacity-80 mb-0.5">Global Pass Rate</span>
                          <span className="text-sm font-bold">{sub.passRate}</span>
                        </div>
                        <div className="px-2 py-1.5 rounded-md border bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700/50 flex flex-col items-center justify-center">
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Instructors</span>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{sub.instructorsCount}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {level === "teachers" && (
        <motion.div
          key="teachers"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLevel("subjects")}
                className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-md shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Subjects
              </button>
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Trophy className="h-5 w-5 text-purple-500" /> 
                Global Ranking ({selectedSubject})
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <select 
                className="text-xs border-slate-200 dark:border-slate-700 rounded-md py-1.5 pl-2 pr-8"
                value={rankingBase}
                onChange={(e: any) => setRankingBase(e.target.value)}
              >
                <option value="performance_score">Performance Score (Out of 30)</option>
                <option value="pass_rate">Pass Percentage</option>
              </select>
              <select
                className="text-xs border-slate-200 dark:border-slate-700 rounded-md py-1.5 pl-2 pr-8"
                value={sortOrder}
                onChange={(e: any) => setSortOrder(e.target.value)}
              >
                <option value="desc">Highest First</option>
                <option value="asc">Lowest First</option>
              </select>
            </div>
          </div>

          <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-text-secondary bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 uppercase">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-center w-20">Rank</th>
                    <th className="px-6 py-4 font-semibold">Teacher</th>
                    <th className="px-4 py-4 font-semibold text-center">Examinees</th>
                    <th className="px-4 py-4 font-semibold text-center">Above 60 (10)</th>
                    <th className="px-4 py-4 font-semibold text-center">Pass (10)</th>
                    <th className="px-4 py-4 font-semibold text-center">Above 90 (10)</th>
                    <th className="px-6 py-4 font-semibold text-center text-purple-600 dark:text-purple-400">Total (30)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {teacherRankings.map((row: any) => (
                    <tr key={row.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          row.rank === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500' :
                          row.rank === 2 ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
                          row.rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-500' :
                          'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {row.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{row.name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              {row.branch}
                            </span>
                            {row.visitingBranches?.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500 border border-amber-200 dark:border-amber-800/50">
                                Visiting: {row.visitingBranches.join(", ")}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{row.courses}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center font-medium text-slate-700 dark:text-slate-300">
                        {row.examinees}
                      </td>
                      <td className="px-4 py-4 text-center font-medium text-slate-600 dark:text-slate-400">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{row.score60}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">({row.p60})</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center font-medium text-slate-600 dark:text-slate-400">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{row.scorePass}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">({row.passCount})</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center font-medium text-slate-600 dark:text-slate-400">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{row.score90}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">({row.p90})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                          {row.performanceScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {teacherRankings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        No ranking data available for this subject.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
