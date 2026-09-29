const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function executeJuvairiyaConversion() {
  console.log('=== STEP 1: AMEND PROGRAM ENROLLMENT TO BASIC (8 INSTALMENTS) ===');
  // 1a. Cancel existing Program Enrollment
  await fetch(`${baseUrl}/api/resource/Program Enrollment/PEN-8th-Chullickal 26-27-271`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  console.log('Cancelled old PEN');

  // 1b. Fetch original data
  const oldPen = await (await fetch(`${baseUrl}/api/resource/Program Enrollment/PEN-8th-Chullickal 26-27-271`, { headers })).json();
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
    custom_fee_structure: 'SU CHL-8th State-Basic-8',
    custom_plan: 'Basic',
    custom_no_of_instalments: '8',
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
  const soUpdate = await (await fetch(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-01377`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ custom_plan: 'Basic' })
  })).json();
  console.log('Updated SO plan to Basic:', soUpdate.data?.custom_plan);

  console.log('\n=== STEP 3: CANCEL OLD PAYMENT 4 & OLD INVOICES 4 TO 8 ===');
  // Cancel Payment 4 ACC-PAY-2026-08929 first
  await fetch(`${baseUrl}/api/resource/Payment Entry/ACC-PAY-2026-08929`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  console.log('Cancelled ACC-PAY-2026-08929');

  // Cancel old invoices 4 to 8
  const invList = [
    'ACC-SINV-2026-10072',
    'ACC-SINV-2026-10073',
    'ACC-SINV-2026-10074',
    'ACC-SINV-2026-10075',
    'ACC-SINV-2026-10076'
  ];
  for (const invName of invList) {
    await fetch(`${baseUrl}/api/resource/Sales Invoice/${invName}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log(`Cancelled invoice ${invName}`);
  }

  console.log('\n=== STEP 4: CREATE 5 NEW SALES INVOICES (LINKED TO SAL-ORD-2026-01377) ===');
  // Inst 1: ACC-SINV-2026-10069 = 2600 (Paid)
  // Inst 2: ACC-SINV-2026-10070 = 2600 (Paid)
  // Inst 3: ACC-SINV-2026-10071 = 2600 (Paid)
  // Inst 4: 2026-09-15 = 1600
  // Inst 5: 2026-10-15 = 1600
  // Inst 6: 2026-11-15 = 1600
  // Inst 7: 2026-12-15 = 1600
  // Inst 8: 2027-01-15 = 1800

  const newInvoicesConfig = [
    { num: 4, due_date: '2026-09-15', amount: 1600 },
    { num: 5, due_date: '2026-10-15', amount: 1600 },
    { num: 6, due_date: '2026-11-15', amount: 1600 },
    { num: 7, due_date: '2026-12-15', amount: 1600 },
    { num: 8, due_date: '2027-01-15', amount: 1800 }
  ];

  const createdInvoices = {};

  for (const cfg of newInvoicesConfig) {
    const invPayload = {
      docstatus: 1,
      naming_series: 'ACC-SINV-.YYYY.-',
      customer: 'JUVAIRIYA P M',
      company: 'Smart Up Chullickal',
      student: 'STU-SU CHL-26-271',
      custom_academic_year: '2026-2027',
      posting_date: '2026-06-15',
      posting_time: '18:45:51',
      set_posting_time: 1,
      due_date: cfg.due_date,
      debit_to: 'Debtors - SU CHL',
      items: [
        {
          item_code: '8th State Tuition Fee',
          item_name: '8th State Tuition Fee',
          description: `Inst ${cfg.num} — 8th State Tuition Fee`,
          qty: 1,
          rate: cfg.amount,
          amount: cfg.amount,
          income_account: 'Sales - SU CHL',
          cost_center: 'Main - SU CHL',
          sales_order: 'SAL-ORD-2026-01377',
          so_detail: 'fjhqrpr6ko'
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

  console.log('\n=== STEP 5: RE-LINK PAYMENT 4 (ACC-PAY-2026-08929, 2600 INR CASH) ===');
  // Recreate amended PE for ACC-PAY-2026-08929
  // Allocates 1600 to new Inst 4 (making it fully paid) and 1000 to new Inst 5.
  const peOrig = await (await fetch(`${baseUrl}/api/resource/Payment Entry/ACC-PAY-2026-08929`, { headers })).json();
  const d = peOrig.data;

  const pePayload = {
    docstatus: 0,
    amended_from: d.name,
    payment_type: 'Receive',
    posting_date: d.posting_date, // 2026-09-17
    company: 'Smart Up Chullickal',
    mode_of_payment: d.mode_of_payment, // Cash
    party_type: 'Customer',
    party: 'JUVAIRIYA P M',
    paid_from: d.paid_from, // Debtors - SU CHL
    paid_to: d.paid_to, // Cash - SU CHL
    paid_amount: d.paid_amount, // 2600
    received_amount: d.received_amount, // 2600
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: d.reference_no,
    reference_date: d.reference_date,
    remarks: `Amount INR ${d.paid_amount}.0 received from JUVAIRIYA P M\nTransaction reference no ${d.reference_no} dated ${d.posting_date}\nAmount INR 1600.0 against Sales Invoice ${createdInvoices[4]}\nAmount INR 1000.0 against Sales Invoice ${createdInvoices[5]}`,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[4],
        total_amount: 1600,
        outstanding_amount: 1600,
        allocated_amount: 1600
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[5],
        total_amount: 1600,
        outstanding_amount: 1600,
        allocated_amount: 1000
      }
    ]
  };

  const createPeRes = await (await fetch(`${baseUrl}/api/resource/Payment Entry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(pePayload)
  })).json();
  console.log('Created amended PE4:', createPeRes.data?.name);

  if (createPeRes.data?.name) {
    const subPeRes = await (await fetch(`${baseUrl}/api/resource/Payment Entry/${createPeRes.data.name}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 1 })
    })).json();
    console.log('Submitted amended PE4:', subPeRes.data?.name);
  }

  console.log('\n=== EXECUTION COMPLETED ===');
}

executeJuvairiyaConversion().catch(console.error);
