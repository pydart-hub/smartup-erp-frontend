const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function verifyActive() {
  const customerName = 'Alfonsa jenifer';
  
  // SO
  const soRes = await (await fetch(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","${encodeURIComponent(customerName)}"],["docstatus","=",1]]&fields=["name","grand_total","status","custom_plan","custom_no_of_instalments"]`, { headers })).json();
  console.log('Active SO:', soRes.data);

  // Invoices
  const invRes = await (await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${encodeURIComponent(customerName)}"],["docstatus","=",1]]&fields=["name","posting_date","due_date","grand_total","outstanding_amount","status"]&order_by=due_date asc`, { headers })).json();
  console.log('\nActive Invoices:');
  let totalBilled = 0;
  let totalOutstanding = 0;
  for (const inv of invRes.data) {
    totalBilled += inv.grand_total;
    totalOutstanding += inv.outstanding_amount;
    console.log(`${inv.name} | Due: ${inv.due_date} | Total: ₹${inv.grand_total} | Out: ₹${inv.outstanding_amount} | Status: ${inv.status}`);
  }
  console.log(`Total Billed: ₹${totalBilled} | Total Outstanding: ₹${totalOutstanding}`);

  // Active PEs
  const peRes = await (await fetch(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","${encodeURIComponent(customerName)}"],["docstatus","=",1]]&fields=["name","posting_date","mode_of_payment","paid_amount","reference_no"]&order_by=posting_date asc`, { headers })).json();
  console.log('\nActive Payment Entries:');
  let totalPaid = 0;
  for (const pe of peRes.data) {
    totalPaid += pe.paid_amount;
    console.log(`${pe.name} | Date: ${pe.posting_date} | Mode: ${pe.mode_of_payment} | Paid: ₹${pe.paid_amount} | Ref: ${pe.reference_no}`);
  }
  console.log(`Active Total Paid: ₹${totalPaid}`);
}

verifyActive().catch(console.error);
