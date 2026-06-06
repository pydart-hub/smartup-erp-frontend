"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getClassOverview } from "@/lib/api/analytics";
import { safeNum, pctColor, pctBadgeColor } from "@/components/academics/BranchDrillDown";
import { ClassBranchesView } from "@/components/academics/ClassBranchesView";
import { SubjectBranchesView } from "@/components/academics/SubjectBranchesView";
import { SubjectBranchStudentsView } from "@/components/academics/SubjectBranchStudentsView";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Users, ClipboardCheck, Trophy,
  BarChart3, AlertTriangle, BookOpen, Building2,
} from "lucide-react";

// ── Navigation State Machine ──────────────────────────────────────────────────
type ViewState =
  | { view: "classes" }
  | { view: "class-subjects"; program: string }
  | { view: "subject-branches"; program: string; subject: string }
  | { view: "subject-branch-students"; program: string; subject: string; branch: string };

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function DirectorAcademicsOverviewPage() {
  const [navStack, setNavStack] = useState<ViewState[]>([{ view: "classes" }]);
  const current = navStack[navStack.length - 1];

  function navigate(v: ViewState) {
    setNavStack((s) => [...s, v]);
  }

  function goBack() {
    setNavStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }

  const { data, isLoading } = useQuery({
    queryKey: ["class-overview"],
    queryFn: getClassOverview,
    staleTime: 120_000,
  });

  // ── Render sub-views ──────────────────────────────────────────────────────
  if (current.view === "class-subjects") {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <ClassBranchesView
          program={current.program}
          onBack={goBack}
          onSelectSubject={(subject) =>
            navigate({ view: "subject-branches", program: current.program, subject })
          }
        />
      </div>
    );
  }

  if (current.view === "subject-branches") {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <SubjectBranchesView
          program={current.program}
          subject={current.subject}
          onBack={goBack}
          onSelectBranch={(branch) =>
            navigate({
              view: "subject-branch-students",
              program: current.program,
              subject: current.subject,
              branch,
            })
          }
        />
      </div>
    );
  }

  if (current.view === "subject-branch-students") {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <SubjectBranchStudentsView
          program={current.program}
          subject={current.subject}
          branch={current.branch}
          onBack={goBack}
        />
      </div>
    );
  }

  // ── Level 1: Class Overview ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="h-8 w-64 bg-surface rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
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

  const classes = data?.classes ?? [];
  const overall = data?.overall;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key="class-overview"
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
                Click any class to drill down → subjects → branch-wise comparison
              </p>
            </div>
            <div className="flex items-start gap-2 bg-surface border border-border-light rounded-[10px] px-3 py-2.5 max-w-xs">
              <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">?</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-1">Health score formula</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text-tertiary">
                  <span><span className="font-semibold text-primary">40%</span> Attendance</span>
                  <span><span className="font-semibold text-primary">35%</span> Exam Score</span>
                  <span><span className="font-semibold text-primary">25%</span> Pass Rate</span>
                </div>
              </div>
            </div>
          </div>

          {/* Org-wide Summary */}
          {overall && (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
            >
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-4 h-4 text-text-tertiary" />
                  <span className="text-xs text-text-tertiary font-medium">Classes</span>
                </div>
                <p className="text-2xl font-bold text-primary">{classes.length}</p>
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
                  <span className="text-xs text-text-tertiary font-medium">Attendance</span>
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
              <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-error" />
                  <span className="text-xs text-text-tertiary font-medium">At Risk</span>
                </div>
                <p className="text-2xl font-bold text-error">{overall.chronic_absentees}</p>
                <p className="text-xs text-text-tertiary mt-0.5">chronic absentees</p>
              </motion.div>
            </motion.div>
          )}

          {/* Class Cards */}
          {classes.length === 0 ? (
            <div className="bg-surface rounded-[12px] p-10 text-center border border-border-light">
              <GraduationCap className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
              <p className="text-text-secondary font-medium text-lg">No class data found</p>
              <p className="text-text-tertiary text-sm mt-1">
                Ensure Student Groups have a Program assigned in Frappe
              </p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {classes.map((cls) => {
                const health = Math.round(
                  safeNum(cls.avg_attendance_pct) * 0.4 +
                  safeNum(cls.avg_exam_score_pct) * 0.35 +
                  safeNum(cls.pass_rate) * 0.25,
                );
                const healthColor = health >= 70 ? "text-success" : health >= 50 ? "text-warning" : "text-error";
                const healthBg = health >= 70 ? "bg-success/10" : health >= 50 ? "bg-warning/10" : "bg-error/10";

                return (
                  <motion.button
                    key={cls.program}
                    variants={item}
                    onClick={() => navigate({ view: "class-subjects", program: cls.program })}
                    className="text-left bg-surface rounded-[12px] border border-border-light overflow-hidden hover:border-primary/30 hover:shadow-md transition-all group"
                  >
                    {/* Card Header */}
                    <div className="p-4 border-b border-border-light flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-[10px] flex items-center justify-center text-sm font-bold ${healthBg} ${healthColor}`}>
                          {health}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-primary group-hover:text-primary/80 transition-colors">
                            {cls.program}
                          </p>
                          <p className="text-xs text-text-tertiary">
                            {cls.total_students} students · {cls.total_branches}{" "}
                            {cls.total_branches === 1 ? "branch" : "branches"} · {cls.total_batches} batches
                          </p>
                        </div>
                      </div>
                      <BookOpen className="w-4 h-4 text-text-tertiary group-hover:text-primary transition-colors" />
                    </div>

                    {/* Metrics */}
                    <div className="p-4 grid grid-cols-3 gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <ClipboardCheck className="w-3 h-3 text-text-tertiary" />
                          <span className="text-xs text-text-tertiary">Attendance</span>
                        </div>
                        <p className={`text-lg font-bold ${pctColor(safeNum(cls.avg_attendance_pct))}`}>
                          {safeNum(cls.avg_attendance_pct)}%
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <BarChart3 className="w-3 h-3 text-text-tertiary" />
                          <span className="text-xs text-text-tertiary">Avg Score</span>
                        </div>
                        <p className={`text-lg font-bold ${pctColor(safeNum(cls.avg_exam_score_pct), 60, 40)}`}>
                          {safeNum(cls.avg_exam_score_pct)}%
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Trophy className="w-3 h-3 text-text-tertiary" />
                          <span className="text-xs text-text-tertiary">Pass Rate</span>
                        </div>
                        <p className={`text-lg font-bold ${pctColor(safeNum(cls.pass_rate))}`}>
                          {safeNum(cls.pass_rate)}%
                        </p>
                      </div>
                    </div>

                    {/* Branches + At-Risk Row */}
                    <div className="px-4 pb-3 flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-app-bg rounded-[6px] px-2.5 py-1.5">
                        <Building2 className="w-3 h-3 text-text-tertiary" />
                        <span className="text-xs text-text-tertiary">{cls.total_branches} branches</span>
                      </div>
                      {cls.chronic_absentees > 0 && (
                        <div className="flex items-center gap-1.5 bg-error/5 rounded-[6px] px-2.5 py-1.5">
                          <AlertTriangle className="w-3 h-3 text-error" />
                          <span className="text-xs text-error font-medium">{cls.chronic_absentees} at risk</span>
                        </div>
                      )}
                    </div>

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
              })}
            </motion.div>
          )}

          {/* Quick Comparison Table */}
          {classes.length > 1 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Class Comparison
              </h2>
              <div className="bg-surface rounded-[12px] border border-border-light overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-app-bg border-b border-border-light">
                        <th className="text-left p-3 font-medium text-text-secondary">Class</th>
                        <th className="text-center p-3 font-medium text-text-secondary">Branches</th>
                        <th className="text-center p-3 font-medium text-text-secondary">Students</th>
                        <th className="text-center p-3 font-medium text-text-secondary">Attendance</th>
                        <th className="text-center p-3 font-medium text-text-secondary">Avg Score</th>
                        <th className="text-center p-3 font-medium text-text-secondary">Pass Rate</th>
                        <th className="text-center p-3 font-medium text-text-secondary">At Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map((cls) => (
                        <tr
                          key={cls.program}
                          onClick={() => navigate({ view: "class-subjects", program: cls.program })}
                          className="border-b border-border-light last:border-0 hover:bg-app-bg transition-colors cursor-pointer"
                        >
                          <td className="p-3 font-semibold text-primary">{cls.program}</td>
                          <td className="p-3 text-center text-text-secondary">{cls.total_branches}</td>
                          <td className="p-3 text-center text-text-secondary">{cls.total_students}</td>
                          <td className="p-3 text-center">
                            <span className={`font-medium ${pctColor(safeNum(cls.avg_attendance_pct))}`}>
                              {safeNum(cls.avg_attendance_pct)}%
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`font-medium ${pctColor(safeNum(cls.avg_exam_score_pct), 60, 40)}`}>
                              {safeNum(cls.avg_exam_score_pct)}%
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${pctBadgeColor(safeNum(cls.pass_rate))}`}>
                              {safeNum(cls.pass_rate)}%
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {cls.chronic_absentees > 0 ? (
                              <span className="text-error font-medium">{cls.chronic_absentees}</span>
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
      </AnimatePresence>
    </div>
  );
}
