import React from "react";
import { notFound } from "next/navigation";
import { levelupDb } from "@/lib/levelup-exam/db";
import { finalizeExpiredLevelUpAttemptIfNeeded } from "@/lib/levelup-exam/attempts";
import LevelUpResultView from "@/components/levelup/LevelUpResultView";

type PageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export default async function LevelUpResultPage({ params }: PageProps) {
  const { attemptId } = await params;
  const lifecycle = await finalizeExpiredLevelUpAttemptIfNeeded(attemptId);
  const attempt = lifecycle.attempt;

  if (!attempt) {
    return notFound();
  }

  const hydratedAttempt = await levelupDb.levelUpAttempt.findUnique({
    where: { id: attemptId },
    include: {
      answers: true,
      publishing: {
        include: {
          paper: {
            include: {
              questions: {
                include: {
                  question: {
                    include: {
                      options: { orderBy: { displayOrder: "asc" } },
                    },
                  },
                },
                orderBy: { displayOrder: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!hydratedAttempt) {
    return notFound();
  }

  let rawQuestions: any[] = [];
  if (hydratedAttempt.paperSnapshotJson) {
    try {
      rawQuestions = typeof hydratedAttempt.paperSnapshotJson === "string"
        ? JSON.parse(hydratedAttempt.paperSnapshotJson)
        : hydratedAttempt.paperSnapshotJson;
    } catch {
      rawQuestions = [];
    }
  }

  const answersMap = new Map<string, string>();
  hydratedAttempt.answers.forEach((ans) => {
    answersMap.set(ans.questionId, ans.selectedOption);
  });

  const questionsWithAnswers = rawQuestions.map((q: any, idx: number) => {
    const selectedOption = answersMap.get(q.id) || null;
    const isCorrect = selectedOption === q.correctOption;
    return {
      id: q.id,
      questionNumber: idx + 1,
      questionText: q.questionText,
      options: q.options || [],
      correctOption: q.correctOption,
      selectedOption,
      isCorrect,
      marks: q.marks || 1,
    };
  });

  return (
    <LevelUpResultView
      attempt={{
        id: hydratedAttempt.id,
        studentName: hydratedAttempt.studentName,
        schoolName: hydratedAttempt.schoolName,
        studentPhone: hydratedAttempt.studentPhone,
        classLevel: hydratedAttempt.classLevel,
        country: hydratedAttempt.country,
        emirateCity: hydratedAttempt.emirateCity,
        curriculum: hydratedAttempt.curriculum,
        scoreObtained: hydratedAttempt.scoreObtained,
        totalMarks: hydratedAttempt.totalMarks,
        percentage: hydratedAttempt.percentage,
        correctCount: hydratedAttempt.correctCount,
        wrongCount: hydratedAttempt.wrongCount,
        unansweredCount: hydratedAttempt.unansweredCount,
        createdAt: hydratedAttempt.createdAt.toISOString(),
        questions: questionsWithAnswers,
      }}
    />
  );
}
