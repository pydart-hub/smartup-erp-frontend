#!/usr/bin/env node
/**
 * Generate missing regular invoices for FAHAD KR (Fortkochi) after demo conversion.
 * Applies the demo-paid 499 reduction to the LAST invoice only.
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const BASE = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;
const DRY_RUN = process.argv.includes("--dry-run");

if (!BASE || !API_KEY || !API_SECRET) {
  throw new Error("Missing NEXT_PUBLIC_FRAPPE_URL / FRAPPE_API_KEY / FRAPPE_API_SECRET");
}

const AUTH_HEADERS = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  "Content-Type": "application/json",
};

const TARGET = {
  studentId: "STU-SU FKO-26-119",
  studentName: "FAHAD KR",
  customer: "FAHAD KR",
  company: "Smart Up Fortkochi",
  programEnrollment: "PEN-12sc state-Fortkochi 26-27-119",
  program: "12th Science State",
  itemCode: "12th Science State Tuition Fee",
  academicYear: "2026-2027",
  feeStructure: "SU FKO-12th Science State-Basic-8",
  regularSalesOrder: "SAL-ORD-2026-01204",
  demoInvoice: "ACC-SINV-2026-06553",
  enrollmentDate: "2026-05-05",
};

const SCHEDULE = [
  { label: "Inst 1", amount: 2500, dueDate: "2026-06-04" },
  { label: "Inst 2", amount: 2500, dueDate: "2026-06-04" },
  { label: "Inst 3", amount: 2500, dueDate: "2026-07-05" },
  { label: "Inst 4", amount: 2500, dueDate: "2026-08-05" },
  { label: "Inst 5", amount: 2500, dueDate: "2026-09-05" },
  { label: "Inst 6", amount: 2500, dueDate: "2026-10-05" },
  { label: "Inst 7", amount: 2500, dueDate: "2026-11-05" },
  { label: "Inst 8", amount: 1001, dueDate: "2026-12-05", creditApplied: 499 },
];

async function api(method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: AUTH_HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status}: ${text.slice(0, 500)}`);
  }
  return json.data ?? json.message ?? json;
}

const get = (path) => api("GET", path);
const post = (path, body) => api("POST", path, body);
const put = (path, body) => api("PUT", path, body);

async function createDoc(doctype, payload) {
  if (DRY_RUN) {
    console.log(`  [DRY] create ${doctype}`, JSON.stringify(payload, null, 2));
    return { name: `DRY-${doctype.replace(/\s+/g, "-").toUpperCase()}` };
  }
  return post(`/api/resource/${encodeURIComponent(doctype)}`, payload);
}

async function submitDoc(doctype, name) {
  if (DRY_RUN) {
    console.log(`  [DRY] submit ${doctype}/${name}`);
    return null;
  }
  return put(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { docstatus: 1 });
}

async function setValue(doctype, name, fieldname) {
  if (DRY_RUN) {
    console.log(`  [DRY] set_value ${doctype}/${name}`, fieldname);
    return null;
  }
  return post("/api/method/frappe.client.set_value", { doctype, name, fieldname });
}

async function deleteServerScriptIfExists(name) {
  if (DRY_RUN) return;
  const response = await fetch(`${BASE}/api/resource/Server Script/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: AUTH_HEADERS,
  });
  if (!response.ok && response.status !== 404) {
    const text = await response.text().catch(() => "");
    throw new Error(`DELETE Server Script/${name} failed: ${text.slice(0, 400)}`);
  }
}

async function runServerScript(scriptName, script) {
  if (DRY_RUN) {
    console.log(`  [DRY] run server script ${scriptName}`);
    return { patched: true };
  }
  await deleteServerScriptIfExists(scriptName).catch(() => {});
  await createDoc("Server Script", {
    name: scriptName,
    script_type: "API",
    api_method: scriptName,
    allow_guest: 0,
    disabled: 0,
    script,
  });
  try {
    return await post(`/api/method/${scriptName}`, {});
  } finally {
    await deleteServerScriptIfExists(scriptName).catch(() => {});
  }
}

async function fetchLinkedInvoices(salesOrderName) {
  return get(
    `/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([
      ["Sales Invoice Item", "sales_order", "=", salesOrderName],
    ]))}&fields=${encodeURIComponent(JSON.stringify([
      "name",
      "grand_total",
      "outstanding_amount",
      "status",
      "posting_date",
      "due_date",
      "docstatus",
    ]))}&limit_page_length=50`,
  );
}

async function patchProgramEnrollmentDirect() {
  const scriptName = "patch_pe_fahad_kr_basic8";
  const script = `
pe = "${TARGET.programEnrollment}"
frappe.db.set_value("Program Enrollment", pe, "custom_plan", "Basic", update_modified=False)
frappe.db.set_value("Program Enrollment", pe, "custom_no_of_instalments", "8", update_modified=False)
frappe.db.set_value("Program Enrollment", pe, "custom_fee_structure", "${TARGET.feeStructure}", update_modified=False)
frappe.db.set_value("Program Enrollment", pe, "student_category", "", update_modified=False)
frappe.db.commit()
frappe.response["message"] = {"patched": True}
`;
  return runServerScript(scriptName, script);
}

async function patchSalesOrderTotal() {
  const scriptName = "patch_so_fahad_kr_basic8";
  const script = `
so = "${TARGET.regularSalesOrder}"
v = 18501
item = frappe.db.get_value("Sales Order Item", {"parent": so}, "name")
if item:
    frappe.db.set_value("Sales Order Item", item, "rate", 2312.625, update_modified=False)
    frappe.db.set_value("Sales Order Item", item, "amount", v, update_modified=False)
    frappe.db.set_value("Sales Order Item", item, "base_rate", 2312.625, update_modified=False)
    frappe.db.set_value("Sales Order Item", item, "base_amount", v, update_modified=False)
for f in ["grand_total","net_total","total","base_grand_total","base_net_total","base_total","rounded_total","base_rounded_total"]:
    frappe.db.set_value("Sales Order", so, f, v, update_modified=False)
frappe.db.commit()
frappe.response["message"] = {"patched": True}
`;
  return runServerScript(scriptName, script);
}

async function createInvoiceForScheduleRow(soDoc, soItem, row) {
  const payload = {
    doctype: "Sales Invoice",
    customer: TARGET.customer,
    company: TARGET.company,
    student: TARGET.studentId,
    custom_academic_year: TARGET.academicYear,
    posting_date: row.dueDate,
    due_date: row.dueDate,
    disable_rounded_total: 1,
    items: [{
      item_code: TARGET.itemCode,
      item_name: TARGET.itemCode,
      description: `${row.label} - ${TARGET.program} Tuition Fee`,
      qty: 1,
      rate: row.amount,
      amount: row.amount,
      sales_order: soDoc.name,
      so_detail: soItem.name,
    }],
  };
  const draft = await createDoc("Sales Invoice", payload);
  await submitDoc("Sales Invoice", draft.name);
  return draft.name;
}

async function main() {
  console.log(`\n=== Generate Fahad KR Basic-8 invoices ===\n`);
  const student = await get(`/api/resource/Student/${encodeURIComponent(TARGET.studentId)}`);
  const pe = await get(`/api/resource/Program Enrollment/${encodeURIComponent(TARGET.programEnrollment)}`);
  const soDoc = await get(`/api/resource/Sales Order/${encodeURIComponent(TARGET.regularSalesOrder)}`);
  const demoInvoice = await get(`/api/resource/Sales Invoice/${encodeURIComponent(TARGET.demoInvoice)}`);
  const existingInvoices = await fetchLinkedInvoices(TARGET.regularSalesOrder);

  console.log(`Student type: ${student.custom_student_type || "(blank)"}`);
  console.log(`PE category: ${pe.student_category || "(blank)"}`);
  console.log(`Demo invoice: ${demoInvoice.name} | ${demoInvoice.status} | paid ₹${Number(demoInvoice.grand_total || 0) - Number(demoInvoice.outstanding_amount || 0)}`);
  console.log(`Regular SO total: ₹${soDoc.grand_total}`);
  console.log(`Existing regular invoices: ${(existingInvoices || []).length}`);

  if ((existingInvoices || []).length > 0) {
    throw new Error(`Regular invoices already exist for ${TARGET.regularSalesOrder}`);
  }

  await patchSalesOrderTotal();

  const soAfterPatch = await get(`/api/resource/Sales Order/${encodeURIComponent(TARGET.regularSalesOrder)}`);
  const soItem = soAfterPatch.items?.[0];
  if (!soItem?.name) {
    throw new Error("Sales Order item row missing");
  }

  console.log("\nCreating invoices...");
  const createdInvoices = [];
  for (const row of SCHEDULE) {
    const invoiceName = await createInvoiceForScheduleRow(soAfterPatch, soItem, row);
    createdInvoices.push(invoiceName);
    console.log(`  Created ${invoiceName} -> ${row.label} ₹${row.amount}`);
  }

  console.log("\nUpdating enrollment metadata...");
  await patchProgramEnrollmentDirect();
  await setValue("Student", TARGET.studentId, { custom_student_type: "Fresher" });

  console.log("\nCompleted.");
  console.log(`Created invoices: ${createdInvoices.join(", ")}`);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}`);
  process.exit(1);
});
