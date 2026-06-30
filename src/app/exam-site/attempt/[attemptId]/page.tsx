import React from "react";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/public-exam/db";
import ExamPlayer from "@/components/public-exam/ExamPlayer";

type PageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export default async function AttemptPage({ params }: PageProps) {
  const { attemptId } = await params;

  // Retrieve attempt details from database
  const attempt = await db.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      publishing: {
        select: {
          title: true,
          durationMinutes: true,
        },
      },
    },
  });

  if (!attempt) {
    return notFound();
  }

  // Redirect to results if already submitted
  if (attempt.status !== "in_progress") {
    return redirect(`/exam-site/result/${attemptId}`);
  }

  // Parse frozen paper snapshot
  const questions = typeof attempt.paperSnapshotJson === "string"
    ? JSON.parse(attempt.paperSnapshotJson)
    : attempt.paperSnapshotJson;

  // Fetch student's pre-saved answers
  const savedAnswers = await db.attemptAnswer.findMany({
    where: { attemptId },
    select: { questionId: true, selectedOption: true },
  });

  const answersMap: Record<string, string> = {};
  savedAnswers.forEach((ans) => {
    answersMap[ans.questionId] = ans.selectedOption;
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
