const base = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';
const headers = { 'Authorization': `token ${apiKey}:${apiSecret}` };

async function check() {
  const rGroup0 = await fetch(`${base}/api/resource/Assessment Result?fields=["assessment_plan"]&filters=[["docstatus","=",1]]&group_by=assessment_plan&limit_page_length=0`, { headers }).then(r => r.json());
  console.log('group_by with limit_page_length 0 count:', rGroup0.data?.length);

  const rDistinct0 = await fetch(`${base}/api/resource/Assessment Result?fields=["distinct assessment_plan"]&filters=[["docstatus","=",1]]&limit_page_length=0`, { headers }).then(r => r.json());
  console.log('distinct with limit_page_length 0 count:', rDistinct0.data?.length);
}
check().catch(console.error);
