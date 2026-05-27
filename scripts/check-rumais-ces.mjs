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

// Check all Course Enrollments for this student
const ces = await req('GET', '/api/resource/Course Enrollment?' + new URLSearchParams({
  fields: JSON.stringify(['name','student','course','custom_batch_name','program_enrollment','enrollment_date','docstatus']),
  filters: JSON.stringify([['student','=','STU-SU CHL-26-056']]),
  limit_page_length: '50'
}));
console.log('All Course Enrollments for STU-SU CHL-26-056:');
console.log(JSON.stringify(ces?.data, null, 2));
