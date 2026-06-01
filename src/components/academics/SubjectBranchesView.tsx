"use client";

import { useQuery } from "@tanstack/react-query";
import { getSubjectBranches } from "@/lib/api/analytics";
import { safeNum, pctColor, pctBadgeColor } from "@/components/academics/BranchDrillDown";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Trophy, BarChart3, Users, BookOpen, Building2,
} from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

interface Props {
  program: string;
  subject: string;
  onBack: () => void;
}

export function SubjectBranchesView({ program, subject, onBack }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["subject-branches", program, subject],
    queryFn: () => getSubjectBranches(program, subject),
    staleTime: 120_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-72 bg-surface rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-surface rounded-[12px] animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-surface rounded-[12px] animate-pulse" />
      </div>
    );
  }

  const branches = data?.branches ?? [];
  const overall = data?.overall;
  const maxPct = branches.length > 0 ? Math.max(...branches.map((b) => b.avg_score_pct)) : 100;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="subject-branches"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-[8px] hover:bg-app-bg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-text-secondary" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-sm text-text-tertiary mb-0.5">
              <span>Overview</span>
              <span>/</span>
              <span className="text-text-secondary">{program}</span>
              <span>/</span>
              <span className="text-primary font-semibold">{subject}</span>
            </div>
            <p className="text-xs text-text-tertiary">
              Branch-wise comparison — {subject} in {program}
            </p>
          </div>
        </div>

        {/* Summary */}
        {overall && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-3 gap-3"
          >
            <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs text-text-tertiary font-medium">Total Students</span>
              </div>
              <p className="text-2xl font-bold text-primary">{overall.total_students}</p>
            </motion.div>
            <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs text-text-tertiary font-medium">Overall Avg</span>
              </div>
              <p className={`text-2xl font-bold ${pctColor(overall.avg_score_pct, 60, 40)}`}>
                {overall.avg_score_pct}%
              </p>
            </motion.div>
            <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-warning" />
                <span className="text-xs text-text-tertiary font-medium">Pass Rate</span>
              </div>
              <p className={`text-2xl font-bold ${pctColor(overall.pass_rate)}`}>
                {overall.pass_rate}%
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* Branch Comparison Table */}
        <div>
          <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Branch Rankings — {subject}
          </h2>

          {branches.length === 0 ? (
            <div className="bg-surface rounded-[12px] p-8 text-center border border-border-light">
              <BookOpen className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary font-medium">No exam data found</p>
              <p className="text-xs text-text-tertiary mt-1">
                No results for {subject} in {program}
              </p>
            </div>
          ) : (
            <div className="bg-surface rounded-[12px] border border-border-light overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-app-bg border-b border-border-light">
                      <th className="text-center p-3 font-medium text-text-secondary w-10">#</th>
                      <th className="text-left p-3 font-medium text-text-secondary">Branch</th>
                      <th className="text-center p-3 font-medium text-text-secondary">Students</th>
                      <th className="text-center p-3 font-medium text-text-secondary">Avg Score</th>
                      <th className="text-center p-3 font-medium text-text-secondary">Pass Rate</th>
                      <th className="p-3 font-medium text-text-secondary min-w-[120px]">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((b, i) => (
                      <tr key={b.branch} className="border-b border-border-light last:border-0">
                        <td className="p-3 text-center">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              i === 0
                                ? "bg-yellow-100 text-yellow-700"
                                : i === 1
                                ? "bg-gray-100 text-gray-600"
                                : i === 2
                                ? "bg-orange-100 text-orange-700"
                                : "bg-app-bg text-text-tertiary"
                            }`}
                          >
                            #{i + 1}
                          </span>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-primary text-sm">
                            {b.branch.replace("Smart Up ", "")}
                          </p>
                          <p className="text-xs text-text-tertiary">
                            {b.avg_score}/{b.maximum_possible} avg
                          </p>
                        </td>
                        <td className="p-3 text-center text-text-secondary">{b.total_students}</td>
                        <td className="p-3 text-center">
                          <span className={`font-bold ${pctColor(safeNum(b.avg_score_pct), 60, 40)}`}>
                            {safeNum(b.avg_score_pct)}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pctBadgeColor(safeNum(b.pass_rate))}`}>
                            {safeNum(b.pass_rate)}%
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-app-bg rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  safeNum(b.avg_score_pct) >= 60
                                    ? "bg-success"
                                    : safeNum(b.avg_score_pct) >= 40
                                    ? "bg-warning"
                                    : "bg-error"
                                }`}
                                style={{
                                  width: maxPct > 0
                                    ? `${(safeNum(b.avg_score_pct) / maxPct) * 100}%`
                                    : "0%",
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
