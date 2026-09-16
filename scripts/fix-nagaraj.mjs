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
  const studentId = "STU-SU FKO-26-079"; // NAGARAJ KP
  console.log(`=== RECONCILING STUDENT: NAGARAJ KP (${studentId}) ===`);

  // Step 1: Cancel active Sales Invoices for due dates 2026-10-15 and 2027-01-15
  const dueDates = ["2026-10-15", "2027-01-15"];
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
  const templateDoc = await frappeGet(`resource/Sales Invoice/ACC-SINV-2026-04744`);
  const firstItem = templateDoc.items[0];

  // Step 2: Re-create Invoices 3 & 4 with matching payment_schedule
  const invConfigs = [
    { dueDate: "2026-10-15", rate: 3800 },
    { dueDate: "2027-01-15", rate: 0 },
  ];

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
  }

  // Step 3: Verification
  console.log("\n=== VERIFICATION FOR NAGARAJ KP ===");
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
