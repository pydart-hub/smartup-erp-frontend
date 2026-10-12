const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function studyFahana() {
  console.log('--- 1. Search Student FAHANA ---');
  let res = await fetch(`${baseUrl}/api/resource/Student?filters=[["first_name","like","%FAHANA%"]]&fields=["name","student_name","first_name","last_name","custom_branch","custom_batch","custom_academic_year","custom_course"]`, { headers });
  let data = await res.json();
  console.log('Student search by first_name:', JSON.stringify(data.data, null, 2));

  if (!data.data || data.data.length === 0) {
    let res2 = await fetch(`${baseUrl}/api/resource/Student?filters=[["student_name","like","%FAHANA%"]]&fields=["name","student_name","first_name","last_name"]`, { headers });
    let data2 = await res2.json();
    console.log('Student search by student_name:', JSON.stringify(data2.data, null, 2));
    if (data2.data) data = data2;
  }

  const studentId = data.data?.[0]?.name;
  if (!studentId) {
    console.log('Could not find student by name, trying search in eraveli branch students...');
    let branchRes = await fetch(`${baseUrl}/api/resource/Student?filters=[["custom_branch","like","%Eraveli%"]]&fields=["name","student_name","first_name"]&limit_page_length=200`, { headers });
    let branchData = await branchRes.json();
    let matches = branchData.data?.filter(s => s.student_name?.toLowerCase().includes('fahana') || s.first_name?.toLowerCase().includes('fahana'));
    console.log('Matches in Eraveli:', matches);
    return;
  }

  console.log(`\n--- 2. Full Student Details for ${studentId} ---`);
  let fullStudentRes = await fetch(`${baseUrl}/api/resource/Student/${studentId}`, { headers });
  let fullStudent = await fullStudentRes.json();
  console.log('Student details:', JSON.stringify(fullStudent.data, null, 2));

  console.log(`\n--- 3. Sales Orders for ${studentId} / ${fullStudent.data.student_name} ---`);
  let soRes = await fetch(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","${studentId}"]]&fields=["name","grand_total","status","docstatus","per_billed"]`, { headers });
  let soData = await soRes.json();
  if (!soData.data || soData.data.length === 0) {
    let soRes2 = await fetch(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","${fullStudent.data.student_name}"]]&fields=["name","grand_total","status","docstatus","per_billed"]`, { headers });
    soData = await soRes2.json();
  }
  console.log('Sales Orders:', JSON.stringify(soData.data, null, 2));

  if (soData.data && soData.data.length > 0) {
    for (const so of soData.data) {
      let soDetailRes = await fetch(`${baseUrl}/api/resource/Sales Order/${so.name}`, { headers });
      let soDetail = await soDetailRes.json();
      console.log(`\nSales Order Detail [${so.name}]:`);
      console.log('Grand Total:', soDetail.data.grand_total);
      console.log('Payment Schedule:', JSON.stringify(soDetail.data.payment_schedule, null, 2));
    }
  }

  console.log(`\n--- 4. Sales Invoices for ${studentId} ---`);
  // Try by custom_student or customer
  let invRes = await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["custom_student","=","${studentId}"]]&fields=["name","title","posting_date","due_date","grand_total","outstanding_amount","status","docstatus"]&order_by=due_date asc`, { headers });
  let invData = await invRes.json();
  if (!invData.data || invData.data.length === 0) {
    let invRes2 = await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${studentId}"]]&fields=["name","title","posting_date","due_date","grand_total","outstanding_amount","status","docstatus"]&order_by=due_date asc`, { headers });
    invData = await invRes2.json();
  }
  if (!invData.data || invData.data.length === 0) {
    let invRes3 = await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${fullStudent.data.student_name}"]]&fields=["name","title","posting_date","due_date","grand_total","outstanding_amount","status","docstatus"]&order_by=due_date asc`, { headers });
    invData = await invRes3.json();
  }
  console.log('Sales Invoices:', JSON.stringify(invData.data, null, 2));

  for (const inv of (invData.data || [])) {
    let invDetailRes = await fetch(`${baseUrl}/api/resource/Sales Invoice/${inv.name}`, { headers });
    let invDetail = await invDetailRes.json();
    console.log(`\nSales Invoice Detail [${inv.name}]:`);
    console.log('Posting Date:', invDetail.data.posting_date);
    console.log('Due Date:', invDetail.data.due_date);
    console.log('Grand Total:', invDetail.data.grand_total);
    console.log('Outstanding:', invDetail.data.outstanding_amount);
    console.log('Status:', invDetail.data.status, 'docstatus:', invDetail.data.docstatus);
    console.log('Items:', JSON.stringify(invDetail.data.items?.map(it => ({
      item_code: it.item_code,
      item_name: it.item_name,
      qty: it.qty,
      rate: it.rate,
      amount: it.amount
    })), null, 2));
  }

  console.log(`\n--- 5. Payment Entries for ${studentId} ---`);
  let peRes = await fetch(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","${studentId}"]]&fields=["name","posting_date","paid_amount","received_amount","mode_of_payment","docstatus","status","remarks","reference_no"]`, { headers });
  let peData = await peRes.json();
  if (!peData.data || peData.data.length === 0) {
    let peRes2 = await fetch(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","${fullStudent.data.student_name}"]]&fields=["name","posting_date","paid_amount","received_amount","mode_of_payment","docstatus","status","remarks","reference_no"]`, { headers });
    peData = await peRes2.json();
  }
  console.log('Payment Entries:', JSON.stringify(peData.data, null, 2));

  for (const pe of (peData.data || [])) {
    let peDetailRes = await fetch(`${baseUrl}/api/resource/Payment Entry/${pe.name}`, { headers });
    let peDetail = await peDetailRes.json();
    console.log(`\nPayment Entry Detail [${pe.name}]:`);
    console.log('Posting Date:', peDetail.data.posting_date);
    console.log('Mode:', peDetail.data.mode_of_payment);
    console.log('Paid Amount:', peDetail.data.paid_amount);
    console.log('Docstatus:', peDetail.data.docstatus);
    console.log('References:', JSON.stringify(peDetail.data.references, null, 2));
  }
}

studyFahana().catch(console.error);
