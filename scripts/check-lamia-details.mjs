const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function checkDetails() {
  const invReturn = await (await fetch(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-04420`, { headers })).json();
  console.log('Return invoice ACC-SINV-2026-04420:', {
    is_return: invReturn.data.is_return,
    return_against: invReturn.data.return_against,
    grand_total: invReturn.data.grand_total,
    items: invReturn.data.items?.map(it => ({ item_code: it.item_code, amount: it.amount, rate: it.rate }))
  });

  const peRes = await (await fetch(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","LAMIA ASHKER BABU"],["docstatus","=",1]]&fields=["name","posting_date","mode_of_payment","paid_amount","paid_to","reference_no"]&order_by=posting_date asc`, { headers })).json();
  console.log('\nActive Payment Entries:');
  let totalPaid = 0;
  for (const pe of peRes.data) {
    totalPaid += pe.paid_amount;
    console.log(`${pe.name} | Date: ${pe.posting_date} | Mode: ${pe.mode_of_payment} | Amount: ₹${pe.paid_amount} | To: ${pe.paid_to} | Ref: ${pe.reference_no}`);
  }
  console.log('Total Active Paid:', totalPaid);
}

checkDetails().catch(console.error);
