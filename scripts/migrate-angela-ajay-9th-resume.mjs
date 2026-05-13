/**
 * migrate-angela-ajay-9th-resume.mjs
 * Resume from Step 13: Create invoices + payment entry
 * (Steps 1-12 already completed: old records deleted, new PE + SO submitted)
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const HEADERS = { 'Content-Type': 'application/json', Authorization: AUTH };

const STUDENT_ID    = 'STU-SU THP-26-030';
const CUSTOMER      = 'Angela ajay';
const COMPANY       = 'Smart Up Thopumpadi';
const ACADEMIC_YEAR = '2026-2027';
const TODAY         = '2026-05-12';
const ENROLLMENT_DATE = '2026-04-20';

const NEW_SO        = 'SAL-ORD-2026-00981';
const TUITION_ITEM  = '9th State Tuition Fee';
const DEBIT_TO      = 'Debtors - SU THP';
const INCOME_ACCOUNT = 'Sales - SU THP';
const COST_CENTER   = 'Main - SU THP';
const CASH_ACCOUNT  = 'Cash - SU THP';
const PAID_AMOUNT   = 5900;

const schedule = [
  { index: 1, label: 'Inst 1', amount: 5900, dueDate: TODAY },          // past due → use today
  { index: 2, label: 'Inst 2', amount: 4200, dueDate: '2026-07-15' },
  { index: 3, label: 'Inst 3', amount: 4200, dueDate: '2026-10-15' },
  { index: 4, label: 'Inst 4', amount: 2600, dueDate: '2027-01-15' },
];

function step(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

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

async function main() {
  step('=== RESUME: Create Invoices + Payment Entry for Angela ajay ===');

  // Fetch SO item for linking
  const soDoc = await fGet(`/api/resource/Sales Order/${encodeURIComponent(NEW_SO)}`);
  const soItem = soDoc.items?.[0];
  step(`SO: ${NEW_SO} | item ref: ${soItem?.name}`);

  // Step 13-14: Create & Submit 4 Invoices
  step('\n--- Step 13-14: Create & Submit 4 Sales Invoices ---');
  const createdInvoices = [];
  for (const inst of schedule) {
    const siPayload = {
      customer: CUSTOMER,
      company: COMPANY,
      posting_date: TODAY,
      due_date: inst.dueDate,
      custom_student: STUDENT_ID,
      custom_academic_year: ACADEMIC_YEAR,
      debit_to: DEBIT_TO,
      items: [{
        item_code: TUITION_ITEM,
        qty: 1,
        rate: inst.amount,
        description: `${inst.label} — ${TUITION_ITEM}`,
        income_account: INCOME_ACCOUNT,
        cost_center: COST_CENTER,
        ...(soItem ? { sales_order: NEW_SO, so_detail: soItem.name } : {}),
      }],
    };
    const si = await fPost('/api/resource/Sales Invoice', siPayload);
    step(`  Created SI draft: ${si.name} — ${inst.label} ₹${inst.amount} due ${inst.dueDate}`);
    await fPut(`/api/resource/Sales Invoice/${encodeURIComponent(si.name)}`, { docstatus: 1 });
    step(`  Submitted SI: ${si.name}`);
    createdInvoices.push(si.name);
  }

  // Step 15-16: Create & Submit Payment Entry ₹5,900 Cash
  step('\n--- Step 15-16: Create & Submit Payment Entry ₹5,900 Cash ---');
  const inst1Invoice = createdInvoices[0];
  const pePayload = {
    payment_type: 'Receive',
    mode_of_payment: 'Cash',
    party_type: 'Customer',
    party: CUSTOMER,
    company: COMPANY,
    paid_from: DEBIT_TO,
    paid_to: CASH_ACCOUNT,
    paid_amount: PAID_AMOUNT,
    received_amount: PAID_AMOUNT,
    posting_date: TODAY,
    references: [{
      reference_doctype: 'Sales Invoice',
      reference_name: inst1Invoice,
      allocated_amount: PAID_AMOUNT,
    }],
  };
  const payEntry = await fPost('/api/resource/Payment Entry', pePayload);
  step(`  Created Payment Entry draft: ${payEntry.name}`);
  await fPut(`/api/resource/Payment Entry/${encodeURIComponent(payEntry.name)}`, { docstatus: 1 });
  step(`  Submitted Payment Entry: ${payEntry.name}`);

  step('\n=== ✅ MIGRATION COMPLETE ===');
  step(`Student: ${CUSTOMER} (${STUDENT_ID})`);
  step(`New PE: PEN-9th-Thopumpadi 26-27-030`);
  step(`New SO: ${NEW_SO}`);
  step(`Invoices: ${createdInvoices.join(', ')}`);
  step(`Payment Entry ₹${PAID_AMOUNT} Cash: ${payEntry.name} → ${inst1Invoice}`);
}

main().catch(e => {
  console.error('\n❌ FAILED:', e.message);
  process.exit(1);
});
