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

// Step 1: Fetch fresh draft
const fresh = await req('GET', `/api/resource/Program Enrollment/${encodeURIComponent(peName)}`);
const doc = fresh?.data;
console.log('Current state — batch:', doc?.student_batch_name, '| docstatus:', doc?.docstatus);

// Step 2: Update to add student_batch_name
console.log('\nUpdating student_batch_name...');
const updated = await req('PUT', `/api/resource/Program Enrollment/${encodeURIComponent(peName)}`, {
  student_batch_name: 'Chullickal 26-27',
  custom_fee_structure: 'SU CHL-10th State-Advanced-4',
  custom_no_of_instalments: '4'
});
console.log('Update exception:', updated?.exception ?? 'none');
console.log('Updated batch:', updated?.data?.student_batch_name);
console.log('Updated modified:', updated?.data?.modified);

// Step 3: Submit with fresh modified timestamp
const fresh2 = await req('GET', `/api/resource/Program Enrollment/${encodeURIComponent(peName)}`);
const doc2 = fresh2?.data;
console.log('\nPre-submit state — batch:', doc2?.student_batch_name, '| modified:', doc2?.modified);

console.log('\nSubmitting...');
const sub = await req('POST', '/api/method/frappe.client.submit', { doc: doc2 });
console.log('Submit exception:', sub?.exception ?? 'none');
if (sub?.message) {
  console.log('Result docstatus:', sub.message.docstatus);
  console.log('Result name:', sub.message.name);
  console.log('Result plan:', sub.message.custom_plan);
  console.log('Result batch:', sub.message.student_batch_name);
}
