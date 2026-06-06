import { NextRequest, NextResponse } from "next/server";
import { requireSmartupSession } from "@/lib/server/frappeLevelExam";
import { frappeLevelExamStore } from "@/lib/server/frappeLevelExamStore";
import { listLevelExamEligibleStudents } from "@/lib/server/levelExamAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireSmartupSession(request);
    const subject = request.nextUrl.searchParams.get("subject") || "";
    const class_level = request.nextUrl.searchParams.get("classLevel") || "";
    const status = request.nextUrl.searchParams.get("status") || "";

    const data = await frappeLevelExamStore.listPapers({
      subject: subject || undefined,
      class_level: class_level || undefined,
      status: status || undefined,
    });
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err.message || "Failed to fetch level exam papers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireSmartupSession(request);
    const body = await request.json();
    const paper_title = String(body.paper_title || "").trim();
    const subject = String(body.subject || "").trim();
    const class_level = String(body.class_level || "").trim();
    const questions = Array.isArray(body.questions) ? body.questions : [];

    if (!paper_title || !subject || !class_level || questions.length === 0) {
      return NextResponse.json({ error: "paper_title, subject, class_level and questions are required" }, { status: 400 });
    }

    const data = await frappeLevelExamStore.createPaper({
      paper_title,
      subject,
      class_level,
      duration_minutes: Number(body.duration_minutes || 20),
      instructions: body.instructions ? String(body.instructions) : "",
      status: body.status ? String(body.status) : "Draft",
      questions: questions.map((row: Record<string, unknown>, index: number) => ({
        question: String(row.question || ""),
        marks: Number(row.marks || 1),
        display_order: Number(row.display_order || index + 1),
      })).filter((row: { question: string }) => !!row.question),
    });

    if (String(body.status || "Draft") === "Published") {
      const students = await listLevelExamEligibleStudents(request);
      await frappeLevelExamStore.assignExamToTargets([class_level], [data.name], students);
    }

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err.message || "Failed to create level exam paper" }, { status: 500 });
  }
}
