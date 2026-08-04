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

  async function frappeGet(pathStr, params) {
    const qs = new URLSearchParams(params).toString();
    const start = Date.now();
    const res = await fetch(`${url}/api/${pathStr}?${qs}`, {
      headers: { Authorization: auth, Accept: "application/json" },
      cache: "no-store",
    });
    const text = await res.text();
    console.log(`GET ${pathStr}?${qs} took ${Date.now() - start}ms, status: ${res.status}`);
    try {
      return JSON.parse(text);
    } catch (e) {
      return text.slice(0, 500);
    }
  }

  // Simulate GET /api/director/fee-followup?from=01-07-2026&to=01-06-2026
  console.log("Calling with from=01-07-2026 and to=01-06-2026");
  
  // Date parsing in the route:
  // from = "2026-07-01"
  // to = "2026-06-01"
  const from = "2026-07-01";
  const to = "2026-06-01";

  // Let's measure the exact queries:
  // 1. getPendingOverdueByBranch(to)
  const discRes = await frappeGet("resource/Student", {
    filters: JSON.stringify([
      ["enabled", "=", 0],
      ["custom_discontinuation_date", "is", "set"],
    ]),
    fields: JSON.stringify(["customer"]),
    limit_page_length: "500",
  });
  const discCustomers = (discRes.data ?? []).map(s => s.customer).filter(Boolean);

  const salesFilters = [
    ["docstatus", "=", 1],
    ["outstanding_amount", ">", 0],
    ["due_date", "<=", to],
  ];
  if (discCustomers.length > 0) {
    salesFilters.push(["customer", "not in", discCustomers]);
  }
  await frappeGet("resource/Sales Invoice", {
    filters: JSON.stringify(salesFilters),
    fields: JSON.stringify([
      "company",
      "sum(outstanding_amount) as total_dues",
    ]),
    group_by: "company",
    limit_page_length: "100",
  });

  // 2. Fee Follow Up
  const followFilters = [
    ["Fee Follow Up", "call_date", ">=", `${from} 00:00:00`],
    ["Fee Follow Up", "call_date", "<=", `${to} 23:59:59`],
  ];
  await frappeGet("resource/Fee Follow Up", {
    fields: JSON.stringify([
      "name", "student", "student_name", "branch",
      "call_date", "called_by", "call_status",
      "payment_received", "amount_received", "payment_mode",
      "remarks", "next_followup_date", "invoice_ref",
    ]),
    filters: JSON.stringify(followFilters),
    limit_page_length: "2000",
    order_by: "call_date desc",
  });

  // 3. Payment Entry
  const paymentFilters = [
    ["Payment Entry", "payment_type", "=", "Receive"],
    ["Payment Entry", "docstatus", "=", 1],
    ["Payment Entry", "party_type", "=", "Customer"],
    ["Payment Entry", "posting_date", ">=", from],
    ["Payment Entry", "posting_date", "<=", to],
  ];
  await frappeGet("resource/Payment Entry", {
    filters: JSON.stringify(paymentFilters),
    fields: JSON.stringify(["name", "party", "party_name", "company", "paid_amount", "posting_date"]),
    limit_page_length: "5000",
  });

  // 4. Student (original)
  await frappeGet("resource/Student", {
    filters: JSON.stringify([["Student", "customer", "is", "set"]]),
    fields: JSON.stringify(["name", "customer", "student_name"]),
    limit_page_length: "5000",
  });
}
run();
