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
  console.log("🚀 EXECUTING CONVERSION FOR MOHAMMED AMAN K N");
  console.log("=".repeat(70));
  
  const STUDENT_ID = "STU-SU ERV-26-222";
  const CUSTOMER = "MOHAMMED AMAN K N";
  const COMPANY = "Smart Up Eraveli";
  const ITEM_CODE = "8th State Tuition Fee";
  const ACADEMIC_YEAR = "2026-2027";
  
  const TARGET_SCHEDULE = [
    { label: "Inst 1", amount: 1900, due_date: "2026-06-05" },
    { label: "Inst 2", amount: 1900, due_date: "2026-08-05" },
    { label: "Inst 3", amount: 1900, due_date: "2026-10-05" },
    { label: "Inst 4", amount: 1900, due_date: "2026-12-05" },
    { label: "Inst 5", amount: 1900, due_date: "2027-02-05" },
    { label: "Inst 6", amount: 2000, due_date: "2027-04-05" },
  ];
  
  const TOTAL_AMOUNT = 11500; // 5 * 1900 + 2000
  
  const pePostingDate = "2026-06-05";
  const pePaidAmount = 1900;
  const peMode = "Cash";
  const peRefNo = "CASH-1780669777329";
  
  // Step 1: Check existing SO for student
  console.log("\n📝 Step 1: Getting Sales Order...");
  const existingSOs = await apiCall(
    "GET",
    `/api/resource/Sales Order?filters=${encodeURIComponent(JSON.stringify([["student", "=", STUDENT_ID], ["docstatus", "=", 1]]))}`
  );
  
  let soName;
  if (existingSOs && existingSOs.length > 0) {
    soName = existingSOs[0].name;
    console.log(`  ✓ Found existing submitted Sales Order: ${soName}`);
  } else {
    const soPayload = {
      doctype: "Sales Order",
      customer: CUSTOMER,
      company: COMPANY,
      transaction_date: "2026-06-05",
      delivery_date: "2026-06-05",
      order_type: "Sales",
      student: STUDENT_ID,
      custom_academic_year: ACADEMIC_YEAR,
      custom_plan: "Basic",
      custom_no_of_instalments: "6",
      items: [
        {
          item_code: ITEM_CODE,
          item_name: ITEM_CODE,
          qty: 6,
          rate: TOTAL_AMOUNT / 6,
          amount: TOTAL_AMOUNT,
        },
      ],
    };
    
    const createdSO = await apiCall("POST", "/api/resource/Sales Order", soPayload);
    await apiCall("PUT", `/api/resource/Sales Order/${createdSO.name}`, { docstatus: 1 });
    soName = createdSO.name;
    console.log(`  ✓ Created & Submitted Sales Order: ${soName}`);
  }
  
  // Fetch submitted SO to get the item detail row name (so_detail)
  const submittedSO = await apiCall("GET", `/api/resource/Sales Order/${soName}`);
  const soDetailRow = submittedSO.items[0].name;
  
  // Step 2: Create & Submit New Sales Invoices
  console.log("\n🧾 Step 2: Creating 6 New Sales Invoices...");
  const newInvoices = [];
  
  for (let i = 0; i < TARGET_SCHEDULE.length; i++) {
    const inst = TARGET_SCHEDULE[i];
    const invPayload = {
      doctype: "Sales Invoice",
      customer: CUSTOMER,
      company: COMPANY,
      set_posting_time: 1,
      posting_date: "2026-06-05", // Sets posting_date to June 5th, 2026
      due_date: inst.due_date,    // Always >= posting_date
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
          sales_order: soName,
          so_detail: soDetailRow,
        },
      ],
    };
    
    const createdInv = await apiCall("POST", "/api/resource/Sales Invoice", invPayload);
    await apiCall("PUT", `/api/resource/Sales Invoice/${createdInv.name}`, { docstatus: 1 });
    console.log(`  ✓ Created & Submitted ${inst.label} (${createdInv.name}): ₹${inst.amount} (Due: ${inst.due_date})`);
    newInvoices.push({ ...inst, name: createdInv.name });
  }
  
  // Step 3: Re-create & Submit Payment Entry
  console.log("\n💳 Step 3: Re-creating Payment Entry with Exact Original Details...");
  const firstInvoiceName = newInvoices[0].name;
  
  const pePayload = {
    doctype: "Payment Entry",
    payment_type: "Receive",
    party_type: "Customer",
    party: CUSTOMER,
    party_name: CUSTOMER,
    company: COMPANY,
    posting_date: pePostingDate, // 2026-06-05
    mode_of_payment: peMode,     // Cash
    reference_no: peRefNo,       // CASH-1780669777329
    reference_date: pePostingDate,
    paid_amount: pePaidAmount,   // 1900
    received_amount: pePaidAmount,
    target_exchange_rate: 1,
    paid_from: "Debtors - SU ERV",
    paid_to: "Cash - SU ERV",
    references: [
      {
        reference_doctype: "Sales Invoice",
        reference_name: firstInvoiceName,
        total_amount: newInvoices[0].amount, // 1900
        outstanding_amount: newInvoices[0].amount,
        allocated_amount: pePaidAmount,      // 1900
      },
    ],
  };
  
  const createdPE = await apiCall("POST", "/api/resource/Payment Entry", pePayload);
  console.log(`  ✓ Created Payment Entry: ${createdPE.name}`);
  
  await apiCall("PUT", `/api/resource/Payment Entry/${createdPE.name}`, { docstatus: 1 });
  console.log(`  ✓ Submitted Payment Entry: ${createdPE.name}`);
  
  // Step 4: Update Program Enrollment Custom Fee Structure field
  console.log("\n📌 Step 4: Updating Program Enrollment custom_fee_structure...");
  const peList = await apiCall(
    "GET",
    `/api/resource/Program Enrollment?filters=${encodeURIComponent(JSON.stringify([["student", "=", STUDENT_ID]]))}`
  );
  if (peList && peList.length > 0) {
    await apiCall("POST", "/api/method/frappe.client.set_value", {
      doctype: "Program Enrollment",
      name: peList[0].name,
      fieldname: {
        custom_fee_structure: "SU ERV-8th State-Basic-6",
      },
    });
    console.log(`  ✓ Updated Program Enrollment ${peList[0].name}`);
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("🎉 CONVERSION COMPLETED SUCCESSFULLY FOR MOHAMMED AMAN K N!");
  console.log("=".repeat(70));
  console.log(`Summary:`);
  console.log(`  Sales Order: ${soName} (Total: ₹${TOTAL_AMOUNT})`);
  console.log(`  Inst 1 Invoice: ${firstInvoiceName} (₹1,900) → Status: PAID`);
  console.log(`  Payment Entry: ${createdPE.name} (₹1,900 on ${pePostingDate})`);
}

main().catch((err) => {
  console.error(`\n❌ CONVERSION FAILED: ${err.message}`);
  process.exit(1);
});
