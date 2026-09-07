import { NextRequest, NextResponse } from "next/server";
import { getParentLinkedStudents } from "@/lib/server/parentAccess";
import { requireSmartupSession } from "@/lib/server/frappeLevelExam";
import { db } from "@/lib/public-exam/db";
import { getCanonicalBranchName } from "@/lib/utils/constants";

export const dynamic = "force-dynamic";

function extractClassLevel(program?: string): string {
  if (!program) return "10";
  const match = program.match(/\b(8|9|10)\b/);
  if (match) return match[1];
  if (program.includes("8th")) return "8";
  if (program.includes("9th")) return "9";
  if (program.includes("10th")) return "10";
  return "10";
}

export async function GET(request: NextRequest) {
  try {
    requireSmartupSession(request);
    const linkedStudents = await getParentLinkedStudents(request);
    if (linkedStudents.length === 0) {
      return NextResponse.json({ children: [], child: null, exams: [], history: [] });
    }

    const availableChildren = linkedStudents.map((cs) => ({
      studentId: cs.studentId,
      studentName: cs.studentName,
      studentPhone: cs.studentMobile || cs.guardianMobiles?.[0] || "",
      branch: getCanonicalBranchName(cs.branch),
      classLevel: extractClassLevel(cs.program),
    }));

    const requestedStudentId = request.nextUrl.searchParams.get("studentId");
    const child = requestedStudentId
      ? linkedStudents.find((item) => item.studentId === requestedStudentId) || linkedStudents[0]
      : linkedStudents[0];

    const classLevel = extractClassLevel(child.program);
    const now = new Date();


    // 1. Fetch active published exams for this class level from Postgres
    const activeExams = await db.examPublishing.findMany({
      where: {
        classLevel,
        isActive: true,
        startAt: { lte: now },
        endAt: { gte: now },
      },
      include: {
        subject: {
          select: { code: true, name: true },
        },
        paper: {
          select: {
            totalQuestions: true,
            totalMarks: true,
            durationMinutes: true,
          },
        },
      },
      orderBy: { title: "asc" },
    });

    const mobileList = [
      child.studentMobile,
      ...(child.guardianMobiles || []),
    ].filter((m) => m && m.length === 10);

    // 2. Fetch attempts for this child from Postgres
    // Attempts can match either by phone, or by student name
    const orConditions: Array<{ studentPhone?: { in: string[] }; studentName?: { equals: string; mode: "insensitive" } }> = [
      {
        studentName: {
          equals: child.studentName.trim(),
          mode: "insensitive",
        },
      },
    ];

    if (mobileList.length > 0) {
      orConditions.push({
        studentPhone: {
          in: mobileList,
        },
      });
    }

    const attempts = await db.examAttempt.findMany({
      where: {
        OR: orConditions,
      },
      include: {
        publishing: {
          include: {
            subject: {
              select: { code: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });


    // Map attempts by publishingId to easily check statuses
    const attemptsByPublishingId = new Map<string, (typeof attempts)[0]>();
    for (const att of attempts) {
      if (!attemptsByPublishingId.has(att.publishingId)) {
        attemptsByPublishingId.set(att.publishingId, att);
      }
    }

    const formattedExams = activeExams.map((exam) => {
      const attempt = attemptsByPublishingId.get(exam.id);
      let status: "available" | "in_progress" | "completed" | "expired" = "available";

      if (attempt) {
        if (attempt.status === "submitted" || attempt.status === "auto_submitted") {
          status = "completed";
        } else if (attempt.status === "in_progress") {
          status = "in_progress";
        }
      }

      return {
        exam_id: exam.id,
        publishing_id: exam.id,
        title: exam.title,
        subject_name: exam.subject.name,
        subject_code: exam.subjectCode,
        level_code: exam.classLevel,
        duration_minutes: exam.durationMinutes,
        total_questions: exam.paper.totalQuestions,
        total_marks: exam.paper.totalMarks,
        available_from: exam.startAt.toISOString(),
        available_until: exam.endAt.toISOString(),
        status,
        attempt_id: attempt?.id || null,
        percentage: attempt ? attempt.percentage : null,
        score_obtained: attempt ? attempt.scoreObtained : null,
        submitted_at: attempt?.submittedAt?.toISOString() || null,
      };
    });

    // Completed attempts (including any completed exams that might not be in the current active list)
    const formattedAttempts = attempts
      .filter((a) => a.status === "submitted" || a.status === "auto_submitted")
      .map((att) => ({
        attempt_id: att.id,
        publishing_id: att.publishingId,
        title: att.publishing?.title || "Diagnosis Exam",
        subject_name: att.publishing?.subject?.name || "General",
        level_code: att.classLevel,
        score_obtained: att.scoreObtained,
        total_marks: att.totalMarks,
        percentage: att.percentage,
        submitted_at: att.submittedAt?.toISOString() || att.createdAt.toISOString(),
        report_url: `/exam-site/result/${att.id}`,
      }));

    return NextResponse.json({
      children: availableChildren,
      child: {
        studentId: child.studentId,
        studentName: child.studentName,
        studentPhone: child.studentMobile || child.guardianMobiles?.[0] || "",
        branch: getCanonicalBranchName(child.branch),
        classLevel,
      },
      exams: formattedExams,
      history: formattedAttempts,
    });

  } catch (error: unknown) {
    console.error("[api/parent/diagnosis-exams] Error:", error);
    const err = error as { message?: string };
    const status = err.message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ error: err.message || "Failed to fetch diagnosis exams" }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireSmartupSession(request);
    const body = await request.json();
    const { studentId, publishingId } = body;

    if (!studentId || !publishingId) {
      return NextResponse.json({ error: "studentId and publishingId are required" }, { status: 400 });
    }

    const linkedStudents = await getParentLinkedStudents(request);
    const child = linkedStudents.find((item) => item.studentId === studentId);
    if (!child) {
      return NextResponse.json({ error: "Student not linked to this parent" }, { status: 403 });
    }

    const classLevel = extractClassLevel(child.program);
    const studentPhone = child.studentMobile || child.guardianMobiles?.[0] || "9999999999";
    const studentBranch = getCanonicalBranchName(child.branch);

    const publishing = await db.examPublishing.findUnique({
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

    if (!publishing || !publishing.isActive) {
      return NextResponse.json({ error: "Exam is not active or not found" }, { status: 404 });
    }

    // Check if there is already an in-progress attempt for this child
    const existingAttempts = await db.examAttempt.findMany({
      where: {
        publishingId,
        status: "in_progress",
        OR: [
          { studentName: { equals: child.studentName.trim(), mode: "insensitive" } },
          { studentPhone },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingAttempts.length > 0) {
      const existing = existingAttempts[0];
      const sessionToken = existing.sessionTokenHash;
      const response = NextResponse.json({
        attemptId: existing.id,
        sessionToken,
        resumed: true,
      });

      response.cookies.set(`exam_session_${existing.id}`, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 4,
      });

      return response;
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

    const { randomUUID } = await import("crypto");
    const sessionToken = randomUUID();

    const attempt = await db.examAttempt.create({
      data: {
        publishingId: publishing.id,
        studentName: child.studentName.trim(),
        studentBranch,
        studentPhone,
        classLevel,
        status: "in_progress",
        totalMarks: publishing.paper.totalMarks,
        paperSnapshotJson: JSON.stringify(questionsSnapshot),
        sessionTokenHash: sessionToken,
      },
    });

    const response = NextResponse.json({
      attemptId: attempt.id,
      sessionToken,
      resumed: false,
    });

    response.cookies.set(`exam_session_${attempt.id}`, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 4,
    });

    return response;
  } catch (error: unknown) {
    console.error("[api/parent/diagnosis-exams POST] Error:", error);
    const err = error as { message?: string };
    const status = err.message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ error: err.message || "Failed to start diagnosis exam" }, { status });
  }
}

