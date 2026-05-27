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

// Check what Student Batches exist for Chullickal
const batches = await req('GET', '/api/resource/Student Batch?' + new URLSearchParams({
  fields: JSON.stringify(['name','batch_class','disabled','custom_branch']),
  filters: JSON.stringify([['custom_branch','=','Smart Up Chullickal']]),
  limit_page_length: '50'
}));
console.log('Chullickal batches:', JSON.stringify(batches?.data, null, 2));

// Check what PE exists with name PEN-10th-Chullickal 26-27-056 (AIMAL's PE)
const aimalPe = await req('GET', '/api/resource/Program Enrollment/PEN-10th-Chullickal%2026-27-056');
console.log('\nAIMAL PE info:', JSON.stringify({
  name: aimalPe?.data?.name,
  student: aimalPe?.data?.student,
  student_name: aimalPe?.data?.student_name,
  batch: aimalPe?.data?.student_batch_name,
  docstatus: aimalPe?.data?.docstatus
}, null, 2));

// Check AIMAL V's student details
const aimal = await req('GET', '/api/resource/Student/STU-SU%20THP-26-056');
console.log('\nAIMAL V details:', JSON.stringify({
  name: aimal?.data?.name,
  student_name: aimal?.data?.student_name,
  custom_branch: aimal?.data?.custom_branch,
  custom_srr_id: aimal?.data?.custom_srr_id
}, null, 2));
