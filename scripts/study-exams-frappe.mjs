const url = process.env.NEXT_PUBLIC_FRAPPE_URL || 'https://smartup.m.frappe.cloud';
const key = process.env.FRAPPE_API_KEY || '03330270e330d49';
const sec = process.env.FRAPPE_API_SECRET || '9c2261ae11ac2d2';

async function check() {
  const r = await fetch(`${url}/api/resource/Assessment%20Plan?limit_page_length=50&fields=["name","assessment_group","assessment_name","student_group","course"]&order_by=creation desc`, {
    headers: { Authorization: `token ${key}:${sec}` }
  });
  const d = await r.json();
  const plans = d.data || [];
  console.log(`Found ${plans.length} recent plans.`);
  
  const cwcPlans = plans.filter(p => (p.assessment_group || '').toLowerCase().includes('cwc') || (p.assessment_name || '').toLowerCase().includes('cwc'));
  console.log(`Found ${cwcPlans.length} CWC plans:`, cwcPlans.slice(0, 5));

  // Check Assessment Result
  const rRes = await fetch(`${url}/api/resource/Assessment%20Result?limit_page_length=10&fields=["name","student","student_name","assessment_plan","total_score","maximum_score","docstatus"]&order_by=creation desc`, {
    headers: { Authorization: `token ${key}:${sec}` }
  });
  const dRes = await rRes.json();
  console.log('Sample Assessment Results:', dRes.data);
}
check();
