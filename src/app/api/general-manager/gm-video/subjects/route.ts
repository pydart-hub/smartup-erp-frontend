import { NextRequest, NextResponse } from "next/server";
import { frappeAdminGet, frappeAdminPost } from "@/lib/server/frappeAdmin";

/**
 * GET  /api/general-manager/gm-video/subjects?program=10th+State
 *   → Returns all GM Video Subject records for the given program.
 *
 * POST /api/general-manager/gm-video/subjects
 *   Body: { program, subject_name, icon_emoji?, sort_order? }
 *   → Creates a new GM Video Subject.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const program = searchParams.get("program");

    const filters: unknown[][] = [];
    if (program) filters.push(["program", "=", program]);

    const params: Record<string, string> = {
      fields: JSON.stringify(["name", "program", "subject_name", "icon_emoji", "sort_order"]),
      order_by: "sort_order asc, subject_name asc",
      limit_page_length: "100",
    };
    if (filters.length) params.filters = JSON.stringify(filters);

    const result = await frappeAdminGet("resource/GM Video Subject", params);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[gm-video/subjects GET]", err);
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      program: string;
      subject_name: string;
      icon_emoji?: string;
      sort_order?: number;
    };

    if (!body.program || !body.subject_name?.trim()) {
      return NextResponse.json(
        { error: "program and subject_name are required" },
        { status: 400 }
      );
    }

    const result = await frappeAdminPost("resource/GM Video Subject", {
      program: body.program,
      subject_name: body.subject_name.trim(),
      icon_emoji: body.icon_emoji ?? "📚",
      sort_order: body.sort_order ?? 0,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[gm-video/subjects POST]", err);
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}
