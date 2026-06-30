import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/public-exam/db";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock3,
  Home,
  Layers3,
  MoonStar,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import type { GradeResult, QuestionSnapshot } from "@/lib/public-exam/grading";
import { PrintButton } from "@/components/public-exam/PrintButton";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

type PageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

type InsightTopic = {
  topic: string;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  sampleQuestions: string[];
};

type DifficultyBucket = {
  label: string;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
};

type ResultInsight = {
  headline: string;
  overview: string;
  strengths: string[];
  focusAreas: string[];
  summary: string[];
  nextStep: string;
  bestTopic: string | null;
  priorityTopic: string | null;
  topicInsights: InsightTopic[];
  difficultyInsights: DifficultyBucket[];
};

type SnapshotQuestionWithTopic = QuestionSnapshot & {
  topic: string;
};

function shortenText(value: string, maxLength = 96) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function inferTopic(subjectName: string, questionText: string) {
  const text = `${subjectName} ${questionText}`.toLowerCase();
  const subject = subjectName.toLowerCase();

  const rules = subject.includes("chem")
    ? [
        { topic: "Matter and Materials", keywords: ["matter", "material", "metal", "non-metal", "compound", "element", "atom"] },
        { topic: "States and Changes", keywords: ["solid", "liquid", "gas", "evaporation", "condensation", "melting", "freezing"] },
        { topic: "Acids, Bases and Salts", keywords: ["acid", "base", "salt", "litmus", "neutral", "indicator"] },
        { topic: "Solutions and Separation", keywords: ["solute", "solvent", "solution", "mixture", "dissolve", "filter", "separate"] },
        { topic: "Energy and Daily Science", keywords: ["electricity", "energy", "battery", "current", "heat", "fuel", "solar", "wind"] },
      ]
    : [
        { topic: "Concept Understanding", keywords: ["define", "identify", "correct", "which of the following"] },
        { topic: "Application and Reasoning", keywords: ["why", "how", "reason", "because", "used", "result"] },
      ];

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.topic;
    }
  }

  const firstLine = questionText.split(/[?.]/)[0]?.trim() || `${subjectName} Core Concepts`;
  return shortenText(firstLine, 36);
}

function buildInsight(args: {
  studentName: string;
  subjectName: string;
  results: GradeResult;
  questions: QuestionSnapshot[];
}): ResultInsight {
  const { studentName, subjectName, results, questions } = args;
  const questionsWithTopics: SnapshotQuestionWithTopic[] = questions.map((question) => ({
    ...question,
    topic: inferTopic(subjectName, question.questionText),
  }));

  const questionMap = new Map(results.questions.map((question) => [question.questionId, question]));
  const topicMap = new Map<string, InsightTopic>();
  const difficultyMap = new Map<string, DifficultyBucket>();

  for (const question of questionsWithTopics) {
    const graded = questionMap.get(question.id);
    const selected = graded?.selectedOption ?? null;
    const isCorrect = !!graded?.isCorrect;

    const topicRow = topicMap.get(question.topic) ?? {
      topic: question.topic,
      total: 0,
      correct: 0,
      wrong: 0,
      skipped: 0,
      accuracy: 0,
      sampleQuestions: [],
    };
    topicRow.total += 1;
    if (!selected) topicRow.skipped += 1;
    else if (isCorrect) topicRow.correct += 1;
    else topicRow.wrong += 1;
    if (topicRow.sampleQuestions.length < 3) {
      topicRow.sampleQuestions.push(shortenText(question.questionText, 82));
    }
    topicMap.set(question.topic, topicRow);

    const difficultyLabel = question.difficulty[0].toUpperCase() + question.difficulty.slice(1);
    const difficultyRow = difficultyMap.get(difficultyLabel) ?? {
      label: difficultyLabel,
      total: 0,
      correct: 0,
      wrong: 0,
      skipped: 0,
      accuracy: 0,
    };
    difficultyRow.total += 1;
    if (!selected) difficultyRow.skipped += 1;
    else if (isCorrect) difficultyRow.correct += 1;
    else difficultyRow.wrong += 1;
    difficultyMap.set(difficultyLabel, difficultyRow);
  }

  const topicInsights = Array.from(topicMap.values())
    .map((topic) => ({
      ...topic,
      accuracy: topic.total ? Math.round((topic.correct / topic.total) * 100) : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total || a.topic.localeCompare(b.topic));

  const difficultyInsights = Array.from(difficultyMap.values())
    .map((bucket) => ({
      ...bucket,
      accuracy: bucket.total ? Math.round((bucket.correct / bucket.total) * 100) : 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const strongestTopic = [...topicInsights]
    .sort((a, b) => b.accuracy - a.accuracy || b.correct - a.correct || a.skipped - b.skipped)[0] ?? null;
  const weakestTopic = topicInsights[0] ?? null;
  const toughestDifficulty = [...difficultyInsights]
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)[0] ?? null;

  const studentFirstName = studentName.split(" ")[0] || studentName;
  const completionRate = results.questions.length
    ? Math.round(((results.questions.length - results.unansweredCount) / results.questions.length) * 100)
    : 0;

  const headline =
    results.percentage >= 80
      ? `${studentFirstName} showed strong command across this ${subjectName} paper.`
      : results.percentage >= 50
        ? `${studentFirstName} has a workable base in ${subjectName}, with a few clear revision targets.`
        : `${studentFirstName} needs concept-focused support in ${subjectName}, especially in repeated weak question patterns.`;

  const overview = `${studentFirstName} scored ${results.scoreObtained} out of ${results.totalMarks} (${results.percentage}%). ${results.correctCount} answers were correct, ${results.wrongCount} were incorrect, and ${results.unansweredCount} were skipped.`;

  const strengths = [
    strongestTopic
      ? `Best question area: ${strongestTopic.topic} with ${strongestTopic.correct}/${strongestTopic.total} correct (${strongestTopic.accuracy}%).`
      : null,
    completionRate === 100
      ? "Completed the full paper without leaving any question blank."
      : `Attempted ${completionRate}% of the paper, which gives a solid base for review.`,
    results.correctCount > 0 && results.percentage >= 60
      ? "Accuracy was stronger on familiar concepts than on mixed-concept questions."
      : null,
  ].filter(Boolean) as string[];

  const focusAreas = [
    weakestTopic
      ? `Priority revision topic: ${weakestTopic.topic} with ${weakestTopic.wrong + weakestTopic.skipped} questions needing support.`
      : null,
    toughestDifficulty && toughestDifficulty.total > 0
      ? `${toughestDifficulty.label}-level questions had the lowest accuracy at ${toughestDifficulty.accuracy}%, so that difficulty band needs guided practice.`
      : null,
    results.unansweredCount > 0
      ? `There were ${results.unansweredCount} skipped questions, so speed and confidence need support alongside concept revision.`
      : "Most marks were lost through wrong choices rather than skipped questions, so concept correction matters more than pacing.",
  ].filter(Boolean) as string[];

  const summary = [
    strongestTopic ? `Most confident area: ${strongestTopic.topic}.` : "Most confident area is still emerging from this paper.",
    weakestTopic ? `Most improvement is needed in ${weakestTopic.topic}.` : "A broader revision round is recommended.",
    toughestDifficulty ? `${toughestDifficulty.label} questions were the most difficult section in this attempt.` : "Difficulty spread was fairly even across the paper.",
  ];

  const nextStep = weakestTopic
    ? `Next step: review the wrong and skipped questions from ${weakestTopic.topic}, then retry 5 to 10 similar MCQs before the next exam.`
    : "Next step: review the missed questions once, then attempt a short mixed-topic practice quiz.";

  return {
    headline,
    overview,
    strengths,
    focusAreas,
    summary,
    nextStep,
    bestTopic: strongestTopic?.topic ?? null,
    priorityTopic: weakestTopic?.topic ?? null,
    topicInsights,
    difficultyInsights,
  };
}

function formatAttemptDate(value: Date) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ResultPage({ params }: PageProps) {
  const { attemptId } = await params;

  const attempt = await db.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      publishing: {
        select: {
          title: true,
        },
      },
      answers: true,
    },
  });

  if (!attempt) {
    return notFound();
  }

  if (attempt.status === "in_progress") {
    return redirect(`/exam-site/attempt/${attemptId}`);
  }

  const results: GradeResult = typeof attempt.resultSnapshotJson === "string"
    ? JSON.parse(attempt.resultSnapshotJson)
    : (attempt.resultSnapshotJson as unknown as GradeResult);

  const historyAttempts = attempt.studentPhone
    ? await db.examAttempt.findMany({
        where: { studentPhone: attempt.studentPhone },
        orderBy: { startedAt: "desc" },
        include: {
          publishing: {
            select: {
              title: true,
            },
          },
        },
      })
    : [];

  const questionsList: QuestionSnapshot[] = typeof attempt.paperSnapshotJson === "string"
    ? JSON.parse(attempt.paperSnapshotJson)
    : (attempt.paperSnapshotJson as unknown as QuestionSnapshot[]);

  if (!results) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center text-text-secondary">
        Results processing error. Please contact your coordinator.
      </div>
    );
  }

  const insight = buildInsight({
    studentName: attempt.studentName,
    subjectName: attempt.publishing.title,
    results,
    questions: questionsList,
  });

  return (
    <div className="min-h-screen bg-app-bg text-text-primary relative overflow-hidden selection:bg-primary-light selection:text-primary">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_left,rgba(103,58,183,0.14),transparent_42%),radial-gradient(circle_at_top_right,rgba(130,195,91,0.12),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(126,87,194,0.2),transparent_42%),radial-gradient(circle_at_top_right,rgba(96,165,250,0.18),transparent_34%)]" />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10 lg:px-8 print:px-0 print:py-4">
        <div className="no-print mb-6 flex flex-col gap-4 rounded-[28px] border border-border-light bg-surface/90 px-5 py-4 shadow-card backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-text-tertiary">SmartUp Diagnosis Report</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Assessment Completed</h1>
              <p className="mt-2 text-sm text-text-secondary">
                {attempt.studentName} - {attempt.publishing.title}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="rounded-full border border-border-light bg-app-bg px-3 py-1.5 text-xs font-semibold text-text-secondary">
              {formatAttemptDate(attempt.createdAt)}
            </div>
            <ThemeToggle />
          </div>
        </div>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1.25fr_1fr] print:mb-4 print:gap-3">
          <div className="rounded-[30px] border border-border-light bg-surface p-6 shadow-card print:rounded-[16px] print:p-4">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                  <Brain className="h-3.5 w-3.5" />
                  Insight Based On Exam Questions
                </div>
                <h2 className="text-xl font-black leading-tight sm:text-3xl">{insight.headline}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">{insight.overview}</p>
              </div>
              <div className="grid min-w-[220px] grid-cols-2 gap-3 self-start print:min-w-0">
                <div className="rounded-2xl border border-border-light bg-app-bg p-4 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-tertiary">Score</div>
                  <div className="mt-2 text-4xl font-black text-primary">{results.percentage}%</div>
                  <div className="mt-2 text-sm font-semibold text-text-secondary">{results.scoreObtained} / {results.totalMarks} marks</div>
                </div>
                <div className="rounded-2xl border border-border-light bg-app-bg p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-tertiary">Priority Topic</div>
                  <div className="mt-3 text-sm font-semibold leading-6 text-text-primary">{insight.priorityTopic ?? "General revision"}</div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-text-secondary">
                    <Target className="h-3.5 w-3.5 text-warning" />
                    Revision focus
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3 print:mt-4 print:gap-3">
              <MetricCard icon={<CheckCircle2 className="h-5 w-5 text-success" />} label="Correct" value={String(attempt.correctCount)} helper="Right answers" />
              <MetricCard icon={<XCircle className="h-5 w-5 text-error" />} label="Incorrect" value={String(attempt.wrongCount)} helper="Needs review" />
              <MetricCard icon={<Clock3 className="h-5 w-5 text-warning" />} label="Skipped" value={String(attempt.unansweredCount)} helper="Not attempted" />
            </div>
          </div>

          <div className="rounded-[30px] border border-border-light bg-surface p-6 shadow-card print:rounded-[16px] print:p-4">
            <div className="flex items-center gap-2 border-b border-border-light pb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-[0.22em] text-text-secondary">Whole Paper Summary</h3>
            </div>
            <div className="mt-4 space-y-3">
              {insight.summary.map((item) => (
                <div key={item} className="rounded-2xl border border-border-light bg-app-bg px-4 py-3 text-sm leading-6 text-text-primary">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-success/20 bg-success/10 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-tertiary">Next Step</div>
              <p className="mt-2 text-sm font-semibold leading-6 text-text-primary">{insight.nextStep}</p>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr] print:mb-4 print:grid-cols-2 print:gap-3">
          <div className="rounded-[30px] border border-border-light bg-surface p-6 shadow-card print:rounded-[16px] print:p-4">
            <div className="flex items-center gap-2 border-b border-border-light pb-3">
              <Layers3 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-[0.22em] text-text-secondary">Topic-Based Insight</h3>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 print:mt-3 print:grid-cols-1">
              {insight.topicInsights.map((topic) => (
                <div key={topic.topic} className="rounded-2xl border border-border-light bg-app-bg p-4 print:break-inside-avoid">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-text-primary">{topic.topic}</div>
                      <div className="mt-1 text-xs text-text-secondary">{topic.correct}/{topic.total} correct - {topic.accuracy}% accuracy</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${topic.accuracy >= 75 ? "bg-success/12 text-success" : topic.accuracy >= 40 ? "bg-warning/12 text-warning" : "bg-error/10 text-error"}`}>
                      {topic.accuracy >= 75 ? "Strong" : topic.accuracy >= 40 ? "Watch" : "Revise"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-surface px-2 py-2 text-text-secondary"><span className="block font-bold text-success">{topic.correct}</span> correct</div>
                    <div className="rounded-xl bg-surface px-2 py-2 text-text-secondary"><span className="block font-bold text-error">{topic.wrong}</span> wrong</div>
                    <div className="rounded-xl bg-surface px-2 py-2 text-text-secondary"><span className="block font-bold text-warning">{topic.skipped}</span> skipped</div>
                  </div>
                  {topic.sampleQuestions.length > 0 ? (
                    <div className="mt-3 space-y-1.5 text-xs leading-5 text-text-secondary">
                      {topic.sampleQuestions.map((sample) => (
                        <p key={sample}>- {sample}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[30px] border border-border-light bg-surface p-6 shadow-card print:rounded-[16px] print:p-4">
              <div className="flex items-center gap-2 border-b border-border-light pb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-[0.22em] text-text-secondary">Strengths And Focus</h3>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-1 print:mt-3 print:gap-3">
                <InsightList title="Strengths" tone="success" items={insight.strengths} />
                <InsightList title="Focus Areas" tone="warning" items={insight.focusAreas} />
              </div>
            </div>

            <div className="rounded-[30px] border border-border-light bg-surface p-6 shadow-card print:rounded-[16px] print:p-4">
              <div className="flex items-center gap-2 border-b border-border-light pb-3">
                <MoonStar className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-[0.22em] text-text-secondary">Difficulty Pattern</h3>
              </div>
              <div className="mt-4 space-y-3 print:mt-3">
                {insight.difficultyInsights.map((bucket) => (
                  <div key={bucket.label} className="rounded-2xl border border-border-light bg-app-bg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-text-primary">{bucket.label}</div>
                        <div className="mt-1 text-xs text-text-secondary">{bucket.total} question{bucket.total === 1 ? "" : "s"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-primary">{bucket.accuracy}%</div>
                        <div className="text-xs text-text-secondary">accuracy</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
                      <span className="rounded-full bg-success/10 px-2.5 py-1 text-success">{bucket.correct} correct</span>
                      <span className="rounded-full bg-error/10 px-2.5 py-1 text-error">{bucket.wrong} wrong</span>
                      <span className="rounded-full bg-warning/10 px-2.5 py-1 text-warning">{bucket.skipped} skipped</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-[30px] border border-border-light bg-surface p-6 shadow-card print:mb-4 print:rounded-[16px] print:p-4">
          <div className="flex items-center gap-2 border-b border-border-light pb-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-black sm:text-xl">Question Paper & Student Responses Review</h2>
          </div>

          <div className="mt-5 space-y-4 print:mt-3 print:space-y-3">
            {questionsList.map((q, index) => {
              const answer = attempt.answers.find((item) => item.questionId === q.id);
              const selected = answer?.selectedOption || null;
              const isCorrect = selected === q.correctOption;
              const topic = inferTopic(attempt.publishing.title, q.questionText);

              return (
                <article
                  key={q.id}
                  className={`question-card rounded-[24px] border p-5 print:rounded-[14px] print:p-4 ${
                    selected === null
                      ? "border-warning/20 bg-warning/5"
                      : isCorrect
                        ? "border-success/20 bg-success/8"
                        : "border-error/20 bg-error/5"
                  }`}
                >
                  <div className="flex flex-col gap-3 border-b border-border-light pb-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-text-tertiary">
                        <span>Question {index + 1}</span>
                        <span>-</span>
                        <span>{topic}</span>
                        <span>-</span>
                        <span>{q.difficulty}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-7 text-text-primary sm:text-[15px]">{q.questionText}</p>
                    </div>
                    <div className="shrink-0">
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                        selected === null
                          ? "bg-warning/12 text-warning"
                          : isCorrect
                            ? "bg-success/12 text-success"
                            : "bg-error/10 text-error"
                      }`}>
                        {selected === null ? <AlertCircle className="h-3.5 w-3.5" /> : isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {selected === null ? "Skipped" : isCorrect ? "Correct" : "Incorrect"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2.5 sm:grid-cols-2 print:grid-cols-2 print:gap-2">
                    {q.options.map((option) => {
                      const isSelected = selected === option.optionKey;
                      const isCorrectOption = q.correctOption === option.optionKey;
                      const optionClass = isCorrectOption
                        ? "border-success/25 bg-success/10 text-text-primary"
                        : isSelected && !isCorrect
                          ? "border-error/25 bg-error/8 text-text-primary"
                          : "border-border-light bg-surface text-text-secondary";

                      return (
                        <div key={option.id} className={`rounded-2xl border px-3.5 py-3 text-sm ${optionClass}`}>
                          <div className="flex items-start gap-3">
                            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                              isCorrectOption
                                ? "bg-success text-white"
                                : isSelected && !isCorrect
                                  ? "bg-error text-white"
                                  : "bg-app-bg text-text-secondary"
                            }`}>
                              {option.optionKey}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="leading-6">{option.optionText}</p>
                            </div>
                            {isCorrectOption ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : null}
                            {isSelected && !isCorrect ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" /> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {historyAttempts.length > 1 ? (
          <section className="no-print mb-6 rounded-[30px] border border-border-light bg-surface p-6 shadow-card">
            <div className="flex items-center gap-2 border-b border-border-light pb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-black sm:text-xl">Assessment History</h2>
            </div>
            <p className="mt-3 text-sm text-text-secondary">
              Found {historyAttempts.length} attempts registered under {attempt.studentPhone}.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border-light text-text-secondary">
                    <th className="px-2 py-3 font-bold">Date & Time</th>
                    <th className="px-2 py-3 font-bold">Exam</th>
                    <th className="px-2 py-3 font-bold">Class</th>
                    <th className="px-2 py-3 text-right font-bold">Score</th>
                    <th className="px-2 py-3 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyAttempts.map((hist) => {
                    const isCurrent = hist.id === attempt.id;
                    return (
                      <tr key={hist.id} className={`border-b border-border-light/70 ${isCurrent ? "bg-primary/5" : "hover:bg-app-bg"}`}>
                        <td className="px-2 py-3 text-text-secondary">{formatAttemptDate(hist.createdAt)}</td>
                        <td className="px-2 py-3 font-semibold text-text-primary">
                          {hist.publishing.title}
                          {isCurrent ? (
                            <span className="ml-2 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-bold text-success">Current</span>
                          ) : null}
                        </td>
                        <td className="px-2 py-3 text-text-secondary">Class {hist.classLevel}</td>
                        <td className="px-2 py-3 text-right font-bold text-text-primary">{hist.percentage}% ({hist.scoreObtained}/{hist.totalMarks})</td>
                        <td className="px-2 py-3 text-right">
                          {isCurrent ? (
                            <span className="text-text-tertiary">Viewing</span>
                          ) : (
                            <Link href={`/exam-site/result/${hist.id}`} className="font-semibold text-primary hover:text-primary-hover">
                              View Report
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <div className="no-print flex flex-col gap-3 pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center print:hidden">
          <Link
            href="/exam-site"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
          >
            <span>Take Another Exam</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <PrintButton />
          <Link
            href="/auth/login"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border-light bg-surface px-6 py-3 text-sm font-bold text-text-primary transition-colors hover:bg-app-bg"
          >
            <Home className="h-4 w-4" />
            <span>Go to Portal Login</span>
          </Link>
        </div>
      </main>

      <footer className="relative z-10 px-6 pb-6 text-center text-xs text-text-tertiary print:hidden">
        (c) 2026 SmartUp Learning Ventures. All Rights Reserved.
      </footer>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-border-light bg-app-bg p-4 text-center sm:text-left">
      <div className="flex items-center justify-center gap-2 sm:justify-start">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-tertiary">{label}</span>
      </div>
      <div className="mt-3 text-3xl font-black text-text-primary">{value}</div>
      <div className="mt-1 text-xs text-text-secondary">{helper}</div>
    </div>
  );
}

function InsightList({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "success" | "warning";
  items: string[];
}) {
  const toneClass = tone === "success" ? "text-success" : "text-warning";
  const badgeClass = tone === "success" ? "bg-success/10" : "bg-warning/10";

  return (
    <div className="rounded-2xl border border-border-light bg-app-bg p-4">
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${badgeClass} ${toneClass}`}>
        {title}
      </div>
      <div className="mt-3 space-y-2.5">
        {items.map((item) => (
          <p key={item} className="text-sm leading-6 text-text-primary">- {item}</p>
        ))}
      </div>
    </div>
  );
}
