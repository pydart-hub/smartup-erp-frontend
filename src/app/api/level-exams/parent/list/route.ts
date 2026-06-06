import { NextRequest, NextResponse } from "next/server";
import { getParentLinkedStudents } from "@/lib/server/parentAccess";
import { requireSmartupSession } from "@/lib/server/frappeLevelExam";
import { frappeLevelExamStore } from "@/lib/server/frappeLevelExamStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireSmartupSession(request);
    const studentId = request.nextUrl.searchParams.get("studentId");
    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const linkedStudents = await getParentLinkedStudents(request);
    const child = linkedStudents.find((item) => item.studentId === studentId);
    if (!child) {
      return NextResponse.json({ error: "Student not linked to this parent" }, { status: 403 });
    }

    await frappeLevelExamStore.ensureStudentSnapshot({
      student_id: child.studentId,
      student_name: child.studentName,
      branch: child.branch,
      program: child.program,
      student_group: child.studentGroup,
      is_active: child.enabled,
    });

    const data = await frappeLevelExamStore.listForStudent(studentId);
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as { message?: string };
    const status = err.message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ error: err.message || "Failed to fetch level exams" }, { status });
  }
}
