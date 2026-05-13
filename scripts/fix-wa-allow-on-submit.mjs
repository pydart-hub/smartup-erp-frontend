/**
 * Marks the mutable fields on Work Assignment Detail as allow_on_submit=1
 * so instructors/GMs can update submission/approval status after the WA is submitted.
 *
 * Run: node scripts/fix-wa-allow-on-submit.mjs
 */

const BASE_URL = "https://smartup.m.frappe.cloud";
const API_KEY = "03330270e330d49";
const API_SECRET = "9c2261ae11ac2d2";
const AUTH = `token ${API_KEY}:${API_SECRET}`;

async function get(path) {
  const res = await fetch(`${BASE_URL}/api/${path}`, {
    headers: { Authorization: AUTH, Accept: "application/json" },
  });
  return res.json();
}

async function put(path, body) {
  const res = await fetch(`${BASE_URL}/api/${path}`, {
    method: "PUT",
    headers: { Authorization: AUTH, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

// Fields on Work Assignment Detail that must be editable after submission
const ALLOW_ON_SUBMIT_FIELDS = [
  "submission_status",
  "google_drive_link",
  "submitted_on",
  "submitted_by",
  "approval_status",
  "approved_by",
  "approval_date",
  "approval_remarks",
  "rejection_reason",
  "can_resubmit",
];

(async () => {
  console.log("Fetching Work Assignment Detail DocType...");
  const dt = await get("resource/DocType/Work%20Assignment%20Detail");
  if (!dt.data) {
    console.error("Failed to fetch DocType:", dt);
    process.exit(1);
  }

  const fields = dt.data.fields || [];
  let changed = 0;
  for (const field of fields) {
    if (ALLOW_ON_SUBMIT_FIELDS.includes(field.fieldname) && !field.allow_on_submit) {
      field.allow_on_submit = 1;
      changed++;
    }
  }
  console.log(`Marking ${changed} field(s) as allow_on_submit=1`);

  const result = await put("resource/DocType/Work%20Assignment%20Detail", { fields });
  if (result.status === 200) {
    console.log("✓ Work Assignment Detail updated successfully.");
  } else {
    console.error("✗ Failed:", JSON.stringify(result.data, null, 2));
    process.exit(1);
  }

  // Also ensure parent WA fields that might need amending are allowed
  console.log("\nFetching Work Assignment DocType...");
  const dtParent = await get("resource/DocType/Work%20Assignment");
  if (!dtParent.data) {
    console.error("Failed to fetch parent DocType:", dtParent);
    process.exit(1);
  }

  const parentFields = dtParent.data.fields || [];
  const PARENT_ALLOW = ["total_assigned", "submitted_count", "approved_count"];
  let parentChanged = 0;
  for (const field of parentFields) {
    if (PARENT_ALLOW.includes(field.fieldname) && !field.allow_on_submit) {
      field.allow_on_submit = 1;
      parentChanged++;
    }
  }
  // Also allow the assignments table itself
  for (const field of parentFields) {
    if (field.fieldname === "assignments" && !field.allow_on_submit) {
      field.allow_on_submit = 1;
      parentChanged++;
    }
  }
  console.log(`Marking ${parentChanged} parent field(s) as allow_on_submit=1`);

  const parentResult = await put("resource/DocType/Work%20Assignment", { fields: parentFields });
  if (parentResult.status === 200) {
    console.log("✓ Work Assignment parent DocType updated successfully.");
  } else {
    console.error("✗ Failed:", JSON.stringify(parentResult.data, null, 2));
    process.exit(1);
  }

  console.log("\n=== Done. Instructor can now submit work on active assignments. ===");
})();
