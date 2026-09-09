import { NextRequest, NextResponse } from "next/server";
import { frappeAdminGet, frappeAdminPut, frappeAdminDelete } from "@/lib/server/frappeAdmin";
import { parseSession } from "@/lib/utils/apiAuth";

export const dynamic = "force-dynamic";

/**
 * PUT /api/academic-planning/portions/[id]
 * Update an Academic Portion and sync changes to its Branch Portion Status records.
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
    const { portion_title, target_date, academic_year, description, course } = body;

    const payload: Record<string, any> = {};
    if (portion_title !== undefined) payload.portion_title = portion_title.trim();
    if (target_date !== undefined) payload.target_date = target_date;
    if (academic_year !== undefined) payload.academic_year = academic_year || null;
    if (description !== undefined) payload.description = description || null;
    if (course !== undefined) payload.course = course.trim();

    const res = await frappeAdminPut(`resource/Academic Portion/${encodeURIComponent(id)}`, payload);

    // Sync title/target_date to branch status records if updated
    if (portion_title || target_date || course) {
      try {
        const statusesRes = await frappeAdminGet("resource/Branch Portion Status", {
          fields: JSON.stringify(["name"]),
          filters: JSON.stringify([["portion_ref", "=", id]]),
          limit_page_length: "200",
        });
        const statuses: any[] = statusesRes?.data ?? [];
        const syncPayload: Record<string, any> = {};
        if (portion_title) syncPayload.portion_title = portion_title.trim();
        if (target_date) syncPayload.target_date = target_date;
        if (course) syncPayload.course = course.trim();

        await Promise.all(
          statuses.map((st) =>
            frappeAdminPut(`resource/Branch Portion Status/${encodeURIComponent(st.name)}`, syncPayload).catch(() => null)
          )
        );
      } catch (syncErr) {
        console.warn("Failed to sync branch statuses:", syncErr);
      }
    }

    return NextResponse.json({ success: true, data: res?.data });
  } catch (error: any) {
    console.error("Error in PUT /api/academic-planning/portions/[id]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/academic-planning/portions/[id]
 * Delete an Academic Portion and all its associated Branch Portion Status records.
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

    // 1. Delete associated Branch Portion Status entries
    try {
      const statusesRes = await frappeAdminGet("resource/Branch Portion Status", {
        fields: JSON.stringify(["name"]),
        filters: JSON.stringify([["portion_ref", "=", id]]),
        limit_page_length: "200",
      });
      const statuses: any[] = statusesRes?.data ?? [];
      await Promise.all(
        statuses.map((st) =>
          frappeAdminDelete(`resource/Branch Portion Status/${encodeURIComponent(st.name)}`).catch(() => null)
        )
      );
    } catch (err) {
      console.warn("Failed to delete branch status children:", err);
    }

    // 2. Delete the master Academic Portion record
    await frappeAdminDelete(`resource/Academic Portion/${encodeURIComponent(id)}`);

    return NextResponse.json({ success: true, message: "Portion deleted successfully" });
  } catch (error: any) {
    console.error("Error in DELETE /api/academic-planning/portions/[id]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
