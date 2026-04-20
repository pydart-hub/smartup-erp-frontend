const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const headers = {
  Authorization: "token 03330270e330d49:9c2261ae11ac2d2",
  "Content-Type": "application/json",
};

async function getDoc(doctype, name) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { headers });
  return (await res.json()).data;
}

async function createDoc(doctype, doc) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}`, {
    method: "POST", headers,
    body: JSON.stringify(doc),
  });
  const data = await res.json();
  if (data.exception) throw new Error(`Create failed: ${data.exc_type}: ${JSON.stringify(data.exception).slice(0, 500)}`);
  return data.data;
}

async function submitDoc(doctype, name) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "PUT", headers,
    body: JSON.stringify({ docstatus: 1 }),
  });
  const data = await res.json();
  if (data.exception) throw new Error(`Submit failed: ${JSON.stringify(data.exception).slice(0, 500)}`);
  return data.data;
}

// ─── Step 1 already done: PE ACC-PAY-2026-04038 cancelled ───
console.log("✅ Step 1 done: Payment Entry ACC-PAY-2026-04038 already cancelled");

// ─── Step 2: Create replacement Sales Invoice (₹3,000, due Jun 15) ───
console.log("\n=== STEP 2: Create Sales Invoice (₹3,000, due Jun 15) ===");

const newInvoice = await createDoc("Sales Invoice", {
  customer: "Aahil R",
  company: "Smart Up Palluruthy",
  posting_date: "2026-04-06",
  due_date: "2026-06-15",
  debit_to: "Debtors - SU PLR",
  currency: "INR",
  conversion_rate: 1,
  selling_price_list: "Standard Selling",
  update_stock: 0,
  student: "STU-SU PLR-26-008",
  custom_academic_year: "2026-2027",
  custom_student_email: "aahilr.suplr.008@dummy.com",
  items: [{
    item_code: "10th State Tuition Fee",
    qty: 1,
    rate: 3000,
    amount: 3000,
    income_account: "Sales - SU PLR",
    cost_center: "Main - SU PLR",
    sales_order: "SAL-ORD-2026-00230",
    so_detail: "1irhh5ec25",
  }],
  payment_schedule: [{
    due_date: "2026-06-15",
    invoice_portion: 100,
    payment_amount: 3000,
  }],
});
console.log("  Created draft:", newInvoice.name);

const submittedInv = await submitDoc("Sales Invoice", newInvoice.name);
console.log("✅ Submitted invoice:", submittedInv.name, "Total:", submittedInv.grand_total, "Outstanding:", submittedInv.outstanding_amount);

// ─── Step 3: Create Payment Entry (₹1,000 → new invoice) ───
console.log("\n=== STEP 3: Create Payment Entry (₹1,000) ===");

// Get PE template for accounts
const templatePE = await getDoc("Payment Entry", "ACC-PAY-2026-04037");

const newPE = await createDoc("Payment Entry", {
  payment_type: "Receive",
  party_type: "Customer",
  party: "Aahil R",
  company: "Smart Up Palluruthy",
  posting_date: "2026-04-06",
  mode_of_payment: "Cash",
  paid_from: templatePE.paid_from,
  paid_to: templatePE.paid_to,
  paid_amount: 1000,
  received_amount: 1000,
  target_exchange_rate: 1,
  source_exchange_rate: 1,
  reference_no: "CASH-AAHIL-INS2-PARTIAL",
  reference_date: "2026-04-06",
  references: [{
    reference_doctype: "Sales Invoice",
    reference_name: submittedInv.name,
    allocated_amount: 1000,
  }],
});
console.log("  Created draft PE:", newPE.name);

const submittedPE = await submitDoc("Payment Entry", newPE.name);
console.log("✅ Submitted PE:", submittedPE.name, "Amount:", submittedPE.paid_amount);

// ─── Step 4: Verify ───
console.log("\n=== VERIFICATION ===");
const finalInv = await getDoc("Sales Invoice", submittedInv.name);
console.log(`New Invoice ${finalInv.name}: Total=₹${finalInv.grand_total}, Outstanding=₹${finalInv.outstanding_amount}, Status=${finalInv.status}`);

console.log("\n✅ Fix complete! Aahil R's invoices:");
console.log("  1. ACC-SINV-2026-02680 (Apr 15): ₹3,000 — Paid");
console.log(`  2. ${finalInv.name} (Jun 15): ₹3,000 — ₹1,000 paid, ₹${finalInv.outstanding_amount} outstanding`);
console.log("  3. ACC-SINV-2026-02682 (Aug 15): ₹3,000 — Unpaid");
console.log("  4. ACC-SINV-2026-02683 (Oct 15): ₹3,000 — Unpaid");
console.log("  5. ACC-SINV-2026-02684 (Dec 15): ₹3,000 — Unpaid");
console.log("  6. ACC-SINV-2026-02685 (Feb 15): ₹2,300 — Unpaid");
console.log("  Total paid: ₹4,000");
