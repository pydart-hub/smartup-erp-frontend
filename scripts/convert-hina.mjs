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

async function main() {
  console.log("🚀 RESUMING / EXECUTING CONVERSION FOR HINA RABBANI KN");
  console.log("=".repeat(70));
  
  const STUDENT_ID = "STU-SU ERV-26-218";
  const CUSTOMER = "HINA RABBANI KN";
  const COMPANY = "Smart Up Eraveli";
  const ITEM_CODE = "9th State Tuition Fee";
  const ACADEMIC_YEAR = "2026-2027";
  
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
  
  const pePostingDate = "2026-06-03";
  const pePaidAmount = 2100;
  const peMode = "Cash";
  const peRefNo = "CASH-1780492029698";
  
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
    soName = createdSO.name;
    console.log(`  ✓ Created & Submitted Sales Order: ${soName}`);
  }
  
  // Fetch submitted SO to get the item detail row name (so_detail)
  const submittedSO = await apiCall("GET", `/api/resource/Sales Order/${soName}`);
  const soDetailRow = submittedSO.items[0].name;
  
  // Check existing Invoices for student
  console.log("\n🧾 Step 2: Checking Sales Invoices...");
  const existingInvoices = await apiCall(
    "GET",
    `/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([["student", "=", STUDENT_ID], ["docstatus", "=", 1]]))}&order_by=due_date asc`
  );
  
  const newInvoices = [];
  if (existingInvoices && existingInvoices.length === 8) {
    console.log(`  ✓ Found all 8 submitted Sales Invoices`);
    for (let i = 0; i < existingInvoices.length; i++) {
      newInvoices.push({ ...TARGET_SCHEDULE[i], name: existingInvoices[i].name });
    }
  } else {
    // Delete any partial invoices if count != 8
    for (const inv of (existingInvoices || [])) {
      await apiCall("POST", "/api/method/frappe.client.cancel", { doctype: "Sales Invoice", name: inv.name });
      await apiCall("DELETE", `/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}`);
    }
    
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
  }
  
  // Step 3: Check / Create Payment Entry
  console.log("\n💳 Step 3: Checking / Creating Payment Entry...");
  const existingPEs = await apiCall(
    "GET",
    `/api/resource/Payment Entry?filters=${encodeURIComponent(JSON.stringify([["party", "=", CUSTOMER], ["docstatus", "=", 1]]))}`
  );
  
  let peName;
  if (existingPEs && existingPEs.length > 0) {
    peName = existingPEs[0].name;
    console.log(`  ✓ Found existing submitted Payment Entry: ${peName}`);
  } else {
    const pePayload = {
      doctype: "Payment Entry",
      payment_type: "Receive",
      party_type: "Customer",
      party: CUSTOMER,
      party_name: CUSTOMER,
      company: COMPANY,
      posting_date: pePostingDate, // 2026-06-03
      mode_of_payment: peMode,     // Cash
      reference_no: peRefNo,       // CASH-1780492029698
      reference_date: pePostingDate,
      paid_amount: pePaidAmount,   // 2100
      received_amount: pePaidAmount,
      target_exchange_rate: 1,
      paid_from: "Debtors - SU ERV",
      paid_to: "Cash - SU ERV",
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
    peName = createdPE.name;
    console.log(`  ✓ Created & Submitted PE (${peName}): ₹2,100 (₹1,700 to Inst 1, ₹400 to Inst 2)`);
  }
  
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
        custom_fee_structure: "SU ERV-9th State-Basic-8",
      },
    });
    console.log(`  ✓ Updated Program Enrollment ${peList[0].name}`);
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("🎉 CONVERSION COMPLETED SUCCESSFULLY FOR HINA RABBANI KN!");
  console.log("=".repeat(70));
  console.log(`Summary:`);
  console.log(`  Sales Order: ${soName} (Total: ₹${TOTAL_AMOUNT})`);
  console.log(`  Inst 1 Invoice: ${newInvoices[0].name} (₹1,700) → Status: PAID`);
  console.log(`  Inst 2 Invoice: ${newInvoices[1].name} (₹1,700) → Status: PARTIALLY PAID (₹1,300 outstanding)`);
  console.log(`  PE: ${peName} (₹2,100 on ${pePostingDate})`);
}

main().catch((err) => {
  console.error(`\n❌ CONVERSION FAILED: ${err.message}`);
  process.exit(1);
});
