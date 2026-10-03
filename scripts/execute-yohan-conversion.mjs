import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const getVal = (k) => lines.find(l => l.startsWith(k))?.split('=')[1]?.trim();
const baseUrl = getVal('NEXT_PUBLIC_FRAPPE_URL');
const key = getVal('FRAPPE_API_KEY');
const sec = getVal('FRAPPE_API_SECRET');
const headers = { 'Authorization': `token ${key}:${sec}`, 'Content-Type': 'application/json' };

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

async function executeYohanConversion() {
  console.log('=== STARTING CONVERSION FOR YOHAN ANTONY (SRR 060) ===');

  // STEP 1: Amend Program Enrollment
  console.log('\n--- Step 1: Program Enrollment ---');
  const penName = 'PEN-12sc state-Chullickal 26-27-060';
  
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
    'ACC-PAY-2026-04168',
    'ACC-PAY-2026-04233',
    'ACC-PAY-2026-05304',
    'ACC-PAY-2026-05306',
    'ACC-PAY-2026-05307',
    'ACC-PAY-2026-08142',
    'ACC-PAY-2026-08143'
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

  // STEP 3: Cancel Old Sales Invoices
  console.log('\n--- Step 3: Cancel Old Sales Invoices ---');
  const oldInvoices = [
    'ACC-SINV-2026-03475',
    'ACC-SINV-2026-03476',
    'ACC-SINV-2026-03477',
    'ACC-SINV-2026-03478',
    'ACC-SINV-2026-03479',
    'ACC-SINV-2026-03480',
    'ACC-SINV-2026-03481',
    'ACC-SINV-2026-03482'
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

  // STEP 4: Update Sales Order (SAL-ORD-2026-00353)
  console.log('\n--- Step 4: Update Sales Order Plan & Rate to Basic (₹19,000) ---');
  const soDoc = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00353`, { headers })).json();
  let targetSO = null;
  let soItemDetailName = null;

  if (soDoc.data?.docstatus === 1) {
    console.log('Cancelling old SO SAL-ORD-2026-00353...');
    await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00353`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
  }

  const checkSO = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","YOHAN ANTONY"],["docstatus","=",1]]&fields=["name"]`, { headers })).json();
  if (checkSO.data && checkSO.data.length > 0) {
    targetSO = checkSO.data[0].name;
    console.log('Active SO already found:', targetSO);
    const fullSO = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/${encodeURIComponent(targetSO)}`, { headers })).json();
    soItemDetailName = fullSO.data?.items?.[0]?.name;
  } else {
    // 8 installments: 7 x 2500 + 1 x 1500 = 19000
    // qty: 8, rate: 2375 = 19000
    const amendedSOPayload = {
      docstatus: 0,
      amended_from: 'SAL-ORD-2026-00353',
      naming_series: 'SAL-ORD-.YYYY.-',
      customer: 'YOHAN ANTONY',
      customer_name: 'YOHAN ANTONY',
      company: 'Smart Up Chullickal',
      student: 'STU-SU CHL-26-060',
      custom_academic_year: '2026-2027',
      transaction_date: '2026-04-10',
      delivery_date: '2026-04-10',
      order_type: 'Sales',
      custom_plan: 'Basic',
      custom_no_of_instalments: '8',
      items: [
        {
          item_code: '12th Science State Tuition Fee',
          item_name: '12th Science State Tuition Fee',
          description: '12th Science State Tuition Fee',
          qty: 8,
          uom: 'Nos',
          stock_uom: 'Nos',
          conversion_factor: 1,
          rate: 2375,
          amount: 19000,
          delivery_date: '2026-04-10',
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
        { due_date: '2026-11-15', invoice_portion: 7.89474, payment_amount: 1500 }
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

  const activeInvs = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","YOHAN ANTONY"],["docstatus","=",1]]&fields=["name","due_date","grand_total"]&order_by=due_date asc`, { headers })).json();
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
        customer: 'YOHAN ANTONY',
        customer_name: 'YOHAN ANTONY',
        company: 'Smart Up Chullickal',
        student: 'STU-SU CHL-26-060',
        custom_academic_year: '2026-2027',
        posting_date: '2026-04-10',
        posting_time: '18:00:00',
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

  // STEP 6: Recreate & Submit 7 Payment Entries
  console.log('\n--- Step 6: Re-create 7 Payment Entries ---');
  // Allocations mapping:
  // PE 1: ACC-PAY-2026-04168 (₹999, 2026-04-10 Razorpay) -> Inst 1 (allocated: 999, out: 2500)
  // PE 2: ACC-PAY-2026-04233 (₹2300, 2026-04-13 Cash)     -> Inst 1 (allocated: 1501, out: 1501), Inst 2 (allocated: 799, out: 2500)
  // PE 3: ACC-PAY-2026-05304 (₹4100, 2026-06-01 Cash)     -> Inst 2 (allocated: 1701, out: 1701), Inst 3 (allocated: 2399, out: 2500)
  // PE 4: ACC-PAY-2026-05306 (₹801, 2026-06-01 Cash)      -> Inst 3 (allocated: 101, out: 101), Inst 4 (allocated: 700, out: 2500)
  // PE 5: ACC-PAY-2026-05307 (₹1699, 2026-06-01 Cash)     -> Inst 4 (allocated: 1699, out: 1800)
  // PE 6: ACC-PAY-2026-08142 (₹2401, 2026-08-31 Cash)     -> Inst 4 (allocated: 101, out: 101), Inst 5 (allocated: 2300, out: 2500)
  // PE 7: ACC-PAY-2026-08143 (₹99, 2026-08-31 Cash)       -> Inst 5 (allocated: 99, out: 200)

  const paymentConfigs = [
    {
      origName: 'ACC-PAY-2026-04168',
      date: '2026-04-10',
      mode: 'Razorpay',
      amount: 999,
      paidTo: 'Razorpay - SU CHL - SU CHL',
      refNo: 'pay_SbotJYMVanamti',
      allocations: [
        { invNum: 1, total: 2500, outstanding: 2500, amount: 999 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-04233',
      date: '2026-04-13',
      mode: 'Cash',
      amount: 2300,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1776064592179',
      allocations: [
        { invNum: 1, total: 2500, outstanding: 1501, amount: 1501 },
        { invNum: 2, total: 2500, outstanding: 2500, amount: 799 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-05304',
      date: '2026-06-01',
      mode: 'Cash',
      amount: 4100,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1780327961628',
      allocations: [
        { invNum: 2, total: 2500, outstanding: 1701, amount: 1701 },
        { invNum: 3, total: 2500, outstanding: 2500, amount: 2399 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-05306',
      date: '2026-06-01',
      mode: 'Cash',
      amount: 801,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1780327987008',
      allocations: [
        { invNum: 3, total: 2500, outstanding: 101, amount: 101 },
        { invNum: 4, total: 2500, outstanding: 2500, amount: 700 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-05307',
      date: '2026-06-01',
      mode: 'Cash',
      amount: 1699,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1780328001784',
      allocations: [
        { invNum: 4, total: 2500, outstanding: 1800, amount: 1699 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-08142',
      date: '2026-08-31',
      mode: 'Cash',
      amount: 2401,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1788189665241',
      allocations: [
        { invNum: 4, total: 2500, outstanding: 101, amount: 101 },
        { invNum: 5, total: 2500, outstanding: 2500, amount: 2300 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-08143',
      date: '2026-08-31',
      mode: 'Cash',
      amount: 99,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1788189705909',
      allocations: [
        { invNum: 5, total: 2500, outstanding: 200, amount: 99 }
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
      party: 'YOHAN ANTONY',
      paid_from: 'Debtors - SU CHL',
      paid_to: p.paidTo,
      paid_amount: p.amount,
      received_amount: p.amount,
      target_exchange_rate: 1,
      source_exchange_rate: 1,
      reference_no: p.refNo,
      reference_date: p.date,
      remarks: `Amount INR ${p.amount}.0 received from YOHAN ANTONY\nTransaction reference no ${p.refNo} dated ${p.date}`,
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

  console.log('\n=== CONVERSION FOR YOHAN ANTONY COMPLETED SUCCESSFULLY! ===');
}

executeYohanConversion().catch(console.error);
