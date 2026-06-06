#!/usr/bin/env node
/**
 * Convert V YADHU KRISHNA (Chullickal) from Demo to Basic 8-installment plan.
 *
 * Notes:
 * - A regular Basic-8 Sales Order already exists for this student.
 * - The Demo invoice is still unpaid, so we cancel it instead of carrying it forward.
 * - If any demo payment is found later, that credit is reduced from invoice 1 only,
 *   per the requested behavior for this case.
 *
 * Dry run:
 *   node scripts/convert-yadhu-krishna-basic-8.mjs --dry-run
 *
 * Execute:
 *   node scripts/convert-yadhu-krishna-basic-8.mjs
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
  studentId: "STU-SU CHL-26-164",
  studentName: "V YADHU KRISHNA",
  customer: "V YADHU KRISHNA",
  company: "Smart Up Chullickal",
  programEnrollment: "PEN-12sc state-Chullickal 26-27-164",
  program: "12th Science State",
  itemCode: "12th Science State Tuition Fee",
  academicYear: "2026-2027",
  feeStructure: "SU CHL-12th Science State-Basic-8",
  enrollmentDate: "2026-04-29",
  regularSalesOrder: "SAL-ORD-2026-01255",
  demoSalesOrder: "SAL-ORD-2026-00747",
  demoInvoice: "ACC-SINV-2026-06017",
};

const STANDARD_SCHEDULE = [
  { label: "Inst 1", amount: 2500, dueDate: "2026-04-29" },
  { label: "Inst 2", amount: 2500, dueDate: "2026-05-29" },
  { label: "Inst 3", amount: 2500, dueDate: "2026-06-29" },
  { label: "Inst 4", amount: 2500, dueDate: "2026-07-29" },
  { label: "Inst 5", amount: 2500, dueDate: "2026-08-29" },
  { label: "Inst 6", amount: 2500, dueDate: "2026-09-29" },
  { label: "Inst 7", amount: 2500, dueDate: "2026-10-29" },
  { label: "Inst 8", amount: 1500, dueDate: "2026-11-29" },
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

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function setValue(doctype, name, fieldname) {
  if (DRY_RUN) {
    console.log(`  [DRY] set_value ${doctype}/${name}`, fieldname);
    return null;
  }
  return post("/api/method/frappe.client.set_value", { doctype, name, fieldname });
}

async function cancelDoc(doctype, name) {
  if (DRY_RUN) {
    console.log(`  [DRY] cancel ${doctype}/${name}`);
    return null;
  }
  return post("/api/method/frappe.client.cancel", { doctype, name });
}

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

function buildAdjustedSchedule(demoPaidAmount) {
  const adjusted = STANDARD_SCHEDULE.map((row) => ({ ...row }));
  let remainingCredit = round2(demoPaidAmount);

  for (let index = 0; index < adjusted.length && remainingCredit > 0; index += 1) {
    const applied = Math.min(adjusted[index].amount, remainingCredit);
    adjusted[index].amount = round2(adjusted[index].amount - applied);
    adjusted[index].creditApplied = applied;
    remainingCredit = round2(remainingCredit - applied);
  }

  if (remainingCredit > 0) {
    throw new Error(`Demo credit exceeds total schedule by ₹${remainingCredit}`);
  }

  return adjusted;
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
      "is_return",
    ]))}&limit_page_length=50`,
  );
}

async function fetchExistingPayments(customer) {
  return get(
    `/api/resource/Payment Entry?filters=${encodeURIComponent(JSON.stringify([
      ["party_type", "=", "Customer"],
      ["party", "=", customer],
      ["docstatus", "=", 1],
    ]))}&fields=${encodeURIComponent(JSON.stringify([
      "name",
      "paid_amount",
      "received_amount",
      "posting_date",
      "reference_no",
    ]))}&limit_page_length=20`,
  );
}

async function patchProgramEnrollmentDirect() {
  const scriptName = "patch_pe_yadhu_krishna_basic8";
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

async function createInvoiceForScheduleRow(soDoc, soItem, row) {
  const effectiveDate = row.dueDate < todayIso() ? todayIso() : row.dueDate;
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
  console.log(`\n=== Convert ${TARGET.studentName} to Basic-8 ===\n`);

  const student = await get(`/api/resource/Student/${encodeURIComponent(TARGET.studentId)}`);
  const pe = await get(`/api/resource/Program Enrollment/${encodeURIComponent(TARGET.programEnrollment)}`);
  const regularSo = await get(`/api/resource/Sales Order/${encodeURIComponent(TARGET.regularSalesOrder)}`);
  const demoInvoice = await get(`/api/resource/Sales Invoice/${encodeURIComponent(TARGET.demoInvoice)}`);
  const existingRegularInvoices = await fetchLinkedInvoices(TARGET.regularSalesOrder);
  const payments = await fetchExistingPayments(TARGET.customer);

  console.log(`Student type: ${student.custom_student_type || "(blank)"}`);
  console.log(`PE category: ${pe.student_category || "(blank)"}`);
  console.log(`Regular SO total: ₹${regularSo.grand_total}`);
  console.log(`Existing regular invoices: ${(existingRegularInvoices || []).length}`);
  console.log(`Demo invoice status: ${demoInvoice.status} | outstanding ₹${demoInvoice.outstanding_amount}`);
  console.log(`Payment entries found: ${(payments || []).length}`);

  if (regularSo.docstatus !== 1) {
    throw new Error(`Regular Sales Order ${regularSo.name} is not submitted`);
  }

  const soItem = regularSo.items?.[0];
  if (!soItem?.name) {
    throw new Error(`Sales Order ${regularSo.name} has no item row`);
  }

  const demoPaidAmount = round2(Number(demoInvoice.grand_total || 0) - Number(demoInvoice.outstanding_amount || 0));
  const adjustedSchedule = buildAdjustedSchedule(demoPaidAmount);
  const adjustedTotal = round2(adjustedSchedule.reduce((sum, row) => sum + row.amount, 0));
  const existingRegularTotal = round2((existingRegularInvoices || []).reduce((sum, row) => sum + Number(row.grand_total || 0), 0));

  console.log(`Demo paid amount to reduce from invoice 1: ₹${demoPaidAmount}`);
  console.log("Adjusted schedule:");
  adjustedSchedule.forEach((row) => {
    const creditNote = row.creditApplied ? ` | credit ₹${row.creditApplied}` : "";
    console.log(`  ${row.label}: ₹${row.amount} | due ${row.dueDate}${creditNote}`);
  });

  if (round2(Number(regularSo.grand_total || 0)) !== adjustedTotal) {
    throw new Error(`Sales Order total ₹${regularSo.grand_total} does not match adjusted schedule total ₹${adjustedTotal}`);
  }

  const hasCompleteRegularSchedule =
    (existingRegularInvoices || []).length === adjustedSchedule.length &&
    existingRegularTotal === adjustedTotal;

  if ((existingRegularInvoices || []).length > 0 && !hasCompleteRegularSchedule) {
    throw new Error(`Regular invoices already exist for ${TARGET.regularSalesOrder}, but schedule is incomplete/mismatched`);
  }

  if (demoPaidAmount <= 0 && demoInvoice.docstatus === 1 && Number(demoInvoice.outstanding_amount || 0) > 0) {
    console.log("\nCancelling unpaid demo invoice...");
    await cancelDoc("Sales Invoice", demoInvoice.name);
  }

  const createdInvoices = [];
  if (hasCompleteRegularSchedule) {
    console.log("\nRegular installment invoices already exist; skipping invoice creation.");
  } else {
    console.log("\nCreating regular installment invoices...");
    for (const row of adjustedSchedule) {
      const invoiceName = await createInvoiceForScheduleRow(regularSo, soItem, row);
      createdInvoices.push(invoiceName);
      console.log(`  Created ${invoiceName} for ${row.label} -> ₹${row.amount}`);
    }
  }

  console.log("\nUpdating Program Enrollment and Student...");
  await patchProgramEnrollmentDirect();

  await setValue("Student", TARGET.studentId, {
    custom_student_type: "Fresher",
  });

  console.log("\nCompleted.");
  console.log(`Created invoices: ${createdInvoices.join(", ")}`);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}`);
  process.exit(1);
});
