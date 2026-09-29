const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function studyRizwana() {
  console.log('=== 1. SEARCH STUDENT (RIZWANA / SRR 030) ===');
  let stRes = await fetch(`${baseUrl}/api/resource/Student/STU-SU CHL-26-030`, { headers });
  let st = await stRes.json();
  if (!st.data) {
    // Try search
    const p = new URLSearchParams();
    p.append('doctype', 'Student');
    p.append('fields', JSON.stringify(['name', 'student_name', 'first_name', 'custom_srr_id', 'custom_branch', 'customer']));
    p.append('filters', JSON.stringify([['Student', 'student_name', 'like', '%RIZWANA%']]));
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

  const studentId = st.data?.name || 'STU-SU CHL-26-030';
  const customerName = st.data?.customer || 'RIZWANA S A';

  console.log('\n=== 2. PROGRAM ENROLLMENT ===');
  const penRes = await fetch(`${baseUrl}/api/resource/Program Enrollment?filters=[["student","=","${studentId}"]]&fields=["*"]`, { headers });
  const pen = await penRes.json();
  console.log('Program Enrollment:', JSON.stringify(pen.data, null, 2));

  console.log('\n=== 3. SALES INVOICES ===');
  const invParams = new URLSearchParams();
  invParams.append('doctype', 'Sales Invoice');
  invParams.append('fields', JSON.stringify(['name', 'title', 'customer', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status', 'docstatus', 'is_return', 'return_against', 'remarks']));
  invParams.append('filters', JSON.stringify([['Sales Invoice', 'customer', '=', customerName]]));

  const invListRes = await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: invParams.toString()
  });
  const invList = await invListRes.json();
  console.log('Sales Invoices:', JSON.stringify(invList.message, null, 2));

  if (invList.message?.values) {
    for (const row of invList.message.values) {
      const invName = row[0];
      const invDetailRes = await fetch(`${baseUrl}/api/resource/Sales Invoice/${invName}`, { headers });
      const invDetail = await invDetailRes.json();
      console.log(`\nInvoice Detail [${invName}]:`, {
        name: invDetail.data?.name,
        posting_date: invDetail.data?.posting_date,
        due_date: invDetail.data?.due_date,
        grand_total: invDetail.data?.grand_total,
        outstanding_amount: invDetail.data?.outstanding_amount,
        is_return: invDetail.data?.is_return,
        return_against: invDetail.data?.return_against,
        items: invDetail.data?.items?.map(it => ({
          name: it.name,
          item_code: it.item_code,
          description: it.description,
          qty: it.qty,
          rate: it.rate,
          amount: it.amount,
          sales_order: it.sales_order,
          so_detail: it.so_detail
        })),
        payment_schedule: invDetail.data?.payment_schedule
      });
    }
  }

  console.log('\n=== 4. PAYMENT ENTRIES ===');
  const peParams = new URLSearchParams();
  peParams.append('doctype', 'Payment Entry');
  peParams.append('fields', JSON.stringify(['name', 'posting_date', 'mode_of_payment', 'paid_amount', 'status', 'docstatus', 'remarks']));
  peParams.append('filters', JSON.stringify([['Payment Entry', 'party', '=', customerName]]));

  const peListRes = await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: peParams.toString()
  });
  const peList = await peListRes.json();
  console.log('Payment Entries:', JSON.stringify(peList.message, null, 2));

  if (peList.message?.values) {
    for (const row of peList.message.values) {
      const peName = row[0];
      const peDetailRes = await fetch(`${baseUrl}/api/resource/Payment Entry/${peName}`, { headers });
      const peDetail = await peDetailRes.json();
      console.log(`\nPayment Detail [${peName}]:`, {
        name: peDetail.data?.name,
        posting_date: peDetail.data?.posting_date,
        mode_of_payment: peDetail.data?.mode_of_payment,
        paid_amount: peDetail.data?.paid_amount,
        reference_no: peDetail.data?.reference_no,
        reference_date: peDetail.data?.reference_date,
        docstatus: peDetail.data?.docstatus,
        status: peDetail.data?.status,
        remarks: peDetail.data?.remarks,
        references: peDetail.data?.references
      });
    }
  }

  console.log('\n=== 5. SALES ORDERS ===');
  const soParams = new URLSearchParams();
  soParams.append('doctype', 'Sales Order');
  soParams.append('fields', JSON.stringify(['name', 'transaction_date', 'grand_total', 'status', 'docstatus', 'custom_plan', 'custom_no_of_instalments', 'per_billed']));
  soParams.append('filters', JSON.stringify([['Sales Order', 'customer', '=', customerName]]));

  const soListRes = await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: soParams.toString()
  });
  const soList = await soListRes.json();
  console.log('Sales Orders:', JSON.stringify(soList.message, null, 2));

  if (soList.message?.values) {
    for (const row of soList.message.values) {
      const soName = row[0];
      const soDetailRes = await fetch(`${baseUrl}/api/resource/Sales Order/${soName}`, { headers });
      const soDetail = await soDetailRes.json();
      console.log(`\nSO Detail [${soName}]:`, {
        name: soDetail.data?.name,
        grand_total: soDetail.data?.grand_total,
        custom_plan: soDetail.data?.custom_plan,
        custom_no_of_instalments: soDetail.data?.custom_no_of_instalments,
        items: soDetail.data?.items?.map(it => ({
          name: it.name,
          item_code: it.item_code,
          description: it.description,
          qty: it.qty,
          rate: it.rate,
          amount: it.amount
        })),
        payment_schedule: soDetail.data?.payment_schedule
      });
    }
  }

  console.log('\n=== 6. FEE STRUCTURE CANDIDATES (SU CHL 10th State Basic) ===');
  const fstCandidates = [
    'SU CHL-10th State-Basic-8',
    'SU CHL-10th State-Basic-1',
    'SU CHL-10th State-Basic'
  ];
  for (const c of fstCandidates) {
    let r = await fetch(`${baseUrl}/api/resource/Fee Structure/${encodeURIComponent(c)}`, { headers });
    let d = await r.json();
    if (d.data) {
      console.log('Found Fee Structure:', d.data.name, 'total_amount:', d.data.total_amount, 'components:', d.data.components?.map(cp => ({ category: cp.fees_category, amount: cp.amount })));
    }
  }
}

studyRizwana().catch(console.error);
