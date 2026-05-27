

const FRAPPE_URL = 'https://smartup.m.frappe.cloud';
const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2' };

async function main() {
  const STUDENT_ID = 'STU-SU KDV-26-017';
  const CUSTOMER = 'Student Test - 47';

  // 1. Get student doc
  const rStu = await fetch(`${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(STUDENT_ID)}`, { headers });
  const stu = (await rStu.json()).data;
  console.log('=== Student ===');
  console.log(JSON.stringify({ name: stu.name, student_name: stu.student_name, customer: stu.customer, guardians: stu.guardians }, null, 2));

  // 2. Get guardian
  if (stu.guardians?.[0]?.guardian) {
    const rG = await fetch(`${FRAPPE_URL}/api/resource/Guardian/${encodeURIComponent(stu.guardians[0].guardian)}`, { headers });
    const g = (await rG.json()).data;
    console.log('\n=== Guardian ===');
    console.log(JSON.stringify({ name: g.name, guardian_name: g.guardian_name, email_address: g.email_address, mobile_number: g.mobile_number }, null, 2));
  }

  // 3. Get Sales Orders via customer
  const soParams = new URLSearchParams({
    filters: JSON.stringify([['customer', '=', CUSTOMER]]),
    fields: JSON.stringify(['name', 'student', 'student_name', 'company', 'status', 'grand_total']),
    limit_page_length: '10'
  });
  const rSO = await fetch(`${FRAPPE_URL}/api/resource/Sales Order?${soParams}`, { headers });
  const soData = (await rSO.json()).data;
  console.log('\n=== Sales Orders (by customer) ===');
  console.log(JSON.stringify(soData, null, 2));

  // 4. Get Invoices by customer
  const invParams = new URLSearchParams({
    filters: JSON.stringify([['customer', '=', CUSTOMER]]),
    fields: JSON.stringify(['name', 'grand_total', 'outstanding_amount', 'status', 'posting_date', 'student']),
    limit_page_length: '10'
  });
  const rInv = await fetch(`${FRAPPE_URL}/api/resource/Sales Invoice?${invParams}`, { headers });
  const invData = (await rInv.json()).data;
  console.log('\n=== Invoices (by customer) ===');
  console.log(JSON.stringify(invData, null, 2));
}
main().catch(console.error);
