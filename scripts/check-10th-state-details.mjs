const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function checkDetails() {
  const p = new URLSearchParams();
  p.append('doctype', 'Fee Structure');
  p.append('fields', JSON.stringify(['name', 'program', 'total_amount']));
  p.append('filters', JSON.stringify([['Fee Structure', 'name', 'like', '%10th%State%']]));

  const feeRes = await (await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: p.toString()
  })).json();
  console.log('Fee structures 10th State:', feeRes.message?.values);

  const so = await (await fetch(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00392`, { headers })).json();
  console.log('SO items:', JSON.stringify(so.data.items, null, 2));

  const inv = await (await fetch(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-03731`, { headers })).json();
  console.log('Inv items:', JSON.stringify(inv.data.items, null, 2));
}

checkDetails().catch(console.error);
