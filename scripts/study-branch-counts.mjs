const base = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';
const headers = { 'Authorization': `token ${apiKey}:${apiSecret}` };

async function checkBranchDistribution() {
  const p = await fetch(`${base}/api/resource/Assessment Plan?fields=["name","custom_branch"]&filters=[["docstatus","=",1]]&limit_page_length=0`, { headers }).then(r => r.json());
  const r = await fetch(`${base}/api/resource/Assessment Result?fields=["distinct assessment_plan"]&filters=[["docstatus","!=",2]]&limit_page_length=0`, { headers }).then(r => r.json());
  
  const enteredSet = new Set(r.data?.map(x => x.assessment_plan).filter(Boolean));
  const countsByBranch = {};
  p.data.forEach(item => {
    const b = item.custom_branch || 'Unassigned';
    if (!countsByBranch[b]) countsByBranch[b] = { total: 0, entered: 0, pending: 0 };
    countsByBranch[b].total++;
    if (enteredSet.has(item.name)) {
      countsByBranch[b].entered++;
    } else {
      countsByBranch[b].pending++;
    }
  });
  console.log(JSON.stringify(countsByBranch, null, 2));
}

checkBranchDistribution().catch(console.error);
