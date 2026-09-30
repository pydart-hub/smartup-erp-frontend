const url = process.env.NEXT_PUBLIC_FRAPPE_URL || 'https://smartup.m.frappe.cloud';
const key = process.env.FRAPPE_API_KEY || '03330270e330d49';
const sec = process.env.FRAPPE_API_SECRET || '9c2261ae11ac2d2';

async function check() {
  // 1. Fetch CWC Assessment Plans
  const pRes = await fetch(`${url}/api/resource/Assessment%20Plan?filters=${encodeURIComponent(JSON.stringify([
    ['docstatus', '=', 1],
    ['assessment_group', 'like', '%CWC%']
  ]))}&fields=["name","assessment_group","assessment_name","student_group","course","maximum_assessment_score"]&limit_page_length=500`, {
    headers: { Authorization: `token ${key}:${sec}` }
  });
  const plans = (await pRes.json()).data || [];
  console.log(`Found ${plans.length} CWC assessment plans`);

  if (plans.length === 0) {
    // Check if plans have CWC in assessment_name instead
    const pRes2 = await fetch(`${url}/api/resource/Assessment%20Plan?filters=${encodeURIComponent(JSON.stringify([
      ['docstatus', '=', 1],
      ['assessment_name', 'like', '%CWC%']
    ]))}&fields=["name","assessment_group","assessment_name","student_group","course","maximum_assessment_score"]&limit_page_length=500`, {
      headers: { Authorization: `token ${key}:${sec}` }
    });
    const plans2 = (await pRes2.json()).data || [];
    console.log(`Found ${plans2.length} plans with CWC in assessment_name`);
  }

  // 2. Fetch sample Assessment Results for CWC
  const planNames = plans.map(p => p.name).slice(0, 50);
  if (planNames.length > 0) {
    const rRes = await fetch(`${url}/api/resource/Assessment%20Result?filters=${encodeURIComponent(JSON.stringify([
      ['docstatus', '=', 1],
      ['assessment_plan', 'in', planNames]
    ]))}&fields=["name","student","student_name","assessment_plan","total_score","maximum_score"]&limit_page_length=100`, {
      headers: { Authorization: `token ${key}:${sec}` }
    });
    const results = (await rRes.json()).data || [];
    console.log(`Found ${results.length} assessment results for these CWC plans`);
    console.log('Top 3 results:', results.slice(0, 3));
  }
}
check();
