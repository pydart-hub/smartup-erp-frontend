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

const peName = 'PEN-10th--056';

// Step 1: Fetch current draft
const fresh = await req('GET', `/api/resource/Program Enrollment/${encodeURIComponent(peName)}`);
const doc = fresh?.data;
console.log('Current — docstatus:', doc?.docstatus, '| courses:', doc?.courses?.length, '| batch:', doc?.student_batch_name);

// Step 2: Update PE to clear courses (avoid CE naming collision with AIMAL V / SRR 056)
console.log('\nClearing courses to avoid CE naming collision...');
const updated = await req('PUT', `/api/resource/Program Enrollment/${encodeURIComponent(peName)}`, {
  courses: []
});
console.log('Update exception:', updated?.exception ?? 'none');
console.log('Updated courses count:', updated?.data?.courses?.length);
console.log('Updated modified:', updated?.data?.modified);

// Step 3: Fetch fresh again to get latest timestamp
const fresh2 = await req('GET', `/api/resource/Program Enrollment/${encodeURIComponent(peName)}`);
const doc2 = fresh2?.data;
console.log('\nPre-submit — courses:', doc2?.courses?.length, '| modified:', doc2?.modified);

// Step 4: Submit
console.log('\nSubmitting...');
const sub = await req('POST', '/api/method/frappe.client.submit', { doc: doc2 });
if (sub?.exception) {
  console.log('EXCEPTION:', sub.exception.split('\n')[0]);
} else if (sub?.message) {
  console.log('SUCCESS!');
  console.log('  name:', sub.message.name);
  console.log('  docstatus:', sub.message.docstatus);
  console.log('  student:', sub.message.student);
  console.log('  plan:', sub.message.custom_plan);
  console.log('  program:', sub.message.program);
  console.log('  batch:', sub.message.student_batch_name);
} else {
  console.log('Unexpected response:', JSON.stringify(sub, null, 2));
}
