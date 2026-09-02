const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function inspectSingleFS() {
  const name = 'SU CHL-10th State-Basic-1';
  const res = await fetch(`${baseUrl}/api/resource/Fee%20Structure/${encodeURIComponent(name)}`, { headers });
  const data = await res.json();
  console.log("Sample Fee Structure doc (Basic-1):", JSON.stringify(data, null, 2));

  // Also check Basic-8
  const res8 = await fetch(`${baseUrl}/api/resource/Fee%20Structure/SU%20CHL-10th%20State-Basic-8`, { headers });
  const data8 = await res8.json();
  console.log("Sample Fee Structure doc (Basic-8):", JSON.stringify(data8, null, 2));
}

inspectSingleFS();
