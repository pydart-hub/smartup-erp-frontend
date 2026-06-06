import { NextRequest, NextResponse } from "next/server";
import { requireSmartupSession } from "@/lib/server/frappeLevelExam";
import { frappeLevelExamStore } from "@/lib/server/frappeLevelExamStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireSmartupSession(request);
    const subject = request.nextUrl.searchParams.get("subject") || "";
    const class_level = request.nextUrl.searchParams.get("classLevel") || "";
    const source = request.nextUrl.searchParams.get("source") || "";
    const review_status = request.nextUrl.searchParams.get("reviewStatus") || "";

    const data = await frappeLevelExamStore.listQuestions({
      subject: subject || undefined,
      class_level: class_level || undefined,
      source: source || undefined,
      review_status: review_status || undefined,
    });
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err.message || "Failed to fetch level exam questions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireSmartupSession(request);
    const body = await request.json();
    const subject = String(body.subject || "").trim();
    const class_level = String(body.class_level || "").trim();
    const question_text = String(body.question_text || "").trim();
    const correct_option_key = String(body.correct_option_key || "").trim();
    const options = Array.isArray(body.options) ? body.options : [];

    if (!subject || !class_level || !question_text || !correct_option_key || options.length < 2) {
      return NextResponse.json({ error: "subject, class_level, question_text, correct_option_key and options are required" }, { status: 400 });
    }

    const data = await frappeLevelExamStore.createQuestion({
      subject,
      class_level,
      source: body.source ? String(body.source) : "",
      question_text,
      difficulty: String(body.difficulty || "Medium"),
      correct_option_key,
      explanation: body.explanation ? String(body.explanation) : "",
      is_active: body.is_active !== false,
      review_status: body.review_status ? String(body.review_status) : "Approved",
      options: options.map((option: Record<string, unknown>) => ({
        option_key: String(option.option_key || "").trim(),
        option_text: String(option.option_text || "").trim(),
      })).filter((option: { option_key: string; option_text: string }) => option.option_key && option.option_text),
    });

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err.message || "Failed to create level exam question" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    requireSmartupSession(request);
    const body = await request.json();
    const name = String(body.name || "").trim();
    const subject = String(body.subject || "").trim();
    const class_level = String(body.class_level || "").trim();
    const question_text = String(body.question_text || "").trim();
    const correct_option_key = String(body.correct_option_key || "").trim();
    const options = Array.isArray(body.options) ? body.options : [];

    if (!name || !subject || !class_level || !question_text || !correct_option_key || options.length < 2) {
      return NextResponse.json({ error: "name, subject, class_level, question_text, correct_option_key and options are required" }, { status: 400 });
    }

    const data = await frappeLevelExamStore.updateQuestion(name, {
      subject,
      class_level,
      source: body.source ? String(body.source) : "",
      question_text,
      difficulty: String(body.difficulty || "Medium"),
      correct_option_key,
      explanation: body.explanation ? String(body.explanation) : "",
      is_active: body.is_active !== false,
      review_status: body.review_status ? String(body.review_status) : "Draft",
      options: options.map((option: Record<string, unknown>) => ({
        option_key: String(option.option_key || "").trim(),
        option_text: String(option.option_text || "").trim(),
      })).filter((option: { option_key: string; option_text: string }) => option.option_key && option.option_text),
    });

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err.message || "Failed to update level exam question" }, { status: 500 });
  }
}
