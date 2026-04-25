const FRAPPE_URL = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const headers = { Authorization: AUTH };

async function query() {
  // 1. Mode of Payment options
  const mopRes = await fetch(
    `${FRAPPE_URL}/api/resource/Mode of Payment?fields=["name"]&limit_page_length=100`,
    { headers }
  );
  const mops = await mopRes.json();
  console.log('=== Mode of Payment options ===');
  console.log(JSON.stringify(mops.data, null, 2));

  // 2. Bank/Cash accounts (non-group)
  const accRes = await fetch(
    `${FRAPPE_URL}/api/resource/Account?filters=[["account_type","in",["Bank","Cash"]],["is_group","=",0]]&fields=["name","account_type","company","account_name"]&limit_page_length=500`,
    { headers }
  );
  const accs = await accRes.json();
  console.log('\n=== Bank/Cash Accounts ===');
  console.log(JSON.stringify(accs.data, null, 2));

  // 3. All companies
  const compRes = await fetch(
    `${FRAPPE_URL}/api/resource/Company?fields=["name","abbr"]&limit_page_length=100`,
    { headers }
  );
  const comps = await compRes.json();
  console.log('\n=== Companies ===');
  console.log(JSON.stringify(comps.data, null, 2));
}
query().catch(console.error);
   