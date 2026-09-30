const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL || 'https://smartup.m.frappe.cloud';
const API_KEY = process.env.FRAPPE_API_KEY || '03330270e330d49';
const API_SECRET = process.env.FRAPPE_API_SECRET || '9c2261ae11ac2d2';

async function test() {
  const headers = { Authorization: `token ${API_KEY}:${API_SECRET}`, Accept: 'application/json' };
  
  // 1. discontinued customers
  const discFilters = [['enabled', '=', 0], ['custom_discontinuation_date', 'is', 'set']];
  const discRes = await fetch(`${FRAPPE_URL}/api/resource/Student?filters=${encodeURIComponent(JSON.stringify(discFilters))}&fields=${encodeURIComponent(JSON.stringify(['customer']))}&limit_page_length=500`, { headers });
  const discData = await discRes.json();
  const discCustomers = (discData.data || []).map(s => s.customer).filter(Boolean);
  console.log('Discontinued count:', discCustomers.length);

  const todayStr = '2026-09-30';
  const invFilters = [
    ['docstatus', '=', 1],
    ['outstanding_amount', '>', 0],
    ['due_date', '<=', todayStr],
  ];
  if (discCustomers.length > 0) {
    invFilters.push(['customer', 'not in', discCustomers]);
  }

  // Branch breakdown
  const branchRes = await fetch(`${FRAPPE_URL}/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify(invFilters))}&fields=${encodeURIComponent(JSON.stringify(['company', 'sum(outstanding_amount) as total_dues', 'count(name) as invoice_count', 'count(distinct customer) as student_count']))}&group_by=company&order_by=${encodeURIComponent('total_dues desc')}&limit_page_length=100`, { headers });
  const branchData = await branchRes.json();
  console.log('Branch Overdue Data:', JSON.stringify(branchData.data, null, 2));

  // Total
  const totalRes = await fetch(`${FRAPPE_URL}/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify(invFilters))}&fields=${encodeURIComponent(JSON.stringify(['sum(outstanding_amount) as total_dues', 'count(name) as invoice_count', 'count(distinct customer) as student_count']))}&limit_page_length=1`, { headers });
  const totalData = await totalRes.json();
  console.log('Total Overdue Data:', JSON.stringify(totalData.data, null, 2));
}

test();
