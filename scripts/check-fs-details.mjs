const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function checkDetails() {
  const fs = await (await fetch(`${baseUrl}/api/resource/Fee Structure/SU CHL-12th Science State-Basic-8`, { headers })).json();
  console.log('Fee Structure components:', JSON.stringify(fs.data.components, null, 2));

  // Check item code from SO
  const so = await (await fetch(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00342`, { headers })).json();
  console.log('SO items:', JSON.stringify(so.data.items, null, 2));
  console.log('SO payment_schedule:', JSON.stringify(so.data.payment_schedule, null, 2));
}

checkDetails().catch(console.error);
