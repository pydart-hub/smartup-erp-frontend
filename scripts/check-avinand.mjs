const headers = { 
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 
  'Content-Type': 'application/json' 
};
const base = 'https://smartup.m.frappe.cloud';

async function check() {
  const sRes = await fetch(`${base}/api/resource/Student?filters=[["first_name","like","%AVINAND%"]]&fields=["name","first_name","student_name","custom_branch","joining_date","customer"]`, { headers });
  const students = (await sRes.json()).data;
  console.log('Students:', JSON.stringify(students, null, 2));

  if (!students || students.length === 0) return;
  const s = students[0];

  const peRes = await fetch(`${base}/api/resource/Program Enrollment?filters=[["student","=","${s.name}"]]&fields=["name","program","custom_batch","custom_fee_structure"]`, { headers });
  console.log('PE:', JSON.stringify((await peRes.json()).data, null, 2));

  const soRes = await fetch(`${base}/api/resource/Sales Order?filters=[["customer","=","${s.customer}"],["docstatus","!=",2]]&fields=["name","grand_total","docstatus","status"]`, { headers });
  console.log('Sales Orders:', JSON.stringify((await soRes.json()).data, null, 2));

  const sinvRes = await fetch(`${base}/api/resource/Sales Invoice?filters=[["customer","=","${s.customer}"],["docstatus","!=",2]]&fields=["name","grand_total","outstanding_amount","due_date","posting_date","docstatus","status"]`, { headers });
  console.log('Sales Invoices:', JSON.stringify((await sinvRes.json()).data, null, 2));

  const pePayRes = await fetch(`${base}/api/resource/Payment Entry?filters=[["party","=","${s.customer}"],["docstatus","!=",2]]&fields=["name","paid_amount","posting_date","mode_of_payment","docstatus","status","remarks"]`, { headers });
  console.log('Payment Entries:', JSON.stringify((await pePayRes.json()).data, null, 2));
}

check();
