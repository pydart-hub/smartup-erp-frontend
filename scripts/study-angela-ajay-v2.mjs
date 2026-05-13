/**
 * study-angela-ajay-v2.mjs
 * Deep study of Angela ajay - corrected field names for API queries
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const HEADERS = { 'Content-Type': 'application/json', Authorization: AUTH };

const STUDENT_ID = 'STU-SU THP-26-030';
const STUDENT_NAME = 'Angela ajay';
const CUSTOMER = 'Angela ajay';
const PE_NAME = 'PEN-10th-Thopumpadi 26-27-030';

async function fGet(path) {
  const r = await fetch(BASE + path, { headers: HEADERS });
  const json = await r.json();
  if (!r.ok) {
    console.warn(`WARN GET ${path}: ${r.status}`, JSON.stringify(json).slice(0, 100));
    return { data: null };
  }
  return json;
}

function step(msg) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${msg}`);
  console.log('='.repeat(60));
}

async function main() {
  // 1. Sales Orders by customer
  step('STEP 1: Sales Orders by customer');
  const soParams = new URLSearchParams({
    fields: JSON.stringify(['name', 'customer', 'grand_total', 'status', 'docstatus', 'transaction_date', 'advance_paid', 'billing_status']),
    filters: JSON.stringify([['customer', '=', CUSTOMER]]),
    limit_page_length: '20',
  });
  const sos = (await fGet('/api/resource/Sales Order?' + soParams)).data || [];
  console.log(`Total SOs: ${sos.length}`);
  for (const so of sos) {
    console.log(`\nSO: ${so.name}`);
    console.log('  grand_total:', so.grand_total);
    console.log('  status:', so.status);
    console.log('  docstatus:', so.docstatus);
    console.log('  date:', so.transaction_date);
    console.log('  advance_paid:', so.advance_paid);
    console.log('  billing_status:', so.billing_status);
    // Full SO items
    const soFull = (await fGet('/api/resource/Sales Order/' + encodeURIComponent(so.name))).data;
    if (soFull) {
      console.log('  items:');
      for (const item of (soFull.items || [])) {
        console.log(`    - ${item.item_code} | qty: ${item.qty} | rate: ${item.rate} | amount: ${item.amount}`);
      }
      console.log('  company:', soFull.company);
      console.log('  custom_student:', soFull.custom_student);
    }
  }

  // 2. Sales Invoices by customer
  step('STEP 2: Sales Invoices by customer');
  const siParams = new URLSearchParams({
    fields: JSON.stringify(['name', 'customer', 'grand_total', 'outstanding_amount', 'status', 'docstatus', 'due_date', 'posting_date']),
    filters: JSON.stringify([['customer', '=', CUSTOMER]]),
    limit_page_length: '20',
  });
  const sis = (await fGet('/api/resource/Sales Invoice?' + siParams)).data || [];
  console.log(`Total Invoices: ${sis.length}`);
  for (const si of sis) {
    console.log(`  SINV: ${si.name} | total: ${si.grand_total} | outstanding: ${si.outstanding_amount} | status: ${si.status} | docstatus: ${si.docstatus} | due: ${si.due_date} | posted: ${si.posting_date}`);
    // Full invoice for custom_student
    const siFull = (await fGet('/api/resource/Sales Invoice/' + encodeURIComponent(si.name))).data;
    if (siFull) {
      console.log(`    company: ${siFull.company} | custom_student: ${siFull.custom_student}`);
      console.log('    items:', (siFull.items || []).map(i => `${i.item_code} x${i.qty} @${i.rate}`).join(', '));
    }
  }

  // 3. Course Enrollments by program_enrollment
  step('STEP 3: Course Enrollments by program_enrollment');
  const ceParams = new URLSearchParams({
    fields: JSON.stringify(['name', 'course', 'program_enrollment', 'enrollment_status', 'docstatus']),
    filters: JSON.stringify([['program_enrollment', '=', PE_NAME]]),
    limit_page_length: '30',
  });
  const ces = (await fGet('/api/resource/Course Enrollment?' + ceParams)).data || [];
  console.log(`Total CEs: ${ces.length}`);
  for (const ce of ces) {
    console.log(`  CE: ${ce.name} | course: ${ce.course} | status: ${ce.docstatus}`);
  }

  // 4. Payment Entry full details
  step('STEP 4: Payment Entry Full Details');
  const peDoc = (await fGet('/api/resource/Payment Entry/ACC-PAY-2026-04471')).data;
  if (peDoc) {
    console.log('PE name:', peDoc.name);
    console.log('party:', peDoc.party);
    console.log('paid_amount:', peDoc.paid_amount);
    console.log('mode_of_payment:', peDoc.mode_of_payment);
    console.log('paid_to:', peDoc.paid_to);
    console.log('paid_from:', peDoc.paid_from);
    console.log('posting_date:', peDoc.posting_date);
    console.log('docstatus:', peDoc.docstatus);
    console.log('references:');
    for (const ref of (peDoc.references || [])) {
      console.log(`  ref: ${ref.reference_doctype} / ${ref.reference_name} | allocated: ${ref.allocated_amount}`);
    }
  }

  // 5. 9th State fee structures for Thopumpadi (by company)
  step('STEP 5: All Fee Structures for Smart Up Thopumpadi');
  const feeParams = new URLSearchParams({
    fields: JSON.stringify(['name', 'program', 'academic_year', 'company']),
    filters: JSON.stringify([['company', '=', 'Smart Up Thopumpadi']]),
    limit_page_length: '30',
  });
  const fees = (await fGet('/api/resource/Fee Structure?' + feeParams)).data || [];
  console.log(`Total fee structures for Thopumpadi: ${fees.length}`);
  for (const f of fees) {
    console.log(`  ${f.name} | program: ${f.program} | year: ${f.academic_year}`);
  }

  // 6. Existing 9th State student sample PE - to understand the pattern
  step('STEP 6: Sample 9th State PE from Thopumpadi');
  const sg9 = (await fGet('/api/resource/Student Group/Thopumpadi-9th State-A')).data;
  const existingStudents9th = (sg9?.students || []).slice(0, 2);
  for (const s of existingStudents9th) {
    const spe = new URLSearchParams({
      fields: JSON.stringify(['name', 'student', 'program', 'student_batch_name', 'custom_fee_structure', 'custom_plan', 'custom_instalments', 'enrollment_date']),
      filters: JSON.stringify([['student', '=', s.student], ['program', '=', '9th State']]),
      limit_page_length: '5',
    });
    const spePEs = (await fGet('/api/resource/Program Enrollment?' + spe)).data || [];
    for (const pe of spePEs) {
      console.log(`\n9th PE: ${pe.name}`);
      console.log('  student:', pe.student);
      console.log('  batch:', pe.student_batch_name);
      console.log('  fee_structure:', pe.custom_fee_structure);
      console.log('  plan:', pe.custom_plan);
      console.log('  instalments:', pe.custom_instalments);
      console.log('  date:', pe.enrollment_date);
      
      // Get their SO
      const soQ = new URLSearchParams({
        fields: JSON.stringify(['name', 'grand_total', 'status', 'docstatus']),
        filters: JSON.stringify([['customer', '=', s.student_name]]),
        limit_page_length: '5',
      });
      const soS = (await fGet('/api/resource/Sales Order?' + soQ)).data || [];
      for (const so of soS) {
        const soFull = (await fGet('/api/resource/Sales Order/' + encodeURIComponent(so.name))).data;
        if (soFull) {
          console.log(`  SO: ${so.name} | total: ${so.grand_total}`);
          for (const item of (soFull.items || [])) {
            console.log(`    item: ${item.item_code} | qty: ${item.qty} | rate: ${item.rate}`);
          }
        }
      }
    }
  }

  // 7. Debit/Income accounts for Thopumpadi
  step('STEP 7: Account references from existing 10th PE SO');
  // Check a different Thopumpadi 10th student's SO to get accounts
  const refSO = new URLSearchParams({
    fields: JSON.stringify(['name', 'grand_total', 'docstatus']),
    filters: JSON.stringify([['customer', '=', 'Maria sanviya Ta']]),
    limit_page_length: '5',
  });
  const refSOs = (await fGet('/api/resource/Sales Order?' + refSO)).data || [];
  if (refSOs.length > 0) {
    const refFull = (await fGet('/api/resource/Sales Order/' + encodeURIComponent(refSOs[0].name))).data;
    if (refFull) {
      console.log('Sample account refs from existing THP student:');
      console.log('  company:', refFull.company);
      console.log('  debit_to (from invoice):', refFull.debit_to);
      // get items
      for (const item of (refFull.items || [])) {
        console.log(`  item: ${item.item_code} | income_account: ${item.income_account} | cost_center: ${item.cost_center}`);
      }
    }
  }

  // Check SINV from a THP student for accounts
  const refSI = new URLSearchParams({
    fields: JSON.stringify(['name', 'grand_total', 'docstatus']),
    filters: JSON.stringify([['customer', '=', 'Maria sanviya Ta']]),
    limit_page_length: '5',
  });
  const refSIs = (await fGet('/api/resource/Sales Invoice?' + refSI)).data || [];
  if (refSIs.length > 0) {
    const refSIFull = (await fGet('/api/resource/Sales Invoice/' + encodeURIComponent(refSIs[0].name))).data;
    if (refSIFull) {
      console.log('\nSample SINV accounts:');
      console.log('  debit_to:', refSIFull.debit_to);
      for (const item of (refSIFull.items || [])) {
        console.log(`  item: ${item.item_code} | income_account: ${item.income_account} | cost_center: ${item.cost_center}`);
      }
    }
  }
}

main().catch(console.error);
