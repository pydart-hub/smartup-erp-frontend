const headers = { 
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 
  'Content-Type': 'application/json' 
};
const base = 'https://smartup.m.frappe.cloud';

async function test() {
  const sinv = await fetch(`${base}/api/resource/Sales Invoice/ACC-SINV-2026-06175`, { headers });
  const data = (await sinv.json()).data;
  console.log('Items:', JSON.stringify(data.items, null, 2));
  console.log('Payment schedule:', JSON.stringify(data.payment_schedule, null, 2));
  console.log('Taxes:', JSON.stringify(data.taxes, null, 2));
}
test();
