const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function executeZayanConversion() {
  console.log('=== STEP 1: AMEND PROGRAM ENROLLMENT TO BASIC (8 INSTALMENTS) ===');
  // 1a. Cancel existing Program Enrollment
  const cancelPen = await fetch(`${baseUrl}/api/resource/Program Enrollment/PEN-8th-Chullickal 26-27-201`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  console.log('Cancelled old PEN (status):', cancelPen.status);

  // 1b. Fetch original data
  const oldPen = await (await fetch(`${baseUrl}/api/resource/Program Enrollment/PEN-8th-Chullickal 26-27-201`, { headers })).json();
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
  const soUpdate = await (await fetch(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00949`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ custom_plan: 'Basic' })
  })).json();
  console.log('Updated SO plan to Basic:', soUpdate.data?.custom_plan);

  console.log('\n=== STEP 3: CANCEL OLD PAYMENTS & OLD INVOICES 2 to 8 ===');
  const peList = [
    'ACC-PAY-2026-05830',
    'ACC-PAY-2026-06910-1',
    'ACC-PAY-2026-07987-1',
    'ACC-PAY-2026-08734'
  ];
  for (const peName of peList) {
    const res = await fetch(`${baseUrl}/api/resource/Payment Entry/${peName}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log(`Cancelled payment ${peName} (status: ${res.status})`);
  }

  // Cancel old invoices 2 to 8 (Inst 1 ACC-SINV-2026-07150 stays untouched!)
  const invList = [
    'ACC-SINV-2026-07151',
    'ACC-SINV-2026-07152',
    'ACC-SINV-2026-07153',
    'ACC-SINV-2026-07154',
    'ACC-SINV-2026-07155',
    'ACC-SINV-2026-07156',
    'ACC-SINV-2026-07157'
  ];
  for (const invName of invList) {
    const res = await fetch(`${baseUrl}/api/resource/Sales Invoice/${invName}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log(`Cancelled invoice ${invName} (status: ${res.status})`);
  }

  console.log('\n=== STEP 4: CREATE NEW INVOICES (INST 2 TO 8) LINKED TO SAL-ORD-2026-00949 ===');
  // Inst 1: 3300 (ACC-SINV-2026-07150)
  // Inst 2: 2400 (due 2026-06-11)
  // Inst 3: 2400 (due 2026-07-11)
  // Inst 4: 2400 (due 2026-08-11)
  // Inst 5: 2400 (due 2026-09-11)
  // Inst 6: 2400 (due 2026-10-11)
  // Inst 7: 2400 (due 2026-11-11)
  // Inst 8: 1000 (due 2026-12-11)
  // Total: 3300 + 6*2400 + 1000 = 18700
  const newInvoicesConfig = [
    { num: 2, due_date: '2026-06-11', amount: 2400 },
    { num: 3, due_date: '2026-07-11', amount: 2400 },
    { num: 4, due_date: '2026-08-11', amount: 2400 },
    { num: 5, due_date: '2026-09-11', amount: 2400 },
    { num: 6, due_date: '2026-10-11', amount: 2400 },
    { num: 7, due_date: '2026-11-11', amount: 2400 },
    { num: 8, due_date: '2026-12-11', amount: 1000 }
  ];

  const createdInvoices = {
    1: 'ACC-SINV-2026-07150'
  };

  for (const cfg of newInvoicesConfig) {
    const invPayload = {
      docstatus: 1,
      naming_series: 'ACC-SINV-.YYYY.-',
      customer: 'MOHAMMED ZAYAN V Z',
      company: 'Smart Up Chullickal',
      student: 'STU-SU CHL-26-201',
      custom_academic_year: '2026-2027',
      posting_date: '2026-05-11',
      posting_time: '11:10:51',
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
          sales_order: 'SAL-ORD-2026-00949',
          so_detail: 'admvca6pct'
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
  // Payments plan (All 3300 INR each, total 13200):
  // 1. ACC-PAY-2026-05830: 3300 Razorpay on 2026-06-14 (paid_to: 'Razorpay - SU CHL - SU CHL')
  //    Allocates: 2400 to Inst 2 (fully paid!), 900 to Inst 3.
  // 2. ACC-PAY-2026-06910-1: 3300 Bank Transfer on 2026-07-13 (paid_to: 'VERDIAN INSTITUTE  L L P - SU CHL')
  //    Allocates: 1500 to Inst 3 (fully paid!), 1800 to Inst 4.
  // 3. ACC-PAY-2026-07987-1: 3300 Bank Transfer on 2026-08-10 (paid_to: 'VERDIAN INSTITUTE  L L P - SU CHL')
  //    Allocates: 600 to Inst 4 (fully paid!), 2400 to Inst 5 (fully paid!), 300 to Inst 6.
  // 4. ACC-PAY-2026-08734: 3300 Cash on 2026-09-14 (paid_to: 'Cash - SU CHL')
  //    Allocates: 2100 to Inst 6 (fully paid!), 1200 to Inst 7.

  const paymentsPlan = [
    {
      origName: 'ACC-PAY-2026-05830',
      date: '2026-06-14',
      mode: 'Razorpay',
      paidTo: 'Razorpay - SU CHL - SU CHL',
      amount: 3300,
      refNo: 'pay_T1OUgtgqPVlIUB',
      refDate: '2026-06-14',
      allocations: [
        { invName: createdInvoices[2], total: 2400, outstanding: 2400, amount: 2400 },
        { invName: createdInvoices[3], total: 2400, outstanding: 2400, amount: 900 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-06910-1',
      date: '2026-07-13',
      mode: 'Bank Transfer',
      paidTo: 'VERDIAN INSTITUTE  L L P - SU CHL',
      amount: 3300,
      refNo: '619486471247',
      refDate: '2026-07-21',
      allocations: [
        { invName: createdInvoices[3], total: 2400, outstanding: 1500, amount: 1500 },
        { invName: createdInvoices[4], total: 2400, outstanding: 2400, amount: 1800 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-07987-1',
      date: '2026-08-10',
      mode: 'Bank Transfer',
      paidTo: 'VERDIAN INSTITUTE  L L P - SU CHL',
      amount: 3300,
      refNo: '658822246224',
      refDate: '2026-08-27',
      allocations: [
        { invName: createdInvoices[4], total: 2400, outstanding: 600, amount: 600 },
        { invName: createdInvoices[5], total: 2400, outstanding: 2400, amount: 2400 },
        { invName: createdInvoices[6], total: 2400, outstanding: 2400, amount: 300 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-08734',
      date: '2026-09-14',
      mode: 'Cash',
      paidTo: 'Cash - SU CHL',
      amount: 3300,
      refNo: 'CASH-1789385453686',
      refDate: '2026-09-14',
      allocations: [
        { invName: createdInvoices[6], total: 2400, outstanding: 2100, amount: 2100 },
        { invName: createdInvoices[7], total: 2400, outstanding: 2400, amount: 1200 }
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
      party: 'MOHAMMED ZAYAN V Z',
      paid_from: 'Debtors - SU CHL',
      paid_to: p.paidTo,
      paid_amount: p.amount,
      received_amount: p.amount,
      target_exchange_rate: 1,
      source_exchange_rate: 1,
      reference_no: p.refNo,
      reference_date: p.refDate,
      remarks: `Amount INR ${p.amount}.0 received from MOHAMMED ZAYAN V Z\nTransaction reference no ${p.refNo} dated ${p.refDate}`,
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
    } else {
      console.error('Failed to create PE:', JSON.stringify(createPeRes));
    }
  }

  console.log('\n=== STEP 6: VERIFY FINAL INVOICES AND OUTSTANDING ===');
  const verifyParams = new URLSearchParams();
  verifyParams.append('doctype', 'Sales Invoice');
  verifyParams.append('fields', JSON.stringify(['name', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status']));
  verifyParams.append('filters', JSON.stringify([['Sales Invoice', 'customer', '=', 'MOHAMMED ZAYAN V Z'], ['Sales Invoice', 'docstatus', '=', 1]]));
  verifyParams.append('order_by', 'due_date asc');

  const verifyRes = await (await fetch(`${baseUrl}/api/method/frappe.desk.reportview.get`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: verifyParams.toString()
  })).json();

  console.log('Active Invoices:');
  let totGrand = 0;
  let totOut = 0;
  for (const inv of verifyRes.message?.values || []) {
    console.log(`- ${inv[0]}: Due ${inv[2]} | Total ₹${inv[3]} | Outstanding ₹${inv[4]} | Status ${inv[5]}`);
    totGrand += inv[3];
    totOut += inv[4];
  }
  console.log(`\nTOTAL FEE: ₹${totGrand} | TOTAL PAID: ₹${totGrand - totOut} | TOTAL OUTSTANDING: ₹${totOut}`);
}

executeZayanConversion().catch(console.error);
