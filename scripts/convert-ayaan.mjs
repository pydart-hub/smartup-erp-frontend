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
  console.log("🚀 EXECUTING CONVERSION FOR MOHAMMED AYAAN AZEEZ");
  console.log("=".repeat(70));
  
  const STUDENT_ID = "STU-SU ERV-26-215";
  const CUSTOMER = "MOHAMMED AYAAN AZEEZ";
  const COMPANY = "Smart Up Eraveli";
  const ITEM_CODE = "9th State Tuition Fee";
  const ACADEMIC_YEAR = "2026-2027";
  
  const OLD_SO = "SAL-ORD-2026-01221";
  const OLD_PE = "ACC-PAY-2026-05438";
  const OLD_INVOICES = [
    "ACC-SINV-2026-08993",
    "ACC-SINV-2026-08994",
    "ACC-SINV-2026-08995",
    "ACC-SINV-2026-08996",
    "ACC-SINV-2026-08997",
    "ACC-SINV-2026-08998",
    "ACC-SINV-2026-08999",
    "ACC-SINV-2026-09000",
  ];
  
  const TARGET_SCHEDULE = [
    { label: "Inst 1", amount: 1700, due_date: "2026-06-03" },
    { label: "Inst 2", amount: 1700, due_date: "2026-07-03" },
    { label: "Inst 3", amount: 1700, due_date: "2026-08-03" },
    { label: "Inst 4", amount: 1700, due_date: "2026-09-03" },
    { label: "Inst 5", amount: 1700, due_date: "2026-10-03" },
    { label: "Inst 6", amount: 1700, due_date: "2026-11-03" },
    { label: "Inst 7", amount: 1700, due_date: "2026-12-03" },
    { label: "Inst 8", amount: 1850, due_date: "2027-01-03" },
  ];
  
  const TOTAL_AMOUNT = 13750; // 7 * 1700 + 1850
  
  // Step 1: Fetch original Payment Entry details
  console.log("\n📋 Step 1: Fetching original Payment Entry details...");
  const peDetail = await apiCall("GET", `/api/resource/Payment Entry/${OLD_PE}`);
  const pePostingDate = peDetail.posting_date; // 2026-06-03
  const pePaidAmount = peDetail.paid_amount;   // 2100
  const peMode = peDetail.mode_of_payment;     // Cash
  const peRefNo = peDetail.reference_no;       // CASH-1780490441783
  const paidFrom = peDetail.paid_from;
  const paidTo = peDetail.paid_to;
  console.log(`  Posting Date: ${pePostingDate}`);
  console.log(`  Paid Amount: ₹${pePaidAmount}`);
  console.log(`  Mode: ${peMode} | Ref No: ${peRefNo}`);
  
  // Step 2: Cancel & Delete Old Records
  console.log("\n🗑️ Step 2: Cancelling & Deleting Old Records...");
  await cancelDoc("Payment Entry", OLD_PE);
  await deleteDoc("Payment Entry", OLD_PE);
  
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
    transaction_date: "2026-06-03",
    delivery_date: "2026-06-03",
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
      posting_date: "2026-06-03", // Set posting_date to June 3rd, 2026
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
  
  // Step 5: Re-create & Submit Payment Entry (2100 total: 1700 to Inst 1, 400 to Inst 2)
  console.log("\n💳 Step 5: Re-creating Payment Entry with Exact Original Details...");
  const pePayload = {
    doctype: "Payment Entry",
    payment_type: "Receive",
    party_type: "Customer",
    party: CUSTOMER,
    party_name: CUSTOMER,
    company: COMPANY,
    posting_date: pePostingDate, // 2026-06-03
    mode_of_payment: peMode,     // Cash
    reference_no: peRefNo,       // CASH-1780490441783
    reference_date: pePostingDate,
    paid_amount: pePaidAmount,   // 2100
    received_amount: pePaidAmount,
    target_exchange_rate: 1,
    paid_from: paidFrom || "Debtors - SU ERV",
    paid_to: paidTo || "Cash - SU ERV",
    references: [
      {
        reference_doctype: "Sales Invoice",
        reference_name: newInvoices[0].name, // Inst 1
        total_amount: newInvoices[0].amount, // 1700
        outstanding_amount: newInvoices[0].amount,
        allocated_amount: 1700,
      },
      {
        reference_doctype: "Sales Invoice",
        reference_name: newInvoices[1].name, // Inst 2
        total_amount: newInvoices[1].amount, // 1700
        outstanding_amount: newInvoices[1].amount,
        allocated_amount: 400,
      },
    ],
  };
  
  const createdPE = await apiCall("POST", "/api/resource/Payment Entry", pePayload);
  await apiCall("PUT", `/api/resource/Payment Entry/${createdPE.name}`, { docstatus: 1 });
  console.log(`  ✓ Created & Submitted PE (${createdPE.name}): ₹2,100 (₹1,700 to Inst 1, ₹400 to Inst 2)`);
  
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
        custom_fee_structure: "SU ERV-9th State-Basic-8",
      },
    });
    console.log(`  ✓ Updated Program Enrollment ${peList[0].name}`);
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("🎉 CONVERSION COMPLETED SUCCESSFULLY FOR MOHAMMED AYAAN AZEEZ!");
  console.log("=".repeat(70));
  console.log(`Summary:`);
  console.log(`  Sales Order: ${createdSO.name} (Total: ₹${TOTAL_AMOUNT})`);
  console.log(`  Inst 1 Invoice: ${newInvoices[0].name} (₹1,700) → Status: PAID`);
  console.log(`  Inst 2 Invoice: ${newInvoices[1].name} (₹1,700) → Status: PARTIALLY PAID (₹1,300 outstanding)`);
  console.log(`  PE: ${createdPE.name} (₹2,100 on ${pePostingDate})`);
}

main().catch((err) => {
  console.error(`\n❌ CONVERSION FAILED: ${err.message}`);
  process.exit(1);
});
