const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function run() {
  console.log('--- 1. Searching Student REICHAL DANY / SRR 089 ---');
  let res = await fetch(`${baseUrl}/api/resource/Student?filters=[["first_name","like","%REICHAL%"]]&fields=["name","student_name","first_name","last_name","custom_registration_no","custom_branch","custom_batch","custom_academic_year","custom_course"]`, { headers });
  let data = await res.json();
  console.log('Student search by name:', JSON.stringify(data.data, null, 2));

  if (!data.data || data.data.length === 0) {
    let res2 = await fetch(`${baseUrl}/api/resource/Student?filters=[["custom_registration_no","like","%089%"]]&fields=["name","student_name","first_name","last_name","custom_registration_no","custom_branch","custom_batch","custom_academic_year","custom_course"]`, { headers });
    let data2 = await res2.json();
    console.log('Student search by reg no 089:', JSON.stringify(data2.data, null, 2));
  }

  const studentId = data.data?.[0]?.name;
  if (!studentId) {
    console.log('Could not find student!');
    return;
  }

  console.log(`\n--- 2. Full Student Details for ${studentId} ---`);
  let fullStudentRes = await fetch(`${baseUrl}/api/resource/Student/${studentId}`, { headers });
  let fullStudent = await fullStudentRes.json();
  console.log('Student details:', JSON.stringify(fullStudent.data, null, 2));

  console.log(`\n--- 3. Sales Invoices for ${studentId} ---`);
  let invRes = await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["custom_student","=","${studentId}"]]&fields=["name","title","posting_date","grand_total","outstanding_amount","status","docstatus"]`, { headers });
  let invData = await invRes.json();
  console.log('Sales Invoices:', JSON.stringify(invData.data, null, 2));

  for (const inv of (invData.data || [])) {
    let invDetailRes = await fetch(`${baseUrl}/api/resource/Sales Invoice/${inv.name}`, { headers });
    let invDetail = await invDetailRes.json();
    console.log(`\nSales Invoice Detail [${inv.name}]:`);
    console.log('Grand Total:', invDetail.data.grand_total);
    console.log('Outstanding:', invDetail.data.outstanding_amount);
    console.log('Items:', JSON.stringify(invDetail.data.items?.map(it => ({
      item_code: it.item_code,
      item_name: it.item_name,
      qty: it.qty,
      rate: it.rate,
      amount: it.amount
    })), null, 2));
    console.log('Payments linked:', JSON.stringify(invDetail.data.payments, null, 2));
  }

  console.log(`\n--- 4. Payment Entries for ${studentId} ---`);
  let peRes = await fetch(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","${studentId}"]]&fields=["name","posting_date","paid_amount","received_amount","mode_of_payment","docstatus","status"]`, { headers });
  let peData = await peRes.json();
  console.log('Payment Entries (by party):', JSON.stringify(peData.data, null, 2));

  // Also check payment entry reference table if party wasn't direct
  if (!peData.data || peData.data.length === 0) {
    let peRefRes = await fetch(`${baseUrl}/api/resource/Payment Entry Reference?filters=[["reference_doctype","=","Sales Invoice"]]&fields=["parent","reference_name","allocated_amount"]&limit_page_length=50`, { headers });
    let peRefData = await peRefRes.json();
    console.log('Some payment entry references:', peRefData.data?.filter(r => invData.data?.some(inv => inv.name === r.reference_name)));
  }

  for (const pe of (peData.data || [])) {
    let peDetailRes = await fetch(`${baseUrl}/api/resource/Payment Entry/${pe.name}`, { headers });
    let peDetail = await peDetailRes.json();
    console.log(`\nPayment Entry Detail [${pe.name}]:`, JSON.stringify({
      name: peDetail.data.name,
      posting_date: peDetail.data.posting_date,
      mode_of_payment: peDetail.data.mode_of_payment,
      paid_amount: peDetail.data.paid_amount,
      received_amount: peDetail.data.received_amount,
      references: peDetail.data.references,
      docstatus: peDetail.data.docstatus
    }, null, 2));
  }

  console.log(`\n--- 5. Program Enrollment / Fee Structure / Other Links ---`);
  let peEnrollRes = await fetch(`${baseUrl}/api/resource/Program Enrollment?filters=[["student","=","${studentId}"]]&fields=["*"]`, { headers });
  let peEnrollData = await peEnrollRes.json();
  console.log('Program Enrollment:', JSON.stringify(peEnrollData.data, null, 2));

  let feesRes = await fetch(`${baseUrl}/api/resource/Fees?filters=[["student","=","${studentId}"]]&fields=["*"]`, { headers });
  let feesData = await feesRes.json();
  console.log('Fees doctype records (if any):', JSON.stringify(feesData.data, null, 2));
}

run().catch(console.error);
