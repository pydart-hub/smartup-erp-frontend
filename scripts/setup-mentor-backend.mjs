/**
 * Creates the Mentor Role and its associated Custom DocTypes
 * on the live Frappe backend via REST API.
 *
 * Run: node scripts/setup-mentor-backend.mjs
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const BASE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL || "https://smartup.m.frappe.cloud";
const API_KEY = process.env.FRAPPE_API_KEY || "03330270e330d49";
const API_SECRET = process.env.FRAPPE_API_SECRET || "9c2261ae11ac2d2";
const AUTH = `token ${API_KEY}:${API_SECRET}`;

async function frappeRequest(method, path, body) {
  const url = `${BASE_URL}/api/${path}`;
  const opts = {
    method,
    headers: {
      "Authorization": AUTH,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  return { status: res.status, data: json };
}

async function roleExists(name) {
  const r = await frappeRequest("GET", `resource/Role/${encodeURIComponent(name)}`);
  return r.status === 200;
}

async function doctypeExists(name) {
  const r = await frappeRequest("GET", `resource/DocType/${encodeURIComponent(name)}`);
  return r.status === 200;
}

async function createOrSkipRole(name) {
  process.stdout.write(`Checking if Role "${name}" exists... `);
  if (await roleExists(name)) {
    console.log("already exists, skipping.");
    return true;
  }
  console.log("not found, creating...");
  const r = await frappeRequest("POST", "resource/Role", {
    doctype: "Role",
    role_name: name,
    desk_access: 0,
  });
  if (r.status === 200 || r.status === 201) {
    console.log(`✓ Role "${name}" created successfully.`);
    return true;
  }
  console.error(`✗ Failed to create Role "${name}":`, JSON.stringify(r.data, null, 2));
  return false;
}

async function createOrSkipDocType(name, payload) {
  process.stdout.write(`Checking if DocType "${name}" exists... `);
  if (await doctypeExists(name)) {
    console.log("already exists, skipping.");
    return true;
  }
  console.log("not found, creating...");
  const r = await frappeRequest("POST", "resource/DocType", payload);
  if (r.status === 200 || r.status === 201) {
    console.log(`✓ DocType "${name}" created successfully.`);
    return true;
  }
  console.error(`✗ Failed to create DocType "${name}":`, JSON.stringify(r.data, null, 2));
  return false;
}

const MENTOR_PROFILE_DOCTYPE = {
  doctype: "DocType",
  name: "Mentor Profile",
  module: "Custom",
  custom: 1,
  autoname: "format:MENTOR-{YYYY}-{MM}-{#####}",
  fields: [
    { fieldname: "mentor_name", fieldtype: "Data", label: "Mentor Name", reqd: 1, in_list_view: 1 },
    { fieldname: "employee", fieldtype: "Link", options: "Employee", label: "Employee" },
    { fieldname: "user_id", fieldtype: "Link", options: "User", label: "User ID", reqd: 1, in_list_view: 1 },
    { fieldname: "branch", fieldtype: "Link", options: "Company", label: "Branch", reqd: 1, in_list_view: 1 },
    { fieldname: "status", fieldtype: "Select", label: "Status", options: "Active\nInactive", default: "Active", in_list_view: 1 },
    { fieldname: "max_student_limit", fieldtype: "Int", label: "Max Student Limit", default: "100" },
    { fieldname: "remarks", fieldtype: "Small Text", label: "Remarks" }
  ],
  permissions: [
    { role: "System Manager", read: 1, write: 1, create: 1, delete: 1 },
    { role: "Branch Manager", read: 1, write: 1, create: 1 },
    { role: "Mentor", read: 1 }
  ]
};

const MENTOR_STUDENT_ASSIGNMENT_DOCTYPE = {
  doctype: "DocType",
  name: "Mentor Student Assignment",
  module: "Custom",
  custom: 1,
  autoname: "format:MSA-{YYYY}-{MM}-{#####}",
  fields: [
    { fieldname: "student", fieldtype: "Link", options: "Student", label: "Student", reqd: 1, in_list_view: 1 },
    { fieldname: "mentor_profile", fieldtype: "Link", options: "Mentor Profile", label: "Mentor Profile", reqd: 1, in_list_view: 1 },
    { fieldname: "mentor_user", fieldtype: "Data", label: "Mentor User", fetch_from: "mentor_profile.user_id" },
    { fieldname: "branch", fieldtype: "Link", options: "Company", label: "Branch", reqd: 1 },
    { fieldname: "assigned_by", fieldtype: "Data", label: "Assigned By" },
    { fieldname: "assigned_on", fieldtype: "Date", label: "Assigned On" },
    { fieldname: "status", fieldtype: "Select", label: "Status", options: "Active\nReassigned\nInactive", default: "Active", in_list_view: 1 },
    { fieldname: "notes", fieldtype: "Small Text", label: "Notes" }
  ],
  permissions: [
    { role: "System Manager", read: 1, write: 1, create: 1, delete: 1 },
    { role: "Branch Manager", read: 1, write: 1, create: 1 },
    { role: "Mentor", read: 1 }
  ]
};

const MENTOR_FEEDBACK_DOCTYPE = {
  doctype: "DocType",
  name: "Mentor Feedback",
  module: "Custom",
  custom: 1,
  autoname: "format:MFB-{YYYY}-{MM}-{#####}",
  fields: [
    { fieldname: "student", fieldtype: "Link", options: "Student", label: "Student", reqd: 1, in_list_view: 1 },
    { fieldname: "mentor_profile", fieldtype: "Link", options: "Mentor Profile", label: "Mentor Profile", reqd: 1 },
    { fieldname: "mentor_user", fieldtype: "Data", label: "Mentor User", fetch_from: "mentor_profile.user_id" },
    { fieldname: "branch", fieldtype: "Link", options: "Company", label: "Branch", fetch_from: "mentor_profile.branch" },
    
    { fieldname: "contact_person", fieldtype: "Data", label: "Contact Person" },
    { fieldname: "contact_number", fieldtype: "Data", label: "Contact Number" },
    { fieldname: "call_datetime", fieldtype: "Datetime", label: "Call Date Time", in_list_view: 1 },
    { fieldname: "call_status", fieldtype: "Select", options: "Answered\nNo Answer\nBusy\nSwitched Off\nCall Back Requested", label: "Call Status", in_list_view: 1 },
    { fieldname: "discussion_category", fieldtype: "Select", options: "Academic\nFees\nAttendance\nBehaviour\nGeneral\nOther", label: "Discussion Category" },
    
    { fieldname: "academic_notes", fieldtype: "Small Text", label: "Academic Notes" },
    { fieldname: "fee_notes", fieldtype: "Small Text", label: "Fee Notes" },
    { fieldname: "contact_notes", fieldtype: "Small Text", label: "Contact Notes" },
    { fieldname: "overall_feedback", fieldtype: "Text", label: "Overall Feedback" },
    
    { fieldname: "next_followup_date", fieldtype: "Date", label: "Next Follow-up Date" },
    { fieldname: "priority", fieldtype: "Select", options: "Low\nMedium\nHigh", label: "Priority" },
    { fieldname: "action_required", fieldtype: "Check", label: "Action Required" }
  ],
  permissions: [
    { role: "System Manager", read: 1, write: 1, create: 1, delete: 1 },
    { role: "Branch Manager", read: 1 },
    { role: "Mentor", read: 1, write: 1, create: 1 }
  ]
};

(async () => {
  console.log("=== Mentor Role & DocType Setup ===\n");

  const roleOk = await createOrSkipRole("Mentor");
  if (!roleOk) {
    console.error("\nAborted: Mentor Role creation failed.");
    process.exit(1);
  }

  const profileOk = await createOrSkipDocType("Mentor Profile", MENTOR_PROFILE_DOCTYPE);
  if (!profileOk) process.exit(1);

  const assignmentOk = await createOrSkipDocType("Mentor Student Assignment", MENTOR_STUDENT_ASSIGNMENT_DOCTYPE);
  if (!assignmentOk) process.exit(1);

  const feedbackOk = await createOrSkipDocType("Mentor Feedback", MENTOR_FEEDBACK_DOCTYPE);
  if (!feedbackOk) process.exit(1);

  console.log("\n=== Success! The Mentor backend is fully initialized. ===");
})();
