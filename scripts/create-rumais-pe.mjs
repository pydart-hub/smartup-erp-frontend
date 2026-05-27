const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: AUTH, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
}

// Step 1: Create draft PE
console.log('Creating Program Enrollment for RUMAIS RAZEEM (STU-SU CHL-26-056)...');
const created = await req('POST', '/api/resource/Program Enrollment', {
  student: 'STU-SU CHL-26-056',
  program: '10th State',
  custom_plan: 'Advanced',
  enrollment_date: '2026-04-10',
  academic_year: '2026-2027',
  docstatus: 0
});

console.log('Create response:', JSON.stringify(created, null, 2));
const peName = created?.data?.name;
if (!peName) { console.error('Failed to create PE'); process.exit(1); }

// Step 2: Submit the PE (docstatus 0 -> 1)
console.log('\nSubmitting PE:', peName);
const submitted = await req('PUT', `/api/resource/Program Enrollment/${encodeURIComponent(peName)}`, {
  docstatus: 1
});
console.log('Submit response status:', submitted?.data?.docstatus);
console.log('PE name:', submitted?.data?.name);
console.log('Plan:', submitted?.data?.custom_plan);
console.log('Program:', submitted?.data?.program);
console.log('\nDone!');
