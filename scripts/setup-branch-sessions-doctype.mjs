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

async function get(path) {
  const res = await fetch(`${BASE}/api/${path}`, { headers });
  if (!res.ok) return null;
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}/api/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, raw: text };
  }
}

async function main() {
  console.log("=== 1. Ensuring Child DocType: Attendance Branch Session ===");
  const dtName = "Attendance Branch Session";
  const existingDt = await get(`resource/DocType/${encodeURIComponent(dtName)}`);

  if (!existingDt?.data) {
    console.log(`Creating child DocType ${dtName}...`);
    const dtPayload = {
      doctype: "DocType",
      name: dtName,
      module: "Custom",
      custom: 1,
      istable: 1,
      editable_grid: 1,
      quick_entry: 0,
      track_changes: 1,
      fields: [
        { fieldname: "branch", fieldtype: "Link", label: "Branch", options: "Company", reqd: 1, in_list_view: 1 },
        { fieldname: "session_type", fieldtype: "Select", label: "Session Type", options: "Morning\nAfternoon\nEvening\nFull Day", reqd: 0, in_list_view: 1, default: "Full Day" },
        { fieldname: "status", fieldtype: "Select", label: "Status", options: "Present\nAbsent\nHalf Day\nWork From Home\nAt Head Office\nHoliday", reqd: 1, in_list_view: 1, default: "Present" },
        { fieldname: "in_time", fieldtype: "Time", label: "In Time", in_list_view: 1 },
        { fieldname: "out_time", fieldtype: "Time", label: "Out Time", in_list_view: 1 },
        { fieldname: "class_time", fieldtype: "Time", label: "Class Time", in_list_view: 1 },
        { fieldname: "is_visiting", fieldtype: "Check", label: "Is Visiting", in_list_view: 0 },
        { fieldname: "remarks", fieldtype: "Small Text", label: "Remarks", in_list_view: 0 },
      ],
      permissions: [
        { role: "System Manager", read: 1, write: 1, create: 1, delete: 1 },
        { role: "HR Manager", read: 1, write: 1, create: 1, delete: 1 },
        { role: "HR User", read: 1, write: 1, create: 1, delete: 1 },
        { role: "Branch Manager", read: 1, write: 1, create: 1, delete: 1 },
      ],
    };
    const res = await post("resource/DocType", dtPayload);
    console.log("Create DocType result:", res);
  } else {
    console.log(`Child DocType ${dtName} already exists.`);
  }

  console.log("\n=== 2. Adding Custom Fields to Attendance DocType ===");
  // Field 1: custom_branch_sessions (Table)
  const cfTableRes = await get(`resource/Custom Field/Attendance-custom_branch_sessions`);
  if (!cfTableRes?.data) {
    console.log("Creating Custom Field: Attendance-custom_branch_sessions...");
    const cfTablePayload = {
      doctype: "Custom Field",
      dt: "Attendance",
      fieldname: "custom_branch_sessions",
      label: "Branch Sessions",
      fieldtype: "Table",
      options: dtName,
      insert_after: "custom_visiting_branch",
      allow_on_submit: 1,
    };
    const res = await post("resource/Custom Field", cfTablePayload);
    console.log("Create Custom Field Table result:", res);
  } else {
    console.log("Custom Field Attendance-custom_branch_sessions already exists.");
  }

  // Field 2: custom_sessions_json (Long Text fallback)
  const cfJsonRes = await get(`resource/Custom Field/Attendance-custom_sessions_json`);
  if (!cfJsonRes?.data) {
    console.log("Creating Custom Field: Attendance-custom_sessions_json...");
    const cfJsonPayload = {
      doctype: "Custom Field",
      dt: "Attendance",
      fieldname: "custom_sessions_json",
      label: "Sessions JSON",
      fieldtype: "Long Text",
      insert_after: "custom_branch_sessions",
      allow_on_submit: 1,
      hidden: 1,
    };
    const res = await post("resource/Custom Field", cfJsonPayload);
    console.log("Create Custom Field JSON result:", res);
  } else {
    console.log("Custom Field Attendance-custom_sessions_json already exists.");
  }
}

main().catch(console.error);
