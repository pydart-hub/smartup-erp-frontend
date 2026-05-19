/**
 * fix-sana-fathima-ts-payment.mjs
 *
 * SANA FATHIMA TS (STU-SU FKO-26-091) — Smart Up Fortkochi
 *
 * Problem: Payment Entry ACC-PAY-2026-05075 recorded ₹3300 (Cash)
 *          but only ₹2800 was actually received.
 *          Invoice ACC-SINV-2026-07683 (₹3300) is currently showing Paid/0 outstanding.
 *
 * Fix:
 *   1. Cancel ACC-PAY-2026-05075 (₹3300 Cash)
 *   2. Delete ACC-PAY-2026-05075
 *   3. Recreate Payment Entry for ₹2800 against ACC-SINV-2026-07683
 *   4. Submit → invoice will show outstanding = ₹500
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const HEADERS = { 'Content-Type': 'application/json', Authorization: AUTH };

function step(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

async function fGet(path) {
  const r = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (!r.ok) throw new Error(`GET ${path}: ${r.status} ${await r.text()}`);
  return (await r.json()).data;
}
async function fPost(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
  const json = await r.json();
  if (!r.ok) throw new Error(`POST ${path}: ${r.status} ${JSON.stringify(json).slice(0, 300)}`);
  return json.data;
}
async function fPut(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'PUT', headers: HEADERS, body: JSON.stringify(body) });
  const json = await r.json();
  if (!r.ok) throw new Error(`PUT ${path}: ${r.status} ${JSON.stringify(json).slice(0, 300)}`);
  return json.data;
}
async function fDel(path) {
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: HEADERS });
  const json = await r.json();
  if (!r.ok) throw new Error(`DEL ${path}: ${r.status} ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

const OLD_PE    = 'ACC-PAY-2026-05075';   // ₹3300 wrong
const INVOICE   = 'ACC-SINV-2026-07683';  // May installment
const NEW_AMOUNT = 2800;

async function main() {
  step('=== FIX: SANA FATHIMA TS payment 3300 → 2800 ===');

  // STEP 1: Fetch existing PE details
  step('\n--- Step 1: Fetch existing Payment Entry ---');
  const pe = await fGet(`/api/resource/Payment Entry/${encodeURIComponent(OLD_PE)}`);
  step(`  party: ${pe.party} (${pe.party_name})`);
  step(`  paid_amount: ${pe.paid_amount}`);
  step(`  mode_of_payment: ${pe.mode_of_payment}`);
  step(`  posting_date: ${pe.posting_date}`);
  step(`  company: ${pe.company}`);
  step(`  paid_from: ${pe.paid_from}`);
  step(`  paid_to: ${pe.paid_to}`);
  step(`  references: ${JSON.stringify(pe.references?.map(r => ({ doc: r.reference_name, amt: r.allocated_amount })))}`);

  if (pe.paid_amount !== 3300) {
    throw new Error(`Expected paid_amount=3300, got ${pe.paid_amount}. Aborting to be safe.`);
  }

  // STEP 2: Cancel old PE
  step('\n--- Step 2: Cancel old Payment Entry ---');
  await fPut(`/api/resource/Payment Entry/${encodeURIComponent(OLD_PE)}`, { docstatus: 2 });
  step(`  ✓ Cancelled ${OLD_PE}`);

  // STEP 3: Delete old PE
  step('\n--- Step 3: Delete old Payment Entry ---');
  await fDel(`/api/resource/Payment Entry/${encodeURIComponent(OLD_PE)}`);
  step(`  ✓ Deleted ${OLD_PE}`);

  // STEP 4: Create new PE for ₹2800
  step('\n--- Step 4: Create new Payment Entry for ₹2800 ---');
  const newPayload = {
    payment_type: pe.payment_type,
    mode_of_payment: pe.mode_of_payment,
    party_type: pe.party_type,
    party: pe.party,
    party_name: pe.party_name,
    company: pe.company,
    paid_from: pe.paid_from,
    paid_to: pe.paid_to,
    paid_amount: NEW_AMOUNT,
    received_amount: NEW_AMOUNT,
    source_exchange_rate: pe.source_exchange_rate ?? 1,
    target_exchange_rate: pe.target_exchange_rate ?? 1,
    posting_date: pe.posting_date,
    reference_no: pe.reference_no,
    reference_date: pe.reference_date,
    remarks: pe.remarks,
    references: [{
      reference_doctype: 'Sales Invoice',
      reference_name: INVOICE,
      allocated_amount: NEW_AMOUNT,
    }],
  };
  const newPE = await fPost('/api/resource/Payment Entry', newPayload);
  step(`  ✓ Created draft: ${newPE.name}`);

  // STEP 5: Submit new PE
  step('\n--- Step 5: Submit new Payment Entry ---');
  await fPut(`/api/resource/Payment Entry/${encodeURIComponent(newPE.name)}`, { docstatus: 1 });
  step(`  ✓ Submitted ${newPE.name}`);

  // STEP 6: Verify invoice
  step('\n--- Step 6: Verify invoice status ---');
  const inv = await fGet(`/api/resource/Sales Invoice/${encodeURIComponent(INVOICE)}`);
  step(`  invoice: ${INVOICE}`);
  step(`  grand_total: ${inv.grand_total}`);
  step(`  outstanding_amount: ${inv.outstanding_amount}`);
  step(`  status: ${inv.status}`);

  step('\n=== DONE ===');
  step(`  New Payment Entry: ${newPE.name} — ₹${NEW_AMOUNT} (Cash) → ${INVOICE}`);
  step(`  Invoice outstanding: ₹${inv.outstanding_amount} (was 0, should now be 500)`);
}

main().catch(e => {
  console.error('\n❌ FATAL:', e.message);
  process.exit(1);
});
