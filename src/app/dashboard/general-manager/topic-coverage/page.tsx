"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranchAcademics } from "@/lib/api/analytics";
import { safeNum, pctColor, pctBadgeColor } from "@/components/academics/BranchDrillDown";
import { TopicCoverageTree } from "@/components/academics/TopicCoverageTree";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, BookOpen, ChevronDown } from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function GMTopicCoveragePage() {
  const [openBranches, setOpenBranches] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["branch-academics"],
    queryFn: getBranchAcademics,
    staleTime: 120_000,
  });

  function toggleBranch(branch: string) {
    setOpenBranches((prev) => {
      const next = new Set(prev);
      if (next.has(branch)) next.delete(branch); else next.add(branch);
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="h-8 w-64 bg-surface rounded animate-pulse" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-surface rounded-[12px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const branches = data?.branches ?? [];
  const sorted = [...branches].sort((a, b) => safeNum(b.topic_coverage_pct) - safeNum(a.topic_coverage_pct));

  const overallTopicCoverage = branches.length
    ? Math.round(branches.reduce((a, b) => a + safeNum(b.topic_coverage_pct), 0) / branches.length)
    : 0;
  const avgInstructorTopic = branches.length
    ? Math.round(branches.reduce((a, b) => a + safeNum(b.avg_instructor_topic_pct), 0) / branches.length)
    : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-primary">Topic Coverage Overview</h1>
        <p className="text-sm text-text-tertiary mt-0.5">Curriculum progress tracking across branches</p>
      </div>

      {/* Summary */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-text-tertiary" />
            <span className="text-xs text-text-tertiary font-medium">Branches</span>
          </div>
          <p className="text-2xl font-bold text-primary">{branches.length}</p>
        </motion.div>
        <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-success" />
            <span className="text-xs text-text-tertiary font-medium">Avg Topic Coverage</span>
          </div>
          <p className={`text-2xl font-bold ${pctColor(overallTopicCoverage, 70, 50)}`}>{overallTopicCoverage}%</p>
        </motion.div>
        <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-text-tertiary" />
            <span className="text-xs text-text-tertiary font-medium">Avg Instructor Topics</span>
          </div>
          <p className={`text-2xl font-bold ${pctColor(avgInstructorTopic, 70, 50)}`}>{avgInstructorTopic}%</p>
        </motion.div>
      </motion.div>

      {/* Branch Accordion Rows */}
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
        {sorted.map((b) => {
          const isOpen = openBranches.has(b.branch);
          return (
            <motion.div
              key={b.branch}
              variants={item}
              className="bg-surface rounded-[12px] border border-border-light overflow-hidden"
            >
              {/* Branch header row */}
              <button
                onClick={() => toggleBranch(b.branch)}
                className={`w-full text-left p-4 flex items-center justify-between gap-4 transition-all group ${isOpen ? "border-b border-border-light" : ""}`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-12 h-12 rounded-[10px] flex items-center justify-center text-sm font-bold shrink-0 ${pctBadgeColor(safeNum(b.topic_coverage_pct), 70, 50)}`}>
                    {safeNum(b.topic_coverage_pct)}%
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary truncate">{b.branch.replace("Smart Up ", "")}</p>
                    <p className="text-xs text-text-tertiary">
                      Instructor topics: {safeNum(b.avg_instructor_topic_pct)}% · {b.total_batches} batches
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-text-tertiary">Instructor Topics</p>
                    <p className={`text-sm font-bold ${pctColor(safeNum(b.avg_instructor_topic_pct), 70, 50)}`}>
                      {safeNum(b.avg_instructor_topic_pct)}%
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform duration-200 group-hover:text-primary ${isOpen ? "rotate-180" : ""}`} />
                </div>
              </button>

              {/* Drill-down accordion */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4">
                      <TopicCoverageTree branch={b.branch} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
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
                    <th className="text-center p-3 font-medium text-text-secondary">Topic Coverage</th>
                    <th className="text-center p-3 font-medium text-text-secondary">Instructor Topics</th>
                    <th className="text-center p-3 font-medium text-text-secondary">Batches</th>
                    <th className="text-center p-3 font-medium text-text-secondary">Teachers</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((b) => (
                    <tr
                      key={b.branch}
                      onClick={() => toggleBranch(b.branch)}
                      className="border-b border-border-light last:border-0 hover:bg-app-bg transition-colors cursor-pointer"
                    >
                      <td className="p-3 font-medium text-primary">{b.branch.replace("Smart Up ", "")}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${pctBadgeColor(safeNum(b.topic_coverage_pct), 70, 50)}`}>
                          {safeNum(b.topic_coverage_pct)}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${pctBadgeColor(safeNum(b.avg_instructor_topic_pct), 70, 50)}`}>
                          {safeNum(b.avg_instructor_topic_pct)}%
                        </span>
                      </td>
                      <td className="p-3 text-center text-text-secondary">{b.total_batches}</td>
                      <td className="p-3 text-center text-text-secondary">{b.total_instructors ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
