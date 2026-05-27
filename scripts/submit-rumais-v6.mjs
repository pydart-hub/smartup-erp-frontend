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

// Fetch fresh PE to get course row names
const fresh = await req('GET', `/api/resource/Program Enrollment/${encodeURIComponent(peName)}`);
const doc = fresh?.data;
console.log('PE courses:', doc?.courses?.map(c => ({name: c.name, course: c.course})));

// Delete each course row via Program Enrollment Course endpoint
console.log('\nDeleting course rows...');
for (const courseRow of (doc?.courses ?? [])) {
  const del = await req('DELETE', `/api/resource/Program Enrollment Course/${encodeURIComponent(courseRow.name)}`);
  console.log(`  Deleted ${courseRow.course} (${courseRow.name}):`, del?.data ?? del?.exception?.split('\n')[0]);
}

// Verify courses are gone
const fresh2 = await req('GET', `/api/resource/Program Enrollment/${encodeURIComponent(peName)}`);
console.log('\nAfter deletion — courses:', fresh2?.data?.courses?.length, '| modified:', fresh2?.data?.modified);

// Submit
console.log('\nSubmitting...');
const sub = await req('POST', '/api/method/frappe.client.submit', { doc: fresh2?.data });
if (sub?.exception) {
  console.log('EXCEPTION:', sub.exception.split('\n')[0]);
} else if (sub?.message) {
  console.log('\nSUCCESS!');
  console.log('  name:', sub.message.name);
  console.log('  docstatus:', sub.message.docstatus);
  console.log('  plan:', sub.message.custom_plan);
  console.log('  program:', sub.message.program);
} else {
  console.log('Response:', JSON.stringify(sub));
}
