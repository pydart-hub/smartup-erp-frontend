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
  const studentId = "STU-SU FKO-26-140"; // RIYAN M THAHAR
  console.log(`=== RECONCILING STUDENT: RIYAN M THAHAR (${studentId}) ===`);

  // 1. Cancel any active Payment Entries for ₹500
  const peList = await frappeGet(
    `resource/Payment Entry?filters=${encodeURIComponent(
      JSON.stringify([
        ["party", "=", "RIYAN M THAHAR"],
        ["paid_amount", "=", 500],
        ["docstatus", "=", 1],
      ])
    )}`
  );

  for (const pe of peList) {
    await safeCancel(`resource/Payment Entry/${pe.name}`);
  }

  // 2. Cancel all active Sales Invoices for Sept, Oct, Nov due dates
  const dueDates = ["2026-09-18", "2026-10-18", "2026-11-18"];
  for (const dd of dueDates) {
    const activeInvs = await frappeGet(
      `resource/Sales Invoice?filters=${encodeURIComponent(
        JSON.stringify([
          ["customer", "=", "RIYAN M THAHAR"],
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

  // Fetch original template document from cancelled invoice to copy SO details
  const searchOld = await frappeGet(
    `resource/Sales Invoice?filters=${encodeURIComponent(
      JSON.stringify([
        ["customer", "=", "RIYAN M THAHAR"],
        ["due_date", "=", "2026-09-18"],
      ])
    )}&limit_page_length=1`
  );
  const templateDoc = await frappeGet(`resource/Sales Invoice/${searchOld[0].name}`);

  // 3. Re-create Invoices 5..7 with matching payment_schedule
  const invConfigs = [
    { dueDate: "2026-09-18", rate: 2500, key: "ACC-SINV-2026-07751" },
    { dueDate: "2026-10-18", rate: 2500, key: "ACC-SINV-2026-07752" },
    { dueDate: "2026-11-18", rate: 1600, key: "ACC-SINV-2026-07753" },
  ];

  const newInvoiceMap = {};
  const firstItem = templateDoc.items[0];

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
    console.log(`Re-created Invoice for ${cfg.dueDate} => ${submitted.name} | Rate: ₹${cfg.rate} | Outstanding: ₹${submitted.outstanding_amount}`);
    newInvoiceMap[cfg.key] = submitted.name;
  }

  // 4. Re-create Payment Entry with EXACT SAME DATE, MODE, and AMOUNT
  console.log("\n=== RE-CREATING PAYMENT ENTRY (KEEPING DATE & MODE UNCHANGED) ===");
  const targetInvName = newInvoiceMap["ACC-SINV-2026-07751"];
  const targetInvDoc = await frappeGet(`resource/Sales Invoice/${encodeURIComponent(targetInvName)}`);

  const pePayload = {
    doctype: "Payment Entry",
    payment_type: "Receive",
    company: "Smart Up Fortkochi",
    posting_date: "2026-09-02",
    mode_of_payment: "Cash",
    party_type: "Customer",
    party: "RIYAN M THAHAR",
    paid_from: "Debtors - SU FKO",
    paid_to: "Cash - SU FKO",
    paid_amount: 500,
    received_amount: 500,
    target_exchange_rate: 1,
    reference_no: "CASH-1788335870864",
    reference_date: "2026-09-02",
    remarks: `Amount INR 500.0 received from RIYAN M THAHAR\nTransaction reference no CASH-1788335870864 dated 2026-09-02\nAmount INR 500.0 against Sales Invoice ${targetInvName}`,
    references: [
      {
        reference_doctype: "Sales Invoice",
        reference_name: targetInvName,
        total_amount: targetInvDoc.grand_total,
        outstanding_amount: targetInvDoc.grand_total,
        allocated_amount: 500,
      },
    ],
  };

  const createdPE = await frappePost("resource/Payment Entry", pePayload);
  const subPE = await frappePut(`resource/Payment Entry/${encodeURIComponent(createdPE.name)}`, { docstatus: 1 });
  console.log(
    `Submitted PE => ${subPE.name} | Date: ${subPE.posting_date} | Mode: ${subPE.mode_of_payment} | Paid: ₹${subPE.paid_amount}`
  );

  // 5. Verification
  console.log("\n=== VERIFICATION FOR RIYAN M THAHAR ===");
  const allSIRes = await frappeGet(
    `resource/Sales Invoice?filters=${encodeURIComponent(
      JSON.stringify([
        ["customer", "=", "RIYAN M THAHAR"],
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
