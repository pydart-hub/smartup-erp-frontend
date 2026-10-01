import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/public-exam/db";
import { finalizeExpiredAttemptIfNeeded, submitAttempt } from "@/lib/public-exam/attempts";

type RouteParams = { params: Promise<{ attemptId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { attemptId } = await params;
    const body = await request.json().catch(() => ({}));
    const autoSubmitted = !!body.autoSubmitted;

    const token = request.cookies.get(`exam_session_${attemptId}`)?.value || request.headers.get("x-exam-session-token");
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

    // Sync Diagnosed Level to Frappe in background (best-effort)
    if (updatedAttempt.studentPhone && updatedAttempt.resultSnapshotJson) {
      try {
        const resObj = typeof updatedAttempt.resultSnapshotJson === "string"
          ? JSON.parse(updatedAttempt.resultSnapshotJson)
          : updatedAttempt.resultSnapshotJson;
        const diagnosedLevel = resObj?.diagnosedLevel;
        const subjectName = updatedAttempt.publishing?.subject?.name || "";

        if (diagnosedLevel && subjectName) {
          // Find student in Frappe by mobile number
          const studentRes = await fetch(
            `${process.env.NEXT_PUBLIC_FRAPPE_URL}/api/resource/Student?filters=${encodeURIComponent(
              JSON.stringify([["student_mobile_number", "=", updatedAttempt.studentPhone]])
            )}&fields=${encodeURIComponent(JSON.stringify(["name"]))}&limit_page_length=1`,
            {
              headers: { Authorization: `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}` },
              cache: "no-store",
            }
          ).then((r) => (r.ok ? r.json() : null));

          const frappeStudentId = studentRes?.data?.[0]?.name;
          if (frappeStudentId) {
            // Find Assessment Result for this student & course under Diagnosis Exam
            const arRes = await fetch(
              `${process.env.NEXT_PUBLIC_FRAPPE_URL}/api/resource/Assessment%20Result?filters=${encodeURIComponent(
                JSON.stringify([
                  ["student", "=", frappeStudentId],
                  ["assessment_group", "=", "Diagnosis Exam"],
                  ["course", "like", `%${subjectName}%`],
                ])
              )}&fields=${encodeURIComponent(JSON.stringify(["name"]))}&limit_page_length=1`,
              {
                headers: { Authorization: `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}` },
                cache: "no-store",
              }
            ).then((r) => (r.ok ? r.json() : null));

            const arName = arRes?.data?.[0]?.name;
            if (arName) {
              await fetch(
                `${process.env.NEXT_PUBLIC_FRAPPE_URL}/api/resource/Assessment%20Result/${encodeURIComponent(arName)}`,
                {
                  method: "PUT",
                  headers: {
                    Authorization: `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ custom_diagnosed_level: diagnosedLevel }),
                  cache: "no-store",
                }
              );
            }
          }
        }
      } catch (err) {
        console.warn("[syncAttemptToFrappe] Best-effort sync skipped:", err);
      }
    }

    const response = NextResponse.json({ success: true, attemptId: updatedAttempt.id, autoSubmitted: updatedAttempt.status === "auto_submitted" });
    response.cookies.delete(`exam_session_${attemptId}`);
    return response;
  } catch (error) {
    console.error("[api/public-exam/attempt/submit] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
