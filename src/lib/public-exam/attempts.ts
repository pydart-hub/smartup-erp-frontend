import { db } from "@/lib/public-exam/db";
import { AnswerRecord, gradeAttempt, QuestionSnapshot } from "@/lib/public-exam/grading";

type AttemptLifecycleRecord = {
  id: string;
  studentName: string;
  classLevel: string;
  status: string;
  startedAt: Date;
  paperSnapshotJson: unknown;
  publishing: {
    title: string;
    durationMinutes: number;
  };
};

async function findAttemptWithPublishing(attemptId: string) {
  return db.examAttempt.findUnique({
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
}

export function parsePaperSnapshot(paperSnapshotJson: unknown): QuestionSnapshot[] {
  return typeof paperSnapshotJson === "string"
    ? JSON.parse(paperSnapshotJson)
    : (paperSnapshotJson as QuestionSnapshot[]);
}

export function getAttemptDeadline(startedAt: Date, durationMinutes: number): Date {
  return new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
}

export function isAttemptExpired(startedAt: Date, durationMinutes: number, now = new Date()): boolean {
  return now.getTime() >= getAttemptDeadline(startedAt, durationMinutes).getTime();
}

async function finalizeAttempt(
  attempt: AttemptLifecycleRecord,
  status: "submitted" | "auto_submitted",
  now = new Date()
) {
  const answers = await db.attemptAnswer.findMany({
    where: { attemptId: attempt.id },
    select: { questionId: true, selectedOption: true },
  });

  const studentAnswers: AnswerRecord[] = answers.map((answer) => ({
    questionId: answer.questionId,
    selectedOption: answer.selectedOption,
  }));

  const paperQuestions = parsePaperSnapshot(attempt.paperSnapshotJson);
  const graded = gradeAttempt(
    attempt.studentName,
    attempt.publishing.title ?? "Diagnosis Exam",
    paperQuestions,
    studentAnswers,
    attempt.classLevel
  );

  await db.examAttempt.update({
    where: { id: attempt.id },
    data: {
      status,
      submittedAt: now,
      scoreObtained: graded.scoreObtained,
      percentage: graded.percentage,
      correctCount: graded.correctCount,
      wrongCount: graded.wrongCount,
      unansweredCount: graded.unansweredCount,
      resultSnapshotJson: JSON.stringify(graded),
    },
  });

  return findAttemptWithPublishing(attempt.id);
}

export async function finalizeExpiredAttemptIfNeeded(attemptId: string, now = new Date()) {
  const attempt = await findAttemptWithPublishing(attemptId);

  if (!attempt) {
    return { attempt: null, finalized: false, expired: false };
  }

  const expired = isAttemptExpired(attempt.startedAt, attempt.publishing.durationMinutes, now);

  if (attempt.status !== "in_progress" || !expired) {
    return { attempt, finalized: false, expired };
  }

  const finalizedAttempt = await finalizeAttempt(attempt, "auto_submitted", now);
  return { attempt: finalizedAttempt, finalized: true, expired: true };
}

export async function submitAttempt(attemptId: string, autoSubmitted: boolean, now = new Date()) {
  const attempt = await findAttemptWithPublishing(attemptId);

  if (!attempt) {
    return null;
  }

  if (attempt.status !== "in_progress") {
    return attempt;
  }

  return finalizeAttempt(attempt, autoSubmitted ? "auto_submitted" : "submitted", now);
}
