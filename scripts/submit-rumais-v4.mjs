const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: AUTH, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

const oldPeName = 'PEN-10th--056';

// Step 1: Delete the existing draft PE
console.log('Deleting existing draft PE...');
const del = await req('DELETE', `/api/resource/Program Enrollment/${encodeURIComponent(oldPeName)}`);
console.log('Delete result:', JSON.stringify(del));

// Step 2: Create a new PE with no courses
console.log('\nCreating new PE without courses...');
const created = await req('POST', '/api/resource/Program Enrollment', {
  student: 'STU-SU CHL-26-056',
  program: '10th State',
  custom_plan: 'Advanced',
  enrollment_date: '2026-04-10',
  academic_year: '2026-2027',
  student_batch_name: 'Chullickal 26-27',
  custom_fee_structure: 'SU CHL-10th State-Advanced-4',
  custom_no_of_instalments: '4',
  courses: []
});
console.log('Create exception:', created?.exception ?? 'none');
const peName = created?.data?.name;
console.log('Created PE name:', peName);
console.log('Created courses count:', created?.data?.courses?.length);
console.log('Created modified:', created?.data?.modified);
if (!peName) { console.error('Failed to create PE'); process.exit(1); }

// Step 3: Submit the new PE
console.log('\nSubmitting PE:', peName);
const fresh = await req('GET', `/api/resource/Program Enrollment/${encodeURIComponent(peName)}`);
console.log('Fresh courses:', fresh?.data?.courses?.length, '| modified:', fresh?.data?.modified);

const sub = await req('POST', '/api/method/frappe.client.submit', { doc: fresh?.data });
if (sub?.exception) {
  console.log('EXCEPTION:', sub.exception.split('\n')[0]);
} else if (sub?.message) {
  console.log('\nSUCCESS!');
  console.log('  name:', sub.message.name);
  console.log('  docstatus:', sub.message.docstatus);
  console.log('  student:', sub.message.student);
  console.log('  student_name:', sub.message.student_name);
  console.log('  plan:', sub.message.custom_plan);
  console.log('  program:', sub.message.program);
} else {
  console.log('Response:', JSON.stringify(sub, null, 2));
}
