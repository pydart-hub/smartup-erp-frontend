import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/public-exam/db";
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
      include: {
        paper: {
          include: {
            questions: {
              include: {
                question: {
                  include: {
                    options: {
                      orderBy: { displayOrder: "asc" },
                    },
                  },
                },
              },
              orderBy: { displayOrder: "asc" },
            },
          },
        },
        subject: true,
      },
    });

    if (!publishing || !publishing.isActive) {
      return NextResponse.json({ error: "Exam is not active or not found" }, { status: 404 });
    }

    const questionsSnapshot = publishing.paper.questions.map((pq) => {
      const q = pq.question;
      return {
        id: q.id,
        classLevel: q.classLevel,
        questionText: q.questionText,
        difficulty: q.difficulty,
        marks: pq.marks,
        displayOrder: pq.displayOrder,
        correctOption: q.correctOption,
        options: q.options.map((opt) => ({
          id: opt.id,
          optionKey: opt.optionKey,
          optionText: opt.optionText,
        })),
      };
    });

    const sessionToken = randomUUID();
    const sessionTokenHash = sessionToken;

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
        sessionTokenHash,
      },
    });

    const response = NextResponse.json({
      attemptId: attempt.id,
      sessionToken,
    });

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
