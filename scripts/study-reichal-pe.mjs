const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function studyPaymentsAndCustomer() {
  console.log('=== PAYMENT 1: ACC-PAY-2026-04282 ===');
  let pe1 = await (await fetch(`${baseUrl}/api/resource/Payment Entry/ACC-PAY-2026-04282`, { headers })).json();
  console.log(JSON.stringify(pe1.data, null, 2));

  console.log('\n=== PAYMENT 2: ACC-PAY-2026-04692 ===');
  let pe2 = await (await fetch(`${baseUrl}/api/resource/Payment Entry/ACC-PAY-2026-04692`, { headers })).json();
  console.log(JSON.stringify(pe2.data, null, 2));

  console.log('\n=== CUSTOMER: REICHAL DANY ===');
  let cust = await (await fetch(`${baseUrl}/api/resource/Customer/REICHAL DANY`, { headers })).json();
  console.log(JSON.stringify(cust.data, null, 2));
}

studyPaymentsAndCustomer().catch(console.error);
