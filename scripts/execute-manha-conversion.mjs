const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function executeManhaConversion() {
  console.log('=== STEP 1: AMEND PROGRAM ENROLLMENT TO BASIC (8 INSTALMENTS) ===');
  // 1a. Cancel existing Program Enrollment
  const cancelPen = await fetch(`${baseUrl}/api/resource/Program Enrollment/PEN-10th-Chullickal 26-27-033`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  console.log('Cancelled old PEN (status):', cancelPen.status);

  // 1b. Fetch original data
  const oldPen = await (await fetch(`${baseUrl}/api/resource/Program Enrollment/PEN-10th-Chullickal 26-27-033`, { headers })).json();
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

  console.log('\n=== STEP 2: UPDATE SALES ORDER PLAN TO BASIC ===');
  const soUpdate = await (await fetch(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00180`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ custom_plan: 'Basic' })
  })).json();
  console.log('Updated SO plan to Basic:', soUpdate.data?.custom_plan);

  console.log('\n=== STEP 3: CANCEL OLD PAYMENT 5 (ACC-PAY-2026-08105) & OLD INVOICES 5 to 8 ===');
  // Payments 1 to 4 (ACC-PAY-2026-03984, ACC-PAY-2026-05136, ACC-PAY-2026-05623, ACC-PAY-2026-08104) stay untouched!
  // Invoices 1 to 4 (ACC-SINV-2026-02399, ACC-SINV-2026-02400, ACC-SINV-2026-02401, ACC-SINV-2026-02402) stay untouched!
  
  const cancelPe = await fetch(`${baseUrl}/api/resource/Payment Entry/ACC-PAY-2026-08105`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  console.log('Cancelled payment ACC-PAY-2026-08105 (status):', cancelPe.status);

  const invList = [
    'ACC-SINV-2026-02403',
    'ACC-SINV-2026-02404',
    'ACC-SINV-2026-02405',
    'ACC-SINV-2026-02406'
  ];
  for (const invName of invList) {
    const res = await fetch(`${baseUrl}/api/resource/Sales Invoice/${invName}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log(`Cancelled invoice ${invName} (status: ${res.status})`);
  }

  console.log('\n=== STEP 4: CREATE NEW INVOICES (INST 5 TO 8) LINKED TO SAL-ORD-2026-00180 ===');
  // Inst 1: 3300 (ACC-SINV-2026-02399, due 2026-04-15) - kept
  // Inst 2: 3300 (ACC-SINV-2026-02400, due 2026-05-15) - kept
  // Inst 3: 3300 (ACC-SINV-2026-02401, due 2026-06-15) - kept
  // Inst 4: 3300 (ACC-SINV-2026-02402, due 2026-07-15) - kept
  // Inst 5: 2400 (due 2026-08-15)
  // Inst 6: 2400 (due 2026-09-15)
  // Inst 7: 2400 (due 2026-10-15)
  // Inst 8: 1000 (due 2026-11-15)
  // Total: 3300*4 + 2400*3 + 1000 = 21400

  const newInvoicesConfig = [
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
      customer: 'MANHA NASIM',
      company: 'Smart Up Chullickal',
      student: 'STU-SU CHL-26-033',
      custom_academic_year: '2026-2027',
      posting_date: '2026-04-02',
      posting_time: '19:59:43',
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
          sales_order: 'SAL-ORD-2026-00180',
          so_detail: 'cpb64lot5i'
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

  console.log('\n=== STEP 5: RE-LINK AMENDED PAYMENT 5 (ACC-PAY-2026-08105) TO NEW INST 5 ===');
  // ACC-PAY-2026-08105: 700 Cash on 2026-08-31
  const pePayload = {
    docstatus: 0,
    amended_from: 'ACC-PAY-2026-08105',
    payment_type: 'Receive',
    posting_date: '2026-08-31',
    company: 'Smart Up Chullickal',
    mode_of_payment: 'Cash',
    party_type: 'Customer',
    party: 'MANHA NASIM',
    paid_from: 'Debtors - SU CHL',
    paid_to: 'Cash - SU CHL',
    paid_amount: 700,
    received_amount: 700,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: 'CASH-1788180403382',
    reference_date: '2026-08-31',
    remarks: 'Amount INR 700.0 received from MANHA NASIM\nTransaction reference no CASH-1788180403382 dated 2026-08-31',
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[5],
        total_amount: 2400,
        outstanding_amount: 2400,
        allocated_amount: 700
      }
    ]
  };

  const createPeRes = await (await fetch(`${baseUrl}/api/resource/Payment Entry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(pePayload)
  })).json();

  console.log('Created amended PE for ACC-PAY-2026-08105:', createPeRes.data?.name);

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

  console.log('\n=== STEP 6: VERIFY FINAL INVOICES AND OUTSTANDING ===');
  const verifyParams = new URLSearchParams();
  verifyParams.append('doctype', 'Sales Invoice');
  verifyParams.append('fields', JSON.stringify(['name', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status']));
  verifyParams.append('filters', JSON.stringify([['Sales Invoice', 'customer', '=', 'MANHA NASIM'], ['Sales Invoice', 'docstatus', '=', 1]]));
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

executeManhaConversion().catch(console.error);
