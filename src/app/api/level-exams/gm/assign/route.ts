import { NextRequest, NextResponse } from "next/server";
import { requireSmartupSession } from "@/lib/server/frappeLevelExam";
import { frappeLevelExamStore } from "@/lib/server/frappeLevelExamStore";
import { listLevelExamEligibleStudents } from "@/lib/server/levelExamAdmin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    requireSmartupSession(request);
    const body = await request.json();
    const levelCodes = Array.isArray(body.levelCodes)
      ? body.levelCodes.map(String).filter(Boolean)
      : [];
    const examIds = Array.isArray(body.examIds) ? body.examIds.map(String) : [];
    if (levelCodes.length === 0 || examIds.length === 0) {
      return NextResponse.json({ error: "levelCodes and examIds are required" }, { status: 400 });
    }

    const students = await listLevelExamEligibleStudents(request);
    const data = await frappeLevelExamStore.assignExamToTargets(levelCodes, examIds, students);
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err.message || "Failed to assign exams" }, { status: 500 });
  }
}
