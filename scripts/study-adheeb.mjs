const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function studyStudent() {
  console.log('=== SEARCHING STUDENT ADHEEB RILLAH K U / SRR 058 ===');
  
  // Search student
  const p = new URLSearchParams();
  p.append('doctype', 'Student');
  p.append('fields', JSON.stringify(['name', 'student_name', 'first_name', 'custom_srr_id', 'custom_branch', 'customer', 'docstatus']));
  p.append('filters', JSON.stringify([['Student', 'student_name', 'like', '%ADHEEB%']]));
  
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
      if (obj.custom_srr_id === 'SRR 058' || (obj.student_name && obj.student_name.includes('ADHEEB'))) {
        student = obj;
      }
    }
  }

  if (!student) {
    // try searching by SRR
    const p2 = new URLSearchParams();
    p2.append('doctype', 'Student');
    p2.append('fields', JSON.stringify(['name', 'student_name', 'first_name', 'custom_srr_id', 'custom_branch', 'customer', 'docstatus']));
    p2.append('filters', JSON.stringify([['Student', 'custom_srr_id', 'like', '%058%']]));
    const sList2 = await (await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: p2.toString()
    })).json();
    console.log('SRR search results:', sList2.message);
  }

  const studentId = student?.name;
  const customerName = student?.customer;
  console.log('Selected student:', studentId, 'Customer:', customerName);

  if (studentId) {
    console.log('\n=== FULL STUDENT DOC ===');
    const stFull = await (await fetch(`${baseUrl}/api/resource/Student/${encodeURIComponent(studentId)}`, { headers })).json();
    console.log('Student doc:', JSON.stringify(stFull.data, null, 2));

    console.log('\n=== PROGRAM ENROLLMENT ===');
    const penRes = await fetch(`${baseUrl}/api/resource/Program Enrollment?filters=[["student","=","${encodeURIComponent(studentId)}"]]&fields=["*"]`, { headers });
    const pen = await penRes.json();
    console.log('Program Enrollment:', JSON.stringify(pen.data, null, 2));
  }

  if (customerName) {
    console.log('\n=== SALES ORDERS ===');
    const soRes = await (await fetch(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","${encodeURIComponent(customerName)}"]]&fields=["*"]`, { headers })).json();
    console.log('Sales Orders:', JSON.stringify(soRes.data, null, 2));

    if (soRes.data && soRes.data.length > 0) {
      for (const so of soRes.data) {
        console.log(`\n--- Detailed SO: ${so.name} ---`);
        const fullSO = await (await fetch(`${baseUrl}/api/resource/Sales Order/${encodeURIComponent(so.name)}`, { headers })).json();
        console.log('SO Items:', JSON.stringify(fullSO.data.items, null, 2));
        console.log('SO Payment Schedule:', JSON.stringify(fullSO.data.payment_schedule, null, 2));
      }
    }

    console.log('\n=== SALES INVOICES ===');
    const invRes = await (await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${encodeURIComponent(customerName)}"]]&fields=["*"]&order_by=posting_date asc`, { headers })).json();
    console.log('Sales Invoices:', JSON.stringify(invRes.data, null, 2));

    if (invRes.data && invRes.data.length > 0) {
      for (const inv of invRes.data) {
        console.log(`\n--- Detailed Invoice: ${inv.name} ---`);
        const fullInv = await (await fetch(`${baseUrl}/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}`, { headers })).json();
        console.log('Invoice basic info:', {
          name: fullInv.data.name,
          posting_date: fullInv.data.posting_date,
          due_date: fullInv.data.due_date,
          grand_total: fullInv.data.grand_total,
          outstanding_amount: fullInv.data.outstanding_amount,
          status: fullInv.data.status,
          docstatus: fullInv.data.docstatus
        });
        console.log('Invoice items:', JSON.stringify(fullInv.data.items, null, 2));
        console.log('Invoice payments:', JSON.stringify(fullInv.data.payments, null, 2));
      }
    }

    console.log('\n=== PAYMENT ENTRIES ===');
    const peRes = await (await fetch(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","${encodeURIComponent(customerName)}"]]&fields=["*"]&order_by=posting_date asc`, { headers })).json();
    console.log('Payment Entries:', JSON.stringify(peRes.data, null, 2));

    if (peRes.data && peRes.data.length > 0) {
      for (const pe of peRes.data) {
        console.log(`\n--- Detailed PE: ${pe.name} ---`);
        const fullPE = await (await fetch(`${baseUrl}/api/resource/Payment Entry/${encodeURIComponent(pe.name)}`, { headers })).json();
        console.log('PE info:', {
          name: fullPE.data.name,
          posting_date: fullPE.data.posting_date,
          mode_of_payment: fullPE.data.mode_of_payment,
          paid_amount: fullPE.data.paid_amount,
          received_amount: fullPE.data.received_amount,
          status: fullPE.data.status,
          docstatus: fullPE.data.docstatus,
          references: fullPE.data.references
        });
      }
    }
  }
}

studyStudent().catch(console.error);
