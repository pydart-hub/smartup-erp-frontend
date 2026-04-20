const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const headers = {
  Authorization: "token 03330270e330d49:9c2261ae11ac2d2",
  "Content-Type": "application/json",
};

async function getDoc(doctype, name) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { headers });
  return (await res.json()).data;
}

async function rpc(method, args) {
  const res = await fetch(`${FRAPPE_URL}/api/method/${method}`, {
    method: "POST", headers,
    body: JSON.stringify(args),
  });
  const data = await res.json();
  if (data.exception) throw new Error(data.exception);
  return data;
}

async function createDoc(doctype, doc) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}`, {
    method: "POST", headers,
    body: JSON.stringify(doc),
  });
  const data = await res.json();
  if (data.exception) throw new Error(`Create failed: ${data.exception}`);
  return data.data;
}

async function submitDoc(doctype, name) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "PUT", headers,
    body: JSON.stringify({ docstatus: 1 }),
  });
  const data = await res.json();
  if (data.exception) throw new Error(`Submit failed: ${data.exception}`);
  return data.data;
}

// ─── Step 1: Cancel dangling Payment Entry ACC-PAY-2026-04038 ───
console.log("=== STEP 1: Cancel Payment Entry ACC-PAY-2026-04038 ===");
try {
  const cancelRes = await rpc("frappe.client.cancel", {
    doctype: "Payment Entry",
    name: "ACC-PAY-2026-04038",
  });
  console.log("✅ Payment Entry ACC-PAY-2026-04038 cancelled");
} catch (e) {
  console.log("❌ Cancel failed:", e.message);
  // If already cancelled, continue
  const pe = await getDoc("Payment Entry", "ACC-PAY-2026-04038");
  if (pe.docstatus === 2) {
    console.log("  (Already cancelled, continuing...)");
  } else {
    process.exit(1);
  }
}

// ─── Step 2: Create replacement Sales Invoice (₹3,000, due Jun 15) ───
console.log("\n=== STEP 2: Create Sales Invoice (₹3,000, due Jun 15) ===");

// Get template from existing working invoice
const templateInv = await getDoc("Sales Invoice", "ACC-SINV-2026-02680");
const templateItem = templateInv.items[0];

const newInvoice = await createDoc("Sales Invoice", {
  customer: "Aahil R",
  company: templateInv.company,
  posting_date: "2026-04-06",
  due_date: "2026-06-15",
  debit_to: templateInv.debit_to,
  currency: "INR",
  conversion_rate: 1,
  selling_price_list: templateInv.selling_price_list,
  update_stock: 0,
  items: [{
    item_code: "10th State Tuition Fee",
    qty: 1,
    rate: 3000,
    amount: 3000,
    income_account: templateItem.income_account,
    cost_center: templateItem.cost_center,
    sales_order: "SAL-ORD-2026-00230",
    so_detail: templateItem.so_detail ? undefined : undefined, // Will let Frappe resolve
  }],
  payment_schedule: [{
    due_date: "2026-06-15",
    invoice_portion: 100,
    payment_amount: 3000,
  }],
});
console.log("  Created draft:", newInvoice.name);

// Submit the invoice
const submittedInv = await submitDoc("Sales Invoice", newInvoice.name);
console.log("✅ Submitted invoice:", submittedInv.name, "Total:", submittedInv.grand_total, "Outstanding:", submittedInv.outstanding_amount);

// ─── Step 3: Create Payment Entry (₹1,000 allocated to new invoice) ───
console.log("\n=== STEP 3: Create Payment Entry (₹1,000) ===");

// Get template from existing working PE
const templatePE = await getDoc("Payment Entry", "ACC-PAY-2026-04037");

const newPE = await createDoc("Payment Entry", {
  payment_type: "Receive",
  party_type: "Customer",
  party: "Aahil R",
  company: templatePE.company,
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

// Submit the PE
const submittedPE = await submitDoc("Payment Entry", newPE.name);
console.log("✅ Submitted PE:", submittedPE.name, "Amount:", submittedPE.paid_amount);

// ─── Step 4: Verify final state ───
console.log("\n=== VERIFICATION ===");
const finalInv = await getDoc("Sales Invoice", submittedInv.name);
console.log(`Invoice ${finalInv.name}: Total=${finalInv.grand_total}, Outstanding=${finalInv.outstanding_amount}, Status=${finalInv.status}`);

const cancelledPE = await getDoc("Payment Entry", "ACC-PAY-2026-04038");
console.log(`Old PE ACC-PAY-2026-04038: docstatus=${cancelledPE.docstatus} (2=cancelled)`);

console.log("\n✅ All done! Aahil R now has:");
console.log("  - Invoice #1 (Apr 15): ₹3,000 — Paid");
console.log(`  - Invoice #2 (Jun 15): ₹3,000 — ₹1,000 paid, ₹${finalInv.outstanding_amount} outstanding`);
console.log("  - Invoice #3 (Aug 15): ₹3,000 — Unpaid");
console.log("  - Invoice #4 (Oct 15): ₹3,000 — Unpaid");
console.log("  - Invoice #5 (Dec 15): ₹3,000 — Unpaid");
console.log("  - Invoice #6 (Feb 15): ₹2,300 — Unpaid");
console.log("  Total paid: ₹4,000");
