import { NextRequest, NextResponse } from "next/server";
import { levelupDb } from "@/lib/levelup-exam/db";
import { randomUUID } from "crypto";
import { validateFullE164PhoneStrict } from "@/lib/constants/countries";

export async function POST(request: NextRequest) {
  try {
    const { name, schoolName, phone, selectedClass, country, emirateCity, curriculum, registrationId } = await request.json();
    const normalizedPhone = typeof phone === "string" ? phone.replace(/[^\d+]/g, "") : "";

    if (!name?.trim() || !normalizedPhone || !selectedClass) {
      return NextResponse.json({ error: "Missing required student details" }, { status: 400 });
    }

    const phoneValidation = validateFullE164PhoneStrict(normalizedPhone);
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        { error: phoneValidation.error || "Please enter a valid mobile number." },
        { status: 400 }
      );
    }

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

    // Find the dedicated active LevelUp exam publishing for this class level
    const publishing = await levelupDb.levelUpPublishing.findFirst({
      where: {
        classLevel: targetLevel,
        isActive: true,
      },
      include: {
        paper: {
          select: { totalMarks: true },
        },
      },
    });

    if (!publishing) {
      return NextResponse.json(
        { error: `No active LevelUp scholarship exam found for ${selectedClass}. Please check back soon.` },
        { status: 404 }
      );
    }

    // Check if there is an in-progress attempt already in smartup_online DB
    const existingAttempt = await levelupDb.levelUpAttempt.findFirst({
      where: {
        publishingId: publishing.id,
        studentPhone: normalizedPhone,
        status: "in_progress",
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingAttempt) {
      const sessionToken = randomUUID();
      await levelupDb.levelUpAttempt.update({
        where: { id: existingAttempt.id },
        data: { sessionTokenHash: sessionToken },
      });

      const response = NextResponse.json({
        success: true,
        attemptId: existingAttempt.id,
        sessionToken,
        resumed: true,
      });

      response.cookies.set(`levelup_session_${existingAttempt.id}`, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 4,
      });

      return response;
    }

    // Load publishing with complete paper questions
    const publishingWithQuestions = await levelupDb.levelUpPublishing.findUnique({
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
      return NextResponse.json({ error: "LevelUp paper questions not available" }, { status: 404 });
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
    const attempt = await levelupDb.levelUpAttempt.create({
      data: {
        publishingId: publishing.id,
        studentName: name.trim(),
        schoolName: typeof schoolName === "string" ? schoolName.trim() : null,
        studentPhone: normalizedPhone,
        country: country || "UAE",
        emirateCity: emirateCity || "Dubai",
        classLevel: targetLevel,
        curriculum: curriculum || "CBSE",
        status: "in_progress",
        totalMarks: publishing.paper.totalMarks,
        paperSnapshotJson: JSON.stringify(questionsSnapshot),
        sessionTokenHash: sessionToken,
      },
    });

    // Update levelUpRegistration if ID was provided
    if (registrationId) {
      await levelupDb.levelUpRegistration.update({
        where: { id: registrationId },
        data: {
          status: "attempting",
          attemptId: attempt.id,
        },
      }).catch((e) => console.warn("Could not link levelUpRegistration:", e));
    }

    const response = NextResponse.json({
      success: true,
      attemptId: attempt.id,
      sessionToken,
      resumed: false,
    });

    response.cookies.set(`levelup_session_${attempt.id}`, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 4,
    });

    return response;
  } catch (error: any) {
    console.error("[api/levelup/start] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to start LevelUp exam attempt." },
      { status: 500 }
    );
  }
}
