import { NextRequest, NextResponse } from "next/server";
import { frappeAdminGet, frappeAdminPost } from "@/lib/server/frappeAdmin";
import { parseSession } from "@/lib/utils/apiAuth";

export const dynamic = "force-dynamic";

/**
 * GET /api/academic-planning/subjects
 * Query subjects filtered by class_level (optional).
 */
export async function GET(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classLevel = searchParams.get("class_level");

    const filters: (string | number)[][] = [];
    if (classLevel && classLevel !== "all") {
      filters.push(["class_level", "=", classLevel]);
    }

    const params: Record<string, string> = {
      fields: JSON.stringify(["name", "class_level", "subject_name", "description", "creation"]),
      order_by: "subject_name asc",
      limit_page_length: "500",
    };
    if (filters.length > 0) {
      params.filters = JSON.stringify(filters);
    }

    const res = await frappeAdminGet("resource/Portion Subject", params);

    return NextResponse.json({ data: res?.data ?? [] });
  } catch (error: any) {
    console.error("Error in GET /api/academic-planning/subjects:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/academic-planning/subjects
 * Create a new subject for a specific class.
 */
export async function POST(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const class_level = body.class_level?.trim();
    const subject_name = body.subject_name?.trim();
    const description = body.description?.trim();

    if (!class_level || !subject_name) {
      return NextResponse.json(
        { error: "class_level and subject_name are required" },
        { status: 400 }
      );
    }

    // Check if already exists for this class
    const existing = await frappeAdminGet("resource/Portion Subject", {
      fields: JSON.stringify(["name", "class_level", "subject_name"]),
      filters: JSON.stringify([
        ["class_level", "=", class_level],
        ["subject_name", "=", subject_name],
      ]),
      limit_page_length: "1",
    });

    if (existing?.data && existing.data.length > 0) {
      return NextResponse.json({
        data: existing.data[0],
        message: "Subject already exists for this class",
      });
    }

    // Insert new Portion Subject
    const res = await frappeAdminPost("resource/Portion Subject", {
      class_level,
      subject_name,
      description: description || undefined,
    });

    return NextResponse.json({
      success: true,
      data: res?.data,
    });
  } catch (error: any) {
    console.error("Error in POST /api/academic-planning/subjects:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
