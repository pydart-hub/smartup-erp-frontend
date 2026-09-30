import { NextRequest, NextResponse } from "next/server";
import { levelupDb } from "@/lib/levelup-exam/db";
import { finalizeExpiredLevelUpAttemptIfNeeded, submitLevelUpAttempt } from "@/lib/levelup-exam/attempts";

type RouteParams = { params: Promise<{ attemptId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { attemptId } = await params;
    const body = await request.json().catch(() => ({}));
    const autoSubmitted = !!body.autoSubmitted;

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
    if (attempt.status !== "in_progress") return NextResponse.json({ error: "Attempt is already submitted" }, { status: 400 });

    const lifecycle = await finalizeExpiredLevelUpAttemptIfNeeded(attemptId);
    const updatedAttempt = lifecycle.finalized ? lifecycle.attempt : await submitLevelUpAttempt(attemptId, autoSubmitted);

    if (!updatedAttempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Mark LevelUpRegistration as completed if exists
    await levelupDb.levelUpRegistration.updateMany({
      where: { attemptId: updatedAttempt.id },
      data: { status: "completed" },
    }).catch((err) => console.warn("Could not update levelUpRegistration status:", err));

    const response = NextResponse.json({
      success: true,
      attemptId: updatedAttempt.id,
      autoSubmitted: updatedAttempt.status === "auto_submitted",
    });

    response.cookies.delete(`levelup_session_${attemptId}`);
    return response;
  } catch (error) {
    console.error("[api/levelup/attempt/submit] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
