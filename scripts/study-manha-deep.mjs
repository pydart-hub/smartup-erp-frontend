const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function studyManha() {
  console.log('=== 1. FIND STUDENT (MANHA NASIM / SRR 033 / Chullickal) ===');
  const p = new URLSearchParams();
  p.append('doctype', 'Student');
  p.append('fields', JSON.stringify(['name', 'student_name', 'first_name', 'custom_srr_id', 'custom_branch', 'customer', 'student_email_id', 'docstatus']));
  p.append('filters', JSON.stringify([['Student', 'custom_srr_id', 'like', '%33%'], ['Student', 'custom_branch', 'like', '%Chullickal%']]));
  
  const sList = await (await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: p.toString()
  })).json();
  console.log('Search student results:', sList.message);

  let studentId = 'STU-SU CHL-26-033';
  let customerName = 'MANHA NASIM';

  if (sList.message?.values?.length) {
    for (const row of sList.message.values) {
      if (row[1].includes('MANHA') || row[3] == '033' || row[3] == '33') {
        studentId = row[0];
        customerName = row[5] || row[1];
        console.log('Matched Student:', { id: studentId, name: row[1], srr: row[3], customer: customerName });
        break;
      }
    }
  }

  // Get full student doc
  const stRes = await fetch(`${baseUrl}/api/resource/Student/${studentId}`, { headers });
  const st = await stRes.json();
  console.log('Student Doc:', st.data ? {
    name: st.data.name,
    student_name: st.data.student_name,
    customer: st.data.customer,
    custom_srr_id: st.data.custom_srr_id,
    custom_branch: st.data.custom_branch
  } : 'Not found');

  if (st.data?.customer) {
    customerName = st.data.customer;
  }

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
  console.log('Sales Invoices:', JSON.stringify(invList.message?.values, null, 2));

  console.log('\n=== 5. PAYMENT ENTRIES ===');
  const peParams = new URLSearchParams();
  peParams.append('doctype', 'Payment Entry');
  peParams.append('fields', JSON.stringify(['name', 'posting_date', 'mode_of_payment', 'paid_amount', 'status', 'docstatus', 'remarks', 'reference_no', 'paid_to']));
  peParams.append('filters', JSON.stringify([['Payment Entry', 'party', '=', customerName]]));
  peParams.append('order_by', 'posting_date asc');

  const peList = await (await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: peParams.toString()
  })).json();
  console.log('Payment Entries:', JSON.stringify(peList.message?.values, null, 2));
}

studyManha().catch(console.error);
