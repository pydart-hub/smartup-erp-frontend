import { levelupDb } from "@/lib/levelup-exam/db";
import { AnswerRecord, gradeAttempt, QuestionSnapshot } from "@/lib/public-exam/grading";

type LevelUpAttemptLifecycleRecord = {
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

async function findLevelUpAttemptWithPublishing(attemptId: string) {
  return levelupDb.levelUpAttempt.findUnique({
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

export function isAttemptExpired(startedAt: Date, durationMinutes: number, now = new Date(), graceMinutes = 2): boolean {
  return now.getTime() >= (getAttemptDeadline(startedAt, durationMinutes).getTime() + graceMinutes * 60 * 1000);
}

async function finalizeLevelUpAttempt(
  attempt: LevelUpAttemptLifecycleRecord,
  status: "submitted" | "auto_submitted",
  now = new Date()
) {
  const answers = await levelupDb.levelUpAttemptAnswer.findMany({
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
    attempt.publishing.title ?? "LevelUp GCC Scholarship Exam",
    paperQuestions,
    studentAnswers,
    attempt.classLevel
  );

  await levelupDb.levelUpAttempt.update({
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

  return findLevelUpAttemptWithPublishing(attempt.id);
}

export async function finalizeExpiredLevelUpAttemptIfNeeded(attemptId: string, now = new Date()) {
  const attempt = await findLevelUpAttemptWithPublishing(attemptId);

  if (!attempt) {
    return { attempt: null, finalized: false, expired: false };
  }

  const paperQuestions = parsePaperSnapshot(attempt.paperSnapshotJson);
  const effectiveDurationMinutes = paperQuestions.length > 0 ? paperQuestions.length : (attempt.publishing.durationMinutes || 45);
  const expired = isAttemptExpired(attempt.startedAt, effectiveDurationMinutes, now);

  if (attempt.status !== "in_progress" || !expired) {
    return { attempt, finalized: false, expired };
  }

  const finalizedAttempt = await finalizeLevelUpAttempt(attempt, "auto_submitted", now);
  return { attempt: finalizedAttempt, finalized: true, expired: true };
}

export async function submitLevelUpAttempt(attemptId: string, autoSubmitted = false) {
  const attempt = await findLevelUpAttemptWithPublishing(attemptId);

  if (!attempt) {
    return null;
  }

  const status = autoSubmitted ? "auto_submitted" : "submitted";
  return finalizeLevelUpAttempt(attempt, status);
}
