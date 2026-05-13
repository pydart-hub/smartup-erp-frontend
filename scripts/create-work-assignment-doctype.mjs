/**
 * Creates the Work Assignment and Work Assignment Detail Custom DocTypes
 * on the live Frappe backend via REST API.
 *
 * Run: node scripts/create-work-assignment-doctype.mjs
 */

const BASE_URL = "https://smartup.m.frappe.cloud";
const API_KEY = "03330270e330d49";
const API_SECRET = "9c2261ae11ac2d2";
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

async function doctypeExists(name) {
  const r = await frappeRequest("GET", `resource/DocType/${encodeURIComponent(name)}`);
  return r.status === 200;
}

// ── Child table first ─────────────────────────────────────────────────────────
const DETAIL_DOCTYPE = {
  doctype: "DocType",
  name: "Work Assignment Detail",
  module: "Custom",
  custom: 1,
  istable: 1,
  editable_grid: 1,
  fields: [
    { fieldname: "instructor",        fieldtype: "Link",    options: "Instructor", label: "Instructor",        in_list_view: 1, reqd: 1 },
    { fieldname: "instructor_name",   fieldtype: "Data",    label: "Instructor Name",   fetch_from: "instructor.instructor_name", in_list_view: 1 },
    { fieldname: "submission_status", fieldtype: "Select",  label: "Submission Status", options: "Pending\nSubmitted", default: "Pending", in_list_view: 1 },
    { fieldname: "google_drive_link", fieldtype: "Data",    label: "Reference Link" },
    { fieldname: "submitted_on",      fieldtype: "Datetime",label: "Submitted On" },
    { fieldname: "submitted_by",      fieldtype: "Data",    label: "Submitted By" },
    { fieldname: "approval_status",   fieldtype: "Select",  label: "Approval Status",   options: "Pending\nApproved\nRejected", default: "Pending" },
    { fieldname: "approved_by",       fieldtype: "Data",    label: "Approved By" },
    { fieldname: "approval_date",     fieldtype: "Date",    label: "Approval Date" },
    { fieldname: "approval_remarks",  fieldtype: "Small Text", label: "Approval Remarks" },
    { fieldname: "rejection_reason",  fieldtype: "Small Text", label: "Rejection Reason" },
    { fieldname: "can_resubmit",      fieldtype: "Check",   label: "Can Resubmit" },
  ],
};

// ── Parent DocType ─────────────────────────────────────────────────────────────
const MAIN_DOCTYPE = {
  doctype: "DocType",
  name: "Work Assignment",
  module: "Custom",
  custom: 1,
  autoname: "naming_series:",
  is_submittable: 1,
  track_changes: 1,
  fields: [
    { fieldname: "naming_series",  fieldtype: "Select",  label: "Series",         options: "WA-\nWA-.YYYY.-", default: "WA-", reqd: 1 },
    { fieldname: "title",          fieldtype: "Data",    label: "Title",           reqd: 1, in_list_view: 1 },
    { fieldname: "topic",          fieldtype: "Data",    label: "Type" },
    { fieldname: "description",    fieldtype: "Text",    label: "Description" },
    { fieldname: "for_branch",     fieldtype: "Link",    label: "Branch",          options: "Company",   reqd: 1, in_list_view: 1 },
    { fieldname: "academic_year",  fieldtype: "Link",    label: "Academic Year",   options: "Academic Year" },
    { fieldname: "deadline",       fieldtype: "Date",    label: "Deadline",        reqd: 1, in_list_view: 1 },
    { fieldname: "enabled",        fieldtype: "Check",   label: "Enabled",         default: 0 },
    { fieldname: "reference_link", fieldtype: "Data",    label: "Reference Link" },
    { fieldname: "instructions_file", fieldtype: "Attach", label: "Instructions File" },
    { fieldname: "assignments_section", fieldtype: "Section Break", label: "Assigned Instructors" },
    {
      fieldname: "assignments",
      fieldtype: "Table",
      label: "Assignments",
      options: "Work Assignment Detail",
    },
    { fieldname: "summary_section", fieldtype: "Section Break", label: "Summary" },
    { fieldname: "total_assigned",  fieldtype: "Int", label: "Total Assigned",   read_only: 1 },
    { fieldname: "submitted_count", fieldtype: "Int", label: "Submitted Count",  read_only: 1 },
    { fieldname: "approved_count",  fieldtype: "Int", label: "Approved Count",   read_only: 1 },
  ],
  permissions: [
    { role: "System Manager", read: 1, write: 1, create: 1, delete: 1, submit: 1, cancel: 1, amend: 1 },
  ],
};

async function createOrSkip(label, name, payload) {
  process.stdout.write(`Checking if "${name}" exists... `);
  if (await doctypeExists(name)) {
    console.log("already exists, skipping.");
    return true;
  }
  console.log("not found, creating...");
  const r = await frappeRequest("POST", "resource/DocType", payload);
  if (r.status === 200 || r.status === 201) {
    console.log(`✓ "${name}" created successfully.`);
    return true;
  }
  console.error(`✗ Failed to create "${name}":`, JSON.stringify(r.data, null, 2));
  return false;
}

(async () => {
  console.log("=== Work Assignment DocType Setup ===\n");

  // Child table must be created first
  const childOk = await createOrSkip("Child table", "Work Assignment Detail", DETAIL_DOCTYPE);
  if (!childOk) {
    console.error("\nAborted: child table creation failed.");
    process.exit(1);
  }

  const parentOk = await createOrSkip("Parent DocType", "Work Assignment", MAIN_DOCTYPE);
  if (!parentOk) {
    console.error("\nAborted: parent DocType creation failed.");
    process.exit(1);
  }

  console.log("\n=== Done. Try saving a Work Assignment in the UI now. ===");
})();
