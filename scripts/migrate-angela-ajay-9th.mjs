/**
 * migrate-angela-ajay-9th.mjs
 * Corrects Angela ajay's enrollment from 10th State → 9th State (Thopumpadi branch)
 *
 * Steps:
 *  1. Cancel & Delete Payment Entry (₹5,900 Cash)
 *  2. Cancel & Delete 4 Sales Invoices
 *  3. Cancel & Delete Sales Order
 *  4. Delete 10 Course Enrollments (docstatus: 0, no cancel needed)
 *  5. Cancel & Delete Program Enrollment
 *  6. Remove student from Thopumpadi-10th State-A
 *  7. Create new Program Enrollment (9th State, Basic, 4)
 *  8. Patch Course Enrollments → Thopumpadi-9th State-A
 *  9. Submit Program Enrollment
 * 10. Add student to Thopumpadi-9th State-A
 * 11. Create new Sales Order (9th State Tuition Fee × 4 @ ₹4,225)
 * 12. Submit Sales Order
 * 13. Create 4 Sales Invoices
 * 14. Submit all invoices
 * 15. Create Payment Entry ₹5,900 Cash against Inst 1
 * 16. Submit Payment Entry
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const HEADERS = { 'Content-Type': 'application/json', Authorization: AUTH };

// ── Student details ──────────────────────────────────────────────────────────
const STUDENT_ID    = 'STU-SU THP-26-030';
const STUDENT_NAME  = 'Angela ajay';
const CUSTOMER      = 'Angela ajay';
const COMPANY       = 'Smart Up Thopumpadi';
const ACADEMIC_YEAR = '2026-2027';

// ── Old records ───────────────────────────────────────────────────────────────
const OLD_PE            = 'PEN-10th-Thopumpadi 26-27-030';
const OLD_SO            = 'SAL-ORD-2026-00589';
const OLD_PAYMENT_ENTRY = 'ACC-PAY-2026-04471';
const OLD_INVOICES = [
  'ACC-SINV-2026-05027',  // ₹5,900 — Paid
  'ACC-SINV-2026-05028',  // ₹4,200 — Unpaid
  'ACC-SINV-2026-05029',  // ₹4,200 — Unpaid
  'ACC-SINV-2026-05030',  // ₹2,600 — Unpaid
];
const OLD_STUDENT_GROUP = 'Thopumpadi-10th State-A';
const OLD_CES = [
  'CEN-10th Biology-Thopumpadi 26-27-030',
  'CEN-10th Chemistry-Thopumpadi 26-27-030',
  'CEN-10th English-Thopumpadi 26-27-030',
  'CEN-10th Hindi-Thopumpadi 26-27-030',
  'CEN-10th IT-Thopumpadi 26-27-030',
  'CEN-10th Language1-Thopumpadi 26-27-030',
  'CEN-10th Language2-Thopumpadi 26-27-030',
  'CEN-10th Mathematics-Thopumpadi 26-27-030',
  'CEN-10th Physics-Thopumpadi 26-27-030',
  'CEN-10th Social Science-Thopumpadi 26-27-030',
];

// ── New 9th details ───────────────────────────────────────────────────────────
const NEW_PROGRAM       = '9th State';
const NEW_FEE_STRUCTURE = 'SU THP-9th State-Basic-4';
const NEW_PLAN          = 'Basic';
const NEW_INSTALMENTS   = '4';
const NEW_BATCH_CODE    = 'Thopumpadi 26-27';
const NEW_STUDENT_GROUP = 'Thopumpadi-9th State-A';
const TUITION_ITEM      = '9th State Tuition Fee';
const ENROLLMENT_DATE   = '2026-04-20';

// ── Fee schedule (match existing 10th amounts exactly — same total ₹16,900) ──
const FEE_TOTAL  = 16900;
const SO_RATE    = 4225; // 16900 / 4

const schedule = [
  { index: 1, label: 'Inst 1', amount: 5900, dueDate: '2026-04-20' }, // ₹5,900 paid
  { index: 2, label: 'Inst 2', amount: 4200, dueDate: '2026-07-15' },
  { index: 3, label: 'Inst 3', amount: 4200, dueDate: '2026-10-15' },
  { index: 4, label: 'Inst 4', amount: 2600, dueDate: '2027-01-15' },
];

// ── Accounts ──────────────────────────────────────────────────────────────────
const DEBIT_TO      = 'Debtors - SU THP';
const INCOME_ACCOUNT = 'Sales - SU THP';
const COST_CENTER   = 'Main - SU THP';
const CASH_ACCOUNT  = 'Cash - SU THP';
const PAID_AMOUNT   = 5900;
const TODAY         = '2026-05-12'; // actual run date

// ── Helpers ───────────────────────────────────────────────────────────────────
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

async function fDel(path) {
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: HEADERS });
  if (!r.ok) throw new Error(`DEL ${path}: ${r.status} ${await r.text()}`);
  return (await r.json());
}

async function cancelAndDelete(doctype, name) {
  const encoded = encodeURIComponent(name);
  const path = `/api/resource/${encodeURIComponent(doctype)}/${encoded}`;
  try {
    const doc = await fGet(path);
    if (doc.docstatus === 1) {
      await fPut(path, { docstatus: 2 });
      step(`  Cancelled ${doctype}: ${name}`);
    } else {
      step(`  ${doctype} ${name} already in state ${doc.docstatus}, skipping cancel`);
    }
  } catch (e) {
    step(`  WARNING: Cancel check failed for ${name}: ${e.message}`);
  }
  try {
    await fDel(path);
    step(`  Deleted ${doctype}: ${name}`);
  } catch (e) {
    step(`  WARNING: Delete failed for ${name}: ${e.message}`);
  }
}

async function deleteOnly(doctype, name) {
  const encoded = encodeURIComponent(name);
  const path = `/api/resource/${encodeURIComponent(doctype)}/${encoded}`;
  try {
    await fDel(path);
    step(`  Deleted ${doctype}: ${name}`);
  } catch (e) {
    step(`  WARNING: Delete failed for ${name}: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  step('=== MIGRATION: Angela ajay — 10th State → 9th State (Thopumpadi) ===');

  // ══ STEP 1: Cancel & Delete Payment Entry ══
  step('\n--- Step 1: Cancel & Delete Payment Entry ---');
  await cancelAndDelete('Payment Entry', OLD_PAYMENT_ENTRY);

  // ══ STEP 2: Cancel & Delete all Invoices ══
  step('\n--- Step 2: Cancel & Delete 4 Sales Invoices ---');
  for (const inv of OLD_INVOICES) {
    await cancelAndDelete('Sales Invoice', inv);
  }

  // ══ STEP 3: Cancel & Delete Sales Order ══
  step('\n--- Step 3: Cancel & Delete Sales Order ---');
  await cancelAndDelete('Sales Order', OLD_SO);

  // ══ STEP 4: Delete 10 Course Enrollments (docstatus: 0) ══
  step('\n--- Step 4: Delete old Course Enrollments ---');
  for (const ce of OLD_CES) {
    await deleteOnly('Course Enrollment', ce);
  }

  // ══ STEP 5: Cancel & Delete Program Enrollment ══
  step('\n--- Step 5: Cancel & Delete Program Enrollment ---');
  await cancelAndDelete('Program Enrollment', OLD_PE);

  // ══ STEP 6: Remove student from Thopumpadi-10th State-A ══
  step('\n--- Step 6: Remove student from old Student Group ---');
  const oldSG = await fGet(`/api/resource/Student Group/${encodeURIComponent(OLD_STUDENT_GROUP)}`);
  const filteredMembers = (oldSG.students || []).filter(m => m.student !== STUDENT_ID);
  await fPut(`/api/resource/Student Group/${encodeURIComponent(OLD_STUDENT_GROUP)}`, { students: filteredMembers });
  step(`  Removed ${STUDENT_NAME} from ${OLD_STUDENT_GROUP}`);

  // ══ STEP 7: Create new Program Enrollment (9th State) ══
  step('\n--- Step 7: Create new Program Enrollment (9th State) ---');
  const newPE = await fPost('/api/resource/Program Enrollment', {
    student: STUDENT_ID,
    student_name: STUDENT_NAME,
    program: NEW_PROGRAM,
    academic_year: ACADEMIC_YEAR,
    enrollment_date: ENROLLMENT_DATE,
    student_batch_name: NEW_BATCH_CODE,
    custom_fee_structure: NEW_FEE_STRUCTURE,
    custom_plan: NEW_PLAN,
    custom_no_of_instalments: NEW_INSTALMENTS,
  });
  const newPEName = newPE.name;
  step(`  Created PE: ${newPEName}`);

  // ══ STEP 8: Patch Course Enrollments with 9th batch name ══
  step('\n--- Step 8: Patch Course Enrollments with batch name ---');
  const autoCEs = await fGet(`/api/resource/Course Enrollment?filters=[["program_enrollment","=","${newPEName}"]]&fields=["name","course"]&limit=50`);
  const ceList = Array.isArray(autoCEs) ? autoCEs : [];
  step(`  Found ${ceList.length} auto-created Course Enrollments`);
  for (const ce of ceList) {
    await fPut(`/api/resource/Course Enrollment/${encodeURIComponent(ce.name)}`, {
      custom_batch_name: NEW_STUDENT_GROUP,
    });
    step(`  Patched CE ${ce.name} (${ce.course}) → ${NEW_STUDENT_GROUP}`);
  }

  // ══ STEP 9: Submit Program Enrollment ══
  step('\n--- Step 9: Submit Program Enrollment ---');
  await fPut(`/api/resource/Program Enrollment/${encodeURIComponent(newPEName)}`, { docstatus: 1 });
  step(`  Submitted PE: ${newPEName}`);

  // ══ STEP 10: Add student to Thopumpadi-9th State-A ══
  step('\n--- Step 10: Add student to Thopumpadi-9th State-A ---');
  const sg9 = await fGet(`/api/resource/Student Group/${encodeURIComponent(NEW_STUDENT_GROUP)}`);
  const members9 = sg9.students || [];
  if (!members9.some(m => m.student === STUDENT_ID)) {
    const updated9 = [...members9, { student: STUDENT_ID, student_name: STUDENT_NAME, active: 1 }];
    await fPut(`/api/resource/Student Group/${encodeURIComponent(NEW_STUDENT_GROUP)}`, { students: updated9 });
    step(`  Added ${STUDENT_NAME} to ${NEW_STUDENT_GROUP}`);
  } else {
    step(`  Student already in ${NEW_STUDENT_GROUP}`);
  }

  // ══ STEP 11: Create new Sales Order ══
  step('\n--- Step 11: Create new Sales Order ---');
  const newSO = await fPost('/api/resource/Sales Order', {
    customer: CUSTOMER,
    company: COMPANY,
    transaction_date: ENROLLMENT_DATE,
    delivery_date: ENROLLMENT_DATE,
    custom_student: STUDENT_ID,
    custom_academic_year: ACADEMIC_YEAR,
    custom_plan: NEW_PLAN,
    custom_no_of_instalments: NEW_INSTALMENTS,
    items: [{ item_code: TUITION_ITEM, qty: 4, rate: SO_RATE }],
  });
  const newSOName = newSO.name;
  step(`  Created SO: ${newSOName}`);

  // ══ STEP 12: Submit Sales Order ══
  step('\n--- Step 12: Submit Sales Order ---');
  await fPut(`/api/resource/Sales Order/${encodeURIComponent(newSOName)}`, { docstatus: 1 });
  step(`  Submitted SO: ${newSOName}`);

  // Fetch SO to get item reference for linking
  const soDoc = await fGet(`/api/resource/Sales Order/${encodeURIComponent(newSOName)}`);
  const soItem = soDoc.items?.[0];

  // ══ STEP 13 & 14: Create & Submit 4 Sales Invoices ══
  step('\n--- Step 13-14: Create & Submit 4 Sales Invoices ---');
  const createdInvoices = [];
  for (const inst of schedule) {
    const siPayload = {
      customer: CUSTOMER,
      company: COMPANY,
      posting_date: TODAY,
      due_date: inst.dueDate >= TODAY ? inst.dueDate : TODAY,
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
        ...(soItem ? { sales_order: newSOName, so_detail: soItem.name } : {}),
      }],
    };
    const si = await fPost('/api/resource/Sales Invoice', siPayload);
    step(`  Created SI draft: ${si.name} — ${inst.label} ₹${inst.amount} due ${inst.dueDate}`);
    await fPut(`/api/resource/Sales Invoice/${encodeURIComponent(si.name)}`, { docstatus: 1 });
    step(`  Submitted SI: ${si.name}`);
    createdInvoices.push(si.name);
  }

  // ══ STEP 15 & 16: Create & Submit Payment Entry ₹5,900 Cash ══
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
    posting_date: ENROLLMENT_DATE,
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

  // ══ DONE ══
  step('\n=== ✅ MIGRATION COMPLETE ===');
  step(`Student: ${STUDENT_NAME} (${STUDENT_ID})`);
  step(`New Program Enrollment: ${newPEName}`);
  step(`New Sales Order: ${newSOName}`);
  step(`Invoices: ${createdInvoices.join(', ')}`);
  step(`Payment Entry ₹${PAID_AMOUNT} Cash: ${payEntry.name} → ${inst1Invoice}`);
  step(`Student Group: ${NEW_STUDENT_GROUP}`);
}

main().catch(e => {
  console.error('\n❌ MIGRATION FAILED:', e.message);
  process.exit(1);
});
