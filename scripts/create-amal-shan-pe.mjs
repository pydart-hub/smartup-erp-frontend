// create-amal-shan-pe.mjs — Record ₹10,300 Razorpay payment for AMAL SHAN K P
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

const api = async (url, opts = {}) => {
  const r = await fetch(url, {
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    ...opts,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${t.slice(0, 500)}`);
  return JSON.parse(t);
};

const CUSTOMER    = 'AMAL SHAN K P';
const COMPANY     = 'Smart Up Kadavanthara';
const INVOICE     = 'ACC-SINV-2026-06771';
const AMOUNT      = 10300;
const RAZORPAY_ID = 'pay_Sm5AAbdgSjRqFn';
const PAY_DATE    = '2026-05-06';
const PAID_FROM   = 'Debtors - SU KDV';
const PAID_TO     = 'Razorpay - SU KDV';

// ─── Safety check ────────────────────────────────────────────────
console.log('== Safety Check ==');
const inv = (await api(`${BASE}/api/resource/Sales Invoice/${INVOICE}`)).data;
console.log(`Invoice: ${INVOICE}`);
console.log(`  grand_total:        ₹${inv.grand_total}`);
console.log(`  outstanding_amount: ₹${inv.outstanding_amount}`);
console.log(`  status:             ${inv.status}`);
console.log(`  docstatus:          ${inv.docstatus}`);

if (inv.outstanding_amount !== AMOUNT) {
  throw new Error(`Expected outstanding ₹${AMOUNT}, got ₹${inv.outstanding_amount}. Aborting.`);
}
if (inv.docstatus !== 1) {
  throw new Error(`Invoice not submitted (docstatus=${inv.docstatus}). Aborting.`);
}
console.log('✓ Outstanding matches ₹10,300 — safe to proceed\n');

// ─── Create Payment Entry ─────────────────────────────────────────
console.log('== Creating Payment Entry ==');
const pePayload = {
  doctype: 'Payment Entry',
  payment_type: 'Receive',
  posting_date: PAY_DATE,
  company: COMPANY,
  party_type: 'Customer',
  party: CUSTOMER,
  paid_from: PAID_FROM,
  paid_to: PAID_TO,
  mode_of_payment: 'Razorpay',
  paid_amount: AMOUNT,
  received_amount: AMOUNT,
  reference_no: RAZORPAY_ID,
  reference_date: PAY_DATE,
  remarks: `Razorpay payment ${RAZORPAY_ID} — ${INVOICE} (9th CBSE Inst 1)`,
  references: [
    {
      reference_doctype: 'Sales Invoice',
      reference_name: INVOICE,
      allocated_amount: AMOUNT,
    },
  ],
};

const created = (await api(`${BASE}/api/resource/Payment Entry`, {
  method: 'POST',
  body: JSON.stringify(pePayload),
})).data;
console.log('✓ PE created (draft):', created.name);

// ─── Submit Payment Entry ─────────────────────────────────────────
console.log('\n== Submitting PE ==');
await api(`${BASE}/api/resource/Payment Entry/${created.name}`, {
  method: 'PUT',
  body: JSON.stringify({ docstatus: 1 }),
});
console.log('✓ Submitted:', created.name);

// ─── Verify ──────────────────────────────────────────────────────
console.log('\n== Verification ==');
await new Promise(resolve => setTimeout(resolve, 1500));

const invAfter = (await api(`${BASE}/api/resource/Sales Invoice/${INVOICE}`)).data;
console.log(`Invoice ${INVOICE}:`);
console.log(`  outstanding_amount: ₹${invAfter.outstanding_amount} (expected ₹0)`);
console.log(`  status:             ${invAfter.status} (expected Paid)`);

const peCheck = (await api(`${BASE}/api/resource/Payment Entry/${created.name}`)).data;
console.log(`\nPayment Entry ${created.name}:`);
console.log(`  paid_amount: ₹${peCheck.paid_amount}`);
console.log(`  reference_no: ${peCheck.reference_no}`);
console.log(`  docstatus: ${peCheck.docstatus}`);

if (invAfter.outstanding_amount === 0 && invAfter.status === 'Paid') {
  console.log('\n✅ SUCCESS — Invoice fully paid and closed.');
} else {
  console.log('\n⚠️  Invoice not fully reconciled. Check manually.');
}
