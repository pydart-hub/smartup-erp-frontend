import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const getVal = (k) => lines.find(l => l.startsWith(k))?.split('=')[1]?.trim();
const baseUrl = getVal('NEXT_PUBLIC_FRAPPE_URL');
const key = getVal('FRAPPE_API_KEY');
const sec = getVal('FRAPPE_API_SECRET');
const headers = { 'Authorization': `token ${key}:${sec}`, 'Content-Type': 'application/json' };

async function fetchJSON(url) {
  const res = await fetch(url, { headers });
  return res.json();
}

async function detailedCheck() {
  const peCancelled = await fetchJSON(`${baseUrl}/api/resource/Payment Entry/ACC-PAY-2026-11342`);
  const peActive = await fetchJSON(`${baseUrl}/api/resource/Payment Entry/ACC-PAY-2026-11367`);

  console.log('=== CANCELLED PE (ACC-PAY-2026-11342) ===');
  console.log(JSON.stringify(peCancelled.data, null, 2));

  console.log('\n=== ACTIVE PE (ACC-PAY-2026-11367) ===');
  console.log(JSON.stringify(peActive.data, null, 2));

  const invNov = await fetchJSON(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-11051`);
  const invDec = await fetchJSON(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-11052`);

  console.log('\n=== NOV INVOICE (ACC-SINV-2026-11051) ===');
  console.log({
    name: invNov.data.name,
    due_date: invNov.data.due_date,
    grand_total: invNov.data.grand_total,
    outstanding_amount: invNov.data.outstanding_amount,
    status: invNov.data.status,
    docstatus: invNov.data.docstatus
  });

  console.log('\n=== DEC INVOICE (ACC-SINV-2026-11052) ===');
  console.log({
    name: invDec.data.name,
    due_date: invDec.data.due_date,
    grand_total: invDec.data.grand_total,
    outstanding_amount: invDec.data.outstanding_amount,
    status: invDec.data.status,
    docstatus: invDec.data.docstatus
  });
}

detailedCheck().catch(console.error);
