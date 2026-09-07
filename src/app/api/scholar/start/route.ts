import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/public-exam/db";
import { finalizeExpiredAttemptIfNeeded } from "@/lib/public-exam/attempts";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { name, phone, selectedClass, district, registrationId } = await request.json();
    const normalizedPhone = typeof phone === "string" ? phone.replace(/\D/g, "") : "";

    if (!name?.trim() || !normalizedPhone || !selectedClass) {
      return NextResponse.json({ error: "Missing required student details" }, { status: 400 });
    }

    if (!/^\d{10}$/.test(normalizedPhone)) {
      return NextResponse.json({ error: "Please enter a valid 10-digit phone number" }, { status: 400 });
    }

    // Map class label to class level
    const classLevelMap: Record<string, string> = {
      "Class 8": "8",
      "Class 9": "9",
      "Class 10": "10",
      "Plus One (+1)": "11",
      "+1": "11",
      "Plus Two (+2)": "12",
      "+2": "12",
    };
    const targetLevel = classLevelMap[selectedClass] || selectedClass;

    // Find the dedicated active scholarship exam publishing for this class level
    const publishing = await db.examPublishing.findFirst({
      where: {
        classLevel: targetLevel,
        isActive: true,
        OR: [
          { slug: { startsWith: "scholarship-" } },
          { title: { contains: "Scholarship", mode: "insensitive" } },
        ],
      },
      include: {
        paper: {
          select: { totalMarks: true },
        },
      },
    });

    if (!publishing) {
      return NextResponse.json(
        { error: `No active scholarship exam found for ${selectedClass}. Please check back soon.` },
        { status: 404 }
      );
    }

    // Check if there is an in-progress attempt already for this student and publishing
    const existingAttempts = await db.examAttempt.findMany({
      where: {
        publishingId: publishing.id,
        studentPhone: normalizedPhone,
        status: "in_progress",
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    for (const existingAttempt of existingAttempts) {
      const lifecycle = await finalizeExpiredAttemptIfNeeded(existingAttempt.id);
      if (lifecycle.attempt?.status === "in_progress" && !lifecycle.expired) {
        const sessionToken = randomUUID();
        await db.examAttempt.update({
          where: { id: existingAttempt.id },
          data: { sessionTokenHash: sessionToken },
        });

        const response = NextResponse.json({
          success: true,
          attemptId: existingAttempt.id,
          sessionToken,
          resumed: true,
        });

        response.cookies.set(`scholar_session_${existingAttempt.id}`, sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 60 * 60 * 4,
        });

        return response;
      }
    }

    // Load the publishing with complete paper questions
    const publishingWithQuestions = await db.examPublishing.findUnique({
      where: { id: publishing.id },
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
      return NextResponse.json({ error: "Scholarship paper questions not available" }, { status: 404 });
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
        options: q.options.map((opt) => ({
          id: opt.id,
          optionKey: opt.optionKey,
          optionText: opt.optionText,
        })),
      };
    });

    const sessionToken = randomUUID();
    const attempt = await db.examAttempt.create({
      data: {
        publishingId: publishing.id,
        studentName: name.trim(),
        studentBranch: district || "Ernakulam",
        studentPhone: normalizedPhone,
        classLevel: targetLevel,
        status: "in_progress",
        totalMarks: publishing.paper.totalMarks,
        paperSnapshotJson: JSON.stringify(questionsSnapshot),
        sessionTokenHash: sessionToken,
      },
    });

    // Update scholarRegistration if ID was provided
    if (registrationId) {
      await db.scholarRegistration.update({
        where: { id: registrationId },
        data: {
          status: "attempting",
          attemptId: attempt.id,
        },
      }).catch((e) => console.warn("Could not link scholarRegistration:", e));
    }

    const response = NextResponse.json({
      success: true,
      attemptId: attempt.id,
      sessionToken,
      resumed: false,
    });

    response.cookies.set(`scholar_session_${attempt.id}`, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 4,
    });

    return response;
  } catch (error: any) {
    console.error("[api/scholar/start] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
