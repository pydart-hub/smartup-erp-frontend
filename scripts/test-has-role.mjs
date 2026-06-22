import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const BASE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL || "https://smartup.m.frappe.cloud";
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;
const AUTH = `token ${API_KEY}:${API_SECRET}`;

async function frappeGet(doctype, args) {
  const query = new URLSearchParams(args).toString();
  const res = await fetch(`${BASE_URL}/api/resource/${doctype}?${query}`, {
    headers: { Authorization: AUTH }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frappe Error (${res.status}): ${text}`);
  }
  return res.json();
}

async function test() {
  try {
    console.log("Fetching Mentor Profiles...");
    const profiles = await frappeGet("Mentor Profile", {
      fields: JSON.stringify([
        "name", "mentor_name", "employee", "user_id", "branch", "status",
        "max_student_limit", "remarks", "creation", "modified"
      ]),
      limit_page_length: "500",
      order_by: "mentor_name asc"
    });
    console.log("Profiles found:", profiles.data ? profiles.data.length : 0);

    console.log("Fetching Mentor Assignments...");
    const assignments = await frappeGet("Mentor Student Assignment", {
      fields: JSON.stringify([
        "name", "student", "mentor_profile", "mentor_user",
        "branch", "assigned_by", "assigned_on", "status", "notes",
        "creation", "modified"
      ]),
      limit_page_length: "1000",
      order_by: "modified desc"
    });
    console.log("Assignments found:", assignments.data ? assignments.data.length : 0);

    console.log("Fetching Mentor Feedback...");
    const feedback = await frappeGet("Mentor Feedback", {
      fields: JSON.stringify([
        "name", "student", "mentor_profile", "mentor_user", "branch",
        "contact_person", "contact_number", "call_datetime", "call_status",
        "discussion_category", "academic_notes", "fee_notes", "contact_notes",
        "overall_feedback", "next_followup_date", "priority", "action_required",
        "creation"
      ]),
      limit_page_length: "1000",
      order_by: "call_datetime desc, creation desc"
    });
    console.log("Feedback found:", feedback.data ? feedback.data.length : 0);
  } catch (err) {
    console.error(err);
  }
}

test();
