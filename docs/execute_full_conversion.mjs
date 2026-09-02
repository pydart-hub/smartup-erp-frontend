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

  const studentId = "STU-SU THP-26-103";
  const customerName = "Mohammed bilal";
  const company = "Smart Up Thopumpadi";
  const enrollmentName = "PEN-12sc state-Thopumpadi 26-27-103";
  const soName = "SAL-ORD-2026-01772";

  const soDoc = await frappeGet(`resource/Sales Order/${soName}`);
  const soItemDetail = soDoc.data.items[0].name;

  // We already created ACC-SINV-2026-12809 for Inst 1 as draft
  // Let's submit it or prepare the list
  const basicSchedule = [
    { label: "Inst 1", amount: 2500, dueDate: "2026-06-03", existingName: "ACC-SINV-2026-12809" },
    { label: "Inst 2", amount: 2500, dueDate: "2026-07-03" },
    { label: "Inst 3", amount: 2500, dueDate: "2026-08-03" },
    { label: "Inst 4", amount: 2500, dueDate: "2026-09-03" },
    { label: "Inst 5", amount: 2500, dueDate: "2026-10-03" },
    { label: "Inst 6", amount: 2500, dueDate: "2026-11-03" },
    { label: "Inst 7", amount: 2500, dueDate: "2026-12-03" },
    { label: "Inst 8", amount: 1500, dueDate: "2027-01-03" },
  ];

  console.log("\n--- Creating & Submitting 8 Basic Invoices with set_posting_time: 1 ---");
  const newInvoices = [];
  for (let i = 0; i < basicSchedule.length; i++) {
    const inst = basicSchedule[i];
    let invName = inst.existingName;

    if (!invName) {
      const invoicePayload = {
        doctype: "Sales Invoice",
        customer: customerName,
        company: company,
        posting_date: "2026-06-03",
        set_posting_time: 1,
        posting_time: "10:00:00",
        due_date: inst.dueDate,
        student: studentId,
        custom_academic_year: "2026-2027",
        debit_to: "Debtors - SU THP",
        items: [
          {
            item_code: "12th Science State Tuition Fee",
            item_name: "12th Science State Tuition Fee",
            description: `${inst.label} — 12th Science State Tuition Fee`,
            qty: 1,
            rate: inst.amount,
            amount: inst.amount,
            sales_order: soName,
            so_detail: soItemDetail
          }
        ]
      };

      const invRes = await frappePost("resource/Sales Invoice", invoicePayload);
      if (!invRes.data) {
        console.error(`Failed to create ${inst.label}:`, JSON.stringify(invRes, null, 2));
        return;
      }
      invName = invRes.data.name;
    }

    const submitInv = await frappePut(`resource/Sales Invoice/${invName}`, { docstatus: 1 });
    console.log(`Created & Submitted Invoice ${inst.label}: ${invName} (₹${inst.amount}, due ${inst.dueDate})`);
    newInvoices.push({ ...inst, name: invName });
  }

  console.log("\n--- Re-linking 4 Payment Entries (Zero Change to Date or Mode) ---");
  const defaultReceivable = "Debtors - SU THP";
  const paidToCash = "Cash - SU THP";
  const paidToBank = "Razorpay - SU THP";
  const paidToCoFee = "CoFee - SU THP";

  const newPEConfigs = [
    {
      posting_date: "2026-06-03",
      mode_of_payment: "Cash",
      paid_amount: 3300,
      paid_to: paidToCash,
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
      paid_to: paidToCash,
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
      paid_to: paidToBank,
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
      paid_to: paidToCoFee,
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
      console.log(`Submitted Payment Entry ${peName}:`, submitPe.data ? "Success" : submitPe);
    } else {
      console.error("Error creating PE:", JSON.stringify(createPe, null, 2));
    }
  }

  // Step 7: Update Program Enrollment
  console.log("\n--- Updating Program Enrollment ---");
  const updatePE = await frappePut(`resource/Program Enrollment/${enrollmentName}`, {
    custom_plan: "Basic",
    custom_fee_structure: "SU THP-12th Science State-Basic-8",
    custom_no_of_instalments: "8"
  });
  console.log("Program Enrollment updated:", updatePE.data ? "Success" : updatePE);

  console.log("\n=== ALL COMPLETED SUCCESSFULLY ===");
}

run();
