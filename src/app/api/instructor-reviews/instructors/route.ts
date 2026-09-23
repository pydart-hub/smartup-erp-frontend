import { NextRequest, NextResponse } from "next/server";
import { frappeAdminGet } from "@/lib/server/frappeAdmin";

/**
 * GET /api/instructor-reviews/instructors
 * Query params:
 *   branch?: string (Company name)
 *   program?: string
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch") || undefined;
    const program = searchParams.get("program") || undefined;

    const filters: unknown[][] = [["status", "=", "Active"]];
    if (branch) {
      filters.push(["custom_company", "=", branch]);
    }

    const res = await frappeAdminGet("resource/Instructor", {
      fields: JSON.stringify(["name", "instructor_name", "custom_company", "department"]),
      filters: JSON.stringify(filters),
      limit_page_length: "200",
      order_by: "instructor_name asc",
    });

    const instructors = res?.data ?? [];

    return NextResponse.json({
      success: true,
      data: instructors.map((i: any) => ({
        id: i.name,
        name: i.instructor_name || i.name,
        branch: i.custom_company,
        department: i.department,
      })),
    });
  } catch (error: any) {
    console.error("[api/instructor-reviews/instructors] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch instructors" },
      { status: 500 }
    );
  }
}
