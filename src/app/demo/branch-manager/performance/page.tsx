"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Award,
  BookOpen,
  Users,
  ChevronRight,
  Search,
  BarChart3,
  Target,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  DEMO_STUDENTS,
  DEMO_BATCHES,
  DEMO_EXAMS,
  getExamsForStudent,
  getStudentAvgPercent,
  getSubjectAverages,
  getBranchSubjectAverages,
  getBatchAverages,
  getPerformanceRating,
  type DemoExam,
} from "../demoData";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-border-light rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold text-text-primary w-9 text-right">{value}%</span>
    </div>
  );
}

function GradeColor({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    "A+": "text-success bg-success-light",
    A: "text-success bg-success-light",
    "B+": "text-primary bg-primary-light",
    B: "text-info bg-info-light",
    C: "text-warning bg-warning-light",
    D: "text-error bg-error-light",
    F: "text-error bg-error-light",
  };
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${colors[grade] ?? "text-text-secondary bg-border-light"}`}>
      {grade}
    </span>
  );
}

function barColor(pct: number) {
  if (pct >= 80) return "bg-success";
  if (pct >= 60) return "bg-primary";
  if (pct >= 40) return "bg-warning";
  return "bg-error";
}

export default function DemoBMPerformancePage() {
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("All");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const activeStudents = DEMO_STUDENTS.filter((s) => s.enabled);
  const branchSubjects = getBranchSubjectAverages();
  const batchAvgs = getBatchAverages();

  // Branch-level stats
  const branchAvg = activeStudents.length > 0
    ? Math.round(activeStudents.reduce((s, st) => s + getStudentAvgPercent(st.id), 0) / activeStudents.length)
    : 0;
  const toppers = [...activeStudents].sort((a, b) => getStudentAvgPercent(b.id) - getStudentAvgPercent(a.id));
  const aboveAvg = activeStudents.filter((s) => getStudentAvgPercent(s.id) >= 70).length;
  const needsImprv = activeStudents.filter((s) => getStudentAvgPercent(s.id) < 55).length;

  // Filter students for the table
  const filtered = activeStudents.filter((s) => {
    if (batchFilter !== "All" && s.batch !== batchFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => getStudentAvgPercent(b.id) - getStudentAvgPercent(a.id));

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-text-primary">Student Performance</h1>
        <p className="text-sm text-text-secondary mt-1">Branch-wide academic performance overview</p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{branchAvg}%</p>
            <p className="text-xs text-text-tertiary">Branch Average</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="h-5 w-5 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{aboveAvg}</p>
            <p className="text-xs text-text-tertiary">Above 70%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{needsImprv}</p>
            <p className="text-xs text-text-tertiary">Below 55%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-info mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{activeStudents.length}</p>
            <p className="text-xs text-text-tertiary">Active Students</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top 3 Performers */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {toppers.slice(0, 3).map((student, idx) => {
                const avg = getStudentAvgPercent(student.id);
                const rating = getPerformanceRating(avg);
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div key={student.id} className="bg-app-bg rounded-[10px] border border-border-light p-4 flex items-center gap-3">
                    <span className="text-2xl">{medals[idx]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{student.name}</p>
                      <p className="text-xs text-text-tertiary">{student.class}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-text-primary">{avg}%</p>
                      <p className={`text-[10px] font-semibold ${rating.color}`}>{rating.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Batch-wise Performance */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Batch-wise Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {batchAvgs.map((b) => (
                <div key={b.batch} className="flex items-center gap-4">
                  <div className="w-40 shrink-0">
                    <p className="text-sm font-medium text-text-primary">{b.batch}</p>
                    <p className="text-xs text-text-tertiary">{b.count} students</p>
                  </div>
                  <div className="flex-1">
                    <ProgressBar value={b.avgPercent} color={barColor(b.avgPercent)} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Subject-wise Branch Average */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Subject-wise Branch Average
              </CardTitle>
              {branchSubjects.length > 0 && (
                <div className="flex items-center gap-3 text-xs text-text-tertiary">
                  <span>Best: <span className="text-success font-semibold">{branchSubjects[0].subject}</span></span>
                  {branchSubjects.length > 1 && (
                    <span>Weakest: <span className="text-warning font-semibold">{branchSubjects[branchSubjects.length - 1].subject}</span></span>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {branchSubjects.map((sub) => (
                <div key={sub.subject} className="flex items-center gap-4">
                  <span className="text-sm text-text-primary w-36 sm:w-44 shrink-0 truncate">{sub.subject}</span>
                  <div className="flex-1">
                    <ProgressBar value={sub.avgPercent} color={barColor(sub.avgPercent)} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Student-wise Performance Table */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Student-wise Results
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder="Search student..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-2 rounded-[10px] border border-border-light bg-surface text-sm text-text-primary outline-none focus:border-primary w-44"
                  />
                </div>
                <select
                  value={batchFilter}
                  onChange={(e) => setBatchFilter(e.target.value)}
                  className="rounded-[10px] border border-border-light bg-surface text-sm text-text-primary px-3 py-2 outline-none focus:border-primary"
                >
                  <option value="All">All Batches</option>
                  {DEMO_BATCHES.map((b) => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filtered.length === 0 && (
                <p className="text-sm text-text-tertiary text-center py-6">No students match your search.</p>
              )}
              {filtered.map((student, rank) => {
                const avg = getStudentAvgPercent(student.id);
                const rating = getPerformanceRating(avg);
                const exams = getExamsForStudent(student.id);
                const latestExam = exams[exams.length - 1];
                const isExpanded = expandedStudent === student.id;
                const subjectAvgs = getSubjectAverages(student.id);

                return (
                  <div key={student.id} className="rounded-[10px] border border-border-light bg-app-bg overflow-hidden">
                    <button
                      onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                      className="w-full flex items-center gap-3 p-4 text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{rank + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-text-primary truncate">{student.name}</p>
                          <Badge variant="info">{student.class}</Badge>
                        </div>
                        <p className="text-xs text-text-tertiary mt-0.5">
                          {student.batch} · Attendance: {student.attendancePct}%
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-text-primary">{avg}%</p>
                        <p className={`text-[10px] font-semibold ${rating.color}`}>{rating.label}</p>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-text-tertiary transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 border-t border-border-light pt-3 space-y-4">
                            {/* Subject averages */}
                            <div>
                              <p className="text-xs font-semibold text-text-secondary mb-2">Subject Averages</p>
                              <div className="space-y-2">
                                {subjectAvgs.sort((a, b) => b.avgPercent - a.avgPercent).map((sub) => (
                                  <div key={sub.subject} className="flex items-center gap-3">
                                    <span className="text-sm text-text-secondary w-36 sm:w-44 shrink-0 truncate">{sub.subject}</span>
                                    <div className="flex-1">
                                      <ProgressBar value={sub.avgPercent} color={barColor(sub.avgPercent)} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Exam history */}
                            <div>
                              <p className="text-xs font-semibold text-text-secondary mb-2">Exam History</p>
                              <div className="flex items-end gap-2 h-28">
                                {exams.map((exam, idx) => {
                                  const barH = (exam.percentage / 100) * 96;
                                  const prev = idx > 0 ? exams[idx - 1].percentage : null;
                                  const improved = prev !== null && exam.percentage > prev;
                                  const declined = prev !== null && exam.percentage < prev;
                                  return (
                                    <div key={exam.id} className="flex-1 flex flex-col items-center gap-1">
                                      <span className={`text-[10px] font-bold ${improved ? "text-success" : declined ? "text-error" : "text-text-primary"}`}>
                                        {exam.percentage}%
                                      </span>
                                      <div
                                        className={`w-full max-w-[36px] rounded-t-lg ${barColor(exam.percentage)}/70`}
                                        style={{ height: `${barH}px` }}
                                      />
                                      <span className="text-[9px] text-text-tertiary text-center leading-tight truncate w-full">{exam.name}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Latest exam detail */}
                            {latestExam && (
                              <div className="flex items-center gap-2 bg-surface rounded-lg p-3 border border-border-light">
                                <GradeColor grade={latestExam.grade} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-text-primary">{latestExam.name}</p>
                                  <p className="text-xs text-text-tertiary">
                                    {new Date(latestExam.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                    {" · "}
                                    {latestExam.totalObtained}/{latestExam.totalMax} marks
                                  </p>
                                </div>
                                <span className="text-sm font-bold text-text-primary">{latestExam.percentage}%</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
