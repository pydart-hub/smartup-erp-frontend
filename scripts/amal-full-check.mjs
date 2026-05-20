const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

const api = async (url) => {
  const r = await fetch(url, { headers: { Authorization: AUTH } });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j).slice(0, 400));
  return j;
};

async function main() {
  const studentId = 'STU-SU KDV-26-011';
  
  // Full student record
  console.log('=== Full Student Record ===');
  const student = (await api(`${BASE}/api/resource/Student/${encodeURIComponent(studentId)}`)).data;
  console.log(JSON.stringify({
    name: student.name,
    student_name: student.student_name,
    customer: student.customer,
    student_applicant: student.student_applicant,
    enabled: student.enabled,
    joining_date: student.joining_date,
    student_email_id: student.student_email_id,
    student_mobile_number: student.student_mobile_number,
  }, null, 2));

  const customer = student.customer;
  console.log('\nCustomer ID:', customer);

  // Check Program Enrollment
  console.log('\n=== Program Enrollments ===');
  const pe = (await api(`${BASE}/api/resource/Program Enrollment?filters=[["student","=","${studentId}"]]&fields=["name","student","program","enrollment_date","academic_year","academic_term","student_batch_name"]&limit=10`)).data;
  console.log(JSON.stringify(pe, null, 2));

  // Check Student Applicant
  if (student.student_applicant) {
    console.log('\n=== Student Applicant ===');
    try {
      const sa = (await api(`${BASE}/api/resource/Student Applicant/${encodeURIComponent(student.student_applicant)}`)).data;
      console.log(JSON.stringify({
        name: sa.name,
        student_name: sa.student_name,
        program: sa.program,
        application_status: sa.application_status,
        fee_amount: sa.fee_amount,
      }, null, 2));
    } catch(e) { console.log('SA error:', e.message); }
  }

  // If customer linked, check sales invoices by customer
  if (customer) {
    console.log('\n=== Sales Invoices for customer:', customer, '===');
    try {
      const si = (await api(`${BASE}/api/resource/Sales Invoice?filters=[["customer","=","${customer}"]]&fields=["name","customer","customer_name","grand_total","outstanding_amount","docstatus","posting_date"]&limit=20`)).data;
      console.log(JSON.stringify(si, null, 2));
    } catch(e) { console.log('SI error:', e.message); }

    console.log('\n=== Payment Entries for customer:', customer, '===');
    try {
      const rzpe = (await api(`${BASE}/api/resource/Payment Entry?filters=[["party","=","${customer}"]]&fields=["name","party","party_name","paid_amount","mode_of_payment","reference_no","docstatus","posting_date"]&limit=20`)).data;
      console.log(JSON.stringify(rzpe, null, 2));
    } catch(e) { console.log('PE error:', e.message); }
  }

  // Search by Razorpay ID across Payment Entry
  console.log('\n=== Payment Entry with pay_Sm5AAbdgSjRqFn ===');
  try {
    const rz = (await api(`${BASE}/api/resource/Payment Entry?filters=[["reference_no","=","pay_Sm5AAbdgSjRqFn"]]&fields=["name","party","party_name","paid_amount","mode_of_payment","reference_no","docstatus","posting_date"]&limit=5`)).data;
    console.log(JSON.stringify(rz, null, 2));
  } catch(e) { console.log('error:', e.message); }
  
  // Check Payment Request
  console.log('\n=== Payment Requests ===');
  try {
    const prz = (await api(`${BASE}/api/resource/Payment Request?filters=[["party","=","${studentId}"]]&fields=["name","party","grand_total","status","docstatus"]&limit=10`)).data;
    console.log(JSON.stringify(prz, null, 2));
  } catch(e) { console.log('PR error:', e.message); }

  if (customer) {
    try {
      const prz2 = (await api(`${BASE}/api/resource/Payment Request?filters=[["party","=","${customer}"]]&fields=["name","party","grand_total","status","docstatus"]&limit=10`)).data;
      console.log('PR by customer:', JSON.stringify(prz2, null, 2));
    } catch(e) { console.log('PR2 error:', e.message); }
  }
}

main().catch(console.error);
