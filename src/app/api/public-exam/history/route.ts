import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/public-exam/db";

export async function GET(request: NextRequest) {
  try {
    const phone = request.nextUrl.searchParams.get("phone")?.replace(/\D/g, "") ?? "";

    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json({ attempts: [] });
    }

    const attempts = await db.examAttempt.findMany({
      where: { studentPhone: phone },
      orderBy: { createdAt: "desc" },
      include: {
        publishing: {
          select: {
            title: true,
          },
        },
      },
      take: 12,
    });

    return NextResponse.json({
      attempts: attempts.map((attempt) => ({
        id: attempt.id,
        studentName: attempt.studentName,
        studentBranch: attempt.studentBranch,
        classLevel: attempt.classLevel,
        examTitle: attempt.publishing.title,
        status: attempt.status,
        scoreObtained: attempt.scoreObtained,
        totalMarks: attempt.totalMarks,
        percentage: attempt.percentage,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        unansweredCount: attempt.unansweredCount,
        createdAt: attempt.createdAt,
        reportUrl: attempt.status === "in_progress" ? null : `/exam-site/result/${attempt.id}`,
      })),
    });
  } catch (error) {
    console.error("[api/public-exam/history] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
