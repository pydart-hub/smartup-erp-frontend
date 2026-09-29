const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function executeAlainaConversion() {
  console.log('=== STEP 1: AMEND PROGRAM ENROLLMENT TO BASIC (4 INSTALMENTS) ===');
  // 1a. Cancel existing Program Enrollment
  await fetch(`${baseUrl}/api/resource/Program Enrollment/PEN-10th-Chullickal 26-27-111`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  console.log('Cancelled old PEN');

  // 1b. Fetch original data
  const oldPen = await (await fetch(`${baseUrl}/api/resource/Program Enrollment/PEN-10th-Chullickal 26-27-111`, { headers })).json();
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
    custom_fee_structure: 'SU CHL-10th State-Basic-4',
    custom_plan: 'Basic',
    custom_no_of_instalments: '4',
    courses: dPen.courses?.map(c => ({ course: c.course })) || []
  };

  const createPen = await (await fetch(`${baseUrl}/api/resource/Program Enrollment`, {
    method: 'POST',
    headers,
    body: JSON.stringify(newPenPayload)
  })).json();
  console.log('Created amended PEN:', createPen.data?.name);

  const subPen = await (await fetch(`${baseUrl}/api/resource/Program Enrollment/${createPen.data.name}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 1 })
  })).json();
  console.log('Submitted amended PEN:', subPen.data?.name);

  console.log('\n=== STEP 2: UPDATE SALES ORDER PLAN TO BASIC ===');
  const soUpdate = await (await fetch(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00539`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ custom_plan: 'Basic' })
  })).json();
  console.log('Updated SO plan to Basic:', soUpdate.data?.custom_plan);

  console.log('\n=== STEP 3: CANCEL OLD INVOICES 2, 3, 4 & PAYMENT 2 ===');
  // Cancel Payment 2 ACC-PAY-2026-08111 first
  await fetch(`${baseUrl}/api/resource/Payment Entry/ACC-PAY-2026-08111`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  console.log('Cancelled ACC-PAY-2026-08111');

  // Cancel old invoices 2, 3, 4
  const invToCancel = [
    'ACC-SINV-2026-04667',
    'ACC-SINV-2026-04668',
    'ACC-SINV-2026-04669'
  ];
  for (const invName of invToCancel) {
    await fetch(`${baseUrl}/api/resource/Sales Invoice/${invName}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log(`Cancelled old invoice ${invName}`);
  }

  console.log('\n=== STEP 4: CREATE NEW INVOICES 2, 3, 4 (LINKED TO SAL-ORD-2026-00539) ===');
  // Inst 1: ACC-SINV-2026-04680 = 8300 (Already exists & paid via Razorpay)
  // Inst 2: Due 2026-07-15 = 4200
  // Inst 3: Due 2026-10-15 = 4200
  // Inst 4: Due 2027-01-15 = 2600

  const newInvoicesConfig = [
    { num: 2, due_date: '2026-07-15', amount: 4200 },
    { num: 3, due_date: '2026-10-15', amount: 4200 },
    { num: 4, due_date: '2027-01-15', amount: 2600 }
  ];

  const createdInvoices = {};

  for (const cfg of newInvoicesConfig) {
    const invPayload = {
      docstatus: 1,
      naming_series: 'ACC-SINV-.YYYY.-',
      customer: 'ALAINA GODWIN',
      company: 'Smart Up Chullickal',
      student: 'STU-SU CHL-26-111',
      custom_academic_year: '2026-2027',
      posting_date: '2026-04-17',
      posting_time: '10:28:47',
      set_posting_time: 1,
      due_date: cfg.due_date,
      debit_to: 'Debtors - SU CHL',
      items: [
        {
          item_code: '10th State Tuition Fee',
          item_name: '10th State Tuition Fee',
          description: `Inst ${cfg.num} — 10th State Tuition Fee`,
          qty: 1,
          rate: cfg.amount,
          amount: cfg.amount,
          income_account: 'Sales - SU CHL',
          cost_center: 'Main - SU CHL',
          sales_order: 'SAL-ORD-2026-00539',
          so_detail: 'ar2e0oqlha'
        }
      ]
    };

    const res = await (await fetch(`${baseUrl}/api/resource/Sales Invoice`, {
      method: 'POST',
      headers,
      body: JSON.stringify(invPayload)
    })).json();

    createdInvoices[cfg.num] = res.data?.name;
    console.log(`Created Inst ${cfg.num} (${cfg.amount} INR, due ${cfg.due_date}): ${res.data?.name}`);
  }

  console.log('\n=== STEP 5: RE-LINK PAYMENT 2 (ACC-PAY-2026-08111, 2400 INR CASH) ===');
  // Recreate amended PE for ACC-PAY-2026-08111
  const peOrig = await (await fetch(`${baseUrl}/api/resource/Payment Entry/ACC-PAY-2026-08111`, { headers })).json();
  const d = peOrig.data;

  const pePayload = {
    docstatus: 0,
    amended_from: d.name,
    payment_type: 'Receive',
    posting_date: d.posting_date, // 2026-08-31
    company: 'Smart Up Chullickal',
    mode_of_payment: d.mode_of_payment, // Cash
    party_type: 'Customer',
    party: 'ALAINA GODWIN',
    paid_from: d.paid_from, // Debtors - SU CHL
    paid_to: d.paid_to, // Cash - SU CHL
    paid_amount: d.paid_amount, // 2400
    received_amount: d.received_amount, // 2400
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: d.reference_no,
    reference_date: d.reference_date,
    remarks: `Amount INR ${d.paid_amount}.0 received from ALAINA GODWIN\nTransaction reference no ${d.reference_no} dated ${d.posting_date}\nAmount INR ${d.paid_amount}.0 against Sales Invoice ${createdInvoices[2]}`,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[2],
        total_amount: 4200,
        outstanding_amount: 4200,
        allocated_amount: 2400
      }
    ]
  };

  const createPeRes = await (await fetch(`${baseUrl}/api/resource/Payment Entry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(pePayload)
  })).json();
  console.log('Created amended PE2:', createPeRes.data?.name);

  if (createPeRes.data?.name) {
    const subPeRes = await (await fetch(`${baseUrl}/api/resource/Payment Entry/${createPeRes.data.name}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 1 })
    })).json();
    console.log('Submitted amended PE2:', subPeRes.data?.name);
  }

  console.log('\n=== EXECUTION COMPLETED ===');
}

executeAlainaConversion().catch(console.error);
