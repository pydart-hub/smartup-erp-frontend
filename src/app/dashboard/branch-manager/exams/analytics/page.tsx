"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/useAuth";
import { getExamAnalytics } from "@/lib/api/analytics";
import { getAssessmentGroups } from "@/lib/api/assessment";
import { motion } from "framer-motion";
import {
  Trophy, Users, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Search, BarChart3, AlertTriangle,
} from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function ExamAnalyticsPage() {
  const { defaultCompany } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [search, setSearch] = useState("");
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  const { data: groups } = useQuery({
    queryKey: ["assessment-groups"],
    queryFn: getAssessmentGroups,
    staleTime: 120_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["exam-analytics", defaultCompany, selectedGroup],
    queryFn: () =>
      getExamAnalytics({
        branch: defaultCompany,
        assessment_group: selectedGroup || undefined,
      }),
    enabled: !!defaultCompany,
    staleTime: 60_000,
  });

  const filteredBatches = useMemo(() => {
    if (!data?.batches) return [];
    if (!search) return data.batches;
    const q = search.toLowerCase();
    return data.batches.filter((b) => b.student_group.toLowerCase().includes(q));
  }, [data?.batches, search]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="h-8 w-48 bg-surface rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-[12px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const overall = data?.overall ?? { total_exams: 0, total_students_assessed: 0, avg_score_pct: 0, overall_pass_rate: 0 };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">Exam Analytics</h1>
        <p className="text-sm text-text-tertiary mt-0.5">
          Subject-wise performance, grade distribution & weak student identification
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="px-3 py-2.5 bg-surface rounded-[10px] border border-border-input text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Exam Types</option>
          {groups?.map((g) => (
            <option key={g.name} value={g.name}>
              {g.assessment_group_name}
            </option>
          ))}
        </select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search batches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-surface rounded-[10px] border border-border-input text-sm text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-text-tertiary" />
            <span className="text-xs text-text-tertiary font-medium">Total Exams</span>
          </div>
          <p className="text-2xl font-bold text-primary">{overall.total_exams}</p>
        </motion.div>

        <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-text-tertiary" />
            <span className="text-xs text-text-tertiary font-medium">Students Assessed</span>
          </div>
          <p className="text-2xl font-bold text-primary">{overall.total_students_assessed}</p>
        </motion.div>

        <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-xs text-text-tertiary font-medium">Avg Score</span>
          </div>
          <p className={`text-2xl font-bold ${overall.avg_score_pct >= 60 ? "text-success" : overall.avg_score_pct >= 40 ? "text-warning" : "text-error"}`}>
            {overall.avg_score_pct}%
          </p>
        </motion.div>

        <motion.div variants={item} className="bg-surface rounded-[12px] p-4 border border-border-light">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-warning" />
            <span className="text-xs text-text-tertiary font-medium">Pass Rate</span>
          </div>
          <p className={`text-2xl font-bold ${overall.overall_pass_rate >= 75 ? "text-success" : overall.overall_pass_rate >= 50 ? "text-warning" : "text-error"}`}>
            {overall.overall_pass_rate}%
          </p>
        </motion.div>
      </motion.div>

      {/* Batch-wise Results */}
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
        {filteredBatches.length === 0 ? (
          <div className="bg-surface rounded-[12px] p-8 text-center border border-border-light">
            <p className="text-text-tertiary text-sm">No exam data found</p>
          </div>
        ) : (
          filteredBatches.map((batch) => (
            <motion.div
              key={`${batch.student_group}-${batch.assessment_group}`}
              variants={item}
              className="bg-surface rounded-[12px] border border-border-light overflow-hidden"
            >
              {/* Batch header */}
              <button
                onClick={() => {
                  const key = `${batch.student_group}-${batch.assessment_group}`;
                  setExpandedBatch(expandedBatch === key ? null : key);
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-app-bg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-[10px] flex items-center justify-center text-sm font-bold ${
                      batch.overall_avg_pct >= 70
                        ? "bg-success/10 text-success"
                        : batch.overall_avg_pct >= 50
                        ? "bg-warning/10 text-warning"
                        : "bg-error/10 text-error"
                    }`}
                  >
                    {batch.overall_avg_pct}%
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-primary">{batch.student_group}</p>
                    <p className="text-xs text-text-tertiary">
                      {batch.assessment_group} · {batch.total_students} students · {batch.subjects.length} subjects
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    batch.overall_pass_rate >= 75
                      ? "bg-success/10 text-success"
                      : batch.overall_pass_rate >= 50
                      ? "bg-warning/10 text-warning"
                      : "bg-error/10 text-error"
                  }`}>
                    {batch.overall_pass_rate}% pass
                  </span>
                  {batch.weak_students.length > 0 && (
                    <span className="text-xs bg-error/10 text-error px-2 py-0.5 rounded-full font-medium">
                      {batch.weak_students.length} failing
                    </span>
                  )}
                  {expandedBatch === `${batch.student_group}-${batch.assessment_group}` ? (
                    <ChevronUp className="w-4 h-4 text-text-tertiary" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-tertiary" />
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              {expandedBatch === `${batch.student_group}-${batch.assessment_group}` && (
                <div className="border-t border-border-light">
                  {/* Subject-wise Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-app-bg border-b border-border-light">
                          <th className="text-left p-3 font-medium text-text-secondary">Subject</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Students</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Avg Score</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Avg %</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Pass Rate</th>
                          <th className="text-center p-3 font-medium text-text-secondary">High</th>
                          <th className="text-center p-3 font-medium text-text-secondary">Low</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batch.subjects.map((subj) => (
                          <tr key={subj.course} className="border-b border-border-light last:border-0">
                            <td className="p-3 font-medium text-primary">{subj.course}</td>
                            <td className="p-3 text-center text-text-secondary">{subj.total_students}</td>
                            <td className="p-3 text-center text-text-secondary">{subj.avg_score}/{subj.maximum_possible}</td>
                            <td className="p-3 text-center">
                              <span className={`font-medium ${subj.avg_pct >= 60 ? "text-success" : subj.avg_pct >= 40 ? "text-warning" : "text-error"}`}>
                                {subj.avg_pct}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                                subj.pass_rate >= 75 ? "bg-success/10 text-success" : subj.pass_rate >= 50 ? "bg-warning/10 text-warning" : "bg-error/10 text-error"
                              }`}>
                                {subj.pass_rate}%
                              </span>
                            </td>
                            <td className="p-3 text-center text-success font-medium">{subj.max_score}</td>
                            <td className="p-3 text-center text-error font-medium">{subj.min_score}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Grade Distribution */}
                  {batch.subjects.map((subj) => {
                    const totalGrades = Object.values(subj.grade_distribution).reduce((a, b) => a + b, 0);
                    if (totalGrades === 0) return null;
                    return (
                      <div key={`grade-${subj.course}`} className="px-4 py-3 border-t border-border-light">
                        <p className="text-xs font-medium text-text-secondary mb-2">{subj.course} — Grade Distribution</p>
                        <div className="flex gap-1 h-4 rounded-full overflow-hidden">
                          {Object.entries(subj.grade_distribution)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([grade, count]) => {
                              const pct = (count / totalGrades) * 100;
                              const color =
                                grade.startsWith("A") ? "bg-success"
                                : grade.startsWith("B") ? "bg-info"
                                : grade.startsWith("C") ? "bg-warning"
                                : "bg-error";
                              return (
                                <div
                                  key={grade}
                                  className={`${color} relative group`}
                                  style={{ width: `${pct}%` }}
                                  title={`${grade}: ${count} (${Math.round(pct)}%)`}
                                >
                                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-primary text-white text-xs px-2 py-0.5 rounded whitespace-nowrap z-10">
                                    {grade}: {count}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                        <div className="flex gap-3 mt-1.5 flex-wrap">
                          {Object.entries(subj.grade_distribution)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([grade, count]) => (
                              <span key={grade} className="text-xs text-text-tertiary">
                                {grade}: {count}
                              </span>
                            ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Toppers & Weak Students */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-0">
                    {/* Toppers */}
                    <div className="p-4 border-t border-border-light sm:border-r">
                      <h4 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-warning" />
                        Top Performers
                      </h4>
                      {batch.toppers.map((t) => (
                        <div key={t.student} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              t.rank === 1 ? "bg-yellow-100 text-yellow-700"
                              : t.rank === 2 ? "bg-gray-100 text-gray-600"
                              : t.rank === 3 ? "bg-orange-100 text-orange-700"
                              : "bg-app-bg text-text-tertiary"
                            }`}>
                              {t.rank}
                            </span>
                            <span className="text-sm text-primary">{t.student_name}</span>
                          </div>
                          <span className="text-sm font-bold text-success">{t.pct}%</span>
                        </div>
                      ))}
                    </div>

                    {/* Weak Students */}
                    <div className="p-4 border-t border-border-light">
                      <h4 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-error" />
                        Need Attention
                      </h4>
                      {batch.weak_students.length === 0 ? (
                        <p className="text-xs text-text-tertiary">All students passed!</p>
                      ) : (
                        batch.weak_students.map((w) => (
                          <div key={w.student} className="flex items-center justify-between py-1.5">
                            <div>
                              <span className="text-sm text-primary">{w.student_name}</span>
                              <p className="text-xs text-error">
                                Failed: {w.failed_subjects.join(", ")}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-error">{w.pct}%</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
