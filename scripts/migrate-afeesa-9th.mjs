/**
 * migrate-afeesa-9th.mjs
 * Corrects AFEESA U Z's enrollment from 10th State → 9th State (Eraveli branch)
 *
 * Steps:
 *  1. Cancel & delete Payment Entry (₹2,100 Cash)
 *  2. Cancel & delete 7 Sales Invoices
 *  3. Cancel & delete Sales Order
 *  4. Cancel & delete 11 Course Enrollments
 *  5. Cancel & delete Program Enrollment
 *  6. Remove student from Eraveli-10th State-A
 *  7. Create new Program Enrollment (9th State, Basic, 8)
 *  8. Patch Course Enrollments → Eraveli-9th State-A
 *  9. Submit Program Enrollment
 * 10. Add student to Eraveli-9th State-A
 * 11. Create new Sales Order (9th State Tuition Fee × 8 @ ₹2,225)
 * 12. Submit Sales Order
 * 13. Create 8 Sales Invoices (Inst 1–7 @ ₹2,400 + Inst 8 @ ₹1,000)
 * 14. Submit all invoices
 * 15. Create Payment Entry ₹2,100 Cash against new Inst 1
 * 16. Submit Payment Entry
 */

const BASE   = 'https://smartup.m.frappe.cloud';
const AUTH   = 'token 03330270e330d49:9c2261ae11ac2d2';
const HEADERS = { 'Content-Type': 'application/json', Authorization: AUTH };

// ── Student details ───────────────────────────────────────────────────────────
const STUDENT_ID     = 'STU-SU ERV-26-010';
const STUDENT_NAME   = 'AFEESA U Z';
const CUSTOMER       = 'AFEESA U Z';
const COMPANY        = 'Smart Up Eraveli';
const ACADEMIC_YEAR  = '2026-2027';

// ── Old records ───────────────────────────────────────────────────────────────
const OLD_PE            = 'PEN-10th-Eraveli 26-27-010';
const OLD_SO            = 'SAL-ORD-2026-00182';
const OLD_PAYMENT_ENTRY = 'ACC-PAY-2026-03985';
const OLD_INVOICES = [
  'ACC-SINV-2026-02415',   // ₹2,400 — Overdue (₹2,100 paid)
  'ACC-SINV-2026-02416',   // ₹2,400 — Unpaid
  'ACC-SINV-2026-02417',   // ₹2,400 — Unpaid
  'ACC-SINV-2026-02418',   // ₹2,400 — Unpaid
  'ACC-SINV-2026-02419',   // ₹2,400 — Unpaid
  'ACC-SINV-2026-02420',   // ₹2,400 — Unpaid
  'ACC-SINV-2026-02421-1', // ₹1,900 — Unpaid (amendment)
];
const OLD_STUDENT_GROUP = 'Eraveli-10th State-A';

// ── New 9th details ───────────────────────────────────────────────────────────
const NEW_PROGRAM        = '9th State';
const NEW_FEE_STRUCTURE  = 'SU ERV-9th State-Basic-8';
const NEW_PLAN           = 'Basic';
const NEW_INSTALMENTS    = '8';
const NEW_BATCH_CODE     = 'Eraveli 26-27';
const NEW_STUDENT_GROUP  = 'Eraveli-9th State-A';
const TUITION_ITEM       = '9th State Tuition Fee';
const ENROLLMENT_DATE    = '2026-04-02';
const DEBIT_TO           = 'Debtors - SU ERV';
const INCOME_ACCOUNT     = 'Sales - SU ERV';
const COST_CENTER        = 'Main - SU ERV';
const PAID_TO            = 'Cash - SU ERV';

// ── Fee schedule (matches existing 9th Basic-8 Eraveli students) ──────────────
// 9th Basic-8 total = ₹17,800  →  7 × ₹2,400 + 1 × ₹1,000
const FEE_TOTAL     = 17800;
const INST_REGULAR  = 2400;   // installments 1–7
const INST_LAST     = 1000;   // installment 8
const PAID_AMOUNT   = 2100;   // already received

// Due dates: 15th of each month, April → November 2026
const DUE_DATES = [
  '2026-04-15', '2026-05-15', '2026-06-15', '2026-07-15',
  '2026-08-15', '2026-09-15', '2026-10-15', '2026-11-15',
];

const schedule = DUE_DATES.map((dueDate, i) => ({
  index   : i + 1,
  label   : `Inst ${i + 1}`,
  amount  : i < 7 ? INST_REGULAR : INST_LAST,
  dueDate,
}));

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
  return r.json();
}

async function cancelAndDelete(doctype, name) {
  const encoded = encodeURIComponent(name);
  const dtEncoded = encodeURIComponent(doctype);
  try {
    const doc = await fGet(`/api/resource/${dtEncoded}/${encoded}`);
    if (doc.docstatus === 1) {
      await fPut(`/api/resource/${dtEncoded}/${encoded}`, { docstatus: 2 });
      step(`  Cancelled ${doctype} ${name}`);
    } else {
      step(`  ${doctype} ${name} already in state ${doc.docstatus}, skipping cancel`);
    }
  } catch (e) {
    step(`  WARNING: Cancel check failed for ${name}: ${e.message}`);
  }
  try {
    await fDel(`/api/resource/${dtEncoded}/${encoded}`);
    step(`  Deleted ${doctype} ${name}`);
  } catch (e) {
    step(`  WARNING: Delete failed for ${name}: ${e.message}`);
  }
}

// ── Main migration ────────────────────────────────────────────────────────────
step('=== CLASS CORRECTION: AFEESA U Z — 10th State → 9th State (Eraveli) ===');
step(`Schedule: ${schedule.map(s => `${s.label}=₹${s.amount} due ${s.dueDate}`).join(', ')}`);
step(`Total: ₹${FEE_TOTAL} | Payment to re-link: ₹${PAID_AMOUNT}`);

// ════════ STEP 1: Cancel Payment Entry ════════
step('\n--- Step 1: Cancel & Delete Payment Entry ---');
await cancelAndDelete('Payment Entry', OLD_PAYMENT_ENTRY);

// ════════ STEP 2: Cancel & Delete Invoices ════════
step('\n--- Step 2: Cancel & Delete all 7 Invoices ---');
for (const inv of OLD_INVOICES) {
  await cancelAndDelete('Sales Invoice', inv);
}

// ════════ STEP 3: Cancel & Delete Sales Order ════════
step('\n--- Step 3: Cancel & Delete Sales Order ---');
await cancelAndDelete('Sales Order', OLD_SO);

// ════════ STEP 4: Cancel & Delete Course Enrollments ════════
step('\n--- Step 4: Cancel & Delete old Course Enrollments ---');
const oldCEs = await fGet(
  `/api/resource/Course Enrollment?filters=${encodeURIComponent(JSON.stringify([['program_enrollment','=',OLD_PE]]))}&fields=${encodeURIComponent(JSON.stringify(['name','docstatus']))}&limit=50`
);
step(`  Found ${oldCEs.length} Course Enrollments`);
for (const ce of oldCEs) {
  await cancelAndDelete('Course Enrollment', ce.name);
}

// ════════ STEP 5: Cancel & Delete Program Enrollment ════════
step('\n--- Step 5: Cancel & Delete Program Enrollment ---');
await cancelAndDelete('Program Enrollment', OLD_PE);

// ════════ STEP 6: Remove from 10th Student Group ════════
step('\n--- Step 6: Remove student from Eraveli-10th State-A ---');
const sg10Doc = await fGet(`/api/resource/Student Group/${encodeURIComponent(OLD_STUDENT_GROUP)}`);
const filteredMembers = (sg10Doc.students || []).filter(m => m.student !== STUDENT_ID);
await fPut(`/api/resource/Student Group/${encodeURIComponent(OLD_STUDENT_GROUP)}`, { students: filteredMembers });
step(`  Removed ${STUDENT_NAME} from ${OLD_STUDENT_GROUP}`);

// ════════ STEP 7: Create new Program Enrollment ════════
step('\n--- Step 7: Create new Program Enrollment (9th State) ---');
const newPEDraft = await fPost('/api/resource/Program Enrollment', {
  student             : STUDENT_ID,
  student_name        : STUDENT_NAME,
  program             : NEW_PROGRAM,
  academic_year       : ACADEMIC_YEAR,
  enrollment_date     : ENROLLMENT_DATE,
  student_batch_name  : NEW_BATCH_CODE,
  custom_fee_structure: NEW_FEE_STRUCTURE,
  custom_plan         : NEW_PLAN,
  custom_no_of_instalments: NEW_INSTALMENTS,
});
const newPEName = newPEDraft.name;
step(`  Created PE draft: ${newPEName}`);

// ════════ STEP 8: Patch Course Enrollments ════════
step('\n--- Step 8: Patch Course Enrollments with Student Group ---');
const autoCEs = await fGet(
  `/api/resource/Course Enrollment?filters=${encodeURIComponent(JSON.stringify([['program_enrollment','=',newPEName]]))}&fields=${encodeURIComponent(JSON.stringify(['name','course']))}&limit=50`
);
step(`  Found ${autoCEs.length} auto-created Course Enrollments`);
for (const ce of autoCEs) {
  await fPut(`/api/resource/Course Enrollment/${encodeURIComponent(ce.name)}`, {
    custom_batch_name: NEW_STUDENT_GROUP,
  });
  step(`  Patched CE ${ce.name} (${ce.course}) → ${NEW_STUDENT_GROUP}`);
}

// ════════ STEP 9: Submit Program Enrollment ════════
step('\n--- Step 9: Submit Program Enrollment ---');
await fPut(`/api/resource/Program Enrollment/${encodeURIComponent(newPEName)}`, { docstatus: 1 });
step(`  Submitted PE ${newPEName}`);

// ════════ STEP 10: Add to 9th Student Group ════════
step('\n--- Step 10: Add student to Eraveli-9th State-A ---');
const sg9Doc = await fGet(`/api/resource/Student Group/${encodeURIComponent(NEW_STUDENT_GROUP)}`);
const members9 = sg9Doc.students || [];
if (!members9.some(m => m.student === STUDENT_ID)) {
  await fPut(`/api/resource/Student Group/${encodeURIComponent(NEW_STUDENT_GROUP)}`, {
    students: [...members9, { student: STUDENT_ID, student_name: STUDENT_NAME, active: 1 }],
  });
  step(`  Added ${STUDENT_NAME} to ${NEW_STUDENT_GROUP}`);
} else {
  step(`  ${STUDENT_NAME} already in ${NEW_STUDENT_GROUP}`);
}

// ════════ STEP 11: Create new Sales Order ════════
step('\n--- Step 11: Create new Sales Order ---');
const soRate = FEE_TOTAL / parseInt(NEW_INSTALMENTS); // 17800/8 = 2225
const newSO = await fPost('/api/resource/Sales Order', {
  customer               : CUSTOMER,
  company                : COMPANY,
  transaction_date       : ENROLLMENT_DATE,
  delivery_date          : ENROLLMENT_DATE,
  student                : STUDENT_ID,
  custom_academic_year   : ACADEMIC_YEAR,
  custom_plan            : NEW_PLAN,
  custom_no_of_instalments: NEW_INSTALMENTS,
  items: [{ item_code: TUITION_ITEM, qty: parseInt(NEW_INSTALMENTS), rate: soRate }],
});
const newSOName = newSO.name;
step(`  Created SO draft: ${newSOName}`);

// ════════ STEP 12: Submit Sales Order ════════
step('\n--- Step 12: Submit Sales Order ---');
await fPut(`/api/resource/Sales Order/${encodeURIComponent(newSOName)}`, { docstatus: 1 });
step(`  Submitted SO ${newSOName}`);

// Fetch SO item for invoice linking
const soDoc = await fGet(`/api/resource/Sales Order/${encodeURIComponent(newSOName)}`);
const soItem = soDoc.items?.[0];

// ════════ STEP 13 & 14: Create and Submit 8 Invoices ════════
step('\n--- Steps 13 & 14: Create & Submit 8 Sales Invoices ---');
const createdInvoices = [];
for (const inst of schedule) {
  const siPayload = {
    customer            : CUSTOMER,
    company             : COMPANY,
    posting_date        : ENROLLMENT_DATE,
    due_date            : inst.dueDate,
    student             : STUDENT_ID,
    custom_academic_year: ACADEMIC_YEAR,
    debit_to            : DEBIT_TO,
    items: [{
      item_code    : TUITION_ITEM,
      qty          : 1,
      rate         : inst.amount,
      description  : `${inst.label} — ${TUITION_ITEM}`,
      income_account: INCOME_ACCOUNT,
      cost_center  : COST_CENTER,
      ...(soItem ? { sales_order: newSOName, so_detail: soItem.name } : {}),
    }],
  };
  const si = await fPost('/api/resource/Sales Invoice', siPayload);
  step(`  Created SI draft: ${si.name} — ${inst.label} ₹${inst.amount} due ${inst.dueDate}`);

  await fPut(`/api/resource/Sales Invoice/${encodeURIComponent(si.name)}`, { docstatus: 1 });
  step(`  Submitted SI ${si.name}`);
  createdInvoices.push(si.name);
}

// ════════ STEP 15 & 16: Create and Submit Payment Entry ════════
step('\n--- Steps 15 & 16: Create & Submit Payment Entry ₹2,100 for Inst 1 ---');
const inst1Invoice = createdInvoices[0];
const pePayload = {
  payment_type    : 'Receive',
  mode_of_payment : 'Cash',
  party_type      : 'Customer',
  party           : CUSTOMER,
  company         : COMPANY,
  paid_to         : PAID_TO,
  paid_amount     : PAID_AMOUNT,
  received_amount : PAID_AMOUNT,
  posting_date    : ENROLLMENT_DATE,
  references: [{
    reference_doctype : 'Sales Invoice',
    reference_name    : inst1Invoice,
    allocated_amount  : PAID_AMOUNT,
  }],
};
const payEntry = await fPost('/api/resource/Payment Entry', pePayload);
step(`  Created Payment Entry draft: ${payEntry.name}`);

await fPut(`/api/resource/Payment Entry/${encodeURIComponent(payEntry.name)}`, { docstatus: 1 });
step(`  Submitted Payment Entry ${payEntry.name}`);

// ════════ SUMMARY ════════
step('\n=== MIGRATION COMPLETE ===');
step(`New Program Enrollment : ${newPEName}`);
step(`New Sales Order        : ${newSOName}`);
step(`New Invoices (8)       : ${createdInvoices.join(', ')}`);
step(`Payment Entry ₹2,100   : ${payEntry.name} → ${inst1Invoice}`);
step(`Student Group          : ${NEW_STUDENT_GROUP}`);
