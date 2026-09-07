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

  const hydratedAttempt = await db.examAttempt.findUnique({
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

  // Parse questions from paperSnapshotJson or fallback to publishing paper questions
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

  // Fallback to database paper questions if snapshot wasn't present
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    rawQuestions = (hydratedAttempt.publishing?.paper?.questions || []).map((pq) => {
      const q = pq.question;
      return {
        id: q.id,
        questionText: q.questionText,
        correctOption: q.correctOption,
        marks: pq.marks || 1,
        options: q.options.map((opt) => ({
          optionKey: opt.optionKey,
          optionText: opt.optionText,
        })),
      };
    });
  }

  // Build answer lookup map
  const answerMap = new Map<string, string | null>();
  for (const ans of hydratedAttempt.answers) {
    answerMap.set(ans.questionId, ans.selectedOption);
  }

  // Build formatted questions list with student's answers and correctness
  const questions = (rawQuestions || []).map((q: any, index: number) => {
    const selectedOption = answerMap.get(q.id) ?? null;
    const correctOption = String(q.correctOption || "").trim().toUpperCase();
    const normalizedSelected = selectedOption ? String(selectedOption).trim().toUpperCase() : null;
    const isCorrect = normalizedSelected !== null && normalizedSelected === correctOption;

    return {
      id: q.id || `q-${index + 1}`,
      questionNumber: index + 1,
      questionText: q.questionText,
      options: (q.options || []).map((opt: any) => ({
        optionKey: String(opt.optionKey || "").trim().toUpperCase(),
        optionText: opt.optionText || "",
      })),
      correctOption,
      selectedOption: normalizedSelected,
      isCorrect,
      marks: q.marks || 1,
    };
  });

  return (
    <ScholarResultView
      attempt={{
        id: hydratedAttempt.id,
        studentName: hydratedAttempt.studentName,
        studentPhone: hydratedAttempt.studentPhone,
        classLevel: hydratedAttempt.classLevel,
        studentBranch: hydratedAttempt.studentBranch,
        scoreObtained: hydratedAttempt.scoreObtained,
        totalMarks: hydratedAttempt.totalMarks,
        percentage: hydratedAttempt.percentage,
        correctCount: hydratedAttempt.correctCount,
        wrongCount: hydratedAttempt.wrongCount,
        unansweredCount: hydratedAttempt.unansweredCount,
        createdAt: hydratedAttempt.createdAt.toISOString(),
        questions,
      }}
    />
  );
}

