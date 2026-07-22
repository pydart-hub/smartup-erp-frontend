import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const BASE = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const AUTH_HEADERS = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  "Content-Type": "application/json",
};

async function api(method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: AUTH_HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${text.slice(0, 500)}`);
  return json.data ?? json.message ?? json;
}

const get = (path) => api("GET", path);

async function main() {
  const studentId = "STU-SU ERV-26-210";
  console.log(`🔍 DEEP STUDY: RIHAN S (${studentId})\n`);
  
  // 1. Student doc
  const student = await get(`/api/resource/Student/${encodeURIComponent(studentId)}`);
  console.log("=== STUDENT DOC ===");
  console.log(`Name: ${student.student_name}`);
  console.log(`ID: ${student.name}`);
  console.log(`Customer: ${student.customer}`);
  console.log(`Branch: ${student.custom_branch}`);
  
  // 2. Program Enrollments
  const enrollments = await get(
    `/api/resource/Program Enrollment?filters=${encodeURIComponent(JSON.stringify([
      ["student", "=", studentId]
    ]))}&fields=${encodeURIComponent(JSON.stringify([
      "name", "program", "academic_year", "custom_plan",
      "custom_no_of_instalments", "custom_fee_structure",
      "enrollment_date", "docstatus"
    ]))}`
  );
  console.log("\n=== PROGRAM ENROLLMENT ===");
  console.log(JSON.stringify(enrollments, null, 2));
  
  // 3. Sales Orders
  const salesOrders = await get(
    `/api/resource/Sales Order?filters=${encodeURIComponent(JSON.stringify([
      ["student", "=", studentId]
    ]))}&fields=${encodeURIComponent(JSON.stringify([
      "name", "grand_total", "billing_status", "transaction_date",
      "custom_plan", "custom_no_of_instalments", "docstatus", "creation",
      "company"
    ]))}`
  );
  console.log("\n=== SALES ORDERS ===");
  for (const so of (salesOrders || [])) {
    console.log(`SO Name: ${so.name} | Total: ₹${so.grand_total} | Status: ${so.billing_status} | Date: ${so.transaction_date}`);
    const detail = await get(`/api/resource/Sales Order/${encodeURIComponent(so.name)}`);
    console.log("  Items:", JSON.stringify(detail.items, null, 2));
  }
  
  // 4. Sales Invoices
  const invoices = await get(
    `/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([
      ["student", "=", studentId]
    ]))}&fields=${encodeURIComponent(JSON.stringify([
      "name", "grand_total", "outstanding_amount", "paid_amount",
      "posting_date", "due_date", "status", "docstatus"
    ]))}&order_by=due_date asc`
  );
  console.log("\n=== SALES INVOICES ===");
  for (const inv of (invoices || [])) {
    const detail = await get(`/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}`);
    console.log(`Invoice: ${inv.name} | Grand Total: ₹${inv.grand_total} | Outstanding: ₹${inv.outstanding_amount} | Paid: ₹${inv.paid_amount} | Status: ${inv.status} | Due: ${inv.due_date} | Posting: ${inv.posting_date}`);
    console.log("  Items:", detail.items?.map(i => ({ item_code: i.item_code, description: i.description, rate: i.rate, amount: i.amount, sales_order: i.sales_order, so_detail: i.so_detail })));
  }
  
  // 5. Payment Entries
  const payments = await get(
    `/api/resource/Payment Entry?filters=${encodeURIComponent(JSON.stringify([
      ["party", "=", student.customer]
    ]))}&fields=${encodeURIComponent(JSON.stringify([
      "name", "paid_amount", "posting_date", "mode_of_payment",
      "reference_no", "reference_date", "docstatus"
    ]))}&order_by=posting_date asc`
  );
  console.log("\n=== PAYMENT ENTRIES ===");
  for (const pe of (payments || [])) {
    const detail = await get(`/api/resource/Payment Entry/${encodeURIComponent(pe.name)}`);
    console.log(`PE Name: ${pe.name} | Amount: ₹${pe.paid_amount} | Date: ${pe.posting_date} | Mode: ${pe.mode_of_payment} | Ref No: ${pe.reference_no} | Docstatus: ${pe.docstatus}`);
    console.log("  References:", detail.references?.map(r => ({ reference_doctype: r.reference_doctype, reference_name: r.reference_name, total_amount: r.total_amount, outstanding_amount: r.outstanding_amount, allocated_amount: r.allocated_amount })));
  }
}

main().catch((err) => {
  console.error(`FAILED: ${err.message}`);
  process.exit(1);
});
