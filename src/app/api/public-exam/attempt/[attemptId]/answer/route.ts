import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/public-exam/db";
import { finalizeExpiredAttemptIfNeeded } from "@/lib/public-exam/attempts";

type RouteParams = { params: Promise<{ attemptId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { attemptId } = await params;
    const { questionId, selectedOption } = await request.json();

    if (!questionId || !selectedOption) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const token = request.cookies.get(`exam_session_${attemptId}`)?.value || request.headers.get("x-exam-session-token");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: { publishing: { select: { durationMinutes: true } } },
    });

    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    if (attempt.sessionTokenHash !== token) return NextResponse.json({ error: "Invalid session token" }, { status: 403 });
    if (attempt.status !== "in_progress") return NextResponse.json({ error: "Attempt is already submitted or expired" }, { status: 400 });

    const lifecycle = await finalizeExpiredAttemptIfNeeded(attemptId);
    if (lifecycle.expired) {
      return NextResponse.json({ error: "Attempt has expired and was auto-submitted" }, { status: 409 });
    }

    await db.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      update: { selectedOption, answeredAt: new Date() },
      create: { attemptId, questionId, selectedOption },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/public-exam/attempt/answer] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
