const FRAPPE_URL = 'https://smartup.m.frappe.cloud';
const API_KEY = '03330270e330d49';
const API_SECRET = '9c2261ae11ac2d2';

async function check() {
  const headers = { Authorization: `token ${API_KEY}:${API_SECRET}` };
  const countRes = await fetch(`${FRAPPE_URL}/api/resource/Assessment Plan?fields=${encodeURIComponent(JSON.stringify(['count(name) as total']))}&limit_page_length=1`, { headers });
  console.log('Total Assessment Plans:', await countRes.json());

  const cwcRes = await fetch(`${FRAPPE_URL}/api/resource/Assessment Plan?filters=${encodeURIComponent(JSON.stringify([['assessment_group', 'like', '%CWC%']]))}&fields=${encodeURIComponent(JSON.stringify(['count(name) as total']))}&limit_page_length=1`, { headers });
  console.log('Total CWC Plans:', await cwcRes.json());
}
check();
