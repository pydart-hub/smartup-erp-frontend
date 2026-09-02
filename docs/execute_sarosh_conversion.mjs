import fs from "fs";
import path from "path";

async function run() {
  const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
  const urlMatch = env.match(/NEXT_PUBLIC_FRAPPE_URL=(.*)/);
  const keyMatch = env.match(/FRAPPE_API_KEY=(.*)/);
  const secretMatch = env.match(/FRAPPE_API_SECRET=(.*)/);
  
  const url = urlMatch ? urlMatch[1].trim() : "";
  const key = keyMatch ? keyMatch[1].trim() : "";
  const secret = secretMatch ? secretMatch[1].trim() : "";
  const auth = `token ${key}:${secret}`;

  const headers = {
    Authorization: auth,
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  async function frappeGet(pathStr, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${url}/api/${pathStr}${qs ? '?' + qs : ''}`, {
      headers,
      cache: "no-store",
    });
    return res.json();
  }

  async function frappePut(pathStr, body) {
    const res = await fetch(`${url}/api/${pathStr}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body)
    });
    return res.json();
  }

  async function frappePost(pathStr, body) {
    const res = await fetch(`${url}/api/${pathStr}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    return res.json();
  }

  console.log("=== STARTING FEE RESTRUCTURING FOR SAROSH VS (OPTION B: ₹11,800) ===");

  const studentId = "STU-SU THP-26-149";
  const customerName = "Sarosh VS";
  const company = "Smart Up Thopumpadi";
  const oldSoName = "SAL-ORD-2026-01558";

  // Existing Payment Entries info (strict preserve dates and modes)
  const peList = [
    { name: "ACC-PAY-2026-06690", date: "2026-07-13", mode: "Cash", amount: 2000, refNo: "CASH-1783954770199", refDate: "2026-07-13", paidTo: "Cash - SU THP" },
    { name: "ACC-PAY-2026-08026", date: "2026-08-28", mode: "Bank Transfer", amount: 2000, refNo: "128623089565", refDate: "2026-08-28", paidTo: "STEMSPHERE LEARNING LLP - SU THP" }
  ];

  // Old invoices to cancel
  const oldInvoices = [
    "ACC-SINV-2026-11302",
    "ACC-SINV-2026-11303",
    "ACC-SINV-2026-11304",
    "ACC-SINV-2026-11305",
    "ACC-SINV-2026-11306",
    "ACC-SINV-2026-11307",
    "ACC-SINV-2026-11308",
    "ACC-SINV-2026-11309"
  ];

  // Step 1: Cancel Payment Entries first so invoices can be cancelled
  console.log("\n--- Step 1: Cancelling Payment Entries (docstatus -> 2) ---");
  for (const pe of peList) {
    console.log(`Cancelling ${pe.name}...`);
    const res = await frappePut(`resource/Payment Entry/${pe.name}`, { docstatus: 2 });
    console.log(`Result for ${pe.name}:`, res.data ? "Success" : res);
  }

  // Step 2: Cancel Old Invoices
  console.log("\n--- Step 2: Cancelling Old Invoices (docstatus -> 2) ---");
  for (const inv of oldInvoices) {
    console.log(`Cancelling ${inv}...`);
    const res = await frappePut(`resource/Sales Invoice/${inv}`, { docstatus: 2 });
    console.log(`Result for ${inv}:`, res.data ? "Success" : res);
  }

  // Step 3: Cancel Old Sales Order
  console.log("\n--- Step 3: Cancelling Old Sales Order (docstatus -> 2) ---");
  const cancelSo = await frappePut(`resource/Sales Order/${oldSoName}`, { docstatus: 2 });
  console.log(`Result for ${oldSoName}:`, cancelSo.data ? "Success" : cancelSo);

  // Step 4: Create New Sales Order for ₹11,800 (8 Instalments)
  console.log("\n--- Step 4: Creating New Sales Order for ₹11,800 ---");
  const newSoPayload = {
    customer: customerName,
    company: company,
    transaction_date: "2026-07-13",
    delivery_date: "2026-07-13",
    order_type: "Sales",
    items: [
      {
        item_code: "11th Science State Tuition Fee",
        qty: 8,
        rate: 1475, // 11800 / 8 = 1475 average
        amount: 11800,
        description: "11th Science State Tuition Fee (Excluding Maths: Total ₹11,800)"
      }
    ],
    custom_academic_year: "2026-2027",
    student: studentId,
    custom_no_of_instalments: "8",
    custom_plan: "Basic"
  };

  const createSoRes = await frappePost("resource/Sales Order", newSoPayload);
  const newSo = createSoRes.data;
  console.log("Created Sales Order:", newSo.name);

  // Submit new Sales Order
  const submitSoRes = await frappePut(`resource/Sales Order/${newSo.name}`, { docstatus: 1 });
  console.log("Submitted Sales Order:", submitSoRes.data ? "Success" : submitSoRes);

  const soItemDetail = submitSoRes.data?.items?.[0]?.name;

  // Step 5: Option B Schedule (7 x ₹1,500 + 1 x ₹1,300 = ₹11,800)
  console.log("\n--- Step 5: Creating 8 Sales Invoices for Option B ---");
  const optionBSchedule = [
    { label: "Inst 1", amount: 1500, dueDate: "2026-07-13" },
    { label: "Inst 2", amount: 1500, dueDate: "2026-08-13" },
    { label: "Inst 3", amount: 1500, dueDate: "2026-09-13" },
    { label: "Inst 4", amount: 1500, dueDate: "2026-10-13" },
    { label: "Inst 5", amount: 1500, dueDate: "2026-11-13" },
    { label: "Inst 6", amount: 1500, dueDate: "2026-12-13" },
    { label: "Inst 7", amount: 1500, dueDate: "2027-01-13" },
    { label: "Inst 8", amount: 1300, dueDate: "2027-02-13" },
  ];

  const newInvoices = [];
  for (let i = 0; i < optionBSchedule.length; i++) {
    const inst = optionBSchedule[i];
    const invoicePayload = {
      doctype: "Sales Invoice",
      customer: customerName,
      company: company,
      posting_date: "2026-07-13",
      set_posting_time: 1,
      posting_time: "10:00:00",
      due_date: inst.dueDate,
      student: studentId,
      custom_academic_year: "2026-2027",
      debit_to: "Debtors - SU THP",
      items: [
        {
          item_code: "11th Science State Tuition Fee",
          item_name: "11th Science State Tuition Fee",
          description: `${inst.label} — 11th Science State Tuition Fee`,
          qty: 1,
          rate: inst.amount,
          amount: inst.amount,
          sales_order: newSo.name,
          so_detail: soItemDetail
        }
      ]
    };

    const invRes = await frappePost("resource/Sales Invoice", invoicePayload);
    if (!invRes.data) {
      console.error(`Failed to create ${inst.label}:`, JSON.stringify(invRes, null, 2));
      return;
    }
    const invName = invRes.data.name;
    const submitInv = await frappePut(`resource/Sales Invoice/${invName}`, { docstatus: 1 });
    console.log(`Created & Submitted Invoice ${inst.label}: ${invName} (₹${inst.amount}, due ${inst.dueDate})`);
    newInvoices.push({ ...inst, name: invName });
  }

  // Step 6: Recreate Payment Entries with exact preserved Dates, Modes, References
  console.log("\n--- Step 6: Recreating Payment Entries with Exact Preserved Dates & Modes ---");
  // Total to allocate:
  // PE 1: 2026-07-13, Cash, ₹2,000 -> Inst 1 (₹1,500) + Inst 2 (₹500)
  // PE 2: 2026-08-28, Bank Transfer, ₹2,000 -> Inst 2 (₹1,000) + Inst 3 (₹1,000)

  const defaultReceivable = "Debtors - SU THP";

  const newPEConfigs = [
    {
      posting_date: "2026-07-13",
      mode_of_payment: "Cash",
      paid_amount: 2000,
      paid_to: "Cash - SU THP",
      reference_no: "CASH-1783954770199",
      reference_date: "2026-07-13",
      references: [
        {
          reference_doctype: "Sales Invoice",
          reference_name: newInvoices[0].name, // Inst 1 (₹1,500)
          total_amount: 1500,
          outstanding_amount: 1500,
          allocated_amount: 1500
        },
        {
          reference_doctype: "Sales Invoice",
          reference_name: newInvoices[1].name, // Inst 2 (₹1,500)
          total_amount: 1500,
          outstanding_amount: 1500,
          allocated_amount: 500
        }
      ]
    },
    {
      posting_date: "2026-08-28",
      mode_of_payment: "Bank Transfer",
      paid_amount: 2000,
      paid_to: "STEMSPHERE LEARNING LLP - SU THP",
      reference_no: "128623089565",
      reference_date: "2026-08-28",
      references: [
        {
          reference_doctype: "Sales Invoice",
          reference_name: newInvoices[1].name, // Inst 2
          total_amount: 1500,
          outstanding_amount: 1000,
          allocated_amount: 1000
        },
        {
          reference_doctype: "Sales Invoice",
          reference_name: newInvoices[2].name, // Inst 3 (₹1,500)
          total_amount: 1500,
          outstanding_amount: 1500,
          allocated_amount: 1000
        }
      ]
    }
  ];

  for (let i = 0; i < newPEConfigs.length; i++) {
    const config = newPEConfigs[i];
    const pePayload = {
      doctype: "Payment Entry",
      payment_type: "Receive",
      party_type: "Customer",
      party: customerName,
      party_name: customerName,
      company: company,
      posting_date: config.posting_date,
      mode_of_payment: config.mode_of_payment,
      paid_amount: config.paid_amount,
      received_amount: config.paid_amount,
      paid_from: defaultReceivable,
      paid_to: config.paid_to,
      paid_from_account_currency: "INR",
      paid_to_account_currency: "INR",
      target_exchange_rate: 1,
      reference_no: config.reference_no,
      reference_date: config.reference_date,
      references: config.references
    };

    const createPe = await frappePost("resource/Payment Entry", pePayload);
    const peName = createPe.data?.name;
    console.log(`Created Payment Entry: ${peName} (₹${config.paid_amount}, Date: ${config.posting_date}, Mode: ${config.mode_of_payment})`);
    
    if (peName) {
      const submitPe = await frappePut(`resource/Payment Entry/${peName}`, { docstatus: 1 });
      console.log(`Submitted Payment Entry ${peName}:`, submitPe.data ? "Success" : submitPe);
    } else {
      console.error("Error creating PE:", JSON.stringify(createPe, null, 2));
    }
  }

  console.log("\n=== ALL COMPLETED SUCCESSFULLY ===");
}

run();
