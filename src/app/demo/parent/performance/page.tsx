"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Award,
  BookOpen,
  ClipboardCheck,
  ChevronRight,
  Target,
  CheckCircle2,
  AlertCircle,
  Circle,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  DEMO_CHILDREN,
  DEMO_ATTENDANCE,
  DEMO_EXAMS,
  DEMO_SUBJECT_TOPICS,
  getAttendanceStats,
  getExamsForStudent,
  getOverallAvgPercent,
  getSubjectAverages,
  getPerformanceRating,
  getTopicStatus,
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
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold ${colors[grade] ?? "text-text-secondary bg-border-light"}`}>
      {grade}
    </span>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-border-light rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-text-primary w-9 text-right">{pct}%</span>
    </div>
  );
}

function ExamTypeBadge({ type }: { type: DemoExam["type"] }) {
  const variant = type === "Final" ? "error" : type === "Mid Term" ? "warning" : "info";
  return <Badge variant={variant}>{type}</Badge>;
}

export default function DemoPerformancePage() {
  const [selectedChild, setSelectedChild] = useState(DEMO_CHILDREN[0].id);
  const [expandedExam, setExpandedExam] = useState<string | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const child = DEMO_CHILDREN.find((c) => c.id === selectedChild)!;
  const exams = getExamsForStudent(selectedChild);
  const examAvg = getOverallAvgPercent(selectedChild);
  const subjectAvgs = getSubjectAverages(selectedChild);
  const attendance = DEMO_ATTENDANCE[selectedChild] ?? [];
  const attStats = getAttendanceStats(attendance);
  const rating = getPerformanceRating(attStats.pct, examAvg);

  // Best & weakest subjects
  const sorted = [...subjectAvgs].sort((a, b) => b.avgPercent - a.avgPercent);
  const bestSubject = sorted[0];
  const weakestSubject = sorted[sorted.length - 1];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Performance</h1>
          <p className="text-sm text-text-secondary mt-1">Academic performance based on exam marks & attendance</p>
        </div>
        {DEMO_CHILDREN.length > 1 && (
          <select
            value={selectedChild}
            onChange={(e) => { setSelectedChild(e.target.value); setExpandedExam(null); }}
            className="rounded-[10px] border border-border-light bg-surface text-text-primary text-sm px-3 py-2 outline-none focus:border-primary"
          >
            {DEMO_CHILDREN.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.class}</option>
            ))}
          </select>
        )}
      </motion.div>

      {/* Overall Rating Card */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row gap-5">
              {/* Rating badge */}
              <div className="flex flex-col items-center justify-center sm:w-48 shrink-0">
                <div className={`text-3xl font-bold ${rating.color}`}>{rating.label}</div>
                <p className="text-xs text-text-tertiary text-center mt-1">{rating.description}</p>
              </div>

              {/* Score breakdown */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-app-bg rounded-[10px] p-4 border border-border-light text-center">
                  <Award className="h-5 w-5 text-primary mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-text-primary">{examAvg}%</p>
                  <p className="text-xs text-text-tertiary">Exam Average</p>
                </div>
                <div className="bg-app-bg rounded-[10px] p-4 border border-border-light text-center">
                  <ClipboardCheck className="h-5 w-5 text-success mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-text-primary">{attStats.pct}%</p>
                  <p className="text-xs text-text-tertiary">Attendance Rate</p>
                </div>
                <div className="bg-app-bg rounded-[10px] p-4 border border-border-light text-center">
                  <Target className="h-5 w-5 text-info mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-text-primary">{Math.round(attStats.pct * 0.3 + examAvg * 0.7)}%</p>
                  <p className="text-xs text-text-tertiary">Overall Score</p>
                  <p className="text-[10px] text-text-tertiary">(30% attendance + 70% exams)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Subject-wise Analysis */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Subject-wise Average
              </CardTitle>
              <div className="flex items-center gap-3 text-xs text-text-tertiary">
                {bestSubject && (
                  <span>Best: <span className="text-success font-semibold">{bestSubject.subject}</span></span>
                )}
                {weakestSubject && bestSubject?.subject !== weakestSubject.subject && (
                  <span>Needs work: <span className="text-warning font-semibold">{weakestSubject.subject}</span></span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {sorted.map((sub) => {
                const barColor =
                  sub.avgPercent >= 80
                    ? "bg-success"
                    : sub.avgPercent >= 60
                    ? "bg-primary"
                    : sub.avgPercent >= 40
                    ? "bg-warning"
                    : "bg-error";
                const isExpanded = expandedSubject === sub.subject;
                const topics = DEMO_SUBJECT_TOPICS[sub.subject] ?? [];
                const topicsSorted = [...topics].sort((a, b) => b.pct - a.pct);
                const bestTopic = topicsSorted[0];
                const weakTopic = topicsSorted[topicsSorted.length - 1];

                return (
                  <div key={sub.subject} className="rounded-[10px] overflow-hidden">
                    <button
                      onClick={() => setExpandedSubject(isExpanded ? null : sub.subject)}
                      className="w-full flex items-center gap-4 p-2.5 hover:bg-app-bg/60 transition-colors rounded-[10px]"
                    >
                      <span className="text-sm text-text-primary w-36 sm:w-44 shrink-0 truncate text-left">{sub.subject}</span>
                      <div className="flex-1">
                        <ProgressBar value={sub.avgPercent} max={100} color={barColor} />
                      </div>
                      <ChevronRight className={`h-4 w-4 text-text-tertiary transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`} />
                    </button>

                    {isExpanded && topics.length > 0 && (
                      <div className="ml-4 sm:ml-8 mr-2 mb-3 mt-1 p-3 bg-app-bg rounded-[10px] border border-border-light">
                        {/* Quick insight */}
                        <div className="flex flex-wrap gap-3 mb-3 text-xs text-text-tertiary">
                          {bestTopic && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                              Strongest: <span className="text-success font-semibold">{bestTopic.topic}</span>
                              <span className="text-text-tertiary">({bestTopic.pct}%)</span>
                            </span>
                          )}
                          {weakTopic && weakTopic.topic !== bestTopic?.topic && (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-3.5 w-3.5 text-warning" />
                              Focus on: <span className="text-warning font-semibold">{weakTopic.topic}</span>
                              <span className="text-text-tertiary">({weakTopic.pct}%)</span>
                            </span>
                          )}
                        </div>

                        {/* Topic list */}
                        <div className="space-y-2">
                          {topicsSorted.map((t) => {
                            const status = getTopicStatus(t.pct);
                            const statusIcon = status === "mastered"
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                              : status === "good"
                              ? <Circle className="h-3.5 w-3.5 text-primary shrink-0" />
                              : <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />;
                            const statusLabel = status === "mastered" ? "Mastered" : status === "good" ? "Good" : "Needs Study";
                            const tBarColor = status === "mastered" ? "bg-success" : status === "good" ? "bg-primary" : "bg-warning";
                            return (
                              <div key={t.topic} className="flex items-center gap-2.5">
                                {statusIcon}
                                <span className="text-xs text-text-secondary w-44 sm:w-52 shrink-0 truncate">{t.topic}</span>
                                <div className="flex-1 h-1.5 bg-border-light rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${tBarColor}`} style={{ width: `${t.pct}%` }} />
                                </div>
                                <span className="text-xs font-semibold text-text-primary w-9 text-right">{t.pct}%</span>
                                <span className={`text-[10px] w-16 text-right shrink-0 font-medium ${
                                  status === "mastered" ? "text-success" : status === "good" ? "text-primary" : "text-warning"
                                }`}>
                                  {statusLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Exam-wise Results */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Exam Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {exams.map((exam) => {
                const isExpanded = expandedExam === exam.id;
                return (
                  <div key={exam.id} className="rounded-[10px] border border-border-light bg-app-bg overflow-hidden">
                    {/* Exam header */}
                    <button
                      onClick={() => setExpandedExam(isExpanded ? null : exam.id)}
                      className="w-full flex items-center gap-3 p-4 text-left"
                    >
                      <GradeColor grade={exam.grade} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-text-primary">{exam.name}</p>
                          <ExamTypeBadge type={exam.type} />
                        </div>
                        <p className="text-xs text-text-tertiary mt-0.5">
                          {new Date(exam.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          {" • "}
                          {exam.totalObtained}/{exam.totalMax} marks
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-text-primary">{exam.percentage}%</p>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-text-tertiary transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </button>

                    {/* Expanded subject breakdown */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-border-light pt-3">
                        <div className="space-y-2">
                          {exam.subjects.map((sub) => {
                            const subPct = Math.round((sub.obtained / sub.maxMarks) * 100);
                            const barColor =
                              subPct >= 80 ? "bg-success"
                                : subPct >= 60 ? "bg-primary"
                                : subPct >= 40 ? "bg-warning"
                                : "bg-error";
                            return (
                              <div key={sub.subject} className="flex items-center gap-3">
                                <span className="text-sm text-text-secondary w-36 sm:w-44 shrink-0 truncate">{sub.subject}</span>
                                <div className="flex-1">
                                  <ProgressBar value={sub.obtained} max={sub.maxMarks} color={barColor} />
                                </div>
                                <span className="text-xs text-text-tertiary w-16 text-right shrink-0">
                                  {sub.obtained}/{sub.maxMarks}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Trend — exam-over-exam */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Progress Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-40">
              {exams.map((exam, idx) => {
                const barH = (exam.percentage / 100) * 128;
                const prev = idx > 0 ? exams[idx - 1].percentage : null;
                const improved = prev !== null && exam.percentage > prev;
                const declined = prev !== null && exam.percentage < prev;
                return (
                  <div key={exam.id} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className={`text-xs font-bold ${improved ? "text-success" : declined ? "text-error" : "text-text-primary"}`}>
                      {exam.percentage}%
                    </span>
                    <div
                      className={`w-full max-w-[48px] rounded-t-lg transition-all ${
                        exam.percentage >= 80 ? "bg-success/70" : exam.percentage >= 60 ? "bg-primary/70" : "bg-warning/70"
                      }`}
                      style={{ height: `${barH}px` }}
                    />
                    <span className="text-[10px] text-text-tertiary text-center leading-tight">{exam.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Performance Analysis */}
      <motion.div variants={item}>
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Performance Analysis
              <span className="text-[10px] font-normal text-text-tertiary bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-1">Beta</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AIAnalysisNote
              childName={child.name}
              examAvg={examAvg}
              attPct={attStats.pct}
              bestSubject={bestSubject}
              weakestSubject={weakestSubject}
              subjectAvgs={sorted}
              exams={exams}
            />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function AIAnalysisNote({
  childName,
  examAvg,
  attPct,
  bestSubject,
  weakestSubject,
  subjectAvgs,
  exams,
}: {
  childName: string;
  examAvg: number;
  attPct: number;
  bestSubject: { subject: string; avgPercent: number };
  weakestSubject: { subject: string; avgPercent: number };
  subjectAvgs: { subject: string; avgPercent: number }[];
  exams: DemoExam[];
}) {
  // Determine trend
  const lastTwo = exams.slice(-2);
  const trending = lastTwo.length === 2
    ? lastTwo[1].percentage > lastTwo[0].percentage
      ? "improving"
      : lastTwo[1].percentage < lastTwo[0].percentage
      ? "declining"
      : "stable"
    : "stable";

  // Subjects needing attention (below 75%)
  const needsWork = subjectAvgs.filter((s) => s.avgPercent < 75);
  // Strong subjects (above 85%)
  const strong = subjectAvgs.filter((s) => s.avgPercent >= 85);

  // Topics needing study across all subjects
  const weakTopics: { subject: string; topic: string; pct: number }[] = [];
  for (const sub of subjectAvgs) {
    const topics = DEMO_SUBJECT_TOPICS[sub.subject] ?? [];
    for (const t of topics) {
      if (t.pct < 65) weakTopics.push({ subject: sub.subject, topic: t.topic, pct: t.pct });
    }
  }
  weakTopics.sort((a, b) => a.pct - b.pct);

  return (
    <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
      {/* Overall summary */}
      <div className="flex items-start gap-2.5">
        <div className="w-1 h-full min-h-[20px] rounded-full bg-primary shrink-0 mt-1" />
        <p>
          <span className="font-semibold text-text-primary">{childName}</span> has an overall exam average of{" "}
          <span className="font-bold text-text-primary">{examAvg}%</span> with{" "}
          <span className="font-bold text-text-primary">{attPct}%</span> attendance.
          {trending === "improving" && (
            <span className="text-success font-medium"> Performance is on an upward trend — great progress!</span>
          )}
          {trending === "declining" && (
            <span className="text-warning font-medium"> Recent performance shows a slight dip — needs attention.</span>
          )}
          {trending === "stable" && (
            <span className="text-primary font-medium"> Performance has been consistently stable.</span>
          )}
        </p>
      </div>

      {/* Strengths */}
      {strong.length > 0 && (
        <div className="bg-success/5 border border-success/15 rounded-[10px] p-3">
          <p className="text-xs font-semibold text-success mb-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Strengths
          </p>
          <p className="text-xs text-text-secondary">
            Excelling in{" "}
            {strong.map((s, i) => (
              <span key={s.subject}>
                <span className="font-semibold text-text-primary">{s.subject}</span> ({s.avgPercent}%)
                {i < strong.length - 1 ? (i === strong.length - 2 ? " and " : ", ") : ""}
              </span>
            ))}
            . Keep encouraging this momentum.
          </p>
        </div>
      )}

      {/* Areas for improvement */}
      {needsWork.length > 0 && (
        <div className="bg-warning/5 border border-warning/15 rounded-[10px] p-3">
          <p className="text-xs font-semibold text-warning mb-1.5 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            Needs Attention
          </p>
          <p className="text-xs text-text-secondary">
            {needsWork.map((s, i) => (
              <span key={s.subject}>
                <span className="font-semibold text-text-primary">{s.subject}</span> ({s.avgPercent}%)
                {i < needsWork.length - 1 ? (i === needsWork.length - 2 ? " and " : ", ") : ""}
              </span>
            ))}{" "}
            {needsWork.length === 1 ? "is" : "are"} below 75% — consider extra coaching or revision sessions.
          </p>
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
            {weakTopics.slice(0, 5).map((t) => (
              <div key={`${t.subject}-${t.topic}`} className="flex items-center gap-2 text-xs">
                <span className="text-warning font-bold w-9 text-right shrink-0">{t.pct}%</span>
                <span className="text-text-tertiary">•</span>
                <span className="text-text-secondary">
                  <span className="font-medium text-text-primary">{t.topic}</span>
                  <span className="text-text-tertiary"> ({t.subject})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      <div className="flex items-start gap-2.5 pt-1 border-t border-border-light">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-text-tertiary">
          <span className="font-semibold text-text-secondary">Recommendation:</span>{" "}
          {weakestSubject.avgPercent < 75
            ? `Focus on ${weakestSubject.subject} with dedicated practice sessions. Watch missed class recordings and revise weak topics.`
            : `${childName} is performing well across all subjects. Encourage participation in advanced topics and competitive practice.`
          }
          {attPct < 90 && " Improving attendance will also help strengthen overall understanding."}
        </p>
      </div>
    </div>
  );
}
