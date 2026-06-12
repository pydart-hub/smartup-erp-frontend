/**
 * Patches the live Frappe Work Assignment Detail DocType to include
 * Branch Manager support and remove the old instructor-only requirement.
 *
 * Run: node scripts/fix-wa-live-doctype.mjs
 */

const BASE_URL = "https://smartup.m.frappe.cloud";
const API_KEY = "03330270e330d49";
const API_SECRET = "9c2261ae11ac2d2";
const AUTH = `token ${API_KEY}:${API_SECRET}`;

async function frappeGet(path) {
  const res = await fetch(`${BASE_URL}/api/${path}`, {
    headers: { Authorization: AUTH, Accept: "application/json" },
  });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text).data || JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
}

async function frappePut(path, body) {
  const res = await fetch(`${BASE_URL}/api/${path}`, {
    method: "PUT",
    headers: { Authorization: AUTH, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
}

function findField(fields, fieldname) {
  return fields.find((f) => f.fieldname === fieldname);
}

async function main() {
  console.log("Fetching live Work Assignment Detail DocType...");
  const dt = await frappeGet("resource/DocType/Work%20Assignment%20Detail");
  if (dt.status !== 200 || !dt.data || !Array.isArray(dt.data.fields)) {
    console.error("Failed to fetch DocType:", dt);
    process.exit(1);
  }

  const fields = dt.data.fields;

  // Ensure the live schema matches the current Branch Manager-capable design.
  const updates = [
    {
      fieldname: "assignee_type",
      fieldtype: "Select",
      label: "Assignee Type",
      options: "Instructor\nBranch Manager",
      default: "Instructor",
      reqd: 1,
      in_list_view: 1,
      insert_after: "instructor_assignment_section",
    },
    {
      fieldname: "branch_manager_user",
      fieldtype: "Link",
      label: "Branch Manager User",
      options: "User",
      in_list_view: 1,
      mandatory_depends_on: "eval:doc.assignee_type == 'Branch Manager'",
    },
    {
      fieldname: "assignee_name",
      fieldtype: "Data",
      label: "Assignee Name",
      read_only: 1,
    },
    {
      fieldname: "employee",
      fieldtype: "Link",
      label: "Employee",
      options: "Employee",
      read_only: 1,
      fetch_from: "instructor.employee",
    },
    {
      fieldname: "department",
      fieldtype: "Data",
      label: "Department",
      read_only: 1,
      fetch_from: "instructor.department",
    },
  ];

  for (const patch of updates) {
    const existing = findField(fields, patch.fieldname);
    if (existing) {
      Object.assign(existing, patch);
      console.log(`Updated field: ${patch.fieldname}`);
    } else {
      fields.push({
        fieldname: patch.fieldname,
        fieldtype: patch.fieldtype,
        label: patch.label,
        options: patch.options,
        default: patch.default,
        reqd: patch.reqd ?? 0,
        read_only: patch.read_only ?? 0,
        in_list_view: patch.in_list_view ?? 0,
        mandatory_depends_on: patch.mandatory_depends_on,
        fetch_from: patch.fetch_from,
      });
      console.log(`Added field: ${patch.fieldname}`);
    }
  }

  // Make instructor optional by default, but still required for Instructor rows.
  const instructorField = findField(fields, "instructor");
  if (instructorField) {
    instructorField.reqd = 0;
    instructorField.mandatory_depends_on = "eval:doc.assignee_type != 'Branch Manager'";
    console.log("Updated instructor field to be conditional.");
  }

  // Ensure branch_manager_user is not treated as required unless that row is a Branch Manager.
  const bmField = findField(fields, "branch_manager_user");
  if (bmField) {
    bmField.reqd = 0;
    bmField.mandatory_depends_on = "eval:doc.assignee_type == 'Branch Manager'";
    console.log("Updated branch_manager_user field to be conditional.");
  }

  const result = await frappePut("resource/DocType/Work%20Assignment%20Detail", { fields });
  if (result.status === 200 || result.status === 201) {
    console.log("✓ Live Work Assignment Detail DocType patched successfully.");
  } else {
    console.error("✗ Patch failed:", result.data);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
