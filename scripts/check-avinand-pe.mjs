const headers = { 
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 
  'Content-Type': 'application/json' 
};
const base = 'https://smartup.m.frappe.cloud';

async function checkMore() {
  const peRes = await fetch(`${base}/api/resource/Program Enrollment?filters=[["student","=","STU-SU MMK-26-047"]]&fields=["name","program","custom_batch","custom_fee_structure","docstatus"]`, { headers });
  console.log('PE raw:', await peRes.text());

  const soRes = await fetch(`${base}/api/resource/Sales Order/SAL-ORD-2026-00779`, { headers });
  const so = (await soRes.json()).data;
  console.log('SO items:', JSON.stringify(so.items.map(i => ({ item_code: i.item_code, rate: i.rate, amount: i.amount })), null, 2));
}

checkMore();
