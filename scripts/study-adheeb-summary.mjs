const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function summary() {
  const customerName = 'ADHEEB RILLAH K U';
  
  // SO
  const soRes = await (await fetch(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","${encodeURIComponent(customerName)}"]]&fields=["name","grand_total","status","custom_plan","custom_no_of_instalments","transaction_date","delivery_date"]`, { headers })).json();
  console.log('SO Summary:', soRes.data);

  // Invoices
  const invRes = await (await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${encodeURIComponent(customerName)}"]]&fields=["name","posting_date","due_date","grand_total","outstanding_amount","status","remarks"]&order_by=posting_date asc`, { headers })).json();
  console.log('\nInvoices Summary:');
  for (const inv of invRes.data) {
    console.log(`${inv.name} | Posting: ${inv.posting_date} | Due: ${inv.due_date} | Total: ${inv.grand_total} | Out: ${inv.outstanding_amount} | Status: ${inv.status} | Remarks: ${inv.remarks}`);
  }

  // PEs
  const peRes = await (await fetch(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","${encodeURIComponent(customerName)}"]]&fields=["name","posting_date","mode_of_payment","paid_amount","remarks","reference_no"]&order_by=posting_date asc`, { headers })).json();
  console.log('\nPayment Entries:');
  let totalPaid = 0;
  for (const pe of peRes.data) {
    totalPaid += pe.paid_amount;
    console.log(`${pe.name} | Date: ${pe.posting_date} | Mode: ${pe.mode_of_payment} | Amount: ${pe.paid_amount} | Ref: ${pe.reference_no}`);
  }
  console.log('Total Paid Amount:', totalPaid);
}

summary().catch(console.error);
