const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const HEADERS = { 'Content-Type': 'application/json', Authorization: AUTH };

async function fGet(path) {
  const r = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (!r.ok) throw new Error(`GET ${path}: ${r.status} ${await r.text()}`);
  return (await r.json()).data;
}

async function fPost(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`POST ${path}: ${r.status} ${await r.text()}`);
  return (await r.json()).data;
}

async function fPut(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'PUT', headers: HEADERS, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`PUT ${path}: ${r.status} ${await r.text()}`);
  return (await r.json()).data;
}

async function fDel(path) {
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: HEADERS });
  if (!r.ok) throw new Error(`DEL ${path}: ${r.status} ${await r.text()}`);
}

// 1. Check UPI mode of payment
const upi = await fGet('/api/resource/Mode of Payment/UPI');
console.log('=== UPI Mode of Payment ===');
console.log(JSON.stringify(upi, null, 2));

// 2. Check accounts for Smart Up Palluruthy
const accounts = await fGet('/api/resource/Account?filters=[["company","=","Smart Up Palluruthy"],["account_type","in","Cash,Bank"]]&fields=["name","account_type","account_number"]&limit=20');
console.log('\n=== Cash/Bank Accounts (Palluruthy) ===');
console.log(JSON.stringify(accounts, null, 2));

// 3. Delete the failed draft payment entry
console.log('\n=== Deleting failed Payment Entry ACC-PAY-2026-04841 ===');
try {
  await fDel('/api/resource/Payment Entry/ACC-PAY-2026-04841');
  console.log('Deleted draft PE');
} catch(e) {
  console.log('Could not delete (may already be gone):', e.message);
}
