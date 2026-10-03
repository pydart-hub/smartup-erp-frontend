import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const getVal = (k) => lines.find(l => l.startsWith(k))?.split('=')[1]?.trim();
const url = getVal('NEXT_PUBLIC_FRAPPE_URL');
const key = getVal('FRAPPE_API_KEY');
const sec = getVal('FRAPPE_API_SECRET');
const headers = { 'Authorization': `token ${key}:${sec}`, 'Content-Type': 'application/json' };

async function check() {
  const cust = 'BAKI ANAS';
  const soRes = await fetch(`${url}/api/resource/Sales Order?filters=[["customer","=","${cust}"]]&fields=["name","grand_total","docstatus"]`, { headers });
  console.log('SO by customer:', (await soRes.json()).data);

  const inv1Res = await fetch(`${url}/api/resource/Sales Invoice/ACC-SINV-2026-08895`, { headers });
  const inv1 = await inv1Res.json();
  console.log('Inv 1 sales order:', inv1.data?.items?.[0]?.sales_order);

  const payNames = [
    'ACC-PAY-2026-05402',
    'ACC-PAY-2026-07234',
    'ACC-PAY-2026-07235',
    'ACC-PAY-2026-07325',
    'ACC-PAY-2026-07326',
    'ACC-PAY-2026-08341'
  ];
  for (const name of payNames) {
    const res = await fetch(`${url}/api/resource/Payment Entry/${name}`, { headers });
    const p = (await res.json()).data;
    console.log(p.name, p.posting_date, p.paid_amount, p.mode_of_payment, p.reference_no, p.paid_to);
    console.log('  Refs:', p.references?.map(r => ({ invoice: r.reference_name, allocated: r.allocated_amount })));
  }
}
check();
