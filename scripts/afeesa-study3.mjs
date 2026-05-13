const BASE = 'https://smartup.m.frappe.cloud';
const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json' };

async function get(path) {
  const res = await fetch(BASE + path, { headers });
  return res.json();
}

async function main() {
  // 1. Check 10th State-A student group for Afeesa
  console.log('=== ERAVELI-10th State-A - checking for Afeesa ===');
  const sg10a = await get('/api/resource/Student Group/' + encodeURIComponent('Eraveli-10th State-A'));
  const afeesaIn10A = sg10a.data?.students?.find(s => s.student === 'STU-SU ERV-26-010');
  console.log('Afeesa in 10th-A:', afeesaIn10A || 'NOT FOUND');

  // 2. Check 10th State-B student group
  console.log('\n=== ERAVELI-10th State-B - checking for Afeesa ===');
  const sg10b = await get('/api/resource/Student Group/' + encodeURIComponent('Eraveli-10th State-B'));
  const afeesaIn10B = sg10b.data?.students?.find(s => s.student === 'STU-SU ERV-26-010');
  console.log('Afeesa in 10th-B:', afeesaIn10B || 'NOT FOUND');

  // 3. Check 9th student group for Afeesa
  console.log('\n=== ERAVELI-9th State-A - checking for Afeesa ===');
  const sg9a = await get('/api/resource/Student Group/' + encodeURIComponent('Eraveli-9th State-A'));
  const afeesaIn9A = sg9a.data?.students?.find(s => s.student === 'STU-SU ERV-26-010');
  console.log('Afeesa in 9th-A:', afeesaIn9A || 'NOT FOUND');
  console.log('9th-A last student idx:', sg9a.data?.students?.[sg9a.data.students.length - 1]?.idx);
  console.log('9th-A last student srr:', sg9a.data?.students?.[sg9a.data.students.length - 1]?.student);

  // 4. Available 9th fee structures at Eraveli
  console.log('\n=== 9TH STATE FEE STRUCTURES (Eraveli) ===');
  const fs = await get('/api/resource/Fee Structure?filters=' + encodeURIComponent(JSON.stringify([['name','like','%ERV%9th%']])) +
    '&fields=' + encodeURIComponent(JSON.stringify(['name'])) + '&limit=20');
  console.log(JSON.stringify(fs.data, null, 2));

  // 5. Check full sales invoice details for ALL of Afeesa's invoices
  console.log('\n=== SALES INVOICE SUMMARY ===');
  const invoices = [
    'ACC-SINV-2026-02415', 'ACC-SINV-2026-02416', 'ACC-SINV-2026-02417', 
    'ACC-SINV-2026-02418', 'ACC-SINV-2026-02419', 'ACC-SINV-2026-02420',
    'ACC-SINV-2026-02421-1'
  ];
  for (const inv of invoices) {
    const si = await get('/api/resource/Sales Invoice/' + inv);
    const d = si.data;
    console.log(`${inv}: status=${d.status} docstatus=${d.docstatus} grand_total=${d.grand_total} outstanding=${d.outstanding_amount} item=${d.items?.[0]?.item_code}`);
  }

  // 6. Payment entries for Afeesa
  console.log('\n=== PAYMENT ENTRIES FOR AFEESA ===');
  const pe = await get('/api/resource/Payment Entry?filters=' + encodeURIComponent(JSON.stringify([['party','=','AFEESA U Z']])) +
    '&fields=' + encodeURIComponent(JSON.stringify(['name','party','paid_amount','docstatus','payment_type','posting_date'])) + '&limit=20');
  console.log(JSON.stringify(pe, null, 2));

  // 7. Check if PEN-9th-Eraveli 26-27-010 already exists
  console.log('\n=== CHECKING IF 9TH PE FOR 010 EXISTS ===');
  const existingPE = await get('/api/resource/Program Enrollment/PEN-9th-Eraveli 26-27-010');
  console.log('Exists:', existingPE.exception ? 'NO - ' + existingPE.exc_type : 'YES - ' + existingPE.data?.name);
}

main().catch(console.error);
