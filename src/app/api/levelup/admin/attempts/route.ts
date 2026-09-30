import { NextRequest, NextResponse } from "next/server";
import { levelupDb } from "@/lib/levelup-exam/db";
import { verifyAdminToken } from "@/lib/scholar-admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const cookieToken = request.cookies.get("levelup_admin_token")?.value;

    const token = bearerToken || cookieToken;

    if (!verifyAdminToken(token)) {
      return NextResponse.json({ error: "Unauthorized. Please log in again." }, { status: 401 });
    }

    const attempts = await levelupDb.levelUpAttempt.findMany({
      include: {
        publishing: {
          select: {
            title: true,
            classLevel: true,
            slug: true,
          },
        },
        answers: {
          select: {
            id: true,
            questionId: true,
            selectedOption: true,
            answeredAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const registrations = await levelupDb.levelUpRegistration.findMany({
      orderBy: { createdAt: "desc" },
    });

    const regByAttemptId = new Map<string, typeof registrations[0]>();
    const regByPhone = new Map<string, typeof registrations[0]>();
    for (const r of registrations) {
      if (r.attemptId) regByAttemptId.set(r.attemptId, r);
      if (r.phone) regByPhone.set(r.phone, r);
    }

    const formattedAttempts = attempts.map((a) => {
      let resultSnapshot: any = null;
      if (a.resultSnapshotJson) {
        try {
          resultSnapshot = typeof a.resultSnapshotJson === "string"
            ? JSON.parse(a.resultSnapshotJson)
            : a.resultSnapshotJson;
        } catch {
          resultSnapshot = null;
        }
      }

      const matchedReg = regByAttemptId.get(a.id) || (a.studentPhone ? regByPhone.get(a.studentPhone) : null);
      const countryVal = matchedReg?.country || a.country || "UAE";
      const emirateVal = matchedReg?.emirateCity || a.emirateCity || "Dubai";
      const schoolNameValue = a.schoolName || matchedReg?.schoolName || "Not specified";

      return {
        id: a.id,
        studentName: a.studentName,
        schoolName: schoolNameValue,
        studentPhone: a.studentPhone,
        country: countryVal,
        emirateCity: emirateVal,
        classLevel: a.classLevel,
        curriculum: a.curriculum || matchedReg?.curriculum || "CBSE",
        examTitle: a.publishing?.title || "LevelUp Scholarship Exam",
        status: a.status,
        scoreObtained: a.scoreObtained,
        totalMarks: a.totalMarks,
        percentage: a.percentage,
        correctCount: a.correctCount,
        wrongCount: a.wrongCount,
        unansweredCount: a.unansweredCount,
        startedAt: a.startedAt.toISOString(),
        submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
        totalAnswersLogged: a.answers.length,
        diagnosedLevel: resultSnapshot?.diagnosedLevel || null,
      };
    });

    const formattedRegistrations = registrations.map((r) => ({
      id: r.id,
      studentName: r.studentName,
      schoolName: r.schoolName || "Not specified",
      phone: r.phone,
      country: r.country,
      emirateCity: r.emirateCity || "Dubai",
      classLevel: r.classLevel,
      curriculum: r.curriculum || "CBSE",
      status: r.status,
      attemptId: r.attemptId,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({
      attempts: formattedAttempts,
      registrations: formattedRegistrations,
    });
  } catch (error) {
    console.error("[api/levelup/admin/attempts] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
