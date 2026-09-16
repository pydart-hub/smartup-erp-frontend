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
  const studentId = "STU-SU FKO-26-047"; // EVA MARTIN
  console.log(`=== RECONCILING STUDENT: EVA MARTIN (${studentId}) ===`);

  // Step 1: Cancel Payment Entry ACC-PAY-2026-06109 (which links to invoice 3)
  const peName = "ACC-PAY-2026-06109";
  const peDoc = await frappeGet(`resource/Payment Entry/${peName}`);
  console.log(`Cancelling Payment Entry ${peName}...`);
  await safeCancel(`resource/Payment Entry/${peName}`);

  // Step 2: Cancel active Sales Invoices for due dates 2026-08-15, 2026-10-15, 2026-12-15, 2027-02-15
  const dueDates = ["2026-08-15", "2026-10-15", "2026-12-15", "2027-02-15"];
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

  // Fetch template invoice document (Invoice 1 or old Invoice 3)
  const templateDoc = await frappeGet(`resource/Sales Invoice/ACC-SINV-2026-03548`);
  const firstItem = templateDoc.items[0];

  // Step 3: Re-create Invoices 3..6 with matching payment_schedule
  const invConfigs = [
    { dueDate: "2026-08-15", rate: 1600 },
    { dueDate: "2026-10-15", rate: 3200 },
    { dueDate: "2026-12-15", rate: 3200 },
    { dueDate: "2027-02-15", rate: 2100 },
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
      items: [
        {
          item_code: firstItem.item_code,
          item_name: firstItem.item_name,
          description: firstItem.description,
          qty: 1,
          rate: cfg.rate,
          amount: cfg.rate,
          uom: firstItem.uom || "Nos",
          income_account: firstItem.income_account,
          cost_center: firstItem.cost_center,
          ...(firstItem.sales_order ? { sales_order: firstItem.sales_order } : {}),
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

  // Step 4: Re-create Payment Entry ACC-PAY-2026-06109 allocating to new Invoice 3 (2026-08-15)
  const newInv3 = createdInvs.find((i) => i.due_date === "2026-08-15");
  const newPePayload = {
    doctype: "Payment Entry",
    payment_type: peDoc.payment_type,
    posting_date: peDoc.posting_date, // 2026-06-25
    company: peDoc.company,
    mode_of_payment: peDoc.mode_of_payment, // Cash
    party_type: peDoc.party_type,
    party: peDoc.party,
    paid_from: peDoc.paid_from,
    paid_to: peDoc.paid_to,
    paid_amount: peDoc.paid_amount, // 1600
    received_amount: peDoc.received_amount, // 1600
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

  // Step 5: Verification
  console.log("\n=== VERIFICATION FOR EVA MARTIN ===");
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
