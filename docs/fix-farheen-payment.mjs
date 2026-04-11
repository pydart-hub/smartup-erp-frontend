/**
 * Fix script: Manually reconcile Razorpay payment for FARHEEN ANWAR
 * Payment ID: pay_SazWF5EDkqOav2, Amount: ₹5900
 *
 * Run: node docs/fix-farheen-payment.mjs
 */

const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const FRAPPE_API_KEY = "03330270e330d49";
const FRAPPE_API_SECRET = "9c2261ae11ac2d2";
const AUTH = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

const RAZORPAY_PAYMENT_ID = "pay_SazWF5EDkqOav2";
const PAYMENT_AMOUNT = 5900;
const STUDENT_SEARCH = "FARHEEN ANWAR";

const headers = {
  Authorization: AUTH,
  "Content-Type": "application/json",
};

async function get(path) {
  const res = await fetch(`${FRAPPE_URL}${path}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} → ${res.status}: ${text.substring(0, 300)}`);
  }
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${FRAPPE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} → ${res.status}: ${text.substring(0, 500)}`);
  }
  return res.json();
}

async function put(path, body) {
  const res = await fetch(`${FRAPPE_URL}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PUT ${path} → ${res.status}: ${text.substring(0, 500)}`);
  }
  return res.json();
}

// ── Step 1: Find student record ──
console.log(`\n🔍 Step 1: Searching for student "${STUDENT_SEARCH}"...`);
const studentRes = await get(
  `/api/resource/Student?filters=[["student_name","like","%FARHEEN%"]]&fields=["name","student_name","enabled","custom_discontinuation_date"]&limit=10`
);
const students = studentRes.data || [];
if (students.length === 0) {
  console.error("❌ No student found with name like FARHEEN. Trying alternate search...");
  const alt = await get(
    `/api/resource/Student?filters=[["student_name","like","%ANWAR%"]]&fields=["name","student_name","enabled","custom_discontinuation_date"]&limit=10`
  );
  console.log("Results:", JSON.stringify(alt.data, null, 2));
  process.exit(1);
}
console.log("Found students:", JSON.stringify(students, null, 2));

const student = students.find(s => s.student_name?.toUpperCase().includes("FARHEEN")) || students[0];
console.log(`✅ Using student: ${student.name} — ${student.student_name}`);

if (student.enabled === 0 && student.custom_discontinuation_date) {
  console.error("❌ Student is discontinued. Cannot create Payment Entry.");
  process.exit(1);
}

// ── Step 2: Check if Payment Entry already exists ──
console.log(`\n🔍 Step 2: Checking for existing Payment Entry with reference_no=${RAZORPAY_PAYMENT_ID}...`);
const existingPE = await get(
  `/api/resource/Payment Entry?filters=[["reference_no","=","${RAZORPAY_PAYMENT_ID}"]]&fields=["name","docstatus","paid_amount","creation"]&limit=5`
);
if ((existingPE.data || []).length > 0) {
  console.log("⚠️  Payment Entry already exists:", JSON.stringify(existingPE.data, null, 2));
  console.log("No action needed. If invoice still shows overdue, check if PE is submitted (docstatus=1).");
  const pe = existingPE.data[0];
  if (pe.docstatus === 0) {
    console.log(`⚠️  PE exists but is DRAFT (docstatus=0). Will submit it: ${pe.name}`);
    const submitted = await put(`/api/resource/Payment Entry/${encodeURIComponent(pe.name)}`, { docstatus: 1 });
    console.log("✅ Submitted PE:", submitted.data?.name);
  }
  process.exit(0);
}
console.log("✅ No existing PE found. Will create one.");

// ── Step 3: Find Sales Invoices for this student ──
console.log(`\n🔍 Step 3: Finding Sales Invoices for student ${student.name}...`);
const invoicesRes = await get(
  `/api/resource/Sales Invoice?filters=[["student","=","${student.name}"],["docstatus","=",1]]&fields=["name","grand_total","outstanding_amount","due_date","status","company","customer"]&order_by=creation asc&limit=20`
);
const invoices = invoicesRes.data || [];
console.log(`Found ${invoices.length} submitted invoices:`);
for (const inv of invoices) {
  console.log(`  ${inv.name} — ₹${inv.grand_total} — outstanding: ₹${inv.outstanding_amount} — status: ${inv.status} — due: ${inv.due_date}`);
}

if (invoices.length === 0) {
  console.error("❌ No submitted Sales Invoices found for this student.");
  process.exit(1);
}

// Pick first invoice with outstanding = PAYMENT_AMOUNT or largest outstanding matching
let targetInvoice = invoices.find(inv => Math.abs(inv.outstanding_amount - PAYMENT_AMOUNT) < 1);
if (!targetInvoice) {
  // Fall back to first unpaid invoice (oldest, first installment)
  targetInvoice = invoices.find(inv => inv.outstanding_amount > 0);
}
if (!targetInvoice) {
  console.error("❌ No invoice with outstanding amount found.");
  process.exit(1);
}
console.log(`\n✅ Target invoice: ${targetInvoice.name} — grand_total: ₹${targetInvoice.grand_total} — outstanding: ₹${targetInvoice.outstanding_amount} — company: ${targetInvoice.company}`);

// ── Step 4: Get Payment Entry template from Frappe ──
console.log(`\n🔍 Step 4: Creating Payment Entry via Frappe get_payment_entry...`);
const getPeRes = await post(
  `/api/method/erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry`,
  {
    dt: "Sales Invoice",
    dn: targetInvoice.name,
    party_amount: PAYMENT_AMOUNT,
    bank_amount: PAYMENT_AMOUNT,
  }
);
const mappedPE = getPeRes.message;
console.log("✅ Got PE template. Party:", mappedPE.party, "| Company:", mappedPE.company);

// ── Step 5: Resolve Razorpay account ──
console.log(`\n🔍 Step 5: Resolving Razorpay 'paid_to' account for company "${targetInvoice.company}"...`);
const mopRes = await get(`/api/resource/Mode of Payment/Razorpay`);
const mopAccounts = mopRes.data?.accounts || [];
const companyAccount = mopAccounts.find(a => a.company === targetInvoice.company);
if (companyAccount) {
  mappedPE.paid_to = companyAccount.default_account;
  mappedPE.paid_to_account_type = (mopRes.data?.type === "Cash") ? "Cash" : "Bank";
  console.log(`✅ Resolved paid_to: ${mappedPE.paid_to}`);
} else {
  console.warn(`⚠️  No Razorpay account mapping for company "${targetInvoice.company}". Using default from template.`);
  console.log("  Available companies in MOP:", mopAccounts.map(a => a.company));
}

// ── Step 6: Set Razorpay fields ──
mappedPE.mode_of_payment = "Razorpay";
mappedPE.reference_no = RAZORPAY_PAYMENT_ID;
mappedPE.reference_date = new Date().toISOString().split("T")[0];
mappedPE.remarks = `Online payment via Razorpay. Payment: ${RAZORPAY_PAYMENT_ID}. Student: ${STUDENT_SEARCH}. [Manual reconciliation by admin]`;
mappedPE.paid_amount = PAYMENT_AMOUNT;
mappedPE.received_amount = PAYMENT_AMOUNT;

// Override allocated_amount in references
if (Array.isArray(mappedPE.references)) {
  for (const ref of mappedPE.references) {
    if (ref.reference_name === targetInvoice.name) {
      ref.allocated_amount = PAYMENT_AMOUNT;
    }
  }
}

console.log("\n📋 Final PE to insert:");
console.log(`  party: ${mappedPE.party}`);
console.log(`  paid_to: ${mappedPE.paid_to}`);
console.log(`  paid_amount: ${mappedPE.paid_amount}`);
console.log(`  reference_no: ${mappedPE.reference_no}`);
console.log(`  references: ${JSON.stringify(mappedPE.references?.map(r => ({ name: r.reference_name, allocated: r.allocated_amount })))}`);

// ── Step 7: Insert PE ──
console.log(`\n🚀 Step 7: Inserting Payment Entry...`);
const insertRes = await post(`/api/resource/Payment Entry`, mappedPE);
const paymentEntryName = insertRes.data?.name;
if (!paymentEntryName) {
  console.error("❌ Insert returned no name:", JSON.stringify(insertRes));
  process.exit(1);
}
console.log(`✅ Payment Entry created: ${paymentEntryName}`);

// ── Step 8: Submit PE ──
console.log(`\n🚀 Step 8: Submitting Payment Entry ${paymentEntryName}...`);
const submitRes = await put(`/api/resource/Payment Entry/${encodeURIComponent(paymentEntryName)}`, { docstatus: 1 });
console.log(`✅ Payment Entry submitted: ${submitRes.data?.name} — docstatus: ${submitRes.data?.docstatus}`);

// ── Step 9: Verify invoice is now updated ──
console.log(`\n🔍 Step 9: Verifying invoice outstanding_amount...`);
const verifyInv = await get(
  `/api/resource/Sales Invoice/${encodeURIComponent(targetInvoice.name)}?fields=["name","outstanding_amount","status","paid_amount"]`
);
const updatedInv = verifyInv.data;
console.log(`✅ Invoice ${updatedInv.name}:`);
console.log(`   Outstanding: ₹${updatedInv.outstanding_amount}`);
console.log(`   Status: ${updatedInv.status}`);
console.log(`   Paid amount: ₹${updatedInv.paid_amount}`);

console.log("\n🎉 Done! FARHEEN ANWAR's payment of ₹5900 has been reconciled.");
console.log(`   Payment Entry: ${paymentEntryName}`);
console.log(`   Invoice: ${targetInvoice.name} — now shows outstanding: ₹${updatedInv.outstanding_amount}`);
