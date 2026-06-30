#!/usr/bin/env node
/**
 * Recover RANVEER R (Chullickal) after a broken Demo -> Regular conversion.
 *
 * Current broken state as of June 29, 2026:
 * - Student already marked as Fresher
 * - Regular SO exists: SAL-ORD-2026-01443
 * - No regular invoices exist
 * - Program Enrollment still shows Demo metadata
 * - Old demo invoice is still unpaid
 *
 * Recovery plan:
 * 1. Reuse the existing submitted regular SO
 * 2. Cancel the unpaid demo invoice so dues do not duplicate
 * 3. Create the missing 8 regular invoices using the existing SO
 * 4. Normalize Program Enrollment to Basic / 8 / correct fee structure
 *
 * Dry run:
 *   node scripts/fix-ranveer-r-conversion.mjs --dry-run
 *
 * Execute:
 *   node scripts/fix-ranveer-r-conversion.mjs
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
  studentId: "STU-SU CHL-26-163",
  studentName: "RANVEER R",
  customer: "RANVEER R",
  company: "Smart Up Chullickal",
  programEnrollment: "PEN-12sc state-Chullickal 26-27-163",
  program: "12th Science State",
  itemCode: "12th Science State Tuition Fee",
  academicYear: "2026-2027",
  feeStructure: "SU CHL-12th Science State-Basic-8",
  regularSalesOrder: "SAL-ORD-2026-01443",
  demoInvoice: "ACC-SINV-2026-06016",
};

const SCHEDULE = [
  { label: "Inst 1", amount: 2500, dueDate: "2026-06-26" },
  { label: "Inst 2", amount: 2500, dueDate: "2026-07-26" },
  { label: "Inst 3", amount: 2500, dueDate: "2026-08-26" },
  { label: "Inst 4", amount: 2500, dueDate: "2026-09-26" },
  { label: "Inst 5", amount: 2500, dueDate: "2026-10-26" },
  { label: "Inst 6", amount: 2500, dueDate: "2026-11-26" },
  { label: "Inst 7", amount: 2500, dueDate: "2026-12-26" },
  { label: "Inst 8", amount: 1500, dueDate: "2027-01-26" },
];

const EXPECTED_TOTAL = SCHEDULE.reduce((sum, row) => sum + row.amount, 0);

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function effectiveInvoiceDate(dueDate) {
  const today = todayIso();
  return dueDate < today ? today : dueDate;
}

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

async function cancelDoc(doctype, name) {
  if (DRY_RUN) {
    console.log(`  [DRY] cancel ${doctype}/${name}`);
    return null;
  }
  return post("/api/method/frappe.client.cancel", { doctype, name });
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

async function patchProgramEnrollment() {
  const scriptName = "patch_pe_ranveer_r_basic8";
  const script = `
pe = "${TARGET.programEnrollment}"
frappe.db.set_value("Program Enrollment", pe, "custom_plan", "Basic", update_modified=False)
frappe.db.set_value("Program Enrollment", pe, "custom_no_of_instalments", "8", update_modified=False)
frappe.db.set_value("Program Enrollment", pe, "custom_fee_structure", "${TARGET.feeStructure}", update_modified=False)
frappe.db.set_value("Program Enrollment", pe, "student_category", "", update_modified=False)
frappe.db.commit()
frappe.response["message"] = {
  "patched": True,
  "custom_plan": frappe.db.get_value("Program Enrollment", pe, "custom_plan"),
  "custom_no_of_instalments": frappe.db.get_value("Program Enrollment", pe, "custom_no_of_instalments"),
  "custom_fee_structure": frappe.db.get_value("Program Enrollment", pe, "custom_fee_structure"),
  "student_category": frappe.db.get_value("Program Enrollment", pe, "student_category"),
}
`;

  const result = await runServerScript(scriptName, script);
  if (!result?.patched) {
    throw new Error(`PE patch did not confirm success: ${JSON.stringify(result).slice(0, 200)}`);
  }
  return result;
}

async function fetchLinkedInvoices(salesOrderName) {
  return get(
    `/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([
      ["Sales Invoice Item", "sales_order", "=", salesOrderName],
      ["docstatus", "!=", 2],
    ]))}&fields=${encodeURIComponent(JSON.stringify([
      "name",
      "posting_date",
      "due_date",
      "grand_total",
      "outstanding_amount",
      "status",
      "docstatus",
    ]))}&limit_page_length=50`,
  );
}

async function createInvoiceForScheduleRow(soDoc, soItem, row) {
  const effectiveDate = effectiveInvoiceDate(row.dueDate);
  const payload = {
    doctype: "Sales Invoice",
    customer: TARGET.customer,
    company: TARGET.company,
    student: TARGET.studentId,
    custom_academic_year: TARGET.academicYear,
    posting_date: effectiveDate,
    due_date: effectiveDate,
    disable_rounded_total: 1,
    items: [{
      item_code: soItem.item_code,
      item_name: soItem.item_name,
      description: `${row.label} - ${soItem.item_name}${row.dueDate < effectiveDate ? ` (original due: ${row.dueDate})` : ""}`,
      qty: 1,
      rate: row.amount,
      amount: row.amount,
      sales_order: soDoc.name,
      so_detail: soItem.name,
    }],
  };

  const created = await createDoc("Sales Invoice", payload);
  await submitDoc("Sales Invoice", created.name);
  return created.name;
}

async function main() {
  console.log(`\n${"=".repeat(68)}`);
  console.log(`RANVEER R - DEMO TO REGULAR RECOVERY`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`${"=".repeat(68)}\n`);

  const student = await get(`/api/resource/Student/${encodeURIComponent(TARGET.studentId)}`);
  const pe = await get(`/api/resource/Program Enrollment/${encodeURIComponent(TARGET.programEnrollment)}`);
  const regularSo = await get(`/api/resource/Sales Order/${encodeURIComponent(TARGET.regularSalesOrder)}`);
  const demoInvoice = await get(`/api/resource/Sales Invoice/${encodeURIComponent(TARGET.demoInvoice)}`);
  const linkedInvoices = await fetchLinkedInvoices(TARGET.regularSalesOrder);

  console.log(`Student: ${student.student_name} (${student.name})`);
  console.log(`Student type: ${student.custom_student_type}`);
  console.log(`PE state: category="${pe.student_category || ""}" | plan="${pe.custom_plan || ""}" | instalments="${pe.custom_no_of_instalments || ""}" | fee_structure="${pe.custom_fee_structure || ""}"`);
  console.log(`Regular SO: ${regularSo.name} | total Rs.${regularSo.grand_total} | billing ${regularSo.billing_status}`);
  console.log(`Demo invoice: ${demoInvoice.name} | total Rs.${demoInvoice.grand_total} | outstanding Rs.${demoInvoice.outstanding_amount} | status=${demoInvoice.status}`);
  console.log(`Existing linked regular invoices: ${(linkedInvoices || []).length}\n`);

  if (student.customer !== TARGET.customer) throw new Error(`Unexpected customer: ${student.customer}`);
  if (student.custom_branch !== TARGET.company) throw new Error(`Unexpected branch: ${student.custom_branch}`);
  if (student.custom_student_type !== "Fresher") throw new Error(`Student type is not Fresher: ${student.custom_student_type}`);
  if (pe.program !== TARGET.program) throw new Error(`Unexpected PE program: ${pe.program}`);
  if (Number(regularSo.grand_total ?? 0) !== EXPECTED_TOTAL) {
    throw new Error(`Regular SO total mismatch: expected Rs.${EXPECTED_TOTAL}, got Rs.${regularSo.grand_total}`);
  }
  if (regularSo.docstatus !== 1) throw new Error(`Regular SO is not submitted (docstatus=${regularSo.docstatus})`);
  if ((regularSo.per_billed ?? 0) > 0) throw new Error(`Regular SO already billed (per_billed=${regularSo.per_billed})`);

  if ((linkedInvoices || []).length > 0) {
    throw new Error(`Regular SO already has ${(linkedInvoices || []).length} linked invoice(s). Manual review required.`);
  }

  if (Number(demoInvoice.outstanding_amount ?? 0) > 0 && demoInvoice.docstatus === 1) {
    console.log(`Cancelling stale unpaid demo invoice ${demoInvoice.name}...`);
    await cancelDoc("Sales Invoice", demoInvoice.name);
    console.log(`  ${DRY_RUN ? "[DRY] " : ""}Demo invoice cancellation prepared`);
  } else {
    console.log("Demo invoice is already paid/cancelled; leaving it as historical record.");
  }

  const soItem = regularSo.items?.[0];
  if (!soItem?.name) {
    throw new Error("Regular SO has no item row");
  }

  console.log("\nCreating regular invoices:");
  const createdInvoices = [];
  for (const row of SCHEDULE) {
    const invoiceName = await createInvoiceForScheduleRow(regularSo, soItem, row);
    createdInvoices.push(invoiceName);
    console.log(`  ${DRY_RUN ? "[DRY] " : ""}${invoiceName} -> ${row.label} Rs.${row.amount} | due ${effectiveInvoiceDate(row.dueDate)}`);
  }

  console.log("\nNormalizing Program Enrollment...");
  const patched = await patchProgramEnrollment();
  console.log(`  PE patched -> plan=${patched.custom_plan}, instalments=${patched.custom_no_of_instalments}, fee_structure=${patched.custom_fee_structure}, category="${patched.student_category}"`);

  console.log("\nRecovery complete.");
  console.log(`Created invoice count: ${createdInvoices.length}`);
}

main().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
