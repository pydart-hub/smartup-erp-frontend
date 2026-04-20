const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function q(url) {
  const r = await fetch(BASE + url, { headers: { Authorization: AUTH } });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${url}: ${JSON.stringify(j)}`);
  return j.data;
}

async function main() {
  // 1. All Moolamkuzhi bank accounts
  const ba = await q('/api/resource/Bank Account?filters=[["company","=","Smart Up Moolamkuzhi"]]&fields=["name","bank","account","is_default","bank_account_no"]&limit=20');
  console.log('=== BANK ACCOUNTS (Moolamkuzhi) ===');
  console.log(JSON.stringify(ba, null, 2));

  // 2. Unreconciled bank transactions Apr 1-20
  const bt = await q('/api/resource/Bank Transaction?filters=[["date",">=","2026-04-01"],["date","<=","2026-04-20"],["status","!=","Reconciled"],["company","=","Smart Up Moolamkuzhi"]]&fields=["name","date","deposit","withdrawal","description","bank_account","status","unallocated_amount"]&order_by=date desc&limit=50');
  console.log('\n=== UNRECONCILED BANK TRANSACTIONS (Apr 1-20, MMK) ===');
  console.log(JSON.stringify(bt, null, 2));

  // 3. All bank transactions Apr 1-20 with deposit ~8300
  const bt2 = await q('/api/resource/Bank Transaction?filters=[["date",">=","2026-04-01"],["date","<=","2026-04-20"],["deposit",">=","8000"],["deposit","<=","8500"]]&fields=["name","date","deposit","description","bank_account","status","company"]&limit=20');
  console.log('\n=== BANK TRANSACTIONS deposit 8000-8500 (Apr 1-20) ===');
  console.log(JSON.stringify(bt2, null, 2));
}

main().catch(console.error);
