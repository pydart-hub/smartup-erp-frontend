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

// Look at existing submitted 10th State PE from Chullickal to see course enrollment custom_batch_name
const pe = await req('GET', '/api/resource/Program Enrollment/PEN-10th-Chullickal%2026-27-006');
const doc = pe?.data;
console.log('PE:', doc?.name, '| student:', doc?.student);
console.log('Courses count:', doc?.courses?.length);
if (doc?.courses?.length) {
  const sample = doc.courses[0];
  console.log('Sample course row fields:', Object.keys(sample));
  console.log('Sample course row:', JSON.stringify(doc.courses[0], null, 2));
}

// Also check Course Enrollment for this PE
const ces = await req('GET', '/api/resource/Course Enrollment?' + new URLSearchParams({
  fields: JSON.stringify(['name','student','course','custom_batch_name','program_enrollment','enrollment_date']),
  filters: JSON.stringify([['program_enrollment','=','PEN-10th-Chullickal 26-27-006']]),
  limit_page_length: '5'
}));
console.log('\nCourse Enrollments for existing PE:', JSON.stringify(ces?.data?.slice(0,2), null, 2));
