const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
async function q(url) {
  const r = await fetch(BASE + url, { headers: { Authorization: AUTH } });
  return (await r.json()).data;
}

async function main() {
  // Find Cash accounts for Moolamkuzhi
  const acc = await q('/api/resource/Account?filters=[["company","=","Smart Up Moolamkuzhi"],["account_type","=","Cash"],["is_group","=","0"]]&fields=["name","account_name","account_type","parent_account"]&limit=10');
  console.log('=== CASH ACCOUNTS (MMK) ===');
  console.log(JSON.stringify(acc, null, 2));

  // Also check Mode of Payment accounts
  const mop = await q('/api/resource/Mode of Payment?fields=["name","type"]&limit=20');
  console.log('\n=== MODE OF PAYMENT ===');
  console.log(JSON.stringify(mop, null, 2));

  // Get Mode of Payment Account for Cash in Moolamkuzhi company
  const mopAcc = await q('/api/resource/Mode of Payment Account?filters=[["company","=","Smart Up Moolamkuzhi"]]&fields=["name","parent","default_account","company"]&limit=20');
  console.log('\n=== MODE OF PAYMENT ACCOUNTS (MMK) ===');
  console.log(JSON.stringify(mopAcc, null, 2));
}

main().catch(console.error);
