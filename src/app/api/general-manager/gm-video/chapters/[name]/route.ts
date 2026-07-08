import { NextRequest, NextResponse } from "next/server";
import { frappeAdminPut, frappeAdminDelete } from "@/lib/server/frappeAdmin";

/**
 * PUT  /api/general-manager/gm-video/chapters/[name]
 *   Body: { chapter_name?, video_url?, description?, sort_order? }
 *   → Updates a GM Video Chapter record.
 *
 * DELETE /api/general-manager/gm-video/chapters/[name]
 *   → Deletes the chapter.
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const body = await request.json() as {
      chapter_name?: string;
      video_url?: string;
      description?: string;
      sort_order?: number;
    };

    if (!name) {
      return NextResponse.json({ error: "Chapter name is required" }, { status: 400 });
    }

    const result = await frappeAdminPut(
      `resource/GM Video Chapter/${encodeURIComponent(name)}`,
      body
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[gm-video/chapters/[name] PUT]", err);
    return NextResponse.json({ error: "Failed to update chapter" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    if (!name) {
      return NextResponse.json({ error: "Chapter name is required" }, { status: 400 });
    }

    await frappeAdminDelete(`resource/GM Video Chapter/${encodeURIComponent(name)}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[gm-video/chapters/[name] DELETE]", err);
    return NextResponse.json({ error: "Failed to delete chapter" }, { status: 500 });
  }
}
