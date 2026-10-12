const base = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';
const headers = { 'Authorization': `token ${apiKey}:${apiSecret}` };

async function run() {
  // 1. Check curriculum dept dashboard query for plans
  const p1Res = await fetch(`${base}/api/resource/Assessment Plan?fields=["name","custom_branch"]&filters=[["docstatus","=",1]]&limit_page_length=1000`, { headers });
  const p1 = await p1Res.json();
  console.log('Curriculum Dept Dashboard allPlans length:', p1.data?.length);

  // 2. Check total plans count in Frappe
  const pCountRes = await fetch(`${base}/api/method/frappe.client.get_count?doctype=Assessment Plan&filters=[["docstatus","=",1]]`, { headers });
  const pCount = await pCountRes.json();
  console.log('Total Assessment Plans (docstatus=1) in Frappe:', pCount.message);

  // 3. Check curriculum dept dashboard query for entered plans
  const r1Res = await fetch(`${base}/api/resource/Assessment Result?fields=["assessment_plan"]&filters=[["docstatus","=",1]]&group_by=assessment_plan&limit_page_length=1000`, { headers });
  const r1 = await r1Res.json();
  console.log('Curriculum Dept Dashboard enteredPlans length:', r1.data?.length);

  // 4. Check marks-entry page query for entered plans
  const r2Res = await fetch(`${base}/api/resource/Assessment Result?fields=["distinct assessment_plan"]&filters=[["docstatus","!=",2]]&limit_page_length=0`, { headers });
  const r2 = await r2Res.json();
  console.log('Marks Entry Page enteredPlans length:', r2.data?.length);

  // 5. Check total distinct assessment_plan in Assessment Result
  const rCountRes = await fetch(`${base}/api/method/frappe.client.get_count?doctype=Assessment Result&filters=[["docstatus","!=",2]]`, { headers });
  const rCount = await rCountRes.json();
  console.log('Total Assessment Results in Frappe:', rCount.message);

  // Let's also check paginated plans in marks-entry page
  let plansMarksEntry = [];
  let start = 0;
  let hasMore = true;
  while (hasMore) {
    const res = await fetch(`${base}/api/resource/Assessment Plan?fields=["name","student_group","assessment_name","course","schedule_date","maximum_assessment_score","custom_branch","assessment_group"]&filters=[["docstatus","=",1]]&order_by=schedule_date desc&limit_start=${start}&limit_page_length=1000`, { headers }).then(r => r.json());
    const items = res.data ?? [];
    plansMarksEntry.push(...items);
    if (items.length < 1000 || plansMarksEntry.length >= 5000) {
      hasMore = false;
    } else {
      start += 1000;
    }
  }
  console.log('Marks Entry Page allExams fetched (paginated):', plansMarksEntry.length);

  const r2Set = new Set(r2.data?.map(r => r.assessment_plan).filter(Boolean));
  console.log('r2 distinct set size:', r2Set.size);

  const pendingInMarksEntry = plansMarksEntry.filter(e => !r2Set.has(e.name));
  const completedInMarksEntry = plansMarksEntry.filter(e => r2Set.has(e.name));
  console.log('Marks Entry pending count:', pendingInMarksEntry.length);
  console.log('Marks Entry completed count:', completedInMarksEntry.length);

  const r1Set = new Set(r1.data?.map(r => r.assessment_plan).filter(Boolean));
  const pendingInDashboard = p1.data?.filter(p => !r1Set.has(p.name)).length;
  console.log('Curriculum Dept Dashboard pending count:', pendingInDashboard);
  console.log('Curriculum Dept Dashboard completed count:', r1Set.size);
}

run().catch(console.error);
