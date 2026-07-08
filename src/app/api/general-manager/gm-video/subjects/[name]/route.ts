import { NextRequest, NextResponse } from "next/server";
import { frappeAdminPut, frappeAdminDelete, frappeAdminGet } from "@/lib/server/frappeAdmin";

/**
 * PUT  /api/general-manager/gm-video/subjects/[name]
 *   Body: { subject_name?, icon_emoji?, sort_order? }
 *   → Updates a GM Video Subject record.
 *
 * DELETE /api/general-manager/gm-video/subjects/[name]
 *   → Deletes the subject AND all its chapters (cascade).
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const body = await request.json() as {
      subject_name?: string;
      icon_emoji?: string;
      sort_order?: number;
    };

    if (!name) {
      return NextResponse.json({ error: "Subject name is required" }, { status: 400 });
    }

    const result = await frappeAdminPut(
      `resource/GM Video Subject/${encodeURIComponent(name)}`,
      body
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[gm-video/subjects/[name] PUT]", err);
    return NextResponse.json({ error: "Failed to update subject" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    if (!name) {
      return NextResponse.json({ error: "Subject name is required" }, { status: 400 });
    }

    // 1. First delete all chapters belonging to this subject (manual cascade)
    try {
      const chaptersResult = await frappeAdminGet("resource/GM Video Chapter", {
        filters: JSON.stringify([["subject", "=", name]]),
        fields: JSON.stringify(["name"]),
        limit_page_length: "500",
      });
      const chapters: { name: string }[] = chaptersResult?.data ?? [];
      await Promise.all(
        chapters.map((c) =>
          frappeAdminDelete(`resource/GM Video Chapter/${encodeURIComponent(c.name)}`)
        )
      );
    } catch (cascadeErr) {
      console.warn("[gm-video/subjects/[name] DELETE] Chapter cascade failed:", cascadeErr);
    }

    // 2. Delete the subject itself
    await frappeAdminDelete(`resource/GM Video Subject/${encodeURIComponent(name)}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[gm-video/subjects/[name] DELETE]", err);
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}
