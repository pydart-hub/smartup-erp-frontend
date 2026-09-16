import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_FRAPPE_URL || "https://smartup.m.frappe.cloud";
const apiKey = process.env.FRAPPE_API_KEY || "03330270e330d49";
const apiSecret = process.env.FRAPPE_API_SECRET || "9c2261ae11ac2d2";

const headers = {
  Authorization: `token ${apiKey}:${apiSecret}`,
  "Content-Type": "application/json",
};

async function frappeGet(path) {
  const res = await fetch(`${url}/api/${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return (await res.json()).data;
}

async function frappePost(path, body) {
  const res = await fetch(`${url}/api/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path}: ${res.status} - ${text}`);
  }
  return (await res.json()).data;
}

async function frappePut(path, body) {
  const res = await fetch(`${url}/api/${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PUT ${path}: ${res.status} - ${text}`);
  }
  return (await res.json()).data;
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
  const studentId = "STU-SU FKO-26-132"; // SETHULAKSHMI AS
  console.log(`=== RECONCILING STUDENT: SETHULAKSHMI AS (${studentId}) ===`);

  // 1. Fetch PEs to cancel temporarily
  const peToRecreate = [
    { name: "ACC-PAY-2026-07844", targetInvKey: "ACC-SINV-2026-07139", allocAmount: 4500 },
    { name: "ACC-PAY-2026-07845", targetInvKey: "ACC-SINV-2026-07140", allocAmount: 1400 },
  ];

  const peDocs = [];
  for (const item of peToRecreate) {
    const doc = await frappeGet(`resource/Payment Entry/${item.name}`);
    peDocs.push({ ...item, doc });
    await safeCancel(`resource/Payment Entry/${item.name}`);
  }

  // 2. Re-create Invoices 2..4 with matching payment_schedule
  const invConfigs = [
    { name: "ACC-SINV-2026-07139", dueDate: "2026-08-11", rate: 4500 },
    { name: "ACC-SINV-2026-07140", dueDate: "2026-11-11", rate: 4500 },
    { name: "ACC-SINV-2026-07141", dueDate: "2027-02-11", rate: 700 },
  ];

  const newInvoiceMap = {};

  for (const cfg of invConfigs) {
    const doc = await frappeGet(`resource/Sales Invoice/${encodeURIComponent(cfg.name)}`);

    if (doc.docstatus === 1) {
      console.log(`Cancelling old invoice: ${cfg.name}`);
      await frappePut(`resource/Sales Invoice/${encodeURIComponent(cfg.name)}`, { docstatus: 2 });
    }

    const firstItem = doc.items[0];
    const newPayload = {
      doctype: "Sales Invoice",
      customer: doc.customer,
      company: doc.company,
      student: doc.student,
      custom_academic_year: doc.custom_academic_year,
      set_posting_time: 1,
      posting_date: cfg.dueDate,
      posting_time: doc.posting_time || "12:00:00",
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
          ...(firstItem.so_detail ? { so_detail: firstItem.so_detail } : {}),
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
    console.log(`Re-created ${cfg.name} => ${submitted.name} | Rate: ₹${cfg.rate} | Outstanding: ₹${submitted.outstanding_amount}`);
    newInvoiceMap[cfg.name] = submitted.name;
  }

  // 3. Re-create Payment Entries with EXACT SAME DATE, MODE, and AMOUNTS
  console.log("\n=== RE-CREATING PAYMENT ENTRIES (KEEPING DATE & MODE UNCHANGED) ===");
  for (const peInfo of peDocs) {
    const orig = peInfo.doc;
    const targetInvName = newInvoiceMap[peInfo.targetInvKey];
    const targetInvDoc = await frappeGet(`resource/Sales Invoice/${encodeURIComponent(targetInvName)}`);

    const pePayload = {
      doctype: "Payment Entry",
      payment_type: "Receive",
      company: orig.company,
      posting_date: orig.posting_date,
      mode_of_payment: orig.mode_of_payment,
      party_type: "Customer",
      party: orig.party,
      paid_from: orig.paid_from,
      paid_to: orig.paid_to,
      paid_amount: orig.paid_amount,
      received_amount: orig.received_amount,
      target_exchange_rate: 1,
      reference_no: orig.reference_no,
      reference_date: orig.reference_date,
      remarks: orig.remarks,
      references: [
        {
          reference_doctype: "Sales Invoice",
          reference_name: targetInvName,
          total_amount: targetInvDoc.grand_total,
          outstanding_amount: targetInvDoc.grand_total,
          allocated_amount: peInfo.allocAmount,
        },
      ],
    };

    const createdPE = await frappePost("resource/Payment Entry", pePayload);
    const subPE = await frappePut(`resource/Payment Entry/${encodeURIComponent(createdPE.name)}`, { docstatus: 1 });
    console.log(
      `Submitted PE ${orig.name} => ${subPE.name} | Date: ${subPE.posting_date} | Mode: ${subPE.mode_of_payment} | Paid: ₹${subPE.paid_amount}`
    );
  }

  // 4. Verification
  console.log("\n=== VERIFICATION FOR SETHULAKSHMI AS ===");
  const allSIRes = await frappeGet(
    `resource/Sales Invoice?filters=${encodeURIComponent(
      JSON.stringify([
        ["customer", "=", peDocs[0].doc.party],
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
