const BASE = 'https://smartup.m.frappe.cloud';
const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json' };

async function main() {
  // 1. Find student
  console.log('=== SEARCHING FOR AFEESA ===');
  const stuRes = await fetch(
    BASE + '/api/resource/Student?filters=' + encodeURIComponent(JSON.stringify([['student_name','like','%Afeesa%']])) +
    '&fields=' + encodeURIComponent(JSON.stringify(['name','student_name','student_mobile_number','enabled'])) +
    '&limit=20',
    { headers }
  );
  const stuData = await stuRes.json();
  console.log(JSON.stringify(stuData, null, 2));

  let students = stuData.data || [];

  if (students.length === 0) {
    console.log('Trying feesa...');
    const res2 = await fetch(
      BASE + '/api/resource/Student?filters=' + encodeURIComponent(JSON.stringify([['student_name','like','%feesa%']])) +
      '&fields=' + encodeURIComponent(JSON.stringify(['name','student_name','student_mobile_number','enabled'])) +
      '&limit=20',
      { headers }
    );
    const d2 = await res2.json();
    students = d2.data || [];
    if (students.length === 0) { console.log('Not found'); return; }
  }

  for (const s of students) {
    const studentId = s.name;
    console.log('\n========================================');
    console.log('STUDENT:', studentId, '|', s.student_name);
    console.log('========================================');

    // Full student record
    console.log('\n--- FULL STUDENT RECORD ---');
    const fullRes = await fetch(BASE + '/api/resource/Student/' + studentId, { headers });
    const fullData = await fullRes.json();
    console.log(JSON.stringify(fullData.data, null, 2));

    // Program Enrollments
    console.log('\n--- PROGRAM ENROLLMENTS ---');
    const peRes = await fetch(
      BASE + '/api/resource/Program Enrollment?filters=' + encodeURIComponent(JSON.stringify([['student','=',studentId]])) +
      '&fields=' + encodeURIComponent(JSON.stringify(['name','student_name','academic_year','academic_term','status','docstatus'])) +
      '&limit=20',
      { headers }
    );
    const peData = await peRes.json();
    console.log(JSON.stringify(peData, null, 2));

    if (peData.data) {
      for (const pe of peData.data) {
        console.log('\n--- PE FULL:', pe.name, '---');
        const peDetail = await fetch(BASE + '/api/resource/Program Enrollment/' + encodeURIComponent(pe.name), { headers });
        const ped = await peDetail.json();
        console.log(JSON.stringify(ped.data, null, 2));
      }
    }

    // Course Enrollments
    console.log('\n--- COURSE ENROLLMENTS ---');
    const ceRes = await fetch(
      BASE + '/api/resource/Course Enrollment?filters=' + encodeURIComponent(JSON.stringify([['student','=',studentId]])) +
      '&fields=' + encodeURIComponent(JSON.stringify(['name','student_name','course','program_enrollment','enrollment_date'])) +
      '&limit=50',
      { headers }
    );
    const ceData = await ceRes.json();
    console.log(JSON.stringify(ceData, null, 2));

    // Sales Orders
    console.log('\n--- SALES ORDERS (custom_student) ---');
    const soRes = await fetch(
      BASE + '/api/resource/Sales Order?filters=' + encodeURIComponent(JSON.stringify([['custom_student','=',studentId]])) +
      '&fields=' + encodeURIComponent(JSON.stringify(['name','customer_name','status','grand_total','docstatus','outstanding_amount'])) +
      '&limit=20',
      { headers }
    );
    const soData = await soRes.json();
    console.log(JSON.stringify(soData, null, 2));

    // Sales Invoices
    console.log('\n--- SALES INVOICES ---');
    const siRes = await fetch(
      BASE + '/api/resource/Sales Invoice?filters=' + encodeURIComponent(JSON.stringify([['custom_student','=',studentId]])) +
      '&fields=' + encodeURIComponent(JSON.stringify(['name','customer_name','status','grand_total','docstatus','outstanding_amount'])) +
      '&limit=20',
      { headers }
    );
    const siData = await siRes.json();
    console.log(JSON.stringify(siData, null, 2));

    // Student Group membership
    console.log('\n--- STUDENT GROUP MEMBERSHIP ---');
    const smRes = await fetch(
      BASE + '/api/resource/Student Group Student?filters=' + encodeURIComponent(JSON.stringify([['student','=',studentId]])) +
      '&fields=' + encodeURIComponent(JSON.stringify(['name','parent','student','student_name','active'])) +
      '&limit=20',
      { headers }
    );
    const smData = await smRes.json();
    console.log(JSON.stringify(smData, null, 2));
  }

  // Also check eraveli Student Groups
  console.log('\n=== ERAVELI STUDENT GROUPS ===');
  const sgRes = await fetch(
    BASE + '/api/resource/Student Group?filters=' + encodeURIComponent(JSON.stringify([['name','like','%eraveli%']])) +
    '&fields=' + encodeURIComponent(JSON.stringify(['name'])) +
    '&limit=50',
    { headers }
  );
  const sgData = await sgRes.json();
  console.log(JSON.stringify(sgData, null, 2));

  if (sgData.data) {
    for (const sg of sgData.data) {
      console.log('\n--- SG FULL:', sg.name, '---');
      const sgDetail = await fetch(BASE + '/api/resource/Student Group/' + encodeURIComponent(sg.name), { headers });
      const sgd = await sgDetail.json();
      console.log(JSON.stringify(sgd.data, null, 2));
    }
  }
}

main().catch(console.error);
