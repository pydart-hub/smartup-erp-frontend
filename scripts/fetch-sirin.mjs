const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function get(path) {
  const r = await fetch(BASE + path, { headers: { Authorization: AUTH } });
  return r.json();
}

// 1. Find student
const students = await get('/api/resource/Student?filters=[["student_name","like","%Sirin%"]]&fields=["name","student_name","custom_branch","customer"]');
console.log('=== STUDENTS ===');
console.log(JSON.stringify(students.data, null, 2));

if (!students.data?.length) { console.log('Not found'); process.exit(0); }

const student = students.data[0];
const sid = student.name;
console.log('\nStudent ID:', sid, '| Branch:', student.custom_branch);

// 2. Program Enrollments
const pe = await get(`/api/resource/Program Enrollment?filters=[["student","=","${sid}"]]&fields=["name","program","academic_year","student_batch_name","docstatus","enrollment_date","custom_fee_structure","custom_plan","custom_no_of_instalments"]&order_by=enrollment_date desc`);
console.log('\n=== PROGRAM ENROLLMENTS ===');
console.log(JSON.stringify(pe.data, null, 2));

// 3. Student Groups
const sg = await get(`/api/resource/Student Group?filters=[["students.student","=","${sid}"]]&fields=["name","program","batch","academic_year","custom_branch","max_strength"]`);
console.log('\n=== STUDENT GROUPS ===');
console.log(JSON.stringify(sg.data, null, 2));

// 4. Course Enrollments
const ce = await get(`/api/resource/Course Enrollment?filters=[["student","=","${sid}"]]&fields=["name","course","program_enrollment","custom_batch_name","creation"]&order_by=creation desc&limit=20`);
console.log('\n=== COURSE ENROLLMENTS ===');
console.log(JSON.stringify(ce.data, null, 2));

// 5. Sales Orders
const so = await get(`/api/resource/Sales Order?filters=[["student","=","${sid}"]]&fields=["name","status","grand_total","custom_program","custom_batch","docstatus"]&order_by=creation desc&limit=5`);
console.log('\n=== SALES ORDERS ===');
console.log(JSON.stringify(so.data, null, 2));
