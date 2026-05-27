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

const studentId = 'STU-SU CHL-26-056';
const newSrr = '220';

// Step 1: Update the student's SRR from 056 to 220
console.log(`Updating ${studentId} custom_srr_id: 056 → ${newSrr}...`);
const updated = await req('PUT', `/api/resource/Student/${encodeURIComponent(studentId)}`, {
  custom_srr_id: newSrr
});
console.log('Update exception:', updated?.exception?.split('\n')[0] ?? 'none');
console.log('New SRR:', updated?.data?.custom_srr_id);

if (updated?.exception) { console.error('Failed to update SRR'); process.exit(1); }

// Step 2: Create PE
console.log('\nCreating Program Enrollment with new SRR...');
const created = await req('POST', '/api/resource/Program Enrollment', {
  student: studentId,
  program: '10th State',
  custom_plan: 'Advanced',
  enrollment_date: '2026-04-10',
  academic_year: '2026-2027',
  student_batch_name: 'Chullickal 26-27',
  custom_fee_structure: 'SU CHL-10th State-Advanced-4',
  custom_no_of_instalments: '4'
});
console.log('Create exception:', created?.exception?.split('\n')[0] ?? 'none');
const peName = created?.data?.name;
console.log('Created PE name:', peName);
if (!peName) { console.error('Failed to create PE'); process.exit(1); }

// Step 3: Submit
console.log('\nFetching fresh PE for submit...');
const fresh = await req('GET', `/api/resource/Program Enrollment/${encodeURIComponent(peName)}`);
const doc = fresh?.data;
console.log('Fresh — srr:', doc?.custom_student_srr, '| batch:', doc?.student_batch_name, '| courses:', doc?.courses?.length);

console.log('\nSubmitting PE...');
const sub = await req('POST', '/api/method/frappe.client.submit', { doc });
if (sub?.exception) {
  console.log('EXCEPTION:', sub.exception.split('\n')[0]);
} else if (sub?.message) {
  console.log('\n✓ SUCCESS!');
  console.log('  PE name:', sub.message.name);
  console.log('  docstatus:', sub.message.docstatus);
  console.log('  student:', sub.message.student);
  console.log('  student_name:', sub.message.student_name);
  console.log('  plan:', sub.message.custom_plan);
  console.log('  program:', sub.message.program);
  console.log('  batch:', sub.message.student_batch_name);
} else {
  console.log('Unexpected response:', JSON.stringify(sub));
}
