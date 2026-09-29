const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function studyRebecca() {
  console.log('=== 1. STUDENT RECORD ===');
  const stRes = await fetch(`${baseUrl}/api/resource/Student/STU-SU CHL-26-088`, { headers });
  const st = await stRes.json();
  console.log('Student:', JSON.stringify(st.data, null, 2));

  console.log('\n=== 2. PROGRAM ENROLLMENT ===');
  const penRes = await fetch(`${baseUrl}/api/resource/Program Enrollment?filters=[["student","=","STU-SU CHL-26-088"]]&fields=["*"]`, { headers });
  const pen = await penRes.json();
  console.log('Program Enrollment:', JSON.stringify(pen.data, null, 2));

  console.log('\n=== 3. SALES INVOICES ===');
  const invParams = new URLSearchParams();
  invParams.append('doctype', 'Sales Invoice');
  invParams.append('fields', JSON.stringify(['name', 'title', 'customer', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status', 'docstatus', 'is_return', 'return_against', 'remarks']));
  invParams.append('filters', JSON.stringify([['Sales Invoice', 'customer', '=', 'REBECCA DANY']]));

  const invListRes = await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: invParams.toString()
  });
  const invList = await invListRes.json();
  console.log('Sales Invoices:', JSON.stringify(invList.message, null, 2));

  // Get full details for each invoice
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
          qty: it.qty,
          rate: it.rate,
          amount: it.amount,
          sales_order: it.sales_order,
          so_detail: it.so_detail
        }))
      });
    }
  }

  console.log('\n=== 4. PAYMENT ENTRIES ===');
  const peParams = new URLSearchParams();
  peParams.append('doctype', 'Payment Entry');
  peParams.append('fields', JSON.stringify(['name', 'posting_date', 'mode_of_payment', 'paid_amount', 'status', 'docstatus', 'remarks']));
  peParams.append('filters', JSON.stringify([['Payment Entry', 'party', '=', 'REBECCA DANY']]));

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
        references: peDetail.data?.references?.map(r => ({
          reference_doctype: r.reference_doctype,
          reference_name: r.reference_name,
          total_amount: r.total_amount,
          outstanding_amount: r.outstanding_amount,
          allocated_amount: r.allocated_amount
        }))
      });
    }
  }

  console.log('\n=== 5. SALES ORDERS ===');
  const soParams = new URLSearchParams();
  soParams.append('doctype', 'Sales Order');
  soParams.append('fields', JSON.stringify(['name', 'transaction_date', 'grand_total', 'status', 'docstatus', 'custom_plan', 'custom_no_of_instalments', 'per_billed']));
  soParams.append('filters', JSON.stringify([['Sales Order', 'customer', '=', 'REBECCA DANY']]));

  const soListRes = await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: soParams.toString()
  });
  const soList = await soListRes.json();
  console.log('Sales Orders:', JSON.stringify(soList.message, null, 2));
}

studyRebecca().catch(console.error);
