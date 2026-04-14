"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  ChevronDown,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Target,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  useParentData,
  getLatestEnrollment,
  type ExamResultEntry,
} from "../page";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function gradeVariant(pct: number): "success" | "info" | "warning" | "error" {
  if (pct >= 80) return "success";
  if (pct >= 60) return "info";
  if (pct >= 40) return "warning";
  return "error";
}

function gradeColor(pct: number): string {
  if (pct >= 80) return "bg-success";
  if (pct >= 60) return "bg-info";
  if (pct >= 40) return "bg-warning";
  return "bg-error";
}

interface SubjectGroup {
  course: string;
  displayName: string;
  results: ExamResultEntry[];
  totalScore: number;
  totalMax: number;
  overallPct: number;
  latestGrade: string;
  latestDate: string;
}

interface SubjectTrend {
  course: string;
  displayName: string;
  direction: "improving" | "declining" | "stable";
  change: number; // percentage point change
  scores: { date: string; pct: number }[];
}

function getSubjectTrends(groups: SubjectGroup[]): SubjectTrend[] {
  return groups
    .filter((sg) => sg.results.length >= 2)
    .map((sg) => {
      const chronological = [...sg.results].sort((a, b) => a.schedule_date.localeCompare(b.schedule_date));
      const scores = chronological.map((r) => ({
        date: r.schedule_date,
        pct: r.maximum_score > 0 ? Math.round((r.total_score / r.maximum_score) * 100) : 0,
      }));
      const latest = scores[scores.length - 1].pct;
      const previous = scores[scores.length - 2].pct;
      const change = latest - previous;
      return {
        course: sg.course,
        displayName: sg.displayName,
        direction: change > 3 ? "improving" : change < -3 ? "declining" : "stable",
        change,
        scores,
      };
    });
}

function AIPerformanceSummary({
  childName,
  subjectGroups,
  overallPct,
  totalExams,
  trend,
  results,
}: {
  childName: string;
  subjectGroups: SubjectGroup[];
  overallPct: number;
  totalExams: number;
  trend: "up" | "down" | "same" | null;
  results: ExamResultEntry[];
}) {
  const sortedByPct = [...subjectGroups].sort((a, b) => b.overallPct - a.overallPct);
  const strongSubjects = sortedByPct.filter((s) => s.overallPct >= 80);
  const needsAttention = sortedByPct.filter((s) => s.overallPct < 60);
  const midRange = sortedByPct.filter((s) => s.overallPct >= 60 && s.overallPct < 80);
  const bestSubject = sortedByPct[0];
  const weakestSubject = sortedByPct[sortedByPct.length - 1];
  const subjectTrends = getSubjectTrends(subjectGroups);
  const improvingSubjects = subjectTrends.filter((t) => t.direction === "improving");
  const decliningSubjects = subjectTrends.filter((t) => t.direction === "declining");

  // Topics needing study (from exam data where topic exists)
  const weakTopics: { course: string; topic: string; pct: number }[] = [];
  for (const r of results) {
    if (r.topic && r.maximum_score > 0) {
      const pct = Math.round((r.total_score / r.maximum_score) * 100);
      if (pct < 65) {
        weakTopics.push({ course: r.course.replace(/^\d+\w*\s+/, ""), topic: r.topic, pct });
      }
    }
  }
  weakTopics.sort((a, b) => a.pct - b.pct);

  // Consistency: standard deviation of scores
  const pcts = results.map((r) => r.maximum_score > 0 ? (r.total_score / r.maximum_score) * 100 : 0);
  const mean = pcts.reduce((a, b) => a + b, 0) / (pcts.length || 1);
  const variance = pcts.reduce((a, b) => a + (b - mean) ** 2, 0) / (pcts.length || 1);
  const stdDev = Math.round(Math.sqrt(variance));
  const isConsistent = stdDev < 15;

  // Score gap analysis
  const gap = bestSubject && weakestSubject ? bestSubject.overallPct - weakestSubject.overallPct : 0;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Performance Analysis
          <span className="text-[10px] font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full ml-1">Beta</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
          {/* Overall summary */}
          <div className="flex items-start gap-2.5">
            <div className="w-1 h-full min-h-[20px] rounded-full bg-primary shrink-0 mt-1" />
            <p>
              <span className="font-semibold text-text-primary">{childName}</span> has taken{" "}
              <span className="font-bold text-text-primary">{totalExams} exam{totalExams !== 1 ? "s" : ""}</span> across{" "}
              <span className="font-bold text-text-primary">{subjectGroups.length} subject{subjectGroups.length !== 1 ? "s" : ""}</span> with an overall average of{" "}
              <span className="font-bold text-text-primary">{overallPct}%</span>.
              {trend === "up" && (
                <span className="text-success font-medium"> Performance is on an upward trend — great progress!</span>
              )}
              {trend === "down" && (
                <span className="text-warning font-medium"> Recent scores show a slight dip — needs attention.</span>
              )}
              {trend === "same" && (
                <span className="text-primary font-medium"> Performance has been consistently stable.</span>
              )}
              {!trend && (
                <span className="text-text-tertiary"> More exams needed to determine a trend.</span>
              )}
            </p>
          </div>

          {/* Consistency note */}
          {totalExams >= 3 && (
            <div className="flex items-start gap-2.5">
              <div className="w-1 h-full min-h-[20px] rounded-full bg-info shrink-0 mt-1" />
              <p className="text-xs">
                {isConsistent ? (
                  <>Scores are <span className="font-semibold text-success">consistent</span> (±{stdDev}% variation) — {childName} performs reliably across exams.</>
                ) : (
                  <>Scores show <span className="font-semibold text-warning">high variation</span> (±{stdDev}% spread) — performance fluctuates significantly between exams. Regular revision may help stabilize results.</>
                )}
              </p>
            </div>
          )}

          {/* Strengths */}
          {strongSubjects.length > 0 && (
            <div className="bg-success/5 border border-success/15 rounded-[10px] p-3">
              <p className="text-xs font-semibold text-success mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Strongest Subjects
              </p>
              <p className="text-xs text-text-secondary">
                Excelling in{" "}
                {strongSubjects.map((s, i) => (
                  <span key={s.course}>
                    <span className="font-semibold text-text-primary">{s.displayName}</span> ({s.overallPct}%)
                    {i < strongSubjects.length - 1 ? (i === strongSubjects.length - 2 ? " and " : ", ") : ""}
                  </span>
                ))}
                . Keep up the momentum!
              </p>
            </div>
          )}

          {/* Needs attention */}
          {needsAttention.length > 0 && (
            <div className="bg-warning/5 border border-warning/15 rounded-[10px] p-3">
              <p className="text-xs font-semibold text-warning mb-1.5 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Needs Improvement
              </p>
              <p className="text-xs text-text-secondary">
                {needsAttention.map((s, i) => (
                  <span key={s.course}>
                    <span className="font-semibold text-text-primary">{s.displayName}</span> ({s.overallPct}%)
                    {i < needsAttention.length - 1 ? (i === needsAttention.length - 2 ? " and " : ", ") : ""}
                  </span>
                ))}{" "}
                {needsAttention.length === 1 ? "is" : "are"} below 60% — consider extra coaching or dedicated revision sessions.
              </p>
            </div>
          )}

          {/* Mid-range subjects */}
          {midRange.length > 0 && needsAttention.length === 0 && (
            <div className="bg-info/5 border border-info/15 rounded-[10px] p-3">
              <p className="text-xs font-semibold text-info mb-1.5 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Room to Grow
              </p>
              <p className="text-xs text-text-secondary">
                {midRange.map((s, i) => (
                  <span key={s.course}>
                    <span className="font-semibold text-text-primary">{s.displayName}</span> ({s.overallPct}%)
                    {i < midRange.length - 1 ? (i === midRange.length - 2 ? " and " : ", ") : ""}
                  </span>
                ))}{" "}
                {midRange.length === 1 ? "is" : "are"} in the 60-80% range. With a bit more effort, {midRange.length === 1 ? "this subject" : "these subjects"} can reach the top bracket.
              </p>
            </div>
          )}

          {/* Subject trends */}
          {(improvingSubjects.length > 0 || decliningSubjects.length > 0) && (
            <div className="bg-app-bg border border-border-light rounded-[10px] p-3">
              <p className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                Subject Trends
              </p>
              <div className="space-y-1.5">
                {improvingSubjects.map((t) => (
                  <div key={t.course} className="flex items-center gap-2 text-xs">
                    <TrendingUp className="h-3.5 w-3.5 text-success shrink-0" />
                    <span className="font-medium text-text-primary">{t.displayName}</span>
                    <span className="text-success font-semibold">+{t.change}%</span>
                    <span className="text-text-tertiary">improving</span>
                  </div>
                ))}
                {decliningSubjects.map((t) => (
                  <div key={t.course} className="flex items-center gap-2 text-xs">
                    <TrendingDown className="h-3.5 w-3.5 text-error shrink-0" />
                    <span className="font-medium text-text-primary">{t.displayName}</span>
                    <span className="text-error font-semibold">{t.change}%</span>
                    <span className="text-text-tertiary">declining</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weak topics */}
          {weakTopics.length > 0 && (
            <div className="bg-app-bg border border-border-light rounded-[10px] p-3">
              <p className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-primary" />
                Topics to Focus On
              </p>
              <div className="space-y-1.5">
                {weakTopics.slice(0, 5).map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-warning font-bold w-9 text-right shrink-0">{t.pct}%</span>
                    <span className="text-text-tertiary">•</span>
                    <span className="text-text-secondary">
                      <span className="font-medium text-text-primary">{t.topic}</span>
                      <span className="text-text-tertiary"> ({t.course})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Score gap analysis */}
          {gap > 25 && bestSubject && weakestSubject && (
            <div className="flex items-start gap-2.5">
              <div className="w-1 h-full min-h-[20px] rounded-full bg-warning shrink-0 mt-1" />
              <p className="text-xs">
                There&apos;s a <span className="font-semibold text-warning">{gap}% gap</span> between the best ({bestSubject.displayName}: {bestSubject.overallPct}%) and weakest ({weakestSubject.displayName}: {weakestSubject.overallPct}%) subjects. Balancing study time more evenly could improve overall results.
              </p>
            </div>
          )}

          {/* Recommendation */}
          <div className="flex items-start gap-2.5 pt-1 border-t border-border-light">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-text-tertiary">
              <span className="font-semibold text-text-secondary">Recommendation:</span>{" "}
              {needsAttention.length > 0
                ? `Prioritize ${needsAttention[0].displayName} with extra practice and revision. ${weakTopics.length > 0 ? `Start with weak topics like "${weakTopics[0].topic}".` : "Review past exam papers to identify recurring mistakes."}`
                : overallPct >= 80
                ? `${childName} is performing excellently! Encourage participation in advanced topics and competitive practice to stay sharp.`
                : midRange.length > 0
                ? `Focus on pushing ${midRange[0].displayName} above 80% with targeted revision. Small, consistent improvements will make a big difference.`
                : `Keep up the good work! Regular revision and practice will help maintain and improve performance.`
              }
              {decliningSubjects.length > 0 && ` Pay special attention to ${decliningSubjects[0].displayName} where scores have been dropping recently.`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function groupBySubject(results: ExamResultEntry[]): SubjectGroup[] {
  const map = new Map<string, ExamResultEntry[]>();
  for (const r of results) {
    const arr = map.get(r.course) ?? [];
    arr.push(r);
    map.set(r.course, arr);
  }
  return [...map.entries()]
    .map(([course, items]) => {
      const sorted = [...items].sort((a, b) => b.schedule_date.localeCompare(a.schedule_date));
      const totalScore = items.reduce((s, r) => s + r.total_score, 0);
      const totalMax = items.reduce((s, r) => s + r.maximum_score, 0);
      const overallPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
      return {
        course,
        displayName: course.replace(/^\d+\w*\s+/, ""),
        results: sorted,
        totalScore,
        totalMax,
        overallPct,
        latestGrade: sorted[0]?.grade ?? "",
        latestDate: sorted[0]?.schedule_date ?? "",
      };
    })
    .sort((a, b) => b.latestDate.localeCompare(a.latestDate));
}

export default function ParentPerformancePage() {
  const { user } = useAuth();
  const { data, isLoading } = useParentData(user?.email);
  const [selectedChild, setSelectedChild] = useState<string>("all");
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const children = data?.children ?? [];

  // Get exam results for selected child(ren)
  const targetChildren = selectedChild === "all"
    ? children
    : children.filter((c) => c.name === selectedChild);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Exam Performance
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Detailed exam results and academic progress
          </p>
        </div>

        {children.length > 1 && (
          <div className="relative">
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="h-10 rounded-[10px] border border-border-input bg-surface px-4 pr-8 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
            >
              <option value="all">All Children</option>
              {children.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.student_name}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-border-light rounded-[14px] animate-pulse" />
          ))}
        </div>
      ) : (
        targetChildren.map((child) => {
          const enrollment = getLatestEnrollment(data, child.name);
          const results = (data?.examResults?.[child.name] ?? []) as ExamResultEntry[];
          const subjectGroups = groupBySubject(results);

          // Overall stats
          const totalExams = results.length;
          const overallScore = results.reduce((s, r) => s + r.total_score, 0);
          const overallMax = results.reduce((s, r) => s + r.maximum_score, 0);
          const overallPct = overallMax > 0 ? Math.round((overallScore / overallMax) * 100) : 0;

          // Trend: compare latest two exam dates across all subjects
          const sorted = [...results].sort((a, b) => b.schedule_date.localeCompare(a.schedule_date));
          let trend: "up" | "down" | "same" | null = null;
          if (sorted.length >= 2) {
            const pA = sorted[0].maximum_score > 0 ? (sorted[0].total_score / sorted[0].maximum_score) * 100 : 0;
            const pB = sorted[1].maximum_score > 0 ? (sorted[1].total_score / sorted[1].maximum_score) * 100 : 0;
            const diff = pA - pB;
            trend = diff > 2 ? "up" : diff < -2 ? "down" : "same";
          }

          return (
            <motion.div key={child.name} variants={item} className="space-y-4">
              {/* Child Header */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    {child.student_name}
                    <span className="text-sm font-normal text-text-secondary ml-2">
                      {enrollment?.program || child.custom_branch?.replace("Smart Up ", "")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {results.length === 0 ? (
                    <p className="text-sm text-text-secondary text-center py-6">
                      No exam results available yet.
                    </p>
                  ) : (
                    <div className="space-y-5">
                      {/* Overall Performance Summary */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-app-bg rounded-[10px] p-3 border border-border-light text-center">
                          <p className="text-xs text-text-tertiary">Exams Taken</p>
                          <p className="text-xl font-bold text-text-primary">{totalExams}</p>
                        </div>
                        <div className={`rounded-[10px] p-3 text-center ${
                          overallPct >= 80 ? "bg-success-light" :
                          overallPct >= 60 ? "bg-info-light" :
                          overallPct >= 40 ? "bg-warning-light" : "bg-error-light"
                        }`}>
                          <p className="text-xs text-text-secondary">Overall Average</p>
                          <p className="text-xl font-bold text-text-primary">{overallPct}%</p>
                        </div>
                        <div className="bg-app-bg rounded-[10px] p-3 border border-border-light text-center">
                          <p className="text-xs text-text-tertiary">Latest Score</p>
                          <p className="text-xl font-bold text-text-primary">
                            {sorted[0] && sorted[0].maximum_score > 0
                              ? Math.round((sorted[0].total_score / sorted[0].maximum_score) * 100)
                              : 0}%
                          </p>
                        </div>
                        <div className="bg-app-bg rounded-[10px] p-3 border border-border-light text-center">
                          <p className="text-xs text-text-tertiary">Trend</p>
                          <div className="flex items-center justify-center gap-1 mt-1">
                            {trend === "up" && <TrendingUp className="h-5 w-5 text-success" />}
                            {trend === "down" && <TrendingDown className="h-5 w-5 text-error" />}
                            {trend === "same" && <Minus className="h-5 w-5 text-text-tertiary" />}
                            {!trend && <span className="text-sm text-text-tertiary">—</span>}
                            {trend && (
                              <span className={`text-sm font-semibold ${
                                trend === "up" ? "text-success" :
                                trend === "down" ? "text-error" : "text-text-tertiary"
                              }`}>
                                {trend === "up" ? "Improving" : trend === "down" ? "Declining" : "Stable"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Subject-wise Results */}
                      <div className="space-y-3">
                        {subjectGroups.map((sg) => {
                          const isExpanded = expandedSubject === `${child.name}-${sg.course}`;
                          return (
                            <div key={sg.course} className="border border-border-light rounded-[12px] overflow-hidden">
                              {/* Subject header — always clickable */}
                              <button
                                onClick={() => setExpandedSubject(isExpanded ? null : `${child.name}-${sg.course}`)}
                                className="w-full flex items-center justify-between p-4 bg-app-bg hover:bg-brand-wash/20 transition-colors text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                    sg.overallPct >= 80 ? "bg-success-light" :
                                    sg.overallPct >= 60 ? "bg-info-light" :
                                    sg.overallPct >= 40 ? "bg-warning-light" : "bg-error-light"
                                  }`}>
                                    <span className="text-xs font-bold">{sg.overallPct}%</span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-text-primary">{sg.displayName}</p>
                                    <p className="text-xs text-text-secondary">
                                      {sg.results.length} exam{sg.results.length !== 1 ? "s" : ""}
                                      {sg.latestDate && (
                                        <> · Last: {new Date(sg.latestDate).toLocaleDateString("en-IN", {
                                          day: "numeric", month: "short",
                                        })}</>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge variant={gradeVariant(sg.overallPct)}>
                                    {sg.latestGrade}
                                  </Badge>
                                  <span className="text-sm font-semibold text-text-secondary tabular-nums">
                                    {sg.totalScore}/{sg.totalMax}
                                  </span>
                                  <ChevronDown className={`h-4 w-4 text-text-tertiary transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                </div>
                              </button>

                              {/* Individual exam breakdown */}
                              {isExpanded && (
                                <div className="border-t border-border-light divide-y divide-border-light">
                                  {sg.results.map((r) => {
                                    const pct = r.maximum_score > 0 ? Math.round((r.total_score / r.maximum_score) * 100) : 0;
                                    return (
                                      <div key={r.name} className="px-4 py-3 flex items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-text-primary">{r.assessment_group}</p>
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                            {r.topic && (
                                              <>
                                                <BookOpen className="h-3 w-3 text-primary shrink-0" />
                                                <span className="text-xs text-primary">{r.topic}</span>
                                              </>
                                            )}
                                            {r.schedule_date && (
                                              <span className="text-xs text-text-tertiary">
                                                {r.topic && "· "}
                                                <Calendar className="h-3 w-3 inline mr-0.5" />
                                                {new Date(r.schedule_date).toLocaleDateString("en-IN", {
                                                  day: "numeric", month: "short", year: "numeric",
                                                })}
                                              </span>
                                            )}
                                          </div>
                                          <div className="w-full max-w-[160px] h-1.5 bg-border-light rounded-full mt-1.5 overflow-hidden">
                                            <div
                                              className={`h-full rounded-full ${gradeColor(pct)}`}
                                              style={{ width: `${pct}%` }}
                                            />
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="text-sm text-text-secondary tabular-nums">{r.total_score}/{r.maximum_score}</span>
                                          <span className="text-sm text-text-secondary w-9 text-right tabular-nums">{pct}%</span>
                                          <Badge variant={gradeVariant(pct)}>{r.grade}</Badge>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Performance Analysis — below exam marks */}
              {results.length > 0 && (
                <AIPerformanceSummary
                  childName={child.student_name}
                  subjectGroups={subjectGroups}
                  overallPct={overallPct}
                  totalExams={totalExams}
                  trend={trend}
                  results={results}
                />
              )}
            </motion.div>
          );
        })
      )}
    </motion.div>
  );
}
