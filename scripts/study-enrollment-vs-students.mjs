const url = process.env.NEXT_PUBLIC_FRAPPE_URL || 'https://smartup.m.frappe.cloud';
const key = process.env.FRAPPE_API_KEY || '03330270e330d49';
const sec = process.env.FRAPPE_API_SECRET || '9c2261ae11ac2d2';

async function check() {
  const r = await fetch(`${url}/api/resource/Program%20Enrollment?limit_page_length=5&fields=["*"]`, {
    headers: { Authorization: `token ${key}:${sec}` }
  });
  const d = await r.json();
  console.log('Program Enrollment sample:', d.data?.[0]);

  // Check how many students, active vs discontinued, and how students are counted in smartup ERP
  const rStd = await fetch(`${url}/api/resource/Student?limit_page_length=10&fields=["name","student_name","custom_branch","enabled","custom_discontinuation_reason"]`, {
    headers: { Authorization: `token ${key}:${sec}` }
  });
  const dStd = await rStd.json();
  console.log('Student samples:', dStd.data);
}
check();
