import { NextRequest, NextResponse } from "next/server";
import { frappeAdminPut, frappeAdminDelete } from "@/lib/server/frappeAdmin";
import { parseSession } from "@/lib/utils/apiAuth";

export const dynamic = "force-dynamic";

/**
 * PUT /api/academic-planning/subjects/[id]
 * Update a portion subject name or description.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { subject_name, description } = body;

    const payload: Record<string, any> = {};
    if (subject_name !== undefined) payload.subject_name = subject_name.trim();
    if (description !== undefined) payload.description = description.trim();

    const res = await frappeAdminPut(`resource/Portion Subject/${encodeURIComponent(id)}`, payload);

    return NextResponse.json({ success: true, data: res?.data });
  } catch (error: any) {
    console.error("Error in PUT /api/academic-planning/subjects/[id]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/academic-planning/subjects/[id]
 * Delete a portion subject record.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await frappeAdminDelete(`resource/Portion Subject/${encodeURIComponent(id)}`);

    return NextResponse.json({ success: true, message: "Subject deleted successfully" });
  } catch (error: any) {
    console.error("Error in DELETE /api/academic-planning/subjects/[id]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
