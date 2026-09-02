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

  const customerName = "Mohammed bilal";
  const company = "Smart Up Thopumpadi";
  const enrollmentName = "PEN-12sc state-Thopumpadi 26-27-103";

  // Check the invoices created for this customer
  const invoicesRes = await frappeGet("resource/Sales Invoice", {
    filters: JSON.stringify([
      ["customer", "=", customerName],
      ["docstatus", "=", 1]
    ]),
    fields: JSON.stringify(["name", "posting_date", "due_date", "grand_total", "outstanding_amount"]),
    order_by: "due_date asc"
  });
  console.log("Current active submitted invoices:", JSON.stringify(invoicesRes.data, null, 2));

  const newInvoices = invoicesRes.data;
  if (!newInvoices || newInvoices.length < 4) {
    console.error("Missing expected invoices!");
    return;
  }

  // 1. Create Payment Entry 3 (Razorpay, 2026-07-04, ₹2,500)
  // Preserving: reference_no: "pay_T9OaSYIqzc1iXO", reference_date: "2026-07-04"
  console.log("\n--- Creating PE 3 (Razorpay) ---");
  const pe3Payload = {
    doctype: "Payment Entry",
    payment_type: "Receive",
    party_type: "Customer",
    party: customerName,
    party_name: customerName,
    company: company,
    posting_date: "2026-07-04",
    mode_of_payment: "Razorpay",
    paid_amount: 2500,
    received_amount: 2500,
    paid_from: "Debtors - SU THP",
    paid_to: "Razorpay - SU THP",
    paid_from_account_currency: "INR",
    paid_to_account_currency: "INR",
    target_exchange_rate: 1,
    reference_no: "pay_T9OaSYIqzc1iXO",
    reference_date: "2026-07-04",
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
        reference_name: newInvoices[2].name, // Inst 3
        total_amount: 2500,
        outstanding_amount: 2500,
        allocated_amount: 1600
      }
    ]
  };

  const createPe3 = await frappePost("resource/Payment Entry", pe3Payload);
  console.log("PE3 create response:", JSON.stringify(createPe3, null, 2));
  if (createPe3.data?.name) {
    const subPe3 = await frappePut(`resource/Payment Entry/${createPe3.data.name}`, { docstatus: 1 });
    console.log("PE3 submitted:", subPe3.data ? "Success" : subPe3);
  }

  // 2. Create Payment Entry 4 (CoFee, 2026-08-12, ₹3,300)
  // Preserving: reference_no: "ord_oZ1eevMt1d0341", reference_date: "2026-08-12"
  console.log("\n--- Creating PE 4 (CoFee) ---");
  const pe4Payload = {
    doctype: "Payment Entry",
    payment_type: "Receive",
    party_type: "Customer",
    party: customerName,
    party_name: customerName,
    company: company,
    posting_date: "2026-08-12",
    mode_of_payment: "CoFee",
    paid_amount: 3300,
    received_amount: 3300,
    paid_from: "Debtors - SU THP",
    paid_to: "CoFee - SU THP",
    paid_from_account_currency: "INR",
    paid_to_account_currency: "INR",
    target_exchange_rate: 1,
    reference_no: "ord_oZ1eevMt1d0341",
    reference_date: "2026-08-12",
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
        reference_name: newInvoices[3].name, // Inst 4
        total_amount: 2500,
        outstanding_amount: 2500,
        allocated_amount: 2400
      }
    ]
  };

  const createPe4 = await frappePost("resource/Payment Entry", pe4Payload);
  console.log("PE4 create response:", JSON.stringify(createPe4, null, 2));
  if (createPe4.data?.name) {
    const subPe4 = await frappePut(`resource/Payment Entry/${createPe4.data.name}`, { docstatus: 1 });
    console.log("PE4 submitted:", subPe4.data ? "Success" : subPe4);
  }

  // 3. Update Program Enrollment via frappe.client.set_value
  console.log("\n--- Updating Program Enrollment via set_value ---");
  const setValRes = await fetch(`${url}/api/method/frappe.client.set_value`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      doctype: "Program Enrollment",
      name: enrollmentName,
      fieldname: {
        custom_plan: "Basic",
        custom_fee_structure: "SU THP-12th Science State-Basic-8",
        custom_no_of_instalments: "8"
      }
    })
  });
  const setValJson = await setValRes.json();
  console.log("PE set_value result:", JSON.stringify(setValJson, null, 2));
}

run();
