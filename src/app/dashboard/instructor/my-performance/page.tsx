"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/useAuth";
import { getInstructorAnalytics } from "@/lib/api/analytics";
import { motion } from "framer-motion";
import {
  UserCheck, BookOpen, BarChart3, Calendar,
  CheckCircle2, Clock, Users, TrendingUp,
} from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function InstructorPerformancePage() {
  const { defaultCompany, instructorName, instructorDisplayName } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["instructor-analytics", defaultCompany],
    queryFn: () => getInstructorAnalytics({ branch: defaultCompany }),
    enabled: !!defaultCompany,
    staleTime: 60_000,
  });

  // Find this instructor's data
  const myData = data?.instructors?.find((i) => i.instructor === instructorName) ?? null;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="h-8 w-48 bg-surface rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-surface rounded-[12px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!myData) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-primary mb-4">My Performance</h1>
        <div className="bg-surface rounded-[12px] p-8 text-center border border-border-light">
          <UserCheck className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary font-medium">No performance data found</p>
          <p className="text-sm text-text-tertiary mt-1">
            Data will appear once you have scheduled classes and assessments
          </p>
        </div>
      </div>
    );
  }

  const conductedPct =
    myData.classes_scheduled > 0
      ? Math.round((myData.classes_conducted / myData.classes_scheduled) * 100)
      : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-brand-wash flex items-center justify-center text-xl font-bold text-primary">
          {(instructorDisplayName ?? "I").charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary">My Performance</h1>
          <p className="text-sm text-text-tertiary">{instructorDisplayName} · {myData.batches.length} batches</p>
        </div>
      </div>

      {/* Key Stats */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3"
      >
        <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-text-tertiary" />
            <span className="text-xs text-text-tertiary font-medium">Classes Scheduled</span>
          </div>
          <p className="text-2xl font-bold text-primary">{myData.classes_scheduled}</p>
        </motion.div>

        <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-xs text-text-tertiary font-medium">Classes Conducted</span>
          </div>
          <p className="text-2xl font-bold text-primary">{myData.classes_conducted}</p>
          <div className="mt-2 h-1.5 bg-app-bg rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${conductedPct >= 80 ? "bg-success" : conductedPct >= 60 ? "bg-warning" : "bg-error"}`}
              style={{ width: `${conductedPct}%` }}
            />
          </div>
          <p className="text-xs text-text-tertiary mt-1">{conductedPct}% completion</p>
        </motion.div>

        <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-info" />
            <span className="text-xs text-text-tertiary font-medium">Topic Completion</span>
          </div>
          <p className={`text-2xl font-bold ${myData.topic_completion_pct >= 70 ? "text-success" : "text-warning"}`}>
            {myData.topic_completion_pct}%
          </p>
          <div className="mt-2 h-1.5 bg-app-bg rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${myData.topic_completion_pct >= 70 ? "bg-success" : "bg-warning"}`}
              style={{ width: `${myData.topic_completion_pct}%` }}
            />
          </div>
        </motion.div>

        <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-text-tertiary" />
            <span className="text-xs text-text-tertiary font-medium">Batches Assigned</span>
          </div>
          <p className="text-2xl font-bold text-primary">{myData.batches.length}</p>
        </motion.div>
      </motion.div>

      {/* Batch-wise Breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Batch-wise Performance
        </h2>
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          {myData.batches.map((batch) => (
            <motion.div
              key={batch.student_group}
              variants={item}
              className="bg-surface rounded-[12px] border border-border-light p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-primary">{batch.student_group}</p>
                  <p className="text-xs text-text-tertiary">{batch.course}</p>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  batch.pass_rate >= 75 ? "bg-success/10 text-success"
                  : batch.pass_rate >= 50 ? "bg-warning/10 text-warning"
                  : batch.pass_rate >= 0 && batch.pass_rate !== undefined ? "bg-error/10 text-error"
                  : "bg-app-bg text-text-tertiary"
                }`}>
                  {batch.pass_rate !== undefined ? `${batch.pass_rate}% pass` : "No exams"}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-primary">{batch.classes_conducted}</p>
                  <p className="text-xs text-text-tertiary">Classes</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-primary">{batch.topics_completed}</p>
                  <p className="text-xs text-text-tertiary">Topics Done</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-bold ${
                    batch.avg_score_pct >= 60 ? "text-success" : batch.avg_score_pct >= 33 ? "text-warning" : "text-text-secondary"
                  }`}>
                    {batch.avg_score_pct > 0 ? `${batch.avg_score_pct}%` : "—"}
                  </p>
                  <p className="text-xs text-text-tertiary">Avg Score</p>
                </div>
              </div>

              {/* Topic completion bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-text-tertiary mb-1">
                  <span>Topic Progress</span>
                  <span>{batch.topics_completed}/{batch.topics_total}</span>
                </div>
                <div className="h-1.5 bg-app-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: `${batch.topics_total > 0 ? (batch.topics_completed / batch.topics_total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Encouragement Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-brand-wash rounded-[12px] p-5 border border-primary/10"
      >
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-primary" />
          <div>
            <p className="text-sm font-semibold text-primary">Performance Summary</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {conductedPct >= 80 && myData.topic_completion_pct >= 70
                ? "Great job! You're on track with classes and topic coverage."
                : conductedPct >= 60
                ? "Good progress. Try to improve your topic completion rate."
                : "You have pending classes. Regular sessions help students perform better."}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
