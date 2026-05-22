/**
 * Creates the Fee Follow Up Custom DocType on the Frappe backend.
 * Run once: node scripts/create-fee-followup-doctype.mjs
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

async function doctypeExists(name) {
  const r = await frappeRequest("GET", `resource/DocType/${encodeURIComponent(name)}`);
  return r.status === 200;
}

const FEE_FOLLOWUP_DOCTYPE = {
  doctype: "DocType",
  name: "Fee Follow Up",
  module: "Custom",
  custom: 1,
  autoname: "naming_series:",
  track_changes: 1,
  fields: [
    {
      fieldname: "naming_series",
      fieldtype: "Select",
      label: "Series",
      options: "FU-.YYYY.-",
      default: "FU-.YYYY.-",
      reqd: 1,
    },
    {
      fieldname: "student",
      fieldtype: "Link",
      options: "Student",
      label: "Student",
      reqd: 1,
      in_list_view: 1,
    },
    {
      fieldname: "student_name",
      fieldtype: "Data",
      label: "Student Name",
      fetch_from: "student.student_name",
      in_list_view: 1,
    },
    {
      fieldname: "branch",
      fieldtype: "Link",
      options: "Company",
      label: "Branch",
      reqd: 1,
      in_list_view: 1,
    },
    {
      fieldname: "column_break_1",
      fieldtype: "Column Break",
    },
    {
      fieldname: "call_date",
      fieldtype: "Datetime",
      label: "Call Date",
      reqd: 1,
      in_list_view: 1,
      default: "now",
    },
    {
      fieldname: "called_by",
      fieldtype: "Data",
      label: "Called By (Email)",
      reqd: 1,
      in_list_view: 1,
    },
    {
      fieldname: "call_status",
      fieldtype: "Select",
      label: "Call Status",
      options: "Called – Answered\nCalled – No Answer\nCalled – Busy\nPromised to Pay\nWill Pay This Week\nDisputed\nAlready Paid",
      reqd: 1,
      in_list_view: 1,
    },
    {
      fieldname: "section_break_payment",
      fieldtype: "Section Break",
      label: "Payment Details",
    },
    {
      fieldname: "payment_received",
      fieldtype: "Check",
      label: "Payment Received",
      default: 0,
    },
    {
      fieldname: "amount_received",
      fieldtype: "Currency",
      label: "Amount Received",
      depends_on: "eval:doc.payment_received == 1",
    },
    {
      fieldname: "payment_mode",
      fieldtype: "Select",
      label: "Payment Mode",
      options: "\nCash\nUPI\nBank Transfer\nCheque",
      depends_on: "eval:doc.payment_received == 1",
    },
    {
      fieldname: "section_break_notes",
      fieldtype: "Section Break",
      label: "Notes",
    },
    {
      fieldname: "remarks",
      fieldtype: "Small Text",
      label: "Remarks",
    },
    {
      fieldname: "next_followup_date",
      fieldtype: "Date",
      label: "Next Follow-Up Date",
      in_list_view: 1,
    },
    {
      fieldname: "invoice_ref",
      fieldtype: "Link",
      options: "Sales Invoice",
      label: "Invoice Reference",
    },
  ],
};

// Main
const name = "Fee Follow Up";
if (await doctypeExists(name)) {
  console.log(`✓ DocType "${name}" already exists — skipping creation.`);
} else {
  console.log(`Creating DocType: ${name} ...`);
  const r = await frappeRequest("POST", "resource/DocType", FEE_FOLLOWUP_DOCTYPE);
  if (r.status === 200 || r.status === 201) {
    console.log(`✓ DocType "${name}" created successfully.`);
  } else {
    console.error(`✗ Failed (${r.status}):`, JSON.stringify(r.data, null, 2).slice(0, 500));
    process.exit(1);
  }
}

// Verify by fetching the doc
const verify = await frappeRequest("GET", `resource/DocType/${encodeURIComponent(name)}`);
if (verify.status === 200) {
  const fields = verify.data?.data?.fields ?? [];
  console.log(`\nVerified fields (${fields.length}):`);
  fields.forEach(f => console.log(`  ${f.fieldname} [${f.fieldtype}]`));
} else {
  console.error("Could not verify doctype after creation.");
}
