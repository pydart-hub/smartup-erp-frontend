/**
 * milka-plan-change-4to8.mjs
 *
 * Changes MILKA T SUNIL (Kadavanthra, 10th CBSE) from 4-installment to 8-installment plan.
 *
 * Official fee:  ₹31,000 (KDV Basic 10 CBSE 8-inst: 7×₹4,000 + ₹3,000)
 * Discount:      ₹6,000
 * Final fee:     ₹25,000  (7×₹3,300 + ₹1,900)
 *
 * ₹2,000 already paid (Cash, 2026-05-06) → re-created against new Inst 1
 *
 * Run dry-run first:  node scripts/milka-plan-change-4to8.mjs --dry-run
 * Execute:            node scripts/milka-plan-change-4to8.mjs
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) console.log('*** DRY RUN MODE — no changes will be made ***\n');

const headers = { Authorization: AUTH, 'Content-Type': 'application/json' };

// ─── Known constants ──────────────────────────────────────────────────────────
const CUSTOMER          = 'MILKA T SUNIL';
const STUDENT           = 'STU-SU KDV-26-009';
const COMPANY           = 'Smart Up Kadavanthara';
const ITEM_CODE         = '10th CBSE Tuition Fee';
const ACADEMIC_YEAR     = '2026-2027';
const PROGRAM_ENROLLMENT = 'PEN--Kadavanthara 26-27-009';

const PAYMENT_TO_CANCEL = 'ACC-PAY-2026-04813';
const INVOICES_TO_CANCEL = [
  'ACC-SINV-2026-06735',  // Q1 ₹10,300 (₹2,000 paid)
  'ACC-SINV-2026-06736',  // Q2 ₹7,400
  'ACC-SINV-2026-06737',  // Q3 ₹7,400
  'ACC-SINV-2026-06738',  // Q4 ₹4,400
];
const SO_TO_CANCEL = 'SAL-ORD-2026-00879';

// New 8-installment schedule:  7×₹3,300 + ₹1,900 = ₹25,000
const SCHEDULE = [
  { label: 'Inst 1', amount: 3300, dueDate: '2026-05-06' },
  { label: 'Inst 2', amount: 3300, dueDate: '2026-06-06' },
  { label: 'Inst 3', amount: 3300, dueDate: '2026-07-06' },
  { label: 'Inst 4', amount: 3300, dueDate: '2026-08-06' },
  { label: 'Inst 5', amount: 3300, dueDate: '2026-09-06' },
  { label: 'Inst 6', amount: 3300, dueDate: '2026-10-06' },
  { label: 'Inst 7', amount: 3300, dueDate: '2026-11-06' },
  { label: 'Inst 8', amount: 1900, dueDate: '2026-12-06' },
];

const TOTAL_FEE = SCHEDULE.reduce((s, i) => s + i.amount, 0); // must be 25000
if (TOTAL_FEE !== 25000) throw new Error(`Schedule total ${TOTAL_FEE} ≠ 25000`);

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
async function fetchJSON(url, init = {}) {
  const r = await fetch(url, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`${init.method || 'GET'} ${url.replace(BASE, '')} → ${r.status}: ${t.slice(0, 500)}`);
  }
  return r.json();
}

async function getDoc(doctype, name) {
  return (await fetchJSON(`${BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`)).data;
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

async function cancelDoc(doctype, name) {
  const r = await fetch(`${BASE}/api/method/frappe.client.cancel`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ doctype, name }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Cancel ${doctype} ${name} failed: ${t.slice(0, 400)}`);
  }
  return r.json();
}

async function deleteDoc(doctype, name) {
  const r = await fetch(`${BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers,
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Delete ${doctype} ${name} failed: ${t.slice(0, 400)}`);
  }
  return r.json();
}

async function setValue(doctype, name, fieldname) {
  const r = await fetch(`${BASE}/api/method/frappe.client.set_value`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ doctype, name, fieldname }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`set_value ${doctype} ${name} failed: ${t.slice(0, 400)}`);
  }
  return r.json();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(65));
  console.log('MILKA T SUNIL — PLAN CHANGE: 4-inst → 8-inst (₹29,500 → ₹25,000)');
  console.log('Discount: ₹6,000 | Schedule: 7×₹3,300 + ₹1,900 = ₹25,000');
  console.log('='.repeat(65));

  // ─── PRE-FLIGHT: show schedule ────────────────────────────────────────────
  console.log('\n📋 New 8-Installment Schedule:');
  SCHEDULE.forEach(s => console.log(`   ${s.label}: ₹${s.amount} | due ${s.dueDate}`));
  console.log(`   TOTAL: ₹${TOTAL_FEE}\n`);

  // ─── Step 0: Fetch full PE to get accounts ────────────────────────────────
  console.log('🔍 Fetching payment entry details...');
  const peDetail = await getDoc('Payment Entry', PAYMENT_TO_CANCEL);
  console.log(`   paid_from: ${peDetail.paid_from}`);
  console.log(`   paid_to:   ${peDetail.paid_to}`);
  console.log(`   amount:    ₹${peDetail.paid_amount}`);
  console.log(`   mode:      ${peDetail.mode_of_payment}\n`);

  if (DRY_RUN) {
    console.log('*** DRY RUN COMPLETE — No changes made ***');
    console.log('\nWould execute:');
    console.log(`  1. Cancel PE:  ${PAYMENT_TO_CANCEL}`);
    INVOICES_TO_CANCEL.forEach(i => console.log(`  2. Cancel+Delete Invoice: ${i}`));
    console.log(`  3. Cancel+Delete SO: ${SO_TO_CANCEL}`);
    console.log('  4. Create new SO: qty=8, rate=3125, amount=25000');
    console.log('  5. Submit new SO');
    console.log('  6. Create 8 invoices linked to new SO');
    console.log(`  7. Update PEN: custom_no_of_instalments=8`);
    console.log('  8. Re-create ₹2,000 Cash PE against Inst 1');
    return;
  }

  // ─── Step 1: Cancel Payment Entry ────────────────────────────────────────
  console.log(`\n⚙️  STEP 1: Cancel Payment Entry ${PAYMENT_TO_CANCEL}`);
  await cancelDoc('Payment Entry', PAYMENT_TO_CANCEL);
  console.log(`   ✓ Cancelled ${PAYMENT_TO_CANCEL}`);
  await deleteDoc('Payment Entry', PAYMENT_TO_CANCEL);
  console.log(`   ✓ Deleted ${PAYMENT_TO_CANCEL}`);

  // ─── Step 2: Cancel + Delete 4 old invoices ──────────────────────────────
  console.log('\n⚙️  STEP 2: Cancel + Delete 4 old invoices');
  for (const inv of INVOICES_TO_CANCEL) {
    await cancelDoc('Sales Invoice', inv);
    console.log(`   ✓ Cancelled ${inv}`);
    await deleteDoc('Sales Invoice', inv);
    console.log(`   ✓ Deleted   ${inv}`);
  }

  // ─── Step 3: Cancel + Delete Sales Order ─────────────────────────────────
  console.log(`\n⚙️  STEP 3: Cancel + Delete Sales Order ${SO_TO_CANCEL}`);
  await cancelDoc('Sales Order', SO_TO_CANCEL);
  console.log(`   ✓ Cancelled ${SO_TO_CANCEL}`);
  await deleteDoc('Sales Order', SO_TO_CANCEL);
  console.log(`   ✓ Deleted   ${SO_TO_CANCEL}`);

  // ─── Step 4: Create new Sales Order (qty=8, total=₹25,000) ───────────────
  console.log('\n⚙️  STEP 4: Create new Sales Order');
  const soPayload = {
    doctype: 'Sales Order',
    customer: CUSTOMER,
    company: COMPANY,
    transaction_date: '2026-05-06',
    delivery_date: '2026-12-06',
    order_type: 'Sales',
    // Custom fields
    custom_plan: 'Basic',
    custom_no_of_instalments: '8',
    student: STUDENT,
    items: [{
      item_code: ITEM_CODE,
      item_name: ITEM_CODE,
      qty: 8,
      rate: 3125,         // 25000 / 8 = 3125
      amount: 25000,
      delivery_date: '2026-12-06',
    }],
  };
  const newSO = await postDoc('Sales Order', soPayload);
  console.log(`   ✓ Created SO: ${newSO.name}`);

  // Submit the SO
  await putDoc('Sales Order', newSO.name, { docstatus: 1 });
  console.log(`   ✓ Submitted  ${newSO.name}`);

  // Fetch submitted SO to get item row name (needed for invoice linkage)
  const soFull = await getDoc('Sales Order', newSO.name);
  const soItem = soFull.items?.[0];
  if (!soItem) throw new Error('New SO has no items — cannot link invoices');
  console.log(`   SO item row: ${soItem.name}`);

  // Wait briefly for Frappe to commit
  await new Promise(r => setTimeout(r, 1500));

  // ─── Step 5: Create + Submit 8 invoices ──────────────────────────────────
  console.log('\n⚙️  STEP 5: Create + Submit 8 invoices');
  const createdInvoices = [];
  const TODAY = new Date().toISOString().slice(0, 10); // 2026-05-25

  for (const inst of SCHEDULE) {
    const isFirst = inst.label === 'Inst 1';
    const description = isFirst
      ? `${inst.label} — ${ITEM_CODE} | Plan change discount: -₹6,000 applied`
      : `${inst.label} — ${ITEM_CODE}`;

    // due_date must be >= posting_date; for past-due installments, use today
    const dueDate = inst.dueDate >= TODAY ? inst.dueDate : TODAY;

    const invPayload = {
      doctype: 'Sales Invoice',
      customer: CUSTOMER,
      company: COMPANY,
      posting_date: TODAY,
      due_date: dueDate,
      student: STUDENT,
      custom_academic_year: ACADEMIC_YEAR,
      disable_rounded_total: 1,
      items: [{
        item_code: ITEM_CODE,
        item_name: ITEM_CODE,
        description,
        qty: 1,
        rate: inst.amount,
        amount: inst.amount,
        sales_order: soFull.name,
        so_detail: soItem.name,
      }],
    };

    const inv = await postDoc('Sales Invoice', invPayload);
    await putDoc('Sales Invoice', inv.name, { docstatus: 1 });
    createdInvoices.push(inv.name);
    console.log(`   ✓ ${inv.name} | ${inst.label} ₹${inst.amount} | due ${inst.dueDate}`);
  }

  // ─── Step 6: Update Program Enrollment ───────────────────────────────────
  console.log(`\n⚙️  STEP 6: Update Program Enrollment ${PROGRAM_ENROLLMENT}`);
  await setValue('Program Enrollment', PROGRAM_ENROLLMENT, {
    custom_no_of_instalments: '8',
  });
  console.log(`   ✓ custom_no_of_instalments → "8"`);

  // ─── Step 7: Re-create ₹2,000 Payment Entry against Inst 1 ───────────────
  const inst1Invoice = createdInvoices[0];
  console.log(`\n⚙️  STEP 7: Re-create ₹2,000 Cash payment against ${inst1Invoice}`);

  // Wait for invoice to settle in Frappe ledger
  await new Promise(r => setTimeout(r, 1000));

  const newPePayload = {
    doctype: 'Payment Entry',
    payment_type: 'Receive',
    party_type: 'Customer',
    party: CUSTOMER,
    paid_amount: 2000,
    received_amount: 2000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    mode_of_payment: peDetail.mode_of_payment,
    posting_date: '2026-05-06',
    company: COMPANY,
    paid_from: peDetail.paid_from,     // Debtors - SU KDV
    paid_to: peDetail.paid_to,         // Cash - SU KDV (or equivalent)
    paid_from_account_currency: 'INR',
    paid_to_account_currency: 'INR',
    references: [{
      reference_doctype: 'Sales Invoice',
      reference_name: inst1Invoice,
      allocated_amount: 2000,
    }],
  };

  const newPE = await postDoc('Payment Entry', newPePayload);
  console.log(`   ✓ Created PE: ${newPE.name}`);
  await putDoc('Payment Entry', newPE.name, { docstatus: 1 });
  console.log(`   ✓ Submitted  ${newPE.name}`);

  // ─── Final Summary ────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(65));
  console.log('✅ PLAN CHANGE COMPLETE');
  console.log('='.repeat(65));
  console.log(`\nStudent:          ${CUSTOMER} (${STUDENT})`);
  console.log(`New Sales Order:  ${soFull.name} | ₹25,000 | 8 installments`);
  console.log(`New Invoices (8):`);
  createdInvoices.forEach((name, i) => {
    const inst = SCHEDULE[i];
    const paid = i === 0 ? '  ← ₹2,000 paid → ₹1,300 outstanding' : '';
    console.log(`  ${name}: ${inst.label} ₹${inst.amount} | due ${inst.dueDate}${paid}`);
  });
  console.log(`New Payment:      ${newPE.name} | ₹2,000 Cash → ${inst1Invoice}`);
  console.log(`Program Enrol:    custom_no_of_instalments = "8"`);
  console.log('='.repeat(65));
}

main().catch(e => {
  console.error('\n❌ FAILED:', e.message);
  process.exit(1);
});
