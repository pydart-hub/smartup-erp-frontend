const key = '03330270e330d49';
const secret = '9c2261ae11ac2d2';
const base = 'https://smartup.m.frappe.cloud';
const headers = { Authorization: `token ${key}:${secret}` };

async function get(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${base}${path}${qs ? '?' + qs : ''}`;
  const r = await fetch(url, { headers });
  return r.json();
}

// 1. Get unique expense accounts from GL Entry
console.log('\n=== Expense Accounts from GL Entry ===');
const glData = await get('/api/resource/GL Entry', {
  filters: JSON.stringify([['GL Entry', 'account', 'like', '%Expense%']]),
  fields: JSON.stringify(['account', 'account_currency']),
  limit_page_length: '200',
  group_by: 'account',
  order_by: 'account asc'
});
const accounts = [...new Set((glData.data || []).map(r => r.account))];
console.log('Expense accounts:', JSON.stringify(accounts, null, 2));

// 2. Get total actual expense per account
console.log('\n=== Total actual per top expense account ===');
const glSums = await get('/api/resource/GL Entry', {
  filters: JSON.stringify([
    ['GL Entry', 'account', 'like', '%Maintenance Expense%']
  ]),
  fields: JSON.stringify(['account', 'debit', 'credit', 'posting_date', 'company', 'voucher_no']),
  limit_page_length: '20',
  order_by: 'posting_date desc'
});
console.log('Maintenance entries:', JSON.stringify(glSums.data?.slice(0,5), null, 2));

// 3. Check Account chart for expense head groups
console.log('\n=== Account Groups (Expense) ===');
const accGroups = await get('/api/resource/Account', {
  filters: JSON.stringify([
    ['Account', 'root_type', '=', 'Expense'],
    ['Account', 'is_group', '=', '1']
  ]),
  fields: JSON.stringify(['name', 'account_name', 'parent_account', 'root_type']),
  limit_page_length: '50',
  order_by: 'lft asc'
});
console.log('Expense groups:', JSON.stringify(accGroups.data, null, 2));

// 4. Check Fiscal Year
console.log('\n=== Fiscal Years ===');
const fy = await get('/api/resource/Fiscal Year', {
  fields: JSON.stringify(['name', 'year_start_date', 'year_end_date']),
  limit_page_length: '5'
});
console.log('Fiscal years:', JSON.stringify(fy.data, null, 2));

// 5. Check if there are Cost Centers
console.log('\n=== Cost Centers ===');
const cc = await get('/api/resource/Cost Center', {
  fields: JSON.stringify(['name', 'cost_center_name', 'parent_cost_center', 'company']),
  limit_page_length: '20'
});
console.log('Cost centers:', JSON.stringify(cc.data, null, 2));
