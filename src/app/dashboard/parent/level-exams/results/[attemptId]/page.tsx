"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Brain, CheckCircle2, ChevronRight, CircleOff, Sparkles, Target, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getParentLevelExamResult } from "@/lib/api/levelExams";
import type { LevelExamAiSummary, LevelExamResult } from "@/lib/types/levelExam";

function buildFallbackSummary(result: LevelExamResult): LevelExamAiSummary {
  type TopicStatus = "strong" | "watch" | "revise";
  const getStatusRank = (status: string) => {
    if (status === "revise") return 0;
    if (status === "watch") return 1;
    if (status === "strong") return 2;
    return 99;
  };
  const topicMap = new Map<string, { topic: string; total: number; correct: number; wrong: number; sample_questions: string[] }>();
  for (const question of result.questions) {
    const topic = inferTopicForClient(result.subject_name, question.stem, question.explanation || "");
    const row = topicMap.get(topic) || { topic, total: 0, correct: 0, wrong: 0, sample_questions: [] };
    row.total += 1;
    if (question.is_correct) row.correct += 1;
    else row.wrong += 1;
    if (row.sample_questions.length < 3) row.sample_questions.push(shortenClient(question.stem, 80));
    topicMap.set(topic, row);
  }
  const studyTopics = Array.from(topicMap.values())
    .map((row) => {
      const accuracy = row.total ? Math.round((row.correct / row.total) * 100) : 0;
      const status: TopicStatus = accuracy >= 75 ? "strong" : accuracy >= 40 ? "watch" : "revise";
      return {
        topic: row.topic,
        status,
        correct_count: row.correct,
        wrong_count: row.wrong,
        total_questions: row.total,
        accuracy,
        recommendation:
          status === "strong"
            ? `Keep practicing ${row.topic} to maintain this confidence.`
            : status === "watch"
              ? `Revisit ${row.topic} once more and solve similar questions.`
              : `Study ${row.topic} first before the next exam and review the missed answers carefully.`,
        sample_questions: row.sample_questions,
      };
    })
    .sort((a, b) => getStatusRank(a.status) - getStatusRank(b.status) || b.total_questions - a.total_questions);
  const missedExamples = result.questions
    .filter((question) => !question.is_correct)
    .slice(0, 3)
    .map((question) => {
      const selected = question.options.find((option) => option.id === question.selected_option_id);
      const correct = question.options.find((option) => option.id === question.correct_option_id);
      const stem = question.stem.length > 90 ? `${question.stem.slice(0, 87).trimEnd()}...` : question.stem;
      if (selected && correct) {
        return `In "${stem}", the chosen answer was ${selected.option_key}. ${selected.option_text}, but the correct answer is ${correct.option_key}. ${correct.option_text}.`;
      }
      if (correct) {
        return `Revise "${stem}" carefully. The correct answer is ${correct.option_key}. ${correct.option_text}.`;
      }
      return `Revise the concept behind "${stem}".`;
    });

  const headline =
    result.percentage >= 85
      ? `${result.child.student_name} performed very strongly in ${result.subject_name}.`
      : result.percentage >= 60
        ? `${result.child.student_name} has a steady understanding of ${result.subject_name}.`
        : result.percentage >= 35
          ? `${result.child.student_name} is making progress in ${result.subject_name}, with some revision needed.`
          : `${result.child.student_name} needs more support in ${result.subject_name}.`;

  return {
    headline,
    overview: `Scored ${result.score_obtained} out of ${result.total_marks} (${result.percentage}%). ${result.wrong_count} wrong and ${result.unanswered_count} unanswered.`,
    strengths: [
      studyTopics.find((topic) => topic.status === "strong")
        ? `Best performing topic: ${studyTopics.find((topic) => topic.status === "strong")?.topic}.`
        : result.correct_count > 0
          ? `${result.correct_count} question${result.correct_count === 1 ? "" : "s"} were answered correctly.`
          : "The attempt gives us a starting point for guided revision.",
    ],
    focus_areas: missedExamples.length
      ? missedExamples
      : [
          result.wrong_count > 0
            ? `Review the incorrect answers and the related concepts from this exam.`
            : "Maintain the same accuracy level with one more practice round.",
          result.unanswered_count > 0
            ? "Improve time management so fewer questions are left unanswered."
            : "Keep practicing full-paper completion under time limits.",
        ],
    exam_summary: [
      `This exam mainly covered ${studyTopics.map((topic) => topic.topic).slice(0, 3).join(", ") || result.subject_name}.`,
      studyTopics.find((topic) => topic.status === "revise")
        ? `The most important study topic is ${studyTopics.find((topic) => topic.status === "revise")?.topic}.`
        : "The child has a balanced performance pattern across the exam.",
    ],
    best_topic: studyTopics.find((topic) => topic.status === "strong")?.topic || null,
    priority_topic: studyTopics.find((topic) => topic.status === "revise")?.topic || studyTopics.find((topic) => topic.status === "watch")?.topic || null,
    study_topics: studyTopics,
    next_step:
      result.percentage >= 60
        ? `Next step: revisit the missed questions once and try another short practice set.`
        : `Next step: revise the exact wrong questions with the correct answers, then retry similar MCQs with guidance.`,
  };
}

function hasUsableAiSummary(summary: LevelExamAiSummary | null | undefined) {
  if (!summary) return false;
  if ((summary.strengths?.length || 0) > 0) return true;
  if ((summary.focus_areas?.length || 0) > 0) return true;
  if ((summary.exam_summary?.length || 0) > 0) return true;
  if ((summary.study_topics?.length || 0) > 0) return true;
  if (summary.best_topic) return true;
  if (summary.priority_topic) return true;
  return false;
}

export default function ParentLevelExamResultPage() {
  const params = useParams<{ attemptId: string }>();
  const searchParams = useSearchParams();
  const attemptId = typeof params?.attemptId === "string" ? decodeURIComponent(params.attemptId) : "";
  const studentId = searchParams.get("studentId") || "";

  const resultQuery = useQuery({
    queryKey: ["parent-level-exam-result", attemptId, studentId],
    queryFn: () => getParentLevelExamResult(attemptId, studentId),
    enabled: !!attemptId && !!studentId,
  });

  const result = resultQuery.data;
  const aiSummary = useMemo(() => {
    if (!result) return null;
    const summary = hasUsableAiSummary(result.ai_summary)
      ? result.ai_summary
      : buildFallbackSummary(result);
    return {
      ...summary,
      strengths: summary.strengths ?? [],
      focus_areas: summary.focus_areas ?? [],
      exam_summary: summary.exam_summary ?? [],
      study_topics: summary.study_topics ?? [],
      best_topic: summary.best_topic ?? null,
      priority_topic: summary.priority_topic ?? null,
    };
  }, [result]);
  const [activeTopic, setActiveTopic] = useState(0);
  const topicCards = useMemo(() => aiSummary?.study_topics ?? [], [aiSummary]);
  const selectedTopic = topicCards[activeTopic] ?? null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/parent/level-exams?studentId=${encodeURIComponent(studentId)}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Exams
          </Link>
        </Button>
      </div>

      {resultQuery.isLoading ? (
        <div className="h-56 rounded-[14px] bg-border-light animate-pulse" />
      ) : !result ? (
        <Card>
          <CardContent className="py-10 text-center text-text-secondary">Result not found.</CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>{result.title}</CardTitle>
                  <p className="text-sm text-text-secondary mt-2">
                    {result.child.student_name} • {result.subject_name} • Level {result.level_code}
                  </p>
                </div>
                <Badge variant="success">{result.percentage}%</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard icon={<Trophy className="h-5 w-5 text-primary" />} label="Score" value={`${result.score_obtained}/${result.total_marks}`} />
              <MetricCard icon={<CheckCircle2 className="h-5 w-5 text-success" />} label="Correct" value={String(result.correct_count)} />
              <MetricCard icon={<XCircle className="h-5 w-5 text-error" />} label="Wrong" value={String(result.wrong_count)} />
              <MetricCard icon={<CircleOff className="h-5 w-5 text-warning" />} label="Unanswered" value={String(result.unanswered_count)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[12px] border border-primary/15 bg-primary/5 p-4">
                <p className="font-semibold text-text-primary">{aiSummary?.headline}</p>
                <p className="mt-2 text-sm text-text-secondary leading-6">{aiSummary?.overview}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <SummaryPanel
                  icon={<Sparkles className="h-4 w-4 text-success" />}
                  label="Best Topic"
                  value={aiSummary?.best_topic || "Still emerging"}
                  tone="success"
                />
                <SummaryPanel
                  icon={<Target className="h-4 w-4 text-warning" />}
                  label="Needs Study"
                  value={aiSummary?.priority_topic || "General revision"}
                  tone="warning"
                />
                <SummaryPanel
                  icon={<Brain className="h-4 w-4 text-primary" />}
                  label="Exam Pattern"
                  value={`${topicCards.length} topic areas identified`}
                  tone="primary"
                />
              </div>

              <div className="rounded-[12px] border border-border-light bg-app-bg p-4">
                <p className="text-xs uppercase tracking-wide text-text-tertiary mb-3">Whole Exam Summary</p>
                <div className="space-y-2">
                  {aiSummary?.exam_summary.map((item) => (
                    <p key={item} className="text-sm text-text-primary leading-6">{item}</p>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div className="rounded-[12px] border border-border-light bg-app-bg p-4">
                  <p className="text-xs uppercase tracking-wide text-text-tertiary mb-3">Topic Review</p>
                  <div className="space-y-3">
                    {topicCards.map((topic, index) => (
                      <button
                        key={`${topic.topic}-${index}`}
                        onClick={() => setActiveTopic(index)}
                        className={`w-full rounded-[12px] border p-3 text-left transition-colors ${
                          activeTopic === index
                            ? "border-primary bg-primary/5"
                            : "border-border-light bg-white hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-text-primary">{topic.topic}</p>
                            <p className="mt-1 text-xs text-text-secondary">
                              {topic.correct_count}/{topic.total_questions} correct • {topic.accuracy}% accuracy
                            </p>
                          </div>
                          <Badge variant={topic.status === "strong" ? "success" : topic.status === "watch" ? "warning" : "error"}>
                            {topic.status === "strong" ? "Strong" : topic.status === "watch" ? "Watch" : "Revise"}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[12px] border border-border-light bg-app-bg p-4">
                  {selectedTopic ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-text-tertiary">Study Topic</p>
                          <p className="text-lg font-semibold text-text-primary mt-1">{selectedTopic.topic}</p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-border-light bg-surface px-3 py-1 text-xs text-text-secondary">
                          <ChevronRight className="h-3.5 w-3.5" />
                          {selectedTopic.correct_count} correct / {selectedTopic.wrong_count} wrong
                        </div>
                      </div>

                      <div className="rounded-[12px] border border-border-light bg-surface p-4">
                        <p className="text-xs uppercase tracking-wide text-text-tertiary mb-2">What To Study</p>
                        <p className="text-sm text-text-primary leading-6">{selectedTopic.recommendation}</p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-[12px] border border-border-light bg-surface p-4">
                          <p className="text-xs uppercase tracking-wide text-text-tertiary mb-2">Strength View</p>
                          <div className="space-y-2">
                            {aiSummary?.strengths.map((item) => (
                              <p key={item} className="text-sm text-text-primary leading-6">{item}</p>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-[12px] border border-border-light bg-surface p-4">
                          <p className="text-xs uppercase tracking-wide text-text-tertiary mb-2">Focus View</p>
                          <div className="space-y-2">
                            {aiSummary?.focus_areas.map((item) => (
                              <p key={item} className="text-sm text-text-primary leading-6">{item}</p>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[12px] border border-border-light bg-surface p-4">
                        <p className="text-xs uppercase tracking-wide text-text-tertiary mb-2">Questions In This Topic</p>
                        <div className="space-y-2">
                          {selectedTopic.sample_questions.map((item) => (
                            <p key={item} className="text-sm text-text-primary leading-6">{item}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary">No topic insights available yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[12px] border border-success/20 bg-success/10 p-4">
                <p className="text-xs uppercase tracking-wide text-text-tertiary mb-1">Next Step</p>
                <p className="text-sm text-text-primary leading-6">{aiSummary?.next_step}</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {result.questions.map((question, index) => (
              <Card key={question.question_id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <CardTitle className="text-base">Question {index + 1}</CardTitle>
                    <Badge variant={question.is_correct ? "success" : question.selected_option_id ? "error" : "warning"}>
                      {question.is_correct ? "Correct" : question.selected_option_id ? "Wrong" : "Unanswered"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-text-primary leading-6">{question.stem}</p>
                  <div className="space-y-2">
                    {question.options.map((option) => {
                      const isChosen = question.selected_option_id === option.id;
                      const isCorrect = question.correct_option_id === option.id;
                      return (
                        <div
                          key={option.id}
                          className={`rounded-[10px] border p-3 ${
                            isCorrect
                              ? "border-success bg-success/10"
                              : isChosen
                                ? "border-error bg-error/5"
                                : "border-border-light bg-app-bg"
                          }`}
                        >
                          <p className="text-sm text-text-primary">
                            <span className="font-semibold mr-2">{option.option_key}.</span>
                            {option.option_text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  {question.explanation && (
                    <div className="rounded-[10px] border border-border-light bg-app-bg p-3">
                      <p className="text-xs uppercase tracking-wide text-text-tertiary mb-1">Explanation</p>
                      <p className="text-sm text-text-secondary leading-6">{question.explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}

function SummaryPanel({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "primary" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-success/20 bg-success/10"
      : tone === "warning"
        ? "border-warning/20 bg-warning/10"
        : "border-primary/20 bg-primary/5";

  return (
    <div className={`rounded-[12px] border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs uppercase tracking-wide text-text-tertiary">{label}</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-text-primary leading-6">{value}</p>
    </div>
  );
}

function shortenClient(value: string, maxLength = 80) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function inferTopicForClient(subjectName: string, stem: string, explanation: string) {
  const text = `${subjectName} ${stem} ${explanation}`.toLowerCase();
  const subject = subjectName.toLowerCase();
  const topicRules =
    subject.includes("chem")
      ? [
          { topic: "Solutions and Mixtures", keywords: ["solvent", "solute", "salt water", "mixture", "solution", "dissolve"] },
          { topic: "Electricity and Energy", keywords: ["electricity", "wind energy", "solar", "current", "battery", "energy"] },
          { topic: "States of Matter", keywords: ["solid", "liquid", "gas", "evaporation", "condensation", "matter"] },
          { topic: "Acids, Bases and Salts", keywords: ["acid", "base", "salt", "litmus", "neutral"] },
          { topic: "Atoms and Materials", keywords: ["atom", "element", "compound", "metal", "non-metal", "material"] },
        ]
      : subject.includes("bio")
        ? [
            { topic: "Plants and Photosynthesis", keywords: ["leaf", "plant", "chlorophyll", "photosynthesis", "root", "stem"] },
            { topic: "Human Body and Health", keywords: ["breathing", "lungs", "heart", "blood", "disease", "body"] },
            { topic: "Animals and Habitats", keywords: ["animal", "habitat", "food chain", "forest", "water animal"] },
            { topic: "Cells and Life Processes", keywords: ["cell", "tissue", "organ", "living", "organism"] },
          ]
        : [
            { topic: "Concept Understanding", keywords: ["define", "example", "correct", "which of the following"] },
            { topic: "Application and Reasoning", keywords: ["why", "how", "used", "produced", "result"] },
          ];

  for (const rule of topicRules) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.topic;
    }
  }

  const lead = stem.replace(/\s+/g, " ").trim().split(/[?.]/)[0]?.trim() || `${subjectName} Core Concepts`;
  return shortenClient(lead, 32);
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-border-light bg-app-bg p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs uppercase tracking-wide text-text-tertiary">{label}</span>
      </div>
      <p className="text-lg font-semibold text-text-primary">{value}</p>
    </div>
  );
}
