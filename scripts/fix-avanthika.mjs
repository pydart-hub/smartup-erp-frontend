import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_FRAPPE_URL || "https://smartup.m.frappe.cloud";
const apiKey = process.env.FRAPPE_API_KEY || "03330270e330d49";
const apiSecret = process.env.FRAPPE_API_SECRET || "9c2261ae11ac2d2";

const headers = {
  Authorization: `token ${apiKey}:${apiSecret}`,
  "Content-Type": "application/json",
};

async function fetchRetry(endpoint, options = {}, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(`${url}/api/${endpoint}`, { headers, ...options });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${options.method || "GET"} ${endpoint} (${res.status}): ${text.slice(0, 300)}`);
      }
      return (await res.json()).data;
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
}

async function frappeGet(path) {
  return fetchRetry(path, { method: "GET" });
}

async function frappePost(path, body) {
  return fetchRetry(path, { method: "POST", body: JSON.stringify(body) });
}

async function frappePut(path, body) {
  return fetchRetry(path, { method: "PUT", body: JSON.stringify(body) });
}

async function safeCancel(path) {
  try {
    const doc = await frappeGet(path);
    if (doc.docstatus === 1) {
      await frappePut(path, { docstatus: 2 });
      console.log(`Cancelled: ${path}`);
    }
  } catch (e) {
    console.log(`Note for ${path}: ${e.message}`);
  }
}

async function main() {
  const studentId = "STU-SU FKO-26-081"; // AVANTHIKA ARUN
  console.log(`=== RECONCILING STUDENT: AVANTHIKA ARUN (${studentId}) ===`);

  // Step 1: Cancel Payment Entries ACC-PAY-2026-05916 and ACC-PAY-2026-06699 (which link to invoice 3)
  const peNames = ["ACC-PAY-2026-05916", "ACC-PAY-2026-06699"];
  const peDocs = [];
  for (const peName of peNames) {
    const peDoc = await frappeGet(`resource/Payment Entry/${peName}`);
    peDocs.push(peDoc);
    console.log(`Cancelling Payment Entry ${peName}...`);
    await safeCancel(`resource/Payment Entry/${peName}`);
  }

  // Step 2: Cancel active Sales Invoices for due dates 2026-06-15, 2026-07-15, 2026-08-15, 2026-09-15, 2026-10-15, 2026-11-15
  const dueDates = ["2026-06-15", "2026-07-15", "2026-08-15", "2026-09-15", "2026-10-15", "2026-11-15"];
  for (const dd of dueDates) {
    const activeInvs = await frappeGet(
      `resource/Sales Invoice?filters=${encodeURIComponent(
        JSON.stringify([
          ["student", "=", studentId],
          ["due_date", "=", dd],
          ["docstatus", "=", 1],
        ])
      )}`
    );
    for (const inv of activeInvs) {
      console.log(`Cancelling active invoice for due date ${dd}: ${inv.name}`);
      await safeCancel(`resource/Sales Invoice/${inv.name}`);
    }
  }

  // Fetch template invoice document
  const templateDoc = await frappeGet(`resource/Sales Invoice/ACC-SINV-2026-04780`);
  const firstItem = templateDoc.items[0];

  // Step 3: Re-create Invoices 3..8 with matching payment_schedule
  const invConfigs = [
    { dueDate: "2026-06-15", rate: 2700 },
    { dueDate: "2026-07-15", rate: 2500 },
    { dueDate: "2026-08-15", rate: 2500 },
    { dueDate: "2026-09-15", rate: 2500 },
    { dueDate: "2026-10-15", rate: 2200 },
    { dueDate: "2026-11-15", rate: 0 },
  ];

  const createdInvs = [];

  for (const cfg of invConfigs) {
    const newPayload = {
      doctype: "Sales Invoice",
      customer: templateDoc.customer,
      company: templateDoc.company,
      student: templateDoc.student,
      custom_academic_year: templateDoc.custom_academic_year,
      set_posting_time: 1,
      posting_date: cfg.dueDate,
      posting_time: templateDoc.posting_time || "12:00:00",
      due_date: cfg.dueDate,
      is_return: 0,
      ignore_pricing_rule: cfg.rate === 0 ? 1 : 0,
      items: [
        {
          item_code: firstItem.item_code,
          item_name: firstItem.item_name,
          description: firstItem.description,
          qty: 1,
          rate: cfg.rate,
          amount: cfg.rate,
          ...(cfg.rate === 0 ? { price_list_rate: 0, discount_percentage: 100 } : {}),
          uom: firstItem.uom || "Nos",
          income_account: firstItem.income_account,
          cost_center: firstItem.cost_center,
        },
      ],
      payment_schedule: [
        {
          due_date: cfg.dueDate,
          invoice_portion: 100,
          payment_amount: cfg.rate,
        },
      ],
    };

    const created = await frappePost("resource/Sales Invoice", newPayload);
    const submitted = await frappePut(`resource/Sales Invoice/${encodeURIComponent(created.name)}`, { docstatus: 1 });
    console.log(`Re-created Invoice for ${cfg.dueDate} => ${submitted.name} | Rate: ₹${cfg.rate} | Schedule: ₹${cfg.rate}`);
    createdInvs.push(submitted);
  }

  // Step 4: Re-create Payment Entries allocating to new Invoice 3 (2026-06-15)
  const newInv3 = createdInvs.find((i) => i.due_date === "2026-06-15");
  for (const peDoc of peDocs) {
    const newPePayload = {
      doctype: "Payment Entry",
      payment_type: peDoc.payment_type,
      posting_date: peDoc.posting_date,
      company: peDoc.company,
      mode_of_payment: peDoc.mode_of_payment,
      party_type: peDoc.party_type,
      party: peDoc.party,
      paid_from: peDoc.paid_from,
      paid_to: peDoc.paid_to,
      paid_amount: peDoc.paid_amount,
      received_amount: peDoc.received_amount,
      target_exchange_rate: 1,
      reference_no: peDoc.reference_no,
      reference_date: peDoc.reference_date,
      references: [
        {
          reference_doctype: "Sales Invoice",
          reference_name: newInv3.name,
          allocated_amount: peDoc.paid_amount,
        },
      ],
    };

    const createdPE = await frappePost("resource/Payment Entry", newPePayload);
    const submittedPE = await frappePut(`resource/Payment Entry/${encodeURIComponent(createdPE.name)}`, { docstatus: 1 });
    console.log(`Re-created Payment Entry => ${submittedPE.name} | Amount: ₹${submittedPE.paid_amount} | Date: ${submittedPE.posting_date} | Mode: ${submittedPE.mode_of_payment} | Linked to: ${newInv3.name}`);
  }

  // Step 5: Verification
  console.log("\n=== VERIFICATION FOR AVANTHIKA ARUN ===");
  const allSIRes = await frappeGet(
    `resource/Sales Invoice?filters=${encodeURIComponent(
      JSON.stringify([
        ["student", "=", studentId],
        ["docstatus", "=", 1],
      ])
    )}&fields=${encodeURIComponent(JSON.stringify(["name", "due_date", "grand_total", "outstanding_amount", "status"]))}&order_by=due_date asc`
  );

  let totalInvoiced = 0;
  let totalOut = 0;
  for (const si of allSIRes) {
    totalInvoiced += si.grand_total;
    totalOut += si.outstanding_amount;
    console.log(`- ${si.name} | Due: ${si.due_date} | Rate: ₹${si.grand_total} | Outstanding: ₹${si.outstanding_amount} | Status: ${si.status}`);
  }

  console.log("\n--- FINANCIAL SUMMARY ---");
  console.log(`Total Invoiced:    ₹${totalInvoiced.toLocaleString("en-IN")}`);
  console.log(`Total Paid:        ₹${(totalInvoiced - totalOut).toLocaleString("en-IN")}`);
  console.log(`Total Outstanding: ₹${totalOut.toLocaleString("en-IN")}`);
}

main().catch((err) => console.error("EXECUTION ERROR:", err));
