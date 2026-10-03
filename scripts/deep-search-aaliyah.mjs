import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const getVal = (k) => lines.find(l => l.startsWith(k))?.split('=')[1]?.trim();
const url = getVal('NEXT_PUBLIC_FRAPPE_URL');
const key = getVal('FRAPPE_API_KEY');
const sec = getVal('FRAPPE_API_SECRET');
const headers = { 'Authorization': `token ${key}:${sec}`, 'Content-Type': 'application/json' };

async function search() {
  const soRes = await fetch(`${url}/api/resource/Sales Order?filters=[["student","=","STU-SU CHL-26-237"]]&fields=["name","customer","grand_total","docstatus"]`, { headers });
  console.log('SO by student:', (await soRes.json()).data);

  const invRes = await fetch(`${url}/api/resource/Sales Invoice?filters=[["student","=","STU-SU CHL-26-237"]]&fields=["name","customer","grand_total","outstanding_amount","docstatus"]`, { headers });
  console.log('INV by student:', (await invRes.json()).data);

  const penRes = await fetch(`${url}/api/resource/Program Enrollment/PEN-9th-Chullickal 26-27-237`, { headers });
  const pen = await penRes.json();
  console.log('PEN details:', {
    name: pen.data?.name,
    custom_plan: pen.data?.custom_plan,
    custom_fee_structure: pen.data?.custom_fee_structure,
    custom_no_of_instalments: pen.data?.custom_no_of_instalments,
    enrollment_date: pen.data?.enrollment_date,
    student: pen.data?.student,
    student_name: pen.data?.student_name,
    docstatus: pen.data?.docstatus
  });

  const custRes = await fetch(`${url}/api/resource/Customer?filters=[["name","like","%AALIYAH%"]]&fields=["name","customer_name"]`, { headers });
  console.log('Customer like AALIYAH:', (await custRes.json()).data);

  const stuRes = await fetch(`${url}/api/resource/Student/STU-SU CHL-26-237`, { headers });
  console.log('Student doc:', (await stuRes.json()).data);
}
search();
