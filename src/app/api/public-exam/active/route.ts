import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/public-exam/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classLevel = searchParams.get("classLevel");
    const examType = searchParams.get("type"); // "scholarship" or null/empty

    if (!classLevel) {
      return NextResponse.json({ error: "Missing classLevel parameter" }, { status: 400 });
    }

    const now = new Date();

    // Build condition to cleanly separate Scholarship exams from Branch Diagnosis exams
    const typeFilter =
      examType === "scholarship"
        ? {
            OR: [
              { slug: { startsWith: "scholarship-" } },
              { title: { contains: "Scholarship", mode: "insensitive" as const } },
            ],
          }
        : {
            NOT: {
              OR: [
                { slug: { startsWith: "scholarship-" } },
                { title: { contains: "Scholarship", mode: "insensitive" as const } },
              ],
            },
          };

    const activeExams = await db.examPublishing.findMany({
      where: {
        classLevel,
        isActive: true,
        startAt: { lte: now },
        endAt: { gte: now },
        ...typeFilter,
      },
      include: {
        subject: {
          select: { name: true },
        },
        paper: {
          select: {
            totalQuestions: true,
            totalMarks: true,
          },
        },
      },
      orderBy: { title: "asc" },
    });

    const formatted = activeExams.map((exam) => ({
      publishingId: exam.id,
      slug: exam.slug,
      title: exam.title,
      subjectCode: exam.subjectCode,
      subjectName: exam.subject.name,
      durationMinutes: exam.durationMinutes,
      totalQuestions: exam.paper.totalQuestions,
      totalMarks: exam.paper.totalMarks,
    }));

    return NextResponse.json({ exams: formatted });
  } catch (error) {
    console.error("[api/public-exam/active] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
