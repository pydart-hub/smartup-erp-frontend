import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const getVal = (k) => lines.find(l => l.startsWith(k))?.split('=')[1]?.trim();
const url = getVal('NEXT_PUBLIC_FRAPPE_URL');
const key = getVal('FRAPPE_API_KEY');
const sec = getVal('FRAPPE_API_SECRET');
const headers = { 'Authorization': `token ${key}:${sec}`, 'Content-Type': 'application/json' };

async function run() {
  const stuRes = await fetch(`${url}/api/resource/Student/STU-SU CHL-26-024`, { headers });
  const stu = await stuRes.json();
  console.log('STUDENT:', stu.data?.name, stu.data?.student_name, stu.data?.custom_srr_no);

  const penRes = await fetch(`${url}/api/resource/Program Enrollment?filters=[["student","=","STU-SU CHL-26-024"],["docstatus","!=",2]]&fields=["name","custom_plan","fee_structure","docstatus"]`, { headers });
  console.log('PEN:', (await penRes.json()).data);

  const soRes = await fetch(`${url}/api/resource/Sales Order?filters=[["customer","=","SAYED MOHAMMED MANSUR ANSARI"],["docstatus","!=",2]]&fields=["name","grand_total","docstatus"]`, { headers });
  console.log('SO:', (await soRes.json()).data);

  const invRes = await fetch(`${url}/api/resource/Sales Invoice?filters=[["customer","=","SAYED MOHAMMED MANSUR ANSARI"],["docstatus","!=",2]]&fields=["name","grand_total","outstanding_amount","due_date","docstatus"]&order_by=due_date asc`, { headers });
  console.log('INVOICES:', (await invRes.json()).data);

  const payRes = await fetch(`${url}/api/resource/Payment Entry?filters=[["party","=","SAYED MOHAMMED MANSUR ANSARI"],["docstatus","!=",2]]&fields=["name","paid_amount","posting_date","mode_of_payment","reference_no","docstatus"]`, { headers });
  console.log('PAYMENTS:', (await payRes.json()).data);
}
run();
