"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/useAuth";
import { getStudentPerformance } from "@/lib/api/analytics";
import { getStudentGroups, getStudentGroup } from "@/lib/api/enrollment";
import { motion } from "framer-motion";
import {
  Users, Search, ChevronRight, GraduationCap,
  ClipboardCheck, TrendingUp, TrendingDown, Minus,
  BookOpen, AlertTriangle,
} from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function StudentPerformancePage() {
  const { defaultCompany } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [search, setSearch] = useState("");

  // Fetch student groups for this branch
  const { data: groupsData } = useQuery({
    queryKey: ["student-groups-perf", defaultCompany],
    queryFn: () => getStudentGroups({ custom_branch: defaultCompany }),
    enabled: !!defaultCompany,
    staleTime: 120_000,
  });

  // Fetch students in selected group
  const { data: groupDetail } = useQuery({
    queryKey: ["student-group-detail", selectedGroup],
    queryFn: () => getStudentGroup(selectedGroup),
    enabled: !!selectedGroup,
    staleTime: 120_000,
  });

  const students = useMemo(() => {
    return groupDetail?.data?.students ?? [];
  }, [groupDetail]);

  const filteredStudents = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s: { student: string; student_name?: string }) =>
        (s.student_name ?? "").toLowerCase().includes(q) || s.student?.toLowerCase().includes(q),
    );
  }, [students, search]);

  // Fetch individual student performance
  const { data: perfData, isLoading: perfLoading } = useQuery({
    queryKey: ["student-performance", selectedStudent, selectedGroup],
    queryFn: () => getStudentPerformance({ student: selectedStudent, student_group: selectedGroup }),
    enabled: !!selectedStudent && !!selectedGroup,
    staleTime: 60_000,
  });

  const groups = groupsData?.data ?? [];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">Student Performance</h1>
        <p className="text-sm text-text-tertiary mt-0.5">
          Deep-dive into individual student attendance, exam results & trends
        </p>
      </div>

      {/* Batch + Student Selection */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selectedGroup}
          onChange={(e) => {
            setSelectedGroup(e.target.value);
            setSelectedStudent("");
          }}
          className="px-3 py-2.5 bg-surface rounded-[10px] border border-border-input text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[200px]"
        >
          <option value="">Select Batch</option>
          {groups.map((g: { name: string; student_group_name?: string; program?: string }) => (
            <option key={g.name} value={g.name}>
              {g.student_group_name || g.name} — {g.program || ""}
            </option>
          ))}
        </select>

        {selectedGroup && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-surface rounded-[10px] border border-border-input text-sm text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}
      </div>

      {/* Student List (when batch selected but no student) */}
      {selectedGroup && !selectedStudent && (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-1">
          {filteredStudents.length === 0 ? (
            <div className="bg-surface rounded-[12px] p-8 text-center border border-border-light">
              <Users className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
              <p className="text-text-tertiary text-sm">
                {students.length === 0 ? "No students in this batch" : "No matching students"}
              </p>
            </div>
          ) : (
            filteredStudents.map((s: { student: string; student_name?: string }) => (
              <motion.button
                key={s.student}
                variants={item}
                onClick={() => setSelectedStudent(s.student)}
                className="w-full flex items-center justify-between p-3 bg-surface rounded-[10px] border border-border-light hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-wash flex items-center justify-center text-xs font-bold text-primary">
                    {(s.student_name ?? "?").charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-primary">{s.student_name ?? s.student}</p>
                    <p className="text-xs text-text-tertiary">{s.student}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-tertiary" />
              </motion.button>
            ))
          )}
        </motion.div>
      )}

      {/* No Selection State */}
      {!selectedGroup && (
        <div className="bg-surface rounded-[12px] p-12 text-center border border-border-light">
          <GraduationCap className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary font-medium">Select a batch to view student performance</p>
          <p className="text-sm text-text-tertiary mt-1">Choose a batch from the dropdown above</p>
        </div>
      )}

      {/* Student Performance Detail */}
      {selectedStudent && (
        <div className="space-y-6">
          {/* Back button */}
          <button
            onClick={() => setSelectedStudent("")}
            className="text-sm text-primary hover:underline"
          >
            ← Back to student list
          </button>

          {perfLoading ? (
            <div className="space-y-4">
              <div className="h-10 w-48 bg-surface rounded animate-pulse" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-surface rounded-[12px] animate-pulse" />
                ))}
              </div>
            </div>
          ) : perfData ? (
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
              {/* Student Info */}
              <motion.div variants={item} className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-brand-wash flex items-center justify-center text-xl font-bold text-primary">
                  {perfData.student_name?.charAt(0) ?? "?"}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-primary">{perfData.student_name}</h2>
                  <p className="text-sm text-text-tertiary">{perfData.student} · {perfData.student_group}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {perfData.trend === "improving" && (
                      <span className="flex items-center gap-1 text-xs text-success font-medium bg-success/10 px-2 py-0.5 rounded-full">
                        <TrendingUp className="w-3 h-3" /> Improving
                      </span>
                    )}
                    {perfData.trend === "declining" && (
                      <span className="flex items-center gap-1 text-xs text-error font-medium bg-error/10 px-2 py-0.5 rounded-full">
                        <TrendingDown className="w-3 h-3" /> Declining
                      </span>
                    )}
                    {perfData.trend === "stable" && (
                      <span className="flex items-center gap-1 text-xs text-text-secondary font-medium bg-app-bg px-2 py-0.5 rounded-full">
                        <Minus className="w-3 h-3" /> Stable
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Key Metrics */}
              <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-surface rounded-[12px] p-4 border border-border-light">
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardCheck className="w-4 h-4 text-success" />
                    <span className="text-xs text-text-tertiary font-medium">Attendance</span>
                  </div>
                  <p className={`text-2xl font-bold ${perfData.attendance.pct >= 75 ? "text-success" : perfData.attendance.pct >= 50 ? "text-warning" : "text-error"}`}>
                    {perfData.attendance.pct}%
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {perfData.attendance.present}P · {perfData.attendance.absent}A · {perfData.attendance.late}L
                  </p>
                </div>

                <div className="bg-surface rounded-[12px] p-4 border border-border-light">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    <span className="text-xs text-text-tertiary font-medium">Avg Score</span>
                  </div>
                  <p className={`text-2xl font-bold ${
                    perfData.exams.reduce((acc, e) => acc + e.avg_pct, 0) / Math.max(perfData.exams.length, 1) >= 60
                      ? "text-success" : "text-warning"
                  }`}>
                    {perfData.exams.length > 0
                      ? Math.round(perfData.exams.reduce((acc, e) => acc + e.avg_pct, 0) / perfData.exams.length)
                      : 0}%
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">{perfData.exams.length} exam types</p>
                </div>

                <div className="bg-surface rounded-[12px] p-4 border border-border-light">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-info" />
                    <span className="text-xs text-text-tertiary font-medium">Rank</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {perfData.exams.length > 0 ? `#${perfData.exams[0].rank}` : "N/A"}
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    of {perfData.exams[0]?.total_in_batch ?? 0} students
                  </p>
                </div>

                <div className="bg-surface rounded-[12px] p-4 border border-border-light">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="text-xs text-text-tertiary font-medium">Weaknesses</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">{perfData.weaknesses.length}</p>
                  <p className="text-xs text-text-tertiary mt-0.5 truncate">
                    {perfData.weaknesses.length > 0 ? perfData.weaknesses.join(", ") : "None"}
                  </p>
                </div>
              </motion.div>

              {/* Strengths & Weaknesses */}
              {(perfData.strengths.length > 0 || perfData.weaknesses.length > 0) && (
                <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {perfData.strengths.length > 0 && (
                    <div className="bg-success/5 rounded-[12px] p-4 border border-success/20">
                      <h3 className="text-xs font-semibold text-success mb-2">Strengths</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {perfData.strengths.map((s) => (
                          <span key={s} className="text-xs bg-success/10 text-success px-2 py-1 rounded-full font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {perfData.weaknesses.length > 0 && (
                    <div className="bg-error/5 rounded-[12px] p-4 border border-error/20">
                      <h3 className="text-xs font-semibold text-error mb-2">Needs Improvement</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {perfData.weaknesses.map((w) => (
                          <span key={w} className="text-xs bg-error/10 text-error px-2 py-1 rounded-full font-medium">
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Exam Results per Assessment Group */}
              {perfData.exams.map((exam) => (
                <motion.div key={exam.assessment_group} variants={item} className="bg-surface rounded-[12px] border border-border-light overflow-hidden">
                  <div className="p-4 border-b border-border-light flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-primary">{exam.assessment_group}</h3>
                      <p className="text-xs text-text-tertiary">
                        Rank #{exam.rank} of {exam.total_in_batch} · Avg: {exam.avg_pct}%
                      </p>
                    </div>
                    <span className={`text-lg font-bold ${exam.avg_pct >= 60 ? "text-success" : exam.avg_pct >= 33 ? "text-warning" : "text-error"}`}>
                      {exam.avg_pct}%
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-app-bg border-b border-border-light">
                          <th className="text-left p-3 font-medium text-text-secondary">Subject</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Score</th>
                          <th className="text-center p-3 font-medium text-text-secondary">%</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exam.subjects.map((subj) => (
                          <tr key={subj.course} className="border-b border-border-light last:border-0">
                            <td className="p-3 font-medium text-primary">{subj.course}</td>
                            <td className="p-3 text-center text-text-secondary">
                              {subj.total_score}/{subj.maximum_score}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`font-medium ${subj.pct >= 60 ? "text-success" : subj.pct >= 33 ? "text-warning" : "text-error"}`}>
                                {subj.pct}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                                subj.grade?.startsWith("A") ? "bg-success/10 text-success"
                                : subj.grade?.startsWith("B") ? "bg-info/10 text-info"
                                : subj.grade?.startsWith("C") ? "bg-warning/10 text-warning"
                                : "bg-error/10 text-error"
                              }`}>
                                {subj.grade || "N/A"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              ))}

              {perfData.exams.length === 0 && (
                <div className="bg-surface rounded-[12px] p-8 text-center border border-border-light">
                  <GraduationCap className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                  <p className="text-sm text-text-tertiary">No exam results found for this student</p>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="bg-surface rounded-[12px] p-8 text-center border border-border-light">
              <p className="text-sm text-text-tertiary">No performance data available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
