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

async function executeAdwinConversion() {
  console.log('=== STARTING CONVERSION FOR ADWIN SAM PAUL (SRR 254) ===');

  const customerId = 'ADWIN SAM PAUL';
  const studentId = 'STU-SU CHL-26-254';

  // STEP 1: Amend Program Enrollment
  console.log('\n--- Step 1: Program Enrollment ---');
  const penName = 'PEN-9th-Chullickal 26-27-254';
  
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
    custom_fee_structure: 'SU CHL-9th State-Advanced-8',
    custom_plan: 'Advanced',
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
    'ACC-PAY-2026-05456',
    'ACC-PAY-2026-06806',
    'ACC-PAY-2026-07746',
    'ACC-PAY-2026-09043'
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
    'ACC-SINV-2026-09092',
    'ACC-SINV-2026-09093',
    'ACC-SINV-2026-09094',
    'ACC-SINV-2026-09095',
    'ACC-SINV-2026-09096',
    'ACC-SINV-2026-09097',
    'ACC-SINV-2026-09098',
    'ACC-SINV-2026-09099'
  ];
  for (const invName of oldInvoices) {
    const invDoc = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice/${encodeURIComponent(invName)}`, { headers })).json();
    if (invDoc.data?.docstatus === 1) {
      const res = await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice/${encodeURIComponent(invName)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 2 })
      });
      console.log(`Cancelled Invoice ${invName}:`, res.status);
    } else {
      console.log(`Invoice ${invName} already docstatus ${invDoc.data?.docstatus}`);
    }
  }

  // STEP 4: Update Sales Order (SAL-ORD-2026-01236)
  console.log('\n--- Step 4: Update Sales Order Plan & Rate to Advanced (₹21,000) ---');
  const soDoc = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-01236`, { headers })).json();
  let targetSO = null;
  let soItemDetailName = null;

  if (soDoc.data?.docstatus === 1) {
    console.log('Cancelling old SO SAL-ORD-2026-01236...');
    await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-01236`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
  }

  const checkSO = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","${customerId}"],["docstatus","=",1]]&fields=["name"]`, { headers })).json();
  if (checkSO.data && checkSO.data.length > 0) {
    targetSO = checkSO.data[0].name;
    console.log('Active SO already found:', targetSO);
    const fullSO = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/${encodeURIComponent(targetSO)}`, { headers })).json();
    soItemDetailName = fullSO.data?.items?.[0]?.name;
  } else {
    // 8 installments: 7 x 2600 + 1 x 2800 = 21000
    // qty: 8, rate: 2625 = 21000
    const amendedSOPayload = {
      docstatus: 0,
      amended_from: 'SAL-ORD-2026-01236',
      naming_series: 'SAL-ORD-.YYYY.-',
      customer: customerId,
      customer_name: customerId,
      company: 'Smart Up Chullickal',
      student: studentId,
      custom_academic_year: '2026-2027',
      transaction_date: '2026-06-03',
      delivery_date: '2026-06-03',
      order_type: 'Sales',
      custom_plan: 'Advanced',
      custom_no_of_instalments: '8',
      items: [
        {
          item_code: '9th State Tuition Fee',
          item_name: '9th State Tuition Fee',
          description: '9th State Tuition Fee',
          qty: 8,
          uom: 'Nos',
          stock_uom: 'Nos',
          conversion_factor: 1,
          rate: 2625,
          amount: 21000,
          delivery_date: '2026-06-03',
          cost_center: 'Main - SU CHL'
        }
      ],
      payment_schedule: [
        { due_date: '2026-06-03', invoice_portion: 12.38095, payment_amount: 2600 },
        { due_date: '2026-07-03', invoice_portion: 12.38095, payment_amount: 2600 },
        { due_date: '2026-08-03', invoice_portion: 12.38095, payment_amount: 2600 },
        { due_date: '2026-09-03', invoice_portion: 12.38095, payment_amount: 2600 },
        { due_date: '2026-10-03', invoice_portion: 12.38095, payment_amount: 2600 },
        { due_date: '2026-11-03', invoice_portion: 12.38095, payment_amount: 2600 },
        { due_date: '2026-12-03', invoice_portion: 12.38095, payment_amount: 2600 },
        { due_date: '2027-01-03', invoice_portion: 13.33335, payment_amount: 2800 }
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
    { num: 1, due_date: '2026-06-03', amount: 2600 },
    { num: 2, due_date: '2026-07-03', amount: 2600 },
    { num: 3, due_date: '2026-08-03', amount: 2600 },
    { num: 4, due_date: '2026-09-03', amount: 2600 },
    { num: 5, due_date: '2026-10-03', amount: 2600 },
    { num: 6, due_date: '2026-11-03', amount: 2600 },
    { num: 7, due_date: '2026-12-03', amount: 2600 },
    { num: 8, due_date: '2027-01-03', amount: 2800 }
  ];

  const createdInvoices = {};

  const activeInvs = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${customerId}"],["docstatus","=",1]]&fields=["name","due_date","grand_total"]&order_by=due_date asc`, { headers })).json();
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
        customer: customerId,
        customer_name: customerId,
        company: 'Smart Up Chullickal',
        student: studentId,
        custom_academic_year: '2026-2027',
        posting_date: '2026-06-03',
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
            item_code: '9th State Tuition Fee',
            item_name: '9th State Tuition Fee',
            description: `Inst ${cfg.num} — 9th State Tuition Fee`,
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

  // STEP 6: Recreate & Submit 4 Payment Entries
  console.log('\n--- Step 6: Re-create 4 Payment Entries ---');
  // Total paid: 13,200
  // Inst 1: 2600 (full)
  // Inst 2: 2600 (full)
  // Inst 3: 2600 (full)
  // Inst 4: 2600 (full)
  // Inst 5: 2600 (full)
  // Inst 6: 200 (partly paid out of 2600)
  
  // PE 1: ACC-PAY-2026-05456 (3300, 2026-06-03 Razorpay pay_SxCKeiqx50Ham9) -> Inst 1 (2600, out 2600), Inst 2 (700, out 2600)
  // PE 2: ACC-PAY-2026-06806 (3300, 2026-07-15 Razorpay pay_TDrYTkVqTWvlnI) -> Inst 2 (1900, out 1900), Inst 3 (1400, out 2600)
  // PE 3: ACC-PAY-2026-07746 (3300, 2026-08-17 CoFee ord_XEPqEuDXAi5100)    -> Inst 3 (1200, out 1200), Inst 4 (2100, out 2600)
  // PE 4: ACC-PAY-2026-09043 (3300, 2026-09-21 CoFee ord_Q8YtZDyrbF6054)    -> Inst 4 (500, out 500),   Inst 5 (2600, out 2600), Inst 6 (200, out 2600)

  const paymentConfigs = [
    {
      origName: 'ACC-PAY-2026-05456',
      date: '2026-06-03',
      mode: 'Razorpay',
      amount: 3300,
      paidTo: 'Razorpay - SU CHL - SU CHL',
      refNo: 'pay_SxCKeiqx50Ham9',
      allocations: [
        { invNum: 1, total: 2600, outstanding: 2600, amount: 2600 },
        { invNum: 2, total: 2600, outstanding: 2600, amount: 700 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-06806',
      date: '2026-07-15',
      mode: 'Razorpay',
      amount: 3300,
      paidTo: 'Razorpay - SU CHL - SU CHL',
      refNo: 'pay_TDrYTkVqTWvlnI',
      allocations: [
        { invNum: 2, total: 2600, outstanding: 1900, amount: 1900 },
        { invNum: 3, total: 2600, outstanding: 2600, amount: 1400 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-07746',
      date: '2026-08-17',
      mode: 'CoFee',
      amount: 3300,
      paidTo: 'CoFee - SU CHL',
      refNo: 'ord_XEPqEuDXAi5100',
      allocations: [
        { invNum: 3, total: 2600, outstanding: 1200, amount: 1200 },
        { invNum: 4, total: 2600, outstanding: 2600, amount: 2100 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-09043',
      date: '2026-09-21',
      mode: 'CoFee',
      amount: 3300,
      paidTo: 'CoFee - SU CHL',
      refNo: 'ord_Q8YtZDyrbF6054',
      allocations: [
        { invNum: 4, total: 2600, outstanding: 500, amount: 500 },
        { invNum: 5, total: 2600, outstanding: 2600, amount: 2600 },
        { invNum: 6, total: 2600, outstanding: 2600, amount: 200 }
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
      party: customerId,
      paid_from: 'Debtors - SU CHL',
      paid_to: p.paidTo,
      paid_amount: p.amount,
      received_amount: p.amount,
      target_exchange_rate: 1,
      source_exchange_rate: 1,
      reference_no: p.refNo,
      reference_date: p.date,
      remarks: `Amount INR ${p.amount}.0 received from ${customerId}\nTransaction reference no ${p.refNo} dated ${p.date}`,
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

  console.log('\n=== CONVERSION FOR ADWIN SAM PAUL COMPLETED SUCCESSFULLY! ===');
}

executeAdwinConversion().catch(console.error);
