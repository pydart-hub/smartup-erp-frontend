const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function studyStudent() {
  console.log('=== SEARCHING STUDENT AFRA NAVAS / SRR 053 ===');
  
  const p = new URLSearchParams();
  p.append('doctype', 'Student');
  p.append('fields', JSON.stringify(['name', 'student_name', 'first_name', 'custom_srr_id', 'custom_branch', 'customer', 'docstatus']));
  p.append('filters', JSON.stringify([['Student', 'custom_srr_id', 'like', '%053%']]));
  
  const sList = await (await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: p.toString()
  })).json();
  
  console.log('Student search results:', sList.message);
  
  let student = null;
  if (sList.message && sList.message.values) {
    const keys = sList.message.keys;
    for (const row of sList.message.values) {
      const obj = {};
      keys.forEach((k, idx) => obj[k] = row[idx]);
      console.log('Found row:', obj);
      if (obj.custom_srr_id === 'SRR 053' || (obj.student_name && obj.student_name.toUpperCase().includes('AFRA NAVAS'))) {
        student = obj;
      }
    }
  }

  const studentId = student?.name;
  const customerName = student?.customer;
  console.log('Selected student:', studentId, 'Customer:', customerName);

  if (studentId) {
    console.log('\n=== PROGRAM ENROLLMENT ===');
    const penRes = await fetch(`${baseUrl}/api/resource/Program Enrollment?filters=[["student","=","${encodeURIComponent(studentId)}"]]&fields=["*"]`, { headers });
    const pen = await penRes.json();
    console.log('Program Enrollment:', JSON.stringify(pen.data, null, 2));
  }

  if (customerName) {
    console.log('\n=== SALES ORDERS ===');
    const soRes = await (await fetch(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","${encodeURIComponent(customerName)}"]]&fields=["*"]`, { headers })).json();
    console.log('Sales Orders:', JSON.stringify(soRes.data, null, 2));

    console.log('\n=== SALES INVOICES ===');
    const invRes = await (await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${encodeURIComponent(customerName)}"]]&fields=["name","posting_date","due_date","grand_total","outstanding_amount","status","docstatus"]&order_by=due_date asc`, { headers })).json();
    console.log('Sales Invoices:', JSON.stringify(invRes.data, null, 2));

    console.log('\n=== PAYMENT ENTRIES ===');
    const peRes = await (await fetch(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","${encodeURIComponent(customerName)}"]]&fields=["name","posting_date","mode_of_payment","paid_amount","paid_to","paid_from","reference_no","docstatus"]&order_by=posting_date asc`, { headers })).json();
    console.log('Payment Entries:', JSON.stringify(peRes.data, null, 2));
  }
}

studyStudent().catch(console.error);
