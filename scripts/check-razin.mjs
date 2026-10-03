import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const getVal = (k) => lines.find(l => l.startsWith(k))?.split('=')[1]?.trim();
const url = getVal('NEXT_PUBLIC_FRAPPE_URL');
const key = getVal('FRAPPE_API_KEY');
const sec = getVal('FRAPPE_API_SECRET');
const headers = { 'Authorization': `token ${key}:${sec}`, 'Content-Type': 'application/json' };

async function run() {
  const penRes = await fetch(`${url}/api/resource/Program Enrollment?filters=[["custom_student_srr","=","242"]]&fields=["name","student","student_name","custom_student_srr","program","student_batch_name","custom_plan","custom_fee_structure","docstatus"]`, { headers });
  const pens = (await penRes.json()).data;
  console.log('PEN BY 242:', pens);

  const chlPen = pens?.find(p => p.student_batch_name?.includes('Chullickal') || p.student?.includes('CHL'));
  if (chlPen) {
    const stuId = chlPen.student;
    const stuName = chlPen.student_name;

    const stuRes = await fetch(`${url}/api/resource/Student/${stuId}`, { headers });
    const stu = await stuRes.json();
    console.log('Student customer:', stu.data?.customer);

    const cust = stu.data?.customer || stuName;

    const soRes = await fetch(`${url}/api/resource/Sales Order?filters=[["customer","=","${cust}"]],["docstatus","!=",2]&fields=["name","customer","grand_total","docstatus"]`, { headers });
    console.log('SO:', (await soRes.json()).data);

    const invRes = await fetch(`${url}/api/resource/Sales Invoice?filters=[["customer","=","${cust}"],["docstatus","!=",2]]&fields=["name","grand_total","outstanding_amount","due_date","posting_date","docstatus"]&order_by=due_date asc`, { headers });
    console.log('INVOICES:', (await invRes.json()).data);

    const payRes = await fetch(`${url}/api/resource/Payment Entry?filters=[["party","in",["${cust}","${stuName}"]],["docstatus","!=",2]]&fields=["name","paid_amount","posting_date","mode_of_payment","reference_no","reference_date","paid_to","docstatus"]`, { headers });
    console.log('PAYMENTS:', (await payRes.json()).data);
  }
}
run();
