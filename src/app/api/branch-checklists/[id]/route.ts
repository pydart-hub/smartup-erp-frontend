import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;
const ADMIN_AUTH = `token ${API_KEY}:${API_SECRET}`;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Map checked fields if they are sent in body
    const payload: any = { ...body };
    const checkFields = [
      "staff_attendance_verified",
      "all_classes_started_on_time",
      "timetable_executed_without_issues",
      "branch_infrastructure_functional",
      "attendance_updated_all_classes",
      "parent_followup_completed",
      "portion_tracking_verified",
      "class_notes_worksheet_shared",
      "next_day_class_time_updated",
      "overview_updation_checked",
      "class_feedback_forum_sent",
      "teacher_training_conducted",
      "teacher_performance_reviewed",
      "smartup_content_shared",
    ];

    for (const field of checkFields) {
      if (field in payload) {
        payload[field] = payload[field] ? 1 : 0;
      }
    }

    const frappeRes = await fetch(`${FRAPPE_URL}/api/resource/Branch Manager Daily Checklist/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: ADMIN_AUTH,
      },
      body: JSON.stringify(payload),
    });

    const data = await frappeRes.json();

    if (!frappeRes.ok) {
      const errorMsg =
        data.exception ||
        data._server_messages ||
        data.message ||
        `Frappe error (${frappeRes.status})`;
      console.error("Frappe DocType put error:", errorMsg);
      return NextResponse.json(
        { success: false, message: typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg) },
        { status: frappeRes.status }
      );
    }

    return NextResponse.json({ success: true, data: data.data });
  } catch (error: any) {
    console.error("Error in PUT /api/branch-checklists/[id]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
