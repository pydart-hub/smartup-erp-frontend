/**
 * migrate-sirin-9th.mjs
 * Corrects Sirin Fathima's enrollment from 10th State → 9th State (Palluruthy branch)
 * 
 * Steps:
 * 1. Cancel & delete Payment Entry
 * 2. Cancel & delete all 6 invoices (including paid)
 * 3. Cancel & delete Sales Order
 * 4. Cancel & delete 11 Course Enrollments
 * 5. Cancel & delete Program Enrollment
 * 6. Create new Program Enrollment (9th State, Basic, 6)
 * 7. Patch Course Enrollments → Palluruthy-9th State-A
 * 8. Submit Program Enrollment
 * 9. Add student to Palluruthy-9th State-A
 * 10. Create new Sales Order (9th State Tuition Fee)
 * 11. Submit Sales Order
 * 12. Create 6 invoices
 * 13. Create Payment Entry ₹3,000 against Inst 1
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const HEADERS = { 'Content-Type': 'application/json', Authorization: AUTH };

const STUDENT_ID = 'STU-SU PLR-26-024';
const STUDENT_NAME = 'Sirin Fathima';
const CUSTOMER = 'Sirin Fathima';
const COMPANY = 'Smart Up Palluruthy';
const BRANCH = 'Smart Up Palluruthy';
const ACADEMIC_YEAR = '2026-2027';
const OLD_PE = 'PEN-10th-Palluruthy 26-27-024';
const OLD_SO = 'SAL-ORD-2026-00361';
const PAYMENT_ENTRY = 'ACC-PAY-2026-04177';
const INVOICES = [
  'ACC-SINV-2026-03520', // Paid
  'ACC-SINV-2026-03521',
  'ACC-SINV-2026-03522',
  'ACC-SINV-2026-03523',
  'ACC-SINV-2026-03524',
  'ACC-SINV-2026-03525',
];
const NEW_PROGRAM = '9th State';
const NEW_FEE_STRUCTURE = 'SU PLR-9th State-Basic-6';
const NEW_PLAN = 'Basic';
const NEW_INSTALMENTS = '6';
const NEW_BATCH_CODE = 'Palluruthy 26-27';
const NEW_STUDENT_GROUP = 'Palluruthy-9th State-A';
const TUITION_ITEM = '9th State Tuition Fee';
const ADMISSION_ITEM = 'Admission Fee';
const FEE_TOTAL = 17300;
const INST_PER = 3000; // first 5 instalments
const INST_LAST = 2300; // last instalment
const PAID_AMOUNT = 3000;
const ENROLLMENT_DATE = '2026-05-07';
const DEBIT_TO = 'Debtors - SU PLR';
const INCOME_ACCOUNT = 'Sales - SU PLR';
const COST_CENTER = 'Main - SU PLR';

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
  try {
    const doc = await fGet(`/api/resource/${encodeURIComponent(doctype)}/${encoded}`);
    if (doc.docstatus === 1) {
      await fPut(`/api/resource/${encodeURIComponent(doctype)}/${encoded}`, { docstatus: 2 });
      step(`  Cancelled ${doctype} ${name}`);
    }
  } catch (e) {
    step(`  WARNING: Cancel check failed for ${name}: ${e.message}`);
  }
  try {
    await fDel(`/api/resource/${encodeURIComponent(doctype)}/${encoded}`);
    step(`  Deleted ${doctype} ${name}`);
  } catch (e) {
    step(`  WARNING: Delete failed for ${name}: ${e.message}`);
  }
}

// Generate due dates: enrollment_date + 0,2,4,6,8,10 months
function addMonths(dateStr, months) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const total = (m - 1) + months;
  const newYear = y + Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  const daysInMonth = new Date(newYear, newMonth, 0).getDate();
  const newDay = Math.min(d, daysInMonth);
  return `${newYear}-${String(newMonth).padStart(2,'0')}-${String(newDay).padStart(2,'0')}`;
}

const INSTALMENT_OFFSETS = [0, 2, 4, 6, 8, 10];
const schedule = INSTALMENT_OFFSETS.map((offset, i) => ({
  index: i + 1,
  label: `Inst ${i + 1}`,
  amount: i < 5 ? INST_PER : INST_LAST,
  dueDate: addMonths(ENROLLMENT_DATE, offset),
}));

step('=== CLASS CORRECTION: Sirin Fathima 10th → 9th State ===');
step(`Schedule: ${schedule.map(s => `${s.label}=₹${s.amount} due ${s.dueDate}`).join(', ')}`);

// ════════ STEP 1: Cancel Payment Entry ════════
step('\n--- Step 1: Cancel & Delete Payment Entry ---');
await cancelAndDelete('Payment Entry', PAYMENT_ENTRY);

// ════════ STEP 2: Cancel & Delete all invoices ════════
step('\n--- Step 2: Cancel & Delete all 6 Invoices ---');
for (const inv of INVOICES) {
  await cancelAndDelete('Sales Invoice', inv);
}

// ════════ STEP 3: Cancel & Delete Sales Order ════════
step('\n--- Step 3: Cancel & Delete Sales Order ---');
await cancelAndDelete('Sales Order', OLD_SO);

// ════════ STEP 4: Cancel & Delete Course Enrollments ════════
step('\n--- Step 4: Cancel & Delete old Course Enrollments ---');
const oldCEs = await fGet(`/api/resource/Course Enrollment?filters=[["program_enrollment","=","${OLD_PE}"]]&fields=["name","docstatus"]&limit=50`);
step(`  Found ${oldCEs.length} Course Enrollments`);
for (const ce of oldCEs) {
  await cancelAndDelete('Course Enrollment', ce.name);
}

// ════════ STEP 5: Cancel & Delete Program Enrollment ════════
step('\n--- Step 5: Cancel & Delete Program Enrollment ---');
await cancelAndDelete('Program Enrollment', OLD_PE);

// ════════ STEP 6: Create new Program Enrollment ════════
step('\n--- Step 6: Create new Program Enrollment (9th State) ---');
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

// ════════ STEP 7: Patch Course Enrollments with batch name ════════
step('\n--- Step 7: Patch Course Enrollments with batch name ---');
const autoCEs = await fGet(`/api/resource/Course Enrollment?filters=[["program_enrollment","=","${newPEName}"]]&fields=["name","course"]&limit=50`);
step(`  Found ${autoCEs.length} auto-created Course Enrollments`);
for (const ce of autoCEs) {
  await fPut(`/api/resource/Course Enrollment/${encodeURIComponent(ce.name)}`, {
    custom_batch_name: NEW_STUDENT_GROUP,
  });
  step(`  Patched CE ${ce.name} (${ce.course}) → ${NEW_STUDENT_GROUP}`);
}

// ════════ STEP 8: Submit Program Enrollment ════════
step('\n--- Step 8: Submit Program Enrollment ---');
await fPut(`/api/resource/Program Enrollment/${encodeURIComponent(newPEName)}`, { docstatus: 1 });
step(`  Submitted PE ${newPEName}`);

// ════════ STEP 9: Add student to Palluruthy-9th State-A ════════
step('\n--- Step 9: Add student to Student Group ---');
const sgDoc = await fGet(`/api/resource/Student Group/${encodeURIComponent(NEW_STUDENT_GROUP)}`);
const members = sgDoc.students || [];
if (!members.some(m => m.student === STUDENT_ID)) {
  const updatedMembers = [...members, { student: STUDENT_ID, student_name: STUDENT_NAME, active: 1 }];
  await fPut(`/api/resource/Student Group/${encodeURIComponent(NEW_STUDENT_GROUP)}`, { students: updatedMembers });
  step(`  Added ${STUDENT_NAME} to ${NEW_STUDENT_GROUP}`);
} else {
  step(`  Student already in ${NEW_STUDENT_GROUP}`);
}

// ════════ STEP 10: Create new Sales Order ════════
step('\n--- Step 10: Create new Sales Order ---');
const soRate = FEE_TOTAL / 6;
const todayDate = ENROLLMENT_DATE;
const newSO = await fPost('/api/resource/Sales Order', {
  customer: CUSTOMER,
  company: COMPANY,
  transaction_date: todayDate,
  delivery_date: todayDate,
  student: STUDENT_ID,
  custom_academic_year: ACADEMIC_YEAR,
  custom_plan: NEW_PLAN,
  custom_no_of_instalments: NEW_INSTALMENTS,
  items: [{ item_code: TUITION_ITEM, qty: 6, rate: soRate }],
});
const newSOName = newSO.name;
step(`  Created SO: ${newSOName}`);

// ════════ STEP 11: Submit Sales Order ════════
step('\n--- Step 11: Submit Sales Order ---');
await fPut(`/api/resource/Sales Order/${encodeURIComponent(newSOName)}`, { docstatus: 1 });
step(`  Submitted SO ${newSOName}`);

// Fetch SO item for linking
const soDoc = await fGet(`/api/resource/Sales Order/${encodeURIComponent(newSOName)}`);
const soItem = soDoc.items?.[0];

// ════════ STEP 12: Create 6 Invoices ════════
step('\n--- Step 12: Create 6 Sales Invoices ---');
const createdInvoices = [];
for (const inst of schedule) {
  const siPayload = {
    customer: CUSTOMER,
    company: COMPANY,
    posting_date: inst.dueDate,
    due_date: inst.dueDate,
    student: STUDENT_ID,
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

  // Submit the invoice
  await fPut(`/api/resource/Sales Invoice/${encodeURIComponent(si.name)}`, { docstatus: 1 });
  step(`  Submitted SI ${si.name}`);
  createdInvoices.push(si.name);
}

// ════════ STEP 13: Create Payment Entry ₹3,000 for Inst 1 ════════
step('\n--- Step 13: Create Payment Entry ₹3,000 for Inst 1 ---');
const inst1Invoice = createdInvoices[0];
const pePayload = {
  payment_type: 'Receive',
  mode_of_payment: 'UPI',
  party_type: 'Customer',
  party: CUSTOMER,
  company: COMPANY,
  paid_to: DEBIT_TO,
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

// Submit the payment entry
await fPut(`/api/resource/Payment Entry/${encodeURIComponent(payEntry.name)}`, { docstatus: 1 });
step(`  Submitted Payment Entry ${payEntry.name}`);

step('\n=== MIGRATION COMPLETE ===');
step(`New Program Enrollment: ${newPEName}`);
step(`New Sales Order: ${newSOName}`);
step(`Invoices: ${createdInvoices.join(', ')}`);
step(`Payment Entry (₹3,000 paid): ${payEntry.name} → ${inst1Invoice}`);
step(`Student Group: ${NEW_STUDENT_GROUP}`);
