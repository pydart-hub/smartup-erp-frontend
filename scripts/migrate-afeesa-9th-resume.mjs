/**
 * migrate-afeesa-9th-resume.mjs
 * Resumes Afeesa migration from step 13 (invoice creation).
 * Fixes: use posting_date = due_date for each invoice (Frappe requirement).
 * Also: delete old cancelled invoice ACC-SINV-2026-02421 and old SO.
 *
 * State at entry:
 *  ✓ PE cancelled/deleted
 *  ✓ 7 invoices cancelled/deleted
 *  ✓ Old SO cancelled (blocked from delete by ACC-SINV-2026-02421)
 *  ✓ 11 CEs deleted
 *  ✓ Old PE deleted
 *  ✓ Removed from Eraveli-10th State-A
 *  ✓ New PE PEN-9th-Eraveli 26-27-010 created & submitted
 *  ✓ Student added to Eraveli-9th State-A
 *  ✓ New SO SAL-ORD-2026-00959 created & submitted
 *  ✗ Invoices not yet created
 *  ✗ Payment entry not yet created
 */

const BASE    = 'https://smartup.m.frappe.cloud';
const AUTH    = 'token 03330270e330d49:9c2261ae11ac2d2';
const HEADERS = { 'Content-Type': 'application/json', Authorization: AUTH };

const CUSTOMER       = 'AFEESA U Z';
const STUDENT_ID     = 'STU-SU ERV-26-010';
const COMPANY        = 'Smart Up Eraveli';
const ACADEMIC_YEAR  = '2026-2027';
const NEW_SO         = 'SAL-ORD-2026-00959';
const OLD_SO         = 'SAL-ORD-2026-00182';
const TUITION_ITEM   = '9th State Tuition Fee';
const DEBIT_TO       = 'Debtors - SU ERV';
const INCOME_ACCOUNT = 'Sales - SU ERV';
const COST_CENTER    = 'Main - SU ERV';
const PAID_TO        = 'Cash - SU ERV';
const PAID_AMOUNT    = 2100;
const ENROLLMENT_DATE = '2026-04-02';

// Inst 1–7 @ ₹2,400, Inst 8 @ ₹1,000
const schedule = [
  { label: 'Inst 1', amount: 2400, dueDate: '2026-04-15' },
  { label: 'Inst 2', amount: 2400, dueDate: '2026-05-15' },
  { label: 'Inst 3', amount: 2400, dueDate: '2026-06-15' },
  { label: 'Inst 4', amount: 2400, dueDate: '2026-07-15' },
  { label: 'Inst 5', amount: 2400, dueDate: '2026-08-15' },
  { label: 'Inst 6', amount: 2400, dueDate: '2026-09-15' },
  { label: 'Inst 7', amount: 2400, dueDate: '2026-10-15' },
  { label: 'Inst 8', amount: 1000, dueDate: '2026-11-15' },
];

function step(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

async function fGet(path) {
  const r = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (!r.ok) throw new Error(`GET ${path}: ${r.status} ${await r.text()}`);
  return (await r.json()).data;
}
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
async function fDel(path) {
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: HEADERS });
  if (!r.ok) throw new Error(`DEL ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

// ── CLEANUP: delete the two cancelled invoices blocking the old SO ─────────────
step('=== RESUME: Afeesa 9th Migration — Steps 13–16 ===');

step('\n--- Cleanup: Delete cancelled invoice ACC-SINV-2026-02421 ---');
try {
  await fDel('/api/resource/Sales%20Invoice/ACC-SINV-2026-02421');
  step('  Deleted ACC-SINV-2026-02421');
} catch(e) {
  step('  WARNING: ' + e.message);
}

step('\n--- Cleanup: Delete cancelled invoice ACC-SINV-2026-02422 ---');
try {
  await fDel('/api/resource/Sales%20Invoice/ACC-SINV-2026-02422');
  step('  Deleted ACC-SINV-2026-02422');
} catch(e) {
  step('  INFO: ' + e.message);
}

step('\n--- Cleanup: Delete old SO SAL-ORD-2026-00182 ---');
try {
  await fDel('/api/resource/Sales%20Order/SAL-ORD-2026-00182');
  step('  Deleted old SO SAL-ORD-2026-00182');
} catch(e) {
  step('  WARNING: ' + e.message);
}

// ── Fetch new SO item for linking ──────────────────────────────────────────────
step('\n--- Fetching new SO item details ---');
const soDoc = await fGet(`/api/resource/Sales Order/${encodeURIComponent(NEW_SO)}`);
const soItem = soDoc.items?.[0];
step(`  SO item: ${soItem?.item_code} qty=${soItem?.qty} rate=${soItem?.rate} name=${soItem?.name}`);

// ── Steps 13 & 14: Create & Submit 8 invoices ────────────────────────────────
step('\n--- Steps 13 & 14: Create & Submit 8 Sales Invoices ---');
const createdInvoices = [];
for (const inst of schedule) {
  // posting_date = due_date + set_posting_time:1 forces Frappe to accept backdated dates
  const siPayload = {
    customer             : CUSTOMER,
    company              : COMPANY,
    posting_date         : inst.dueDate,   // ← same as due_date
    set_posting_time     : 1,              // ← required to override Frappe's "use today" default
    due_date             : inst.dueDate,
    student              : STUDENT_ID,
    custom_academic_year : ACADEMIC_YEAR,
    debit_to             : DEBIT_TO,
    items: [{
      item_code    : TUITION_ITEM,
      qty          : 1,
      rate         : inst.amount,
      description  : `${inst.label} — ${TUITION_ITEM}`,
      income_account: INCOME_ACCOUNT,
      cost_center  : COST_CENTER,
      ...(soItem ? { sales_order: NEW_SO, so_detail: soItem.name } : {}),
    }],
  };

  const si = await fPost('/api/resource/Sales Invoice', siPayload);
  step(`  Created draft: ${si.name} — ${inst.label} ₹${inst.amount} due ${inst.dueDate}`);

  await fPut(`/api/resource/Sales Invoice/${encodeURIComponent(si.name)}`, { docstatus: 1 });
  step(`  Submitted: ${si.name}`);
  createdInvoices.push(si.name);
}

// ── Steps 15 & 16: Create & Submit Payment Entry ──────────────────────────────
step('\n--- Steps 15 & 16: Create & Submit Payment Entry ₹2,100 ---');
const inst1Invoice = createdInvoices[0];
const pePayload = {
  payment_type     : 'Receive',
  mode_of_payment  : 'Cash',
  party_type       : 'Customer',
  party            : CUSTOMER,
  company          : COMPANY,
  paid_to          : PAID_TO,
  paid_amount      : PAID_AMOUNT,
  received_amount  : PAID_AMOUNT,
  posting_date     : ENROLLMENT_DATE,
  references: [{
    reference_doctype : 'Sales Invoice',
    reference_name    : inst1Invoice,
    allocated_amount  : PAID_AMOUNT,
  }],
};
const payEntry = await fPost('/api/resource/Payment Entry', pePayload);
step(`  Created Payment Entry draft: ${payEntry.name}`);

await fPut(`/api/resource/Payment Entry/${encodeURIComponent(payEntry.name)}`, { docstatus: 1 });
step(`  Submitted Payment Entry: ${payEntry.name}`);

// ── Summary ───────────────────────────────────────────────────────────────────
step('\n=== MIGRATION COMPLETE ===');
step(`Program Enrollment : PEN-9th-Eraveli 26-27-010`);
step(`Sales Order        : ${NEW_SO}`);
step(`Invoices (8)       : ${createdInvoices.join(', ')}`);
step(`Payment Entry ₹2,100 Cash : ${payEntry.name} → ${inst1Invoice}`);
step(`Student Group      : Eraveli-9th State-A`);
