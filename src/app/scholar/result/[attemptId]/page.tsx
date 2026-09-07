import React from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/public-exam/db";
import { finalizeExpiredAttemptIfNeeded } from "@/lib/public-exam/attempts";
import ScholarResultView from "@/components/scholar/ScholarResultView";

type PageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export default async function ScholarResultPage({ params }: PageProps) {
  const { attemptId } = await params;
  const lifecycle = await finalizeExpiredAttemptIfNeeded(attemptId);
  const attempt = lifecycle.attempt;

  if (!attempt) {
    return notFound();
  }

  return (
    <ScholarResultView
      attempt={{
        id: attempt.id,
        studentName: attempt.studentName,
        studentPhone: attempt.studentPhone,
        classLevel: attempt.classLevel,
        studentBranch: attempt.studentBranch,
        scoreObtained: attempt.scoreObtained,
        totalMarks: attempt.totalMarks,
        percentage: attempt.percentage,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        unansweredCount: attempt.unansweredCount,
        createdAt: attempt.createdAt.toISOString(),
      }}
    />
  );
}
