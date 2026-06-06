import { NextRequest, NextResponse } from "next/server";
import { getParentLinkedStudents } from "@/lib/server/parentAccess";
import { requireSmartupSession } from "@/lib/server/frappeLevelExam";
import { frappeLevelExamStore } from "@/lib/server/frappeLevelExamStore";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ attemptId: string }> },
) {
  try {
    requireSmartupSession(request);
    const body = await request.json();
    const studentId = String(body.studentId || "");
    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const linkedStudents = await getParentLinkedStudents(request);
    if (!linkedStudents.some((item) => item.studentId === studentId)) {
      return NextResponse.json({ error: "Student not linked to this parent" }, { status: 403 });
    }

    const { attemptId } = await context.params;
    const data = await frappeLevelExamStore.submitAttempt(attemptId, studentId);
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as { message?: string };
    const status = err.message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ error: err.message || "Failed to submit attempt" }, { status });
  }
}
