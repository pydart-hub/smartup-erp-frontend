const base = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';
const headers = { 'Authorization': `token ${apiKey}:${apiSecret}` };

async function run() {
  // Check Assessment Result with docstatus = 1 vs docstatus != 2
  const rDocstatus1 = await fetch(`${base}/api/resource/Assessment Result?fields=["distinct assessment_plan"]&filters=[["docstatus","=",1]]&limit_page_length=0`, { headers }).then(r => r.json());
  console.log('Assessment Results (docstatus = 1) distinct plans:', rDocstatus1.data?.length);

  const rDocstatusNot2 = await fetch(`${base}/api/resource/Assessment Result?fields=["distinct assessment_plan"]&filters=[["docstatus","!=",2]]&limit_page_length=0`, { headers }).then(r => r.json());
  console.log('Assessment Results (docstatus != 2) distinct plans:', rDocstatusNot2.data?.length);

  // Check draft results (docstatus = 0)
  const rDraft = await fetch(`${base}/api/resource/Assessment Result?fields=["distinct assessment_plan"]&filters=[["docstatus","=",0]]&limit_page_length=0`, { headers }).then(r => r.json());
  console.log('Assessment Results (docstatus = 0 / Draft) distinct plans:', rDraft.data?.length);
}

run().catch(console.error);
