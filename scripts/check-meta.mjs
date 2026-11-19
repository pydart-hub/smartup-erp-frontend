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

async function checkDoctypeMeta() {
  const meta = await fetchJSON(`${baseUrl}/api/resource/DocType/Payment Entry`);
  const refField = meta.data?.fields?.find(f => f.fieldname === 'references');
  console.log('Payment Entry references field:', {
    fieldname: refField?.fieldname,
    fieldtype: refField?.fieldtype,
    allow_on_submit: refField?.allow_on_submit
  });
}

checkDoctypeMeta().catch(console.error);
