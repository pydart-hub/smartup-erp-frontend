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

async function executeMaryElsaConversion() {
  console.log('=== STARTING CONVERSION FOR MARY ELSA (SRR 065) ===');

  // STEP 1: Amend Program Enrollment
  console.log('\n--- Step 1: Program Enrollment ---');
  const penName = 'PEN-12sc state-Chullickal 26-27-065';
  
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
    'ACC-PAY-2026-04209',
    'ACC-PAY-2026-05625',
    'ACC-PAY-2026-05626',
    'ACC-PAY-2026-06178-1',
    'ACC-PAY-2026-06179-1',
    'ACC-PAY-2026-06488-1',
    'ACC-PAY-2026-06489-2'
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

  // STEP 3: Cancel Credit Note & Old Sales Invoices
  console.log('\n--- Step 3: Cancel Credit Note & Old Sales Invoices ---');
  // First cancel return invoice (credit note)
  const cnDoc = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-03723`, { headers })).json();
  if (cnDoc.data?.docstatus === 1) {
    const res = await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-03723`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log('Cancelled Return Invoice ACC-SINV-2026-03723:', res.status);
  }

  // Now cancel invoices 1 to 8
  const oldInvoices = [
    'ACC-SINV-2026-03707',
    'ACC-SINV-2026-03708',
    'ACC-SINV-2026-03709',
    'ACC-SINV-2026-03710',
    'ACC-SINV-2026-03711',
    'ACC-SINV-2026-03712',
    'ACC-SINV-2026-03713',
    'ACC-SINV-2026-03714'
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

  // STEP 4: Update Sales Order (SAL-ORD-2026-00465)
  console.log('\n--- Step 4: Update Sales Order Plan & Rate to Basic (₹19,000) ---');
  const soDoc = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00465`, { headers })).json();
  let targetSO = null;
  let soItemDetailName = null;

  if (soDoc.data?.docstatus === 1) {
    console.log('Cancelling old SO SAL-ORD-2026-00465...');
    await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00465`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
  }

  const checkSO = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","MARY ELSA"],["docstatus","=",1]]&fields=["name"]`, { headers })).json();
  if (checkSO.data && checkSO.data.length > 0) {
    targetSO = checkSO.data[0].name;
    console.log('Active SO already found:', targetSO);
    const fullSO = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/${encodeURIComponent(targetSO)}`, { headers })).json();
    soItemDetailName = fullSO.data?.items?.[0]?.name;
  } else {
    const amendedSOPayload = {
      docstatus: 0,
      amended_from: 'SAL-ORD-2026-00465',
      naming_series: 'SAL-ORD-.YYYY.-',
      customer: 'MARY ELSA',
      customer_name: 'MARY ELSA',
      company: 'Smart Up Chullickal',
      student: 'STU-SU CHL-26-065',
      custom_academic_year: '2026-2027',
      transaction_date: '2026-04-12',
      delivery_date: '2026-04-12',
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
          delivery_date: '2026-04-12',
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

  const activeInvs = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","MARY ELSA"],["docstatus","=",1]]&fields=["name","due_date","grand_total"]&order_by=due_date asc`, { headers })).json();
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
        customer: 'MARY ELSA',
        customer_name: 'MARY ELSA',
        company: 'Smart Up Chullickal',
        student: 'STU-SU CHL-26-065',
        custom_academic_year: '2026-2027',
        posting_date: '2026-04-12',
        posting_time: '16:06:23',
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
  // Allocations breakdown:
  // 1. ACC-PAY-2026-04209: 3300 Cash on 2026-04-12 -> Inst 1 (2500, out 2500), Inst 2 (800, out 2500)
  // 2. ACC-PAY-2026-05625: 2050 Razorpay on 2026-06-09 -> Inst 2 (1700, out 1700), Inst 3 (350, out 2500)
  // 3. ACC-PAY-2026-05626: 1250 Cash on 2026-06-09 -> Inst 3 (1250, out 2150)
  // 4. ACC-PAY-2026-06178-1: 2050 Bank Transfer on 2026-06-28 -> Inst 3 (900, out 900), Inst 4 (1150, out 2500)
  // 5. ACC-PAY-2026-06179-1: 1250 Bank Transfer on 2026-06-28 -> Inst 4 (1250, out 1350)
  // 6. ACC-PAY-2026-06488-1: 2050 Bank Transfer on 2026-07-07 -> Inst 4 (100, out 100), Inst 5 (1950, out 2500)
  // 7. ACC-PAY-2026-06489-2: 1250 Bank Transfer on 2026-07-07 -> Inst 5 (550, out 550), Inst 6 (700, out 2500)

  const paymentConfigs = [
    {
      origName: 'ACC-PAY-2026-04209',
      date: '2026-04-12',
      mode: 'Cash',
      amount: 3300,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1775990185683',
      allocations: [
        { invNum: 1, total: 2500, outstanding: 2500, amount: 2500 },
        { invNum: 2, total: 2500, outstanding: 2500, amount: 800 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-05625',
      date: '2026-06-09',
      mode: 'Razorpay',
      amount: 2050,
      paidTo: 'Razorpay - SU CHL - SU CHL',
      refNo: 'pay_SzTw66czyBGjsN',
      allocations: [
        { invNum: 2, total: 2500, outstanding: 1700, amount: 1700 },
        { invNum: 3, total: 2500, outstanding: 2500, amount: 350 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-05626',
      date: '2026-06-09',
      mode: 'Cash',
      amount: 1250,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1780997035136',
      allocations: [
        { invNum: 3, total: 2500, outstanding: 2150, amount: 1250 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-06178-1',
      date: '2026-06-28',
      mode: 'Bank Transfer',
      amount: 2050,
      paidTo: 'VERDIAN INSTITUTE  L L P - SU CHL',
      refNo: '654578889146',
      allocations: [
        { invNum: 3, total: 2500, outstanding: 900, amount: 900 },
        { invNum: 4, total: 2500, outstanding: 2500, amount: 1150 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-06179-1',
      date: '2026-06-28',
      mode: 'Bank Transfer',
      amount: 1250,
      paidTo: 'VERDIAN INSTITUTE  L L P - SU CHL',
      refNo: '654578889146',
      allocations: [
        { invNum: 4, total: 2500, outstanding: 1350, amount: 1250 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-06488-1',
      date: '2026-07-07',
      mode: 'Bank Transfer',
      amount: 2050,
      paidTo: 'VERDIAN INSTITUTE  L L P - SU CHL',
      refNo: '654578889146',
      allocations: [
        { invNum: 4, total: 2500, outstanding: 100, amount: 100 },
        { invNum: 5, total: 2500, outstanding: 2500, amount: 1950 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-06489-2',
      date: '2026-07-07',
      mode: 'Bank Transfer',
      amount: 1250,
      paidTo: 'VERDIAN INSTITUTE  L L P - SU CHL',
      refNo: '654578889146',
      allocations: [
        { invNum: 5, total: 2500, outstanding: 550, amount: 550 },
        { invNum: 6, total: 2500, outstanding: 2500, amount: 700 }
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
      party: 'MARY ELSA',
      paid_from: 'Debtors - SU CHL',
      paid_to: p.paidTo,
      paid_amount: p.amount,
      received_amount: p.amount,
      target_exchange_rate: 1,
      source_exchange_rate: 1,
      reference_no: p.refNo,
      reference_date: p.date,
      remarks: `Amount INR ${p.amount}.0 received from MARY ELSA\nTransaction reference no ${p.refNo} dated ${p.date}`,
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

  console.log('\n=== CONVERSION FOR MARY ELSA COMPLETED SUCCESSFULLY! ===');
}

executeMaryElsaConversion().catch(console.error);
