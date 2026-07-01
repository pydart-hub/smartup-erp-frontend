import React from "react";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/public-exam/db";
import ExamPlayer from "@/components/public-exam/ExamPlayer";
import { finalizeExpiredAttemptIfNeeded, parsePaperSnapshot } from "@/lib/public-exam/attempts";

type PageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export default async function AttemptPage({ params }: PageProps) {
  const { attemptId } = await params;
  const lifecycle = await finalizeExpiredAttemptIfNeeded(attemptId);
  const attempt = lifecycle.attempt;

  if (!attempt) {
    return notFound();
  }

  if (attempt.status !== "in_progress") {
    return redirect(`/exam-site/result/${attemptId}`);
  }

  const questions = parsePaperSnapshot(attempt.paperSnapshotJson);

  const savedAnswers = await db.attemptAnswer.findMany({
    where: { attemptId },
    select: { questionId: true, selectedOption: true },
  });

  const answersMap: Record<string, string> = {};
  savedAnswers.forEach((answer) => {
    answersMap[answer.questionId] = answer.selectedOption;
  });

  return (
    <ExamPlayer
      attemptId={attempt.id}
      studentName={attempt.studentName}
      examTitle={attempt.publishing.title}
      durationMinutes={attempt.publishing.durationMinutes}
      startedAt={attempt.startedAt.toISOString()}
      questions={questions}
      initialAnswers={answersMap}
    />
  );
}
