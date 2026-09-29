const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function executeAbhiramiConversion() {
  console.log('=== STEP 1: AMEND PROGRAM ENROLLMENT TO BASIC (8 INSTALMENTS) ===');
  // 1a. Cancel existing Program Enrollment
  await fetch(`${baseUrl}/api/resource/Program Enrollment/PEN-9th-Chullickal 26-27-207`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  console.log('Cancelled old PEN');

  // 1b. Fetch original data
  const oldPen = await (await fetch(`${baseUrl}/api/resource/Program Enrollment/PEN-9th-Chullickal 26-27-207`, { headers })).json();
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
    custom_fee_structure: 'SU CHL-9th State-Basic-8',
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

  console.log('\n=== STEP 2: UPDATE SALES ORDER PLAN & INSTALMENTS TO BASIC 8 ===');
  const soUpdate = await (await fetch(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00991`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      custom_plan: 'Basic',
      custom_no_of_instalments: '8'
    })
  })).json();
  console.log('Updated SO plan to Basic:', soUpdate.data?.custom_plan);

  console.log('\n=== STEP 3: CANCEL OLD PAYMENTS & OLD INVOICES ===');
  const peList = ['ACC-PAY-2026-04982', 'ACC-PAY-2026-06736', 'ACC-PAY-2026-08873', 'ACC-PAY-2026-08874'];
  for (const peName of peList) {
    await fetch(`${baseUrl}/api/resource/Payment Entry/${peName}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log(`Cancelled payment ${peName}`);
  }

  // Cancel old invoices 1 to 6
  const invList = [
    'ACC-SINV-2026-07462',
    'ACC-SINV-2026-07463',
    'ACC-SINV-2026-07464',
    'ACC-SINV-2026-07465',
    'ACC-SINV-2026-07466',
    'ACC-SINV-2026-07467'
  ];
  for (const invName of invList) {
    await fetch(`${baseUrl}/api/resource/Sales Invoice/${invName}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log(`Cancelled invoice ${invName}`);
  }

  console.log('\n=== STEP 4: CREATE 8 NEW SALES INVOICES (LINKED TO SAL-ORD-2026-00991) ===');
  // [2400, 2400, 2400, 2400, 2400, 2400, 2400, 1000]
  const newInvoicesConfig = [
    { num: 1, due_date: '2026-05-13', amount: 2400 },
    { num: 2, due_date: '2026-06-15', amount: 2400 },
    { num: 3, due_date: '2026-07-15', amount: 2400 },
    { num: 4, due_date: '2026-08-15', amount: 2400 },
    { num: 5, due_date: '2026-09-15', amount: 2400 },
    { num: 6, due_date: '2026-10-15', amount: 2400 },
    { num: 7, due_date: '2026-11-15', amount: 2400 },
    { num: 8, due_date: '2026-12-15', amount: 1000 }
  ];

  const createdInvoices = {};

  for (const cfg of newInvoicesConfig) {
    const invPayload = {
      docstatus: 1,
      naming_series: 'ACC-SINV-.YYYY.-',
      customer: 'ABHIRAMI NS',
      company: 'Smart Up Chullickal',
      student: 'STU-SU CHL-26-207',
      custom_academic_year: '2026-2027',
      posting_date: '2026-05-13',
      posting_time: '15:51:39',
      set_posting_time: 1,
      due_date: cfg.due_date,
      debit_to: 'Debtors - SU CHL',
      items: [
        {
          item_code: '9th State Tuition Fee',
          item_name: '9th State Tuition Fee',
          description: `Inst ${cfg.num} — 9th State Tuition Fee`,
          qty: 1,
          rate: cfg.amount,
          amount: cfg.amount,
          income_account: 'Sales - SU CHL',
          cost_center: 'Main - SU CHL',
          sales_order: 'SAL-ORD-2026-00991',
          so_detail: '09o5bcpvf2'
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

  console.log('\n=== STEP 5: RE-LINK 4 PAYMENTS ACROSS NEW INVOICES ===');
  // Payments plan:
  // 1. ACC-PAY-2026-04982: 4200 Razorpay on 2026-05-13 (paid_to: Razorpay - SU CHL - SU CHL)
  //    Allocates: 2400 to Inst 1 (fully paid!), 1800 to Inst 2.
  // 2. ACC-PAY-2026-06736: 2400 Cash on 2026-07-14 (paid_to: Cash - SU CHL)
  //    Allocates: 600 to Inst 2 (fully paid!), 1800 to Inst 3.
  // 3. ACC-PAY-2026-08873: 1800 Cash on 2026-09-16 (paid_to: Cash - SU CHL)
  //    Allocates: 600 to Inst 3 (fully paid!), 1200 to Inst 4.
  // 4. ACC-PAY-2026-08874: 1600 Cash on 2026-09-16 (paid_to: Cash - SU CHL)
  //    Allocates: 1200 to Inst 4 (fully paid!), 400 to Inst 5.

  const paymentsPlan = [
    {
      origName: 'ACC-PAY-2026-04982',
      date: '2026-05-13',
      mode: 'Razorpay',
      amount: 4200,
      paidTo: 'Razorpay - SU CHL - SU CHL',
      refNo: 'pay_SooWH7Ol6MICYn',
      allocations: [
        { invName: createdInvoices[1], total: 2400, outstanding: 2400, amount: 2400 },
        { invName: createdInvoices[2], total: 2400, outstanding: 2400, amount: 1800 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-06736',
      date: '2026-07-14',
      mode: 'Cash',
      amount: 2400,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1784052319497',
      allocations: [
        { invName: createdInvoices[2], total: 2400, outstanding: 600, amount: 600 },
        { invName: createdInvoices[3], total: 2400, outstanding: 2400, amount: 1800 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-08873',
      date: '2026-09-16',
      mode: 'Cash',
      amount: 1800,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1789558810941',
      allocations: [
        { invName: createdInvoices[3], total: 2400, outstanding: 600, amount: 600 },
        { invName: createdInvoices[4], total: 2400, outstanding: 2400, amount: 1200 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-08874',
      date: '2026-09-16',
      mode: 'Cash',
      amount: 1600,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1789558830460',
      allocations: [
        { invName: createdInvoices[4], total: 2400, outstanding: 1200, amount: 1200 },
        { invName: createdInvoices[5], total: 2400, outstanding: 2400, amount: 400 }
      ]
    }
  ];

  for (const p of paymentsPlan) {
    const pePayload = {
      docstatus: 0,
      amended_from: p.origName,
      payment_type: 'Receive',
      posting_date: p.date,
      company: 'Smart Up Chullickal',
      mode_of_payment: p.mode,
      party_type: 'Customer',
      party: 'ABHIRAMI NS',
      paid_from: 'Debtors - SU CHL',
      paid_to: p.paidTo,
      paid_amount: p.amount,
      received_amount: p.amount,
      target_exchange_rate: 1,
      source_exchange_rate: 1,
      reference_no: p.refNo,
      reference_date: p.date,
      remarks: `Amount INR ${p.amount}.0 received from ABHIRAMI NS\nTransaction reference no ${p.refNo} dated ${p.date}`,
      references: p.allocations.map(al => ({
        reference_doctype: 'Sales Invoice',
        reference_name: al.invName,
        total_amount: al.total,
        outstanding_amount: al.outstanding,
        allocated_amount: al.amount
      }))
    };

    const createPeRes = await (await fetch(`${baseUrl}/api/resource/Payment Entry`, {
      method: 'POST',
      headers,
      body: JSON.stringify(pePayload)
    })).json();

    console.log(`Created amended PE for ${p.origName}:`, createPeRes.data?.name);

    if (createPeRes.data?.name) {
      const subPeRes = await (await fetch(`${baseUrl}/api/resource/Payment Entry/${createPeRes.data.name}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 1 })
      })).json();
      console.log(`Submitted amended PE: ${subPeRes.data?.name}`);
    }
  }

  console.log('\n=== EXECUTION COMPLETED ===');
}

executeAbhiramiConversion().catch(console.error);
