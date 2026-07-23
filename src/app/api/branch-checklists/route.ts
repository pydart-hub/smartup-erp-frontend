import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;
const ADMIN_AUTH = `token ${API_KEY}:${API_SECRET}`;

const BM_CHECKLIST_FIELDS = JSON.stringify([
  "name",
  "date",
  "branch",
  "opening_starting_time",
  "opened_by",
  "closing_time",
  "closed_by",
  "status",
  "verified_by",
  "verification_date",
  "remarks",
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
  "critical_issues",
  "escalation_details",
  "creation",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      date,
      branch,
      opening_starting_time,
      opened_by,
      closing_time,
      closed_by,
      status,
      staff_attendance_verified,
      all_classes_started_on_time,
      timetable_executed_without_issues,
      branch_infrastructure_functional,
      attendance_updated_all_classes,
      parent_followup_completed,
      portion_tracking_verified,
      class_notes_worksheet_shared,
      next_day_class_time_updated,
      overview_updation_checked,
      class_feedback_forum_sent,
      teacher_training_conducted,
      teacher_performance_reviewed,
      smartup_content_shared,
      critical_issues,
      escalation_details,
      remarks,
    } = body;

    if (!date || !branch || !opening_starting_time || !opened_by || !closing_time || !closed_by) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const payload = {
      date,
      branch,
      opening_starting_time,
      opened_by,
      closing_time,
      closed_by,
      status: status || "Submitted",
      staff_attendance_verified: staff_attendance_verified ? 1 : 0,
      all_classes_started_on_time: all_classes_started_on_time ? 1 : 0,
      timetable_executed_without_issues: timetable_executed_without_issues ? 1 : 0,
      branch_infrastructure_functional: branch_infrastructure_functional ? 1 : 0,
      attendance_updated_all_classes: attendance_updated_all_classes ? 1 : 0,
      parent_followup_completed: parent_followup_completed ? 1 : 0,
      portion_tracking_verified: portion_tracking_verified ? 1 : 0,
      class_notes_worksheet_shared: class_notes_worksheet_shared ? 1 : 0,
      next_day_class_time_updated: next_day_class_time_updated ? 1 : 0,
      overview_updation_checked: overview_updation_checked ? 1 : 0,
      class_feedback_forum_sent: class_feedback_forum_sent ? 1 : 0,
      teacher_training_conducted: teacher_training_conducted ? 1 : 0,
      teacher_performance_reviewed: teacher_performance_reviewed ? 1 : 0,
      smartup_content_shared: smartup_content_shared ? 1 : 0,
      critical_issues: critical_issues || "No",
      escalation_details: escalation_details || "",
      remarks: remarks || "",
    };

    const frappeRes = await fetch(`${FRAPPE_URL}/api/resource/Branch Manager Daily Checklist`, {
      method: "POST",
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
      console.error("Frappe DocType post error:", errorMsg);
      return NextResponse.json(
        { success: false, message: typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg) },
        { status: frappeRes.status }
      );
    }

    return NextResponse.json({ success: true, data: data.data });
  } catch (error: any) {
    console.error("Error in POST /api/branch-checklists:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch");
    const date = searchParams.get("date");
    const status = searchParams.get("status");

    const filterList: any[] = [];
    if (branch && branch !== "ALL") {
      filterList.push(["branch", "=", branch]);
    }
    if (date) {
      filterList.push(["date", "=", date]);
    }
    if (status) {
      filterList.push(["status", "=", status]);
    }

    const filters = JSON.stringify(filterList);
    const url = `${FRAPPE_URL}/api/resource/Branch Manager Daily Checklist?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(BM_CHECKLIST_FIELDS)}&order_by=date desc, creation desc&limit_page_length=200`;

    const res = await fetch(url, {
      headers: {
        Authorization: ADMIN_AUTH,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ success: true, data: [] });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data: data.data || [] });
  } catch (error: any) {
    console.error("Error in GET /api/branch-checklists:", error);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
