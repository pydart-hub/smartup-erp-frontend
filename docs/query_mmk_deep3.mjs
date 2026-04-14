const base = 'https://smartup.m.frappe.cloud';
const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json' };
async function q(ep) { const r = await fetch(base + ep, { headers }); const j = await r.json(); return j.data || []; }

async function main() {
  // ===== 1. Student Groups with "Moolamkuzhi" =====
  console.log('=== STUDENT GROUPS: Moolamkuzhi ===');
  const sgMMK = await q('/api/resource/Student Group?filters=[["name","like","%Moolamkuzhi%"]]&fields=["name","program","batch","academic_year","max_strength","group_based_on"]&limit_page_length=200&order_by=name asc');
  console.log(`Total: ${sgMMK.length}`);
  sgMMK.forEach(g => console.log(`  ${g.name} | program=${g.program} | batch=${g.batch} | year=${g.academic_year}`));

  // ===== 2. Student Groups: Chullickal (reference) =====
  console.log('\n=== STUDENT GROUPS: Chullickal ===');
  const sgCHL = await q('/api/resource/Student Group?filters=[["name","like","%Chullickal%"]]&fields=["name","program","batch","academic_year","max_strength"]&limit_page_length=200&order_by=name asc');
  console.log(`Total: ${sgCHL.length}`);
  sgCHL.forEach(g => console.log(`  ${g.name} | program=${g.program} | batch=${g.batch} | year=${g.academic_year}`));

  // ===== 3. Get one Chullickal 8th State Student Group detail =====
  console.log('\n=== DETAIL: Chullickal-8th State-A ===');
  const sgDetail = await q(`/api/resource/Student Group/${encodeURIComponent('Chullickal-8th State-A')}`);
  console.log('group_based_on:', sgDetail.group_based_on);
  console.log('program:', sgDetail.program);
  console.log('batch:', sgDetail.batch);
  console.log('academic_year:', sgDetail.academic_year);
  console.log('academic_term:', sgDetail.academic_term);
  console.log('max_strength:', sgDetail.max_strength);
  console.log('disabled:', sgDetail.disabled);
  console.log('students count:', sgDetail.students?.length);
  console.log('instructors count:', sgDetail.instructors?.length);
  for (const [k, v] of Object.entries(sgDetail)) {
    if (k.startsWith('custom_')) console.log(`custom: ${k}=${v}`);
  }

  // ===== 4. Get one MMK existing Student Group for reference =====
  if (sgMMK.length) {
    console.log(`\n=== DETAIL: ${sgMMK[0].name} ===`);
    const mmkDetail = await q(`/api/resource/Student Group/${encodeURIComponent(sgMMK[0].name)}`);
    console.log('group_based_on:', mmkDetail.group_based_on);
    console.log('program:', mmkDetail.program);
    console.log('batch:', mmkDetail.batch);
    console.log('academic_year:', mmkDetail.academic_year);
    console.log('academic_term:', mmkDetail.academic_term);
    console.log('max_strength:', mmkDetail.max_strength);
    console.log('disabled:', mmkDetail.disabled);
    console.log('students count:', mmkDetail.students?.length);
    console.log('instructors count:', mmkDetail.instructors?.length);
    for (const [k, v] of Object.entries(mmkDetail)) {
      if (k.startsWith('custom_')) console.log(`custom: ${k}=${v}`);
    }
  }

  // ===== 5. Student Batch Names =====
  console.log('\n=== ALL STUDENT BATCH NAMES ===');
  const batches = await q('/api/resource/Student Batch Name?fields=["name"]&limit_page_length=100');
  batches.forEach(b => console.log(`  ${b.name}`));

  // ===== 6. MMK Fee Structure template =====
  console.log('\n=== MMK FEE STRUCTURE: SU MMK-9th State-Basic-1 ===');
  const mmkFS = await q(`/api/resource/Fee Structure/${encodeURIComponent('SU MMK-9th State-Basic-1')}`);
  console.log('Program:', mmkFS.program);
  console.log('Academic Year:', mmkFS.academic_year);
  console.log('Company:', mmkFS.company);
  console.log('Docstatus:', mmkFS.docstatus);
  console.log('Components:');
  mmkFS.components?.forEach(c => console.log(`  ${c.fees_category}: ₹${c.amount}`));
  console.log('Custom fields:');
  for (const [k, v] of Object.entries(mmkFS)) {
    if (k.startsWith('custom_')) console.log(`  ${k}: ${JSON.stringify(v)}`);
  }

  // ===== 7. CHL 8th State Fee Structures (all 12) =====
  console.log('\n=== CHL 8th State FEE STRUCTURES ===');
  const chlFSList = await q('/api/resource/Fee Structure?filters=[["company","=","Smart Up Chullickal"],["program","=","8th State"]]&fields=["name"]&limit_page_length=50&order_by=name asc');
  for (const f of chlFSList) {
    const fs = await q(`/api/resource/Fee Structure/${encodeURIComponent(f.name)}`);
    const comps = fs.components?.map(c => `${c.fees_category}=₹${c.amount}`).join(', ');
    console.log(`${fs.name}: plan=${fs.custom_plan_name} | inst=${fs.custom_installment_count} | docstatus=${fs.docstatus} | ${comps}`);
  }

  // ===== 8. Program Enrollment for 8th =====
  console.log('\n=== PROGRAM ENROLLMENTS: 8th (all companies) ===');
  const enroll = await q('/api/resource/Program Enrollment?filters=[["program","like","%8%"]]&fields=["name","student_name","program","company","academic_year","student_batch_name"]&limit_page_length=100');
  console.log(`Total: ${enroll.length}`);
  const byComp = {};
  enroll.forEach(e => { if (!byComp[e.company]) byComp[e.company] = []; byComp[e.company].push(e); });
  for (const [comp, items] of Object.entries(byComp)) {
    console.log(`  ${comp}: ${items.length} enrollments`);
  }

  // ===== 9. Fee Schedules for 8th =====
  console.log('\n=== FEE SCHEDULES: 8th (all companies) ===');
  const sched = await q('/api/resource/Fee Schedule?filters=[["program","like","%8%"]]&fields=["name","program","company","fee_structure","academic_year","docstatus","student_group"]&limit_page_length=100');
  console.log(`Total: ${sched.length}`);
  sched.forEach(s => console.log(`  ${s.name} | ${s.company} | fs=${s.fee_structure} | group=${s.student_group} | status=${s.docstatus}`));
}

main().catch(console.error);
