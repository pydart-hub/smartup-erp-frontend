const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const HEADERS = { 'Content-Type': 'application/json', Authorization: AUTH };

async function fPost(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`POST ${path}: ${r.status} ${await r.text()}`);
  return (await r.json()).data;
}
async function fPut(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'PUT', headers: HEADERS, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`PUT ${path}: ${r.status} ${await r.text()}`);
  return (await r.json()).data;
}
async function fGet(path) {
  const r = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (!r.ok) throw new Error(`GET ${path}: ${r.status} ${await r.text()}`);
  return (await r.json()).data;
}

const INVOICE_INST1 = 'ACC-SINV-2026-06855';
const CUSTOMER = 'Sirin Fathima';
const COMPANY = 'Smart Up Palluruthy';
const PAID_FROM = 'Debtors - SU PLR';   // receivable (where customer owes)
const PAID_TO = 'UPI - SU PLR';          // bank (where cash lands)
const PAID_AMOUNT = 3000;
const POSTING_DATE = '2026-05-07';

console.log('Creating Payment Entry ₹3,000 for', INVOICE_INST1);

const pe = await fPost('/api/resource/Payment Entry', {
  payment_type: 'Receive',
  mode_of_payment: 'UPI',
  party_type: 'Customer',
  party: CUSTOMER,
  company: COMPANY,
  posting_date: POSTING_DATE,
  paid_from: PAID_FROM,
  paid_to: PAID_TO,
  paid_from_account_currency: 'INR',
  paid_to_account_currency: 'INR',
  paid_amount: PAID_AMOUNT,
  received_amount: PAID_AMOUNT,
  reference_no: 'SIRIN-9TH-CORRECTION',
  reference_date: POSTING_DATE,
  references: [{
    reference_doctype: 'Sales Invoice',
    reference_name: INVOICE_INST1,
    allocated_amount: PAID_AMOUNT,
    total_amount: PAID_AMOUNT,
    outstanding_amount: PAID_AMOUNT,
  }],
});
console.log('Created PE draft:', pe.name);

// Submit
await fPut(`/api/resource/Payment Entry/${encodeURIComponent(pe.name)}`, { docstatus: 1 });
console.log('Submitted Payment Entry:', pe.name);

// Verify: check invoice status
const inv = await fGet(`/api/resource/Sales Invoice/${encodeURIComponent(INVOICE_INST1)}?fields=["name","status","outstanding_amount"]`);
console.log('\nInvoice status:', inv.status, '| Outstanding:', inv.outstanding_amount);

console.log('\n=== ALL DONE ===');
console.log('Payment Entry:', pe.name);
console.log('Invoice 1 (paid):', INVOICE_INST1);
