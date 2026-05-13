/**
 * study-angela-ajay.mjs
 * Deep study of Angela ajay (STU-SU THP-26-030)
 * Currently enrolled in 10th State at Thopumpadi — should be in 9th State
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const HEADERS = { 'Content-Type': 'application/json', Authorization: AUTH };

const STUDENT_ID = 'STU-SU THP-26-030';
const STUDENT_NAME = 'Angela ajay';

async function fGet(path) {
  const r = await fetch(BASE + path, { headers: HEADERS });
  const json = await r.json();
  if (!r.ok) {
    console.warn(`WARN GET ${path}: ${r.status}`, JSON.stringify(json).slice(0, 200));
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
  // 1. Student document
  step('STEP 1: Student Document');
  const stu = (await fGet('/api/resource/Student/' + encodeURIComponent(STUDENT_ID))).data;
  console.log('name:', stu.name);
  console.log('student_name:', stu.student_name);
  console.log('first_name:', stu.first_name);
  console.log('last_name:', stu.last_name);
  console.log('customer:', stu.customer);
  console.log('custom_branch:', stu.custom_branch);
  console.log('user:', stu.user);
  console.log('guardians:', JSON.stringify(stu.guardians, null, 2));

  // 2. Program Enrollments
  step('STEP 2: All Program Enrollments');
  const peParams = new URLSearchParams({
    fields: JSON.stringify(['name', 'student', 'student_name', 'program', 'academic_year', 'student_batch_name', 'docstatus', 'enrollment_date']),
    filters: JSON.stringify([['student', '=', STUDENT_ID]]),
    limit_page_length: '20',
  });
  const pes = (await fGet('/api/resource/Program Enrollment?' + peParams)).data || [];
  console.log(`Total PEs: ${pes.length}`);
  for (const pe of pes) {
    console.log(`  ${pe.name} | program: ${pe.program} | batch: ${pe.student_batch_name} | status: ${pe.docstatus} | date: ${pe.enrollment_date}`);
  }

  // 3. Full PE details for the 10th State PE
  step('STEP 3: Full 10th State PE Details');
  const pen10th = pes.find(p => p.program === '10th State');
  if (pen10th) {
    const full = (await fGet('/api/resource/Program Enrollment/' + encodeURIComponent(pen10th.name))).data;
    console.log('PE name:', full.name);
    console.log('student:', full.student);
    console.log('program:', full.program);
    console.log('student_batch_name:', full.student_batch_name);
    console.log('academic_year:', full.academic_year);
    console.log('enrollment_date:', full.enrollment_date);
    console.log('docstatus:', full.docstatus);
    console.log('custom_fee_structure:', full.custom_fee_structure);
    console.log('custom_plan:', full.custom_plan);
    console.log('custom_instalments:', full.custom_instalments);
    console.log('custom_student_srr:', full.custom_student_srr);
    console.log('courses:');
    for (const c of (full.courses || [])) {
      console.log(`  - ${c.course}`);
    }
  } else {
    console.log('No 10th State PE found!');
  }

  // 4. Course Enrollments
  step('STEP 4: Course Enrollments');
  const ceParams = new URLSearchParams({
    fields: JSON.stringify(['name', 'course', 'student_batch_name', 'program_enrollment', 'enrollment_status', 'docstatus']),
    filters: JSON.stringify([['student', '=', STUDENT_ID]]),
    limit_page_length: '50',
  });
  const ces = (await fGet('/api/resource/Course Enrollment?' + ceParams)).data || [];
  console.log(`Total CEs: ${ces.length}`);
  for (const ce of ces) {
    console.log(`  CE: ${ce.name} | course: ${ce.course} | batch: ${ce.student_batch_name} | status: ${ce.docstatus}`);
  }

  // 5. Sales Orders
  step('STEP 5: Sales Orders');
  const soParams = new URLSearchParams({
    fields: JSON.stringify(['name', 'customer', 'grand_total', 'status', 'docstatus', 'transaction_date', 'advance_paid', 'billing_status']),
    filters: JSON.stringify([['custom_student', '=', STUDENT_ID]]),
    limit_page_length: '10',
  });
  const sos = (await fGet('/api/resource/Sales Order?' + soParams)).data || [];
  console.log(`Total SOs: ${sos.length}`);
  for (const so of sos) {
    console.log(`\nSO: ${so.name}`);
    console.log('  customer:', so.customer);
    console.log('  grand_total:', so.grand_total);
    console.log('  status:', so.status);
    console.log('  docstatus:', so.docstatus);
    console.log('  transaction_date:', so.transaction_date);
    console.log('  advance_paid:', so.advance_paid);
    console.log('  billing_status:', so.billing_status);
    // Full SO
    const soFull = (await fGet('/api/resource/Sales Order/' + encodeURIComponent(so.name))).data;
    console.log('  items:');
    for (const item of (soFull.items || [])) {
      console.log(`    - ${item.item_code} | qty: ${item.qty} | rate: ${item.rate} | amount: ${item.amount}`);
    }
  }

  // 6. Sales Invoices
  step('STEP 6: Sales Invoices');
  const siParams = new URLSearchParams({
    fields: JSON.stringify(['name', 'customer', 'grand_total', 'outstanding_amount', 'status', 'docstatus', 'due_date', 'posting_date']),
    filters: JSON.stringify([['custom_student', '=', STUDENT_ID]]),
    limit_page_length: '20',
  });
  const sis = (await fGet('/api/resource/Sales Invoice?' + siParams)).data || [];
  console.log(`Total Invoices: ${sis.length}`);
  for (const si of sis) {
    console.log(`  SINV: ${si.name} | total: ${si.grand_total} | outstanding: ${si.outstanding_amount} | status: ${si.status} | docstatus: ${si.docstatus} | due: ${si.due_date} | posted: ${si.posting_date}`);
  }

  // 7. Payment Entries
  step('STEP 7: Payment Entries');
  const peParams2 = new URLSearchParams({
    fields: JSON.stringify(['name', 'party', 'paid_amount', 'payment_type', 'docstatus', 'posting_date', 'mode_of_payment', 'paid_to']),
    filters: JSON.stringify([['party', '=', stu.student_name]]),
    limit_page_length: '10',
  });
  const pes2 = (await fGet('/api/resource/Payment Entry?' + peParams2)).data || [];
  console.log(`Total Payment Entries: ${pes2.length}`);
  for (const pe2 of pes2) {
    console.log(`  PE: ${pe2.name} | amount: ${pe2.paid_amount} | mode: ${pe2.mode_of_payment} | to: ${pe2.paid_to} | posted: ${pe2.posting_date} | docstatus: ${pe2.docstatus}`);
  }

  // Try by customer too
  if (stu.customer && stu.customer !== stu.student_name) {
    const peParams3 = new URLSearchParams({
      fields: JSON.stringify(['name', 'party', 'paid_amount', 'payment_type', 'docstatus', 'posting_date', 'mode_of_payment']),
      filters: JSON.stringify([['party', '=', stu.customer]]),
      limit_page_length: '10',
    });
    const pes3 = (await fGet('/api/resource/Payment Entry?' + peParams3)).data || [];
    if (pes3.length > 0) {
      console.log(`\nPayment Entries by customer (${stu.customer}):`);
      for (const pe3 of pes3) {
        console.log(`  PE: ${pe3.name} | amount: ${pe3.paid_amount} | mode: ${pe3.mode_of_payment} | posted: ${pe3.posting_date} | docstatus: ${pe3.docstatus}`);
      }
    }
  }

  // 8. Check 9th State fee structures for Thopumpadi
  step('STEP 8: 9th State Fee Structures for Thopumpadi');
  const feeParams = new URLSearchParams({
    fields: JSON.stringify(['name', 'program', 'academic_year', 'company']),
    filters: JSON.stringify([['name', 'like', '%Thop%']]),
    limit_page_length: '20',
  });
  const fees = (await fGet('/api/resource/Fee Structure?' + feeParams)).data || [];
  console.log('All Thopumpadi Fee Structures:');
  for (const f of fees) {
    console.log(`  ${f.name} | program: ${f.program} | year: ${f.academic_year}`);
  }

  // 9. Check Thopumpadi-9th State-A group
  step('STEP 9: Thopumpadi-9th State-A Group');
  const sg9 = (await fGet('/api/resource/Student Group/Thopumpadi-9th State-A')).data;
  console.log('batch:', sg9.batch);
  console.log('academic_year:', sg9.academic_year);
  console.log('program:', sg9.program);
  const stus9 = sg9.students || [];
  console.log(`Students count: ${stus9.length}`);
  
  // Check if Angela is already there
  const angelaIn9th = stus9.find(s => s.student === STUDENT_ID);
  console.log('Angela already in 9th group?', angelaIn9th ? 'YES' : 'NO');

  // 10. Summary
  step('STEP 10: SUMMARY');
  console.log('\n🎯 STUDENT: Angela ajay (STU-SU THP-26-030)');
  console.log('Current class: 10th State (WRONG)');
  console.log('Target class: 9th State (CORRECT)');
  console.log('\nRecords to handle:');
  console.log(`  - Program Enrollment: ${pen10th?.name}`);
  console.log(`  - Course Enrollments: ${ces.length}`);
  console.log(`  - Sales Orders: ${sos.map(s => s.name).join(', ')}`);
  console.log(`  - Sales Invoices: ${sis.length} (${sis.map(s => s.name).join(', ')})`);
  console.log(`  - Payment Entries: ${pes2.length}`);
}

main().catch(console.error);
