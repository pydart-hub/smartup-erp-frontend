/**
 * Find the 5 missing Basic PEs for Eraveli.
 * The admin script returns 190 Basic + 0 N/A. The frontend shows 185 Basic + 5 N/A.
 * So 5 Basic PEs are visible to admin but invisible to the frontend user (Rayees).
 * 
 * Check:
 * 1. Does Program Enrollment have a custom_branch field?
 * 2. Are any Eraveli PEs missing that field?
 * 3. What's the ordering / page issue?
 */
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
async function get(path) {
  const res = await fetch(BASE + path, { headers: { Authorization: AUTH, Accept: 'application/json' } });
  return res.json();
}

const branch = 'Smart Up Eraveli';

// Get all active Eraveli student IDs
const stuRes = await get('/api/resource/Student?' + new URLSearchParams({
  fields: JSON.stringify(['name']),
  filters: JSON.stringify([['custom_branch', '=', branch], ['enabled', '=', 1]]),
  limit_page_length: '500',
  order_by: 'name asc'
}));
const studentIds = (stuRes?.data ?? []).map(s => s.name);
console.log('Student IDs count:', studentIds.length);

// Simulate batch PE fetch exactly as the frontend does (50 per batch)
const batchSize = 50;
const allPEs = [];
for (let i = 0; i < studentIds.length; i += batchSize) {
  const batch = studentIds.slice(i, i + batchSize);
  const peRes = await get('/api/resource/Program Enrollment?' + new URLSearchParams({
    fields: JSON.stringify(['name', 'student', 'custom_plan', 'student_category', 'enrollment_date', 'docstatus', 'program', 'academic_year']),
    filters: JSON.stringify([['docstatus', '=', 1], ['student', 'in', batch]]),
    order_by: 'enrollment_date desc',
    limit_page_length: '500'
  }));
  const batch_pes = peRes?.data ?? [];
  console.log(`Batch ${Math.floor(i/batchSize)+1} (${batch.length} students): ${batch_pes.length} PEs fetched`);
  allPEs.push(...batch_pes);
}

console.log('\nTotal PEs fetched:', allPEs.length);

// Dedup
const seen = new Set();
const counts = { advanced: 0, intermediate: 0, basic: 0, freeAccess: 0, demo: 0, na_blank: 0 };
const unrecognized = [];
for (const pe of allPEs) {
  if (seen.has(pe.student)) continue;
  seen.add(pe.student);
  const cat = (pe.student_category || '').toLowerCase();
  if (cat === 'free access') counts.freeAccess++;
  else if (cat === 'demo') counts.demo++;
  else {
    const plan = (pe.custom_plan || '').toLowerCase();
    if (plan === 'advanced') counts.advanced++;
    else if (plan === 'intermediate') counts.intermediate++;
    else if (plan === 'basic') counts.basic++;
    else {
      counts.na_blank++;
      unrecognized.push({ pe: pe.name, student: pe.student, plan: pe.custom_plan, cat: pe.student_category });
    }
  }
}

console.log('\n=== SIMULATED FRONTEND COUNTS (admin token) ===');
console.log('Advanced:', counts.advanced);
console.log('Basic:', counts.basic);
console.log('Demo:', counts.demo);
console.log('N/A (blank plan):', counts.na_blank);
console.log('Students with PE:', seen.size, '/', studentIds.length);
console.log('N/A (no PE):', studentIds.length - seen.size);

if (unrecognized.length) {
  console.log('\nUnrecognized plan PEs:', JSON.stringify(unrecognized, null, 2));
}

// Now check: fetch ALL PE records for Eraveli students using a single query
// to compare with batch results
console.log('\n\n=== SINGLE QUERY CHECK (limit 1000) ===');
const singleRes = await get('/api/resource/Program Enrollment?' + new URLSearchParams({
  fields: JSON.stringify(['name', 'student', 'custom_plan', 'student_category', 'enrollment_date']),
  filters: JSON.stringify([['docstatus', '=', 1], ['student', 'in', studentIds]]),
  order_by: 'enrollment_date desc',
  limit_page_length: '1000'
}));
const singlePEs = singleRes?.data ?? [];
console.log('Single query returned:', singlePEs.length, 'PEs');

// Check for any PEs returned in single query but NOT in batch query
const batchPENames = new Set(allPEs.map(p => p.name));
const onlyInSingle = singlePEs.filter(p => !batchPENames.has(p.name));
console.log('PEs in single query but NOT in batches:', onlyInSingle.length);
if (onlyInSingle.length) console.log('Missing PEs:', JSON.stringify(onlyInSingle, null, 2));
