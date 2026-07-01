import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/public-exam/db";
import { finalizeExpiredAttemptIfNeeded } from "@/lib/public-exam/attempts";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { studentName, studentBranch, studentPhone, classLevel, publishingId } = await request.json();
    const normalizedPhone = typeof studentPhone === "string" ? studentPhone.replace(/\D/g, "") : "";

    if (!studentName?.trim() || !studentBranch || !normalizedPhone || !classLevel || !publishingId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    if (!/^\d{10}$/.test(normalizedPhone)) {
      return NextResponse.json({ error: "Please enter a valid 10-digit phone number" }, { status: 400 });
    }

    const publishing = await db.examPublishing.findUnique({
      where: { id: publishingId },
      include: { paper: { select: { totalMarks: true } } },
    });

    if (!publishing || !publishing.isActive) {
      return NextResponse.json({ error: "Exam is not active or not found" }, { status: 404 });
    }

    const existingAttempts = await db.examAttempt.findMany({
      where: { publishingId, studentPhone: normalizedPhone, status: "in_progress" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    for (const existingAttempt of existingAttempts) {
      const lifecycle = await finalizeExpiredAttemptIfNeeded(existingAttempt.id);
      if (lifecycle.attempt?.status === "in_progress" && !lifecycle.expired) {
        const sessionToken = randomUUID();
        await db.examAttempt.update({ where: { id: existingAttempt.id }, data: { sessionTokenHash: sessionToken } });

        const response = NextResponse.json({ attemptId: existingAttempt.id, sessionToken, resumed: true });
        response.cookies.set(`exam_session_${existingAttempt.id}`, sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 60 * 60 * 4,
        });
        return response;
      }
    }

    const publishingWithQuestions = await db.examPublishing.findUnique({
      where: { id: publishingId },
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
    });

    if (!publishingWithQuestions) {
      return NextResponse.json({ error: "Exam is not active or not found" }, { status: 404 });
    }

    const questionsSnapshot = publishingWithQuestions.paper.questions.map((pq) => {
      const q = pq.question;
      return {
        id: q.id,
        classLevel: q.classLevel,
        questionText: q.questionText,
        difficulty: q.difficulty,
        marks: pq.marks,
        displayOrder: pq.displayOrder,
        correctOption: q.correctOption,
        options: q.options.map((opt) => ({ id: opt.id, optionKey: opt.optionKey, optionText: opt.optionText })),
      };
    });

    const sessionToken = randomUUID();
    const attempt = await db.examAttempt.create({
      data: {
        publishingId: publishing.id,
        studentName: studentName.trim(),
        studentBranch: studentBranch.trim(),
        studentPhone: normalizedPhone,
        classLevel,
        status: "in_progress",
        totalMarks: publishing.paper.totalMarks,
        paperSnapshotJson: JSON.stringify(questionsSnapshot),
        sessionTokenHash: sessionToken,
      },
    });

    const response = NextResponse.json({ attemptId: attempt.id, sessionToken, resumed: false });
    response.cookies.set(`exam_session_${attempt.id}`, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 4,
    });

    return response;
  } catch (error) {
    console.error("[api/public-exam/start] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
