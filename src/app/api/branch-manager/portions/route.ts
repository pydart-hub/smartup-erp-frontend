import { NextRequest, NextResponse } from "next/server";
import { frappeAdminGet, frappeAdminPut } from "@/lib/server/frappeAdmin";
import { parseSession } from "@/lib/utils/apiAuth";

export const dynamic = "force-dynamic";

/**
 * GET /api/branch-manager/portions
 * Returns portions assigned to the given branch (or logged-in user's branch).
 */
export async function GET(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchParam = searchParams.get("branch");

    // Branch from query or session fallback
    const branch =
      branchParam ||
      session.default_company ||
      (session.allowed_companies && session.allowed_companies[0]);

    if (!branch) {
      return NextResponse.json({ error: "Branch not identified" }, { status: 400 });
    }

    const filters: (string | number)[][] = [["branch", "=", branch]];

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
      filters: JSON.stringify(filters),
      order_by: "target_date asc, class_level asc, course asc",
      limit_page_length: "500",
    });

    return NextResponse.json({ data: res?.data ?? [] });
  } catch (error: any) {
    console.error("Error in GET /api/branch-manager/portions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/branch-manager/portions
 * Updates the portion completion status or percentage (0%, 25%, 50%, 75%, 100%).
 */
export async function POST(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { statusId, status, percentage, remarks } = body;

    if (!statusId) {
      return NextResponse.json(
        { error: "Missing required field: statusId" },
        { status: 400 }
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Determine target percentage (0, 25, 50, 75, 100)
    let pct = 0;
    if (percentage !== undefined && percentage !== null) {
      pct = Number(percentage);
    } else if (status === "Completed") {
      pct = 100;
    } else if (status === "Pending") {
      pct = 0;
    }

    // Status mapping for backend consistency
    const isCompleted = pct >= 100;
    const finalStatus = isCompleted ? "Completed" : "Pending";

    // Encode percentage in remarks or preserve extra remark text
    // Format stored in remarks: "[progress:75%]" or remarks string
    let updatedRemarks = remarks;
    if (updatedRemarks === undefined) {
      updatedRemarks = `[progress:${pct}%]`;
    } else if (typeof updatedRemarks === "string" && !updatedRemarks.includes("[progress:")) {
      updatedRemarks = `[progress:${pct}%] ${updatedRemarks}`.trim();
    }

    const updatePayload: Record<string, any> = {
      status: finalStatus,
      completed_on: isCompleted ? todayStr : null,
      completed_by: isCompleted ? session.email || "Branch Manager" : null,
      remarks: updatedRemarks,
    };

    const updated = await frappeAdminPut(
      `resource/Branch Portion Status/${encodeURIComponent(statusId)}`,
      updatePayload
    );

    return NextResponse.json({ success: true, data: updated?.data, percentage: pct });
  } catch (error: any) {
    console.error("Error in POST /api/branch-manager/portions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
