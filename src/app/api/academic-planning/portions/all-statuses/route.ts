import { NextRequest, NextResponse } from "next/server";
import { frappeAdminGet } from "@/lib/server/frappeAdmin";
import { parseSession } from "@/lib/utils/apiAuth";
import { normalizeSubjectCourse } from "@/lib/utils/studentGroupUtils";

export const dynamic = "force-dynamic";

/**
 * GET /api/academic-planning/portions/all-statuses
 * Returns all Branch Portion Status records across all branches for hierarchical drill-down.
 */
export async function GET(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await frappeAdminGet("resource/Branch Portion Status", {
      fields: JSON.stringify([
        "name",
        "portion_ref",
        "branch",
        "student_group",
        "class_level",
        "course",
        "portion_title",
        "target_date",
        "status",
        "completed_on",
        "completed_by",
        "remarks",
        "creation",
      ]),
      order_by: "branch asc, class_level asc, course asc, target_date asc",
      limit_page_length: "2500",
    });

    const rawData: any[] = res?.data ?? [];
    const normalizedData = rawData.map((item) => ({
      ...item,
      course: normalizeSubjectCourse(item.course),
    }));

    return NextResponse.json({ data: normalizedData });
  } catch (error: any) {

    console.error("Error in GET /api/academic-planning/portions/all-statuses:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
