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

// Try to fetch the specific CE by name directly
const ce = await req('GET', '/api/resource/Course Enrollment/CEN-10th%20Chemistry-Chullickal%2026-27-056');
console.log('Chemistry CE:', JSON.stringify(ce, null, 2));

// Also try fetching with show_cancelled
const ces2 = await req('GET', '/api/resource/Course Enrollment?' + new URLSearchParams({
  fields: JSON.stringify(['name','student','docstatus','program_enrollment']),
  filters: JSON.stringify([['student','=','STU-SU CHL-26-056']]),
  limit_page_length: '50',
  include_cancelled: '1'  // try to include cancelled docs
}));
console.log('\nCourse Enrollments (include_cancelled):', JSON.stringify(ces2?.data, null, 2));

// Check the draft PE current state
const pe = await req('GET', '/api/resource/Program Enrollment/PEN-10th--056');
console.log('\nDraft PE docstatus:', pe?.data?.docstatus, '| batch:', pe?.data?.student_batch_name);
