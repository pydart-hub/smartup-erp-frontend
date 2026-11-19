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

async function checkModes() {
  const pes = await fetchJSON(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","Aaron Thomas"]]&fields=["name","docstatus","posting_date","paid_amount","mode_of_payment","paid_to","reference_no"]&order_by=posting_date asc`);
  console.table(pes.data);
}

checkModes().catch(console.error);
