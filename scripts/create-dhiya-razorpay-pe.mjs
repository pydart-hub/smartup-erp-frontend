// create-dhiya-razorpay-pe.mjs — Record ₹1,100 Razorpay payment for DHIYA FATHIMA SA
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

const api = async (url, opts = {}) => {
  const r = await fetch(url, {
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    ...opts,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${t.slice(0, 400)}`);
  return JSON.parse(t);
};

const CUSTOMER    = 'DHIYA FATHIMA SA';
const COMPANY     = 'Smart Up Eraveli';
const INVOICE     = 'ACC-SINV-2026-04088';
const AMOUNT      = 1100;
const RAZORPAY_ID = 'pay_SoMHUz17KL259K';
const TODAY       = '2026-05-18';

// ─── Safety check ────────────────────────────────────────────────
console.log('== Safety Check ==');
const inv = (await api(`${BASE}/api/resource/Sales Invoice/${INVOICE}`)).data;
console.log(`${INVOICE}: outstanding=${inv.outstanding_amount}, status=${inv.status}`);

if (inv.outstanding_amount !== AMOUNT) {
  throw new Error(`Expected outstanding ₹${AMOUNT}, got ₹${inv.outstanding_amount}. Aborting.`);
}
if (inv.docstatus !== 1) {
  throw new Error(`Invoice not submitted (docstatus=${inv.docstatus}). Aborting.`);
}
console.log('✓ Outstanding matches ₹1,100 — safe to proceed\n');

// ─── Get accounts ────────────────────────────────────────────────
console.log('== Get Accounts ==');
// Get Debtors (Receivable) account for Smart Up Eraveli
const debtorsRes = await api(`${BASE}/api/resource/Account?filters=[["company","=","${COMPANY}"],["account_type","=","Receivable"]]&fields=["name","account_type"]&limit=5`);
console.log('Receivable accounts:', JSON.stringify(debtorsRes.data));
const debtorsAccount = debtorsRes.data[0]?.name;
if (!debtorsAccount) throw new Error('No Receivable account found for ' + COMPANY);

// Get Razorpay account for Smart Up Eraveli
const mop = (await api(`${BASE}/api/resource/Mode of Payment/Razorpay`)).data;
const razorpayAccount = mop.accounts?.find(a => a.company === COMPANY)?.default_account;
console.log('Razorpay account:', razorpayAccount);
if (!razorpayAccount) {
  console.log('All MOP accounts:', mop.accounts?.map(a => `${a.company}: ${a.default_account}`));
  throw new Error('No Razorpay account found for ' + COMPANY);
}

// ─── Create Payment Entry ────────────────────────────────────────
console.log('\n== Creating Payment Entry ==');
const pePayload = {
  doctype: 'Payment Entry',
  payment_type: 'Receive',
  posting_date: TODAY,
  company: COMPANY,
  party_type: 'Customer',
  party: CUSTOMER,
  paid_from: debtorsAccount,   // Debtors - SU ERV (receivable)
  paid_to: razorpayAccount,    // Razorpay - SU ERV (bank)
  mode_of_payment: 'Razorpay',
  paid_amount: AMOUNT,
  received_amount: AMOUNT,
  reference_no: RAZORPAY_ID,
  reference_date: TODAY,
  remarks: `Razorpay payment for ${INVOICE} - Inst 1 balance`,
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
console.log('✓ PE created:', created.name);

// ─── Submit Payment Entry ────────────────────────────────────────
console.log('\n== Submitting PE ==');
await api(`${BASE}/api/resource/Payment Entry/${created.name}`, {
  method: 'PUT',
  body: JSON.stringify({ docstatus: 1 }),
});
console.log('✓ Submitted:', created.name);

// ─── Verify ─────────────────────────────────────────────────────
console.log('\n== Verification ==');
await new Promise(r => setTimeout(r, 1000));
const invAfter = (await api(`${BASE}/api/resource/Sales Invoice/${INVOICE}`)).data;
console.log(`${INVOICE} outstanding: ₹${invAfter.outstanding_amount} (expected ₹0) | status: ${invAfter.status}`);

const peCheck = (await api(`${BASE}/api/resource/Payment Entry/${created.name}`)).data;
console.log(`PE ${created.name}: paid=₹${peCheck.paid_amount}, ref=${peCheck.reference_no}, docstatus=${peCheck.docstatus}`);

if (invAfter.outstanding_amount === 0) {
  console.log('\n✅ Inst 1 is now PAID IN FULL');
} else {
  console.log('\n⚠ Outstanding still ₹' + invAfter.outstanding_amount);
}
