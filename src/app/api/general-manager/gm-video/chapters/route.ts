import { NextRequest, NextResponse } from "next/server";
import { frappeAdminGet, frappeAdminPost } from "@/lib/server/frappeAdmin";

/**
 * GET  /api/general-manager/gm-video/chapters?subject=GMSUB-00001
 *   → Returns all GM Video Chapter records for the given subject.
 *
 * POST /api/general-manager/gm-video/chapters
 *   Body: { subject, chapter_name, video_url?, description?, sort_order? }
 *   → Creates a new GM Video Chapter.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject");

    const filters: unknown[][] = [];
    if (subject) filters.push(["subject", "=", subject]);

    const params: Record<string, string> = {
      fields: JSON.stringify(["name", "subject", "chapter_name", "video_url", "description", "sort_order"]),
      order_by: "sort_order asc, chapter_name asc",
      limit_page_length: "200",
    };
    if (filters.length) params.filters = JSON.stringify(filters);

    const result = await frappeAdminGet("resource/GM Video Chapter", params);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[gm-video/chapters GET]", err);
    return NextResponse.json({ error: "Failed to fetch chapters" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      subject: string;
      chapter_name: string;
      video_url?: string;
      description?: string;
      sort_order?: number;
    };

    if (!body.subject || !body.chapter_name?.trim()) {
      return NextResponse.json(
        { error: "subject and chapter_name are required" },
        { status: 400 }
      );
    }

    const result = await frappeAdminPost("resource/GM Video Chapter", {
      subject: body.subject,
      chapter_name: body.chapter_name.trim(),
      video_url: body.video_url?.trim() ?? "",
      description: body.description?.trim() ?? "",
      sort_order: body.sort_order ?? 0,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[gm-video/chapters POST]", err);
    return NextResponse.json({ error: "Failed to create chapter" }, { status: 500 });
  }
}
