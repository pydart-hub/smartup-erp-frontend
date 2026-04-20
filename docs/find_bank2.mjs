const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function q(url) {
  const r = await fetch(BASE + url, { headers: { Authorization: AUTH } });
  const j = await r.json();
  return j.data;
}

async function main() {
  const [co, ba] = await Promise.all([
    q('/api/resource/Company?fields=["name"]&limit=20'),
    q('/api/resource/Bank Account?fields=["name","bank","account","company","bank_account_no"]&limit=30'),
  ]);
  console.log('=== COMPANIES ===');
  console.log(JSON.stringify(co, null, 2));
  console.log('\n=== BANK ACCOUNTS ===');
  console.log(JSON.stringify(ba, null, 2));

  // All bank transactions Apr 1-20 any company
  const bt = await q('/api/resource/Bank Transaction?filters=[["date",">=","2026-04-01"],["date","<=","2026-04-20"],["deposit",">=","8000"]]&fields=["name","date","deposit","description","bank_account","status","company"]&limit=20');
  console.log('\n=== BANK TXN deposit>=8000 Apr 1-20 ===');
  console.log(JSON.stringify(bt, null, 2));

  // Payment entries Apr 1-20 for any customer ~8300
  const pe = await q('/api/resource/Payment Entry?filters=[["posting_date",">=","2026-04-01"],["posting_date","<=","2026-04-20"],["paid_amount",">=","8000"],["paid_amount","<=","8500"],["payment_type","=","Receive"]]&fields=["name","posting_date","party","paid_amount","mode_of_payment","reference_no","docstatus"]&limit=20');
  console.log('\n=== PAYMENT ENTRIES Receive ~8300 Apr 1-20 ===');
  console.log(JSON.stringify(pe, null, 2));
}

main().catch(console.error);
