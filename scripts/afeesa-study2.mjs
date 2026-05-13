const BASE = 'https://smartup.m.frappe.cloud';
const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json' };

async function get(path) {
  const res = await fetch(BASE + path, { headers });
  return res.json();
}

async function main() {
  // 1. Get Eraveli 9th Student Group
  console.log('=== ERAVELI-9th STATE-A STUDENT GROUP ===');
  const sg9 = await get('/api/resource/Student Group/' + encodeURIComponent('Eraveli-9th State-A'));
  const d = sg9.data;
  console.log('Name:', d.name);
  console.log('Program:', d.program);
  console.log('Batch:', d.student_batch_name || d.batch);
  console.log('Total students:', d.students?.length);
  console.log('Students:', JSON.stringify(d.students?.slice(0,3), null, 2));

  // 2. Get a sample 9th Eraveli PE
  console.log('\n=== SAMPLE 9TH ERAVELI PROGRAM ENROLLMENT ===');
  const pe9List = await get('/api/resource/Program Enrollment?filters=' + encodeURIComponent(JSON.stringify([['name','like','%9th%Eraveli%']])) +
    '&fields=' + encodeURIComponent(JSON.stringify(['name','student_name','academic_year','academic_term','docstatus'])) + '&limit=3');
  console.log('PE List:', JSON.stringify(pe9List.data, null, 2));

  if (pe9List.data && pe9List.data.length > 0) {
    const exPE = await get('/api/resource/Program Enrollment/' + encodeURIComponent(pe9List.data[0].name));
    console.log('\nFull 9th PE:', JSON.stringify(exPE.data, null, 2));
  }

  // 3. Get Sales Invoice detail for Afeesa (first invoice)
  console.log('\n=== SALES INVOICE DETAIL - ACC-SINV-2026-02415 ===');
  const si1 = await get('/api/resource/Sales Invoice/ACC-SINV-2026-02415');
  console.log(JSON.stringify(si1.data, null, 2));

  // 4. Check fee structure for 9th Eraveli
  console.log('\n=== 9TH ERAVELI FEE STRUCTURES ===');
  const fs9 = await get('/api/resource/Fee Structure?filters=' + encodeURIComponent(JSON.stringify([['name','like','%ERV%9th%']])) +
    '&fields=' + encodeURIComponent(JSON.stringify(['name','program','academic_year'])) + '&limit=20');
  console.log(JSON.stringify(fs9, null, 2));

  // 5. Sales Order for Afeesa
  console.log('\n=== SALES ORDERS FOR AFEESA ===');
  const so = await get('/api/resource/Sales Order?filters=' + encodeURIComponent(JSON.stringify([['customer','=','AFEESA U Z']])) +
    '&fields=' + encodeURIComponent(JSON.stringify(['name','customer_name','status','grand_total','docstatus'])) + '&limit=20');
  console.log(JSON.stringify(so, null, 2));

  // 6. Check if there's a 9th Eraveli batch
  console.log('\n=== STUDENT BATCH - ERAVELI 26-27 ===');
  const batch = await get('/api/resource/Student Batch Name?filters=' + encodeURIComponent(JSON.stringify([['name','like','%Eraveli%']])) +
    '&fields=' + encodeURIComponent(JSON.stringify(['name'])) + '&limit=20');
  console.log(JSON.stringify(batch, null, 2));
}

main().catch(console.error);
