const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function checkEnrollment() {
  let peEnrollRes = await fetch(`${baseUrl}/api/resource/Program Enrollment?filters=[["student","=","STU-SU CHL-26-089"]]&fields=["*"]`, { headers });
  let peEnroll = await peEnrollRes.json();
  console.log('Program Enrollment:', peEnroll);

  // Check sibling STU-SU CHL-26-088 just to see how they are structured
  let sibRes = await fetch(`${baseUrl}/api/resource/Student/STU-SU CHL-26-088`, { headers });
  let sib = await sibRes.json();
  console.log('Sibling student:', sib.data ? {
    name: sib.data.name,
    student_name: sib.data.student_name,
    custom_sibling_of: sib.data.custom_sibling_of,
    custom_sibling_discount_applied: sib.data.custom_sibling_discount_applied
  } : 'Not found');

  if (sib.data?.customer) {
    let sibInv = await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${sib.data.customer}"]]&fields=["name","grand_total","outstanding_amount","items"]`, { headers });
    console.log('Sibling invoices:', await sibInv.json());
  }
}

checkEnrollment().catch(console.error);
