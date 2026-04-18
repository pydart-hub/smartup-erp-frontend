"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/useAuth";
import { getAttendanceAnalytics } from "@/lib/api/analytics";
import { getExamAnalytics } from "@/lib/api/analytics";
import { getInstructorAnalytics } from "@/lib/api/analytics";
import { motion } from "framer-motion";
import {
  ClipboardCheck, BookOpen, GraduationCap, Trophy,
  AlertTriangle, UserCheck, TrendingUp, ArrowRight,
} from "lucide-react";
import Link from "next/link";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function AcademicsOverviewPage() {
  const { defaultCompany } = useAuth();

  const dateRange = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setMonth(to.getMonth() - 1);
    return {
      from_date: from.toISOString().split("T")[0],
      to_date: to.toISOString().split("T")[0],
    };
  }, []);

  const { data: attData, isLoading: attLoading } = useQuery({
    queryKey: ["academics-attendance", defaultCompany, dateRange],
    queryFn: () => getAttendanceAnalytics({ branch: defaultCompany, ...dateRange }),
    enabled: !!defaultCompany,
    staleTime: 120_000,
  });

  const { data: examData, isLoading: examLoading } = useQuery({
    queryKey: ["academics-exams", defaultCompany],
    queryFn: () => getExamAnalytics({ branch: defaultCompany }),
    enabled: !!defaultCompany,
    staleTime: 120_000,
  });

  const { data: instrData, isLoading: instrLoading } = useQuery({
    queryKey: ["academics-instructors", defaultCompany],
    queryFn: () => getInstructorAnalytics({ branch: defaultCompany }),
    enabled: !!defaultCompany,
    staleTime: 120_000,
  });

  const isLoading = attLoading || examLoading || instrLoading;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="h-8 w-64 bg-surface rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-surface rounded-[12px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const att = attData?.overall ?? { total_students: 0, avg_attendance_pct: 0, total_working_days: 0 };
  const exam = examData?.overall ?? { total_exams: 0, total_students_assessed: 0, avg_score_pct: 0, overall_pass_rate: 0 };
  const instr = instrData?.overall ?? { total_instructors: 0, avg_topic_completion_pct: 0, avg_classes_conducted_pct: 0 };
  const chronicCount = attData?.chronic_absentees?.length ?? 0;

  // Top performing batches by exam
  const topBatches = examData?.batches
    ?.sort((a, b) => b.overall_avg_pct - a.overall_avg_pct)
    .slice(0, 5) ?? [];

  // Top instructors
  const topInstructors = instrData?.instructors
    ?.sort((a, b) => b.topic_completion_pct - a.topic_completion_pct)
    .slice(0, 5) ?? [];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">Academics Overview</h1>
        <p className="text-sm text-text-tertiary mt-0.5">
          Attendance, exam performance & instructor metrics at a glance
        </p>
      </div>

      {/* Key Metrics */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-3 gap-3"
      >
        {/* Attendance */}
        <motion.div variants={item}>
          <Link href="/dashboard/branch-manager/attendance/report" className="block bg-surface rounded-[12px] p-4 border border-border-light hover:border-primary/30 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-success" />
                <span className="text-xs text-text-tertiary font-medium">Attendance Rate</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-text-tertiary group-hover:text-primary transition-colors" />
            </div>
            <p className={`text-3xl font-bold ${att.avg_attendance_pct >= 75 ? "text-success" : att.avg_attendance_pct >= 50 ? "text-warning" : "text-error"}`}>
              {att.avg_attendance_pct}%
            </p>
            <p className="text-xs text-text-tertiary mt-1">{att.total_students} students · {att.total_working_days} days</p>
          </Link>
        </motion.div>

        {/* Exam Pass Rate */}
        <motion.div variants={item}>
          <Link href="/dashboard/branch-manager/exams/analytics" className="block bg-surface rounded-[12px] p-4 border border-border-light hover:border-primary/30 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-warning" />
                <span className="text-xs text-text-tertiary font-medium">Exam Pass Rate</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-text-tertiary group-hover:text-primary transition-colors" />
            </div>
            <p className={`text-3xl font-bold ${exam.overall_pass_rate >= 75 ? "text-success" : exam.overall_pass_rate >= 50 ? "text-warning" : "text-error"}`}>
              {exam.overall_pass_rate}%
            </p>
            <p className="text-xs text-text-tertiary mt-1">{exam.total_exams} exams · {exam.total_students_assessed} assessed</p>
          </Link>
        </motion.div>

        {/* Avg Exam Score */}
        <motion.div variants={item}>
          <div className="bg-surface rounded-[12px] p-4 border border-border-light">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4 text-info" />
              <span className="text-xs text-text-tertiary font-medium">Avg Exam Score</span>
            </div>
            <p className="text-3xl font-bold text-primary">{exam.avg_score_pct}%</p>
            <p className="text-xs text-text-tertiary mt-1">Across all subjects</p>
          </div>
        </motion.div>

        {/* Topic Coverage */}
        <motion.div variants={item}>
          <div className="bg-surface rounded-[12px] p-4 border border-border-light">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-xs text-text-tertiary font-medium">Topic Completion</span>
            </div>
            <p className={`text-3xl font-bold ${instr.avg_topic_completion_pct >= 70 ? "text-success" : "text-warning"}`}>
              {instr.avg_topic_completion_pct}%
            </p>
            <p className="text-xs text-text-tertiary mt-1">{instr.total_instructors} instructors</p>
          </div>
        </motion.div>

        {/* Classes Conducted */}
        <motion.div variants={item}>
          <div className="bg-surface rounded-[12px] p-4 border border-border-light">
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="w-4 h-4 text-success" />
              <span className="text-xs text-text-tertiary font-medium">Classes Conducted</span>
            </div>
            <p className="text-3xl font-bold text-primary">{instr.avg_classes_conducted_pct}%</p>
            <p className="text-xs text-text-tertiary mt-1">Of scheduled classes</p>
          </div>
        </motion.div>

        {/* At Risk */}
        <motion.div variants={item}>
          <Link href="/dashboard/branch-manager/attendance/report" className="block bg-surface rounded-[12px] p-4 border border-border-light hover:border-error/30 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-error" />
                <span className="text-xs text-text-tertiary font-medium">At Risk Students</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-text-tertiary group-hover:text-error transition-colors" />
            </div>
            <p className="text-3xl font-bold text-error">{chronicCount}</p>
            <p className="text-xs text-text-tertiary mt-1">&lt;75% attendance</p>
          </Link>
        </motion.div>
      </motion.div>

      {/* Two-column: Top Batches & Top Instructors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Performing Batches */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface rounded-[12px] border border-border-light"
        >
          <div className="flex items-center justify-between p-4 border-b border-border-light">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Performing Batches
            </h3>
            <Link href="/dashboard/branch-manager/exams/analytics" className="text-xs text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="divide-y divide-border-light">
            {topBatches.length === 0 ? (
              <div className="p-6 text-center text-sm text-text-tertiary">No exam data yet</div>
            ) : (
              topBatches.map((b, i) => (
                <div key={b.student_group} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-app-bg text-text-tertiary"
                    }`}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-primary">{b.student_group}</p>
                      <p className="text-xs text-text-tertiary">{b.assessment_group}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${b.overall_avg_pct >= 70 ? "text-success" : b.overall_avg_pct >= 50 ? "text-warning" : "text-error"}`}>
                      {b.overall_avg_pct}%
                    </p>
                    <p className="text-xs text-text-tertiary">{b.overall_pass_rate}% pass</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Top Instructors */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-surface rounded-[12px] border border-border-light"
        >
          <div className="flex items-center justify-between p-4 border-b border-border-light">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Instructor Performance
            </h3>
          </div>
          <div className="divide-y divide-border-light">
            {topInstructors.length === 0 ? (
              <div className="p-6 text-center text-sm text-text-tertiary">No instructor data yet</div>
            ) : (
              topInstructors.map((inst) => (
                <div key={inst.instructor} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium text-primary">{inst.instructor_name}</p>
                    <p className="text-xs text-text-tertiary">
                      {inst.classes_conducted}/{inst.classes_scheduled} classes · {inst.batches.length} batches
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${inst.topic_completion_pct >= 70 ? "text-success" : "text-warning"}`}>
                      {inst.topic_completion_pct}%
                    </p>
                    <p className="text-xs text-text-tertiary">topics covered</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <Link
          href="/dashboard/branch-manager/attendance/report"
          className="bg-surface rounded-[12px] p-4 border border-border-light hover:border-primary/30 transition-colors text-center"
        >
          <ClipboardCheck className="w-5 h-5 text-success mx-auto mb-2" />
          <p className="text-xs font-medium text-primary">Attendance Report</p>
        </Link>
        <Link
          href="/dashboard/branch-manager/exams/analytics"
          className="bg-surface rounded-[12px] p-4 border border-border-light hover:border-primary/30 transition-colors text-center"
        >
          <Trophy className="w-5 h-5 text-warning mx-auto mb-2" />
          <p className="text-xs font-medium text-primary">Exam Analytics</p>
        </Link>
        <Link
          href="/dashboard/branch-manager/exams/results"
          className="bg-surface rounded-[12px] p-4 border border-border-light hover:border-primary/30 transition-colors text-center"
        >
          <GraduationCap className="w-5 h-5 text-info mx-auto mb-2" />
          <p className="text-xs font-medium text-primary">Exam Results</p>
        </Link>
        <Link
          href="/dashboard/branch-manager/student-performance"
          className="bg-surface rounded-[12px] p-4 border border-border-light hover:border-primary/30 transition-colors text-center"
        >
          <TrendingUp className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-xs font-medium text-primary">Student Performance</p>
        </Link>
      </motion.div>
    </div>
  );
}
