import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const BASE = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const HEADERS = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  "Content-Type": "application/json",
};

async function apiCall(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
  return json.data ?? json.message ?? json;
}

async function cancelDoc(doctype, name) {
  try {
    await apiCall("POST", "/api/method/frappe.client.cancel", { doctype, name });
    console.log(`  ✓ Cancelled ${doctype} ${name}`);
  } catch (err) {
    console.log(`  ⚠️ Cancel ${doctype} ${name}: ${err.message}`);
  }
}

async function deleteDoc(doctype, name) {
  try {
    await apiCall("DELETE", `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
    console.log(`  ✓ Deleted ${doctype} ${name}`);
  } catch (err) {
    console.log(`  ⚠️ Delete ${doctype} ${name}: ${err.message}`);
  }
}

async function main() {
  console.log("🚀 EXECUTING CONVERSION FOR MUHAMMED SAIHAN");
  console.log("=".repeat(70));
  
  const STUDENT_ID = "STU-SU ERV-26-206";
  const CUSTOMER = "MUHAMMED SAIHAN";
  const COMPANY = "Smart Up Eraveli";
  const ITEM_CODE = "8th State Tuition Fee";
  const ACADEMIC_YEAR = "2026-2027";
  
  const OLD_SO = "SAL-ORD-2026-01176";
  const OLD_PES = ["ACC-PAY-2026-05345", "ACC-PAY-2026-05743"];
  const OLD_INVOICES = [
    "ACC-SINV-2026-08673",
    "ACC-SINV-2026-08674",
    "ACC-SINV-2026-08675",
    "ACC-SINV-2026-08676",
    "ACC-SINV-2026-08677",
    "ACC-SINV-2026-08678",
    "ACC-SINV-2026-08679",
    "ACC-SINV-2026-08680",
  ];
  
  const TARGET_SCHEDULE = [
    { label: "Inst 1", amount: 1450, due_date: "2026-06-02" },
    { label: "Inst 2", amount: 1450, due_date: "2026-07-02" },
    { label: "Inst 3", amount: 1450, due_date: "2026-08-02" },
    { label: "Inst 4", amount: 1450, due_date: "2026-09-02" },
    { label: "Inst 5", amount: 1450, due_date: "2026-10-02" },
    { label: "Inst 6", amount: 1450, due_date: "2026-11-02" },
    { label: "Inst 7", amount: 1450, due_date: "2026-12-02" },
    { label: "Inst 8", amount: 1600, due_date: "2027-01-02" },
  ];
  
  const TOTAL_AMOUNT = 11750; // 7 * 1450 + 1600
  
  // Step 1: Fetch original Payment Entries details
  console.log("\n📋 Step 1: Fetching original Payment Entry details...");
  const peDetails = [];
  for (const peName of OLD_PES) {
    const pe = await apiCall("GET", `/api/resource/Payment Entry/${peName}`);
    peDetails.push({
      name: pe.name,
      posting_date: pe.posting_date,
      paid_amount: pe.paid_amount,
      mode_of_payment: pe.mode_of_payment,
      reference_no: pe.reference_no,
      paid_from: pe.paid_from,
      paid_to: pe.paid_to,
    });
    console.log(`  PE: ${pe.name} | ₹${pe.paid_amount} | Date: ${pe.posting_date} | Ref: ${pe.reference_no}`);
  }
  
  // Step 2: Cancel & Delete Old Records
  console.log("\n🗑️ Step 2: Cancelling & Deleting Old Records...");
  for (const peName of OLD_PES) {
    await cancelDoc("Payment Entry", peName);
    await deleteDoc("Payment Entry", peName);
  }
  
  for (const inv of OLD_INVOICES) {
    await cancelDoc("Sales Invoice", inv);
    await deleteDoc("Sales Invoice", inv);
  }
  
  await cancelDoc("Sales Order", OLD_SO);
  await deleteDoc("Sales Order", OLD_SO);
  
  // Step 3: Create & Submit New Sales Order
  console.log("\n📝 Step 3: Creating New Sales Order (June Joiners Structure)...");
  const soPayload = {
    doctype: "Sales Order",
    customer: CUSTOMER,
    company: COMPANY,
    transaction_date: "2026-06-02",
    delivery_date: "2026-06-02",
    order_type: "Sales",
    student: STUDENT_ID,
    custom_academic_year: ACADEMIC_YEAR,
    custom_plan: "Basic",
    custom_no_of_instalments: "8",
    items: [
      {
        item_code: ITEM_CODE,
        item_name: ITEM_CODE,
        qty: 8,
        rate: TOTAL_AMOUNT / 8,
        amount: TOTAL_AMOUNT,
      },
    ],
  };
  
  const createdSO = await apiCall("POST", "/api/resource/Sales Order", soPayload);
  await apiCall("PUT", `/api/resource/Sales Order/${createdSO.name}`, { docstatus: 1 });
  console.log(`  ✓ Created & Submitted Sales Order: ${createdSO.name}`);
  
  // Fetch submitted SO to get the item detail row name (so_detail)
  const submittedSO = await apiCall("GET", `/api/resource/Sales Order/${createdSO.name}`);
  const soDetailRow = submittedSO.items[0].name;
  
  // Step 4: Create & Submit 8 New Sales Invoices
  console.log("\n🧾 Step 4: Creating 8 New Sales Invoices...");
  const newInvoices = [];
  
  for (let i = 0; i < TARGET_SCHEDULE.length; i++) {
    const inst = TARGET_SCHEDULE[i];
    const invPayload = {
      doctype: "Sales Invoice",
      customer: CUSTOMER,
      company: COMPANY,
      set_posting_time: 1,
      posting_date: "2026-06-02", // Set posting_date to June 2nd, 2026
      due_date: inst.due_date,
      student: STUDENT_ID,
      custom_academic_year: ACADEMIC_YEAR,
      items: [
        {
          item_code: ITEM_CODE,
          item_name: ITEM_CODE,
          description: `${inst.label} — ${ITEM_CODE}`,
          qty: 1,
          rate: inst.amount,
          amount: inst.amount,
          sales_order: createdSO.name,
          so_detail: soDetailRow,
        },
      ],
    };
    
    const createdInv = await apiCall("POST", "/api/resource/Sales Invoice", invPayload);
    await apiCall("PUT", `/api/resource/Sales Invoice/${createdInv.name}`, { docstatus: 1 });
    console.log(`  ✓ Created & Submitted ${inst.label} (${createdInv.name}): ₹${inst.amount} (Due: ${inst.due_date})`);
    newInvoices.push({ ...inst, name: createdInv.name });
  }
  
  // Step 5: Re-create & Submit Payment Entries
  console.log("\n💳 Step 5: Re-creating Payment Entries with Exact Original Details...");
  
  // PE 1 -> Inst 1 (1000)
  const pe1Info = peDetails[0];
  const pe1Payload = {
    doctype: "Payment Entry",
    payment_type: "Receive",
    party_type: "Customer",
    party: CUSTOMER,
    party_name: CUSTOMER,
    company: COMPANY,
    posting_date: pe1Info.posting_date, // 2026-06-02
    mode_of_payment: pe1Info.mode_of_payment, // Cash
    reference_no: pe1Info.reference_no, // CASH-1780403999325
    reference_date: pe1Info.posting_date,
    paid_amount: pe1Info.paid_amount, // 1000
    received_amount: pe1Info.paid_amount,
    target_exchange_rate: 1,
    paid_from: pe1Info.paid_from || "Debtors - SU ERV",
    paid_to: pe1Info.paid_to || "Cash - SU ERV",
    references: [
      {
        reference_doctype: "Sales Invoice",
        reference_name: newInvoices[0].name,
        total_amount: newInvoices[0].amount, // 1450
        outstanding_amount: newInvoices[0].amount,
        allocated_amount: pe1Info.paid_amount, // 1000
      },
    ],
  };
  
  const createdPE1 = await apiCall("POST", "/api/resource/Payment Entry", pe1Payload);
  await apiCall("PUT", `/api/resource/Payment Entry/${createdPE1.name}`, { docstatus: 1 });
  console.log(`  ✓ Created & Submitted PE 1 (${createdPE1.name}): ₹1,000 on ${pe1Info.posting_date} -> Inst 1`);
  
  // PE 2 -> Inst 1 (450) & Inst 2 (50)
  const pe2Info = peDetails[1];
  const pe2Payload = {
    doctype: "Payment Entry",
    payment_type: "Receive",
    party_type: "Customer",
    party: CUSTOMER,
    party_name: CUSTOMER,
    company: COMPANY,
    posting_date: pe2Info.posting_date, // 2026-06-10
    mode_of_payment: pe2Info.mode_of_payment, // Cash
    reference_no: pe2Info.reference_no, // CASH-1781107863730
    reference_date: pe2Info.posting_date,
    paid_amount: pe2Info.paid_amount, // 500
    received_amount: pe2Info.paid_amount,
    target_exchange_rate: 1,
    paid_from: pe2Info.paid_from || "Debtors - SU ERV",
    paid_to: pe2Info.paid_to || "Cash - SU ERV",
    references: [
      {
        reference_doctype: "Sales Invoice",
        reference_name: newInvoices[0].name, // Inst 1
        total_amount: newInvoices[0].amount, // 1450
        outstanding_amount: 450,
        allocated_amount: 450,
      },
      {
        reference_doctype: "Sales Invoice",
        reference_name: newInvoices[1].name, // Inst 2
        total_amount: newInvoices[1].amount, // 1450
        outstanding_amount: 1450,
        allocated_amount: 50,
      },
    ],
  };
  
  const createdPE2 = await apiCall("POST", "/api/resource/Payment Entry", pe2Payload);
  await apiCall("PUT", `/api/resource/Payment Entry/${createdPE2.name}`, { docstatus: 1 });
  console.log(`  ✓ Created & Submitted PE 2 (${createdPE2.name}): ₹500 on ${pe2Info.posting_date} (₹450 to Inst 1, ₹50 to Inst 2)`);
  
  // Step 6: Update Program Enrollment Custom Fee Structure field
  console.log("\n📌 Step 6: Updating Program Enrollment custom_fee_structure...");
  const peList = await apiCall(
    "GET",
    `/api/resource/Program Enrollment?filters=${encodeURIComponent(JSON.stringify([["student", "=", STUDENT_ID]]))}`
  );
  if (peList && peList.length > 0) {
    await apiCall("POST", "/api/method/frappe.client.set_value", {
      doctype: "Program Enrollment",
      name: peList[0].name,
      fieldname: {
        custom_fee_structure: "SU ERV-8th State-Basic-8",
      },
    });
    console.log(`  ✓ Updated Program Enrollment ${peList[0].name}`);
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("🎉 CONVERSION COMPLETED SUCCESSFULLY FOR MUHAMMED SAIHAN!");
  console.log("=".repeat(70));
  console.log(`Summary:`);
  console.log(`  Sales Order: ${createdSO.name} (Total: ₹${TOTAL_AMOUNT})`);
  console.log(`  Inst 1 Invoice: ${newInvoices[0].name} (₹1,450) → Status: PAID`);
  console.log(`  Inst 2 Invoice: ${newInvoices[1].name} (₹1,450) → Status: PARTIALLY PAID (₹1,400 outstanding)`);
  console.log(`  PE 1: ${createdPE1.name} (₹1,000 on ${pe1Info.posting_date})`);
  console.log(`  PE 2: ${createdPE2.name} (₹500 on ${pe2Info.posting_date})`);
}

main().catch((err) => {
  console.error(`\n❌ CONVERSION FAILED: ${err.message}`);
  process.exit(1);
});
