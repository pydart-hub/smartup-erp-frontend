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

async function executeYaseenConversion() {
  console.log('=== STARTING CONVERSION FOR YASEEN T A (SRR 235) ===');

  const customerId = 'YASEEN T A';
  const studentId = 'STU-SU CHL-26-235';

  // STEP 1: Amend Program Enrollment
  console.log('\n--- Step 1: Program Enrollment ---');
  const penName = 'PEN-9th-Chullickal 26-27-235';
  
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
    custom_fee_structure: 'SU CHL-9th State-Basic-8',
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
    'ACC-PAY-2026-05332',
    'ACC-PAY-2026-06750',
    'ACC-PAY-2026-07776',
    'ACC-PAY-2026-07777',
    'ACC-PAY-2026-08749',
    'ACC-PAY-2026-08750'
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
    'ACC-SINV-2026-08521',
    'ACC-SINV-2026-08522',
    'ACC-SINV-2026-08523',
    'ACC-SINV-2026-08524',
    'ACC-SINV-2026-08525',
    'ACC-SINV-2026-08526',
    'ACC-SINV-2026-08527',
    'ACC-SINV-2026-08528'
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

  // STEP 4: Update Sales Order (SAL-ORD-2026-01155)
  console.log('\n--- Step 4: Update Sales Order Plan & Rate to Basic (₹15,000) ---');
  const soDoc = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-01155`, { headers })).json();
  let targetSO = null;
  let soItemDetailName = null;

  if (soDoc.data?.docstatus === 1) {
    console.log('Cancelling old SO SAL-ORD-2026-01155...');
    await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-01155`, {
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
    // 8 installments: 7 x 1900 + 1 x 1700 = 15000
    // qty: 8, rate: 1875 = 15000
    const amendedSOPayload = {
      docstatus: 0,
      amended_from: 'SAL-ORD-2026-01155',
      naming_series: 'SAL-ORD-.YYYY.-',
      customer: customerId,
      customer_name: customerId,
      company: 'Smart Up Chullickal',
      student: studentId,
      custom_academic_year: '2026-2027',
      transaction_date: '2026-06-01',
      delivery_date: '2026-06-01',
      order_type: 'Sales',
      custom_plan: 'Basic',
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
          rate: 1875,
          amount: 15000,
          delivery_date: '2026-06-01',
          cost_center: 'Main - SU CHL'
        }
      ],
      payment_schedule: [
        { due_date: '2026-06-01', invoice_portion: 12.66667, payment_amount: 1900 },
        { due_date: '2026-07-01', invoice_portion: 12.66667, payment_amount: 1900 },
        { due_date: '2026-08-01', invoice_portion: 12.66667, payment_amount: 1900 },
        { due_date: '2026-09-01', invoice_portion: 12.66667, payment_amount: 1900 },
        { due_date: '2026-10-01', invoice_portion: 12.66667, payment_amount: 1900 },
        { due_date: '2026-11-01', invoice_portion: 12.66667, payment_amount: 1900 },
        { due_date: '2026-12-01', invoice_portion: 12.66667, payment_amount: 1900 },
        { due_date: '2027-01-01', invoice_portion: 11.33333, payment_amount: 1700 }
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
    { num: 1, due_date: '2026-06-01', amount: 1900 },
    { num: 2, due_date: '2026-07-01', amount: 1900 },
    { num: 3, due_date: '2026-08-01', amount: 1900 },
    { num: 4, due_date: '2026-09-01', amount: 1900 },
    { num: 5, due_date: '2026-10-01', amount: 1900 },
    { num: 6, due_date: '2026-11-01', amount: 1900 },
    { num: 7, due_date: '2026-12-01', amount: 1900 },
    { num: 8, due_date: '2027-01-01', amount: 1700 }
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
        posting_date: '2026-06-01',
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

  // STEP 6: Recreate & Submit 6 Payment Entries
  console.log('\n--- Step 6: Re-create 6 Payment Entries ---');
  // PE 1: ACC-PAY-2026-05332 (2400, 2026-06-02 Cash) -> Inst 1 (1900, out 1900), Inst 2 (500, out 1900)
  // PE 2: ACC-PAY-2026-06750 (2300, 2026-07-15 Cash) -> Inst 2 (1400, out 1400), Inst 3 (900, out 1900)
  // PE 3: ACC-PAY-2026-07776 (100, 2026-08-17 Cash)  -> Inst 3 (100, out 1000)
  // PE 4: ACC-PAY-2026-07777 (2300, 2026-08-17 Cash) -> Inst 3 (900, out 900), Inst 4 (1400, out 1900)
  // PE 5: ACC-PAY-2026-08749 (100, 2026-09-14 Cash)  -> Inst 4 (100, out 500)
  // PE 6: ACC-PAY-2026-08750 (2300, 2026-09-14 Cash) -> Inst 4 (400, out 400), Inst 5 (1900, out 1900)

  const paymentConfigs = [
    {
      origName: 'ACC-PAY-2026-05332',
      date: '2026-06-02',
      mode: 'Cash',
      amount: 2400,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1780400062123',
      allocations: [
        { invNum: 1, total: 1900, outstanding: 1900, amount: 1900 },
        { invNum: 2, total: 1900, outstanding: 1900, amount: 500 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-06750',
      date: '2026-07-15',
      mode: 'Cash',
      amount: 2300,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1784054110261',
      allocations: [
        { invNum: 2, total: 1900, outstanding: 1400, amount: 1400 },
        { invNum: 3, total: 1900, outstanding: 1900, amount: 900 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-07776',
      date: '2026-08-17',
      mode: 'Cash',
      amount: 100,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1786981762826',
      allocations: [
        { invNum: 3, total: 1900, outstanding: 1000, amount: 100 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-07777',
      date: '2026-08-17',
      mode: 'Cash',
      amount: 2300,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1786981787162',
      allocations: [
        { invNum: 3, total: 1900, outstanding: 900, amount: 900 },
        { invNum: 4, total: 1900, outstanding: 1900, amount: 1400 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-08749',
      date: '2026-09-14',
      mode: 'Cash',
      amount: 100,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1789389159001',
      allocations: [
        { invNum: 4, total: 1900, outstanding: 500, amount: 100 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-08750',
      date: '2026-09-14',
      mode: 'Cash',
      amount: 2300,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1789389171546',
      allocations: [
        { invNum: 4, total: 1900, outstanding: 400, amount: 400 },
        { invNum: 5, total: 1900, outstanding: 1900, amount: 1900 }
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

  console.log('\n=== CONVERSION FOR YASEEN T A COMPLETED SUCCESSFULLY! ===');
}

executeYaseenConversion().catch(console.error);
