const url = process.env.NEXT_PUBLIC_FRAPPE_URL || 'https://smartup.m.frappe.cloud';
const key = process.env.FRAPPE_API_KEY || '03330270e330d49';
const sec = process.env.FRAPPE_API_SECRET || '9c2261ae11ac2d2';

async function testAll() {
  console.log("=== 1. Test Daily Collections ===");
  const peRes = await fetch(`${url}/api/resource/Payment%20Entry?filters=${encodeURIComponent(JSON.stringify([
    ['docstatus', '=', 1],
    ['payment_type', '=', 'Receive'],
    ['posting_date', '>=', '2026-09-29'],
    ['posting_date', '<=', '2026-09-29']
  ]))}&fields=["name","party","party_name","company","paid_amount","mode_of_payment","reference_no"]&limit_page_length=0`, {
    headers: { Authorization: `token ${key}:${sec}` }
  });
  const peData = (await peRes.json()).data || [];
  const peTotal = peData.reduce((s, p) => s + p.paid_amount, 0);
  console.log(`2026-09-29 Collections: ₹${peTotal} across ${peData.length} payments.`);

  console.log("\n=== 2. Test Expenses ===");
  const accRes = await fetch(`${url}/api/resource/Account?filters=${encodeURIComponent(JSON.stringify([
    ['root_type', '=', 'Expense'],
    ['is_group', '=', 0]
  ]))}&fields=["name","account_name","company"]&limit_page_length=0`, {
    headers: { Authorization: `token ${key}:${sec}` }
  });
  const expAccounts = new Set(((await accRes.json()).data || []).map(a => a.name));

  const glRes = await fetch(`${url}/api/resource/GL%20Entry?filters=${encodeURIComponent(JSON.stringify([
    ['is_cancelled', '=', 0],
    ['debit', '>', 0],
    ['posting_date', '>=', '2026-09-29'],
    ['posting_date', '<=', '2026-09-29']
  ]))}&fields=["name","account","debit","company","remarks","voucher_no"]&limit_page_length=0`, {
    headers: { Authorization: `token ${key}:${sec}` }
  });
  const glData = ((await glRes.json()).data || []).filter(e => expAccounts.has(e.account));
  const glTotal = glData.reduce((s, e) => s + e.debit, 0);
  console.log(`2026-09-29 Expenses: ₹${glTotal} across ${glData.length} entries.`);

  console.log("\n=== 3. Test CWC Exam Toppers ===");
  // Fetch CWC plans
  const planRes = await fetch(`${url}/api/resource/Assessment%20Plan?filters=${encodeURIComponent(JSON.stringify([
    ['docstatus', '=', 1],
    ['assessment_group', 'like', '%CWC%']
  ]))}&fields=["name","assessment_group","assessment_name","student_group","course","maximum_assessment_score"]&limit_page_length=200`, {
    headers: { Authorization: `token ${key}:${sec}` }
  });
  const plans = (await planRes.json()).data || [];
  console.log(`Found ${plans.length} CWC plans.`);

  // Get results for some CWC plans
  const pNames = plans.map(p => p.name).slice(0, 30);
  const resRes = await fetch(`${url}/api/resource/Assessment%20Result?filters=${encodeURIComponent(JSON.stringify([
    ['docstatus', '=', 1],
    ['assessment_plan', 'in', pNames]
  ]))}&fields=["name","student","student_name","assessment_plan","total_score","maximum_score"]&limit_page_length=300`, {
    headers: { Authorization: `token ${key}:${sec}` }
  });
  const results = (await resRes.json()).data || [];
  console.log(`Found ${results.length} CWC results.`);
  
  // Calculate percentage
  const scored = results.map(r => ({
    ...r,
    pct: r.maximum_score > 0 ? (r.total_score / r.maximum_score) * 100 : 0
  })).sort((a, b) => b.pct - a.pct);
  console.log('Top 3 CWC scorers:', scored.slice(0, 3));
}
testAll();
