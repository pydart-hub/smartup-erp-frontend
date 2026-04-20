"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranchAcademics } from "@/lib/api/analytics";
import { BranchDrillDown, safeNum, pctColor, pctBadgeColor } from "@/components/academics/BranchDrillDown";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, UserCheck, ChevronRight, Users,
} from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function GMInstructorsPage() {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["branch-academics"],
    queryFn: getBranchAcademics,
    staleTime: 120_000,
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="h-8 w-64 bg-surface rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 bg-surface rounded-[12px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const branches = data?.branches ?? [];
  const sorted = [...branches].sort((a, b) => safeNum(b.avg_instructor_topic_pct) - safeNum(a.avg_instructor_topic_pct));

  const totalInstructors = branches.reduce((a, b) => a + (b.total_instructors ?? 0), 0);
  const avgTopicCompletion = branches.length
    ? Math.round(branches.reduce((a, b) => a + safeNum(b.avg_instructor_topic_pct), 0) / branches.length)
    : 0;
  const avgClassesDone = branches.length
    ? Math.round(branches.reduce((a, b) => a + safeNum(b.avg_classes_conducted_pct), 0) / branches.length)
    : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <AnimatePresence mode="wait">
        {selectedBranch ? (
          <BranchDrillDown
            key={selectedBranch}
            branch={selectedBranch}
            onBack={() => setSelectedBranch(null)}
            defaultTab="instructors"
          />
        ) : (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-primary">Instructors Overview</h1>
              <p className="text-sm text-text-tertiary mt-0.5">Instructor performance across all branches</p>
            </div>

            {/* Summary */}
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-text-tertiary" />
                  <span className="text-xs text-text-tertiary font-medium">Total Instructors</span>
                </div>
                <p className="text-2xl font-bold text-primary">{totalInstructors}</p>
              </motion.div>
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-4 h-4 text-success" />
                  <span className="text-xs text-text-tertiary font-medium">Avg Topic Completion</span>
                </div>
                <p className={`text-2xl font-bold ${pctColor(avgTopicCompletion, 70, 50)}`}>{avgTopicCompletion}%</p>
              </motion.div>
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-text-tertiary" />
                  <span className="text-xs text-text-tertiary font-medium">Avg Classes Done</span>
                </div>
                <p className={`text-2xl font-bold ${pctColor(avgClassesDone, 80, 60)}`}>{avgClassesDone}%</p>
              </motion.div>
            </motion.div>

            {/* Branch Rows */}
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
              {sorted.map((b) => (
                <motion.button
                  key={b.branch}
                  variants={item}
                  onClick={() => setSelectedBranch(b.branch)}
                  className="w-full text-left bg-surface rounded-[12px] border border-border-light p-4 hover:border-primary/30 hover:shadow-md transition-all group flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-[10px] flex items-center justify-center text-sm font-bold shrink-0 ${pctBadgeColor(safeNum(b.avg_instructor_topic_pct), 70, 50)}`}>
                      {safeNum(b.avg_instructor_topic_pct)}%
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{b.branch.replace("Smart Up ", "")}</p>
                      <p className="text-xs text-text-tertiary">
                        {b.total_instructors ?? 0} instructors · Classes done: {safeNum(b.avg_classes_conducted_pct)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-text-tertiary">Classes Done</p>
                      <p className={`text-sm font-bold ${pctColor(safeNum(b.avg_classes_conducted_pct), 80, 60)}`}>
                        {safeNum(b.avg_classes_conducted_pct)}%
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-primary transition-colors" />
                  </div>
                </motion.button>
              ))}
            </motion.div>

            {/* Comparison Table */}
            {branches.length > 1 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h2 className="text-lg font-semibold text-primary mb-3">Branch Comparison</h2>
                <div className="bg-surface rounded-[12px] border border-border-light overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-app-bg border-b border-border-light">
                          <th className="text-left p-3 font-medium text-text-secondary">Branch</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Instructors</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Topic Completion</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Classes Done</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Batches</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((b) => (
                          <tr
                            key={b.branch}
                            onClick={() => setSelectedBranch(b.branch)}
                            className="border-b border-border-light last:border-0 hover:bg-app-bg transition-colors cursor-pointer"
                          >
                            <td className="p-3 font-medium text-primary">{b.branch.replace("Smart Up ", "")}</td>
                            <td className="p-3 text-center text-text-secondary">{b.total_instructors ?? 0}</td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${pctBadgeColor(safeNum(b.avg_instructor_topic_pct), 70, 50)}`}>
                                {safeNum(b.avg_instructor_topic_pct)}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${pctBadgeColor(safeNum(b.avg_classes_conducted_pct), 80, 60)}`}>
                                {safeNum(b.avg_classes_conducted_pct)}%
                              </span>
                            </td>
                            <td className="p-3 text-center text-text-secondary">{b.total_batches}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
