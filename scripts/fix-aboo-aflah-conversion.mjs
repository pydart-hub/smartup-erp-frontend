#!/usr/bin/env node
/**
 * Recover ABOO AFLAH (Chullickal) after a broken Demo -> Regular conversion.
 *
 * Current broken state:
 * - Student already marked as Fresher
 * - Regular SO exists: SAL-ORD-2026-01384
 * - No regular invoices exist
 * - Program Enrollment still shows Demo metadata
 * - Old demo invoice is still unpaid
 *
 * Recovery plan:
 * 1. Reuse the existing submitted regular SO
 * 2. Cancel the unpaid demo invoice so dues do not duplicate
 * 3. Create the missing 8 regular invoices
 * 4. Normalize Program Enrollment to Basic / 8 / correct fee structure
 *
 * Dry run:
 *   node scripts/fix-aboo-aflah-conversion.mjs --dry-run
 *
 * Execute:
 *   node scripts/fix-aboo-aflah-conversion.mjs
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
  studentId: "STU-SU CHL-26-167",
  studentName: "ABOO AFLAH",
  customer: "ABOO AFLAH",
  company: "Smart Up Chullickal",
  programEnrollment: "PEN-12sc state-Chullickal 26-27-167",
  program: "12th Science State",
  itemCode: "12th Science State Tuition Fee",
  academicYear: "2026-2027",
  feeStructure: "SU CHL-12th Science State-Basic-8",
  enrollmentDate: "2026-04-29",
  regularSalesOrder: "SAL-ORD-2026-01384",
  demoSalesOrder: "SAL-ORD-2026-00750",
  demoInvoice: "ACC-SINV-2026-06020",
};

const SCHEDULE = [
  { label: "Inst 1", amount: 2500, dueDate: "2026-04-29" },
  { label: "Inst 2", amount: 2500, dueDate: "2026-05-29" },
  { label: "Inst 3", amount: 2500, dueDate: "2026-06-29" },
  { label: "Inst 4", amount: 2500, dueDate: "2026-07-29" },
  { label: "Inst 5", amount: 2500, dueDate: "2026-08-29" },
  { label: "Inst 6", amount: 2500, dueDate: "2026-09-29" },
  { label: "Inst 7", amount: 2500, dueDate: "2026-10-29" },
  { label: "Inst 8", amount: 1500, dueDate: "2026-11-29" },
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
  const scriptName = "patch_pe_aboo_aflah_basic8";
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

async function main() {
  console.log(`\n${"=".repeat(68)}`);
  console.log(`ABOO AFLAH — DEMO TO REGULAR RECOVERY`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`${"=".repeat(68)}\n`);

  const student = await get(`/api/resource/Student/${encodeURIComponent(TARGET.studentId)}`);
  const pe = await get(`/api/resource/Program Enrollment/${encodeURIComponent(TARGET.programEnrollment)}`);
  const regularSo = await get(`/api/resource/Sales Order/${encodeURIComponent(TARGET.regularSalesOrder)}`);
  const demoInvoice = await get(`/api/resource/Sales Invoice/${encodeURIComponent(TARGET.demoInvoice)}`);
  const linkedInvoices = await fetchLinkedInvoices(TARGET.regularSalesOrder);

  console.log(`Student: ${student.student_name} (${student.name})`);
  console.log(`Student type: ${student.custom_student_type}`);
  console.log(`PE state: category="${pe.student_category || ""}" | plan="${pe.custom_plan || ""}" | instalments="${pe.custom_no_of_instalments || ""}"`);
  console.log(`Regular SO: ${regularSo.name} | total ₹${regularSo.grand_total} | billing ${regularSo.billing_status}`);
  console.log(`Demo invoice: ${demoInvoice.name} | total ₹${demoInvoice.grand_total} | outstanding ₹${demoInvoice.outstanding_amount} | status=${demoInvoice.status}`);
  console.log(`Existing linked regular invoices: ${(linkedInvoices || []).length}\n`);

  if (student.customer !== TARGET.customer) throw new Error(`Unexpected customer: ${student.customer}`);
  if (student.custom_branch !== TARGET.company) throw new Error(`Unexpected branch: ${student.custom_branch}`);
  if (student.custom_student_type !== "Fresher") throw new Error(`Student type is not Fresher: ${student.custom_student_type}`);
  if (pe.program !== TARGET.program) throw new Error(`Unexpected PE program: ${pe.program}`);
  if (Number(regularSo.grand_total ?? 0) !== EXPECTED_TOTAL) {
    throw new Error(`Regular SO total mismatch: expected ₹${EXPECTED_TOTAL}, got ₹${regularSo.grand_total}`);
  }
  if (regularSo.docstatus !== 1) throw new Error(`Regular SO is not submitted (docstatus=${regularSo.docstatus})`);

  if ((linkedInvoices || []).length > 0) {
    const total = (linkedInvoices || []).reduce((sum, row) => sum + Number(row.grand_total || 0), 0);
    if ((linkedInvoices || []).length === SCHEDULE.length && Math.abs(total - EXPECTED_TOTAL) < 0.01) {
      console.log("Regular invoices already exist with the expected total. Only normalizing PE state...");
      const patched = await patchProgramEnrollment();
      console.log(`PE normalized: plan=${patched.custom_plan}, instalments=${patched.custom_no_of_instalments}, category="${patched.student_category}"`);
      return;
    }
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
    const effectiveDate = effectiveInvoiceDate(row.dueDate);
    const invoicePayload = {
      doctype: "Sales Invoice",
      customer: TARGET.customer,
      company: TARGET.company,
      posting_date: effectiveDate,
      due_date: effectiveDate,
      student: TARGET.studentId,
      custom_academic_year: TARGET.academicYear,
      disable_rounded_total: 1,
      items: [
        {
          item_code: TARGET.itemCode,
          item_name: TARGET.itemCode,
          description: `${row.label} - ${TARGET.itemCode}`,
          qty: 1,
          rate: row.amount,
          amount: row.amount,
          sales_order: regularSo.name,
          so_detail: soItem.name,
        },
      ],
    };

    const invoice = await createDoc("Sales Invoice", invoicePayload);
    createdInvoices.push({ name: invoice.name, ...row, effectiveDate });
    console.log(`  Created ${invoice.name} | ${row.label} | ₹${row.amount} | due ${effectiveDate}`);
    await submitDoc("Sales Invoice", invoice.name);
  }

  console.log("\nNormalizing Program Enrollment...");
  const patched = await patchProgramEnrollment();
  console.log(`  PE normalized: plan=${patched.custom_plan}, instalments=${patched.custom_no_of_instalments}, category="${patched.student_category}"`);

  console.log(`\n${"=".repeat(68)}`);
  console.log(`DONE — ${createdInvoices.length} regular invoice(s) prepared`);
  for (const invoice of createdInvoices) {
    console.log(`  ${invoice.name} | ${invoice.label} | ₹${invoice.amount} | due ${invoice.effectiveDate}`);
  }
  console.log(`${"=".repeat(68)}\n`);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}`);
  process.exit(1);
});
