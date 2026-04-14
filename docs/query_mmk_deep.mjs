const base = 'https://smartup.m.frappe.cloud';
const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json' };
async function q(ep) { const r = await fetch(base + ep, { headers }); return (await r.json()).data; }

async function main() {
  const MMK = 'Smart Up Moolamkuzhi';
  const REF = 'Smart Up Chullickal'; // reference branch that HAS 8th State

  // ===== 1. PROGRAM DETAILS =====
  console.log('========================================');
  console.log('1. PROGRAM: 8th State (full detail)');
  console.log('========================================');
  const prog = await q('/api/resource/Program/8th%20State');
  console.log('Name:', prog.name);
  console.log('Program Name:', prog.program_name);
  console.log('Department:', prog.department);
  console.log('Is Published:', prog.is_published);
  console.log('Courses (child table):', JSON.stringify(prog.courses, null, 2));

  // ===== 2. STUDENT GROUPS =====
  console.log('\n========================================');
  console.log('2. STUDENT GROUPS');
  console.log('========================================');

  // 2a. Moolamkuzhi - all student groups
  const mmkGroups = await q(`/api/resource/Student Group?filters=[["company","=","${MMK}"]]&fields=["name","group_based_on","program","batch","academic_year","academic_term","max_strength"]&limit_page_length=200&order_by=name asc`);
  console.log(`\nMoolamkuzhi ALL groups (${mmkGroups.length}):`);
  const mmkByProg = {};
  mmkGroups.forEach(g => {
    const key = g.program || 'NO_PROGRAM';
    if (!mmkByProg[key]) mmkByProg[key] = [];
    mmkByProg[key].push(g);
  });
  for (const [prog, groups] of Object.entries(mmkByProg).sort()) {
    console.log(`  ${prog}: ${groups.length} groups`);
    groups.forEach(g => console.log(`    - ${g.name} | batch=${g.batch} | year=${g.academic_year} | strength=${g.max_strength}`));
  }

  // 2b. Filter 8th State groups at Moolamkuzhi
  const mmk8Groups = await q(`/api/resource/Student Group?filters=[["company","=","${MMK}"],["program","like","%8%"]]&fields=["name","program","batch","academic_year","max_strength"]&limit_page_length=50`);
  console.log(`\nMoolamkuzhi 8th groups: ${mmk8Groups.length}`);
  if (mmk8Groups.length) console.log(JSON.stringify(mmk8Groups, null, 2));

  // 2c. Reference branch (Chullickal) - 8th State groups
  const ref8Groups = await q(`/api/resource/Student Group?filters=[["company","=","${REF}"],["program","like","%8%"]]&fields=["name","program","batch","academic_year","max_strength","group_based_on"]&limit_page_length=50`);
  console.log(`\nChullickal (ref) 8th groups: ${ref8Groups.length}`);
  ref8Groups.forEach(g => console.log(`  - ${g.name} | batch=${g.batch} | year=${g.academic_year} | based_on=${g.group_based_on} | strength=${g.max_strength}`));

  // ===== 3. BATCHES =====
  console.log('\n========================================');
  console.log('3. STUDENT BATCHES');
  console.log('========================================');
  const batches = await q('/api/resource/Student Batch Name?fields=["name","batch_name"]&limit_page_length=100');
  console.log('All batches:', batches.map(b => b.name).join(', '));

  // ===== 4. COURSES linked to 8th State =====
  console.log('\n========================================');
  console.log('4. COURSES linked to 8th State Program');
  console.log('========================================');
  // Courses from program child table
  if (prog.courses?.length) {
    for (const c of prog.courses) {
      console.log(`  Course: ${c.course} | Required: ${c.required}`);
    }
  } else {
    console.log('  No courses linked in program');
  }
  
  // Also check Course directly
  const courses8 = await q('/api/resource/Course?filters=[["name","like","%8%"]]&fields=["name","course_name","department","course_abbreviation"]&limit_page_length=50');
  console.log('\nCourses with "8" in name:');
  courses8.forEach(c => console.log(`  - ${c.name} | abbr=${c.course_abbreviation}`));

  // ===== 5. FEE CATEGORY =====
  console.log('\n========================================');
  console.log('5. FEE CATEGORIES for 8th');
  console.log('========================================');
  const feeCats = await q('/api/resource/Fee Category?filters=[["name","like","%8%"]]&fields=["name","description"]&limit_page_length=50');
  console.log(JSON.stringify(feeCats, null, 2));

  // ===== 6. FEE STRUCTURES - Reference branch detail =====
  console.log('\n========================================');
  console.log('6. FEE STRUCTURES: Chullickal 8th State (reference)');
  console.log('========================================');
  const refFS = await q(`/api/resource/Fee Structure?filters=[["company","=","${REF}"],["program","=","8th State"]]&fields=["name","program","academic_year","docstatus"]&limit_page_length=50&order_by=name asc`);
  console.log(`Total: ${refFS.length}`);
  refFS.forEach(f => console.log(`  - ${f.name} | docstatus=${f.docstatus}`));

  // Get one full detail as blueprint
  if (refFS.length) {
    const sample = await q(`/api/resource/Fee Structure/${encodeURIComponent(refFS[0].name)}`);
    console.log(`\nSample detail: ${sample.name}`);
    console.log('  Program:', sample.program);
    console.log('  Academic Year:', sample.academic_year);
    console.log('  Academic Term:', sample.academic_term);
    console.log('  Company:', sample.company);
    console.log('  Docstatus:', sample.docstatus);
    console.log('  Components:');
    sample.components?.forEach(c => console.log(`    - ${c.fees_category}: ₹${c.amount}`));
  }

  // ===== 7. PROGRAM ENROLLMENT =====
  console.log('\n========================================');
  console.log('7. PROGRAM ENROLLMENT: 8th State');
  console.log('========================================');
  // Any company
  const enroll8 = await q('/api/resource/Program Enrollment?filters=[["program","=","8th State"]]&fields=["name","student","student_name","company","academic_year"]&limit_page_length=20');
  console.log(`Total 8th State enrollments (all companies): ${enroll8.length}`);
  const enrollByCompany = {};
  enroll8.forEach(e => {
    if (!enrollByCompany[e.company]) enrollByCompany[e.company] = 0;
    enrollByCompany[e.company]++;
  });
  console.log('By company:', JSON.stringify(enrollByCompany, null, 2));

  // ===== 8. FEE SCHEDULE =====
  console.log('\n========================================');
  console.log('8. FEE SCHEDULES: 8th State');
  console.log('========================================');
  const sched8 = await q('/api/resource/Fee Schedule?filters=[["program","like","%8%"]]&fields=["name","program","company","fee_structure","docstatus","academic_year"]&limit_page_length=50');
  console.log(`Total 8th schedules (all): ${sched8.length}`);
  const schedByCompany = {};
  sched8.forEach(s => {
    if (!schedByCompany[s.company]) schedByCompany[s.company] = [];
    schedByCompany[s.company].push(s.name);
  });
  for (const [comp, names] of Object.entries(schedByCompany)) {
    console.log(`  ${comp}: ${names.length} schedules`);
  }

  // ===== 9. EXISTING MMK FEE STRUCTURES - full detail =====
  console.log('\n========================================');
  console.log('9. EXISTING MMK FEE STRUCTURES (sample)');
  console.log('========================================');
  // Get one existing MMK structure as template
  const mmkSample = await q(`/api/resource/Fee Structure/${encodeURIComponent('SU MMK-9th State-Basic-1')}`);
  console.log('Sample: SU MMK-9th State-Basic-1');
  console.log('  Program:', mmkSample.program);
  console.log('  Academic Year:', mmkSample.academic_year);
  console.log('  Academic Term:', mmkSample.academic_term);
  console.log('  Company:', mmkSample.company);
  console.log('  Docstatus:', mmkSample.docstatus);
  console.log('  Custom Fields:', mmkSample.custom_plan_name, mmkSample.custom_installment_count);
  console.log('  Components:');
  mmkSample.components?.forEach(c => console.log(`    - ${c.fees_category}: ₹${c.amount} | item=${c.item}`));

  // Also check custom fields
  console.log('\n  ALL custom_ fields:');
  for (const [k, v] of Object.entries(mmkSample)) {
    if (k.startsWith('custom_')) console.log(`    ${k}: ${v}`);
  }
}

main().catch(console.error);
