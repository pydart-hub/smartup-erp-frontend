const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function checkDocType() {
  const metaRes = await fetch(`${baseUrl}/api/resource/DocType/Program%20Enrollment`, { headers });
  const meta = (await metaRes.json()).data || {};
  console.log("autoname:", meta.autoname);
  console.log("naming_rule:", meta.naming_rule);
}

checkDocType();
