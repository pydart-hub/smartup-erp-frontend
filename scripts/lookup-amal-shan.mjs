const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function api(path) {
  const r = await fetch(BASE + path, { headers: { Authorization: AUTH } });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`HTTP ${r.status}: ${t}`);
  }
  return r.json();
}

async function main() {
  console.log('=== Searching for AMAL SHAN K P ===');
  
  // Search student
  const students = await api('/api/resource/Student?filters=[["student_name","like","%AMAL SHAN%"]]&fields=["name","student_name","student_email_id","joining_date","enabled"]&limit=10');
  console.log('\nStudents found:', JSON.stringify(students.data, null, 2));

  if (!students.data || students.data.length === 0) {
    console.log('No student found. Trying broader search...');
    const s2 = await api('/api/resource/Student?filters=[["student_name","like","%AMAL%"]]&fields=["name","student_name","student_email_id","joining_date"]&limit=20');
    console.log('Broader search:', JSON.stringify(s2.data, null, 2));
    return;
  }

  const student = students.data[0];
  const studentId = student.name;
  console.log('\nStudent ID:', studentId);

  // Get fee schedule / payment entries for this student
  console.log('\n=== Fee Schedules ===');
  try {
    const fees = await api(`/api/resource/Fees?filters=[["student","=","${studentId}"]]&fields=["name","student","program","academic_term","due_date","grand_total","outstanding_amount","status"]&limit=20`);
    console.log(JSON.stringify(fees.data, null, 2));
  } catch(e) { console.log('Fees error:', e.message); }

  // Check student fee records
  console.log('\n=== Student Fee Records ===');
  try {
    const sfr = await api(`/api/resource/Student Fees?filters=[["student","=","${studentId}"]]&fields=["name","student","fee_schedule","due_date","amount","outstanding_amount","status"]&limit=20`);
    console.log(JSON.stringify(sfr.data, null, 2));
  } catch(e) { console.log('Student Fees error:', e.message); }

  // Check Payment Entries linked to this student
  console.log('\n=== Payment Entries ===');
  try {
    const pe = await api(`/api/resource/Payment Entry?filters=[["party","=","${studentId}"],["docstatus","!=",2]]&fields=["name","party","party_name","paid_amount","payment_type","mode_of_payment","reference_no","reference_date","status","docstatus"]&limit=20`);
    console.log(JSON.stringify(pe.data, null, 2));
  } catch(e) { console.log('PE error:', e.message); }

  // Search by Razorpay payment ID
  console.log('\n=== Search by Razorpay ID: pay_Sm5AAbdgSjRqFn ===');
  try {
    const rz = await api(`/api/resource/Payment Entry?filters=[["reference_no","=","pay_Sm5AAbdgSjRqFn"]]&fields=["name","party","party_name","paid_amount","payment_type","mode_of_payment","reference_no","reference_date","status","docstatus"]&limit=5`);
    console.log(JSON.stringify(rz.data, null, 2));
  } catch(e) { console.log('Razorpay search error:', e.message); }

  // Also check Razorpay Payment Log or custom doctype
  console.log('\n=== Razorpay Payment Log ===');
  try {
    const rzlog = await api(`/api/resource/Razorpay Payment Log?filters=[["payment_id","=","pay_Sm5AAbdgSjRqFn"]]&fields=["name","payment_id","amount","status","student","fee_schedule"]&limit=5`);
    console.log(JSON.stringify(rzlog.data, null, 2));
  } catch(e) { console.log('Razorpay Log error:', e.message); }
}

main().catch(console.error);
