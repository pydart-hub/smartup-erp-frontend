"use client";

import { useQuery } from "@tanstack/react-query";
import { getSubjectBranchStudents } from "@/lib/api/analytics";
import { pctBadgeColor, pctColor, safeNum } from "@/components/academics/BranchDrillDown";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Medal, Trophy, Users, BarChart3, School } from "lucide-react";

interface Props {
  program: string;
  subject: string;
  branch: string;
  onBack: () => void;
}

export function SubjectBranchStudentsView({ program, subject, branch, onBack }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["subject-branch-students", program, subject, branch],
    queryFn: () => getSubjectBranchStudents(program, subject, branch),
    staleTime: 120_000,
  });

  const branchLabel = branch.replace("Smart Up ", "");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-80 bg-surface rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-surface rounded-[12px] animate-pulse" />
          ))}
        </div>
        <div className="h-72 bg-surface rounded-[12px] animate-pulse" />
      </div>
    );
  }

  const students = data?.students ?? [];
  const overall = data?.overall;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="subject-branch-students"
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
              <span className="text-text-secondary">{program}</span>
              <span>/</span>
              <span className="text-text-secondary">{subject}</span>
              <span>/</span>
              <span className="text-primary font-semibold">{branchLabel}</span>
            </div>
            <p className="text-xs text-text-tertiary">
              Student rankings - {subject} in {branchLabel}
            </p>
          </div>
        </div>

        {overall && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-surface rounded-[12px] p-4 border border-border-light">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs text-text-tertiary font-medium">Students</span>
              </div>
              <p className="text-2xl font-bold text-primary">{overall.total_students}</p>
            </div>
            <div className="bg-surface rounded-[12px] p-4 border border-border-light">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs text-text-tertiary font-medium">Attendance</span>
              </div>
              <p className={`text-2xl font-bold ${pctColor(overall.avg_attendance_pct)}`}>
                {overall.avg_attendance_pct}%
              </p>
            </div>
            <div className="bg-surface rounded-[12px] p-4 border border-border-light">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs text-text-tertiary font-medium">Branch Avg</span>
              </div>
              <p className={`text-2xl font-bold ${pctColor(overall.avg_score_pct, 60, 40)}`}>
                {overall.avg_score_pct}%
              </p>
            </div>
            <div className="bg-surface rounded-[12px] p-4 border border-border-light">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-warning" />
                <span className="text-xs text-text-tertiary font-medium">Pass Rate</span>
              </div>
              <p className={`text-2xl font-bold ${pctColor(overall.pass_rate)}`}>
                {overall.pass_rate}%
              </p>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
            <School className="w-4 h-4" />
            Student Rankings - {branchLabel}
          </h2>

          {students.length === 0 ? (
            <div className="bg-surface rounded-[12px] p-8 text-center border border-border-light">
              <Medal className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary font-medium">No student results found</p>
              <p className="text-xs text-text-tertiary mt-1">
                No subject exam records found for {subject} in {branchLabel}
              </p>
            </div>
          ) : (
            <div className="bg-surface rounded-[12px] border border-border-light overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-app-bg border-b border-border-light">
                      <th className="text-center p-3 font-medium text-text-secondary w-14">#</th>
                      <th className="text-left p-3 font-medium text-text-secondary">Student</th>
                      <th className="text-left p-3 font-medium text-text-secondary">Batch</th>
                      <th className="text-center p-3 font-medium text-text-secondary">Attendance</th>
                      <th className="text-center p-3 font-medium text-text-secondary">Score</th>
                      <th className="text-center p-3 font-medium text-text-secondary">%</th>
                      <th className="text-center p-3 font-medium text-text-secondary">Health</th>
                      <th className="text-center p-3 font-medium text-text-secondary">Grade</th>
                      <th className="text-center p-3 font-medium text-text-secondary">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={`${student.student}-${student.student_group}`} className="border-b border-border-light last:border-0">
                        <td className="p-3 text-center">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              student.rank === 1
                                ? "bg-yellow-100 text-yellow-700"
                                : student.rank === 2
                                ? "bg-gray-100 text-gray-600"
                                : student.rank === 3
                                ? "bg-orange-100 text-orange-700"
                                : "bg-app-bg text-text-tertiary"
                            }`}
                          >
                            #{student.rank}
                          </span>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-primary text-sm">{student.student_name}</p>
                          <p className="text-xs text-text-tertiary">{student.student}</p>
                        </td>
                        <td className="p-3 text-text-secondary text-xs">{student.student_group}</td>
                        <td className="p-3 text-center">
                          <span className={`font-bold ${pctColor(safeNum(student.attendance_pct))}`}>
                            {safeNum(student.attendance_pct)}%
                          </span>
                        </td>
                        <td className="p-3 text-center text-text-secondary">
                          {safeNum(student.score)}/{safeNum(student.maximum_score)}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`font-bold ${pctColor(safeNum(student.percentage), 60, 40)}`}>
                            {safeNum(student.percentage)}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`font-bold ${pctColor(safeNum(student.health_score))}`}>
                            {safeNum(student.health_score)}%
                          </span>
                        </td>
                        <td className="p-3 text-center text-text-secondary font-medium">
                          {student.grade || "-"}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pctBadgeColor(student.passed ? 100 : 0)}`}>
                            {student.passed ? "Pass" : "Fail"}
                          </span>
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
