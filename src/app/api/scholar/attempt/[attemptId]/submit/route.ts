import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/public-exam/db";
import { finalizeExpiredAttemptIfNeeded, submitAttempt } from "@/lib/public-exam/attempts";

type RouteParams = { params: Promise<{ attemptId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { attemptId } = await params;
    const body = await request.json().catch(() => ({}));
    const autoSubmitted = !!body.autoSubmitted;

    const token =
      request.cookies.get(`scholar_session_${attemptId}`)?.value ||
      request.cookies.get(`exam_session_${attemptId}`)?.value ||
      request.headers.get("x-scholar-session-token") ||
      request.headers.get("x-exam-session-token");

    if (!token) return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });

    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: { publishing: { select: { durationMinutes: true } } },
    });

    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    if (attempt.sessionTokenHash !== token) return NextResponse.json({ error: "Invalid session token" }, { status: 403 });
    if (attempt.status !== "in_progress") return NextResponse.json({ error: "Attempt is already submitted" }, { status: 400 });

    const lifecycle = await finalizeExpiredAttemptIfNeeded(attemptId);
    const updatedAttempt = lifecycle.finalized ? lifecycle.attempt : await submitAttempt(attemptId, autoSubmitted);

    if (!updatedAttempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Mark ScholarRegistration as completed if exists
    await db.scholarRegistration.updateMany({
      where: { attemptId: updatedAttempt.id },
      data: { status: "completed" },
    }).catch((err) => console.warn("Could not update scholarRegistration status:", err));

    const response = NextResponse.json({
      success: true,
      attemptId: updatedAttempt.id,
      autoSubmitted: updatedAttempt.status === "auto_submitted",
    });

    response.cookies.delete(`scholar_session_${attemptId}`);
    return response;
  } catch (error) {
    console.error("[api/scholar/attempt/submit] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
