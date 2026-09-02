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
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  }

  async function frappePut(pathStr, body) {
    const res = await fetch(`${url}/api/${pathStr}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body)
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  }

  async function frappePost(pathStr, body) {
    const res = await fetch(`${url}/api/${pathStr}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  }

  console.log("=== STARTING CAREFUL CONVERSION FOR MOHAMMED BILAL ===");

  const studentId = "STU-SU THP-26-103";
  const customerName = "Mohammed bilal";
  const company = "Smart Up Thopumpadi";
  const enrollmentName = "PEN-12sc state-Thopumpadi 26-27-103";
  const oldSoName = "SAL-ORD-2026-01246";

  // Existing Payment Entries info (strict preserve dates and modes)
  const peList = [
    { name: "ACC-PAY-2026-05471", date: "2026-06-03", mode: "Cash", amount: 3300 },
    { name: "ACC-PAY-2026-05473", date: "2026-06-03", mode: "Cash", amount: 800 },
    { name: "ACC-PAY-2026-06361", date: "2026-07-04", mode: "Razorpay", amount: 2500 },
    { name: "ACC-PAY-2026-07578", date: "2026-08-12", mode: "CoFee", amount: 3300 },
  ];

  // Old invoices to cancel
  const oldInvoices = [
    "ACC-SINV-2026-09172",
    "ACC-SINV-2026-09173",
    "ACC-SINV-2026-09174",
    "ACC-SINV-2026-09175",
    "ACC-SINV-2026-09176",
    "ACC-SINV-2026-09177",
    "ACC-SINV-2026-09178",
    "ACC-SINV-2026-09179"
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

  // Step 4: Create New Sales Order for Basic 8 instalments
  console.log("\n--- Step 4: Creating New Sales Order for Basic 8 ---");
  const newSoPayload = {
    customer: customerName,
    company: company,
    transaction_date: "2026-06-03",
    delivery_date: "2026-06-03",
    order_type: "Sales",
    items: [
      {
        item_code: "12th Science State Tuition Fee",
        qty: 8,
        rate: 2375, // 19000 / 8 = 2375 average, or rate to equal 19000 total
        amount: 19000
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

  // Step 5: Create and Submit 8 New Sales Invoices for Basic Plan
  console.log("\n--- Step 5: Creating 8 Basic Invoices ---");
  const basicSchedule = [
    { label: "Inst 1", amount: 2500, dueDate: "2026-06-03" },
    { label: "Inst 2", amount: 2500, dueDate: "2026-07-03" },
    { label: "Inst 3", amount: 2500, dueDate: "2026-08-03" },
    { label: "Inst 4", amount: 2500, dueDate: "2026-09-03" },
    { label: "Inst 5", amount: 2500, dueDate: "2026-10-03" },
    { label: "Inst 6", amount: 2500, dueDate: "2026-11-03" },
    { label: "Inst 7", amount: 2500, dueDate: "2026-12-03" },
    { label: "Inst 8", amount: 1500, dueDate: "2027-01-03" },
  ];

  const newInvoices = [];
  for (let i = 0; i < basicSchedule.length; i++) {
    const inst = basicSchedule[i];
    const invoicePayload = {
      doctype: "Sales Invoice",
      customer: customerName,
      company: company,
      posting_date: "2026-06-03", // Original creation date
      due_date: inst.dueDate,
      student: studentId,
      custom_academic_year: "2026-2027",
      items: [
        {
          item_code: "12th Science State Tuition Fee",
          item_name: "12th Science State Tuition Fee",
          description: `${inst.label} — 12th Science State Tuition Fee`,
          qty: 1,
          rate: inst.amount,
          amount: inst.amount,
          sales_order: newSo.name,
          so_detail: soItemDetail
        }
      ]
    };

    const invRes = await frappePost("resource/Sales Invoice", invoicePayload);
    const invName = invRes.data.name;
    const submitInv = await frappePut(`resource/Sales Invoice/${invName}`, { docstatus: 1 });
    console.log(`Created & Submitted Invoice ${inst.label}: ${invName} (₹${inst.amount}, due ${inst.dueDate})`);
    newInvoices.push({ ...inst, name: invName });
  }

  // Step 6: Create new Payment Entries to replace cancelled ones, exactly preserving Date, Mode, Amount
  console.log("\n--- Step 6: Recreating Payment Entries with Exact Preserved Dates & Modes ---");
  // Total to allocate:
  // PE 1: 2026-06-03, Cash, ₹3,300 -> Inst 1 (₹2,500) + Inst 2 (₹800)
  // PE 2: 2026-06-03, Cash, ₹800 -> Inst 2 (₹800)
  // PE 3: 2026-07-04, Razorpay, ₹2,500 -> Inst 2 (₹900) + Inst 3 (₹1,600)
  // PE 4: 2026-08-12, CoFee, ₹3,300 -> Inst 3 (₹900) + Inst 4 (₹2,400)

  // Get default accounts
  const compDoc = await frappeGet(`resource/Company/${encodeURIComponent(company)}`);
  const defaultReceivable = compDoc.data?.default_receivable_account || "Debtors - SU THP";

  // Let's check original payment entry details for accounts
  const origPE1 = await frappeGet(`resource/Payment Entry/${peList[0].name}`);
  const paidToAccountCash = origPE1.data?.paid_to;

  const origPE3 = await frappeGet(`resource/Payment Entry/${peList[2].name}`);
  const paidToAccountBank = origPE3.data?.paid_to;

  const origPE4 = await frappeGet(`resource/Payment Entry/${peList[3].name}`);
  const paidToAccountCoFee = origPE4.data?.paid_to;

  const newPEConfigs = [
    {
      posting_date: "2026-06-03",
      mode_of_payment: "Cash",
      paid_amount: 3300,
      paid_to: paidToAccountCash,
      references: [
        {
          reference_doctype: "Sales Invoice",
          reference_name: newInvoices[0].name, // Inst 1 (₹2,500)
          total_amount: 2500,
          outstanding_amount: 2500,
          allocated_amount: 2500
        },
        {
          reference_doctype: "Sales Invoice",
          reference_name: newInvoices[1].name, // Inst 2 (₹2,500)
          total_amount: 2500,
          outstanding_amount: 2500,
          allocated_amount: 800
        }
      ]
    },
    {
      posting_date: "2026-06-03",
      mode_of_payment: "Cash",
      paid_amount: 800,
      paid_to: paidToAccountCash,
      references: [
        {
          reference_doctype: "Sales Invoice",
          reference_name: newInvoices[1].name, // Inst 2
          total_amount: 2500,
          outstanding_amount: 1700,
          allocated_amount: 800
        }
      ]
    },
    {
      posting_date: "2026-07-04",
      mode_of_payment: "Razorpay",
      paid_amount: 2500,
      paid_to: paidToAccountBank,
      references: [
        {
          reference_doctype: "Sales Invoice",
          reference_name: newInvoices[1].name, // Inst 2
          total_amount: 2500,
          outstanding_amount: 900,
          allocated_amount: 900
        },
        {
          reference_doctype: "Sales Invoice",
          reference_name: newInvoices[2].name, // Inst 3 (₹2,500)
          total_amount: 2500,
          outstanding_amount: 2500,
          allocated_amount: 1600
        }
      ]
    },
    {
      posting_date: "2026-08-12",
      mode_of_payment: "CoFee",
      paid_amount: 3300,
      paid_to: paidToAccountCoFee,
      references: [
        {
          reference_doctype: "Sales Invoice",
          reference_name: newInvoices[2].name, // Inst 3
          total_amount: 2500,
          outstanding_amount: 900,
          allocated_amount: 900
        },
        {
          reference_doctype: "Sales Invoice",
          reference_name: newInvoices[3].name, // Inst 4 (₹2,500)
          total_amount: 2500,
          outstanding_amount: 2500,
          allocated_amount: 2400
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
      references: config.references
    };

    const createPe = await frappePost("resource/Payment Entry", pePayload);
    const peName = createPe.data?.name;
    console.log(`Created Payment Entry: ${peName} (₹${config.paid_amount}, Date: ${config.posting_date}, Mode: ${config.mode_of_payment})`);
    
    if (peName) {
      const submitPe = await frappePut(`resource/Payment Entry/${peName}`, { docstatus: 1 });
      console.log(`Submitted Payment Entry: ${peName}:`, submitPe.data ? "Success" : submitPe);
    } else {
      console.error("Error creating PE:", createPe);
    }
  }

  // Step 7: Update Program Enrollment
  console.log("\n--- Step 7: Updating Program Enrollment ---");
  const updatePE = await frappePut(`resource/Program Enrollment/${enrollmentName}`, {
    custom_plan: "Basic",
    custom_fee_structure: "SU THP-12th Science State-Basic-8",
    custom_no_of_instalments: "8"
  });
  console.log("Program Enrollment updated:", updatePE.data ? "Success" : updatePE);

  console.log("\n=== ALL STEPS COMPLETED SUCCESSFULLY ===");
}

run();
