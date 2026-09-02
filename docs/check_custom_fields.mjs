const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function checkCustomField() {
  const res = await fetch(`${baseUrl}/api/resource/Custom%20Field?filters=[["dt","in",["Fee Structure","Program Enrollment"]],["fieldname","=","custom_no_of_instalments"]]&fields=["name","dt","fieldname","fieldtype","options"]`, { headers });
  const data = await res.json();
  console.log("Custom Fields for custom_no_of_instalments:", data);
}

checkCustomField();
