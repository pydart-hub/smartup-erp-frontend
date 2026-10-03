import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const getVal = (k) => lines.find(l => l.startsWith(k))?.split('=')[1]?.trim();
const url = getVal('NEXT_PUBLIC_FRAPPE_URL');
const key = getVal('FRAPPE_API_KEY');
const sec = getVal('FRAPPE_API_SECRET');
const headers = { 'Authorization': `token ${key}:${sec}`, 'Content-Type': 'application/json' };

async function run() {
  const penRes = await fetch(`${url}/api/resource/Program Enrollment?filters=[["student","=","STU-SU CHL-26-024"]]&fields=["name","custom_plan","custom_fee_structure","custom_no_of_instalments","docstatus","student","custom_student_srr","student_name","enrollment_date","program","custom_program_abb","academic_year","student_batch_name"]`, { headers });
  console.log('PEN:', (await penRes.json()).data);

  const soRes = await fetch(`${url}/api/resource/Sales Order/SAL-ORD-2026-00153`, { headers });
  const so = await soRes.json();
  console.log('SO items:', so.data?.items?.map(i => ({ name: i.name, item_code: i.item_code, rate: i.rate, amount: i.amount })));

  const payRes = await fetch(`${url}/api/resource/Payment Entry/ACC-PAY-2026-03956`, { headers });
  const pay = await payRes.json();
  console.log('Payment:', {
    name: pay.data?.name,
    paid_to: pay.data?.paid_to,
    paid_amount: pay.data?.paid_amount,
    posting_date: pay.data?.posting_date,
    mode_of_payment: pay.data?.mode_of_payment,
    reference_no: pay.data?.reference_no,
    reference_date: pay.data?.reference_date
  });
}
run();
