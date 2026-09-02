const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function inspectExistingPE() {
  const peName = 'PEN-10th-Chullickal 26-27-200';
  const res = await fetch(`${baseUrl}/api/resource/Program%20Enrollment/${encodeURIComponent(peName)}`, { headers });
  const data = await res.json();
  console.log("Existing PE Data:", JSON.stringify(data, null, 2));
}

inspectExistingPE();
