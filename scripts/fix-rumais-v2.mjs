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
const draftPeName = 'PEN-10th--056';

// Step 1: Delete the draft PE first
console.log('Deleting draft PE', draftPeName, '...');
const del = await req('DELETE', `/api/resource/Program Enrollment/${encodeURIComponent(draftPeName)}`);
console.log('Delete result:', JSON.stringify(del));

// Verify deletion
const check = await req('GET', `/api/resource/Program Enrollment/${encodeURIComponent(draftPeName)}`);
console.log('PE after delete:', check?.exc_type ?? 'still exists with docstatus ' + check?.data?.docstatus);

// Step 2: Verify student SRR is 220
const stu = await req('GET', `/api/resource/Student/${encodeURIComponent(studentId)}`);
console.log('\nStudent SRR:', stu?.data?.custom_srr_id);

// Step 3: Create new PE with SRR 220
console.log('\nCreating PE...');
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
console.log('PE name:', peName);
console.log('SRR in PE:', created?.data?.custom_student_srr);
if (!peName) { console.error('Failed to create PE'); process.exit(1); }

// Step 4: Submit
const fresh = await req('GET', `/api/resource/Program Enrollment/${encodeURIComponent(peName)}`);
const doc = fresh?.data;
console.log('\nFresh — courses:', doc?.courses?.length, '| srr:', doc?.custom_student_srr);

console.log('\nSubmitting...');
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
  console.log('  batch:', sub.message.student_batch_name);
} else {
  console.log('Response:', JSON.stringify(sub));
}
