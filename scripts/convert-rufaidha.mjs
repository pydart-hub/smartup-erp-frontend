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
  console.log("🚀 EXECUTING CONVERSION FOR FATHIMA RUFAIDHA M M");
  console.log("=".repeat(70));
  
  const STUDENT_ID = "STU-SU ERV-26-204";
  const CUSTOMER = "FATHIMA RUFAIDHA M M";
  const COMPANY = "Smart Up Eraveli";
  const ITEM_CODE = "8th State Tuition Fee";
  const ACADEMIC_YEAR = "2026-2027";
  
  const OLD_SO = "SAL-ORD-2026-01152";
  const OLD_PES = ["ACC-PAY-2026-05289", "ACC-PAY-2026-05747", "ACC-PAY-2026-06640"];
  const OLD_INVOICES = [
    "ACC-SINV-2026-08505",
    "ACC-SINV-2026-08506",
    "ACC-SINV-2026-08507",
    "ACC-SINV-2026-08508",
    "ACC-SINV-2026-08509",
    "ACC-SINV-2026-08510",
    "ACC-SINV-2026-08511",
    "ACC-SINV-2026-08512",
  ];
  
  const TARGET_SCHEDULE = [
    { label: "Inst 1", amount: 1450, due_date: "2026-06-01" },
    { label: "Inst 2", amount: 1450, due_date: "2026-07-01" },
    { label: "Inst 3", amount: 1450, due_date: "2026-08-01" },
    { label: "Inst 4", amount: 1450, due_date: "2026-09-01" },
    { label: "Inst 5", amount: 1450, due_date: "2026-10-01" },
    { label: "Inst 6", amount: 1450, due_date: "2026-11-01" },
    { label: "Inst 7", amount: 1450, due_date: "2026-12-01" },
    { label: "Inst 8", amount: 1600, due_date: "2027-01-01" },
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
    transaction_date: "2026-06-01",
    delivery_date: "2026-06-01",
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
      posting_date: "2026-06-01", // Set posting_date to June 1st, 2026
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
  
  // PE 1: ₹500 on 2026-06-01 -> Inst 1 (500)
  const pe1Info = peDetails[0];
  const pe1Payload = {
    doctype: "Payment Entry",
    payment_type: "Receive",
    party_type: "Customer",
    party: CUSTOMER,
    party_name: CUSTOMER,
    company: COMPANY,
    posting_date: pe1Info.posting_date, // 2026-06-01
    mode_of_payment: pe1Info.mode_of_payment, // Cash
    reference_no: pe1Info.reference_no, // CASH-1780322908801
    reference_date: pe1Info.posting_date,
    paid_amount: pe1Info.paid_amount, // 500
    received_amount: pe1Info.paid_amount,
    target_exchange_rate: 1,
    paid_from: pe1Info.paid_from || "Debtors - SU ERV",
    paid_to: pe1Info.paid_to || "Cash - SU ERV",
    references: [
      {
        reference_doctype: "Sales Invoice",
        reference_name: newInvoices[0].name, // Inst 1
        total_amount: newInvoices[0].amount, // 1450
        outstanding_amount: newInvoices[0].amount,
        allocated_amount: 500,
      },
    ],
  };
  
  const createdPE1 = await apiCall("POST", "/api/resource/Payment Entry", pe1Payload);
  await apiCall("PUT", `/api/resource/Payment Entry/${createdPE1.name}`, { docstatus: 1 });
  console.log(`  ✓ Created & Submitted PE 1 (${createdPE1.name}): ₹500 on ${pe1Info.posting_date} (₹500 to Inst 1)`);
  
  // PE 2: ₹1300 on 2026-06-10 -> Inst 1 (950) & Inst 2 (350)
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
    reference_no: pe2Info.reference_no, // CASH-1781108140819
    reference_date: pe2Info.posting_date,
    paid_amount: pe2Info.paid_amount, // 1300
    received_amount: pe2Info.paid_amount,
    target_exchange_rate: 1,
    paid_from: pe2Info.paid_from || "Debtors - SU ERV",
    paid_to: pe2Info.paid_to || "Cash - SU ERV",
    references: [
      {
        reference_doctype: "Sales Invoice",
        reference_name: newInvoices[0].name, // Inst 1
        total_amount: newInvoices[0].amount, // 1450
        outstanding_amount: 950,
        allocated_amount: 950,
      },
      {
        reference_doctype: "Sales Invoice",
        reference_name: newInvoices[1].name, // Inst 2
        total_amount: newInvoices[1].amount, // 1450
        outstanding_amount: newInvoices[1].amount,
        allocated_amount: 350,
      },
    ],
  };
  
  const createdPE2 = await apiCall("POST", "/api/resource/Payment Entry", pe2Payload);
  await apiCall("PUT", `/api/resource/Payment Entry/${createdPE2.name}`, { docstatus: 1 });
  console.log(`  ✓ Created & Submitted PE 2 (${createdPE2.name}): ₹1,300 on ${pe2Info.posting_date} (₹950 to Inst 1, ₹350 to Inst 2)`);
  
  // PE 3: ₹1800 on 2026-07-11 -> Inst 2 (1100) & Inst 3 (700)
  const pe3Info = peDetails[2];
  const pe3Payload = {
    doctype: "Payment Entry",
    payment_type: "Receive",
    party_type: "Customer",
    party: CUSTOMER,
    party_name: CUSTOMER,
    company: COMPANY,
    posting_date: pe3Info.posting_date, // 2026-07-11
    mode_of_payment: pe3Info.mode_of_payment, // Cash
    reference_no: pe3Info.reference_no, // CASH-1783771579007
    reference_date: pe3Info.posting_date,
    paid_amount: pe3Info.paid_amount, // 1800
    received_amount: pe3Info.paid_amount,
    target_exchange_rate: 1,
    paid_from: pe3Info.paid_from || "Debtors - SU ERV",
    paid_to: pe3Info.paid_to || "Cash - SU ERV",
    references: [
      {
        reference_doctype: "Sales Invoice",
        reference_name: newInvoices[1].name, // Inst 2
        total_amount: newInvoices[1].amount, // 1450
        outstanding_amount: 1100,
        allocated_amount: 1100,
      },
      {
        reference_doctype: "Sales Invoice",
        reference_name: newInvoices[2].name, // Inst 3
        total_amount: newInvoices[2].amount, // 1450
        outstanding_amount: newInvoices[2].amount,
        allocated_amount: 700,
      },
    ],
  };
  
  const createdPE3 = await apiCall("POST", "/api/resource/Payment Entry", pe3Payload);
  await apiCall("PUT", `/api/resource/Payment Entry/${createdPE3.name}`, { docstatus: 1 });
  console.log(`  ✓ Created & Submitted PE 3 (${createdPE3.name}): ₹1,800 on ${pe3Info.posting_date} (₹1,100 to Inst 2, ₹700 to Inst 3)`);
  
  // Step 6: Update Program Enrollment Custom Fee Structure field if enrollment exists
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
  } else {
    console.log(`  ℹ️ No Program Enrollment doc found for ${STUDENT_ID}`);
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("🎉 CONVERSION COMPLETED SUCCESSFULLY FOR FATHIMA RUFAIDHA M M!");
  console.log("=".repeat(70));
  console.log(`Summary:`);
  console.log(`  Sales Order: ${createdSO.name} (Total: ₹${TOTAL_AMOUNT})`);
  console.log(`  Inst 1 Invoice: ${newInvoices[0].name} (₹1,450) → Status: PAID`);
  console.log(`  Inst 2 Invoice: ${newInvoices[1].name} (₹1,450) → Status: PAID`);
  console.log(`  Inst 3 Invoice: ${newInvoices[2].name} (₹1,450) → Status: PARTIALLY PAID (₹750 outstanding)`);
  console.log(`  PE 1: ${createdPE1.name} (₹500 on ${pe1Info.posting_date})`);
  console.log(`  PE 2: ${createdPE2.name} (₹1,300 on ${pe2Info.posting_date})`);
  console.log(`  PE 3: ${createdPE3.name} (₹1,800 on ${pe3Info.posting_date})`);
}

main().catch((err) => {
  console.error(`\n❌ CONVERSION FAILED: ${err.message}`);
  process.exit(1);
});
