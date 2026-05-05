"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/useAuth";
import { getExamAnalytics } from "@/lib/api/analytics";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  BarChart3,
  TrendingUp,
  ChevronRight,
  Loader2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface AcademicsClassSummaryProps {
  onSelect?: (program: string, studentGroup?: string) => void;
}

interface ClassStat {
  student_group: string;
  program: string;
  assessment_group?: string;
  pass_rate: number;
  avg_score: number;
  total_exams: number;
  total_students: number;
}

function pctColor(pct: number, good = 75, mid = 50): string {
  if (pct >= good) return "text-emerald-600";
  if (pct >= mid) return "text-amber-600";
  return "text-rose-600";
}

export function AcademicsClassSummary({ onSelect }: AcademicsClassSummaryProps) {
  const auth = useAuth();
  const userBranch = auth?.defaultCompany || "";
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);

  // Fetch exam analytics for user's branch
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["classExamAnalytics", userBranch],
    queryFn: async () => {
      if (!userBranch) throw new Error("No branch");
      try {
        return await getExamAnalytics({ branch: userBranch });
      } catch (err) {
        console.error("Failed to fetch exam analytics:", err);
        return null;
      }
    },
    enabled: !!userBranch,
  });

  // Compute class-level stats grouped by program
  const classStats = useMemo(() => {
    if (!analyticsData?.batches) return new Map<string, ClassStat[]>();

    const byProgram = new Map<string, ClassStat[]>();

    for (const batch of analyticsData.batches) {
      const stat: ClassStat = {
        student_group: batch.student_group,
        program: batch.program || "Unknown",
        assessment_group: batch.assessment_group,
        pass_rate: batch.overall_pass_rate ?? 0,
        avg_score: batch.overall_avg_pct ?? 0,
        total_exams: 1, // Each batch is one assessment group
        total_students: batch.total_students ?? 0,
      };

      if (!byProgram.has(stat.program)) {
        byProgram.set(stat.program, []);
      }
      byProgram.get(stat.program)!.push(stat);
    }

    // Sort classes within each program by student_group name
    for (const classes of byProgram.values()) {
      classes.sort((a, b) => a.student_group.localeCompare(b.student_group));
    }

    return byProgram;
  }, [analyticsData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (classStats.size === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-text-secondary">
        <AlertCircle className="h-5 w-5 mr-2" />
        No exam data found for this branch
      </div>
    );
  }

  const programs = Array.from(classStats.keys()).sort();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <AnimatePresence>
        {programs.map((program) => {
          const classes = classStats.get(program) || [];
          const isExpanded = expandedProgram === program;

          return (
            <motion.div key={program} layout>
              {/* Program Header */}
              <motion.button
                onClick={() =>
                  setExpandedProgram(isExpanded ? null : program)
                }
                className="w-full text-left p-4 rounded-[12px] border border-border-light bg-surface hover:bg-app-bg transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {program}
                    </h3>
                    <p className="text-xs text-text-tertiary mt-1">
                      {classes.length} class{classes.length !== 1 ? "es" : ""}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-text-tertiary transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </div>
              </motion.button>

              {/* Classes List */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pl-4 mt-2 space-y-2"
                  >
                    {classes.map((classItem, idx) => (
                      <motion.div
                        key={`${classItem.student_group}|||${classItem.assessment_group}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() =>
                          onSelect?.(program, classItem.student_group)
                        }
                        className={cn(
                          "p-4 rounded-[12px] border border-border-light bg-surface transition-all",
                          onSelect
                            ? "cursor-pointer hover:bg-app-bg hover:border-primary/30"
                            : ""
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-text-primary">
                            {classItem.student_group}
                          </h4>
                          {onSelect && (
                            <ChevronRight className="h-4 w-4 text-text-tertiary" />
                          )}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* Pass Rate */}
                          <div className="bg-app-bg rounded-[8px] p-2">
                            <div className="flex items-center gap-1 mb-1">
                              <Trophy className="h-3 w-3 text-text-tertiary" />
                              <span className="text-xs text-text-tertiary">
                                Pass Rate
                              </span>
                            </div>
                            <p
                              className={cn(
                                "text-sm font-bold",
                                pctColor(classItem.pass_rate)
                              )}
                            >
                              {classItem.pass_rate}%
                            </p>
                          </div>

                          {/* Avg Score */}
                          <div className="bg-app-bg rounded-[8px] p-2">
                            <div className="flex items-center gap-1 mb-1">
                              <BarChart3 className="h-3 w-3 text-text-tertiary" />
                              <span className="text-xs text-text-tertiary">
                                Avg Score
                              </span>
                            </div>
                            <p
                              className={cn(
                                "text-sm font-bold",
                                pctColor(classItem.avg_score)
                              )}
                            >
                              {classItem.avg_score}%
                            </p>
                          </div>

                          {/* Students */}
                          <div className="bg-app-bg rounded-[8px] p-2">
                            <div className="flex items-center gap-1 mb-1">
                              <TrendingUp className="h-3 w-3 text-text-tertiary" />
                              <span className="text-xs text-text-tertiary">
                                Students
                              </span>
                            </div>
                            <p className="text-sm font-bold text-text-primary">
                              {classItem.total_students}
                            </p>
                          </div>

                          {/* Exams */}
                          <div className="bg-app-bg rounded-[8px] p-2">
                            <div className="flex items-center gap-1 mb-1">
                              <BarChart3 className="h-3 w-3 text-text-tertiary" />
                              <span className="text-xs text-text-tertiary">
                                Exams
                              </span>
                            </div>
                            <p className="text-sm font-bold text-text-primary">
                              {classItem.total_exams}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
