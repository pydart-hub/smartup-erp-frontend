const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function studyJuvairiya() {
  console.log('=== 1. STUDENT RECORD (JUVAIRIYA P M / SRR 271) ===');
  let stRes = await fetch(`${baseUrl}/api/resource/Student/STU-SU CHL-26-271`, { headers });
  let st = await stRes.json();
  if (!st.data) {
    const p = new URLSearchParams();
    p.append('doctype', 'Student');
    p.append('fields', JSON.stringify(['name', 'student_name', 'first_name', 'custom_srr_id', 'custom_branch', 'customer']));
    p.append('filters', JSON.stringify([['Student', 'student_name', 'like', '%JUVAIRIYA%']]));
    const sList = await (await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: p.toString()
    })).json();
    console.log('Search student results:', sList.message);
  } else {
    console.log('Student found:', {
      name: st.data.name,
      student_name: st.data.student_name,
      customer: st.data.customer,
      custom_srr_id: st.data.custom_srr_id,
      custom_branch: st.data.custom_branch,
      student_email_id: st.data.student_email_id,
      docstatus: st.data.docstatus
    });
  }

  const studentId = st.data?.name || 'STU-SU CHL-26-271';
  const customerName = st.data?.customer || 'JUVAIRIYA P M';

  console.log('\n=== 2. PROGRAM ENROLLMENT ===');
  const penRes = await fetch(`${baseUrl}/api/resource/Program Enrollment?filters=[["student","=","${studentId}"]]&fields=["*"]`, { headers });
  const pen = await penRes.json();
  console.log('Program Enrollment:', JSON.stringify(pen.data, null, 2));

  console.log('\n=== 3. SALES ORDERS ===');
  const soParams = new URLSearchParams();
  soParams.append('doctype', 'Sales Order');
  soParams.append('fields', JSON.stringify(['name', 'transaction_date', 'grand_total', 'status', 'docstatus', 'custom_plan', 'custom_no_of_instalments', 'per_billed']));
  soParams.append('filters', JSON.stringify([['Sales Order', 'customer', '=', customerName]]));

  const soList = await (await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: soParams.toString()
  })).json();
  console.log('Sales Orders:', JSON.stringify(soList.message, null, 2));

  console.log('\n=== 4. SALES INVOICES ===');
  const invParams = new URLSearchParams();
  invParams.append('doctype', 'Sales Invoice');
  invParams.append('fields', JSON.stringify(['name', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status', 'docstatus']));
  invParams.append('filters', JSON.stringify([['Sales Invoice', 'customer', '=', customerName]]));
  invParams.append('order_by', 'due_date asc');

  const invList = await (await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: invParams.toString()
  })).json();
  console.log('Sales Invoices:', JSON.stringify(invList.message, null, 2));

  console.log('\n=== 5. PAYMENT ENTRIES ===');
  const peParams = new URLSearchParams();
  peParams.append('doctype', 'Payment Entry');
  peParams.append('fields', JSON.stringify(['name', 'posting_date', 'mode_of_payment', 'paid_amount', 'status', 'docstatus', 'remarks', 'reference_no']));
  peParams.append('filters', JSON.stringify([['Payment Entry', 'party', '=', customerName]]));
  peParams.append('order_by', 'posting_date asc');

  const peList = await (await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: peParams.toString()
  })).json();
  console.log('Payment Entries:', JSON.stringify(peList.message, null, 2));

  console.log('\n=== 6. BASIC FEE STRUCTURE CANDIDATES (SU CHL 8th State Basic 8) ===');
  const fstCandidates = [
    'SU CHL-8th State-Basic-8',
    'SU CHL-8th State-Basic-1',
    'SU CHL-8th State-Basic-4'
  ];
  for (const c of fstCandidates) {
    let r = await fetch(`${baseUrl}/api/resource/Fee Structure/${encodeURIComponent(c)}`, { headers });
    let d = await r.json();
    if (d.data) {
      console.log('Found Fee Structure:', d.data.name, 'total_amount:', d.data.total_amount, 'plan:', d.data.custom_plan, 'instalments:', d.data.custom_no_of_instalments);
    }
  }
}

studyJuvairiya().catch(console.error);
