import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;
const ADMIN_AUTH = `token ${API_KEY}:${API_SECRET}`;

const CHECKLIST_FIELDS = JSON.stringify([
  "name",
  "date",
  "employee",
  "employee_name",
  "branch",
  "class_name",
  "class_starting_time",
  "class_ending_time",
  "status",
  "verified_by",
  "verification_date",
  "remarks",
  "attendance_updated_in_lms",
  "absentees_verified_parents_informed",
  "all_classes_conducted_as_per_timetable",
  "portion_completed_as_per_academic_planner",
  "class_notes_worksheet_shared",
  "daily_class_overview_updated",
  "class_feedback_forum_sent",
  "next_day_class_time_updated",
  "daily_smartup_content_shared",
  "creation",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      date,
      employee,
      employee_name,
      branch,
      class_name,
      class_starting_time,
      class_ending_time,
      status,
      attendance_updated_in_lms,
      absentees_verified_parents_informed,
      all_classes_conducted_as_per_timetable,
      portion_completed_as_per_academic_planner,
      class_notes_worksheet_shared,
      daily_class_overview_updated,
      class_feedback_forum_sent,
      next_day_class_time_updated,
      daily_smartup_content_shared,
      remarks,
    } = body;

    if (!date || !employee || !branch || !class_name || !class_starting_time || !class_ending_time) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    let finalEmployee = employee;
    let finalEmployeeName = employee_name || employee;

    if (employee && employee.includes("@")) {
      const filters = JSON.stringify([["user_id", "=", employee]]);
      const fields = JSON.stringify(["name", "employee_name"]);
      const empQueryUrl = `${FRAPPE_URL}/api/resource/Employee?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(fields)}&limit_page_length=1`;
      
      const empRes = await fetch(empQueryUrl, {
        headers: { Authorization: ADMIN_AUTH },
      });
      
      if (empRes.ok) {
        const empData = await empRes.json();
        if (empData.data && empData.data.length > 0) {
          finalEmployee = empData.data[0].name;
          finalEmployeeName = empData.data[0].employee_name;
        }
      }
    }

    const payload = {
      date,
      employee: finalEmployee,
      employee_name: finalEmployeeName,
      branch,
      class_name,
      class_starting_time,
      class_ending_time,
      status: status || "Submitted",
      attendance_updated_in_lms: attendance_updated_in_lms ? 1 : 0,
      absentees_verified_parents_informed: absentees_verified_parents_informed ? 1 : 0,
      all_classes_conducted_as_per_timetable: all_classes_conducted_as_per_timetable ? 1 : 0,
      portion_completed_as_per_academic_planner: portion_completed_as_per_academic_planner ? 1 : 0,
      class_notes_worksheet_shared: class_notes_worksheet_shared ? 1 : 0,
      daily_class_overview_updated: daily_class_overview_updated ? 1 : 0,
      class_feedback_forum_sent: class_feedback_forum_sent ? 1 : 0,
      next_day_class_time_updated: next_day_class_time_updated ? 1 : 0,
      daily_smartup_content_shared: daily_smartup_content_shared ? 1 : 0,
      remarks: remarks || "",
    };

    const frappeRes = await fetch(`${FRAPPE_URL}/api/resource/Employee Daily Checklist`, {
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
    console.error("Error in POST /api/checklists:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employee = searchParams.get("employee");
    const branch = searchParams.get("branch");
    const date = searchParams.get("date");
    const status = searchParams.get("status");

    let finalEmployee = employee;
    if (employee && employee.includes("@")) {
      const filters = JSON.stringify([["user_id", "=", employee]]);
      const fields = JSON.stringify(["name"]);
      const empQueryUrl = `${FRAPPE_URL}/api/resource/Employee?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(fields)}&limit_page_length=1`;
      
      const empRes = await fetch(empQueryUrl, {
        headers: { Authorization: ADMIN_AUTH },
      });
      
      if (empRes.ok) {
        const empData = await empRes.json();
        if (empData.data && empData.data.length > 0) {
          finalEmployee = empData.data[0].name;
        }
      }
    }

    const filterList: any[] = [];
    if (finalEmployee) {
      filterList.push(["employee", "=", finalEmployee]);
    }
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
    const url = `${FRAPPE_URL}/api/resource/Employee Daily Checklist?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(CHECKLIST_FIELDS)}&order_by=date desc, creation desc&limit_page_length=200`;

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
    console.error("Error in GET /api/checklists:", error);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
