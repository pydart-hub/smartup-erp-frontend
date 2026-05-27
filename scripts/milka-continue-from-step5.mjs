/**
 * milka-continue-from-step5.mjs
 *
 * Continuation script — Steps 1-4 already completed in previous run:
 *   - ACC-PAY-2026-04813 cancelled + deleted ✓
 *   - ACC-SINV-2026-06735/06736/06737/06738 cancelled + deleted ✓
 *   - SAL-ORD-2026-00879 cancelled + deleted ✓
 *   - SAL-ORD-2026-01092 created + submitted ✓ (item row: ci4078hnp9)
 *
 * This script completes:
 *   Step 5: Create + submit 8 new invoices
 *   Step 6: Update Program Enrollment to 8-inst
 *   Step 7: Re-create ₹2,000 Cash payment entry → Inst 1
 *
 * Run: node scripts/milka-continue-from-step5.mjs
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const headers = { Authorization: AUTH, 'Content-Type': 'application/json' };

// ─── Constants ────────────────────────────────────────────────────────────────
const CUSTOMER           = 'MILKA T SUNIL';
const STUDENT            = 'STU-SU KDV-26-009';
const COMPANY            = 'Smart Up Kadavanthara';
const ITEM_CODE          = '10th CBSE Tuition Fee';
const ACADEMIC_YEAR      = '2026-2027';
const PROGRAM_ENROLLMENT = 'PEN--Kadavanthara 26-27-009';

// Already created in previous run
const NEW_SO_NAME     = 'SAL-ORD-2026-01092';
const NEW_SO_ITEM_ROW = 'ci4078hnp9';

// Payment accounts (from original PE)
const PAID_FROM     = 'Debtors - SU KDV';
const PAID_TO       = 'Cash - SU KDV';
const MODE_OF_PAY   = 'Cash';

const TODAY = new Date().toISOString().slice(0, 10);

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

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
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

async function setValue(doctype, name, fieldname) {
  const r = await fetch(`${BASE}/api/method/frappe.client.set_value`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ doctype, name, fieldname }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`set_value ${doctype} ${name}: ${t.slice(0, 400)}`);
  }
  return r.json();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(65));
  console.log('MILKA T SUNIL — Continuation: Steps 5-7');
  console.log(`Using SO: ${NEW_SO_NAME} | Item row: ${NEW_SO_ITEM_ROW}`);
  console.log(`Today: ${TODAY}`);
  console.log('='.repeat(65));

  // ─── Step 5: Create + Submit 8 invoices ──────────────────────────────────
  console.log('\n⚙️  STEP 5: Create + Submit 8 invoices');
  const createdInvoices = [];

  for (const inst of SCHEDULE) {
    const isFirst = inst.label === 'Inst 1';
    const description = isFirst
      ? `${inst.label} — ${ITEM_CODE} | Plan change discount applied: -₹6,000`
      : `${inst.label} — ${ITEM_CODE}`;

    // due_date must be >= posting_date (TODAY).
    // Past-due installments (Inst 1 was 2026-05-06) get due_date = today.
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
        sales_order: NEW_SO_NAME,
        so_detail: NEW_SO_ITEM_ROW,
      }],
    };

    const inv = await postDoc('Sales Invoice', invPayload);
    await putDoc('Sales Invoice', inv.name, { docstatus: 1 });
    createdInvoices.push(inv.name);
    console.log(`   ✓ ${inv.name} | ${inst.label} ₹${inst.amount} | due ${dueDate}`);
  }

  // ─── Step 6: Update Program Enrollment ───────────────────────────────────
  console.log(`\n⚙️  STEP 6: Update Program Enrollment ${PROGRAM_ENROLLMENT}`);
  await setValue('Program Enrollment', PROGRAM_ENROLLMENT, {
    custom_no_of_instalments: '8',
  });
  console.log(`   ✓ custom_no_of_instalments → "8"`);

  // ─── Step 7: Re-create ₹2,000 Cash payment → Inst 1 ─────────────────────
  const inst1Invoice = createdInvoices[0];
  console.log(`\n⚙️  STEP 7: Re-create ₹2,000 Cash payment against ${inst1Invoice}`);

  // Brief pause for Frappe ledger to settle
  await new Promise(r => setTimeout(r, 1500));

  const newPePayload = {
    doctype: 'Payment Entry',
    payment_type: 'Receive',
    party_type: 'Customer',
    party: CUSTOMER,
    paid_amount: 2000,
    received_amount: 2000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    mode_of_payment: MODE_OF_PAY,
    posting_date: TODAY,
    company: COMPANY,
    paid_from: PAID_FROM,
    paid_to: PAID_TO,
    paid_from_account_currency: 'INR',
    paid_to_account_currency: 'INR',
    references: [{
      reference_doctype: 'Sales Invoice',
      reference_name: inst1Invoice,
      allocated_amount: 2000,
    }],
  };

  const newPE = await postDoc('Payment Entry', newPePayload);
  console.log(`   ✓ Created PE draft: ${newPE.name}`);
  await putDoc('Payment Entry', newPE.name, { docstatus: 1 });
  console.log(`   ✓ Submitted PE: ${newPE.name}`);

  // ─── Final Summary ────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(65));
  console.log('✅ ALL DONE — MILKA T SUNIL plan change complete');
  console.log('='.repeat(65));
  console.log(`\nNew Sales Order:  ${NEW_SO_NAME} | ₹25,000 | 8 installments`);
  console.log('New Invoices (8):');
  createdInvoices.forEach((name, i) => {
    const inst = SCHEDULE[i];
    const note = i === 0 ? '  ← ₹2,000 paid → ₹1,300 outstanding' : '';
    console.log(`  ${name}: ${inst.label} ₹${inst.amount}${note}`);
  });
  console.log(`New Payment:      ${newPE.name} | ₹2,000 Cash → ${inst1Invoice}`);
  console.log(`Program Enrol:    custom_no_of_instalments = "8"`);
  console.log('='.repeat(65));
}

main().catch(e => {
  console.error('\n❌ FAILED:', e.message);
  process.exit(1);
});
