import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/public-exam/db";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { studentName, classLevel, publishingId } = await request.json();

    if (!studentName?.trim() || !classLevel || !publishingId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
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

    // Format the questions into a frozen snapshot
    const questionsSnapshot = publishing.paper.questions.map((pq) => {
      const q = pq.question;
      return {
        id: q.id,
        classLevel: q.classLevel,
        questionText: q.questionText,
        difficulty: q.difficulty,
        marks: pq.marks,
        displayOrder: pq.displayOrder,
        correctOption: q.correctOption, // to grade on server
        options: q.options.map((opt) => ({
          id: opt.id,
          optionKey: opt.optionKey,
          optionText: opt.optionText,
        })),
      };
    });

    // Generate secure session token to authorize answer updates
    const sessionToken = randomUUID();
    const sessionTokenHash = sessionToken; // simple hash/token matching

    // Create attempt
    const attempt = await db.examAttempt.create({
      data: {
        publishingId: publishing.id,
        studentName: studentName.trim(),
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

    // Set HTTP-only cookie for attempt authentication
    response.cookies.set(`exam_session_${attempt.id}`, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 4, // 4 hours
    });

    return response;
  } catch (error) {
    console.error("[api/public-exam/start] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
