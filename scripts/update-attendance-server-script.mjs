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

new_session = {
    "branch": session_branch,
    "status": status,
    "in_time": in_time or "",
    "out_time": out_time or "",
    "class_time": custom_class_time or "",
    "is_visiting": is_visiting
}

if existing_name:
    # Use client-computed sessions_json if provided, otherwise preserve or update
    target_json = sessions_json
    if not target_json:
        raw_json = frappe.db.get_value("Attendance", existing_name, "custom_sessions_json") or ""
        target_json = raw_json

    update_dict = {
        "status": status,
        "docstatus": 1
    }
    if target_json:
        update_dict["custom_sessions_json"] = target_json
    if in_time:
        update_dict["in_time"] = in_time
        update_dict["custom_check_in"] = in_time.split(" ")[1] if " " in in_time else in_time
    if out_time:
        update_dict["out_time"] = out_time
        update_dict["custom_check_out"] = out_time.split(" ")[1] if " " in out_time else out_time
    if custom_class_time:
        update_dict["custom_class_time"] = custom_class_time
    if is_visiting:
        update_dict["custom_visiting_branch"] = session_branch

    frappe.db.set_value("Attendance", existing_name, update_dict)
    frappe.db.commit()
    frappe.response["data"] = {
        "name": existing_name,
        "status": status,
        "action": "updated_session"
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
    if in_time:
        new_doc.in_time = in_time
        new_doc.custom_check_in = in_time.split(" ")[1] if " " in in_time else in_time
    if out_time:
        new_doc.out_time = out_time
        new_doc.custom_check_out = out_time.split(" ")[1] if " " in out_time else out_time
    if custom_class_time:
        new_doc.custom_class_time = custom_class_time
    if is_visiting:
        new_doc.custom_visiting_branch = session_branch
    new_doc.docstatus = 1
    new_doc.flags.ignore_validate = True
    new_doc.flags.ignore_permissions = True
    new_doc.db_insert()
    
    commit_dict = {
        "status": status,
        "docstatus": 1
    }
    if sessions_json:
        commit_dict["custom_sessions_json"] = sessions_json
    frappe.db.set_value("Attendance", new_doc.name, commit_dict)
    frappe.db.commit()
    frappe.response["data"] = {
        "name": new_doc.name,
        "status": status,
        "action": "created_with_session"
    }
`;

async function run() {
  const res = await fetch(`${BASE}/api/resource/Server Script/set_attendance_status`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ script: pythonScript }),
  });
  console.log("Update Server Script:", res.status);
}

run().catch(console.error);
