const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function testFS() {
  const res = await fetch(`${baseUrl}/api/resource/Fee%20Structure?limit_page_length=20`, { headers });
  const data = await res.json();
  console.log("Raw Fee Structure list:", data);
}

testFS();
