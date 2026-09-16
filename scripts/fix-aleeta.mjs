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
  console.log("=== STEP 0: Cleaning test draft if any ===");
  try {
    await safeCancel("resource/Sales Invoice/ACC-SINV-2026-13397");
  } catch {}

  console.log("\n=== STEP 1: Ensuring PEs 8782 and 8783 are cancelled ===");
  await safeCancel("resource/Payment Entry/ACC-PAY-2026-08782");
  await safeCancel("resource/Payment Entry/ACC-PAY-2026-08783");

  console.log("\n=== STEP 2: Cancelling & re-creating Sales Invoices with matching payment_schedule ===");
  const invNames = [
    { name: "ACC-SINV-2026-04267", dueDate: "2026-08-15" },
    { name: "ACC-SINV-2026-04268", dueDate: "2026-09-15" },
    { name: "ACC-SINV-2026-04269", dueDate: "2026-10-15" },
    { name: "ACC-SINV-2026-04270", dueDate: "2026-11-15" },
  ];

  const newInvoiceMap = {};

  for (const inv of invNames) {
    const doc = await frappeGet(`resource/Sales Invoice/${encodeURIComponent(inv.name)}`);

    const postingDate = doc.posting_date || "2026-04-13";

    // Cancel old invoice if submitted
    if (doc.docstatus === 1) {
      console.log(`Cancelling old invoice: ${inv.name}`);
      await frappePut(`resource/Sales Invoice/${encodeURIComponent(inv.name)}`, { docstatus: 2 });
    }

    // Re-create invoice with rate 1775 and matching payment_schedule
    const firstItem = doc.items[0];
    const newDocPayload = {
      doctype: "Sales Invoice",
      customer: doc.customer,
      company: doc.company,
      student: doc.student,
      custom_academic_year: doc.custom_academic_year,
      set_posting_time: 1,
      posting_date: postingDate,
      posting_time: doc.posting_time || "12:00:00",
      due_date: inv.dueDate,
      is_return: 0,
      items: [
        {
          item_code: firstItem.item_code,
          item_name: firstItem.item_name,
          description: firstItem.description,
          qty: 1,
          rate: 1775,
          amount: 1775,
          uom: firstItem.uom || "Nos",
          income_account: firstItem.income_account,
          cost_center: firstItem.cost_center,
          ...(firstItem.sales_order ? { sales_order: firstItem.sales_order } : {}),
          ...(firstItem.so_detail ? { so_detail: firstItem.so_detail } : {}),
        },
      ],
      payment_schedule: [
        {
          due_date: inv.dueDate,
          invoice_portion: 100,
          payment_amount: 1775,
        },
      ],
    };

    const created = await frappePost("resource/Sales Invoice", newDocPayload);
    const submitted = await frappePut(`resource/Sales Invoice/${encodeURIComponent(created.name)}`, {
      docstatus: 1,
    });
    console.log(
      `Re-created ${inv.name} => ${submitted.name} | Rate: 1775 | Status: ${submitted.status} | Outstanding: ₹${submitted.outstanding_amount}`
    );
    newInvoiceMap[inv.name] = submitted.name;
  }

  console.log("\n=== STEP 3: Re-creating Payment Entries with EXACT SAME DATE, MODE, and AMOUNTS ===");

  // Re-create Payment Entry 1 (₹1,775) against new Invoice 5
  const pe1Payload = {
    doctype: "Payment Entry",
    payment_type: "Receive",
    company: "Smart Up Fortkochi",
    posting_date: "2026-09-14",
    mode_of_payment: "Cash",
    party_type: "Customer",
    party: "ALEETA XAVIER",
    paid_from: "Debtors - SU FKO",
    paid_to: "Cash - SU FKO",
    paid_amount: 1775,
    received_amount: 1775,
    target_exchange_rate: 1,
    reference_no: "CASH-1789400312345",
    reference_date: "2026-09-14",
    remarks: `Amount INR 1775.0 received from ALEETA XAVIER\nTransaction reference no CASH-1789400312345 dated 2026-09-14\nAmount INR 1775.0 against Sales Invoice ${newInvoiceMap["ACC-SINV-2026-04267"]}`,
    references: [
      {
        reference_doctype: "Sales Invoice",
        reference_name: newInvoiceMap["ACC-SINV-2026-04267"],
        total_amount: 1775,
        outstanding_amount: 1775,
        allocated_amount: 1775,
      },
    ],
  };

  const newPe1 = await frappePost("resource/Payment Entry", pe1Payload);
  const subPe1 = await frappePut(`resource/Payment Entry/${encodeURIComponent(newPe1.name)}`, {
    docstatus: 1,
  });
  console.log(
    `Submitted PE1: ${subPe1.name} | Paid: ₹${subPe1.paid_amount} | Date: ${subPe1.posting_date} | Mode: ${subPe1.mode_of_payment}`
  );

  // Re-create Payment Entry 2 (₹325) against new Invoice 6
  const pe2Payload = {
    doctype: "Payment Entry",
    payment_type: "Receive",
    company: "Smart Up Fortkochi",
    posting_date: "2026-09-14",
    mode_of_payment: "Cash",
    party_type: "Customer",
    party: "ALEETA XAVIER",
    paid_from: "Debtors - SU FKO",
    paid_to: "Cash - SU FKO",
    paid_amount: 325,
    received_amount: 325,
    target_exchange_rate: 1,
    reference_no: "CASH-1789400363804",
    reference_date: "2026-09-14",
    remarks: `Amount INR 325.0 received from ALEETA XAVIER\nTransaction reference no CASH-1789400363804 dated 2026-09-14\nAmount INR 325.0 against Sales Invoice ${newInvoiceMap["ACC-SINV-2026-04268"]}`,
    references: [
      {
        reference_doctype: "Sales Invoice",
        reference_name: newInvoiceMap["ACC-SINV-2026-04268"],
        total_amount: 1775,
        outstanding_amount: 1775,
        allocated_amount: 325,
      },
    ],
  };

  const newPe2 = await frappePost("resource/Payment Entry", pe2Payload);
  const subPe2 = await frappePut(`resource/Payment Entry/${encodeURIComponent(newPe2.name)}`, {
    docstatus: 1,
  });
  console.log(
    `Submitted PE2: ${subPe2.name} | Paid: ₹${subPe2.paid_amount} | Date: ${subPe2.posting_date} | Mode: ${subPe2.mode_of_payment}`
  );

  console.log("\n=== STEP 4: Final Verification of Updated Invoices ===");
  for (const oldName of invNames.map((i) => i.name)) {
    const newName = newInvoiceMap[oldName];
    const doc = await frappeGet(`resource/Sales Invoice/${encodeURIComponent(newName)}`);
    console.log(
      `${oldName} => ${newName} | Grand Total: ₹${doc.grand_total} | Outstanding: ₹${doc.outstanding_amount} | Status: ${doc.status}`
    );
  }
}

main().catch((err) => console.error("EXECUTION ERROR:", err));
