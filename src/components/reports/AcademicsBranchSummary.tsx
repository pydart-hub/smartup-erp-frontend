"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getExamAnalytics } from "@/lib/api/analytics";
import { getAllBranches, type BranchDetail } from "@/lib/api/director";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  BarChart3,
  TrendingUp,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface AcademicsBranchSummaryProps {
  onSelect?: (branch: string) => void;
}

function pctColor(pct: number, good = 75, mid = 50): string {
  if (pct >= good) return "text-emerald-600";
  if (pct >= mid) return "text-amber-600";
  return "text-rose-600";
}

function pctBadgeColor(pct: number, good = 75, mid = 50): string {
  if (pct >= good) return "bg-emerald-100 text-emerald-700";
  if (pct >= mid) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

export function AcademicsBranchSummary({ onSelect }: AcademicsBranchSummaryProps) {
  // Fetch all branches
  const { data: branchesData, isLoading: branchesLoading } = useQuery({
    queryKey: ["getAllBranches"],
    queryFn: async () => {
      try {
        return await getAllBranches();
      } catch {
        return [];
      }
    },
  });

  const branches = useMemo(() => {
    const all = branchesData ?? [];
    // Filter out head office (Smart Up)
    return all.filter((b: BranchDetail) => b.name !== "Smart Up");
  }, [branchesData]);

  // Fetch exam analytics for each branch
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["branchExamAnalytics", branches.map((b: BranchDetail) => b.name).join(",")],
    queryFn: async () => {
      if (branches.length === 0) return {};

      const results: Record<string, any> = {};

      for (const branch of branches) {
        try {
          const data = await getExamAnalytics({ branch: branch.name });
          results[branch.name] = data;
        } catch (err) {
          console.error(`Failed to fetch exam analytics for ${branch.name}:`, err);
          results[branch.name] = null;
        }
      }

      return results;
    },
    enabled: branches.length > 0,
  });

  const analytics = useMemo(() => analyticsData ?? {}, [analyticsData]);

  // Compute branch-level aggregates
  const branchStats = useMemo(() => {
    return branches.map((branch: BranchDetail) => {
      const data = analytics[branch.name];
      if (!data) {
        return {
          name: branch.name,
          label: branch.company_name || branch.name,
          pass_rate: 0,
          avg_score: 0,
          total_exams: 0,
          total_students: 0,
        };
      }

      return {
        name: branch.name,
        label: branch.company_name || branch.name,
        pass_rate: data.overall?.overall_pass_rate ?? 0,
        avg_score: data.overall?.avg_score_pct ?? 0,
        total_exams: data.overall?.total_exams ?? 0,
        total_students: data.overall?.total_students_assessed ?? 0,
      };
    });
  }, [branches, analytics]);

  if (branchesLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-text-secondary">
        <AlertCircle className="h-5 w-5 mr-2" />
        No branches found
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <AnimatePresence>
        {branchStats.map((stat: any, idx: number) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            onClick={() => onSelect?.(stat.name)}
            className={cn(
              "p-4 rounded-[12px] border border-border-light bg-surface transition-all",
              onSelect ? "cursor-pointer hover:bg-app-bg hover:border-primary/30" : ""
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-text-primary mb-3">
                  {stat.label}
                </h3>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Pass Rate */}
                  <div className="bg-app-bg rounded-[8px] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="h-4 w-4 text-text-tertiary" />
                      <span className="text-xs text-text-tertiary font-medium">
                        Pass Rate
                      </span>
                    </div>
                    <p className={cn("text-lg font-bold", pctColor(stat.pass_rate))}>
                      {stat.pass_rate}%
                    </p>
                  </div>

                  {/* Avg Score */}
                  <div className="bg-app-bg rounded-[8px] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="h-4 w-4 text-text-tertiary" />
                      <span className="text-xs text-text-tertiary font-medium">
                        Avg Score
                      </span>
                    </div>
                    <p className={cn("text-lg font-bold", pctColor(stat.avg_score))}>
                      {stat.avg_score}%
                    </p>
                  </div>

                  {/* Total Exams */}
                  <div className="bg-app-bg rounded-[8px] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="h-4 w-4 text-text-tertiary" />
                      <span className="text-xs text-text-tertiary font-medium">
                        Total Exams
                      </span>
                    </div>
                    <p className="text-lg font-bold text-text-primary">
                      {stat.total_exams}
                    </p>
                  </div>

                  {/* Students Assessed */}
                  <div className="bg-app-bg rounded-[8px] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-text-tertiary" />
                      <span className="text-xs text-text-tertiary font-medium">
                        Students
                      </span>
                    </div>
                    <p className="text-lg font-bold text-text-primary">
                      {stat.total_students}
                    </p>
                  </div>
                </div>
              </div>

              {onSelect && (
                <ChevronRight className="h-5 w-5 text-text-tertiary ml-3" />
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
