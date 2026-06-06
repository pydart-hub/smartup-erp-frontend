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
    const questionId = String(body.question_id || "");
    const selectedOptionId = String(body.selected_option_id || "");
    if (!studentId || !questionId || !selectedOptionId) {
      return NextResponse.json({ error: "studentId, question_id, and selected_option_id are required" }, { status: 400 });
    }

    const linkedStudents = await getParentLinkedStudents(request);
    if (!linkedStudents.some((item) => item.studentId === studentId)) {
      return NextResponse.json({ error: "Student not linked to this parent" }, { status: 403 });
    }

    const { attemptId } = await context.params;
    await frappeLevelExamStore.saveAnswer(attemptId, studentId, questionId, selectedOptionId);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const err = error as { message?: string };
    const status = err.message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ error: err.message || "Failed to save answer" }, { status });
  }
}
