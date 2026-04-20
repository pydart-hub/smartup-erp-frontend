const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const headers = {
  Authorization: "token 03330270e330d49:9c2261ae11ac2d2",
  "Content-Type": "application/json",
};

async function query(doctype, filters, fields, limit = 20) {
  const res = await fetch(`${FRAPPE_URL}/api/method/frappe.client.get_list`, {
    method: "POST",
    headers,
    body: JSON.stringify({ doctype, filters, fields, limit_page_length: limit }),
  });
  const data = await res.json();
  return data.message || [];
}

async function getDoc(doctype, name) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { headers });
  const data = await res.json();
  return data.data;
}

// Step 1: Find student
console.log("=== STUDENT ===");
const students = await query("Student",
  { student_name: ["like", "%Aahil%"], custom_branch: ["like", "%Palluruthy%"] },
  ["name", "student_name", "custom_branch", "customer", "custom_student_type", "custom_srr_id", "enabled", "joining_date"]
);
console.log(JSON.stringify(students, null, 2));
if (!students.length) { console.log("No student found!"); process.exit(1); }
const stu = students[0];

// Step 2: Enrollment
console.log("\n=== ENROLLMENT ===");
const enrollments = await query("Program Enrollment",
  { student: stu.name },
  ["name", "student", "student_name", "program", "academic_year", "student_batch_name", "enrollment_date", "custom_fee_structure", "custom_plan", "custom_no_of_instalments", "student_category", "docstatus"]
);
console.log(JSON.stringify(enrollments, null, 2));

// Step 3: Sales Orders
console.log("\n=== SALES ORDERS ===");
const salesOrders = await query("Sales Order",
  { customer: stu.customer },
  ["name", "customer", "grand_total", "status", "transaction_date", "custom_plan", "custom_no_of_instalments", "per_billed", "advance_paid", "docstatus"]
);
console.log(JSON.stringify(salesOrders, null, 2));

// Step 4: Sales Invoices
console.log("\n=== SALES INVOICES ===");
const invoices = await query("Sales Invoice",
  { customer: stu.customer },
  ["name", "customer", "grand_total", "outstanding_amount", "status", "posting_date", "due_date", "docstatus"]
);
console.log(JSON.stringify(invoices, null, 2));

// Step 5: Payment Entries
console.log("\n=== PAYMENT ENTRIES ===");
const payments = await query("Payment Entry",
  { party_type: "Customer", party: stu.customer },
  ["name", "posting_date", "paid_amount", "mode_of_payment", "reference_no", "docstatus"]
);
console.log(JSON.stringify(payments, null, 2));

// Step 6: Full Sales Invoice details
for (const inv of invoices) {
  console.log(`\n=== INVOICE DETAIL: ${inv.name} ===`);
  const doc = await getDoc("Sales Invoice", inv.name);
  console.log("Status:", doc.status, "Total:", doc.grand_total, "Outstanding:", doc.outstanding_amount);
  console.log("Items:", JSON.stringify(doc.items?.map(i => ({ item: i.item_code, qty: i.qty, rate: i.rate, amount: i.amount, so: i.sales_order })), null, 2));
  console.log("Payment Schedule:", JSON.stringify(doc.payment_schedule, null, 2));
}

// Step 7: Full Sales Order details
for (const so of salesOrders) {
  console.log(`\n=== SO DETAIL: ${so.name} ===`);
  const doc = await getDoc("Sales Order", so.name);
  console.log("Status:", doc.status, "Total:", doc.grand_total);
  console.log("Items:", JSON.stringify(doc.items?.map(i => ({ item: i.item_code, qty: i.qty, rate: i.rate, amount: i.amount })), null, 2));
}

// Step 8: Fee Structure
if (enrollments[0]?.custom_fee_structure) {
  console.log(`\n=== FEE STRUCTURE: ${enrollments[0].custom_fee_structure} ===`);
  const fs = await getDoc("Fee Structure", enrollments[0].custom_fee_structure);
  console.log("Program:", fs.program, "Year:", fs.academic_year, "Total:", fs.total_amount);
  console.log("Components:", JSON.stringify(fs.components?.map(c => ({ category: c.fees_category, amount: c.amount, total: c.total })), null, 2));
}
