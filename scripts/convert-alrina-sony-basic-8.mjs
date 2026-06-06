#!/usr/bin/env node
/**
 * Convert ALRINA SONY (Chullickal) from Demo billing to Basic 8-installment plan.
 *
 * Strategy:
 * - Keep the original demo invoice/payment as historical proof of the ₹499 already paid.
 * - Create a new regular Sales Order for the remaining ₹18,501.
 * - Create 8 linked Sales Invoices with the adjusted schedule:
 *     ₹2,500 × 7 and ₹1,001 × 1
 *   where the last invoice is reduced by the demo-paid ₹499 credit.
 * - Update the submitted Program Enrollment in-place via frappe.client.set_value.
 *
 * Dry run:
 *   node scripts/convert-alrina-sony-basic-8.mjs --dry-run
 *
 * Execute:
 *   node scripts/convert-alrina-sony-basic-8.mjs
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

const STUDENT_ID = "STU-SU CHL-26-181";
const STUDENT_NAME = "ALRINA SONY";
const CUSTOMER = "Alrina Sony";
const COMPANY = "Smart Up Chullickal";
const PROGRAM_ENROLLMENT = "PEN-12sc state-Chullickal 26-27-181";
const PROGRAM = "12th Science State";
const ITEM_CODE = "12th Science State Tuition Fee";
const ACADEMIC_YEAR = "2026-2027";
const FEE_STRUCTURE = "SU CHL-12th Science State-Basic-8";
const ENROLLMENT_DATE = "2026-05-04";
const EXISTING_INVOICE = "ACC-SINV-2026-06339";
const EXISTING_PAYMENT = "ACC-PAY-2026-05407";
const DEMO_PAID = 499;

const SCHEDULE = [
  { label: "Inst 1", amount: 2500, dueDate: "2026-05-04" },
  { label: "Inst 2", amount: 2500, dueDate: "2026-06-04" },
  { label: "Inst 3", amount: 2500, dueDate: "2026-07-04" },
  { label: "Inst 4", amount: 2500, dueDate: "2026-08-04" },
  { label: "Inst 5", amount: 2500, dueDate: "2026-09-04" },
  { label: "Inst 6", amount: 2500, dueDate: "2026-10-04" },
  { label: "Inst 7", amount: 2500, dueDate: "2026-11-04" },
  { label: "Inst 8", amount: 1001, dueDate: "2026-12-04", creditApplied: 499 },
];

const TOTAL_AFTER_CREDIT = SCHEDULE.reduce((sum, row) => sum + row.amount, 0);
const SO_QTY = 8;
const SO_RATE = TOTAL_AFTER_CREDIT / SO_QTY;

if (TOTAL_AFTER_CREDIT !== 18501) {
  throw new Error(`Adjusted total must be 18501, got ${TOTAL_AFTER_CREDIT}`);
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function effectiveInvoiceDate(dueDate) {
  const today = todayIso();
  return dueDate < today ? today : dueDate;
}

async function setValue(doctype, name, fieldname) {
  if (DRY_RUN) {
    console.log(`  [DRY] set_value ${doctype}/${name}`, fieldname);
    return null;
  }
  return post("/api/method/frappe.client.set_value", { doctype, name, fieldname });
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
  const response = await fetch(`${BASE}/api/resource/Server Script/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: AUTH_HEADERS,
  });
  if (!response.ok && response.status !== 404) {
    const text = await response.text().catch(() => "");
    throw new Error(`DELETE Server Script/${name} failed: ${text.slice(0, 400)}`);
  }
}

async function patchSalesOrderTotal(soName, targetTotal) {
  if (DRY_RUN) {
    console.log(`  [DRY] patch SO ${soName} grand total -> ₹${targetTotal}`);
    return;
  }

  const scriptName = `patch_so_${soName.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const scriptCode = `
so = "${soName}"
v = ${targetTotal}
item = frappe.db.get_value("Sales Order Item", {"parent": so}, "name")
if item:
    frappe.db.set_value("Sales Order Item", item, "amount", v, update_modified=False)
    frappe.db.set_value("Sales Order Item", item, "base_amount", v, update_modified=False)
for f in ["grand_total","net_total","total","base_grand_total","base_net_total","base_total"]:
    frappe.db.set_value("Sales Order", so, f, v, update_modified=False)
frappe.db.commit()
frappe.response["message"] = {"patched": True, "grand_total": frappe.db.get_value("Sales Order", so, "grand_total")}
`;

  const result = await runServerScript(scriptName, scriptCode);
  if (!result?.patched) {
    throw new Error(`SO patch did not confirm success: ${JSON.stringify(result).slice(0, 200)}`);
  }
}

async function findReusableSalesOrder() {
  const rows = await get(
    `/api/resource/Sales Order?filters=${encodeURIComponent(JSON.stringify([
      ["student", "=", STUDENT_ID],
      ["custom_plan", "=", "Basic"],
      ["custom_no_of_instalments", "=", "8"],
      ["docstatus", "=", 1],
    ]))}&fields=${encodeURIComponent(JSON.stringify([
      "name",
      "grand_total",
      "billing_status",
      "creation",
    ]))}&order_by=creation desc&limit_page_length=10`
  );

  for (const row of rows ?? []) {
    if (Math.abs(Number(row.grand_total ?? 0) - TOTAL_AFTER_CREDIT) > 1) continue;
    const linkedInvoices = await get(
      `/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([
        ["Sales Invoice Item", "sales_order", "=", row.name],
      ]))}&fields=${encodeURIComponent(JSON.stringify(["name"]))}&limit_page_length=2`
    );
    if ((linkedInvoices ?? []).length === 0) {
      return row;
    }
  }

  return null;
}

async function detectExistingCompletedConversion() {
  const rows = await get(
    `/api/resource/Sales Order?filters=${encodeURIComponent(JSON.stringify([
      ["student", "=", STUDENT_ID],
      ["custom_plan", "=", "Basic"],
      ["custom_no_of_instalments", "=", "8"],
      ["docstatus", "=", 1],
    ]))}&fields=${encodeURIComponent(JSON.stringify(["name"]))}&order_by=creation desc&limit_page_length=10`
  );

  for (const row of rows ?? []) {
    const invoices = await get(
      `/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([
        ["Sales Invoice Item", "sales_order", "=", row.name],
        ["docstatus", "=", 1],
      ]))}&fields=${encodeURIComponent(JSON.stringify(["name", "grand_total"]))}&limit_page_length=20`
    );
    const total = (invoices ?? []).reduce((sum, inv) => sum + Number(inv.grand_total ?? 0), 0);
    if ((invoices ?? []).length === 8 && total === TOTAL_AFTER_CREDIT) {
      return { salesOrder: row.name, invoices };
    }
  }

  return null;
}

async function patchProgramEnrollment() {
  const scriptName = "patch_pe_alrina_sony_basic8";
  const script = `
pe = "${PROGRAM_ENROLLMENT}"
frappe.db.set_value("Program Enrollment", pe, "custom_plan", "Basic", update_modified=False)
frappe.db.set_value("Program Enrollment", pe, "custom_no_of_instalments", "8", update_modified=False)
frappe.db.set_value("Program Enrollment", pe, "custom_fee_structure", "${FEE_STRUCTURE}", update_modified=False)
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

async function main() {
  console.log("=================================================================");
  console.log("ALRINA SONY - Demo -> Basic 8 Installments");
  console.log("=================================================================\n");

  console.log(`[${DRY_RUN ? "DRY RUN" : "VERIFY"}] Checking live state...`);

  const student = await get(`/api/resource/Student/${encodeURIComponent(STUDENT_ID)}`);
  const enrollment = await get(`/api/resource/Program Enrollment/${encodeURIComponent(PROGRAM_ENROLLMENT)}`);
  const oldInvoice = await get(`/api/resource/Sales Invoice/${encodeURIComponent(EXISTING_INVOICE)}`);
  const oldPayment = await get(`/api/resource/Payment Entry/${encodeURIComponent(EXISTING_PAYMENT)}`);
  const feeStructure = await get(`/api/resource/Fee Structure/${encodeURIComponent(FEE_STRUCTURE)}`);

  if (student.customer !== CUSTOMER) throw new Error(`Unexpected customer on Student: ${student.customer}`);
  if (student.custom_branch !== COMPANY) throw new Error(`Unexpected branch on Student: ${student.custom_branch}`);
  if (enrollment.program !== PROGRAM) throw new Error(`Unexpected program on PE: ${enrollment.program}`);
  if (oldInvoice.grand_total !== 499 || oldInvoice.outstanding_amount !== 0) {
    throw new Error(`Unexpected demo invoice state: total=${oldInvoice.grand_total}, outstanding=${oldInvoice.outstanding_amount}`);
  }
  if (oldPayment.paid_amount !== DEMO_PAID) throw new Error(`Unexpected demo payment amount: ${oldPayment.paid_amount}`);
  if (feeStructure.total_amount !== 19000) throw new Error(`Unexpected fee structure total: ${feeStructure.total_amount}`);

  console.log(`  Student: ${student.student_name} (${student.name})`);
  console.log(`  Student type: ${student.custom_student_type}`);
  console.log(`  Enrollment: ${enrollment.name} | category=${enrollment.student_category || "(blank)"} | plan=${enrollment.custom_plan || "(blank)"}`);
  console.log(`  Demo invoice kept as history: ${oldInvoice.name} | ₹${oldInvoice.grand_total} | status=${oldInvoice.status}`);
  console.log(`  Demo payment kept as history: ${oldPayment.name} | ₹${oldPayment.paid_amount} | mode=${oldPayment.mode_of_payment}`);
  console.log(`  Target fee structure: ${feeStructure.name} | ₹${feeStructure.total_amount}`);
  console.log(`  New adjusted total after demo credit: ₹${TOTAL_AFTER_CREDIT}\n`);

  console.log("New schedule to create:");
  for (const row of SCHEDULE) {
    const note = row.creditApplied ? ` (includes demo credit -₹${row.creditApplied})` : "";
    console.log(`  ${row.label}: ₹${row.amount} | due ${row.dueDate}${note}`);
  }
  console.log("");

  if (!DRY_RUN) {
    const completed = await detectExistingCompletedConversion();
    if (completed) {
      console.log(`[SKIP] Conversion already exists on SO ${completed.salesOrder}`);
      console.log(`  Found ${completed.invoices.length} submitted invoices totaling ₹${TOTAL_AFTER_CREDIT}`);
      const patched = await patchProgramEnrollment();
      console.log(`  PE normalized: plan=${patched.custom_plan} | instalments=${patched.custom_no_of_instalments}`);
      console.log("\n=================================================================");
      console.log("DONE");
      console.log("=================================================================");
      return;
    }
  }

  console.log(`[${DRY_RUN ? "DRY RUN" : "STEP 1"}] Preparing Sales Order...`);
  let so;
  if (!DRY_RUN) {
    const reusable = await findReusableSalesOrder();
    if (reusable) {
      so = { name: reusable.name };
      console.log(`  Reusing existing submitted SO: ${so.name}`);
      await patchSalesOrderTotal(so.name, TOTAL_AFTER_CREDIT);
      console.log(`  Re-patched SO total to ₹${TOTAL_AFTER_CREDIT}`);
    }
  }

  if (!so) {
    const soPayload = {
      doctype: "Sales Order",
      customer: CUSTOMER,
      company: COMPANY,
      transaction_date: ENROLLMENT_DATE,
      delivery_date: ENROLLMENT_DATE,
      order_type: "Sales",
      custom_academic_year: ACADEMIC_YEAR,
      student: STUDENT_ID,
      custom_plan: "Basic",
      custom_no_of_instalments: "8",
      items: [
        {
          item_code: ITEM_CODE,
          item_name: ITEM_CODE,
          description: "Regular admission - demo credit adjusted in instalment 8",
          qty: SO_QTY,
          rate: SO_RATE,
          amount: TOTAL_AFTER_CREDIT,
          delivery_date: ENROLLMENT_DATE,
        },
      ],
    };

    so = await createDoc("Sales Order", soPayload);
    console.log(`  Sales Order created: ${so.name}`);

    if (!DRY_RUN) {
      const rawSo = await get(`/api/resource/Sales Order/${encodeURIComponent(so.name)}`);
      const rawTotal = Number(rawSo.grand_total ?? 0);
      if (Math.abs(rawTotal - TOTAL_AFTER_CREDIT) > 0.005) {
        console.log(`  SO total mismatch detected (${rawTotal}) -> patching to ₹${TOTAL_AFTER_CREDIT}`);
        await patchSalesOrderTotal(so.name, TOTAL_AFTER_CREDIT);
      }
    }

    await submitDoc("Sales Order", so.name);
    console.log(`  Sales Order submitted: ${so.name}`);
  }
  console.log("");

  let soItemName = "DRY-SO-ITEM";
  if (!DRY_RUN) {
    const submittedSo = await get(`/api/resource/Sales Order/${encodeURIComponent(so.name)}`);
    if (!submittedSo.items?.length) throw new Error("Submitted SO has no items");
    soItemName = submittedSo.items[0].name;
  }

  console.log(`[${DRY_RUN ? "DRY RUN" : "STEP 2"}] Creating 8 Sales Invoices...`);
  const createdInvoices = [];
  for (const row of SCHEDULE) {
    const description = row.creditApplied
      ? `${row.label} - ${ITEM_CODE} | Demo conversion credit -₹${row.creditApplied}`
      : `${row.label} - ${ITEM_CODE}`;
    const invoiceDate = effectiveInvoiceDate(row.dueDate);

    const invoicePayload = {
      doctype: "Sales Invoice",
      customer: CUSTOMER,
      company: COMPANY,
      posting_date: invoiceDate,
      due_date: invoiceDate,
      student: STUDENT_ID,
      custom_academic_year: ACADEMIC_YEAR,
      disable_rounded_total: 1,
      items: [
        {
          item_code: ITEM_CODE,
          item_name: ITEM_CODE,
          description,
          qty: 1,
          rate: row.amount,
          amount: row.amount,
          sales_order: so.name,
          so_detail: soItemName,
        },
      ],
    };

    const invoice = await createDoc("Sales Invoice", invoicePayload);
    createdInvoices.push({ name: invoice.name, ...row });
    console.log(`  Invoice created: ${invoice.name} | ${row.label} | ₹${row.amount} | due ${invoiceDate}`);
    await submitDoc("Sales Invoice", invoice.name);
  }
  console.log("");

  console.log(`[${DRY_RUN ? "DRY RUN" : "STEP 3"}] Updating Program Enrollment...`);
  try {
    await setValue("Program Enrollment", PROGRAM_ENROLLMENT, {
      custom_plan: "Basic",
      custom_no_of_instalments: "8",
      custom_fee_structure: FEE_STRUCTURE,
      student_category: "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("UpdateAfterSubmitError")) throw error;
    console.log("  Standard PE update blocked after submission - using admin patch path");
    await patchProgramEnrollment();
  }
  console.log(`  Program Enrollment updated: ${PROGRAM_ENROLLMENT}\n`);

  if (!DRY_RUN) {
    console.log("[VERIFY] Fetching final state...");
    const finalPE = await get(`/api/resource/Program Enrollment/${encodeURIComponent(PROGRAM_ENROLLMENT)}`);
    const invList = await get(
      `/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([["Sales Invoice Item", "sales_order", "=", so.name], ["docstatus", "=", 1]]))}&fields=${encodeURIComponent(JSON.stringify(["name", "grand_total", "outstanding_amount", "due_date", "status"]))}&order_by=due_date asc&limit_page_length=20`
    );
    const totalInvoices = (invList ?? []).reduce((sum, inv) => sum + Number(inv.grand_total ?? 0), 0);

    console.log(`  Final PE plan: ${finalPE.custom_plan} | instalments=${finalPE.custom_no_of_instalments} | fee_structure=${finalPE.custom_fee_structure}`);
    console.log(`  Final PE category: ${finalPE.student_category || "(blank)"}`);
    console.log(`  New SO: ${so.name}`);
    console.log(`  New invoices total: ₹${totalInvoices}`);
    for (const inv of invList ?? []) {
      console.log(`    ${inv.name}: ₹${inv.grand_total} | outstanding ₹${inv.outstanding_amount} | due ${inv.due_date} | ${inv.status}`);
    }
  }

  console.log("\n=================================================================");
  console.log(`${DRY_RUN ? "[DRY RUN] " : ""}DONE`);
  console.log("=================================================================");
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}`);
  process.exit(1);
});
