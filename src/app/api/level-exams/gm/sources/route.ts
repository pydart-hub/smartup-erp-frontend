import { NextRequest, NextResponse } from "next/server";
import { requireSmartupSession } from "@/lib/server/frappeLevelExam";
import { frappeLevelExamStore } from "@/lib/server/frappeLevelExamStore";
import { parseLevelExamDocx } from "@/lib/server/levelExamDocParser";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireSmartupSession(request);
    const data = await frappeLevelExamStore.listSources();
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err.message || "Failed to fetch level exam sources" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireSmartupSession(request);
    const formData = await request.formData();
    const source_title = String(formData.get("source_title") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const class_scope = String(formData.get("class_scope") || "").trim();
    const notes = String(formData.get("notes") || "").trim();
    const status = String(formData.get("status") || "Draft").trim();
    const fileEntry = formData.get("file");
    const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;

    if (!source_title || !subject) {
      return NextResponse.json({ error: "source_title and subject are required" }, { status: 400 });
    }

    const sourceDoc = await frappeLevelExamStore.createSource({
      source_title,
      subject,
      class_scope,
      notes,
      status,
      file,
    });
    const sourceName = String(sourceDoc.name || "").trim();
    if (!sourceName) {
      throw new Error("Created level exam source is missing a document name");
    }
    let imported_count = 0;
    const imported_levels = new Set<string>();

    if (file && file.name.toLowerCase().endsWith(".docx")) {
      const parsedQuestions = await parseLevelExamDocx(file);
      for (const question of parsedQuestions) {
        await frappeLevelExamStore.createQuestion({
          subject,
          class_level: question.class_level,
          source: sourceName,
          question_text: question.question_text,
          difficulty: question.difficulty,
          correct_option_key: question.correct_option_key,
          explanation: question.explanation,
          is_active: true,
          review_status: "Draft",
          options: question.options,
        });
        imported_count += 1;
        imported_levels.add(question.class_level);
      }
    }

    return NextResponse.json({
      data: {
        source: sourceDoc,
        imported_count,
        imported_levels: Array.from(imported_levels).sort((a, b) => Number(a) - Number(b)),
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err.message || "Failed to create level exam source" }, { status: 500 });
  }
}
