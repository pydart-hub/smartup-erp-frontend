#!/usr/bin/env node
/**
 * Recreate one-time billing for Fidha Fathima after the original Sales Order
 * and Sales Invoice were deleted.
 *
 * Default behavior:
 * - Verifies student + latest Program Enrollment
 * - Aborts if any active Sales Order / Sales Invoice already exists
 * - Optionally syncs Program Enrollment and Student instalment metadata to "1"
 * - Creates and submits:
 *   1. Sales Order  (qty=1, rate=15485)
 *   2. Sales Invoice (qty=1, rate=15485, linked via sales_order + so_detail)
 *
 * Usage:
 *   node scripts/recreate-fidha-fathima-one-time-billing.mjs --dry-run
 *   node scripts/recreate-fidha-fathima-one-time-billing.mjs
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

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

const TARGET = {
  studentId: "STU-SU PLR-26-156",
  studentName: "Fidha Fathima",
  company: "Smart Up Palluruthy",
  amount: 15485,
  targetInstalments: "1",
  syncMetadataToOneTime: true,
  abortIfActiveBillingExists: true,
  note: "Manual one-time billing recreated after prior Sales Order and Sales Invoice deletion",
};

const TARGET_CONFIG = {
  ...TARGET,
  studentId: getArgValue("--student-id") || TARGET.studentId,
  studentName: getArgValue("--student-name") || TARGET.studentName,
  company: getArgValue("--company") || TARGET.company,
  amount: Number(getArgValue("--amount") || TARGET.amount),
};
const REPLACE_EXISTING = process.argv.includes("--replace-existing");

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
    throw new Error(`${method} ${path} -> ${response.status}: ${text.slice(0, 600)}`);
  }

  return json.data ?? json.message ?? json;
}

const get = (path) => api("GET", path);
const post = (path, body) => api("POST", path, body);
const put = (path, body) => api("PUT", path, body);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function effectiveDate(value) {
  const today = todayIso();
  return !value || value < today ? today : value;
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

async function cancelDoc(doctype, name) {
  if (DRY_RUN) {
    console.log(`  [DRY] cancel ${doctype}/${name}`);
    return null;
  }
  return put(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { docstatus: 2 });
}

async function setValue(doctype, name, fieldname) {
  if (DRY_RUN) {
    console.log(`  [DRY] set_value ${doctype}/${name}`, fieldname);
    return null;
  }
  return post("/api/method/frappe.client.set_value", { doctype, name, fieldname });
}

async function deleteServerScriptIfExists(name) {
  const response = await fetch(`${BASE}/api/resource/Server Script/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: AUTH_HEADERS,
  });
  if (!response.ok && response.status !== 404) {
    const text = await response.text().catch(() => "");
    throw new Error(`DELETE Server Script/${name} failed: ${text.slice(0, 300)}`);
  }
}

async function runServerScript(scriptName, script) {
  if (DRY_RUN) {
    console.log(`  [DRY] run server script ${scriptName}`);
    return { updated: true };
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

async function findLatestProgramEnrollment(studentId) {
  const fields = encodeURIComponent(JSON.stringify([
    "name",
    "student",
    "student_name",
    "program",
    "academic_year",
    "enrollment_date",
    "custom_plan",
    "custom_no_of_instalments",
    "docstatus",
  ]));
  const filters = encodeURIComponent(JSON.stringify([["student", "=", studentId]]));
  const rows = await get(
    `/api/resource/Program Enrollment?filters=${filters}&fields=${fields}&order_by=enrollment_date desc,creation desc&limit_page_length=5`
  );
  return rows?.[0] ?? null;
}

async function findTuitionItem(program) {
  const itemFields = encodeURIComponent(JSON.stringify(["item_code", "item_name", "name"]));
  const exactFilters = encodeURIComponent(JSON.stringify([
    ["item_code", "=", `${program} Tuition Fee`],
    ["is_sales_item", "=", 1],
    ["disabled", "=", 0],
  ]));
  const exact = await get(`/api/resource/Item?filters=${exactFilters}&fields=${itemFields}&limit_page_length=1`);
  if (exact?.[0]?.item_code) return exact[0];

  const likeFilters = encodeURIComponent(JSON.stringify([
    ["item_code", "like", `${program}%Tuition Fee`],
    ["is_sales_item", "=", 1],
    ["disabled", "=", 0],
  ]));
  const like = await get(`/api/resource/Item?filters=${likeFilters}&fields=${itemFields}&limit_page_length=10`);
  return like?.[0] ?? null;
}

async function activeSalesOrders(studentId) {
  const fields = encodeURIComponent(JSON.stringify([
    "name",
    "customer",
    "grand_total",
    "docstatus",
    "status",
    "creation",
    "custom_no_of_instalments",
    "custom_plan",
  ]));
  const filters = encodeURIComponent(JSON.stringify([
    ["student", "=", studentId],
    ["docstatus", "!=", 2],
  ]));
  return get(`/api/resource/Sales Order?filters=${filters}&fields=${fields}&order_by=creation desc&limit_page_length=20`);
}

async function activeSalesInvoices(studentId) {
  const fields = encodeURIComponent(JSON.stringify([
    "name",
    "customer",
    "grand_total",
    "outstanding_amount",
    "docstatus",
    "status",
    "creation",
  ]));
  const filters = encodeURIComponent(JSON.stringify([
    ["student", "=", studentId],
    ["docstatus", "!=", 2],
  ]));
  return get(`/api/resource/Sales Invoice?filters=${filters}&fields=${fields}&order_by=creation desc&limit_page_length=20`);
}

async function invoicesLinkedToSalesOrder(salesOrderName) {
  const fields = encodeURIComponent(JSON.stringify([
    "name",
    "customer",
    "grand_total",
    "outstanding_amount",
    "docstatus",
    "status",
    "posting_date",
    "due_date",
    "creation",
  ]));
  const filters = encodeURIComponent(JSON.stringify([
    ["Sales Invoice Item", "sales_order", "=", salesOrderName],
  ]));
  return get(`/api/resource/Sales Invoice?filters=${filters}&fields=${fields}&order_by=creation desc&limit_page_length=50`);
}

async function patchProgramEnrollmentToOneTime(programEnrollmentName, plan) {
  const scriptName = `sync_pe_${programEnrollmentName.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const script = `
pe = "${programEnrollmentName}"
frappe.db.set_value("Program Enrollment", pe, "custom_no_of_instalments", "1", update_modified=False)
frappe.db.set_value("Program Enrollment", pe, "custom_plan", "${String(plan || "").replace(/"/g, '\\"')}", update_modified=False)
frappe.db.commit()
frappe.response["message"] = {"updated": True, "pe": pe}
`;
  const result = await runServerScript(scriptName, script);
  if (!result?.updated) {
    throw new Error(`Program Enrollment sync failed: ${JSON.stringify(result).slice(0, 200)}`);
  }
}

async function main() {
  console.log("========================================");
  console.log(" Fidha Fathima One-Time Billing Repair");
  console.log("========================================");
  console.log(` Student : ${TARGET_CONFIG.studentId}`);
  console.log(` Amount  : Rs.${TARGET_CONFIG.amount.toLocaleString("en-IN")}`);
  console.log(` Company : ${TARGET_CONFIG.company}`);
  console.log(` Dry run : ${DRY_RUN ? "yes" : "no"}`);
  console.log(` Replace : ${REPLACE_EXISTING ? "yes" : "no"}`);
  console.log("");

  console.log("[1/7] Fetching student...");
  const student = await get(`/api/resource/Student/${encodeURIComponent(TARGET_CONFIG.studentId)}`);
  if (!student?.name) {
    throw new Error(`Student not found: ${TARGET_CONFIG.studentId}`);
  }
  const customer = student.customer || student.student_name;
  console.log(`  Student  : ${student.student_name}`);
  console.log(`  Customer : ${customer}`);
  if (TARGET_CONFIG.studentName && student.student_name !== TARGET_CONFIG.studentName) {
    throw new Error(`Student name mismatch. Expected "${TARGET_CONFIG.studentName}", found "${student.student_name}"`);
  }

  console.log("\n[2/7] Fetching latest Program Enrollment...");
  const enrollment = await findLatestProgramEnrollment(TARGET_CONFIG.studentId);
  if (!enrollment?.name) {
    throw new Error(`No Program Enrollment found for ${TARGET_CONFIG.studentId}`);
  }
  console.log(`  PE       : ${enrollment.name}`);
  console.log(`  Program  : ${enrollment.program}`);
  console.log(`  AY       : ${enrollment.academic_year}`);
  console.log(`  Plan     : ${enrollment.custom_plan || "-"}`);
  console.log(`  Inst     : ${enrollment.custom_no_of_instalments || "-"}`);

  console.log("\n[3/7] Checking existing active billing...");
  const [existingOrders, existingInvoices] = await Promise.all([
    activeSalesOrders(TARGET_CONFIG.studentId),
    activeSalesInvoices(TARGET_CONFIG.studentId),
  ]);
  console.log(`  Active SOs : ${existingOrders.length}`);
  console.log(`  Active SIs : ${existingInvoices.length}`);

  if (!REPLACE_EXISTING && TARGET.abortIfActiveBillingExists && (existingOrders.length > 0 || existingInvoices.length > 0)) {
    throw new Error(
      `Active billing already exists for ${TARGET_CONFIG.studentId}. ` +
      `Orders: ${existingOrders.map((row) => row.name).join(", ") || "none"} | ` +
      `Invoices: ${existingInvoices.map((row) => row.name).join(", ") || "none"}`
    );
  }

  if (REPLACE_EXISTING && existingInvoices.length > 0) {
    const peFields = encodeURIComponent(JSON.stringify([
      "name",
      "paid_amount",
      "unallocated_amount",
      "docstatus",
      "posting_date",
      "reference_no",
      "mode_of_payment",
      "creation",
    ]));
    const peFilters = encodeURIComponent(JSON.stringify([
      ["party", "=", customer],
      ["docstatus", "!=", 2],
    ]));
    const payments = await get(`/api/resource/Payment Entry?filters=${peFilters}&fields=${peFields}&order_by=creation desc&limit_page_length=20`);
    if (payments.length > 0) {
      throw new Error(
        `Cannot replace existing billing because Payment Entries exist for ${customer}: ${payments.map((row) => row.name).join(", ")}`
      );
    }
  }

  console.log("\n[4/7] Resolving tuition item...");
  const item = await findTuitionItem(enrollment.program);
  if (!item?.item_code) {
    throw new Error(`No tuition fee item found for program "${enrollment.program}"`);
  }
  console.log(`  Item     : ${item.item_code}`);

  if (REPLACE_EXISTING) {
    console.log("\n[4a/7] Cancelling existing invoices and sales orders...");
    const invoicesByName = new Map(existingInvoices.map((row) => [row.name, row]));
    for (const so of existingOrders) {
      const linked = await invoicesLinkedToSalesOrder(so.name);
      for (const inv of linked) {
        if (inv.docstatus === 2) continue;
        invoicesByName.set(inv.name, inv);
      }
    }
    const allInvoicesToCancel = [...invoicesByName.values()].sort((a, b) => String(b.creation).localeCompare(String(a.creation)));
    for (const inv of allInvoicesToCancel) {
      if (inv.docstatus === 2) continue;
      await cancelDoc("Sales Invoice", inv.name);
      console.log(`  Cancelled SI : ${inv.name}`);
    }
    for (const so of existingOrders.sort((a, b) => String(b.creation).localeCompare(String(a.creation)))) {
      await cancelDoc("Sales Order", so.name);
      console.log(`  Cancelled SO : ${so.name}`);
    }
  }

  if (TARGET.syncMetadataToOneTime) {
    console.log("\n[5/7] Syncing instalment metadata to one-time...");
    await patchProgramEnrollmentToOneTime(enrollment.name, enrollment.custom_plan || "");
    await setValue("Student", TARGET_CONFIG.studentId, {
      custom_no_of_instalments: TARGET.targetInstalments,
      custom_plan: enrollment.custom_plan || undefined,
    });
    console.log("  Metadata synced to 1-instalment");
  } else {
    console.log("\n[5/7] Metadata sync skipped by configuration.");
  }

  const transactionDate = effectiveDate(enrollment.enrollment_date);
  const academicYear = enrollment.academic_year || "2026-2027";

  console.log("\n[6/7] Creating Sales Order...");
  const soPayload = {
    customer,
    company: TARGET_CONFIG.company,
    transaction_date: transactionDate,
    delivery_date: transactionDate,
    order_type: "Sales",
    items: [{
      item_code: item.item_code,
      qty: 1,
      rate: TARGET_CONFIG.amount,
      description: TARGET.note,
    }],
    custom_academic_year: academicYear,
    student: TARGET_CONFIG.studentId,
    custom_no_of_instalments: TARGET.targetInstalments,
    custom_plan: enrollment.custom_plan || undefined,
  };

  const createdSo = await createDoc("Sales Order", soPayload);
  const salesOrderName = createdSo.name;
  console.log(`  SO created : ${salesOrderName}`);

  await submitDoc("Sales Order", salesOrderName);
  console.log(`  SO submit  : ${salesOrderName}`);

  if (!DRY_RUN) {
    for (let i = 0; i < 8; i++) {
      await sleep(600);
      const ready = await get(
        `/api/resource/Sales Order/${encodeURIComponent(salesOrderName)}?fields=${encodeURIComponent(JSON.stringify(["billing_status", "docstatus"]))}`
      );
      if (ready?.billing_status === "Not Billed" && ready?.docstatus === 1) break;
    }
  }

  const soDoc = DRY_RUN
    ? { items: [{ name: "DRY-SO-ITEM", item_code: item.item_code, item_name: item.item_name || item.item_code }] }
    : await get(`/api/resource/Sales Order/${encodeURIComponent(salesOrderName)}`);
  const soItem = soDoc?.items?.[0];
  if (!soItem?.name) {
    throw new Error(`Could not load Sales Order item row for ${salesOrderName}`);
  }

  console.log("\n[7/7] Creating linked Sales Invoice...");
  const invoiceDate = transactionDate;
  const invoicePayload = {
    doctype: "Sales Invoice",
    customer,
    company: TARGET_CONFIG.company,
    posting_date: invoiceDate,
    due_date: invoiceDate,
    student: TARGET_CONFIG.studentId,
    custom_academic_year: academicYear,
    items: [{
      item_code: soItem.item_code,
      item_name: soItem.item_name,
      description: `One-time fee - ${TARGET.note}`,
      qty: 1,
      rate: TARGET_CONFIG.amount,
      amount: TARGET_CONFIG.amount,
      sales_order: salesOrderName,
      so_detail: soItem.name,
    }],
  };

  const createdInvoice = await createDoc("Sales Invoice", invoicePayload);
  const salesInvoiceName = createdInvoice.name;
  console.log(`  SI created : ${salesInvoiceName}`);

  await submitDoc("Sales Invoice", salesInvoiceName);
  console.log(`  SI submit  : ${salesInvoiceName}`);

  console.log("\n----------------------------------------");
  console.log("Completed");
  console.log("----------------------------------------");
  console.log(` Sales Order  : ${salesOrderName}`);
  console.log(` Sales Invoice: ${salesInvoiceName}`);
  console.log(` Amount       : Rs.${TARGET_CONFIG.amount.toLocaleString("en-IN")}`);
  console.log(` Mode         : One-time`);
  console.log("----------------------------------------");
}

main().catch((error) => {
  console.error("\nFatal error:", error.message || error);
  process.exit(1);
});
