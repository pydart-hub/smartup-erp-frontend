import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/public-exam/db";
import { verifyAdminToken } from "@/lib/scholar-admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const cookieToken = request.cookies.get("scholar_admin_token")?.value;

    const token = bearerToken || cookieToken;

    if (!verifyAdminToken(token)) {
      return NextResponse.json({ error: "Unauthorized. Please log in again." }, { status: 401 });
    }

    // Strictly isolate to Scholarship exams only
    const publishingWhere = {
      OR: [
        { slug: { startsWith: "scholarship-" } },
        { title: { contains: "Scholarship", mode: "insensitive" as const } },
      ],
    };

    const attempts = await db.examAttempt.findMany({
      where: publishingWhere ? { publishing: publishingWhere } : undefined,
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

    // Also fetch all registrations to capture any students who registered
    const registrations = await db.scholarRegistration.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Create a fast lookup map for registration by phone or attemptId
    const regByAttemptId = new Map<string, typeof registrations[0]>();
    const regByPhone = new Map<string, typeof registrations[0]>();
    for (const r of registrations) {
      if (r.attemptId) regByAttemptId.set(r.attemptId, r);
      if (r.phone) regByPhone.set(r.phone, r);
    }

    // Format attempts
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

      // Check linked registration for official district & school
      const matchedReg = regByAttemptId.get(a.id) || (a.studentPhone ? regByPhone.get(a.studentPhone) : null);
      const districtValue = matchedReg?.district || a.studentBranch || "Not specified";
      const schoolNameValue = a.schoolName || matchedReg?.schoolName || "Not specified";

      return {
        id: a.id,
        studentName: a.studentName,
        schoolName: schoolNameValue,
        studentPhone: a.studentPhone,
        district: districtValue,
        studentBranch: a.studentBranch || matchedReg?.district || null,
        classLevel: a.classLevel,
        syllabus: a.syllabus || matchedReg?.syllabus || "State",
        examTitle: a.publishing?.title || "Scholarship Exam",
        status: a.status, // "in_progress", "submitted", "auto_submitted"
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
        aiSummary: resultSnapshot?.aiSummary || null,
      };
    });

    // Format raw registrations
    const formattedRegistrations = registrations.map((r) => ({
      id: r.id,
      studentName: r.studentName,
      schoolName: r.schoolName || "Not specified",
      studentPhone: r.phone,
      district: r.district,
      classLevel: r.classLevel,
      syllabus: r.syllabus || "State",
      status: r.status,
      attemptId: r.attemptId,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      attempts: formattedAttempts,
      registrations: formattedRegistrations,
    });
  } catch (error: any) {
    console.error("[api/scholar/admin/attempts] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const cookieToken = request.cookies.get("scholar_admin_token")?.value;

    const token = bearerToken || cookieToken;

    if (!verifyAdminToken(token)) {
      return NextResponse.json({ error: "Unauthorized. Please log in again." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));

    const id = body.id || searchParams.get("id");
    const type = body.type || searchParams.get("type") || "attempt";

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Entry ID is required." }, { status: 400 });
    }

    if (type === "attempt") {
      // Check attempt exists
      const existing = await db.examAttempt.findUnique({
        where: { id },
        select: { id: true, studentName: true },
      });

      if (!existing) {
        return NextResponse.json({ error: "Exam attempt record not found." }, { status: 404 });
      }

      // Unlink any registration pointing to this attemptId
      await db.scholarRegistration.updateMany({
        where: { attemptId: id },
        data: { attemptId: null, status: "registered" },
      });

      // Delete the attempt (Prisma schema has onDelete: Cascade for AttemptAnswer)
      await db.examAttempt.delete({
        where: { id },
      });

      return NextResponse.json({
        success: true,
        message: `Exam attempt for "${existing.studentName}" deleted successfully.`,
      });
    } else if (type === "registration") {
      const existing = await db.scholarRegistration.findUnique({
        where: { id },
        select: { id: true, studentName: true },
      });

      if (!existing) {
        return NextResponse.json({ error: "Registration record not found." }, { status: 404 });
      }

      await db.scholarRegistration.delete({
        where: { id },
      });

      return NextResponse.json({
        success: true,
        message: `Registration record for "${existing.studentName}" deleted successfully.`,
      });
    } else {
      return NextResponse.json({ error: "Invalid entry type specified." }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[api/scholar/admin/attempts DELETE] Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete entry" }, { status: 500 });
  }
}
