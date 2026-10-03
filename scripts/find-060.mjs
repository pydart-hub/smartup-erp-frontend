import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const getVal = (k) => lines.find(l => l.startsWith(k))?.split('=')[1]?.trim();
const url = getVal('NEXT_PUBLIC_FRAPPE_URL');
const key = getVal('FRAPPE_API_KEY');
const sec = getVal('FRAPPE_API_SECRET');
const headers = { 'Authorization': `token ${key}:${sec}`, 'Content-Type': 'application/json' };

async function run() {
  const stuRes = await fetch(`${url}/api/resource/Student?filters=[["name","like","%060%"]]&fields=["name","student_name","first_name"]`, { headers });
  const students = (await stuRes.json()).data;
  console.log('STUDENTS BY 060:', students);

  const penRes = await fetch(`${url}/api/resource/Program Enrollment?filters=[["custom_student_srr","=","060"]]&fields=["name","student","student_name","custom_student_srr","program","student_batch_name","custom_plan","custom_fee_structure","docstatus"]`, { headers });
  console.log('PEN BY 060:', (await penRes.json()).data);
}
run();
