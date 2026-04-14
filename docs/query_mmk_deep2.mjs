const base = 'https://smartup.m.frappe.cloud';
const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json' };
async function q(ep) { const r = await fetch(base + ep, { headers }); const j = await r.json(); return j.data || []; }

async function main() {
  const MMK = 'Smart Up Moolamkuzhi';
  const REF = 'Smart Up Chullickal';

  // ===== 1. STUDENT GROUPS - check schema first =====
  console.log('========================================');
  console.log('1. STUDENT GROUP SCHEMA');
  console.log('========================================');
  const sgMeta = await q('/api/method/frappe.client.get_list?doctype=DocField&filters=[["parent","=","Student Group"],["fieldtype","not in",["Section Break","Column Break"]]]&fields=["fieldname","fieldtype","label"]&limit_page_length=100');
  console.log('Student Group fields:');
  sgMeta.forEach(f => console.log(`  ${f.fieldname} (${f.fieldtype}) - ${f.label}`));

  // ===== 2. ALL STUDENT GROUPS with "8" =====
  console.log('\n========================================');
  console.log('2. ALL STUDENT GROUPS with "8" in name');
  console.log('========================================');
  const sg8 = await q('/api/resource/Student Group?filters=[["name","like","%8th%"]]&fields=["name","group_based_on","program","batch","academic_year","academic_term","max_strength"]&limit_page_length=200&order_by=name asc');
  console.log(`Total: ${sg8.length}`);
  sg8.forEach(g => console.log(`  ${g.name} | program=${g.program} | batch=${g.batch} | year=${g.academic_year} | based_on=${g.group_based_on}`));

  // ===== 3. STUDENT GROUPS with MMK =====
  console.log('\n========================================');
  console.log('3. STUDENT GROUPS with "MMK" in name');
  console.log('========================================');
  const sgMMK = await q('/api/resource/Student Group?filters=[["name","like","%MMK%"]]&fields=["name","group_based_on","program","batch","academic_year","max_strength"]&limit_page_length=200&order_by=name asc');
  console.log(`Total: ${sgMMK.length}`);
  const mmkByProg = {};
  sgMMK.forEach(g => {
    const key = g.program || 'NO_PROGRAM';
    if (!mmkByProg[key]) mmkByProg[key] = [];
    mmkByProg[key].push(g);
  });
  for (const [prog, groups] of Object.entries(mmkByProg).sort()) {
    console.log(`\n  ${prog} (${groups.length} groups):`);
    groups.forEach(g => console.log(`    - ${g.name} | batch=${g.batch} | year=${g.academic_year} | strength=${g.max_strength}`));
  }

  // ===== 4. STUDENT GROUPS for reference branch (CHL) with 8th =====
  console.log('\n========================================');
  console.log('4. STUDENT GROUPS: CHL with 8th');
  console.log('========================================');
  const sgCHL8 = await q('/api/resource/Student Group?filters=[["name","like","%CHL%8th%"]]&fields=["name","program","batch","academic_year","max_strength","group_based_on"]&limit_page_length=50&order_by=name asc');
  console.log(`Total: ${sgCHL8.length}`);
  sgCHL8.forEach(g => console.log(`  ${g.name} | program=${g.program} | batch=${g.batch} | year=${g.academic_year} | based_on=${g.group_based_on}`));

  // Get one full detail
  if (sgCHL8.length) {
    const sgDetail = await q(`/api/resource/Student Group/${encodeURIComponent(sgCHL8[0].name)}`);
    console.log(`\nFull detail: ${sgDetail.name}`);
    console.log('  group_based_on:', sgDetail.group_based_on);
    console.log('  program:', sgDetail.program);
    console.log('  batch:', sgDetail.batch);
    console.log('  academic_year:', sgDetail.academic_year);
    console.log('  academic_term:', sgDetail.academic_term);
    console.log('  max_strength:', sgDetail.max_strength);
    console.log('  company:', sgDetail.company);
    console.log('  students child:', sgDetail.students?.length || 0);
    console.log('  instructors child:', sgDetail.instructors?.length || 0);
    console.log('  Custom fields:');
    for (const [k, v] of Object.entries(sgDetail)) {
      if (k.startsWith('custom_')) console.log(`    ${k}: ${v}`);
    }
  }

  // ===== 5. EXISTING MMK FEE STRUCTURE - template =====
  console.log('\n========================================');
  console.log('5. MMK FEE STRUCTURE template');
  console.log('========================================');
  const mmkFS = await q(`/api/resource/Fee Structure/${encodeURIComponent('SU MMK-9th State-Basic-1')}`);
  console.log('Name:', mmkFS.name);
  console.log('Program:', mmkFS.program);
  console.log('Academic Year:', mmkFS.academic_year);
  console.log('Academic Term:', mmkFS.academic_term);
  console.log('Company:', mmkFS.company);
  console.log('Docstatus:', mmkFS.docstatus);
  console.log('Components:');
  mmkFS.components?.forEach(c => console.log(`  - ${c.fees_category}: ₹${c.amount} | item=${c.item}`));
  console.log('\nALL custom_ fields:');
  for (const [k, v] of Object.entries(mmkFS)) {
    if (k.startsWith('custom_')) console.log(`  ${k}: ${JSON.stringify(v)}`);
  }

  // Also get a few more MMK templates across plans
  for (const name of ['SU MMK-9th State-Intermediate-1', 'SU MMK-9th State-Advanced-1', 'SU MMK-9th State-Basic-4', 'SU MMK-9th State-Basic-6', 'SU MMK-9th State-Basic-8']) {
    const fs = await q(`/api/resource/Fee Structure/${encodeURIComponent(name)}`);
    console.log(`\n  ${fs.name}:`);
    console.log(`    custom_plan_name: ${fs.custom_plan_name}`);
    console.log(`    custom_installment_count: ${fs.custom_installment_count}`);
    console.log(`    Components: ${fs.components?.map(c => `${c.fees_category}=₹${c.amount}`).join(', ')}`);
  }

  // ===== 6. REFERENCE CHL FEE STRUCTURE (8th State) =====
  console.log('\n========================================');
  console.log('6. CHL 8th State FEE STRUCTURES (all)');
  console.log('========================================');
  const chlFS = await q(`/api/resource/Fee Structure?filters=[["company","=","${REF}"],["program","=","8th State"]]&fields=["name"]&limit_page_length=50&order_by=name asc`);
  for (const f of chlFS) {
    const fs = await q(`/api/resource/Fee Structure/${encodeURIComponent(f.name)}`);
    console.log(`\n${fs.name}:`);
    console.log(`  plan=${fs.custom_plan_name} | installments=${fs.custom_installment_count} | docstatus=${fs.docstatus}`);
    console.log(`  Components: ${fs.components?.map(c => `${c.fees_category}=₹${c.amount}`).join(', ')}`);
  }

  // ===== 7. FEE SCHEDULES for 8th State =====
  console.log('\n========================================');
  console.log('7. FEE SCHEDULES with 8th');
  console.log('========================================');
  const sched = await q('/api/resource/Fee Schedule?filters=[["program","like","%8%"]]&fields=["name","program","company","fee_structure","academic_year","docstatus","student_group"]&limit_page_length=100');
  console.log(`Total: ${sched.length}`);
  sched.forEach(s => console.log(`  ${s.name} | company=${s.company} | program=${s.program} | fs=${s.fee_structure} | group=${s.student_group} | status=${s.docstatus}`));

  // ===== 8. PROGRAM ENROLLMENT for 8th =====
  console.log('\n========================================');
  console.log('8. PROGRAM ENROLLMENT for 8th');
  console.log('========================================');
  const enroll = await q('/api/resource/Program Enrollment?filters=[["program","like","%8%"]]&fields=["name","student_name","program","company","academic_year","student_batch_name"]&limit_page_length=100');
  console.log(`Total: ${enroll.length}`);
  const byComp = {};
  enroll.forEach(e => {
    if (!byComp[e.company]) byComp[e.company] = [];
    byComp[e.company].push(e);
  });
  for (const [comp, items] of Object.entries(byComp)) {
    console.log(`\n  ${comp}: ${items.length} enrollments`);
    items.slice(0, 3).forEach(e => console.log(`    - ${e.name} | ${e.student_name} | batch=${e.student_batch_name} | year=${e.academic_year}`));
    if (items.length > 3) console.log(`    ... and ${items.length - 3} more`);
  }

  // ===== 9. STUDENT BATCH NAME =====
  console.log('\n========================================');
  console.log('9. ALL STUDENT BATCH NAMES');
  console.log('========================================');
  const batchNames = await q('/api/resource/Student Batch Name?fields=["name","batch_name"]&limit_page_length=100');
  batchNames.forEach(b => console.log(`  ${b.name}`));
}

main().catch(console.error);
