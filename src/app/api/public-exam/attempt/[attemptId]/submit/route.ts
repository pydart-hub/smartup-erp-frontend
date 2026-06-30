import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/public-exam/db";
import { gradeAttempt, QuestionSnapshot, AnswerRecord } from "@/lib/public-exam/grading";

type RouteParams = {
  params: Promise<{
    attemptId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { attemptId } = await params;
    const body = await request.json().catch(() => ({}));
    const autoSubmitted = !!body.autoSubmitted;

    // Verify session token
    const token = request.cookies.get(`exam_session_${attemptId}`)?.value || request.headers.get("x-exam-session-token");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        publishing: {
          include: {
            subject: { select: { name: true } },
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.status !== "in_progress") {
      return NextResponse.json({ error: "Attempt is already submitted" }, { status: 400 });
    }

    if (attempt.sessionTokenHash !== token) {
      return NextResponse.json({ error: "Invalid session token" }, { status: 403 });
    }

    // Load static snapshot of paper
    const paperQuestions: QuestionSnapshot[] = typeof attempt.paperSnapshotJson === "string"
      ? JSON.parse(attempt.paperSnapshotJson)
      : (attempt.paperSnapshotJson as unknown as QuestionSnapshot[]);

    // Get all student answers
    const answers = await db.attemptAnswer.findMany({
      where: { attemptId },
      select: { questionId: true, selectedOption: true },
    });

    const studentAnswers: AnswerRecord[] = answers.map((a) => ({
      questionId: a.questionId,
      selectedOption: a.selectedOption,
    }));

    // Grade attempt
    const graded = gradeAttempt(
      attempt.studentName,
      attempt.publishing.title ?? "Diagnosis Exam",
      paperQuestions,
      studentAnswers,
      attempt.classLevel
    );

    // Save final stats and results JSON in database
    const updatedAttempt = await db.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: autoSubmitted ? "auto_submitted" : "submitted",
        submittedAt: new Date(),
        scoreObtained: graded.scoreObtained,
        percentage: graded.percentage,
        correctCount: graded.correctCount,
        wrongCount: graded.wrongCount,
        unansweredCount: graded.unansweredCount,
        resultSnapshotJson: JSON.stringify(graded),
      },
    });

    const response = NextResponse.json({
      success: true,
      attemptId: updatedAttempt.id,
    });

    // Clear session cookie
    response.cookies.delete(`exam_session_${attemptId}`);

    return response;
  } catch (error) {
    console.error("[api/public-exam/attempt/submit] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
