const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function get(path) {
  const r = await fetch(BASE + path, { headers: { Authorization: AUTH } });
  return r.json();
}

// 1. Get SO details directly
const so906 = await get('/api/resource/Sales Order/SAL-ORD-2026-00906');
const so862 = await get('/api/resource/Sales Order/SAL-ORD-2026-00862');
const so660 = await get('/api/resource/Sales Order/SAL-ORD-2026-00660');

for (const [name, d] of [['SAL-ORD-2026-00906', so906], ['SAL-ORD-2026-00862', so862], ['SAL-ORD-2026-00660', so660]]) {
  const so = d.data;
  if (!so) { console.log(`\n=== ${name} === NOT FOUND`); continue; }
  console.log(`\n=== ${name} ===`);
  console.log('Status:', so.status, '| Billing:', so.billing_status, '| Delivery:', so.delivery_status);
  console.log('Per Billed:', so.per_billed, '% | Grand Total:', so.grand_total);
  console.log('Customer:', so.customer, '| Student:', so.custom_student);
  console.log('Plan:', so.custom_payment_plan, '| Academic Year:', so.custom_academic_year);
  console.log('Docstatus:', so.docstatus);
  console.log('Items:', JSON.stringify(so.items?.map(i => ({ item: i.item_code, qty: i.qty, rate: i.rate, amount: i.amount, billed_amt: i.billed_amt })), null, 2));
}

// 2. Get all Sales Invoices for ITHIKA SAJU
const inv = await get('/api/resource/Sales Invoice?filters=[["customer","=","ITHIKA SAJU"]]&fields=["name","status","grand_total","outstanding_amount","due_date","sales_order","docstatus"]&order_by=creation desc&limit=20');
console.log('\n=== SALES INVOICES ===');
console.log(JSON.stringify(inv.data, null, 2));

// Get ITHIKA SAJU specifically
const stu = await get('/api/resource/Student?filters=[["student_name","like","%ITHIKA%"]]&fields=["name","student_name","custom_branch","customer"]');
const ithika = stu.data?.find(s => s.student_name === 'ITHIKA SAJU');
console.log('\n=== ITHIKA SAJU STUDENT ===');
console.log(JSON.stringify(ithika, null, 2));

if (ithika) {
  const sid = ithika.name; // STU-SU FKO-26-098
  // Program Enrollment
  const pe = await get(`/api/resource/Program Enrollment?filters=[["student","=","${sid}"]]&fields=["name","program","academic_year","enrollment_date","docstatus","custom_fee_structure","custom_plan","custom_no_of_instalments"]&order_by=creation desc`);
  console.log('\n=== ITHIKA PROGRAM ENROLLMENTS ===');
  console.log(JSON.stringify(pe.data, null, 2));

  // Sales Invoices by customer
  const inv2 = await get(`/api/resource/Sales Invoice?filters=[["customer","=","ITHIKA SAJU"]]&fields=["name","status","grand_total","outstanding_amount","due_date","sales_order","docstatus"]&order_by=creation desc&limit=20`);
  console.log('\n=== ITHIKA SALES INVOICES (by customer name) ===');
  console.log(JSON.stringify(inv2.data, null, 2));
}

