const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL || 'https://smartup.m.frappe.cloud';
const API_KEY = process.env.FRAPPE_API_KEY || '03330270e330d49';
const API_SECRET = process.env.FRAPPE_API_SECRET || '9c2261ae11ac2d2';

async function testExams() {
  const headers = { Authorization: `token ${API_KEY}:${API_SECRET}`, Accept: 'application/json' };

  // 1. Check Assessment Groups
  const groupRes = await fetch(`${FRAPPE_URL}/api/resource/Assessment Group?limit_page_length=50`, { headers });
  const groups = await groupRes.json();
  console.log('Assessment Groups:', groups.data?.map(g => g.name));

  // 2. Check Assessment Plans
  const plansRes = await fetch(`${FRAPPE_URL}/api/resource/Assessment Plan?fields=${encodeURIComponent(JSON.stringify(['name', 'assessment_name', 'assessment_group', 'student_group', 'course', 'maximum_assessment_score']))}&limit_page_length=100`, { headers });
  const plans = await plansRes.json();
  console.log('Sample Assessment Plans count:', plans.data?.length);
  console.log('Sample Assessment Plans:', plans.data?.slice(0, 5));

  // 3. Check Assessment Results
  const resRes = await fetch(`${FRAPPE_URL}/api/resource/Assessment Result?fields=${encodeURIComponent(JSON.stringify(['name', 'student', 'student_name', 'assessment_plan', 'total_score', 'maximum_score']))}&limit_page_length=20`, { headers });
  const results = await resRes.json();
  console.log('Sample Assessment Results:', results.data?.slice(0, 5));
}

testExams();
