const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function run() {
  let sinvRes = await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([["customer_name","like","%Arfiya%"],["docstatus","=",1]]))}&fields=${encodeURIComponent(JSON.stringify(["name","posting_date","due_date","grand_total","outstanding_amount","status"]))}&order_by=due_date asc`, { headers });
  let sinvData = await sinvRes.json();
  console.log('=== ARFIYA T A SUBMITTED INVOICES ===');
  console.table(sinvData.data);
}
run();
