/**
 * Deep-study Eraveli N/A students.
 * Replicates exactly the same logic as getStudentCountByPlanForBranch() in director.ts
 */
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
async function get(path) {
  const res = await fetch(BASE + path, { headers: { Authorization: AUTH, Accept: 'application/json' } });
  return res.json();
}

const branch = 'Smart Up Eraveli';

// Step 1: Get active count (same as getActiveStudentCountForBranch)
const countRes = await get('/api/method/frappe.client.get_count?' + new URLSearchParams({
  doctype: 'Student',
  filters: JSON.stringify({ custom_branch: branch, enabled: '1' }),
  cache: 'false'
}));
const activeCount = countRes?.message ?? 0;
console.log('Active count (get_count):', activeCount);

// Step 2: Get all active student IDs (same as getStudentCountByPlanForBranch)
const stuRes = await get('/api/resource/Student?' + new URLSearchParams({
  fields: JSON.stringify(['name', 'student_name', 'custom_srr_id']),
  filters: JSON.stringify([['custom_branch', '=', branch], ['enabled', '=', 1]]),
  limit_page_length: '500',
  order_by: 'custom_srr_id asc'
}));
const students = stuRes?.data ?? [];
console.log('Students from list API:', students.length);

const studentIds = students.map(s => s.name);

// Step 3: Fetch PEs in batches of 50 (same logic as director.ts)
const batchSize = 50;
const allEnrollments = [];
for (let i = 0; i < studentIds.length; i += batchSize) {
  const batch = studentIds.slice(i, i + batchSize);
  const peRes = await get('/api/resource/Program Enrollment?' + new URLSearchParams({
    fields: JSON.stringify(['student', 'custom_plan', 'student_category', 'name', 'enrollment_date']),
    filters: JSON.stringify([['docstatus', '=', 1], ['student', 'in', batch]]),
    order_by: 'enrollment_date desc',
    limit_page_length: '500'
  }));
  allEnrollments.push(...(peRes?.data ?? []));
}
console.log('Total PE records fetched:', allEnrollments.length);

// Step 4: Dedup (same as director.ts seen Set)
const seen = new Set();
const planMap = {};  // studentId -> plan
const result = { advanced: 0, intermediate: 0, basic: 0, freeAccess: 0, demo: 0, na: 0 };

for (const pe of allEnrollments) {
  if (seen.has(pe.student)) continue;
  seen.add(pe.student);
  planMap[pe.student] = { plan: pe.custom_plan, category: pe.student_category, pe_name: pe.name };

  const cat = (pe.student_category || '').toLowerCase();
  if (cat === 'free access') result.freeAccess++;
  else if (cat === 'demo') result.demo++;
  else {
    const plan = (pe.custom_plan || '').toLowerCase();
    if (plan === 'advanced') result.advanced++;
    else if (plan === 'intermediate') result.intermediate++;
    else if (plan === 'basic') result.basic++;
  }
}

const knownTotal = result.advanced + result.intermediate + result.basic + result.freeAccess + result.demo;
const naCount = students.length - seen.size;
result.na = naCount;

console.log('\n=== COUNTS ===');
console.log('Advanced:', result.advanced);
console.log('Intermediate:', result.intermediate);
console.log('Basic:', result.basic);
console.log('Free Access:', result.freeAccess);
console.log('Demo:', result.demo);
console.log('Known total:', knownTotal);
console.log('Students in list:', students.length);
console.log('Students with PE (seen):', seen.size);
console.log('N/A (students - seen):', naCount);

// Step 5: Identify the N/A students
const naStudents = students.filter(s => !seen.has(s.name));
console.log('\n=== N/A STUDENTS ===');
for (const s of naStudents) {
  console.log(`  ${s.name} | ${s.student_name} | SRR: ${s.custom_srr_id}`);
}

// Step 6: Deep-check each N/A student's PE records (any docstatus)
console.log('\n=== PE DETAILS FOR N/A STUDENTS ===');
for (const s of naStudents) {
  const peAll = await get('/api/resource/Program Enrollment?' + new URLSearchParams({
    fields: JSON.stringify(['name', 'docstatus', 'custom_plan', 'student_category', 'enrollment_date', 'program']),
    filters: JSON.stringify([['student', '=', s.name]]),
    limit_page_length: '20'
  }));
  const pes = peAll?.data ?? [];
  console.log(`\n${s.name} (${s.student_name}, SRR ${s.custom_srr_id}):`);
  if (pes.length === 0) {
    console.log('  NO PROGRAM ENROLLMENTS');
  } else {
    for (const pe of pes) {
      console.log(`  PE: ${pe.name} | status: ${pe.docstatus} | plan: ${pe.custom_plan || '(blank)'} | cat: ${pe.student_category || '(blank)'} | date: ${pe.enrollment_date}`);
    }
  }
}
