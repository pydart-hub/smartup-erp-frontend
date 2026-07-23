import fs from "fs";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const idx = line.indexOf("=");
      return idx === -1 ? ["", ""] : [line.slice(0, idx), line.slice(idx + 1)];
    })
);

const BASE = env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = env.FRAPPE_API_KEY;
const API_SECRET = env.FRAPPE_API_SECRET;
const DOCTYPE_NAME = "Employee Daily Checklist";

const headers = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

async function ensureDocType() {
  const checkUrl = `${BASE}/api/resource/DocType/${encodeURIComponent(DOCTYPE_NAME)}?fields=${encodeURIComponent('["name"]')}`;
  const existing = await fetch(checkUrl, { headers });

  if (existing.ok) {
    console.log(`DocType already exists: ${DOCTYPE_NAME}`);
    return;
  }

  const payload = {
    doctype: "DocType",
    name: DOCTYPE_NAME,
    module: "Education",
    custom: 1,
    is_submittable: 0,
    track_changes: 1,
    autoname: "format:EDC-.YYYY.-.MM.-.#####.",
    fields: [
      { fieldname: "date", fieldtype: "Date", label: "Date", reqd: 1, in_list_view: 1 },
      { fieldname: "employee", fieldtype: "Link", options: "Employee", label: "Employee", reqd: 1, in_list_view: 1 },
      { fieldname: "employee_name", fieldtype: "Data", label: "Employee Name", reqd: 1, in_list_view: 1 },
      { fieldname: "branch", fieldtype: "Link", options: "Company", label: "Branch", reqd: 1, in_list_view: 1 },
      { fieldname: "class_name", fieldtype: "Data", label: "Class / Batch", reqd: 1, in_list_view: 1 },
      { fieldname: "class_starting_time", fieldtype: "Time", label: "Class Starting Time", reqd: 1 },
      { fieldname: "class_ending_time", fieldtype: "Time", label: "Class Ending Time", reqd: 1 },
      { fieldname: "status", fieldtype: "Select", label: "Status", options: "Draft\nSubmitted\nVerified", default: "Submitted", reqd: 1, in_list_view: 1 },
      { fieldname: "verified_by", fieldtype: "Data", label: "Verified By" },
      { fieldname: "verification_date", fieldtype: "Date", label: "Verification Date" },
      { fieldname: "remarks", fieldtype: "Small Text", label: "Remarks / Notes" },
      
      // Checklist Check Items
      { fieldname: "section_break_checklist", fieldtype: "Section Break", label: "Checklist Status" },
      { fieldname: "attendance_updated_in_lms", fieldtype: "Check", label: "Attendance updated in LMS" },
      { fieldname: "absentees_verified_parents_informed", fieldtype: "Check", label: "Absentees verified & parents informed" },
      { fieldname: "all_classes_conducted_as_per_timetable", fieldtype: "Check", label: "All classes conducted as per timetable" },
      { fieldname: "portion_completed_as_per_academic_planner", fieldtype: "Check", label: "Portion completed as per academic planner" },
      { fieldname: "class_notes_worksheet_shared", fieldtype: "Check", label: "Class notes/worksheet shared" },
      { fieldname: "daily_class_overview_updated", fieldtype: "Check", label: "Daily class overview updated" },
      { fieldname: "class_feedback_forum_sent", fieldtype: "Check", label: "Class feedback forum sent" },
      { fieldname: "next_day_class_time_updated", fieldtype: "Check", label: "Next day class time updated" },
      { fieldname: "daily_smartup_content_shared", fieldtype: "Check", label: "Daily Smart up content shared" },
    ],
    permissions: [
      { role: "Director", read: 1, write: 1, create: 1, delete: 0 },
      { role: "Branch Manager", read: 1, write: 1, create: 1, delete: 0 },
      { role: "Class Incharge", read: 1, write: 1, create: 1, delete: 0 },
      { role: "Employee", read: 1, write: 1, create: 1, delete: 0 },
      { role: "System Manager", read: 1, write: 1, create: 1, delete: 1 },
    ],
  };

  const res = await fetch(`${BASE}/api/resource/DocType`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create ${DOCTYPE_NAME}: ${res.status} ${text.slice(0, 500)}`);
  }

  console.log(`Created DocType: ${DOCTYPE_NAME}`);
}

async function verifyList() {
  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "date", "employee", "employee_name", "branch", "status"]),
    limit_page_length: "1",
  });

  const res = await fetch(`${BASE}/api/resource/${encodeURIComponent(DOCTYPE_NAME)}?${params.toString()}`, {
    headers,
  });

  const text = await res.text();
  console.log(`List check status: ${res.status}`);
  console.log(text.slice(0, 300));

  if (!res.ok) {
    throw new Error("DocType exists but list query failed");
  }
}

await ensureDocType();
await verifyList();
