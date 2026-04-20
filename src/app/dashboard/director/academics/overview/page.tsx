"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranchAcademics } from "@/lib/api/analytics";
import { BranchDrillDown, safeNum, pctColor, pctBadgeColor } from "@/components/academics/BranchDrillDown";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, ClipboardCheck, Trophy, BookOpen,
  AlertTriangle, Users, TrendingUp, BarChart3,
  ChevronDown, UserCheck, GraduationCap,
} from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function DirectorAcademicsOverviewPage() {
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
            <div key={i} className="h-48 bg-surface rounded-[12px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const branches = data?.branches ?? [];
  const sortedBranches = [...branches].sort((a, b) => b.avg_exam_score_pct - a.avg_exam_score_pct);

  const totalStudents = branches.reduce((a, b) => a + b.total_students, 0);
  const overallAttendance = branches.length > 0
    ? Math.round(branches.reduce((a, b) => a + b.avg_attendance_pct, 0) / branches.length)
    : 0;
  const overallPass = branches.length > 0
    ? Math.round(branches.reduce((a, b) => a + safeNum(b.pass_rate), 0) / branches.length)
    : 0;
  const totalAbsentees = branches.reduce((a, b) => a + b.chronic_absentees, 0);
  const totalInstructors = branches.reduce((a, b) => a + (b.total_instructors ?? 0), 0);
  const overallClassesConducted = branches.length > 0
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
          />
        ) : (
          <motion.div
            key="overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-primary">Academics Overview</h1>
                <p className="text-sm text-text-tertiary mt-0.5">
                  Click any branch to drill down into detailed analytics
                </p>
              </div>

              {/* Health Score Formula */}
              <div className="flex items-start gap-2 bg-surface border border-border-light rounded-[10px] px-3 py-2.5 max-w-xs sm:max-w-sm">
                <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">?</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-text-secondary mb-1">How is Academic Health calculated?</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text-tertiary">
                    <span><span className="font-semibold text-primary">30%</span> Attendance</span>
                    <span><span className="font-semibold text-primary">30%</span> Exam Score</span>
                    <span><span className="font-semibold text-primary">20%</span> Pass Rate</span>
                    <span><span className="font-semibold text-primary">20%</span> Topic Coverage</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Org-wide Summary */}
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-text-tertiary" />
                  <span className="text-xs text-text-tertiary font-medium">Branches</span>
                </div>
                <p className="text-2xl font-bold text-primary">{branches.length}</p>
              </motion.div>

              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-text-tertiary" />
                  <span className="text-xs text-text-tertiary font-medium">Students</span>
                </div>
                <p className="text-2xl font-bold text-primary">{totalStudents}</p>
              </motion.div>

              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-4 h-4 text-text-tertiary" />
                  <span className="text-xs text-text-tertiary font-medium">Teachers</span>
                </div>
                <p className="text-2xl font-bold text-primary">{totalInstructors}</p>
              </motion.div>

              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardCheck className="w-4 h-4 text-success" />
                  <span className="text-xs text-text-tertiary font-medium">Attendance</span>
                </div>
                <p className={`text-2xl font-bold ${pctColor(overallAttendance)}`}>{overallAttendance}%</p>
              </motion.div>

              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-warning" />
                  <span className="text-xs text-text-tertiary font-medium">Pass Rate</span>
                </div>
                <p className={`text-2xl font-bold ${pctColor(overallPass)}`}>{overallPass}%</p>
              </motion.div>

              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-4 h-4 text-text-tertiary" />
                  <span className="text-xs text-text-tertiary font-medium">Classes Done</span>
                </div>
                <p className={`text-2xl font-bold ${pctColor(overallClassesConducted, 80, 60)}`}>{overallClassesConducted}%</p>
              </motion.div>

              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-error" />
                  <span className="text-xs text-text-tertiary font-medium">At Risk</span>
                </div>
                <p className="text-2xl font-bold text-error">{totalAbsentees}</p>
                <p className="text-xs text-text-tertiary mt-0.5">chronic absentees</p>
              </motion.div>
            </motion.div>

            {/* Branch Cards */}
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.length === 0 ? (
                <div className="col-span-full bg-surface rounded-[12px] p-8 text-center border border-border-light">
                  <Building2 className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
                  <p className="text-text-secondary font-medium">No branch data found</p>
                </div>
              ) : (
                sortedBranches.map((branch, i) => {
                  const health = Math.round(
                    safeNum(branch.avg_attendance_pct) * 0.3 +
                    safeNum(branch.avg_exam_score_pct) * 0.3 +
                    safeNum(branch.pass_rate) * 0.2 +
                    safeNum(branch.topic_coverage_pct) * 0.2,
                  );
                  const healthColor = health >= 70 ? "text-success" : health >= 50 ? "text-warning" : "text-error";
                  const healthBg = health >= 70 ? "bg-success/10" : health >= 50 ? "bg-warning/10" : "bg-error/10";

                  return (
                    <motion.button
                      key={branch.branch}
                      variants={item}
                      onClick={() => setSelectedBranch(branch.branch)}
                      className="text-left bg-surface rounded-[12px] border border-border-light overflow-hidden hover:border-primary/30 hover:shadow-md transition-all group"
                    >
                      {/* Card Header */}
                      <div className="p-4 border-b border-border-light flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-sm font-bold ${healthBg} ${healthColor}`}>
                            {health}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-primary group-hover:text-primary/80 transition-colors">
                              {branch.branch.replace("Smart Up ", "")}
                            </p>
                            <p className="text-xs text-text-tertiary">{branch.total_students} students Â· {branch.total_batches} batches Â· {branch.total_instructors ?? 0} teachers</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {i < 3 && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              i === 0 ? "bg-yellow-100 text-yellow-700"
                              : i === 1 ? "bg-gray-100 text-gray-600"
                              : "bg-orange-100 text-orange-700"
                            }`}>
                              #{i + 1}
                            </span>
                          )}
                          <ChevronDown className="w-4 h-4 text-text-tertiary -rotate-90 group-hover:text-primary transition-colors" />
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="p-4 grid grid-cols-3 gap-3">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <ClipboardCheck className="w-3 h-3 text-text-tertiary" />
                            <span className="text-xs text-text-tertiary">Attendance</span>
                          </div>
                          <p className={`text-lg font-bold ${pctColor(safeNum(branch.avg_attendance_pct))}`}>
                            {safeNum(branch.avg_attendance_pct)}%
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <BarChart3 className="w-3 h-3 text-text-tertiary" />
                            <span className="text-xs text-text-tertiary">Avg Score</span>
                          </div>
                          <p className={`text-lg font-bold ${pctColor(safeNum(branch.avg_exam_score_pct), 60, 40)}`}>
                            {safeNum(branch.avg_exam_score_pct)}%
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Trophy className="w-3 h-3 text-text-tertiary" />
                            <span className="text-xs text-text-tertiary">Pass Rate</span>
                          </div>
                          <p className={`text-lg font-bold ${pctColor(safeNum(branch.pass_rate))}`}>
                            {safeNum(branch.pass_rate)}%
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <BookOpen className="w-3 h-3 text-text-tertiary" />
                            <span className="text-xs text-text-tertiary">Topics</span>
                          </div>
                          <p className={`text-lg font-bold ${pctColor(safeNum(branch.topic_coverage_pct), 70, 50)}`}>
                            {safeNum(branch.topic_coverage_pct)}%
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <UserCheck className="w-3 h-3 text-text-tertiary" />
                            <span className="text-xs text-text-tertiary">Classes Done</span>
                          </div>
                          <p className={`text-lg font-bold ${pctColor(safeNum(branch.avg_classes_conducted_pct), 80, 60)}`}>
                            {safeNum(branch.avg_classes_conducted_pct)}%
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <GraduationCap className="w-3 h-3 text-text-tertiary" />
                            <span className="text-xs text-text-tertiary">Teacher Topics</span>
                          </div>
                          <p className={`text-lg font-bold ${pctColor(safeNum(branch.avg_instructor_topic_pct), 70, 50)}`}>
                            {safeNum(branch.avg_instructor_topic_pct)}%
                          </p>
                        </div>
                      </div>

                      {/* At Risk */}
                      {branch.chronic_absentees > 0 && (
                        <div className="px-4 pb-3">
                          <div className="bg-error/5 rounded-[8px] px-3 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-error" />
                              <span className="text-xs text-error font-medium">{branch.chronic_absentees} at risk</span>
                            </div>
                            <span className="text-xs text-error">&lt;75% attendance</span>
                          </div>
                        </div>
                      )}

                      {/* Health Bar */}
                      <div className="px-4 pb-4">
                        <div className="flex justify-between text-xs text-text-tertiary mb-1">
                          <span>Academic Health</span>
                          <span className={healthColor}>{health}%</span>
                        </div>
                        <div className="h-1.5 bg-app-bg rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${health >= 70 ? "bg-success" : health >= 50 ? "bg-warning" : "bg-error"}`}
                            style={{ width: `${health}%` }}
                          />
                        </div>
                      </div>
                    </motion.button>
                  );
                })
              )}
            </motion.div>

            {/* Comparison Table */}
            {branches.length > 1 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <h2 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Branch Comparison
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
                          <th className="text-center p-3 font-medium text-text-secondary">Topics</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Teachers</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Classes %</th>
                          <th className="text-center p-3 font-medium text-text-secondary">At Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedBranches.map((b) => (
                          <tr
                            key={b.branch}
                            onClick={() => setSelectedBranch(b.branch)}
                            className="border-b border-border-light last:border-0 hover:bg-app-bg transition-colors cursor-pointer"
                          >
                            <td className="p-3 font-medium text-primary">{b.branch.replace("Smart Up ", "")}</td>
                            <td className="p-3 text-center text-text-secondary">{b.total_students}</td>
                            <td className="p-3 text-center">
                              <span className={`font-medium ${pctColor(safeNum(b.avg_attendance_pct))}`}>
                                {safeNum(b.avg_attendance_pct)}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`font-medium ${pctColor(safeNum(b.avg_exam_score_pct), 60, 40)}`}>
                                {safeNum(b.avg_exam_score_pct)}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${pctBadgeColor(safeNum(b.pass_rate))}`}>
                                {safeNum(b.pass_rate)}%
                              </span>
                            </td>
                            <td className="p-3 text-center text-text-secondary">{safeNum(b.topic_coverage_pct)}%</td>
                            <td className="p-3 text-center text-text-secondary">{b.total_instructors ?? 0}</td>
                            <td className="p-3 text-center">
                              <span className={`font-medium ${pctColor(safeNum(b.avg_classes_conducted_pct), 80, 60)}`}>
                                {safeNum(b.avg_classes_conducted_pct)}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {b.chronic_absentees > 0 ? (
                                <span className="text-error font-medium">{b.chronic_absentees}</span>
                              ) : (
                                <span className="text-success">0</span>
                              )}
                            </td>
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
