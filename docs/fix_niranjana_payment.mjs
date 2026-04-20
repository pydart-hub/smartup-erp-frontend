/**
 * Fix NIRANJANA KR payment — move payment from Inst 2 → Inst 1
 *
 * Current (wrong):
 *   ACC-PAY-2026-04407  →  ACC-SINV-2026-04681 (Inst 2, Jun 15) ← Paid
 *   ACC-SINV-2026-04859 (Inst 1, Apr 20) ← Unpaid
 *
 * After fix:
 *   ACC-SINV-2026-04681 (Inst 2, Jun 15) ← Unpaid
 *   ACC-SINV-2026-04859 (Inst 1, Apr 20) ← Paid  (new PE)
 *
 * Steps:
 *   1. Cancel PE ACC-PAY-2026-04407
 *   2. Create + submit new PE linked to ACC-SINV-2026-04859 (Inst 1)
 */

const BASE    = 'https://smartup.m.frappe.cloud';
const HEADERS = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type':  'application/json',
};

const OLD_PE          = 'ACC-PAY-2026-04407';
const WRONG_INVOICE   = 'ACC-SINV-2026-04681';   // Inst 2 — was wrongly paid
const CORRECT_INVOICE = 'ACC-SINV-2026-04859';   // Inst 1 — should be paid
const AMOUNT          = 4200;
const CUSTOMER        = 'NIRANJANA KR';
const COMPANY         = 'Smart Up Vennala';
const MODE            = 'Cash';
const PAID_TO_ACCT    = 'Cash - SU VYT';          // cash account for Vennala
const DEBTORS_ACCT    = 'Debtors - SU VYT';

async function api(method, endpoint, body) {
  const res = await fetch(`${BASE}/api/${endpoint}`, {
    method,
    headers: HEADERS,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error(`  ✗ ${method} ${endpoint}:`, res.status,
      json?.exception || json?.message || JSON.stringify(json).slice(0, 300));
    throw new Error(`API error ${res.status}`);
  }
  return json.data;
}

// ── Step 1: Cancel the wrong Payment Entry ───────────────────────────────────
// Already done in previous run — PE is cancelled, Inst 2 is Unpaid
console.log('\n=== Step 1: Verify old PE already cancelled ===');
const oldPEStatus = await api('GET', `resource/Payment Entry/${encodeURIComponent(OLD_PE)}`);
console.log(`  ${OLD_PE} docstatus=${oldPEStatus.docstatus} (2=cancelled ✓)`);

// ── Step 2: Fetch the correct invoice to build PE ────────────────────────────
console.log('\n=== Step 2: Fetch correct invoice', CORRECT_INVOICE, '===');
const inv1 = await api('GET', `resource/Sales Invoice/${encodeURIComponent(CORRECT_INVOICE)}`);
console.log(`  Invoice: ${inv1.name}  grand_total=${inv1.grand_total}  outstanding=${inv1.outstanding_amount}  status=${inv1.status}`);

// ── Step 3: Create new Payment Entry manually ───────────────────────────────
console.log('\n=== Step 3: Create new Payment Entry for Inst 1 ===');

const pePayload = {
  doctype: 'Payment Entry',
  payment_type: 'Receive',
  posting_date: '2026-04-20',
  company: COMPANY,
  mode_of_payment: MODE,
  party_type: 'Customer',
  party: CUSTOMER,
  party_name: CUSTOMER,
  paid_from: DEBTORS_ACCT,
  paid_to: PAID_TO_ACCT,
  paid_from_account_currency: 'INR',
  paid_to_account_currency: 'INR',
  paid_amount: AMOUNT,
  received_amount: AMOUNT,
  source_exchange_rate: 1,
  target_exchange_rate: 1,
  reference_no: '',
  reference_date: '2026-04-20',
  references: [
    {
      reference_doctype: 'Sales Invoice',
      reference_name: CORRECT_INVOICE,
      allocated_amount: AMOUNT,
    }
  ],
};

const newPE = await api('POST', 'resource/Payment Entry', pePayload);
console.log(`  ✓ Created PE: ${newPE.name}  amount=${newPE.paid_amount}`);

// ── Step 4: Submit new PE ────────────────────────────────────────────────────
console.log('\n=== Step 4: Submit new PE ===');
await api('PUT', `resource/Payment Entry/${encodeURIComponent(newPE.name)}`, { docstatus: 1 });
console.log(`  ✓ Submitted: ${newPE.name}`);

// ── Step 5: Verify final state ───────────────────────────────────────────────
console.log('\n=== Step 5: Verify final state ===');
const finalInv1 = await api('GET', `resource/Sales Invoice/${encodeURIComponent(CORRECT_INVOICE)}`);
const finalInv2 = await api('GET', `resource/Sales Invoice/${encodeURIComponent(WRONG_INVOICE)}`);

console.log(`  Inst 1 (${CORRECT_INVOICE}): ${finalInv1.status}  outstanding=₹${finalInv1.outstanding_amount}`);
console.log(`  Inst 2 (${WRONG_INVOICE}):   ${finalInv2.status}  outstanding=₹${finalInv2.outstanding_amount}`);

console.log('\n=== DONE ===');
console.log(`  Old PE cancelled:   ${OLD_PE}`);
console.log(`  New PE created:     ${newPE.name}`);
console.log(`  Inst 1 now:         ${finalInv1.status}`);
console.log(`  Inst 2 now:         ${finalInv2.status}`);
