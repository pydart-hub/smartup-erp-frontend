const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function checkDetails() {
  const so = await (await fetch(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00495`, { headers })).json();
  console.log('SO items:', JSON.stringify(so.data.items, null, 2));

  const inv = await (await fetch(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-04416`, { headers })).json();
  console.log('Inv items:', JSON.stringify(inv.data.items, null, 2));
}

checkDetails().catch(console.error);
