const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function summary() {
  const customerName = 'IRINE ANN MARYY';
  const peRes = await (await fetch(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","${encodeURIComponent(customerName)}"],["docstatus","=",1]]&fields=["name","posting_date","mode_of_payment","paid_amount","reference_no"]&order_by=posting_date asc`, { headers })).json();
  let totalPaid = 0;
  for (const pe of peRes.data) {
    totalPaid += pe.paid_amount;
    console.log(`${pe.name} | Date: ${pe.posting_date} | Mode: ${pe.mode_of_payment} | Amount: ₹${pe.paid_amount} | Ref: ${pe.reference_no}`);
  }
  console.log('Total Paid Amount:', totalPaid);
}

summary().catch(console.error);
