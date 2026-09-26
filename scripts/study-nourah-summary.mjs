const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function run() {
  let res = await fetch(`${baseUrl}/api/resource/Student?filters=${encodeURIComponent(JSON.stringify([["first_name","like","%Nourah%"]]))}&fields=${encodeURIComponent(JSON.stringify(["name","first_name","joining_date","creation","modified","custom_academic_year","custom_course_name","custom_branch"]))}`, { headers });
  let data = await res.json();
  console.log('STUDENT:', data.data);

  let sinvRes = await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([["customer_name","like","%Nourah%"]]))}&fields=${encodeURIComponent(JSON.stringify(["name","posting_date","grand_total","outstanding_amount","status","docstatus","creation"]))}`, { headers });
  let sinvData = await sinvRes.json();
  console.log('SALES INVOICES:', sinvData.data);
}
run();
