"use client";

import { useQuery } from "@tanstack/react-query";
import { getClassBranchSubjects } from "@/lib/api/analytics";
import { safeNum, pctColor, pctBadgeColor } from "@/components/academics/BranchDrillDown";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, ClipboardCheck, Trophy,
  BarChart3, AlertTriangle, Users, BookOpen, TrendingUp,
} from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

interface Props {
  program: string;
  branch: string;
  onBack: () => void;
  onSelectSubject: (subject: string) => void;
}

export function BranchSubjectsView({ program, branch, onBack, onSelectSubject }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["class-branch-subjects", program, branch],
    queryFn: () => getClassBranchSubjects(program, branch),
    staleTime: 120_000,
  });

  const branchLabel = branch.replace("Smart Up ", "");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-72 bg-surface rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-surface rounded-[12px] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-surface rounded-[12px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const subjects = data?.subjects ?? [];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="branch-subjects"
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
              <span className="text-primary font-semibold">{branchLabel}</span>
            </div>
            <p className="text-xs text-text-tertiary">Subject performance — {branchLabel}</p>
          </div>
        </div>

        {/* Summary Bar */}
        {data && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs text-text-tertiary font-medium">Students</span>
              </div>
              <p className="text-2xl font-bold text-primary">{data.total_students}</p>
            </motion.div>
            <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardCheck className="w-4 h-4 text-success" />
                <span className="text-xs text-text-tertiary font-medium">Attendance</span>
              </div>
              <p className={`text-2xl font-bold ${pctColor(data.avg_attendance_pct)}`}>
                {data.avg_attendance_pct}%
              </p>
            </motion.div>
            <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs text-text-tertiary font-medium">Avg Score</span>
              </div>
              <p className={`text-2xl font-bold ${pctColor(data.avg_exam_score_pct, 60, 40)}`}>
                {data.avg_exam_score_pct}%
              </p>
            </motion.div>
            <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-warning" />
                <span className="text-xs text-text-tertiary font-medium">Pass Rate</span>
              </div>
              <p className={`text-2xl font-bold ${pctColor(data.pass_rate)}`}>
                {data.pass_rate}%
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* At-Risk Alert */}
        {data && data.chronic_absentees > 0 && (
          <div className="bg-error/5 border border-error/20 rounded-[10px] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-error" />
              <span className="text-sm text-error font-medium">
                {data.chronic_absentees} students with chronic low attendance (&lt;75%)
              </span>
            </div>
          </div>
        )}

        {/* Subject Cards */}
        <div>
          <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Subjects ({subjects.length})
          </h2>

          {subjects.length === 0 ? (
            <div className="bg-surface rounded-[12px] p-8 text-center border border-border-light">
              <BookOpen className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary font-medium">No exam data available</p>
              <p className="text-xs text-text-tertiary mt-1">
                No assessment results found for {program} in {branchLabel}
              </p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {subjects.map((s) => (
                <motion.button
                  key={s.subject}
                  variants={item}
                  onClick={() => onSelectSubject(s.subject)}
                  className="text-left bg-surface rounded-[12px] border border-border-light p-4 hover:border-primary/30 hover:shadow-md transition-all group"
                >
                  {/* Subject Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary group-hover:text-primary/80 truncate">
                        {s.subject}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {s.total_students} students assessed
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                  </div>

                  {/* Score Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`text-2xl font-bold ${pctColor(safeNum(s.avg_score_pct), 60, 40)}`}
                    >
                      {safeNum(s.avg_score_pct)}%
                    </span>
                    <span className="text-xs text-text-tertiary">avg score</span>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-app-bg rounded-[8px] p-2">
                      <p className={`text-sm font-bold ${pctBadgeColor(safeNum(s.pass_rate)).includes("success") ? "text-success" : safeNum(s.pass_rate) >= 50 ? "text-warning" : "text-error"}`}>
                        <span className={`text-sm font-bold ${pctColor(safeNum(s.pass_rate))}`}>
                          {safeNum(s.pass_rate)}%
                        </span>
                      </p>
                      <p className="text-[10px] text-text-tertiary mt-0.5">Pass Rate</p>
                    </div>
                    <div className="bg-app-bg rounded-[8px] p-2">
                      <p className="text-sm font-bold text-success">{s.max_score}</p>
                      <p className="text-[10px] text-text-tertiary mt-0.5">Highest</p>
                    </div>
                    <div className="bg-app-bg rounded-[8px] p-2">
                      <p className="text-sm font-bold text-error">{s.min_score}</p>
                      <p className="text-[10px] text-text-tertiary mt-0.5">Lowest</p>
                    </div>
                  </div>

                  {/* Score Bar */}
                  <div className="mt-3">
                    <div className="h-1.5 bg-app-bg rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          safeNum(s.avg_score_pct) >= 60
                            ? "bg-success"
                            : safeNum(s.avg_score_pct) >= 40
                            ? "bg-warning"
                            : "bg-error"
                        }`}
                        style={{ width: `${safeNum(s.avg_score_pct)}%` }}
                      />
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Batch Performance Table */}
        {data && data.batches.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Batch Performance
            </h2>
            <div className="bg-surface rounded-[12px] border border-border-light overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-app-bg border-b border-border-light">
                      <th className="text-left p-3 font-medium text-text-secondary">Batch</th>
                      <th className="text-center p-3 font-medium text-text-secondary">Students</th>
                      <th className="text-center p-3 font-medium text-text-secondary">Avg Score</th>
                      <th className="text-center p-3 font-medium text-text-secondary">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.batches.map((b) => (
                      <tr
                        key={b.name}
                        className="border-b border-border-light last:border-0"
                      >
                        <td className="p-3 font-medium text-primary text-xs">{b.name}</td>
                        <td className="p-3 text-center text-text-secondary text-xs">{b.total_students}</td>
                        <td className="p-3 text-center">
                          <span className={`font-bold text-sm ${pctColor(safeNum(b.avg_pct), 60, 40)}`}>
                            {safeNum(b.avg_pct)}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pctBadgeColor(safeNum(b.pass_rate))}`}>
                            {safeNum(b.pass_rate)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
