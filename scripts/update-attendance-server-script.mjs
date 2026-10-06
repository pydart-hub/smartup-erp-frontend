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

const BASE = env.NEXT_PUBLIC_FRAPPE_URL || "https://smartup.m.frappe.cloud";
const API_KEY = env.FRAPPE_API_KEY;
const API_SECRET = env.FRAPPE_API_SECRET;

const headers = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const pythonScript = `
import json
from datetime import datetime

existing_name = frappe.form_dict.get("existing_name")
employee = frappe.form_dict.get("employee")
employee_name = frappe.form_dict.get("employee_name") or ""
attendance_date = frappe.form_dict.get("attendance_date")
company = frappe.form_dict.get("company") or "Smart Up"
session_branch = frappe.form_dict.get("session_branch") or company
status = frappe.form_dict.get("status")
in_time = frappe.form_dict.get("in_time")
out_time = frappe.form_dict.get("out_time")
custom_class_time = frappe.form_dict.get("custom_class_time")
is_visiting = int(frappe.form_dict.get("is_visiting") or 0)
sessions_json = frappe.form_dict.get("sessions_json")

if not employee or not attendance_date or not status:
    frappe.throw("employee, attendance_date, and status are required")

# Find existing record if not provided
if not existing_name:
    existing_name = frappe.db.get_value("Attendance", {
        "employee": employee,
        "attendance_date": attendance_date,
        "docstatus": ("!=", 2)
    }, "name")

# Parse sessions
parsed_sessions = []
if sessions_json:
    try:
        parsed = json.loads(sessions_json)
        if isinstance(parsed, list):
            parsed_sessions = parsed
    except Exception:
        pass

# Calculate working hours and determine overall in/out time from sessions
total_hours = 0.0
all_in_times = []
all_out_times = []

def parse_time_str(t):
    if not t:
        return None
    val = t.split(" ")[1] if " " in t else t
    parts = val.split(":")
    if len(parts) >= 2:
        try:
            return int(parts[0]) * 60 + int(parts[1])
        except Exception:
            return None
    return None

for s in parsed_sessions:
    s_in = s.get("in_time")
    s_out = s.get("out_time")
    if s_in:
        all_in_times.append(s_in)
    if s_out:
        all_out_times.append(s_out)
    m_in = parse_time_str(s_in)
    m_out = parse_time_str(s_out)
    if m_in is not None and m_out is not None and m_out > m_in:
        total_hours += (m_out - m_in) / 60.0

# Fallback working hours if no multi sessions
if total_hours == 0.0 and in_time and out_time:
    m_in = parse_time_str(in_time)
    m_out = parse_time_str(out_time)
    if m_in is not None and m_out is not None and m_out > m_in:
        total_hours = (m_out - m_in) / 60.0

earliest_in = sorted(all_in_times)[0] if all_in_times else in_time
latest_out = sorted(all_out_times)[-1] if all_out_times else out_time

def map_session_type(t_str):
    if not t_str:
        return "Morning"
    t_min = parse_time_str(t_str)
    if t_min is None:
        return "Morning"
    if t_min < 12 * 60:
        return "Morning"
    elif t_min < 16 * 60:
        return "Afternoon"
    else:
        return "Evening"

if existing_name:
    doc = frappe.get_doc("Attendance", existing_name)
    doc.status = status
    if sessions_json:
        doc.custom_sessions_json = sessions_json
    if earliest_in:
        doc.in_time = earliest_in if " " in earliest_in else (attendance_date + " " + earliest_in + ":00")
        doc.custom_check_in = earliest_in.split(" ")[1] if " " in earliest_in else earliest_in
    if latest_out:
        doc.out_time = latest_out if " " in latest_out else (attendance_date + " " + latest_out + ":00")
        doc.custom_check_out = latest_out.split(" ")[1] if " " in latest_out else latest_out
    if custom_class_time:
        doc.custom_class_time = custom_class_time
    if is_visiting:
        doc.custom_visiting_branch = session_branch
    if total_hours > 0:
        doc.working_hours = round(total_hours, 2)

    # Sync child table custom_branch_sessions
    if parsed_sessions:
        doc.set("custom_branch_sessions", [])
        for s in parsed_sessions:
            st = s.get("session_type") or map_session_type(s.get("in_time") or s.get("class_time"))
            doc.append("custom_branch_sessions", {
                "branch": s.get("branch") or company,
                "session_type": st,
                "status": s.get("status") or "Present",
                "in_time": (s.get("in_time") or "").split(" ")[-1] if s.get("in_time") else None,
                "out_time": (s.get("out_time") or "").split(" ")[-1] if s.get("out_time") else None,
                "class_time": (s.get("class_time") or "").split(" ")[-1] if s.get("class_time") else None,
                "is_visiting": 1 if s.get("is_visiting") else 0,
                "remarks": s.get("title") or s.get("remarks") or ""
            })

    doc.flags.ignore_validate = True
    doc.flags.ignore_permissions = True
    doc.save()
    frappe.db.commit()
    frappe.response["data"] = {
        "name": existing_name,
        "status": status,
        "action": "updated_sessions"
    }
else:
    new_doc = frappe.new_doc("Attendance")
    new_doc.employee = employee
    new_doc.employee_name = employee_name
    new_doc.attendance_date = attendance_date
    new_doc.company = company
    new_doc.status = status
    if sessions_json:
        new_doc.custom_sessions_json = sessions_json
    if earliest_in:
        new_doc.in_time = earliest_in if " " in earliest_in else (attendance_date + " " + earliest_in + ":00")
        new_doc.custom_check_in = earliest_in.split(" ")[1] if " " in earliest_in else earliest_in
    if latest_out:
        new_doc.out_time = latest_out if " " in latest_out else (attendance_date + " " + latest_out + ":00")
        new_doc.custom_check_out = latest_out.split(" ")[1] if " " in latest_out else latest_out
    if custom_class_time:
        new_doc.custom_class_time = custom_class_time
    if is_visiting:
        new_doc.custom_visiting_branch = session_branch
    if total_hours > 0:
        new_doc.working_hours = round(total_hours, 2)
    new_doc.docstatus = 1

    # Populate child table custom_branch_sessions
    if parsed_sessions:
        for s in parsed_sessions:
            st = s.get("session_type") or map_session_type(s.get("in_time") or s.get("class_time"))
            new_doc.append("custom_branch_sessions", {
                "branch": s.get("branch") or company,
                "session_type": st,
                "status": s.get("status") or "Present",
                "in_time": (s.get("in_time") or "").split(" ")[-1] if s.get("in_time") else None,
                "out_time": (s.get("out_time") or "").split(" ")[-1] if s.get("out_time") else None,
                "class_time": (s.get("class_time") or "").split(" ")[-1] if s.get("class_time") else None,
                "is_visiting": 1 if s.get("is_visiting") else 0,
                "remarks": s.get("title") or s.get("remarks") or ""
            })

    new_doc.flags.ignore_validate = True
    new_doc.flags.ignore_permissions = True
    new_doc.db_insert()
    
    commit_dict = {
        "status": status,
        "docstatus": 1
    }
    if sessions_json:
        commit_dict["custom_sessions_json"] = sessions_json
    if total_hours > 0:
        commit_dict["working_hours"] = round(total_hours, 2)
    frappe.db.set_value("Attendance", new_doc.name, commit_dict)
    frappe.db.commit()
    frappe.response["data"] = {
        "name": new_doc.name,
        "status": status,
        "action": "created_with_sessions"
    }
`;

async function run() {
  const res = await fetch(`${BASE}/api/resource/Server Script/set_attendance_status`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ script: pythonScript }),
  });
  console.log("Update Server Script:", res.status);
  const text = await res.text();
  console.log("Response:", text.slice(0, 200));
}

run().catch(console.error);
