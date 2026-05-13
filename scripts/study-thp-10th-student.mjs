/**
 * study-thp-10th-student.mjs  (v2)
 * Deep study of Thoppumpadi 10th class student who should be in 9th
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const HEADERS = { 'Content-Type': 'application/json', Authorization: AUTH };

async function fGet(path) {
  const r = await fetch(BASE + path, { headers: HEADERS });
  if (!r.ok) throw new Error(`GET ${path}: ${r.status} ${await r.text()}`);
  return (await r.json());
}

function step(msg) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${msg}`);
  console.log('='.repeat(60));
}

async function main() {
  // 1. Get students in Thopumpadi-10th State-A group
  step('STEP 1: Students in Thopumpadi-10th State-A');
  const sgDoc = (await fGet('/api/resource/Student Group/Thopumpadi-10th State-A')).data;
  const students = sgDoc.students || [];
  console.log(`Students in group (${students.length}):`);
  for (const s of students) {
    console.log(`  ${s.student} | ${s.student_name} | active: ${s.active}`);
  }

  if (students.length === 0) {
    console.log('No students found in group!');
    return;
  }

  // 2. Get Program Enrollments for each student
  step('STEP 2: Program Enrollments for Thopumpadi-10th State students');
  for (const s of students) {
    const peParams = new URLSearchParams({
      fields: JSON.stringify(['name', 'student', 'student_name', 'program', 'academic_year', 'student_batch_name', 'docstatus', 'enrollment_date']),
      filters: JSON.stringify([['student', '=', s.student], ['academic_year', '=', '2026-2027']]),
      limit_page_length: '10',
    });
    const pes = (await fGet('/api/resource/Program Enrollment?' + peParams)).data || [];
    console.log(`\nStudent: ${s.student} (${s.student_name})`);
    for (const pe of pes) {
      console.log(`  PE: ${pe.name} | program: ${pe.program} | batch: ${pe.student_batch_name} | status: ${pe.docstatus} | date: ${pe.enrollment_date}`);
    }
  }

  // 3. Full PE details for 10th State
  step('STEP 3: Full PE details');
  for (const s of students) {
    const peParams = new URLSearchParams({
      fields: JSON.stringify(['name']),
      filters: JSON.stringify([['student', '=', s.student], ['program', '=', '10th State'], ['academic_year', '=', '2026-2027']]),
      limit_page_length: '5',
    });
    const pes = (await fGet('/api/resource/Program Enrollment?' + peParams)).data || [];
    for (const pe of pes) {
      const full = (await fGet('/api/resource/Program Enrollment/' + encodeURIComponent(pe.name))).data;
      console.log(`\n--- ${full.name} ---`);
      console.log('student:', full.student, '|', full.student_name);
      console.log('program:', full.program);
      console.log('batch:', full.student_batch_name);
      console.log('academic_year:', full.academic_year);
      console.log('docstatus:', full.docstatus);
      console.log('enrollment_date:', full.enrollment_date);
      console.log('custom_fee_structure:', full.custom_fee_structure);
      console.log('custom_plan:', full.custom_plan);
      console.log('custom_instalments:', full.custom_instalments);
      console.log('custom_student_srr:', full.custom_student_srr);
      console.log('courses:', (full.courses || []).map(c => c.course).join(', '));
    }
  }

  // 4. Sales Orders
  step('STEP 4: Sales Orders for Thopumpadi-10th students');
  for (const s of students) {
    const soParams = new URLSearchParams({
      fields: JSON.stringify(['name', 'customer', 'grand_total', 'status', 'docstatus', 'transaction_date']),
      filters: JSON.stringify([['custom_student', '=', s.student], ['docstatus', '!=', '2']]),
      limit_page_length: '10',
    });
    const sos = (await fGet('/api/resource/Sales Order?' + soParams)).data || [];
    console.log(`\nStudent: ${s.student} (${s.student_name}) - SOs: ${sos.length}`);
    for (const so of sos) {
      // Full SO details
      const soFull = (await fGet('/api/resource/Sales Order/' + encodeURIComponent(so.name))).data;
      console.log(`  SO: ${so.name} | total: ${so.grand_total} | status: ${so.status} | docstatus: ${so.docstatus}`);
      for (const item of (soFull.items || [])) {
        console.log(`    item: ${item.item_code} | qty: ${item.qty} | rate: ${item.rate} | amount: ${item.amount}`);
      }
      console.log(`  advance_paid: ${soFull.advance_paid} | billing_status: ${soFull.billing_status}`);
    }
  }

  // 5. Sales Invoices
  step('STEP 5: Sales Invoices for Thopumpadi-10th students');
  for (const s of students) {
    const siParams = new URLSearchParams({
      fields: JSON.stringify(['name', 'customer', 'grand_total', 'outstanding_amount', 'status', 'docstatus', 'due_date']),
      filters: JSON.stringify([['custom_student', '=', s.student], ['docstatus', '!=', '2']]),
      limit_page_length: '20',
    });
    const sis = (await fGet('/api/resource/Sales Invoice?' + siParams)).data || [];
    console.log(`\nStudent: ${s.student} (${s.student_name}) - Invoices: ${sis.length}`);
    for (const si of sis) {
      console.log(`  SINV: ${si.name} | total: ${si.grand_total} | outstanding: ${si.outstanding_amount} | status: ${si.status} | due: ${si.due_date}`);
    }
  }

  // 6. Payment Entries
  step('STEP 6: Payment Entries for Thopumpadi-10th students');
  for (const s of students) {
    // search by customer name
    const peParams2 = new URLSearchParams({
      fields: JSON.stringify(['name', 'party', 'paid_amount', 'payment_type', 'docstatus', 'posting_date', 'mode_of_payment']),
      filters: JSON.stringify([['party', '=', s.student_name], ['docstatus', '!=', '2']]),
      limit_page_length: '10',
    });
    const pes2 = (await fGet('/api/resource/Payment Entry?' + peParams2)).data || [];
    console.log(`\nStudent: ${s.student} (${s.student_name}) - PEs: ${pes2.length}`);
    for (const pe2 of pes2) {
      console.log(`  PE: ${pe2.name} | amount: ${pe2.paid_amount} | mode: ${pe2.mode_of_payment} | posted: ${pe2.posting_date} | docstatus: ${pe2.docstatus}`);
    }
  }

  // 7. Course Enrollments
  step('STEP 7: Course Enrollments for Thopumpadi-10th students');
  for (const s of students) {
    const ceParams = new URLSearchParams({
      fields: JSON.stringify(['name', 'course', 'student_batch_name', 'program_enrollment', 'enrollment_status']),
      filters: JSON.stringify([['student', '=', s.student]]),
      limit_page_length: '30',
    });
    const ces = (await fGet('/api/resource/Course Enrollment?' + ceParams)).data || [];
    console.log(`\nStudent: ${s.student} (${s.student_name}) - CEs: ${ces.length}`);
    for (const ce of ces) {
      console.log(`  CE: ${ce.name} | course: ${ce.course} | batch: ${ce.student_batch_name} | PE: ${ce.program_enrollment}`);
    }
  }

  // 8. Check existing 9th State group
  step('STEP 8: Thopumpadi-9th State-A Group Details');
  const sg9th = (await fGet('/api/resource/Student Group/Thopumpadi-9th State-A')).data;
  console.log('batch:', sg9th.batch);
  console.log('academic_year:', sg9th.academic_year);
  console.log('program:', sg9th.program);
  const students9th = sg9th.students || [];
  console.log(`Current students in 9th group: ${students9th.length}`);
  for (const s of students9th) {
    console.log(`  ${s.student} | ${s.student_name}`);
  }

  // 9. Fee structures for 9th State Thopumpadi
  step('STEP 9: 9th State Fee Structures for Thopumpadi');
  const feeParams = new URLSearchParams({
    fields: JSON.stringify(['name', 'program', 'academic_year', 'company']),
    filters: JSON.stringify([['name', 'like', '%Thop%']]),
    limit_page_length: '20',
  });
  const fees = (await fGet('/api/resource/Fee Structure?' + feeParams)).data || [];
  console.log('Fee structures (Thop*):', JSON.stringify(fees, null, 2));

  // 10. Student document details
  step('STEP 10: Student Document Details');
  for (const s of students) {
    const stuDoc = (await fGet('/api/resource/Student/' + encodeURIComponent(s.student))).data;
    console.log(`\n--- Student: ${s.student} ---`);
    console.log('first_name:', stuDoc.first_name);
    console.log('last_name:', stuDoc.last_name);
    console.log('student_name:', stuDoc.student_name);
    console.log('guardian:', (stuDoc.guardians || []).map(g => g.guardian_name).join(', '));
    console.log('custom_branch:', stuDoc.custom_branch);
    console.log('customer:', stuDoc.customer);
    console.log('user:', stuDoc.user);
  }
}

main().catch(console.error);
