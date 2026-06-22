/**
 * Creates the Discontinued Follow Up custom DocType on the Frappe backend.
 * Run with env vars:
 *   NEXT_PUBLIC_FRAPPE_URL
 *   FRAPPE_API_KEY
 *   FRAPPE_API_SECRET
 */

const BASE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

if (!BASE_URL || !API_KEY || !API_SECRET) {
  console.error("Missing NEXT_PUBLIC_FRAPPE_URL / FRAPPE_API_KEY / FRAPPE_API_SECRET");
  process.exit(1);
}

const AUTH = `token ${API_KEY}:${API_SECRET}`;

async function frappeRequest(method, path, body) {
  const url = `${BASE_URL}/api/${path}`;
  const opts = {
    method,
    headers: {
      Authorization: AUTH,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  return { status: res.status, data: json };
}

const DOCTYPE = {
  doctype: "DocType",
  name: "Discontinued Follow Up",
  module: "Custom",
  custom: 1,
  autoname: "naming_series:",
  track_changes: 1,
  fields: [
    { fieldname: "naming_series", fieldtype: "Select", label: "Series", options: "DFU-.YYYY.-", default: "DFU-.YYYY.-", reqd: 1 },
    { fieldname: "student", fieldtype: "Link", options: "Student", label: "Student", reqd: 1, in_list_view: 1 },
    { fieldname: "student_name", fieldtype: "Data", label: "Student Name", fetch_from: "student.student_name", in_list_view: 1 },
    { fieldname: "branch", fieldtype: "Link", options: "Company", label: "Branch", reqd: 1, in_list_view: 1 },
    { fieldname: "column_break_1", fieldtype: "Column Break" },
    { fieldname: "discontinuation_date", fieldtype: "Date", label: "Discontinuation Date" },
    { fieldname: "discontinuation_reason", fieldtype: "Small Text", label: "Discontinuation Reason" },
    { fieldname: "call_date", fieldtype: "Datetime", label: "Call Date", reqd: 1, in_list_view: 1, default: "now" },
    { fieldname: "called_by", fieldtype: "Data", label: "Called By", reqd: 1, in_list_view: 1 },
    { fieldname: "call_status", fieldtype: "Select", label: "Call Status", options: "Answered\nNo Answer\nBusy\nSwitched Off\nWrong Number\nCallback Requested", reqd: 1, in_list_view: 1 },
    { fieldname: "feedback_category", fieldtype: "Select", label: "Feedback Category", options: "Financial Issue\nPersonal Reason\nShifted\nPoor Performance\nNot Interested\nJoined Elsewhere\nTiming Issue\nHealth Issue\nOther" },
    { fieldname: "feedback_notes", fieldtype: "Small Text", label: "Feedback Notes" },
    { fieldname: "interested_to_rejoin", fieldtype: "Check", label: "Interested to Rejoin", default: 0 },
    { fieldname: "rejoin_probability", fieldtype: "Select", label: "Rejoin Probability", options: "\nHigh\nMedium\nLow" },
    { fieldname: "reason_not_rejoining", fieldtype: "Small Text", label: "Reason Not Rejoining" },
    { fieldname: "followup_outcome", fieldtype: "Select", label: "Follow-Up Outcome", options: "Open\nClosed\nWill Rejoin\nNot Interested\nWrong Number" },
    { fieldname: "latest_mobile_used", fieldtype: "Data", label: "Latest Mobile Used" },
    { fieldname: "invoice_outstanding_at_call", fieldtype: "Currency", label: "Outstanding At Call" },
    { fieldname: "director_visible", fieldtype: "Check", label: "Director Visible", default: 1 },
  ],
};

const exists = await frappeRequest("GET", `resource/DocType/${encodeURIComponent(DOCTYPE.name)}`);
if (exists.status === 200) {
  console.log(`DocType "${DOCTYPE.name}" already exists.`);
  process.exit(0);
}

const created = await frappeRequest("POST", "resource/DocType", DOCTYPE);
if (created.status === 200 || created.status === 201) {
  console.log(`Created "${DOCTYPE.name}" successfully.`);
} else {
  console.error(`Failed to create "${DOCTYPE.name}"`, created);
  process.exit(1);
}
