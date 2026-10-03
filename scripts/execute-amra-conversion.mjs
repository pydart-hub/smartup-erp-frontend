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

async function executeAmraConversion() {
  console.log('=== STARTING CONVERSION FOR AMRA AMEENA (SRR 256) ===');

  const customerId = 'AMRA AMEENA';
  const studentId = 'STU-SU CHL-26-256';

  // STEP 1: Amend Program Enrollment
  console.log('\n--- Step 1: Program Enrollment ---');
  const penName = 'PEN-8th-Chullickal 26-27-256';
  
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
    custom_fee_structure: 'SU CHL-8th State-Basic-6',
    custom_plan: 'Basic',
    custom_no_of_instalments: '6',
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
    'ACC-PAY-2026-05528',
    'ACC-PAY-2026-08094',
    'ACC-PAY-2026-08095'
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
    'ACC-SINV-2026-09387',
    'ACC-SINV-2026-09388',
    'ACC-SINV-2026-09389',
    'ACC-SINV-2026-09390',
    'ACC-SINV-2026-09391',
    'ACC-SINV-2026-09392'
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

  // STEP 4: Update Sales Order (SAL-ORD-2026-01273)
  console.log('\n--- Step 4: Update Sales Order Plan & Rate to Basic (₹12,650) ---');
  const soDoc = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-01273`, { headers })).json();
  let targetSO = null;
  let soItemDetailName = null;

  if (soDoc.data?.docstatus === 1) {
    console.log('Cancelling old SO SAL-ORD-2026-01273...');
    await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-01273`, {
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
    // 6 installments: 5 x 2100 + 1 x 2150 = 12650
    // qty: 6, rate: 2108.333333 = 12650
    const amendedSOPayload = {
      docstatus: 0,
      amended_from: 'SAL-ORD-2026-01273',
      naming_series: 'SAL-ORD-.YYYY.-',
      customer: customerId,
      customer_name: customerId,
      company: 'Smart Up Chullickal',
      student: studentId,
      custom_academic_year: '2026-2027',
      transaction_date: '2026-06-05',
      delivery_date: '2026-06-05',
      order_type: 'Sales',
      custom_plan: 'Basic',
      custom_no_of_instalments: '6',
      items: [
        {
          item_code: '8th State Tuition Fee',
          item_name: '8th State Tuition Fee',
          description: '8th State Tuition Fee',
          qty: 6,
          uom: 'Nos',
          stock_uom: 'Nos',
          conversion_factor: 1,
          rate: 2108.333333,
          amount: 12650,
          delivery_date: '2026-06-05',
          cost_center: 'Main - SU CHL'
        }
      ],
      payment_schedule: [
        { due_date: '2026-06-05', invoice_portion: 16.60079, payment_amount: 2100 },
        { due_date: '2026-08-05', invoice_portion: 16.60079, payment_amount: 2100 },
        { due_date: '2026-10-05', invoice_portion: 16.60079, payment_amount: 2100 },
        { due_date: '2026-12-05', invoice_portion: 16.60079, payment_amount: 2100 },
        { due_date: '2027-02-05', invoice_portion: 16.60079, payment_amount: 2100 },
        { due_date: '2027-04-05', invoice_portion: 16.99605, payment_amount: 2150 }
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

  // STEP 5: Create 6 New Sales Invoices
  console.log('\n--- Step 5: Create 6 New Sales Invoices ---');
  const invoiceConfigs = [
    { num: 1, due_date: '2026-06-05', amount: 2100 },
    { num: 2, due_date: '2026-08-05', amount: 2100 },
    { num: 3, due_date: '2026-10-05', amount: 2100 },
    { num: 4, due_date: '2026-12-05', amount: 2100 },
    { num: 5, due_date: '2027-02-05', amount: 2100 },
    { num: 6, due_date: '2027-04-05', amount: 2150 }
  ];

  const createdInvoices = {};

  const activeInvs = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${customerId}"],["docstatus","=",1]]&fields=["name","due_date","grand_total"]&order_by=due_date asc`, { headers })).json();
  if (activeInvs.data && activeInvs.data.length === 6) {
    console.log('6 Active Invoices already exist!');
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
        posting_date: '2026-06-05',
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
            item_code: '8th State Tuition Fee',
            item_name: '8th State Tuition Fee',
            description: `Inst ${cfg.num} — 8th State Tuition Fee`,
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

  // STEP 6: Recreate & Submit 3 Payment Entries
  console.log('\n--- Step 6: Re-create 3 Payment Entries ---');
  // Total paid: 5,200
  // Inst 1: 2100 (full)
  // Inst 2: 2100 (full)
  // Inst 3: 1000 (partly paid out of 2100)

  // PE 1: ACC-PAY-2026-05528 (2600, 2026-06-05 Razorpay pay_SxxYacAO72YdBT)             -> Inst 1 (2100, out 2100), Inst 2 (500, out 2100)
  // PE 2: ACC-PAY-2026-08094 (2000, 2026-08-31 Bank Transfer 660906293313, VERDIAN LLP) -> Inst 2 (1600, out 1600), Inst 3 (400, out 2100)
  // PE 3: ACC-PAY-2026-08095 (600,  2026-08-31 Bank Transfer 624373311216, VERDIAN LLP) -> Inst 3 (600, out 1700)

  const paymentConfigs = [
    {
      origName: 'ACC-PAY-2026-05528',
      date: '2026-06-05',
      mode: 'Razorpay',
      amount: 2600,
      paidTo: 'Razorpay - SU CHL - SU CHL',
      refNo: 'pay_SxxYacAO72YdBT',
      allocations: [
        { invNum: 1, total: 2100, outstanding: 2100, amount: 2100 },
        { invNum: 2, total: 2100, outstanding: 2100, amount: 500 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-08094',
      date: '2026-08-31',
      mode: 'Bank Transfer',
      amount: 2000,
      paidTo: 'VERDIAN INSTITUTE  L L P - SU CHL',
      refNo: '660906293313',
      allocations: [
        { invNum: 2, total: 2100, outstanding: 1600, amount: 1600 },
        { invNum: 3, total: 2100, outstanding: 2100, amount: 400 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-08095',
      date: '2026-08-31',
      mode: 'Bank Transfer',
      amount: 600,
      paidTo: 'VERDIAN INSTITUTE  L L P - SU CHL',
      refNo: '624373311216',
      allocations: [
        { invNum: 3, total: 2100, outstanding: 1700, amount: 600 }
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

  console.log('\n=== CONVERSION FOR AMRA AMEENA COMPLETED SUCCESSFULLY! ===');
}

executeAmraConversion().catch(console.error);
