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

  const customerName = "Sarosh VS";
  const studentId = "STU-SU THP-26-149";

  console.log("=== FINAL VERIFICATION FOR SAROSH VS ===");

  // 1. Sales Invoices
  const invoices = await frappeGet("resource/Sales Invoice", {
    filters: JSON.stringify([
      ["customer", "=", customerName],
      ["docstatus", "=", 1]
    ]),
    fields: JSON.stringify(["name", "posting_date", "due_date", "grand_total", "outstanding_amount", "status"]),
    order_by: "due_date asc"
  });
  console.log("\nSales Invoices (Active Submitted):", JSON.stringify(invoices.data, null, 2));

  // 2. Payment Entries
  const payments = await frappeGet("resource/Payment Entry", {
    filters: JSON.stringify([
      ["party", "=", customerName],
      ["docstatus", "=", 1]
    ]),
    fields: JSON.stringify(["name", "posting_date", "paid_amount", "mode_of_payment", "reference_no", "status"]),
    order_by: "posting_date asc"
  });
  console.log("\nPayment Entries (Active Submitted):", JSON.stringify(payments.data, null, 2));

  // 3. Sales Order
  const salesOrder = await frappeGet("resource/Sales Order", {
    filters: JSON.stringify([
      ["student", "=", studentId],
      ["docstatus", "=", 1]
    ]),
    fields: JSON.stringify(["name", "transaction_date", "grand_total", "per_billed", "status", "custom_plan", "custom_no_of_instalments"])
  });
  console.log("\nSales Order (Active Submitted):", JSON.stringify(salesOrder.data, null, 2));
}

run();
