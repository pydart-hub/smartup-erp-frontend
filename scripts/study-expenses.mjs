const url = process.env.NEXT_PUBLIC_FRAPPE_URL || 'https://smartup.m.frappe.cloud';
const key = process.env.FRAPPE_API_KEY || '03330270e330d49';
const sec = process.env.FRAPPE_API_SECRET || '9c2261ae11ac2d2';

async function check() {
  const accRes = await fetch(`${url}/api/resource/Account?filters=${encodeURIComponent(JSON.stringify([
    ['root_type', '=', 'Expense'],
    ['is_group', '=', 0]
  ]))}&fields=["name","account_name","company"]&limit_page_length=0`, {
    headers: { Authorization: `token ${key}:${sec}` }
  });
  const accJson = await accRes.json();
  const expAccounts = new Set((accJson.data || []).map(a => a.name));

  const glRes = await fetch(`${url}/api/resource/GL%20Entry?filters=${encodeURIComponent(JSON.stringify([
    ['is_cancelled', '=', 0],
    ['debit', '>', 0],
    ['posting_date', '>=', '2026-09-29'],
    ['posting_date', '<=', '2026-09-29']
  ]))}&fields=["name","account","debit","company","remarks","voucher_no"]&limit_page_length=0`, {
    headers: { Authorization: `token ${key}:${sec}` }
  });
  const glJson = await glRes.json();
  const expEntries = (glJson.data || []).filter(e => expAccounts.has(e.account));
  const total = expEntries.reduce((s, e) => s + e.debit, 0);
  console.log('Expense entries count:', expEntries.length, 'Total expense 2026-09-29:', total);
  console.log(expEntries.slice(0, 5));
}
check();
