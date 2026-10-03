const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function fetchWithRetry(url, options = {}, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      console.log(`Fetch error (attempt ${i + 1}/${retries}): ${err.message}. Retrying...`);
      await new Promise(r => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

async function executeAfraConversion() {
  console.log('=== STARTING CONVERSION FOR AFRA NAVAS (SRR 053) ===');

  // STEP 1: Amend Program Enrollment
  console.log('\n--- Step 1: Program Enrollment ---');
  const penName = 'PEN-12sc state-Chullickal 26-27-053';
  
  // Cancel old PEN
  const oldPenDoc = await (await fetchWithRetry(`${baseUrl}/api/resource/Program Enrollment/${encodeURIComponent(penName)}`, { headers })).json();
  if (oldPenDoc.data?.docstatus === 1) {
    const penCancelRes = await fetchWithRetry(`${baseUrl}/api/resource/Program Enrollment/${encodeURIComponent(penName)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log('Cancelled old PEN:', penCancelRes.status);
  }

  const dPen = oldPenDoc.data;
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
    custom_fee_structure: 'SU CHL-12th Science State-Basic-8',
    custom_plan: 'Basic',
    custom_no_of_instalments: '8',
    courses: dPen.courses?.map(c => ({ course: c.course })) || []
  };

  const createPen = await (await fetchWithRetry(`${baseUrl}/api/resource/Program Enrollment`, {
    method: 'POST',
    headers,
    body: JSON.stringify(newPenPayload)
  })).json();
  console.log('Created amended PEN:', createPen.data?.name);

  if (createPen.data?.name) {
    const subPen = await (await fetchWithRetry(`${baseUrl}/api/resource/Program Enrollment/${encodeURIComponent(createPen.data.name)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 1 })
    })).json();
    console.log('Submitted amended PEN:', subPen.data?.name);
  }

  // STEP 2: Cancel Active Payment Entries
  console.log('\n--- Step 2: Cancel Active Payment Entries ---');
  const peNames = [
    'ACC-PAY-2026-04133',
    'ACC-PAY-2026-04606',
    'ACC-PAY-2026-05185',
    'ACC-PAY-2026-05186',
    'ACC-PAY-2026-05231',
    'ACC-PAY-2026-06734',
    'ACC-PAY-2026-06735',
    'ACC-PAY-2026-07525'
  ];
  for (const peName of peNames) {
    const doc = await (await fetchWithRetry(`${baseUrl}/api/resource/Payment Entry/${encodeURIComponent(peName)}`, { headers })).json();
    if (doc.data?.docstatus === 1) {
      const res = await fetchWithRetry(`${baseUrl}/api/resource/Payment Entry/${encodeURIComponent(peName)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 2 })
      });
      console.log(`Cancelled PE ${peName}:`, res.status);
    } else {
      console.log(`PE ${peName} is already docstatus ${doc.data?.docstatus}`);
    }
  }

  // STEP 3: Cancel old Sales Invoices
  console.log('\n--- Step 3: Cancel Old Sales Invoices ---');
  const oldInvoices = [
    'ACC-SINV-2026-03271',
    'ACC-SINV-2026-03272',
    'ACC-SINV-2026-03273',
    'ACC-SINV-2026-03274',
    'ACC-SINV-2026-03275',
    'ACC-SINV-2026-03276',
    'ACC-SINV-2026-03277',
    'ACC-SINV-2026-03278'
  ];
  for (const invName of oldInvoices) {
    const doc = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice/${encodeURIComponent(invName)}`, { headers })).json();
    if (doc.data?.docstatus === 1) {
      const res = await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice/${encodeURIComponent(invName)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 2 })
      });
      console.log(`Cancelled Invoice ${invName}:`, res.status);
    } else {
      console.log(`Invoice ${invName} already docstatus ${doc.data?.docstatus}`);
    }
  }

  // STEP 4: Update Sales Order (SAL-ORD-2026-00321)
  console.log('\n--- Step 4: Update Sales Order Plan & Rate to Basic (₹19,000) ---');
  const soDoc = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00321`, { headers })).json();
  let targetSO = null;
  let soItemDetailName = null;

  if (soDoc.data?.docstatus === 1) {
    console.log('Cancelling old SO SAL-ORD-2026-00321...');
    await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00321`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
  }

  const checkSO = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","AFRA NAVAS"],["docstatus","=",1]]&fields=["name"]`, { headers })).json();
  if (checkSO.data && checkSO.data.length > 0) {
    targetSO = checkSO.data[0].name;
    console.log('Active SO already found:', targetSO);
    const fullSO = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/${encodeURIComponent(targetSO)}`, { headers })).json();
    soItemDetailName = fullSO.data?.items?.[0]?.name;
  } else {
    const amendedSOPayload = {
      docstatus: 0,
      amended_from: 'SAL-ORD-2026-00321',
      naming_series: 'SAL-ORD-.YYYY.-',
      customer: 'AFRA NAVAS',
      customer_name: 'AFRA NAVAS',
      company: 'Smart Up Chullickal',
      student: 'STU-SU CHL-26-053',
      custom_academic_year: '2026-2027',
      transaction_date: '2026-04-08',
      delivery_date: '2026-04-08',
      order_type: 'Sales',
      custom_plan: 'Basic',
      custom_no_of_instalments: '8',
      items: [
        {
          item_code: '12th Science State Tuition Fee',
          item_name: '12th Science State Tuition Fee',
          description: '12th State Tuition Fee',
          qty: 8,
          uom: 'Nos',
          stock_uom: 'Nos',
          conversion_factor: 1,
          rate: 2375, // 8 * 2375 = 19000
          amount: 19000,
          delivery_date: '2026-04-08',
          cost_center: 'Main - SU CHL'
        }
      ],
      payment_schedule: [
        { due_date: '2026-04-15', invoice_portion: 13.15789, payment_amount: 2500 },
        { due_date: '2026-05-15', invoice_portion: 13.15789, payment_amount: 2500 },
        { due_date: '2026-06-15', invoice_portion: 13.15789, payment_amount: 2500 },
        { due_date: '2026-07-15', invoice_portion: 13.15789, payment_amount: 2500 },
        { due_date: '2026-08-15', invoice_portion: 13.15789, payment_amount: 2500 },
        { due_date: '2026-09-15', invoice_portion: 13.15789, payment_amount: 2500 },
        { due_date: '2026-10-15', invoice_portion: 13.15789, payment_amount: 2500 },
        { due_date: '2026-11-15', invoice_portion: 7.89477, payment_amount: 1500 }
      ]
    };

    const createSORes = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order`, {
      method: 'POST',
      headers,
      body: JSON.stringify(amendedSOPayload)
    })).json();

    targetSO = createSORes.data?.name;
    console.log('Created amended SO:', targetSO);
    if (!targetSO) {
      console.error('Failed to create amended SO:', JSON.stringify(createSORes));
      throw new Error('SO creation failed');
    }

    const subSORes = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/${encodeURIComponent(targetSO)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 1 })
    })).json();
    console.log('Submitted amended SO:', subSORes.data?.name);
    soItemDetailName = subSORes.data?.items?.[0]?.name;
  }

  // STEP 5: Create 8 New Sales Invoices
  console.log('\n--- Step 5: Create 8 New Sales Invoices ---');
  const invoiceConfigs = [
    { num: 1, due_date: '2026-04-15', amount: 2500 },
    { num: 2, due_date: '2026-05-15', amount: 2500 },
    { num: 3, due_date: '2026-06-15', amount: 2500 },
    { num: 4, due_date: '2026-07-15', amount: 2500 },
    { num: 5, due_date: '2026-08-15', amount: 2500 },
    { num: 6, due_date: '2026-09-15', amount: 2500 },
    { num: 7, due_date: '2026-10-15', amount: 2500 },
    { num: 8, due_date: '2026-11-15', amount: 1500 }
  ];

  const createdInvoices = {};

  const activeInvs = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","AFRA NAVAS"],["docstatus","=",1]]&fields=["name","due_date","grand_total"]&order_by=due_date asc`, { headers })).json();
  if (activeInvs.data && activeInvs.data.length === 8) {
    console.log('8 Active Invoices already exist!');
    activeInvs.data.forEach((inv, i) => {
      createdInvoices[i + 1] = inv.name;
    });
  } else {
    for (const cfg of invoiceConfigs) {
      const invPayload = {
        docstatus: 1,
        naming_series: 'ACC-SINV-.YYYY.-',
        customer: 'AFRA NAVAS',
        customer_name: 'AFRA NAVAS',
        company: 'Smart Up Chullickal',
        student: 'STU-SU CHL-26-053',
        custom_academic_year: '2026-2027',
        posting_date: '2026-04-08',
        posting_time: '19:33:12',
        set_posting_time: 1,
        due_date: cfg.due_date,
        debit_to: 'Debtors - SU CHL',
        against_income_account: 'Sales - SU CHL',
        payment_schedule: [
          {
            due_date: cfg.due_date,
            invoice_portion: 100,
            payment_amount: cfg.amount
          }
        ],
        items: [
          {
            item_code: '12th Science State Tuition Fee',
            item_name: '12th Science State Tuition Fee',
            description: `Inst ${cfg.num} — 12th State Tuition Fee`,
            qty: 1,
            rate: cfg.amount,
            amount: cfg.amount,
            income_account: 'Sales - SU CHL',
            cost_center: 'Main - SU CHL',
            sales_order: targetSO,
            ...(soItemDetailName ? { so_detail: soItemDetailName } : {})
          }
        ]
      };

      const res = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice`, {
        method: 'POST',
        headers,
        body: JSON.stringify(invPayload)
      })).json();

      createdInvoices[cfg.num] = res.data?.name;
      console.log(`Created Inst ${cfg.num} (₹${cfg.amount}, due ${cfg.due_date}): ${res.data?.name}`);
    }
  }

  // STEP 6: Recreate & Submit 8 Payment Entries
  console.log('\n--- Step 6: Re-create 8 Payment Entries ---');
  // Allocations breakdown:
  // 1. ACC-PAY-2026-04133: 1000 Razorpay on 2026-04-08 -> Inst 1 (1000, out 2500)
  // 2. ACC-PAY-2026-04606: 1000 Cash on 2026-04-24 -> Inst 1 (1000, out 1500)
  // 3. ACC-PAY-2026-05185: 2100 Cash on 2026-05-23 -> Inst 1 (500, out 500), Inst 2 (1600, out 2500)
  // 4. ACC-PAY-2026-05186: 400 Cash on 2026-05-23 -> Inst 2 (400, out 900)
  // 5. ACC-PAY-2026-05231: 1000 Cash on 2026-05-30 -> Inst 2 (500, out 500), Inst 3 (500, out 2500)
  // 6. ACC-PAY-2026-06734: 2700 Razorpay on 2026-07-14 -> Inst 3 (2000, out 2000), Inst 4 (700, out 2500)
  // 7. ACC-PAY-2026-06735: 300 Cash on 2026-07-14 -> Inst 4 (300, out 1800)
  // 8. ACC-PAY-2026-07525: 2500 Cash on 2026-08-11 -> Inst 4 (1500, out 1500), Inst 5 (1000, out 2500)

  const paymentConfigs = [
    {
      origName: 'ACC-PAY-2026-04133',
      date: '2026-04-08',
      mode: 'Razorpay',
      amount: 1000,
      paidTo: 'Razorpay - SU CHL - SU CHL',
      refNo: 'pay_Sb1bJbRqp1pvhU',
      allocations: [
        { invNum: 1, total: 2500, outstanding: 2500, amount: 1000 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-04606',
      date: '2026-04-24',
      mode: 'Cash',
      amount: 1000,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1777035998912',
      allocations: [
        { invNum: 1, total: 2500, outstanding: 1500, amount: 1000 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-05185',
      date: '2026-05-23',
      mode: 'Cash',
      amount: 2100,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1779545698640',
      allocations: [
        { invNum: 1, total: 2500, outstanding: 500, amount: 500 },
        { invNum: 2, total: 2500, outstanding: 2500, amount: 1600 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-05186',
      date: '2026-05-23',
      mode: 'Cash',
      amount: 400,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1779545708196',
      allocations: [
        { invNum: 2, total: 2500, outstanding: 900, amount: 400 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-05231',
      date: '2026-05-30',
      mode: 'Cash',
      amount: 1000,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1780142755113',
      allocations: [
        { invNum: 2, total: 2500, outstanding: 500, amount: 500 },
        { invNum: 3, total: 2500, outstanding: 2500, amount: 500 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-06734',
      date: '2026-07-14',
      mode: 'Razorpay',
      amount: 2700,
      paidTo: 'Razorpay - SU CHL - SU CHL',
      refNo: 'pay_TDTQYbQp5KLA6N',
      allocations: [
        { invNum: 3, total: 2500, outstanding: 2000, amount: 2000 },
        { invNum: 4, total: 2500, outstanding: 2500, amount: 700 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-06735',
      date: '2026-07-14',
      mode: 'Cash',
      amount: 300,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1784052001453',
      allocations: [
        { invNum: 4, total: 2500, outstanding: 1800, amount: 300 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-07525',
      date: '2026-08-11',
      mode: 'Cash',
      amount: 2500,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1786449952366',
      allocations: [
        { invNum: 4, total: 2500, outstanding: 1500, amount: 1500 },
        { invNum: 5, total: 2500, outstanding: 2500, amount: 1000 }
      ]
    }
  ];

  for (const p of paymentConfigs) {
    const pePayload = {
      docstatus: 0,
      amended_from: p.origName,
      payment_type: 'Receive',
      posting_date: p.date,
      company: 'Smart Up Chullickal',
      mode_of_payment: p.mode,
      party_type: 'Customer',
      party: 'AFRA NAVAS',
      paid_from: 'Debtors - SU CHL',
      paid_to: p.paidTo,
      paid_amount: p.amount,
      received_amount: p.amount,
      target_exchange_rate: 1,
      source_exchange_rate: 1,
      reference_no: p.refNo,
      reference_date: p.date,
      remarks: `Amount INR ${p.amount}.0 received from AFRA NAVAS\nTransaction reference no ${p.refNo} dated ${p.date}`,
      references: p.allocations.map(al => ({
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[al.invNum],
        total_amount: al.total,
        outstanding_amount: al.outstanding,
        allocated_amount: al.amount
      }))
    };

    const createPeRes = await (await fetchWithRetry(`${baseUrl}/api/resource/Payment Entry`, {
      method: 'POST',
      headers,
      body: JSON.stringify(pePayload)
    })).json();

    console.log(`Created amended PE for ${p.origName}:`, createPeRes.data?.name);

    if (createPeRes.data?.name) {
      const subPeRes = await (await fetchWithRetry(`${baseUrl}/api/resource/Payment Entry/${encodeURIComponent(createPeRes.data.name)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 1 })
      })).json();
      console.log(`Submitted amended PE: ${subPeRes.data?.name}`);
    }
  }

  console.log('\n=== CONVERSION FOR AFRA NAVAS COMPLETED SUCCESSFULLY! ===');
}

executeAfraConversion().catch(console.error);
