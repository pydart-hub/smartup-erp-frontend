const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const headers = {
  Authorization: "token 03330270e330d49:9c2261ae11ac2d2",
  "Content-Type": "application/json",
};

async function query(doctype, filters, fields, opts = {}) {
  const res = await fetch(`${FRAPPE_URL}/api/method/frappe.client.get_list`, {
    method: "POST", headers,
    body: JSON.stringify({ doctype, filters, fields, limit_page_length: opts.limit || 20, order_by: opts.orderBy }),
  });
  const data = await res.json();
  return data.message || [];
}

async function getDoc(doctype, name) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { headers });
  return (await res.json()).data;
}

// ─── 1. Find the student ───
console.log("=== STUDENT ===");
const students = await query("Student",
  { student_name: ["like", "%Haya%"] },
  ["name", "student_name", "custom_branch", "custom_branch_abbr", "customer", "custom_student_type", "custom_srr_id", "enabled", "joining_date", "student_email_id", "student_mobile_number"]
);
console.log(JSON.stringify(students, null, 2));
const stu = students[0];
if (!stu) { console.log("No student found!"); process.exit(1); }

// ─── 2. Program Enrollments ───
console.log("\n=== PROGRAM ENROLLMENTS ===");
const enrollments = await query("Program Enrollment",
  { student: stu.name },
  ["name", "student", "student_name", "program", "academic_year", "student_batch_name", "enrollment_date", "custom_fee_structure", "custom_plan", "custom_no_of_instalments", "student_category", "docstatus", "custom_program_abb"],
  { orderBy: "enrollment_date desc" }
);
console.log(JSON.stringify(enrollments, null, 2));

// ─── 3. Student Group Student (batch membership) ───
console.log("\n=== STUDENT GROUP MEMBERSHIP ===");
const groups = await query("Student Group",
  [["Student Group Student", "student", "=", stu.name]],
  ["name", "student_group_name", "program", "batch", "academic_year"],
  { limit: 10 }
);
console.log(JSON.stringify(groups, null, 2));

// ─── 4. Sales Orders ───
console.log("\n=== SALES ORDERS ===");
const salesOrders = await query("Sales Order",
  { customer: stu.customer },
  ["name", "customer", "company", "grand_total", "status", "transaction_date", "custom_plan", "custom_no_of_instalments", "per_billed", "docstatus"],
  { orderBy: "transaction_date desc" }
);
console.log(JSON.stringify(salesOrders, null, 2));

// ─── 5. Sales Invoices ───
console.log("\n=== SALES INVOICES ===");
const invoices = await query("Sales Invoice",
  { customer: stu.customer },
  ["name", "customer", "company", "grand_total", "outstanding_amount", "status", "posting_date", "due_date", "docstatus"],
  { orderBy: "posting_date asc" }
);
console.log(JSON.stringify(invoices, null, 2));

// ─── 6. Payment Entries ───
console.log("\n=== PAYMENT ENTRIES ===");
const payments = await query("Payment Entry",
  { party_type: "Customer", party: stu.customer },
  ["name", "posting_date", "paid_amount", "mode_of_payment", "reference_no", "docstatus", "company"],
  { orderBy: "posting_date desc" }
);
console.log(JSON.stringify(payments, null, 2));

// ─── 7. Transfer records ───
console.log("\n=== STUDENT TRANSFER (custom doctype) ===");
// Try different possible doctypes
for (const dt of ["Student Transfer", "Branch Transfer", "Student Branch Transfer"]) {
  try {
    const transfers = await query(dt,
      [["student", "=", stu.name]],
      ["*"],
      { limit: 10 }
    );
    if (transfers.length > 0) {
      console.log(`Doctype: ${dt}`);
      console.log(JSON.stringify(transfers, null, 2));
    }
  } catch (e) {
    // doctype doesn't exist, skip
  }
}

// Also check via name pattern
const transfersByName = await query("Student Transfer",
  { student_name: ["like", "%Haya%"] },
  ["*"],
  { limit: 10 }
).catch(() => []);
if (transfersByName.length > 0) {
  console.log("Transfer by name search:", JSON.stringify(transfersByName, null, 2));
}

// ─── 8. Check frontend transfer records ───
console.log("\n=== CHECKING CUSTOM TRANSFER FIELDS ON STUDENT ===");
const fullStudent = await getDoc("Student", stu.name);
const transferFields = Object.entries(fullStudent).filter(([k, v]) => 
  (k.includes("transfer") || k.includes("branch")) && v !== null && v !== "" && v !== 0
);
console.log(JSON.stringify(Object.fromEntries(transferFields), null, 2));

// ─── 9. Check if there's a custom doctype for transfers via API ───
console.log("\n=== SEARCHING FOR TRANSFER-RELATED DOCTYPES ===");
const doctypes = await query("DocType",
  { name: ["like", "%Transfer%"], module: ["like", "%Education%"] },
  ["name", "module"],
  { limit: 20 }
).catch(() => []);
console.log(JSON.stringify(doctypes, null, 2));

// Also check custom doctypes
const customDoctypes = await query("DocType",
  { name: ["like", "%Transfer%"], custom: 1 },
  ["name", "module", "custom"],
  { limit: 20 }
).catch(() => []);
console.log("Custom transfer doctypes:", JSON.stringify(customDoctypes, null, 2));
