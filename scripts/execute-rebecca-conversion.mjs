const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function executeRebeccaConversion() {
  console.log('=== STEP 1: AMEND PROGRAM ENROLLMENT TO BASIC ===');
  // 1a. Cancel existing Program Enrollment
  const cPenRes = await fetch(`${baseUrl}/api/resource/Program Enrollment/PEN-12sc state-Chullickal 26-27-088`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  const cPen = await cPenRes.json();
  console.log('Cancelled old PEN:', cPen.data?.name);

  // 1b. Fetch original data
  const oldPen = await (await fetch(`${baseUrl}/api/resource/Program Enrollment/PEN-12sc state-Chullickal 26-27-088`, { headers })).json();
  const dPen = oldPen.data;

  // 1c. Create amended PEN
  const newPenPayload = {
    docstatus: 0,
    amended_from: dPen.name,
    student: dPen.student,
    custom_student_srr: dPen.custom_student_srr,
    student_name: dPen.student_name,
    enrollment_date: dPen.enrollment_date,
    program: dPen.program,
    custom_program_abb: dPen.custom_program_abb,
    academic_year: dPen.academic_year,
    student_batch_name: dPen.student_batch_name,
    custom_fee_structure: 'SU CHL-12th Science State-Basic-1',
    custom_plan: 'Basic',
    custom_no_of_instalments: '1',
    courses: dPen.courses?.map(c => ({ course: c.course })) || []
  };

  const createPenRes = await fetch(`${baseUrl}/api/resource/Program Enrollment`, {
    method: 'POST',
    headers,
    body: JSON.stringify(newPenPayload)
  });
  const createdPen = await createPenRes.json();
  console.log('Created amended PEN:', createdPen.data?.name);

  // 1d. Submit amended PEN
  const subPenRes = await fetch(`${baseUrl}/api/resource/Program Enrollment/${createdPen.data.name}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 1 })
  });
  const subPen = await subPenRes.json();
  console.log('Submitted amended PEN:', subPen.data?.name, 'docstatus:', subPen.data?.docstatus);

  console.log('\n=== STEP 2: CREATE & SUBMIT NEW SALES ORDER ===');
  const soPayload = {
    customer: 'REBECCA DANY',
    student: 'STU-SU CHL-26-088',
    company: 'Smart Up Chullickal',
    transaction_date: '2026-04-13',
    delivery_date: '2026-04-13',
    custom_academic_year: '2026-2027',
    custom_plan: 'Basic',
    custom_no_of_instalments: '1',
    items: [
      {
        item_code: '12th Science State Tuition Fee',
        qty: 1,
        rate: 16500,
        delivery_date: '2026-04-13',
        cost_center: 'Main - SU CHL'
      }
    ]
  };

  const createSoRes = await fetch(`${baseUrl}/api/resource/Sales Order`, {
    method: 'POST',
    headers,
    body: JSON.stringify(soPayload)
  });
  const createdSo = await createSoRes.json();
  console.log('Created new SO draft:', createdSo.data?.name);

  const subSoRes = await fetch(`${baseUrl}/api/resource/Sales Order/${createdSo.data.name}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 1 })
  });
  const subSo = await subSoRes.json();
  console.log('Submitted new SO:', subSo.data?.name, 'docstatus:', subSo.data?.docstatus);

  console.log('\n=== STEP 3: CREATE & SUBMIT NEW SALES INVOICE ===');
  const soItem = subSo.data.items[0];
  const sinvPayload = {
    customer: 'REBECCA DANY',
    student: 'STU-SU CHL-26-088',
    custom_student_email: 'jepsydany85@gmail.com',
    company: 'Smart Up Chullickal',
    custom_academic_year: '2026-2027',
    posting_date: '2026-04-13',
    posting_time: '19:33:11',
    set_posting_time: 1,
    due_date: '2026-04-13',
    debit_to: 'Debtors - SU CHL',
    items: [
      {
        item_code: '12th Science State Tuition Fee',
        item_name: '12th Science State Tuition Fee',
        description: 'Full Payment — 12th Science State Tuition Fee',
        qty: 1,
        rate: 16500,
        amount: 16500,
        income_account: 'Sales - SU CHL',
        cost_center: 'Main - SU CHL',
        sales_order: subSo.data.name,
        so_detail: soItem.name
      }
    ]
  };

  const createSinvRes = await fetch(`${baseUrl}/api/resource/Sales Invoice`, {
    method: 'POST',
    headers,
    body: JSON.stringify(sinvPayload)
  });
  const createdSinv = await createSinvRes.json();
  console.log('Created new SINV draft:', createdSinv.data?.name);

  const subSinvRes = await fetch(`${baseUrl}/api/resource/Sales Invoice/${createdSinv.data.name}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 1 })
  });
  const subSinv = await subSinvRes.json();
  const newInvoiceName = subSinv.data.name;
  console.log('Submitted new SINV:', newInvoiceName, 'grand_total:', subSinv.data?.grand_total, 'docstatus:', subSinv.data?.docstatus);

  console.log('\n=== STEP 4: RE-LINK PAYMENT 1 (ACC-PAY-2026-04281, 1000 INR) ===');
  // 4a. Cancel original PE1
  await fetch(`${baseUrl}/api/resource/Payment Entry/ACC-PAY-2026-04281`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  console.log('Cancelled old PE1');

  // 4b. Fetch original PE1
  const pe1Orig = await (await fetch(`${baseUrl}/api/resource/Payment Entry/ACC-PAY-2026-04281`, { headers })).json();
  const d1 = pe1Orig.data;

  // 4c. Create amended PE1
  const pe1Payload = {
    docstatus: 0,
    amended_from: d1.name,
    payment_type: 'Receive',
    posting_date: d1.posting_date,
    company: d1.company,
    mode_of_payment: d1.mode_of_payment,
    party_type: d1.party_type,
    party: d1.party,
    paid_from: d1.paid_from,
    paid_to: d1.paid_to,
    paid_amount: d1.paid_amount,
    received_amount: d1.received_amount,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: d1.reference_no,
    reference_date: d1.reference_date,
    remarks: `Amount INR 1000.0 received from REBECCA DANY\nTransaction reference no ${d1.reference_no} dated ${d1.reference_date}\nAmount INR 1000.0 against Sales Invoice ${newInvoiceName}`,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: newInvoiceName,
        total_amount: 16500,
        outstanding_amount: 16500,
        allocated_amount: 1000
      }
    ]
  };

  const createPe1Res = await fetch(`${baseUrl}/api/resource/Payment Entry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(pe1Payload)
  });
  const createdPe1 = await createPe1Res.json();
  console.log('Created amended PE1:', createdPe1.data?.name);

  await fetch(`${baseUrl}/api/resource/Payment Entry/${createdPe1.data.name}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 1 })
  });
  console.log('Submitted amended PE1:', createdPe1.data?.name);

  console.log('\n=== STEP 5: RE-LINK PAYMENT 2 (ACC-PAY-2026-04685, 10000 INR) ===');
  // 5a. Cancel original PE2
  await fetch(`${baseUrl}/api/resource/Payment Entry/ACC-PAY-2026-04685`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  console.log('Cancelled old PE2');

  // 5b. Fetch original PE2
  const pe2Orig = await (await fetch(`${baseUrl}/api/resource/Payment Entry/ACC-PAY-2026-04685`, { headers })).json();
  const d2 = pe2Orig.data;

  // 5c. Create amended PE2
  const pe2Payload = {
    docstatus: 0,
    amended_from: d2.name,
    payment_type: 'Receive',
    posting_date: d2.posting_date,
    company: d2.company,
    mode_of_payment: d2.mode_of_payment,
    party_type: d2.party_type,
    party: d2.party,
    paid_from: d2.paid_from,
    paid_to: d2.paid_to,
    paid_amount: d2.paid_amount,
    received_amount: d2.received_amount,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: d2.reference_no,
    reference_date: d2.reference_date,
    remarks: `Amount INR 10000.0 received from REBECCA DANY\nTransaction reference no ${d2.reference_no} dated ${d2.reference_date}\nAmount INR 10000.0 against Sales Invoice ${newInvoiceName}`,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: newInvoiceName,
        total_amount: 16500,
        outstanding_amount: 15500,
        allocated_amount: 10000
      }
    ]
  };

  const createPe2Res = await fetch(`${baseUrl}/api/resource/Payment Entry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(pe2Payload)
  });
  const createdPe2 = await createPe2Res.json();
  console.log('Created amended PE2:', createdPe2.data?.name);

  await fetch(`${baseUrl}/api/resource/Payment Entry/${createdPe2.data.name}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 1 })
  });
  console.log('Submitted amended PE2:', createdPe2.data?.name);

  console.log('\n=== STEP 6: CANCEL OLD INVOICES & SALES ORDER ===');
  // 6a. Cancel return invoice ACC-SINV-2026-04062
  const cRet = await fetch(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-04062`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  console.log('Cancelled old return invoice:', (await cRet.json()).data?.name);

  // 6b. Cancel old sales invoice ACC-SINV-2026-04052
  const cInv = await fetch(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-04052`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  console.log('Cancelled old sales invoice:', (await cInv.json()).data?.name);

  // 6c. Cancel old sales order SAL-ORD-2026-00443
  const cSo = await fetch(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00443`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  console.log('Cancelled old sales order:', (await cSo.json()).data?.name);

  console.log('\n=== STEP 7: VERIFICATION ===');
  const finalInv = await (await fetch(`${baseUrl}/api/resource/Sales Invoice/${newInvoiceName}`, { headers })).json();
  console.log('New Sales Invoice Final State:', {
    name: finalInv.data?.name,
    grand_total: finalInv.data?.grand_total,
    outstanding_amount: finalInv.data?.outstanding_amount,
    docstatus: finalInv.data?.docstatus,
    status: finalInv.data?.status
  });
}

executeRebeccaConversion().catch(console.error);
