const BASE = 'https://smartup.m.frappe.cloud';
const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json' };

async function get(path) {
  const res = await fetch(BASE + path, { headers });
  return res.json();
}

async function main() {
  // 1. Full PE for Afeesa
  console.log('=== PE: PEN-10th-Eraveli 26-27-010 ===');
  const pe = await get('/api/resource/Program Enrollment/PEN-10th-Eraveli 26-27-010');
  console.log(JSON.stringify(pe.data, null, 2));

  // 2. Student Group membership for Afeesa
  console.log('\n=== STUDENT GROUP MEMBERSHIP - AFEESA ===');
  const sm = await get('/api/resource/Student Group Student?filters=' + encodeURIComponent(JSON.stringify([['student','=','STU-SU ERV-26-010']])) +
    '&fields=' + encodeURIComponent(JSON.stringify(['name','parent','student','student_name','active','group_roll_number'])) + '&limit=20');
  console.log(JSON.stringify(sm, null, 2));

  // 3. All Eraveli Student Groups (both 9th and 10th)
  console.log('\n=== ALL ERAVELI STUDENT GROUPS ===');
  const sg = await get('/api/resource/Student Group?filters=' + encodeURIComponent(JSON.stringify([['name','like','%Eraveli%']])) +
    '&fields=' + encodeURIComponent(JSON.stringify(['name'])) + '&limit=50');
  console.log(JSON.stringify(sg.data?.map(x => x.name), null, 2));

  // 4. Eraveli 9th Program Enrollments
  console.log('\n=== ERAVELI 9TH PROGRAM ENROLLMENTS (sample) ===');
  const pe9 = await get('/api/resource/Program Enrollment?filters=' + encodeURIComponent(JSON.stringify([['name','like','%9th%Eraveli%']])) +
    '&fields=' + encodeURIComponent(JSON.stringify(['name','student_name','academic_year','academic_term','status','docstatus'])) + '&limit=5');
  console.log(JSON.stringify(pe9, null, 2));
  
  // 5. One example 9th Eraveli PE to see structure
  if (pe9.data && pe9.data.length > 0) {
    const ex = await get('/api/resource/Program Enrollment/' + encodeURIComponent(pe9.data[0].name));
    console.log('\n=== EXAMPLE 9TH PE FULL RECORD ===');
    console.log(JSON.stringify(ex.data, null, 2));
  }

  // 6. All Programs available
  console.log('\n=== ALL PROGRAMS (9th/10th) ===');
  const progs = await get('/api/resource/Program?filters=' + encodeURIComponent(JSON.stringify([['name','like','%th%']])) +
    '&fields=' + encodeURIComponent(JSON.stringify(['name'])) + '&limit=50');
  console.log(JSON.stringify(progs.data?.map(x => x.name), null, 2));

  // 7. Sales Invoice check for Afeesa customer
  console.log('\n=== SALES INVOICES FOR AFEESA (by customer) ===');
  const si = await get('/api/resource/Sales Invoice?filters=' + encodeURIComponent(JSON.stringify([['customer','=','AFEESA U Z']])) +
    '&fields=' + encodeURIComponent(JSON.stringify(['name','customer_name','status','grand_total','docstatus','outstanding_amount'])) + '&limit=20');
  console.log(JSON.stringify(si, null, 2));

  // 8. Sales Order for Afeesa
  console.log('\n=== SALES ORDERS FOR AFEESA (by customer) ===');
  const so = await get('/api/resource/Sales Order?filters=' + encodeURIComponent(JSON.stringify([['customer','=','AFEESA U Z']])) +
    '&fields=' + encodeURIComponent(JSON.stringify(['name','customer_name','status','grand_total','docstatus','outstanding_amount'])) + '&limit=20');
  console.log(JSON.stringify(so, null, 2));

  // 9. Course Enrollments for Afeesa - full list with course names
  console.log('\n=== ALL COURSE ENROLLMENTS FOR AFEESA ===');
  const ce = await get('/api/resource/Course Enrollment?filters=' + encodeURIComponent(JSON.stringify([['student','=','STU-SU ERV-26-010']])) +
    '&fields=' + encodeURIComponent(JSON.stringify(['name','course','program_enrollment','enrollment_date'])) + '&limit=50');
  console.log(JSON.stringify(ce, null, 2));
}

main().catch(console.error);
