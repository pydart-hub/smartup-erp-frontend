import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const getVal = (k) => lines.find(l => l.startsWith(k))?.split('=')[1]?.trim();
const url = getVal('NEXT_PUBLIC_FRAPPE_URL');
const key = getVal('FRAPPE_API_KEY');
const sec = getVal('FRAPPE_API_SECRET');
const headers = { 'Authorization': `token ${key}:${sec}`, 'Content-Type': 'application/json' };

async function run() {
  const stuRes = await fetch(`${url}/api/resource/Student?filters=[["first_name","like","%YOHAN%"]]&fields=["name","student_name","custom_srr_no","first_name"]`, { headers });
  const students = (await stuRes.json()).data;
  console.log('STUDENTS:', students);

  if (students && students.length > 0) {
    const stu = students[0];
    const stuId = stu.name;
    const stuName = stu.student_name;

    const penRes = await fetch(`${url}/api/resource/Program Enrollment?filters=[["student","=","${stuId}"],["docstatus","!=",2]]&fields=["name","custom_plan","custom_fee_structure","custom_no_of_instalments","docstatus","student","custom_student_srr","student_name","enrollment_date","program","custom_program_abb","academic_year","student_batch_name"]`, { headers });
    console.log('PEN:', (await penRes.json()).data);

    const soRes = await fetch(`${url}/api/resource/Sales Order?filters=[["customer","=","${stuName}"],["docstatus","!=",2]]&fields=["name","grand_total","docstatus"]`, { headers });
    console.log('SO:', (await soRes.json()).data);

    const invRes = await fetch(`${url}/api/resource/Sales Invoice?filters=[["customer","=","${stuName}"],["docstatus","!=",2]]&fields=["name","grand_total","outstanding_amount","due_date","posting_date","docstatus"]&order_by=due_date asc`, { headers });
    console.log('INVOICES:', (await invRes.json()).data);

    const payRes = await fetch(`${url}/api/resource/Payment Entry?filters=[["party","=","${stuName}"],["docstatus","!=",2]]&fields=["name","paid_amount","posting_date","mode_of_payment","reference_no","reference_date","paid_to","docstatus"]`, { headers });
    console.log('PAYMENTS:', (await payRes.json()).data);
  }
}
run();
