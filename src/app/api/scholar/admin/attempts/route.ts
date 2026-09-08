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

    // Filter to Scholarship exams by default (slug starting with 'scholarship-' or title containing 'Scholarship')
    // Option ?scope=all to view all exams if needed
    const scope = request.nextUrl.searchParams.get("scope") || "scholarship";

    const publishingWhere = scope === "all"
      ? undefined
      : {
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

      // Check linked registration for official district
      const matchedReg = regByAttemptId.get(a.id) || (a.studentPhone ? regByPhone.get(a.studentPhone) : null);
      const districtValue = matchedReg?.district || a.studentBranch || "Not specified";

      return {
        id: a.id,
        studentName: a.studentName,
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
