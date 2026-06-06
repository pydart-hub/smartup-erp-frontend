"use client";

import { useQuery } from "@tanstack/react-query";
import { getClassBranches } from "@/lib/api/analytics";
import { safeNum, pctColor, pctBadgeColor } from "@/components/academics/BranchDrillDown";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, ClipboardCheck, Trophy,
  BarChart3, Users, Building2, BookOpen,
} from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

interface Props {
  program: string;
  onBack: () => void;
  onSelectSubject: (subject: string) => void;
}

export function ClassBranchesView({ program, onBack, onSelectSubject }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["class-branches", program],
    queryFn: () => getClassBranches(program),
    staleTime: 120_000,
  });

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
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-surface rounded-[12px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const branches = data?.branches ?? [];
  const subjects = data?.subjects ?? [];
  const overall = data?.overall;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="class-subjects"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className="space-y-6"
      >
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
              <span className="text-primary font-semibold">{program}</span>
            </div>
            <p className="text-xs text-text-tertiary">
              Subject-wise performance for {program}
            </p>
          </div>
        </div>

        {overall && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs text-text-tertiary font-medium">Subjects</span>
              </div>
              <p className="text-2xl font-bold text-primary">{subjects.length}</p>
            </motion.div>
            <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs text-text-tertiary font-medium">Students</span>
              </div>
              <p className="text-2xl font-bold text-primary">{overall.total_students}</p>
            </motion.div>
            <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardCheck className="w-4 h-4 text-success" />
                <span className="text-xs text-text-tertiary font-medium">Avg Attendance</span>
              </div>
              <p className={`text-2xl font-bold ${pctColor(overall.avg_attendance_pct)}`}>
                {overall.avg_attendance_pct}%
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

        <div>
          <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Subjects ({subjects.length})
          </h2>
          {subjects.length === 0 ? (
            <div className="bg-surface rounded-[12px] p-8 text-center border border-border-light">
              <BookOpen className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary font-medium">No subjects found for this class</p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {subjects.map((subject, i) => {
                const health = safeNum(subject.health_score);
                const healthColor =
                  health >= 70 ? "text-success" : health >= 50 ? "text-warning" : "text-error";
                const healthBg =
                  health >= 70 ? "bg-success/10" : health >= 50 ? "bg-warning/10" : "bg-error/10";

                return (
                  <motion.button
                    key={subject.subject}
                    variants={item}
                    onClick={() => onSelectSubject(subject.subject)}
                    className="text-left bg-surface rounded-[12px] border border-border-light overflow-hidden hover:border-primary/30 hover:shadow-md transition-all group"
                  >
                    <div className="p-4 border-b border-border-light flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-sm font-bold ${healthBg} ${healthColor}`}
                        >
                          {health}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-primary group-hover:text-primary/80 transition-colors">
                            {subject.subject}
                          </p>
                          <p className="text-xs text-text-tertiary">
                            {subject.total_students} students · {subject.branches_count} {subject.branches_count === 1 ? "branch" : "branches"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {i < 3 && (
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              i === 0
                                ? "bg-yellow-100 text-yellow-700"
                                : i === 1
                                ? "bg-gray-100 text-gray-600"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            #{i + 1}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-primary transition-colors" />
                      </div>
                    </div>

                    <div className="p-4 grid grid-cols-3 gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <ClipboardCheck className="w-3 h-3 text-text-tertiary" />
                          <span className="text-xs text-text-tertiary">Attendance</span>
                        </div>
                        <p className={`text-lg font-bold ${pctColor(safeNum(subject.avg_attendance_pct))}`}>
                          {safeNum(subject.avg_attendance_pct)}%
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <BarChart3 className="w-3 h-3 text-text-tertiary" />
                          <span className="text-xs text-text-tertiary">Avg Score</span>
                        </div>
                        <p className={`text-lg font-bold ${pctColor(safeNum(subject.avg_score_pct), 60, 40)}`}>
                          {safeNum(subject.avg_score_pct)}%
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Trophy className="w-3 h-3 text-text-tertiary" />
                          <span className="text-xs text-text-tertiary">Pass Rate</span>
                        </div>
                        <p className={`text-lg font-bold ${pctColor(safeNum(subject.pass_rate))}`}>
                          {safeNum(subject.pass_rate)}%
                        </p>
                      </div>
                    </div>

                    <div className="px-4 pb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-text-tertiary">Academic Health</span>
                        <span className={`text-xs font-semibold ${healthColor}`}>{health}%</span>
                      </div>
                      <div className="h-1.5 bg-app-bg rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            health >= 70 ? "bg-success" : health >= 50 ? "bg-warning" : "bg-error"
                          }`}
                          style={{ width: `${health}%` }}
                        />
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </div>

        {branches.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Branch Summary - {program}
            </h2>
            <div className="bg-surface rounded-[12px] border border-border-light overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-app-bg border-b border-border-light">
                      <th className="text-left p-3 font-medium text-text-secondary">Branch</th>
                      <th className="text-center p-3 font-medium text-text-secondary">Students</th>
                      <th className="text-center p-3 font-medium text-text-secondary">Attendance</th>
                      <th className="text-center p-3 font-medium text-text-secondary">Avg Score</th>
                      <th className="text-center p-3 font-medium text-text-secondary">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((branch) => (
                      <tr key={branch.branch} className="border-b border-border-light last:border-0">
                        <td className="p-3 font-semibold text-primary">{branch.branch.replace("Smart Up ", "")}</td>
                        <td className="p-3 text-center text-text-secondary">{branch.total_students}</td>
                        <td className="p-3 text-center">
                          <span className={`font-bold ${pctColor(safeNum(branch.avg_attendance_pct))}`}>
                            {safeNum(branch.avg_attendance_pct)}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`font-bold ${pctColor(safeNum(branch.avg_exam_score_pct), 60, 40)}`}>
                            {safeNum(branch.avg_exam_score_pct)}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pctBadgeColor(safeNum(branch.pass_rate))}`}>
                            {safeNum(branch.pass_rate)}%
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
