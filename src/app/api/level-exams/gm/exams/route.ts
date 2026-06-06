import { NextRequest, NextResponse } from "next/server";
import { requireSmartupSession } from "@/lib/server/frappeLevelExam";
import { frappeLevelExamStore } from "@/lib/server/frappeLevelExamStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireSmartupSession(request);
    const levelCodesParam = request.nextUrl.searchParams.get("levelCodes") || "";
    const subjectCode = request.nextUrl.searchParams.get("subjectCode") || "";
    const allowedLevels = levelCodesParam
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean) as Array<"5" | "6" | "7" | "8" | "9" | "10">;
    const [subjects, exams] = await Promise.all([
      frappeLevelExamStore.listSubjects(),
      frappeLevelExamStore.listExamCatalog({ level_codes: allowedLevels, subject_code: subjectCode || undefined }),
    ]);
    const data = { subjects, exams };
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err.message || "Failed to fetch exam catalog" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireSmartupSession(request);
    const formData = await request.formData();
    const subject_name = String(formData.get("subject_name") || "").trim();
    const level_code = String(formData.get("level_code") || "").trim() as "8" | "9" | "10";
    const board_code = String(formData.get("board_code") || "").trim() as "state" | "cbse";
    const title = String(formData.get("title") || "").trim();
    const instructions = String(formData.get("instructions") || "").trim();
    const duration_minutes = Number(formData.get("duration_minutes") || 20);
    const fileEntry = formData.get("file");
    const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;

    if (!subject_name || !file || !["8", "9", "10"].includes(level_code) || !["state", "cbse"].includes(board_code)) {
      return NextResponse.json({ error: "subject_name, level_code, board_code and file are required" }, { status: 400 });
    }

    const data = await frappeLevelExamStore.importExamFromDoc({
      subject_name,
      level_code,
      board_code,
      title,
      instructions,
      duration_minutes,
      file,
    });
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err.message || "Failed to import exam doc" }, { status: 500 });
  }
}
