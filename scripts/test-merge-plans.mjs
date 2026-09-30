const FRAPPE_URL = 'https://smartup.m.frappe.cloud';
const API_KEY = '03330270e330d49';
const API_SECRET = '9c2261ae11ac2d2';

async function testMerge() {
  const headers = { Authorization: `token ${API_KEY}:${API_SECRET}` };

  const [cwcRes, allRes, resultsRes] = await Promise.all([
    fetch(`${FRAPPE_URL}/api/resource/Assessment Plan?filters=${encodeURIComponent(JSON.stringify([['assessment_group', 'like', '%CWC%']]))}&fields=${encodeURIComponent(JSON.stringify(['name', 'assessment_name', 'assessment_group', 'student_group', 'course', 'maximum_assessment_score']))}&limit_page_length=500`, { headers }),
    fetch(`${FRAPPE_URL}/api/resource/Assessment Plan?fields=${encodeURIComponent(JSON.stringify(['name', 'assessment_name', 'assessment_group', 'student_group', 'course', 'maximum_assessment_score']))}&limit_page_length=1000`, { headers }),
    fetch(`${FRAPPE_URL}/api/resource/Assessment Result?fields=${encodeURIComponent(JSON.stringify(['name', 'student', 'student_name', 'assessment_plan', 'total_score', 'maximum_score']))}&limit_page_length=2000`, { headers }),
  ]);

  const cwcPlans = (await cwcRes.json()).data || [];
  const allPlans = (await allRes.json()).data || [];
  const results = (await resultsRes.json()).data || [];

  const planMap = new Map();
  for (const p of allPlans) planMap.set(String(p.name), p);
  for (const p of cwcPlans) planMap.set(String(p.name), p);

  console.log(`CWC plans: ${cwcPlans.length}, Total mapped: ${planMap.size}, Results: ${results.length}`);

  let cwcResultsCount = 0;
  for (const r of results) {
    const plan = planMap.get(r.assessment_plan);
    if (plan?.assessment_group?.includes('CWC')) {
      cwcResultsCount++;
    }
  }
  console.log(`CWC results matched: ${cwcResultsCount}`);
}

testMerge();
