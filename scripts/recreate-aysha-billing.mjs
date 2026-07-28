#!/usr/bin/env node
/**
 * scripts/recreate-aysha-billing.mjs
 * 
 * Repairs billing for student AYSHA SANAM S (STU-SU CHL-26-275)
 * by creating and submitting the missing Sales Order and 8 Sales Invoices.
 * 
 * Default: --dry-run
 * Run live: node scripts/recreate-aysha-billing.mjs --live
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const BASE = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;
const LIVE = process.argv.includes("--live");

if (!BASE || !API_KEY || !API_SECRET) {
  throw new Error("Missing NEXT_PUBLIC_FRAPPE_URL / FRAPPE_API_KEY / FRAPPE_API_SECRET in environment");
}

const AUTH_HEADERS = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  "Content-Type": "application/json",
};

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

async function main() {
  console.log("=================================================");
  console.log(" AYSHA SANAM S Billing Re-creation & Repair Script");
  console.log("=================================================");
  console.log(` Mode: ${LIVE ? "LIVE (Writing to ERP)" : "DRY-RUN (Safe Read-Only)"}`);
  console.log(` Base URL: ${BASE}`);
  console.log("-------------------------------------------------");

  const STUDENT_ID = "STU-SU CHL-26-275";
  const CUSTOMER_NAME = "AYSHA SANAM S";
  const COMPANY = "Smart Up Chullickal";
  const PROGRAM = "12th Science State";
  const PLAN = "Basic";
  const INSTALMENTS = "8";
  const ACADEMIC_YEAR = "2026-2027";
  const ENROLLMENT_DATE = "2026-06-22";
  const ITEM_CODE = "12th Science State Tuition Fee";

  // Validate student
  console.log("1. Fetching Student record...");
  const student = await get(`/api/resource/Student/${encodeURIComponent(STUDENT_ID)}`);
  console.log(`   Found: ${student.student_name} | Customer: ${student.customer}`);
  if (student.customer !== CUSTOMER_NAME) {
    throw new Error(`Customer mismatch. Expected "${CUSTOMER_NAME}", found "${student.customer}"`);
  }

  // Validate program enrollment
  console.log("\n2. Fetching Program Enrollment...");
  const peList = await get(
    `/api/resource/Program Enrollment?filters=${encodeURIComponent(JSON.stringify([
      ["student", "=", STUDENT_ID],
      ["docstatus", "=", 1]
    ]))}&fields=${encodeURIComponent(JSON.stringify([
      "name", "program", "academic_year", "custom_plan", "custom_no_of_instalments", "custom_fee_structure"
    ]))}`
  );
  if (!peList?.length) {
    throw new Error(`No submitted Program Enrollment found for ${STUDENT_ID}`);
  }
  const pe = peList[0];
  console.log(`   Found PE: ${pe.name} | Program: ${pe.program} | Plan: ${pe.custom_plan} | Inst: ${pe.custom_no_of_instalments}`);

  // Validate no existing active Sales Orders or Invoices
  console.log("\n3. Checking for existing active Sales Orders or Invoices...");
  const activeSOs = await get(
    `/api/resource/Sales Order?filters=${encodeURIComponent(JSON.stringify([
      ["student", "=", STUDENT_ID],
      ["docstatus", "!=", 2]
    ]))}`
  );
  const activeSIs = await get(
    `/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([
      ["student", "=", STUDENT_ID],
      ["docstatus", "!=", 2]
    ]))}`
  );

  console.log(`   Active Sales Orders found: ${activeSOs.length}`);
  console.log(`   Active Sales Invoices found: ${activeSIs.length}`);

  let soName;
  if (activeSOs.length === 1 && activeSIs.length === 0) {
    soName = activeSOs[0].name;
    console.log(`   Re-using existing Sales Order: ${soName}`);
  } else if (activeSOs.length > 0 || activeSIs.length > 0) {
    console.log("   SOs:", activeSOs.map(so => so.name));
    console.log("   SIs:", activeSIs.map(si => si.name));
    throw new Error("Billing records already exist for this student. Aborting to prevent duplicates.");
  }

  // Define 8-installment schedule (matching standard Tier 1 Plus Two Basic structure)
  // Inst 1: 2500 (1500 tuition + 1000 admission fee)
  // Inst 2-7: 2500
  // Inst 8: 1500
  // Total: 19000
  const SCHEDULE = [
    { label: "Inst 1", amount: 2500, dueDate: "2026-06-22" },
    { label: "Inst 2", amount: 2500, dueDate: "2026-07-22" },
    { label: "Inst 3", amount: 2500, dueDate: "2026-08-22" },
    { label: "Inst 4", amount: 2500, dueDate: "2026-09-22" },
    { label: "Inst 5", amount: 2500, dueDate: "2026-10-22" },
    { label: "Inst 6", amount: 2500, dueDate: "2026-11-22" },
    { label: "Inst 7", amount: 2500, dueDate: "2026-12-22" },
    { label: "Inst 8", amount: 1500, dueDate: "2027-01-22" },
  ];

  console.log("\n4. Computed 8-Installment Schedule:");
  SCHEDULE.forEach(inst => {
    console.log(`   - ${inst.label}: ₹${inst.amount} | Due: ${inst.dueDate}`);
  });
  const totalSum = SCHEDULE.reduce((s, i) => s + i.amount, 0);
  console.log(`   Total Billing Amount: ₹${totalSum}`);

  if (!LIVE) {
    console.log("\n[DRY RUN SUCCESSFUL] Run with --live to write to the database.");
    return;
  }

  if (!soName) {
    console.log("\n5. [LIVE] Creating Sales Order...");
    const soPayload = {
      customer: CUSTOMER_NAME,
      company: COMPANY,
      transaction_date: ENROLLMENT_DATE,
      delivery_date: ENROLLMENT_DATE,
      order_type: "Sales",
      items: [{
        item_code: ITEM_CODE,
        qty: 8,
        rate: 2375, // 19000 / 8 = 2375
        description: "Regular admission - 8 Installments",
      }],
      custom_academic_year: ACADEMIC_YEAR,
      student: STUDENT_ID,
      custom_no_of_instalments: INSTALMENTS,
      custom_plan: PLAN,
    };

    const createdSo = await post("/api/resource/Sales Order", soPayload);
    soName = createdSo.name;
    console.log(`   Created Sales Order: ${soName}`);

    console.log("\n6. [LIVE] Submitting Sales Order...");
    await put(`/api/resource/Sales Order/${encodeURIComponent(soName)}`, { docstatus: 1 });
    console.log(`   Submitted Sales Order: ${soName}`);
  } else {
    console.log(`\n5 & 6. [LIVE] Skipping Sales Order creation, re-using ${soName}`);
  }

  // Fetch submitted Sales Order to get the correct item row name (so_detail)
  const freshSo = await get(`/api/resource/Sales Order/${encodeURIComponent(soName)}`);
  const soItemRowName = freshSo.items?.[0]?.name;
  if (!soItemRowName) {
    throw new Error("Could not find item row details on the created/existing Sales Order.");
  }
  console.log(`   Sales Order Item Row (so_detail): ${soItemRowName}`);

  console.log("\n7. [LIVE] Creating and Submitting 8 Sales Invoices...");
  for (const inst of SCHEDULE) {
    const invPayload = {
      doctype: "Sales Invoice",
      customer: CUSTOMER_NAME,
      company: COMPANY,
      set_posting_time: 1, // Allow backdating posting date
      posting_date: inst.dueDate, // historical posting dates matching due dates
      due_date: inst.dueDate,
      student: STUDENT_ID,
      custom_academic_year: ACADEMIC_YEAR,
      disable_rounded_total: 1,
      items: [{
        item_code: ITEM_CODE,
        item_name: ITEM_CODE,
        description: `${inst.label} — ${ITEM_CODE}${inst.label === "Inst 1" ? " (includes Admission Fee)" : ""}`,
        qty: 1,
        rate: inst.amount,
        amount: inst.amount,
        sales_order: soName,
        so_detail: soItemRowName,
      }],
    };

    const inv = await post("/api/resource/Sales Invoice", invPayload);
    await put(`/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}`, { docstatus: 1 });
    console.log(`   ✓ Created & Submitted: ${inv.name} | ${inst.label} amount: ₹${inst.amount} | Due: ${inst.dueDate}`);
  }

  console.log("\n🎉 ALL BILLING RECORDS SUCCESSFULLY CREATED AND SUBMITTED!");
}

main().catch(console.error);
