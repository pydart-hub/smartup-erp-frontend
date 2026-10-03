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

async function executeJebinConversion() {
  console.log('=== STARTING CONVERSION FOR JEBIN VARGHESE P J (SRR 179) ===');

  // STEP 1: Amend Program Enrollment
  console.log('\n--- Step 1: Program Enrollment ---');
  const penName = 'PEN-12sc state-Chullickal 26-27-179';
  
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
    custom_fee_structure: 'SU CHL-12th Science State-Basic-4',
    custom_plan: 'Basic',
    custom_no_of_instalments: '4',
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
    'ACC-PAY-2026-04724',
    'ACC-PAY-2026-04725'
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
    'ACC-SINV-2026-06320',
    'ACC-SINV-2026-06321',
    'ACC-SINV-2026-06322',
    'ACC-SINV-2026-06323'
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

  // STEP 4: Update Sales Order (SAL-ORD-2026-00802)
  console.log('\n--- Step 4: Update Sales Order Plan & Rate to Basic (₹18,000) ---');
  const soDoc = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00802`, { headers })).json();
  let targetSO = null;
  let soItemDetailName = null;

  if (soDoc.data?.docstatus === 1) {
    console.log('Cancelling old SO SAL-ORD-2026-00802...');
    await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00802`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
  }

  const checkSO = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","JEBIN VARGHESE P J"],["docstatus","=",1]]&fields=["name"]`, { headers })).json();
  if (checkSO.data && checkSO.data.length > 0) {
    targetSO = checkSO.data[0].name;
    console.log('Active SO already found:', targetSO);
    const fullSO = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/${encodeURIComponent(targetSO)}`, { headers })).json();
    soItemDetailName = fullSO.data?.items?.[0]?.name;
  } else {
    const amendedSOPayload = {
      docstatus: 0,
      amended_from: 'SAL-ORD-2026-00802',
      naming_series: 'SAL-ORD-.YYYY.-',
      customer: 'JEBIN VARGHESE P J',
      customer_name: 'JEBIN VARGHESE P J',
      company: 'Smart Up Chullickal',
      student: 'STU-SU CHL-26-179',
      custom_academic_year: '2026-2027',
      transaction_date: '2026-05-04',
      delivery_date: '2026-05-04',
      order_type: 'Sales',
      custom_plan: 'Basic',
      custom_no_of_instalments: '4',
      items: [
        {
          item_code: '12th Science State Tuition Fee',
          item_name: '12th Science State Tuition Fee',
          description: '12th State Tuition Fee',
          qty: 4,
          uom: 'Nos',
          stock_uom: 'Nos',
          conversion_factor: 1,
          rate: 4500, // 4 * 4500 = 18000
          amount: 18000,
          delivery_date: '2026-05-04',
          cost_center: 'Main - SU CHL'
        }
      ],
      payment_schedule: [
        { due_date: '2026-05-04', invoice_portion: 35.0, payment_amount: 6300 },
        { due_date: '2026-07-15', invoice_portion: 25.0, payment_amount: 4500 },
        { due_date: '2026-10-15', invoice_portion: 25.0, payment_amount: 4500 },
        { due_date: '2027-01-15', invoice_portion: 15.0, payment_amount: 2700 }
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

  // STEP 5: Create 4 New Sales Invoices
  console.log('\n--- Step 5: Create 4 New Sales Invoices ---');
  const invoiceConfigs = [
    { num: 1, due_date: '2026-05-04', amount: 6300 },
    { num: 2, due_date: '2026-07-15', amount: 4500 },
    { num: 3, due_date: '2026-10-15', amount: 4500 },
    { num: 4, due_date: '2027-01-15', amount: 2700 }
  ];

  const createdInvoices = {};

  const activeInvs = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","JEBIN VARGHESE P J"],["docstatus","=",1]]&fields=["name","due_date","grand_total"]&order_by=due_date asc`, { headers })).json();
  if (activeInvs.data && activeInvs.data.length === 4) {
    console.log('4 Active Invoices already exist!');
    activeInvs.data.forEach((inv, i) => {
      createdInvoices[i + 1] = inv.name;
    });
  } else {
    for (const cfg of invoiceConfigs) {
      const invPayload = {
        docstatus: 1,
        naming_series: 'ACC-SINV-.YYYY.-',
        customer: 'JEBIN VARGHESE P J',
        customer_name: 'JEBIN VARGHESE P J',
        company: 'Smart Up Chullickal',
        student: 'STU-SU CHL-26-179',
        custom_academic_year: '2026-2027',
        posting_date: '2026-05-04',
        posting_time: '10:23:04',
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

  // STEP 6: Recreate & Submit 2 Payment Entries
  console.log('\n--- Step 6: Re-create 2 Payment Entries ---');
  // Allocations breakdown:
  // 1. ACC-PAY-2026-04724: 8300 Cash on 2026-05-04 -> Inst 1 (6300, out 6300), Inst 2 (2000, out 4500)
  // 2. ACC-PAY-2026-04725: 200 Cash on 2026-05-04 -> Inst 2 (200, out 2500)

  const paymentConfigs = [
    {
      origName: 'ACC-PAY-2026-04724',
      date: '2026-05-04',
      mode: 'Cash',
      amount: 8300,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1777870392652',
      allocations: [
        { invNum: 1, total: 6300, outstanding: 6300, amount: 6300 },
        { invNum: 2, total: 4500, outstanding: 4500, amount: 2000 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-04725',
      date: '2026-05-04',
      mode: 'Cash',
      amount: 200,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1777870476829',
      allocations: [
        { invNum: 2, total: 4500, outstanding: 2500, amount: 200 }
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
      party: 'JEBIN VARGHESE P J',
      paid_from: 'Debtors - SU CHL',
      paid_to: p.paidTo,
      paid_amount: p.amount,
      received_amount: p.amount,
      target_exchange_rate: 1,
      source_exchange_rate: 1,
      reference_no: p.refNo,
      reference_date: p.date,
      remarks: `Amount INR ${p.amount}.0 received from JEBIN VARGHESE P J\nTransaction reference no ${p.refNo} dated ${p.date}`,
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

  console.log('\n=== CONVERSION FOR JEBIN VARGHESE P J COMPLETED SUCCESSFULLY! ===');
}

executeJebinConversion().catch(console.error);
