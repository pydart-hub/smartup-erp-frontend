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

// Try creating a PE without student_batch_name to get a different auto-generated name
console.log('Creating PE without batch (to get unique name)...');
const created = await req('POST', '/api/resource/Program Enrollment', {
  student: 'STU-SU CHL-26-056',
  program: '10th State',
  custom_plan: 'Advanced',
  enrollment_date: '2026-04-10',
  academic_year: '2026-2027',
  courses: []
});
console.log('Create exception:', created?.exception?.split('\n')[0] ?? 'none');
if (created?.data) {
  const peName = created.data.name;
  console.log('Created PE name:', peName);
  console.log('Courses count:', created.data.courses?.length);
  console.log('Modified:', created.data.modified);
  
  // If created, try to submit
  if (peName) {
    const fresh = await req('GET', `/api/resource/Program Enrollment/${encodeURIComponent(peName)}`);
    console.log('\nFresh — courses:', fresh?.data?.courses?.length, '| modified:', fresh?.data?.modified);
    
    const sub = await req('POST', '/api/method/frappe.client.submit', { doc: fresh?.data });
    if (sub?.exception) {
      console.log('Submit EXCEPTION:', sub.exception.split('\n')[0]);
    } else if (sub?.message) {
      console.log('\nSUCCESS!');
      console.log('  name:', sub.message.name);
      console.log('  docstatus:', sub.message.docstatus);
      console.log('  plan:', sub.message.custom_plan);
    }
  }
}
