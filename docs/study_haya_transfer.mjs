const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const headers = {
  Authorization: "token 03330270e330d49:9c2261ae11ac2d2",
  "Content-Type": "application/json",
};

async function query(doctype, filters, fields, limit = 50) {
  const res = await fetch(`${FRAPPE_URL}/api/method/frappe.client.get_list`, {
    method: "POST", headers,
    body: JSON.stringify({ doctype, filters, fields, limit_page_length: limit }),
  });
  return (await res.json()).message || [];
}

async function getDoc(doctype, name) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { headers });
  return (await res.json()).data;
}

const STUDENT_ID = "STU-SU THP-26-005";
const CUSTOMER = "Haya suneer";

// 1. Student record
console.log("=== STUDENT RECORD ===");
const stu = await getDoc("Student", STUDENT_ID);
console.log(JSON.stringify({
  name: stu.name, student_name: stu.student_name,
  custom_branch: stu.custom_branch, custom_branch_abbr: stu.custom_branch_abbr,
  enabled: stu.enabled, customer: stu.customer, custom_srr_id: stu.custom_srr_id
}, null, 2));

// 2. All Program Enrollments
console.log("\n=== ALL PROGRAM ENROLLMENTS ===");
const pe = await query("Program Enrollment",
  { student: STUDENT_ID },
  ["name","program","academic_year","student_batch_name","enrollment_date","docstatus","custom_plan","custom_no_of_instalments","custom_fee_structure"],
  20
);
console.log(JSON.stringify(pe, null, 2));

// 3. Student Group memberships
console.log("\n=== STUDENT GROUP MEMBERSHIPS ===");
const groups = await query("Student Group",
  [["Student Group Student", "student", "=", STUDENT_ID]],
  ["name","student_group_name","program","batch","academic_year"],
  20
);
console.log(JSON.stringify(groups, null, 2));

// 4. ALL Sales Orders (both companies)
console.log("\n=== ALL SALES ORDERS ===");
const sos = await query("Sales Order",
  { customer: CUSTOMER },
  ["name","customer","company","grand_total","status","transaction_date","docstatus","custom_plan","custom_no_of_instalments","per_billed"],
  20
);
console.log(JSON.stringify(sos, null, 2));

// 5. ALL Sales Invoices
console.log("\n=== ALL SALES INVOICES ===");
const sinvs = await query("Sales Invoice",
  { customer: CUSTOMER },
  ["name","customer","company","grand_total","outstanding_amount","status","posting_date","due_date","docstatus"],
  50
);
console.log(JSON.stringify(sinvs, null, 2));

// 6. Payment Entries
console.log("\n=== ALL PAYMENT ENTRIES ===");
const pes = await query("Payment Entry",
  { party_type: "Customer", party: CUSTOMER },
  ["name","posting_date","paid_amount","mode_of_payment","docstatus","company","reference_no"],
  20
);
console.log(JSON.stringify(pes, null, 2));

// 7. Student Branch Transfer records - by student
console.log("\n=== STUDENT BRANCH TRANSFER (by student) ===");
const transfers = await query("Student Branch Transfer",
  { student: STUDENT_ID },
  ["name","student","student_name","from_branch","to_branch","status","amount_already_paid","adjusted_amount","old_total_amount","new_total_amount","old_sales_order","new_sales_order","old_program_enrollment","new_program_enrollment","request_date","completion_date","reason","transfer_log","creation","modified"],
  10
);
console.log(JSON.stringify(transfers, null, 2));

// Also try by student_name
console.log("\n=== STUDENT BRANCH TRANSFER (by student_name like Haya) ===");
const transfers2 = await query("Student Branch Transfer",
  { student_name: ["like", "%Haya%"] },
  ["name","student","student_name","from_branch","to_branch","status","amount_already_paid","adjusted_amount","old_total_amount","new_total_amount","request_date","completion_date","transfer_log","creation"],
  10
);
console.log(JSON.stringify(transfers2, null, 2));

// If any transfer found, get full doc
if (transfers.length > 0) {
  console.log("\n=== FULL TRANSFER DOCUMENT ===");
  const full = await getDoc("Student Branch Transfer", transfers[0].name);
  console.log(JSON.stringify(full, null, 2));
} else if (transfers2.length > 0) {
  console.log("\n=== FULL TRANSFER DOCUMENT (by name match) ===");
  const full = await getDoc("Student Branch Transfer", transfers2[0].name);
  console.log(JSON.stringify(full, null, 2));
}

// Also check all recent transfers
console.log("\n=== ALL RECENT TRANSFERS (last 20) ===");
const allTransfers = await query("Student Branch Transfer",
  [],
  ["name","student","student_name","from_branch","to_branch","status","creation","completion_date"],
  20
);
console.log(JSON.stringify(allTransfers, null, 2));
