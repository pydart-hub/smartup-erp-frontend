const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function executeAnnMaryOptionB() {
  console.log('=== STEP 1: AMEND PROGRAM ENROLLMENT TO BASIC ===');
  // 1a. Cancel old Program Enrollment
  await fetch(`${baseUrl}/api/resource/Program Enrollment/PEN-10th-Chullickal 26-27-009`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  console.log('Cancelled old PEN');

  // 1b. Fetch original data
  const oldPen = await (await fetch(`${baseUrl}/api/resource/Program Enrollment/PEN-10th-Chullickal 26-27-009`, { headers })).json();
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
    custom_fee_structure: 'SU CHL-10th State-Basic-8',
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

  console.log('\n=== STEP 2: CANCEL UNPAID/PARTIAL OLD INVOICES (3, 4, 5, 6, 7, 8) ===');
  // Cancel payments 3, 4, 5, 6, 7 first so invoices can be cancelled
  const peToCancel = [
    'ACC-PAY-2026-06722',
    'ACC-PAY-2026-06723',
    'ACC-PAY-2026-07228',
    'ACC-PAY-2026-07229',
    'ACC-PAY-2026-08931'
  ];
  for (const peName of peToCancel) {
    await fetch(`${baseUrl}/api/resource/Payment Entry/${peName}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log(`Cancelled ${peName}`);
  }

  // Cancel old invoices 3, 4, 5, 6, 7, 8
  const invToCancel = [
    'ACC-SINV-2026-01987',
    'ACC-SINV-2026-01988',
    'ACC-SINV-2026-01989',
    'ACC-SINV-2026-01990',
    'ACC-SINV-2026-01991',
    'ACC-SINV-2026-01992'
  ];
  for (const invName of invToCancel) {
    await fetch(`${baseUrl}/api/resource/Sales Invoice/${invName}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log(`Cancelled old invoice ${invName}`);
  }

  console.log('\n=== STEP 3: CREATE NEW INVOICES 3 TO 8 (LINKED TO SAL-ORD-2026-00122) ===');
  // Plan:
  // Inst 1: ACC-SINV-2026-01985 = 3300 (Already exists & paid)
  // Inst 2: ACC-SINV-2026-01986 = 3300 (Already exists & paid)
  // Inst 3: 2026-06-15 = 2400
  // Inst 4: 2026-07-15 = 2400
  // Inst 5: 2026-08-15 = 2400
  // Inst 6: 2026-09-15 = 2400
  // Inst 7: 2026-10-15 = 2400
  // Inst 8: 2026-11-15 = 1000

  const newInvoicesConfig = [
    { num: 3, due_date: '2026-06-15', amount: 2400 },
    { num: 4, due_date: '2026-07-15', amount: 2400 },
    { num: 5, due_date: '2026-08-15', amount: 2400 },
    { num: 6, due_date: '2026-09-15', amount: 2400 },
    { num: 7, due_date: '2026-10-15', amount: 2400 },
    { num: 8, due_date: '2026-11-15', amount: 1000 }
  ];

  const createdInvoices = {};

  for (const cfg of newInvoicesConfig) {
    const invPayload = {
      docstatus: 1,
      naming_series: 'ACC-SINV-.YYYY.-',
      customer: 'ANN MARY',
      company: 'Smart Up Chullickal',
      student: 'STU-SU CHL-26-009',
      custom_academic_year: '2026-2027',
      posting_date: '2026-03-25',
      posting_time: '17:42:12',
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
          sales_order: 'SAL-ORD-2026-00122',
          so_detail: '1ap10nrbne'
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

  console.log('\n=== STEP 4: RE-LINK PAYMENTS ACROSS NEW INVOICES ===');
  // We have 5 payments to recreate via amended entries:
  // Original PE 1: ACC-PAY-2026-03930 (3300) -> on Inst 1 (UNTOUCHED)
  // Original PE 2: ACC-PAY-2026-04972 (3300) -> on Inst 2 (UNTOUCHED)
  //
  // Now to allocate:
  // Inst 3 (2400 due):
  //   - Recreate ACC-PAY-2026-06722 (Cash 3300 on 2026-07-14).
  //     Allocates: 2400 to Inst 3 (fully paid), 900 to Inst 4.
  // Inst 4 (2400 due, 900 already allocated):
  //   - Recreate ACC-PAY-2026-06723 (Cash 200 on 2026-07-14) -> Allocates 200 to Inst 4 (total 1100).
  //   - Recreate ACC-PAY-2026-07228 (Razorpay 3100 on 2026-08-03) -> Allocates 1300 to Inst 4 (fully paid), and 1800 to Inst 5.
  // Inst 5 (2400 due, 1800 already allocated):
  //   - Recreate ACC-PAY-2026-07229 (Cash 600 on 2026-08-03) -> Allocates 600 to Inst 5 (fully paid!).
  // Inst 6 (2400 due):
  //   - Recreate ACC-PAY-2026-08931 (Cash 2400 on 2026-09-17) -> Allocates 2400 to Inst 6 (fully paid!).
  //
  // Result: Inst 1, 2, 3, 4, 5, 6 are 100% PAID!
  // Inst 7 (2400) is 100% UNPAID.
  // Inst 8 (1000) is 100% UNPAID.
  // Total fee = 19600. Total paid = 16200. Outstanding = 3400.

  const paymentsPlan = [
    {
      origName: 'ACC-PAY-2026-06722',
      date: '2026-07-14',
      mode: 'Cash',
      amount: 3300,
      refNo: 'CASH-1784033990584',
      allocations: [
        { invName: createdInvoices[3], total: 2400, outstanding: 2400, amount: 2400 },
        { invName: createdInvoices[4], total: 2400, outstanding: 2400, amount: 900 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-06723',
      date: '2026-07-14',
      mode: 'Cash',
      amount: 200,
      refNo: 'CASH-1784034006937',
      allocations: [
        { invName: createdInvoices[4], total: 2400, outstanding: 1500, amount: 200 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-07228',
      date: '2026-08-03',
      mode: 'Razorpay',
      amount: 3100,
      refNo: 'pay_TLGP8gOaDs6vdj',
      allocations: [
        { invName: createdInvoices[4], total: 2400, outstanding: 1300, amount: 1300 },
        { invName: createdInvoices[5], total: 2400, outstanding: 2400, amount: 1800 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-07229',
      date: '2026-08-03',
      mode: 'Cash',
      amount: 600,
      refNo: 'CASH-1785752863814',
      allocations: [
        { invName: createdInvoices[5], total: 2400, outstanding: 600, amount: 600 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-08931',
      date: '2026-09-17',
      mode: 'Cash',
      amount: 2400,
      refNo: 'CASH-1789656949099',
      allocations: [
        { invName: createdInvoices[6], total: 2400, outstanding: 2400, amount: 2400 }
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
      party: 'ANN MARY',
      paid_from: 'Debtors - SU CHL',
      paid_to: p.mode === 'Cash' ? 'Cash - SU CHL' : 'Bank Account - SU CHL',
      paid_amount: p.amount,
      received_amount: p.amount,
      target_exchange_rate: 1,
      source_exchange_rate: 1,
      reference_no: p.refNo,
      reference_date: p.date,
      remarks: `Amount INR ${p.amount}.0 received from ANN MARY\nTransaction reference no ${p.refNo} dated ${p.date}`,
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

  console.log('\n=== EXECUTION COMPLETE ===');
}

executeAnnMaryOptionB().catch(console.error);
