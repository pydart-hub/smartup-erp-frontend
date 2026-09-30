import React from "react";
import { notFound, redirect } from "next/navigation";
import { levelupDb } from "@/lib/levelup-exam/db";
import { finalizeExpiredLevelUpAttemptIfNeeded, parsePaperSnapshot } from "@/lib/levelup-exam/attempts";
import LevelUpExamPlayer from "@/components/levelup/LevelUpExamPlayer";

type PageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export default async function LevelUpAttemptPage({ params }: PageProps) {
  const { attemptId } = await params;
  const lifecycle = await finalizeExpiredLevelUpAttemptIfNeeded(attemptId);
  const attempt = lifecycle.attempt;

  if (!attempt) {
    return notFound();
  }

  if (attempt.status !== "in_progress") {
    return redirect(`/levelup/result/${attemptId}`);
  }

  const questions = parsePaperSnapshot(attempt.paperSnapshotJson);

  const savedAnswers = await levelupDb.levelUpAttemptAnswer.findMany({
    where: { attemptId },
    select: { questionId: true, selectedOption: true },
  });

  const answersMap: Record<string, string> = {};
  savedAnswers.forEach((answer) => {
    answersMap[answer.questionId] = answer.selectedOption;
  });

  return (
    <LevelUpExamPlayer
      attemptId={attempt.id}
      studentName={attempt.studentName}
      studentPhone={attempt.studentPhone || ""}
      examTitle={attempt.publishing.title}
      classLevel={attempt.classLevel}
      durationMinutes={questions.length > 0 ? questions.length : (attempt.publishing.durationMinutes || 45)}
      startedAt={attempt.startedAt.toISOString()}
      questions={questions}
      initialAnswers={answersMap}
    />
  );
}
