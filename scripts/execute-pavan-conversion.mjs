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

async function executePavanConversion() {
  console.log('=== STARTING CONVERSION FOR PAVAN KUMAR (SRR 196) ===');

  // STEP 1: Amend Program Enrollment
  console.log('\n--- Step 1: Program Enrollment ---');
  const penName = 'PEN-12sc state-Chullickal 26-27-196';
  
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
    custom_fee_structure: 'SU CHL-12th Science State-Basic-6',
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
    'ACC-PAY-2026-04803',
    'ACC-PAY-2026-06487-1',
    'ACC-PAY-2026-09362',
    'ACC-PAY-2026-09363'
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
    'ACC-SINV-2026-06677',
    'ACC-SINV-2026-06678',
    'ACC-SINV-2026-06679',
    'ACC-SINV-2026-06680',
    'ACC-SINV-2026-06681',
    'ACC-SINV-2026-06682'
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

  // STEP 4: Update Sales Order (SAL-ORD-2026-00868)
  console.log('\n--- Step 4: Update Sales Order Plan & Rate to Basic (₹18,500) ---');
  const soDoc = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00868`, { headers })).json();
  let targetSO = null;
  let soItemDetailName = null;

  if (soDoc.data?.docstatus === 1) {
    console.log('Cancelling old SO SAL-ORD-2026-00868...');
    await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00868`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
  }

  const checkSO = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","PAVAN KUMAR"],["docstatus","=",1]]&fields=["name"]`, { headers })).json();
  if (checkSO.data && checkSO.data.length > 0) {
    targetSO = checkSO.data[0].name;
    console.log('Active SO already found:', targetSO);
    const fullSO = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/${encodeURIComponent(targetSO)}`, { headers })).json();
    soItemDetailName = fullSO.data?.items?.[0]?.name;
  } else {
    // 6 installments: 5 x 3200 + 1 x 2500 = 18500
    // qty: 6, rate: 3083.3333333 = 18500
    const amendedSOPayload = {
      docstatus: 0,
      amended_from: 'SAL-ORD-2026-00868',
      naming_series: 'SAL-ORD-.YYYY.-',
      customer: 'PAVAN KUMAR',
      customer_name: 'PAVAN KUMAR',
      company: 'Smart Up Chullickal',
      student: 'STU-SU CHL-26-196',
      custom_academic_year: '2026-2027',
      transaction_date: '2026-05-06',
      delivery_date: '2026-05-06',
      order_type: 'Sales',
      custom_plan: 'Basic',
      custom_no_of_instalments: '6',
      items: [
        {
          item_code: '12th Science State Tuition Fee',
          item_name: '12th Science State Tuition Fee',
          description: '12th Science State Tuition Fee',
          qty: 6,
          uom: 'Nos',
          stock_uom: 'Nos',
          conversion_factor: 1,
          rate: 3083.333333,
          amount: 18500,
          delivery_date: '2026-05-06',
          cost_center: 'Main - SU CHL'
        }
      ],
      payment_schedule: [
        { due_date: '2026-05-06', invoice_portion: 17.2973, payment_amount: 3200 },
        { due_date: '2026-06-15', invoice_portion: 17.2973, payment_amount: 3200 },
        { due_date: '2026-08-15', invoice_portion: 17.2973, payment_amount: 3200 },
        { due_date: '2026-10-15', invoice_portion: 17.2973, payment_amount: 3200 },
        { due_date: '2026-12-15', invoice_portion: 17.2973, payment_amount: 3200 },
        { due_date: '2027-02-15', invoice_portion: 13.5135, payment_amount: 2500 }
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
    { num: 1, due_date: '2026-05-06', amount: 3200 },
    { num: 2, due_date: '2026-06-15', amount: 3200 },
    { num: 3, due_date: '2026-08-15', amount: 3200 },
    { num: 4, due_date: '2026-10-15', amount: 3200 },
    { num: 5, due_date: '2026-12-15', amount: 3200 },
    { num: 6, due_date: '2027-02-15', amount: 2500 }
  ];

  const createdInvoices = {};

  const activeInvs = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","PAVAN KUMAR"],["docstatus","=",1]]&fields=["name","due_date","grand_total"]&order_by=due_date asc`, { headers })).json();
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
        customer: 'PAVAN KUMAR',
        customer_name: 'PAVAN KUMAR',
        company: 'Smart Up Chullickal',
        student: 'STU-SU CHL-26-196',
        custom_academic_year: '2026-2027',
        posting_date: '2026-05-06',
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

  // STEP 6: Recreate & Submit 4 Payment Entries
  console.log('\n--- Step 6: Re-create 4 Payment Entries ---');
  // Allocations breakdown:
  // PE 1: ACC-PAY-2026-04803 (4000, 2026-05-06 Cash)         -> Inst 1 (3200, out 3200), Inst 2 (800, out 3200)
  // PE 2: ACC-PAY-2026-06487-1 (4200, 2026-06-25 Bank Xfer)   -> Inst 2 (2400, out 2400), Inst 3 (1800, out 3200)
  // PE 3: ACC-PAY-2026-09362 (4200, 2026-09-30 Cash)         -> Inst 3 (1400, out 1400), Inst 4 (2800, out 3200)
  // PE 4: ACC-PAY-2026-09363 (200, 2026-09-30 Cash)          -> Inst 4 (200, out 400)

  const paymentConfigs = [
    {
      origName: 'ACC-PAY-2026-04803',
      date: '2026-05-06',
      mode: 'Cash',
      amount: 4000,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1778050114592',
      allocations: [
        { invNum: 1, total: 3200, outstanding: 3200, amount: 3200 },
        { invNum: 2, total: 3200, outstanding: 3200, amount: 800 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-06487-1',
      date: '2026-06-25',
      mode: 'Bank Transfer',
      amount: 4200,
      paidTo: 'VERDIAN INSTITUTE  L L P - SU CHL',
      refNo: '654204312383',
      refDate: '2026-07-08',
      allocations: [
        { invNum: 2, total: 3200, outstanding: 2400, amount: 2400 },
        { invNum: 3, total: 3200, outstanding: 3200, amount: 1800 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-09362',
      date: '2026-09-30',
      mode: 'Cash',
      amount: 4200,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1790784861373',
      allocations: [
        { invNum: 3, total: 3200, outstanding: 1400, amount: 1400 },
        { invNum: 4, total: 3200, outstanding: 3200, amount: 2800 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-09363',
      date: '2026-09-30',
      mode: 'Cash',
      amount: 200,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1790784871561',
      allocations: [
        { invNum: 4, total: 3200, outstanding: 400, amount: 200 }
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
      party: 'PAVAN KUMAR',
      paid_from: 'Debtors - SU CHL',
      paid_to: p.paidTo,
      paid_amount: p.amount,
      received_amount: p.amount,
      target_exchange_rate: 1,
      source_exchange_rate: 1,
      reference_no: p.refNo,
      reference_date: p.refDate || p.date,
      remarks: `Amount INR ${p.amount}.0 received from PAVAN KUMAR\nTransaction reference no ${p.refNo} dated ${p.refDate || p.date}`,
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

  console.log('\n=== CONVERSION FOR PAVAN KUMAR COMPLETED SUCCESSFULLY! ===');
}

executePavanConversion().catch(console.error);
