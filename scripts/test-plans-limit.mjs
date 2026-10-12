const base = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';
const headers = { 'Authorization': `token ${apiKey}:${apiSecret}` };

async function checkPlans0() {
  const p0 = await fetch(`${base}/api/resource/Assessment Plan?fields=["name","custom_branch"]&filters=[["docstatus","=",1]]&limit_page_length=0`, { headers }).then(r => r.json());
  console.log('Assessment Plan limit_page_length 0 count:', p0.data?.length);
}
checkPlans0().catch(console.error);
