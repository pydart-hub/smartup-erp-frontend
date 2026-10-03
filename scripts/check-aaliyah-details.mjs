import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const getVal = (k) => lines.find(l => l.startsWith(k))?.split('=')[1]?.trim();
const url = getVal('NEXT_PUBLIC_FRAPPE_URL');
const key = getVal('FRAPPE_API_KEY');
const sec = getVal('FRAPPE_API_SECRET');
const headers = { 'Authorization': `token ${key}:${sec}`, 'Content-Type': 'application/json' };

async function run() {
  const cust = 'AALIYAH ZAHARA FASIK - 1';

  const soRes = await fetch(`${url}/api/resource/Sales Order/SAL-ORD-2026-01158`, { headers });
  console.log('SO:', (await soRes.json()).data);

  const invRes = await fetch(`${url}/api/resource/Sales Invoice?filters=[["customer","=","${cust}"],["docstatus","!=",2]]&fields=["name","grand_total","outstanding_amount","due_date","posting_date","docstatus"]&order_by=due_date asc`, { headers });
  console.log('INVOICES:', (await invRes.json()).data);

  const payRes = await fetch(`${url}/api/resource/Payment Entry?filters=[["party","in",["${cust}","AALIYAH ZAHARA FASIK"]],["docstatus","!=",2]]&fields=["name","paid_amount","posting_date","mode_of_payment","reference_no","reference_date","paid_to","docstatus"]`, { headers });
  console.log('PAYMENTS:', (await payRes.json()).data);
}
run();
