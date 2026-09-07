import React from "react";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/public-exam/db";
import { finalizeExpiredAttemptIfNeeded, parsePaperSnapshot } from "@/lib/public-exam/attempts";
import ScholarExamPlayer from "@/components/scholar/ScholarExamPlayer";

type PageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export default async function ScholarAttemptPage({ params }: PageProps) {
  const { attemptId } = await params;
  const lifecycle = await finalizeExpiredAttemptIfNeeded(attemptId);
  const attempt = lifecycle.attempt;

  if (!attempt) {
    return notFound();
  }

  if (attempt.status !== "in_progress") {
    return redirect(`/scholar/result/${attemptId}`);
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
    <ScholarExamPlayer
      attemptId={attempt.id}
      studentName={attempt.studentName}
      examTitle={attempt.publishing.title}
      classLevel={attempt.classLevel}
      durationMinutes={questions.length > 0 ? questions.length : (attempt.publishing.durationMinutes || 40)}
      startedAt={attempt.startedAt.toISOString()}
      questions={questions}
      initialAnswers={answersMap}
    />
  );
}
