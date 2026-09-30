import { NextRequest, NextResponse } from "next/server";
import { levelupDb } from "@/lib/levelup-exam/db";
import { finalizeExpiredLevelUpAttemptIfNeeded } from "@/lib/levelup-exam/attempts";

type RouteParams = { params: Promise<{ attemptId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { attemptId } = await params;
    const { answers } = await request.json();

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: "Missing answers" }, { status: 400 });
    }

    const sanitizedAnswers = answers
      .filter((answer) => answer && typeof answer.questionId === "string" && typeof answer.selectedOption === "string")
      .map((answer) => ({ questionId: answer.questionId, selectedOption: answer.selectedOption }));

    if (sanitizedAnswers.length === 0) {
      return NextResponse.json({ error: "No valid answers supplied" }, { status: 400 });
    }

    const token =
      request.cookies.get(`levelup_session_${attemptId}`)?.value ||
      request.headers.get("x-levelup-session-token");

    if (!token) return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });

    const attempt = await levelupDb.levelUpAttempt.findUnique({
      where: { id: attemptId },
      include: { publishing: { select: { durationMinutes: true } } },
    });

    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    if (attempt.sessionTokenHash !== token) return NextResponse.json({ error: "Invalid session token" }, { status: 403 });
    if (attempt.status !== "in_progress") return NextResponse.json({ error: "Attempt is already submitted or expired" }, { status: 400 });

    const lifecycle = await finalizeExpiredLevelUpAttemptIfNeeded(attemptId);
    if (lifecycle.expired) {
      return NextResponse.json({ error: "Attempt has expired and was auto-submitted" }, { status: 409 });
    }

    await levelupDb.$transaction(
      sanitizedAnswers.map((answer) =>
        levelupDb.levelUpAttemptAnswer.upsert({
          where: { attemptId_questionId: { attemptId, questionId: answer.questionId } },
          update: { selectedOption: answer.selectedOption, answeredAt: new Date() },
          create: { attemptId, questionId: answer.questionId, selectedOption: answer.selectedOption },
        })
      )
    );

    return NextResponse.json({ success: true, savedCount: sanitizedAnswers.length });
  } catch (error) {
    console.error("[api/levelup/attempt/answers] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
