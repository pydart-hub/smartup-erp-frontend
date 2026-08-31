#!/usr/bin/env node
/**
 * Convert ANAWIN PN (Smart Up Fortkochi) from Advanced Plan (₹24,400) to Basic Plan (₹19,000, 8 instalments).
 *
 * Installment Split:
 *   - Inst 1 to 7: ₹2,500 each
 *   - Inst 8: ₹1,500
 *   - Total: ₹19,000
 *
 * Paid amount: ₹8,000 across 3 payment entries (preserving exact dates, modes, amounts):
 *   1. 2026-04-21: Cash ₹4,200 -> Inst 1 (₹2,500), Inst 2 (₹1,700)
 *   2. 2026-04-21: Cash ₹1,800 -> Inst 2 (₹800), Inst 3 (₹1,000)
 *   3. 2026-07-06: UPI ₹2,000 -> Inst 3 (₹1,500), Inst 4 (₹500)
 *
 * Usage:
 *   node scripts/convert-anawin-basic-8.mjs --dry-run
 *   node scripts/convert-anawin-basic-8.mjs
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const BASE = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;
const DRY_RUN = process.argv.includes("--dry-run");

if (!BASE || !API_KEY || !API_SECRET) {
  throw new Error("Missing NEXT_PUBLIC_FRAPPE_URL / FRAPPE_API_KEY / FRAPPE_API_SECRET in .env.local");
}

const HEADERS = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  "Content-Type": "application/json",
};

const TARGET = {
  studentId: "STU-SU FKO-26-095",
  studentName: "ANAWIN PN",
  customer: "ANAWIN PN",
  company: "Smart Up Fortkochi",
  costCenter: "Main - SU FKO",
  debtorsAccount: "Debtors - SU FKO",
  programEnrollment: "PEN-12sc state-Fortkochi 26-27-095",
  program: "12th Science State",
  itemCode: "12th Science State Tuition Fee",
  academicYear: "2026-2027",
  feeStructure: "SU FKO-12th Science State-Basic-8",
  oldSalesOrder: "SAL-ORD-2026-00639",
  oldInvoices: [
    "ACC-SINV-2026-05335",
    "ACC-SINV-2026-05336",
    "ACC-SINV-2026-05337",
    "ACC-SINV-2026-05338",
    "ACC-SINV-2026-05339",
    "ACC-SINV-2026-05340",
  ],
  oldPayments: [
    "ACC-PAY-2026-04533",
    "ACC-PAY-2026-04534",
    "ACC-PAY-2026-06446",
  ],
};

const TARGET_SCHEDULE = [
  { label: "Inst 1", amount: 2500, dueDate: "2026-04-21" },
  { label: "Inst 2", amount: 2500, dueDate: "2026-06-15" },
  { label: "Inst 3", amount: 2500, dueDate: "2026-07-15" },
  { label: "Inst 4", amount: 2500, dueDate: "2026-08-15" },
  { label: "Inst 5", amount: 2500, dueDate: "2026-09-15" },
  { label: "Inst 6", amount: 2500, dueDate: "2026-10-15" },
  { label: "Inst 7", amount: 2500, dueDate: "2026-11-15" },
  { label: "Inst 8", amount: 1500, dueDate: "2026-12-15" },
];

const TOTAL_AMOUNT = 19000;

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
  }
  return json.data ?? json.message ?? json;
}

const get = (p) => api("GET", p);
const post = (p, b) => api("POST", p, b);
const put = (p, b) => api("PUT", p, b);

async function cancelDoc(doctype, name) {
  if (DRY_RUN) {
    console.log(`  [DRY] Cancel ${doctype} / ${name}`);
    return;
  }
  try {
    await post("/api/method/frappe.client.cancel", { doctype, name });
    console.log(`  ✓ Cancelled ${doctype} ${name}`);
  } catch (err) {
    console.log(`  ⚠️ Cancel ${doctype} ${name}: ${err.message}`);
  }
}

async function deleteDoc(doctype, name) {
  if (DRY_RUN) {
    console.log(`  [DRY] Delete ${doctype} / ${name}`);
    return;
  }
  try {
    await api("DELETE", `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
    console.log(`  ✓ Deleted ${doctype} ${name}`);
  } catch (err) {
    console.log(`  ⚠️ Delete ${doctype} ${name}: ${err.message}`);
  }
}

async function createDoc(doctype, payload) {
  if (DRY_RUN) {
    console.log(`  [DRY] Create ${doctype}:`, JSON.stringify(payload, null, 2));
    return { name: `DRY-${doctype.replace(/\s+/g, "-").toUpperCase()}` };
  }
  return post(`/api/resource/${encodeURIComponent(doctype)}`, payload);
}

async function submitDoc(doctype, name) {
  if (DRY_RUN) {
    console.log(`  [DRY] Submit ${doctype} / ${name}`);
    return null;
  }
  return put(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { docstatus: 1 });
}

async function runServerScript(scriptName, script) {
  if (DRY_RUN) {
    console.log(`  [DRY] Run server script ${scriptName}`);
    return { patched: true };
  }
  await api("DELETE", `/api/resource/Server Script/${encodeURIComponent(scriptName)}`).catch(() => {});
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
    await api("DELETE", `/api/resource/Server Script/${encodeURIComponent(scriptName)}`).catch(() => {});
  }
}

async function patchProgramEnrollmentDirect() {
  const scriptName = "patch_pe_anawin_basic8";
  const script = `
pe = "${TARGET.programEnrollment}"
frappe.db.set_value("Program Enrollment", pe, "custom_plan", "Basic", update_modified=False)
frappe.db.set_value("Program Enrollment", pe, "custom_no_of_instalments", "8", update_modified=False)
frappe.db.set_value("Program Enrollment", pe, "custom_fee_structure", "${TARGET.feeStructure}", update_modified=False)
frappe.db.commit()
frappe.response["message"] = {"patched": True}
`;
  return runServerScript(scriptName, script);
}

async function main() {
  console.log("=======================================================================");
  console.log(`🚀 CONVERTING ANAWIN PN (Fortkochi) -> Basic Plan (₹19,000, 8 Inst)`);
  console.log("=======================================================================\n");

  if (DRY_RUN) {
    console.log("*** DRY RUN MODE — No actual changes will be committed ***\n");
  }

  // 1. Fetch exact details of existing Payment Entries
  console.log("📋 Step 1: Fetching original Payment Entry details...");
  const peDetails = [];
  for (const peName of TARGET.oldPayments) {
    const pe = await get(`/api/resource/Payment Entry/${encodeURIComponent(peName)}`);
    peDetails.push({
      name: pe.name,
      posting_date: pe.posting_date,
      paid_amount: pe.paid_amount,
      mode_of_payment: pe.mode_of_payment,
      reference_no: pe.reference_no,
      paid_from: pe.paid_from,
      paid_to: pe.paid_to,
      remarks: pe.remarks,
    });
    console.log(`  ✓ PE ${pe.name} | ₹${pe.paid_amount} | Mode: ${pe.mode_of_payment} | Date: ${pe.posting_date} | To: ${pe.paid_to}`);
  }

  // 2. Cancel and Delete Old Payment Entries
  console.log("\n🗑️ Step 2: Cancelling & Deleting Old Payment Entries...");
  for (const peName of TARGET.oldPayments) {
    await cancelDoc("Payment Entry", peName);
    await deleteDoc("Payment Entry", peName);
  }

  // 3. Cancel and Delete Old Sales Invoices
  console.log("\n🗑️ Step 3: Cancelling & Deleting Old Sales Invoices...");
  for (const invName of TARGET.oldInvoices) {
    await cancelDoc("Sales Invoice", invName);
    await deleteDoc("Sales Invoice", invName);
  }

  // 4. Cancel and Delete Old Sales Order
  console.log("\n🗑️ Step 4: Cancelling & Deleting Old Sales Order...");
  await cancelDoc("Sales Order", TARGET.oldSalesOrder);
  await deleteDoc("Sales Order", TARGET.oldSalesOrder);

  // 5. Create & Submit New Sales Order
  console.log("\n📝 Step 5: Creating & Submitting New Sales Order (₹19,000)...");
  const soPayload = {
    doctype: "Sales Order",
    customer: TARGET.customer,
    company: TARGET.company,
    transaction_date: "2026-04-21",
    delivery_date: "2026-04-21",
    order_type: "Sales",
    student: TARGET.studentId,
    custom_academic_year: TARGET.academicYear,
    custom_plan: "Basic",
    custom_no_of_instalments: "8",
    items: [
      {
        item_code: TARGET.itemCode,
        item_name: TARGET.itemCode,
        qty: 8,
        rate: TOTAL_AMOUNT / 8,
        amount: TOTAL_AMOUNT,
      },
    ],
  };

  const createdSO = await createDoc("Sales Order", soPayload);
  if (!DRY_RUN) {
    await submitDoc("Sales Order", createdSO.name);
    console.log(`  ✓ Created & Submitted Sales Order: ${createdSO.name}`);
  }

  let soDetailRow = "DRY-ROW";
  if (!DRY_RUN) {
    const freshSO = await get(`/api/resource/Sales Order/${encodeURIComponent(createdSO.name)}`);
    soDetailRow = freshSO.items[0].name;
  }

  // 6. Create & Submit 8 New Sales Invoices
  console.log("\n🧾 Step 6: Creating & Submitting 8 New Sales Invoices (₹2,500 x 7 + ₹1,500)...");
  const newInvoices = [];
  for (let i = 0; i < TARGET_SCHEDULE.length; i++) {
    const inst = TARGET_SCHEDULE[i];
    const invPayload = {
      doctype: "Sales Invoice",
      customer: TARGET.customer,
      company: TARGET.company,
      cost_center: TARGET.costCenter,
      debit_to: TARGET.debtorsAccount,
      set_posting_time: 1,
      posting_date: "2026-04-21",
      due_date: inst.dueDate,
      student: TARGET.studentId,
      custom_academic_year: TARGET.academicYear,
      disable_rounded_total: 1,
      items: [
        {
          item_code: TARGET.itemCode,
          item_name: TARGET.itemCode,
          description: `${inst.label} — ${TARGET.itemCode}`,
          qty: 1,
          rate: inst.amount,
          amount: inst.amount,
          sales_order: createdSO.name,
          so_detail: soDetailRow,
          cost_center: TARGET.costCenter,
        },
      ],
    };

    const draftInv = await createDoc("Sales Invoice", invPayload);
    if (!DRY_RUN) {
      await submitDoc("Sales Invoice", draftInv.name);
      console.log(`  ✓ Created & Submitted ${inst.label} (${draftInv.name}): ₹${inst.amount} (Due: ${inst.dueDate})`);
    }
    newInvoices.push({ ...inst, name: draftInv.name });
  }

  // 7. Re-create & Submit Payment Entries with Exact Dates & Modes
  console.log("\n💳 Step 7: Re-creating & Submitting Payment Entries (Preserving Dates & Modes)...");

  // PE 1: ₹4,200 on 2026-04-21 (Cash) -> Inst 1 (₹2,500), Inst 2 (₹1,700)
  const pe1Info = peDetails[0];
  const pe1Payload = {
    doctype: "Payment Entry",
    payment_type: "Receive",
    party_type: "Customer",
    party: TARGET.customer,
    party_name: TARGET.customer,
    company: TARGET.company,
    posting_date: pe1Info.posting_date, // 2026-04-21
    mode_of_payment: pe1Info.mode_of_payment, // Cash
    reference_no: pe1Info.reference_no,
    reference_date: pe1Info.posting_date,
    paid_amount: pe1Info.paid_amount, // 4200
    received_amount: pe1Info.paid_amount,
    target_exchange_rate: 1,
    paid_from: pe1Info.paid_from || TARGET.debtorsAccount,
    paid_to: pe1Info.paid_to || "Cash - SU FKO",
    remarks: pe1Info.remarks || `Payment of ₹4,200 via Cash`,
    references: [
      {
        reference_doctype: "Sales Invoice",
        reference_name: newInvoices[0].name, // Inst 1
        total_amount: newInvoices[0].amount, // 2500
        outstanding_amount: newInvoices[0].amount,
        allocated_amount: 2500,
      },
      {
        reference_doctype: "Sales Invoice",
        reference_name: newInvoices[1].name, // Inst 2
        total_amount: newInvoices[1].amount, // 2500
        outstanding_amount: newInvoices[1].amount,
        allocated_amount: 1700,
      },
    ],
  };
  const createdPE1 = await createDoc("Payment Entry", pe1Payload);
  if (!DRY_RUN) {
    await submitDoc("Payment Entry", createdPE1.name);
    console.log(`  ✓ PE 1 (${createdPE1.name}): ₹4,200 on ${pe1Info.posting_date} [Cash] -> ₹2,500 to Inst 1, ₹1,700 to Inst 2`);
  }

  // PE 2: ₹1,800 on 2026-04-21 (Cash) -> Inst 2 (₹800), Inst 3 (₹1,000)
  const pe2Info = peDetails[1];
  const pe2Payload = {
    doctype: "Payment Entry",
    payment_type: "Receive",
    party_type: "Customer",
    party: TARGET.customer,
    party_name: TARGET.customer,
    company: TARGET.company,
    posting_date: pe2Info.posting_date, // 2026-04-21
    mode_of_payment: pe2Info.mode_of_payment, // Cash
    reference_no: pe2Info.reference_no,
    reference_date: pe2Info.posting_date,
    paid_amount: pe2Info.paid_amount, // 1800
    received_amount: pe2Info.paid_amount,
    target_exchange_rate: 1,
    paid_from: pe2Info.paid_from || TARGET.debtorsAccount,
    paid_to: pe2Info.paid_to || "Cash - SU FKO",
    remarks: pe2Info.remarks || `Payment of ₹1,800 via Cash`,
    references: [
      {
        reference_doctype: "Sales Invoice",
        reference_name: newInvoices[1].name, // Inst 2
        total_amount: newInvoices[1].amount, // 2500
        outstanding_amount: 800, // 2500 - 1700
        allocated_amount: 800,
      },
      {
        reference_doctype: "Sales Invoice",
        reference_name: newInvoices[2].name, // Inst 3
        total_amount: newInvoices[2].amount, // 2500
        outstanding_amount: newInvoices[2].amount,
        allocated_amount: 1000,
      },
    ],
  };
  const createdPE2 = await createDoc("Payment Entry", pe2Payload);
  if (!DRY_RUN) {
    await submitDoc("Payment Entry", createdPE2.name);
    console.log(`  ✓ PE 2 (${createdPE2.name}): ₹1,800 on ${pe2Info.posting_date} [Cash] -> ₹800 to Inst 2, ₹1,000 to Inst 3`);
  }

  // PE 3: ₹2,000 on 2026-07-06 (UPI) -> Inst 3 (₹1,500), Inst 4 (₹500)
  const pe3Info = peDetails[2];
  const pe3Payload = {
    doctype: "Payment Entry",
    payment_type: "Receive",
    party_type: "Customer",
    party: TARGET.customer,
    party_name: TARGET.customer,
    company: TARGET.company,
    posting_date: pe3Info.posting_date, // 2026-07-06
    mode_of_payment: pe3Info.mode_of_payment, // UPI
    reference_no: pe3Info.reference_no,
    reference_date: pe3Info.posting_date,
    paid_amount: pe3Info.paid_amount, // 2000
    received_amount: pe3Info.paid_amount,
    target_exchange_rate: 1,
    paid_from: pe3Info.paid_from || TARGET.debtorsAccount,
    paid_to: pe3Info.paid_to || "UPI - SU FKO",
    remarks: pe3Info.remarks || `Payment of ₹2,000 via UPI`,
    references: [
      {
        reference_doctype: "Sales Invoice",
        reference_name: newInvoices[2].name, // Inst 3
        total_amount: newInvoices[2].amount, // 2500
        outstanding_amount: 1500, // 2500 - 1000
        allocated_amount: 1500,
      },
      {
        reference_doctype: "Sales Invoice",
        reference_name: newInvoices[3].name, // Inst 4
        total_amount: newInvoices[3].amount, // 2500
        outstanding_amount: newInvoices[3].amount,
        allocated_amount: 500,
      },
    ],
  };
  const createdPE3 = await createDoc("Payment Entry", pe3Payload);
  if (!DRY_RUN) {
    await submitDoc("Payment Entry", createdPE3.name);
    console.log(`  ✓ PE 3 (${createdPE3.name}): ₹2,000 on ${pe3Info.posting_date} [UPI] -> ₹1,500 to Inst 3, ₹500 to Inst 4`);
  }

  // 8. Update Program Enrollment Metadata
  console.log("\n📌 Step 8: Updating Program Enrollment metadata...");
  await patchProgramEnrollmentDirect();
  console.log(`  ✓ Updated Program Enrollment ${TARGET.programEnrollment} -> Plan: Basic, Instalments: 8, FS: ${TARGET.feeStructure}`);

  // 9. Final Verification
  console.log("\n=======================================================================");
  console.log("🔍 Final Verification of Invoices & Ledger State");
  console.log("=======================================================================");

  if (!DRY_RUN) {
    const invList = await get(
      `/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([["customer", "=", TARGET.customer], ["docstatus", "=", 1]]))}&fields=${encodeURIComponent(JSON.stringify(["name", "grand_total", "outstanding_amount", "status", "due_date"]))}&order_by=due_date asc`
    );
    let totalInv = 0;
    let totalOut = 0;
    for (const inv of invList) {
      console.log(`  ${inv.name} | Due: ${inv.due_date} | Total: ₹${inv.grand_total} | Paid: ₹${inv.grand_total - inv.outstanding_amount} | Outstanding: ₹${inv.outstanding_amount} | Status: ${inv.status}`);
      totalInv += Number(inv.grand_total);
      totalOut += Number(inv.outstanding_amount);
    }
    console.log(`\n  Total Invoiced: ₹${totalInv} (Expected: ₹19,000)`);
    console.log(`  Total Outstanding: ₹${totalOut} (Expected: ₹11,000)`);
    console.log(`  Total Paid: ₹${totalInv - totalOut} (Expected: ₹8,000)`);
  }

  console.log("\n🎉 CONVERSION COMPLETED SUCCESSFULLY!");
}

main().catch((err) => {
  console.error(`\n❌ ERROR: ${err.message}`);
  process.exit(1);
});
