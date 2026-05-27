/**
 * milka-step7-payment.mjs
 *
 * Final step: Re-create the ₹2,000 Cash payment entry against Inst 1 invoice.
 *
 * Already completed:
 *   - New SO: SAL-ORD-2026-01092 ✓
 *   - 8 invoices: ACC-SINV-2026-08143 to ACC-SINV-2026-08150 ✓
 *
 * Inst 1 (ACC-SINV-2026-08143): ₹3,300 — allocate ₹2,000, outstanding ₹1,300
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const headers = { Authorization: AUTH, 'Content-Type': 'application/json' };

const CUSTOMER     = 'MILKA T SUNIL';
const COMPANY      = 'Smart Up Kadavanthara';
const INST1_INV    = 'ACC-SINV-2026-08143';
const PAID_FROM    = 'Debtors - SU KDV';
const PAID_TO      = 'Cash - SU KDV';
const TODAY        = new Date().toISOString().slice(0, 10);

async function fetchJSON(url, init = {}) {
  const r = await fetch(url, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`${init.method || 'GET'} ${url.replace(BASE, '')} → ${r.status}: ${t.slice(0, 600)}`);
  }
  return r.json();
}

async function postDoc(doctype, body) {
  return (await fetchJSON(`${BASE}/api/resource/${encodeURIComponent(doctype)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })).data;
}

async function putDoc(doctype, name, body) {
  return (await fetchJSON(`${BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })).data;
}

async function main() {
  console.log('Creating ₹2,000 Cash payment for MILKA T SUNIL...');
  console.log(`Allocating to Inst 1 invoice: ${INST1_INV}`);

  const newPePayload = {
    doctype: 'Payment Entry',
    payment_type: 'Receive',
    party_type: 'Customer',
    party: CUSTOMER,
    paid_amount: 2000,
    received_amount: 2000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    mode_of_payment: 'Cash',
    posting_date: TODAY,
    company: COMPANY,
    paid_from: PAID_FROM,
    paid_to: PAID_TO,
    paid_from_account_currency: 'INR',
    paid_to_account_currency: 'INR',
    references: [{
      reference_doctype: 'Sales Invoice',
      reference_name: INST1_INV,
      allocated_amount: 2000,
    }],
  };

  const newPE = await postDoc('Payment Entry', newPePayload);
  console.log(`✓ Created PE draft: ${newPE.name}`);

  await putDoc('Payment Entry', newPE.name, { docstatus: 1 });
  console.log(`✓ Submitted PE: ${newPE.name}`);

  console.log('\n' + '='.repeat(65));
  console.log('✅ MILKA T SUNIL — PLAN CHANGE 100% COMPLETE');
  console.log('='.repeat(65));
  console.log(`
Sales Order:  SAL-ORD-2026-01092 | qty=8 | ₹25,000
8 Invoices:
  ACC-SINV-2026-08143 | Inst 1 ₹3,300 | ₹2,000 paid → ₹1,300 due
  ACC-SINV-2026-08144 | Inst 2 ₹3,300 | due 2026-06-06
  ACC-SINV-2026-08145 | Inst 3 ₹3,300 | due 2026-07-06
  ACC-SINV-2026-08146 | Inst 4 ₹3,300 | due 2026-08-06
  ACC-SINV-2026-08147 | Inst 5 ₹3,300 | due 2026-09-06
  ACC-SINV-2026-08148 | Inst 6 ₹3,300 | due 2026-10-06
  ACC-SINV-2026-08149 | Inst 7 ₹3,300 | due 2026-11-06
  ACC-SINV-2026-08150 | Inst 8 ₹1,900 | due 2026-12-06
Payment:      ${newPE.name} | ₹2,000 Cash → ACC-SINV-2026-08143
  `);
}

main().catch(e => {
  console.error('\n❌ FAILED:', e.message);
  process.exit(1);
});
