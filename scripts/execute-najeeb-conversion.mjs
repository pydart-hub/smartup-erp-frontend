const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function executeNajeebConversion() {
  console.log('=== STEP 1: AMEND PROGRAM ENROLLMENT TO BASIC (8 INSTALMENTS) ===');
  // 1a. Cancel existing Program Enrollment
  await fetch(`${baseUrl}/api/resource/Program Enrollment/PEN-9th-Chullickal 26-27-160`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  console.log('Cancelled old PEN');

  // 1b. Fetch original data
  const oldPen = await (await fetch(`${baseUrl}/api/resource/Program Enrollment/PEN-9th-Chullickal 26-27-160`, { headers })).json();
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

  console.log('\n=== STEP 2: UPDATE SALES ORDER PLAN TO BASIC ===');
  const soUpdate = await (await fetch(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00743`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ custom_plan: 'Basic' })
  })).json();
  console.log('Updated SO plan to Basic:', soUpdate.data?.custom_plan);

  console.log('\n=== STEP 3: CANCEL OLD PAYMENTS & OLD INVOICES ===');
  const peList = ['ACC-PAY-2026-05069', 'ACC-PAY-2026-05980', 'ACC-PAY-2026-05981', 'ACC-PAY-2026-09025'];
  for (const peName of peList) {
    await fetch(`${baseUrl}/api/resource/Payment Entry/${peName}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log(`Cancelled payment ${peName}`);
  }

  // Cancel old invoices 1 to 7
  const invList = [
    'ACC-SINV-2026-06006',
    'ACC-SINV-2026-06007',
    'ACC-SINV-2026-06008',
    'ACC-SINV-2026-06009',
    'ACC-SINV-2026-06010',
    'ACC-SINV-2026-06011',
    'ACC-SINV-2026-06012'
  ];
  for (const invName of invList) {
    await fetch(`${baseUrl}/api/resource/Sales Invoice/${invName}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log(`Cancelled invoice ${invName}`);
  }

  // Also cancel or delete draft invoice ACC-SINV-2026-12526 if exists
  await fetch(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-12526`, {
    method: 'DELETE',
    headers
  });
  console.log('Cleaned up draft invoice ACC-SINV-2026-12526');

  console.log('\n=== STEP 4: CREATE 8 NEW SALES INVOICES (LINKED TO SAL-ORD-2026-00743) ===');
  // [2400, 2400, 2400, 2400, 2400, 2400, 2400, 110]
  const newInvoicesConfig = [
    { num: 1, due_date: '2026-04-29', amount: 2400 },
    { num: 2, due_date: '2026-05-15', amount: 2400 },
    { num: 3, due_date: '2026-06-15', amount: 2400 },
    { num: 4, due_date: '2026-07-15', amount: 2400 },
    { num: 5, due_date: '2026-08-15', amount: 2400 },
    { num: 6, due_date: '2026-09-15', amount: 2400 },
    { num: 7, due_date: '2026-10-15', amount: 2400 },
    { num: 8, due_date: '2026-11-15', amount: 110 }
  ];

  const createdInvoices = {};

  for (const cfg of newInvoicesConfig) {
    const invPayload = {
      docstatus: 1,
      naming_series: 'ACC-SINV-.YYYY.-',
      customer: 'MOHAMMED NAHAN NAJEEB',
      company: 'Smart Up Chullickal',
      student: 'STU-SU CHL-26-160',
      custom_academic_year: '2026-2027',
      posting_date: '2026-04-29',
      posting_time: '10:12:40',
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
          sales_order: 'SAL-ORD-2026-00743',
          so_detail: '3ujd9sisqi'
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
  // 1. ACC-PAY-2026-05069: 2500 Cash on 2026-05-18
  //    Allocates: 2400 to Inst 1 (fully paid!), 100 to Inst 2.
  // 2. ACC-PAY-2026-05980: 800 Cash on 2026-06-18
  //    Allocates: 800 to Inst 2 (total allocated: 900, remaining 1500).
  // 3. ACC-PAY-2026-05981: 1700 Cash on 2026-06-18
  //    Allocates: 1500 to Inst 2 (fully paid!), 200 to Inst 3.
  // 4. ACC-PAY-2026-09025: 1500 Cash on 2026-09-20
  //    Allocates: 1500 to Inst 3 (total allocated: 1700, remaining 700).

  const paymentsPlan = [
    {
      origName: 'ACC-PAY-2026-05069',
      date: '2026-05-18',
      mode: 'Cash',
      amount: 2500,
      refNo: 'CASH-1779107909634',
      allocations: [
        { invName: createdInvoices[1], total: 2400, outstanding: 2400, amount: 2400 },
        { invName: createdInvoices[2], total: 2400, outstanding: 2400, amount: 100 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-05980',
      date: '2026-06-18',
      mode: 'Cash',
      amount: 800,
      refNo: 'CASH-1781795567962',
      allocations: [
        { invName: createdInvoices[2], total: 2400, outstanding: 2300, amount: 800 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-05981',
      date: '2026-06-18',
      mode: 'Cash',
      amount: 1700,
      refNo: 'CASH-1781795579953',
      allocations: [
        { invName: createdInvoices[2], total: 2400, outstanding: 1500, amount: 1500 },
        { invName: createdInvoices[3], total: 2400, outstanding: 2400, amount: 200 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-09025',
      date: '2026-09-20',
      mode: 'Cash',
      amount: 1500,
      refNo: 'CASH-1789899125688',
      allocations: [
        { invName: createdInvoices[3], total: 2400, outstanding: 2200, amount: 1500 }
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
      party: 'MOHAMMED NAHAN NAJEEB',
      paid_from: 'Debtors - SU CHL',
      paid_to: 'Cash - SU CHL',
      paid_amount: p.amount,
      received_amount: p.amount,
      target_exchange_rate: 1,
      source_exchange_rate: 1,
      reference_no: p.refNo,
      reference_date: p.date,
      remarks: `Amount INR ${p.amount}.0 received from MOHAMMED NAHAN NAJEEB\nTransaction reference no ${p.refNo} dated ${p.date}`,
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

executeNajeebConversion().catch(console.error);
