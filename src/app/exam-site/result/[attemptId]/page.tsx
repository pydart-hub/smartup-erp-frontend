import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/public-exam/db";
import {
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock3,
  FileText,
  Home,
  Layers3,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import type { GradeResult, QuestionSnapshot } from "@/lib/public-exam/grading";
import { PrintButton } from "@/components/public-exam/PrintButton";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NextExamButton } from "@/components/public-exam/NextExamButton";

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
    : subject.includes("bio")
      ? [
          { topic: "Human Systems", keywords: ["blood", "heart", "lungs", "bone", "body", "digestion", "breathing"] },
          { topic: "Cells and Tissues", keywords: ["cell", "tissue", "organ", "organelle", "membrane", "nucleus", "chloroplast"] },
          { topic: "Plants and Nutrition", keywords: ["plant", "leaf", "photosynthesis", "root", "stomata", "chlorophyll"] },
          { topic: "Classification and Microbes", keywords: ["bacteria", "virus", "fungi", "prokaryotic", "kingdom", "microorganism"] },
        ]
      : [
          { topic: "Concept Understanding", keywords: ["define", "identify", "correct", "which of the following"] },
          { topic: "Application and Reasoning", keywords: ["why", "how", "reason", "because", "used", "result"] },
        ];

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) return rule.topic;
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
    if (topicRow.sampleQuestions.length < 2) topicRow.sampleQuestions.push(shortenText(question.questionText, 74));
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
    .map((topic) => ({ ...topic, accuracy: topic.total ? Math.round((topic.correct / topic.total) * 100) : 0 }))
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total || a.topic.localeCompare(b.topic));

  const difficultyInsights = Array.from(difficultyMap.values())
    .map((bucket) => ({ ...bucket, accuracy: bucket.total ? Math.round((bucket.correct / bucket.total) * 100) : 0 }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const strongestTopic = [...topicInsights].sort((a, b) => b.accuracy - a.accuracy || b.correct - a.correct)[0] ?? null;
  const weakestTopic = topicInsights[0] ?? null;
  const toughestDifficulty = [...difficultyInsights].sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)[0] ?? null;
  const studentFirstName = studentName.split(" ")[0] || studentName;
  const completionRate = results.questions.length ? Math.round(((results.questions.length - results.unansweredCount) / results.questions.length) * 100) : 0;

  return {
    headline:
      results.percentage >= 80
        ? `${studentFirstName} showed strong control across this ${subjectName} paper.`
        : results.percentage >= 50
          ? `${studentFirstName} has a workable base in ${subjectName}, with a few precise revision targets.`
          : `${studentFirstName} needs concept-focused support in ${subjectName}, especially in repeated weak patterns.`,
    overview: `${studentFirstName} scored ${results.scoreObtained} out of ${results.totalMarks} (${results.percentage}%). ${results.correctCount} answers were correct, ${results.wrongCount} were incorrect, and ${results.unansweredCount} were skipped.`,
    strengths: [
      strongestTopic ? `Best topic: ${strongestTopic.topic} with ${strongestTopic.correct}/${strongestTopic.total} correct.` : null,
      completionRate === 100 ? "Completed the full paper without leaving any question blank." : `Attempted ${completionRate}% of the paper under timed conditions.`,
      results.correctCount > 0 && results.percentage >= 60 ? "Confidence was stronger on direct concept questions than mixed reasoning items." : null,
    ].filter(Boolean) as string[],
    focusAreas: [
      weakestTopic ? `Priority topic: ${weakestTopic.topic} with ${weakestTopic.wrong + weakestTopic.skipped} questions needing support.` : null,
      toughestDifficulty ? `${toughestDifficulty.label} questions had the lowest accuracy at ${toughestDifficulty.accuracy}%.` : null,
      results.unansweredCount > 0 ? `There were ${results.unansweredCount} skipped questions, so speed and confidence also need attention.` : "Marks were mainly lost through wrong choices, so concept correction matters more than pacing.",
    ].filter(Boolean) as string[],
    summary: [
      strongestTopic ? `Most confident area: ${strongestTopic.topic}.` : "Most confident area is still emerging.",
      weakestTopic ? `Most support is needed in ${weakestTopic.topic}.` : "A broader revision round is recommended.",
      toughestDifficulty ? `${toughestDifficulty.label} was the most difficult band in this attempt.` : "Difficulty spread was fairly even.",
    ],
    nextStep: weakestTopic ? `Next step: review the wrong and skipped questions from ${weakestTopic.topic}, then retry 5 to 10 similar MCQs before the next exam.` : "Next step: review the missed questions once, then attempt a short mixed-topic quiz.",
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
      publishing: { select: { title: true } },
      answers: true,
    },
  });

  if (!attempt) return notFound();
  if (attempt.status === "in_progress") return redirect(`/exam-site/attempt/${attemptId}`);

  const results: GradeResult = typeof attempt.resultSnapshotJson === "string"
    ? JSON.parse(attempt.resultSnapshotJson)
    : (attempt.resultSnapshotJson as unknown as GradeResult);

  const historyAttempts = attempt.studentPhone
    ? await db.examAttempt.findMany({
        where: { studentPhone: attempt.studentPhone },
        orderBy: { createdAt: "desc" },
        include: { publishing: { select: { title: true } } },
      })
    : [];

  const now = new Date();
  const activeExams = await db.examPublishing.findMany({
    where: {
      classLevel: attempt.classLevel,
      isActive: true,
      startAt: { lte: now },
      endAt: { gte: now },
    },
    include: {
      subject: { select: { name: true } },
    },
    orderBy: { title: "asc" },
  });

  const attemptedPublishingIds = new Set(historyAttempts.map((h) => h.publishingId));
  const nextExam = activeExams.find((exam) => !attemptedPublishingIds.has(exam.id));

  const questionsList: QuestionSnapshot[] = typeof attempt.paperSnapshotJson === "string"
    ? JSON.parse(attempt.paperSnapshotJson)
    : (attempt.paperSnapshotJson as unknown as QuestionSnapshot[]);

  if (!results) {
    return <div className="min-h-screen bg-app-bg flex items-center justify-center text-text-secondary">Results processing error. Please contact your coordinator.</div>;
  }

  const insight = buildInsight({
    studentName: attempt.studentName,
    subjectName: attempt.publishing.title,
    results,
    questions: questionsList,
  });

  const condensedQuestions = questionsList.map((question) => {
    const answer = attempt.answers.find((item) => item.questionId === question.id);
    const selected = answer?.selectedOption || null;
    return {
      question,
      selected,
      isCorrect: selected === question.correctOption,
      topic: inferTopic(attempt.publishing.title, question.questionText),
    };
  });

  return (
    <div className="min-h-screen bg-app-bg text-text-primary relative overflow-hidden selection:bg-primary-light selection:text-primary">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,58,183,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(130,195,91,0.12),transparent_26%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(126,87,194,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.18),transparent_28%)]" />

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
        <div className="no-print mb-5 flex flex-col gap-4 rounded-[30px] border border-border-light bg-surface/88 px-5 py-4 shadow-card backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-primary/10 text-primary">
              <Award className="h-7 w-7" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-text-tertiary">SmartUp Diagnosis Report</div>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">Assessment Completed</h1>
              <p className="mt-2 text-sm text-text-secondary sm:text-base">{attempt.studentName} - {attempt.publishing.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="rounded-full border border-border-light bg-app-bg px-4 py-2 text-xs font-semibold text-text-secondary">
              {formatAttemptDate(attempt.createdAt)}
            </div>
            <ThemeToggle />
          </div>
        </div>

        <section className="no-print mb-5 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[28px] border border-border-light bg-surface p-4 shadow-card sm:p-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_230px]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                  <Brain className="h-3.5 w-3.5" />
                  Question Based Insight
                </div>
                <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-text-primary">{insight.headline}</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-text-secondary">{insight.overview}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-4 xl:grid-cols-2">
                <MetricCard icon={<Sparkles className="h-4 w-4 text-primary" />} label="Score" value={`${results.percentage}%`} helper={`${results.scoreObtained} / ${results.totalMarks} marks`} />
                <MetricCard icon={<Target className="h-4 w-4 text-warning" />} label="Priority" value={shortenText(insight.priorityTopic ?? "General revision", 26)} helper="Primary revision area" />
                <MetricCard icon={<CheckCircle2 className="h-4 w-4 text-success" />} label="Correct" value={String(attempt.correctCount)} helper="Strong answers" />
                <MetricCard icon={<XCircle className="h-4 w-4 text-error" />} label="Incorrect" value={String(attempt.wrongCount)} helper="Needs review" />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-border-light bg-surface p-4 shadow-card sm:p-5">
            <div className="flex items-center gap-2 border-b border-border-light pb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <div className="text-sm font-black uppercase tracking-[0.22em] text-text-secondary">Whole Paper Summary</div>
            </div>
            <div className="mt-4 space-y-3">
              {insight.summary.map((item) => (
                <div key={item} className="rounded-2xl border border-border-light bg-app-bg px-4 py-3 text-sm leading-6 text-text-primary">{item}</div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-success/20 bg-success/10 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-tertiary">Next Step</div>
              <p className="mt-2 text-sm font-semibold leading-6 text-text-primary">{insight.nextStep}</p>
            </div>
          </div>
        </section>

        <section className="no-print mb-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-border-light bg-surface p-4 shadow-card sm:p-5">
            <div className="flex items-center gap-2 border-b border-border-light pb-3">
              <Layers3 className="h-4 w-4 text-primary" />
              <div className="text-sm font-black uppercase tracking-[0.22em] text-text-secondary">Topic Insight</div>
            </div>
            <div className="mt-4 grid gap-2.5 md:grid-cols-2">
              {insight.topicInsights.slice(0, 4).map((topic) => (
                <div key={topic.topic} className="rounded-[20px] border border-border-light bg-app-bg p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-bold leading-5 text-text-primary">{topic.topic}</div>
                      <div className="mt-1 text-[11px] text-text-secondary">{topic.correct}/{topic.total} correct - {topic.accuracy}% accuracy</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${topic.accuracy >= 75 ? "bg-success/10 text-success" : topic.accuracy >= 40 ? "bg-warning/10 text-warning" : "bg-error/10 text-error"}`}>
                      {topic.accuracy >= 75 ? "Strong" : topic.accuracy >= 40 ? "Watch" : "Revise"}
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2 text-[10px] text-text-secondary">
                    <span className="rounded-full bg-surface px-2.5 py-1">{topic.correct} correct</span>
                    <span className="rounded-full bg-surface px-2.5 py-1">{topic.wrong} wrong</span>
                    <span className="rounded-full bg-surface px-2.5 py-1">{topic.skipped} skipped</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-border-light bg-surface p-4 shadow-card sm:p-5">
              <div className="flex items-center gap-2 border-b border-border-light pb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div className="text-sm font-black uppercase tracking-[0.22em] text-text-secondary">Strengths And Focus</div>
              </div>
              <div className="mt-4 grid gap-2.5">
                <InsightList title="Strengths" tone="success" items={insight.strengths} />
                <InsightList title="Focus Areas" tone="warning" items={insight.focusAreas} />
              </div>
            </div>

            <div className="rounded-[28px] border border-border-light bg-surface p-4 shadow-card sm:p-5">
              <div className="flex items-center gap-2 border-b border-border-light pb-3">
                <Clock3 className="h-4 w-4 text-primary" />
                <div className="text-sm font-black uppercase tracking-[0.22em] text-text-secondary">Difficulty Pattern</div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {insight.difficultyInsights.map((bucket) => (
                  <div key={bucket.label} className="rounded-2xl border border-border-light bg-app-bg p-4 text-center">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-text-tertiary">{bucket.label}</div>
                    <div className="mt-2 text-2xl font-black text-primary">{bucket.accuracy}%</div>
                    <div className="mt-1 text-xs text-text-secondary">{bucket.correct} correct / {bucket.total}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="screen-review no-print mb-5 rounded-[30px] border border-border-light bg-surface p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-2 border-b border-border-light pb-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-black text-text-primary sm:text-xl">Compact Response Review</h2>
          </div>
          <div className="mt-4 grid gap-2.5 lg:grid-cols-2">
            {condensedQuestions.map(({ question, selected, isCorrect, topic }, index) => {
              const correctOptionObj = question.options.find((opt) => opt.optionKey === question.correctOption);
              const correctText = correctOptionObj
                ? `${correctOptionObj.optionKey}. ${correctOptionObj.optionText}`
                : question.correctOption;

              return (
                <article key={question.id} className={`rounded-[20px] border p-3.5 ${selected === null ? "border-warning/20 bg-warning/5" : isCorrect ? "border-success/20 bg-success/8" : "border-error/20 bg-error/5"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary">Question {index + 1} - {topic}</div>
                      <p className="mt-1.5 text-sm font-semibold leading-6 text-text-primary">{shortenText(question.questionText, 160)}</p>
                      
                      {!isCorrect && (
                        <div className="mt-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-75 mr-1.5">Correct Answer:</span>
                          <span>{correctText}</span>
                        </div>
                      )}
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${selected === null ? "bg-warning/10 text-warning" : isCorrect ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
                      {selected === null ? "Skipped" : isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {historyAttempts.length > 1 ? (
          <section className="screen-review no-print mb-5 rounded-[30px] border border-border-light bg-surface p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-2 border-b border-border-light pb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-black sm:text-xl">Assessment History</h2>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border-light text-text-secondary">
                    <th className="px-2 py-3 font-bold">Date & Time</th>
                    <th className="px-2 py-3 font-bold">Exam</th>
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
                        <td className="px-2 py-3 font-semibold text-text-primary">{hist.publishing.title}</td>
                        <td className="px-2 py-3 text-right font-bold text-text-primary">{hist.percentage}% ({hist.scoreObtained}/{hist.totalMarks})</td>
                        <td className="px-2 py-3 text-right">
                          {isCurrent ? <span className="text-text-tertiary">Viewing</span> : <Link href={`/exam-site/result/${hist.id}`} className="font-semibold text-primary hover:text-primary-hover">View Report</Link>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section id="print-report" className="hidden print:block">
          <div className="mx-auto max-w-[190mm] p-[8mm] text-slate-900">
            <div className="rounded-[18px] border border-slate-300 bg-white p-5">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">SmartUp Diagnosis Report</div>
                  <h1 className="mt-2 text-2xl font-black">{attempt.studentName}</h1>
                  <p className="mt-1 text-sm text-slate-600">{attempt.publishing.title}</p>
                </div>
                <div className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600">{formatAttemptDate(attempt.createdAt)}</div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-3">
                <PrintMetric title="Score" value={`${results.percentage}%`} helper={`${results.scoreObtained}/${results.totalMarks}`} />
                <PrintMetric title="Correct" value={String(attempt.correctCount)} helper="answers" />
                <PrintMetric title="Incorrect" value={String(attempt.wrongCount)} helper="answers" />
                <PrintMetric title="Skipped" value={String(attempt.unansweredCount)} helper="answers" />
              </div>

              <div className="mt-4 rounded-[16px] border border-slate-300 bg-slate-50 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Headline</div>
                <p className="mt-2 text-base font-bold leading-7">{insight.headline}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{insight.overview}</p>
              </div>

              <div className="mt-4 grid gap-4 grid-cols-2">
                <PrintList title="Strengths" items={insight.strengths.slice(0, 3)} />
                <PrintList title="Focus Areas" items={insight.focusAreas.slice(0, 3)} />
              </div>

              <div className="mt-4 grid gap-4 grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[16px] border border-slate-300 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Top Topic Summary</div>
                  <div className="mt-3 space-y-2">
                    {insight.topicInsights.slice(0, 4).map((topic) => (
                      <div key={topic.topic} className="grid grid-cols-[1fr_auto] gap-3 rounded-[12px] bg-slate-50 px-3 py-2.5 text-sm">
                        <div>
                          <div className="font-semibold">{topic.topic}</div>
                          <div className="text-xs text-slate-600">{topic.correct}/{topic.total} correct</div>
                        </div>
                        <div className="text-right font-bold text-slate-700">{topic.accuracy}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[16px] border border-slate-300 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Difficulty Pattern</div>
                  <div className="mt-3 space-y-2">
                    {insight.difficultyInsights.map((bucket) => (
                      <div key={bucket.label} className="rounded-[12px] bg-slate-50 px-3 py-2.5 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{bucket.label}</span>
                          <span className="font-bold">{bucket.accuracy}%</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-600">{bucket.correct} correct out of {bucket.total}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[16px] border border-emerald-300 bg-emerald-50 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Next Step</div>
                <p className="mt-2 text-sm font-semibold leading-6">{insight.nextStep}</p>
              </div>

              <div className="mt-4 rounded-[16px] border border-slate-300 p-4">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  <FileText className="h-3.5 w-3.5" />
                  Sample Review Snapshot
                </div>
                <div className="mt-3 grid gap-2">
                  {condensedQuestions.slice(0, 4).map(({ question, selected, isCorrect }, index) => (
                    <div key={question.id} className="grid grid-cols-[auto_1fr_auto] gap-3 rounded-[12px] bg-slate-50 px-3 py-2.5 text-sm">
                      <span className="font-bold text-slate-500">Q{index + 1}</span>
                      <span>{shortenText(question.questionText, 90)}</span>
                      <span className={`font-bold ${selected === null ? "text-amber-700" : isCorrect ? "text-emerald-700" : "text-rose-700"}`}>{selected === null ? "Skipped" : isCorrect ? "Correct" : "Incorrect"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="no-print flex flex-col gap-3 pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
          {nextExam ? (
            <NextExamButton
              studentName={attempt.studentName}
              studentBranch={attempt.studentBranch || ""}
              studentPhone={attempt.studentPhone || ""}
              classLevel={attempt.classLevel}
              publishingId={nextExam.id}
              subjectName={nextExam.subject.name}
            />
          ) : (
            <Link href="/exam-site" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-hover">
              <span>All Exams Completed</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <PrintButton />
          <Link href="/auth/login" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border-light bg-surface px-6 py-3 text-sm font-bold text-text-primary transition-colors hover:bg-app-bg">
            <Home className="h-4 w-4" />
            <span>Go to Portal Login</span>
          </Link>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-border-light bg-app-bg p-4">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-text-tertiary">{icon}<span>{label}</span></div>
      <div className="mt-3 text-3xl font-black text-text-primary">{value}</div>
      <div className="mt-1 text-xs text-text-secondary">{helper}</div>
    </div>
  );
}

function InsightList({ title, tone, items }: { title: string; tone: "success" | "warning"; items: string[] }) {
  return (
    <div className="rounded-[24px] border border-border-light bg-app-bg p-4">
      <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${tone === "success" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{title}</div>
      <div className="mt-2.5 space-y-2">
        {items.map((item) => <p key={item} className="text-sm leading-6 text-text-primary">- {item}</p>)}
      </div>
    </div>
  );
}

function PrintMetric({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <div className="rounded-[14px] border border-slate-300 bg-slate-50 p-3 text-center">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
      <div className="mt-1 text-xs text-slate-600">{helper}</div>
    </div>
  );
}

function PrintList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[16px] border border-slate-300 p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{title}</div>
      <div className="mt-3 space-y-2">
        {items.map((item) => <p key={item} className="text-sm leading-6">- {item}</p>)}
      </div>
    </div>
  );
}
