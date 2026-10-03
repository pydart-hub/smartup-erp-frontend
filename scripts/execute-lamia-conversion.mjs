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

async function executeLamiaConversion() {
  console.log('=== STARTING CONVERSION FOR LAMIA ASHKER BABU (SRR 095) ===');

  // STEP 1: Amend Program Enrollment
  console.log('\n--- Step 1: Program Enrollment ---');
  const penName = 'PEN-10th-Chullickal 26-27-095';
  
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
    custom_fee_structure: 'SU CHL-10th State-Basic-4',
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
    'ACC-PAY-2026-04341',
    'ACC-PAY-2026-04351',
    'ACC-PAY-2026-04352',
    'ACC-PAY-2026-07202',
    'ACC-PAY-2026-07203'
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
  const cnDoc = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-04420`, { headers })).json();
  if (cnDoc.data?.docstatus === 1) {
    const res = await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-04420`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log('Cancelled Return Invoice ACC-SINV-2026-04420:', res.status);
  }

  const oldInvoices = [
    'ACC-SINV-2026-04412',
    'ACC-SINV-2026-04413',
    'ACC-SINV-2026-04414',
    'ACC-SINV-2026-04415'
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

  // STEP 4: Update Sales Order (SAL-ORD-2026-00494)
  console.log('\n--- Step 4: Update Sales Order Plan & Rate to Basic (₹17,700) ---');
  const soDoc = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00494`, { headers })).json();
  let targetSO = null;
  let soItemDetailName = null;

  if (soDoc.data?.docstatus === 1) {
    console.log('Cancelling old SO SAL-ORD-2026-00494...');
    await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00494`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
  }

  const checkSO = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","LAMIA ASHKER BABU"],["docstatus","=",1]]&fields=["name"]`, { headers })).json();
  if (checkSO.data && checkSO.data.length > 0) {
    targetSO = checkSO.data[0].name;
    console.log('Active SO already found:', targetSO);
    const fullSO = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/${encodeURIComponent(targetSO)}`, { headers })).json();
    soItemDetailName = fullSO.data?.items?.[0]?.name;
  } else {
    const amendedSOPayload = {
      docstatus: 0,
      amended_from: 'SAL-ORD-2026-00494',
      naming_series: 'SAL-ORD-.YYYY.-',
      customer: 'LAMIA ASHKER BABU',
      customer_name: 'LAMIA ASHKER BABU',
      company: 'Smart Up Chullickal',
      student: 'STU-SU CHL-26-095',
      custom_academic_year: '2026-2027',
      transaction_date: '2026-04-14',
      delivery_date: '2026-04-14',
      order_type: 'Sales',
      custom_plan: 'Basic',
      custom_no_of_instalments: '4',
      items: [
        {
          item_code: '10th State Tuition Fee',
          item_name: '10th State Tuition Fee',
          description: '10th State Tuition Fee',
          qty: 4,
          uom: 'Nos',
          stock_uom: 'Nos',
          conversion_factor: 1,
          rate: 4425, // 4 * 4425 = 17700
          amount: 17700,
          delivery_date: '2026-04-14',
          cost_center: 'Main - SU CHL'
        }
      ],
      payment_schedule: [
        { due_date: '2026-04-15', invoice_portion: 46.89265, payment_amount: 8300 },
        { due_date: '2026-07-15', invoice_portion: 23.72881, payment_amount: 4200 },
        { due_date: '2026-10-15', invoice_portion: 23.72881, payment_amount: 4200 },
        { due_date: '2027-01-15', invoice_portion: 5.64973, payment_amount: 1000 }
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
    { num: 1, due_date: '2026-04-15', amount: 8300 },
    { num: 2, due_date: '2026-07-15', amount: 4200 },
    { num: 3, due_date: '2026-10-15', amount: 4200 },
    { num: 4, due_date: '2027-01-15', amount: 1000 }
  ];

  const createdInvoices = {};

  const activeInvs = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","LAMIA ASHKER BABU"],["docstatus","=",1]]&fields=["name","due_date","grand_total"]&order_by=due_date asc`, { headers })).json();
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
        customer: 'LAMIA ASHKER BABU',
        customer_name: 'LAMIA ASHKER BABU',
        company: 'Smart Up Chullickal',
        student: 'STU-SU CHL-26-095',
        custom_academic_year: '2026-2027',
        posting_date: '2026-04-14',
        posting_time: '17:54:53',
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
            item_code: '10th State Tuition Fee',
            item_name: '10th State Tuition Fee',
            description: `Inst ${cfg.num} — 10th State Tuition Fee`,
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

  // STEP 6: Recreate & Submit 5 Payment Entries
  console.log('\n--- Step 6: Re-create 5 Payment Entries ---');
  // Allocations breakdown:
  // 1. ACC-PAY-2026-04341: 4500 Cash on 2026-04-14 -> Inst 1 (4500, out 8300)
  // 2. ACC-PAY-2026-04351: 1430 Cash on 2026-04-16 -> Inst 1 (1430, out 3800)
  // 3. ACC-PAY-2026-04352: 2370 Cash on 2026-04-16 -> Inst 1 (2370, out 2370)
  // 4. ACC-PAY-2026-07202: 3530 Razorpay on 2026-08-01 -> Inst 2 (3530, out 4200)
  // 5. ACC-PAY-2026-07203: 2370 Cash on 2026-08-01 -> Inst 2 (670, out 670), Inst 3 (1700, out 4200)

  const paymentConfigs = [
    {
      origName: 'ACC-PAY-2026-04341',
      date: '2026-04-14',
      mode: 'Cash',
      amount: 4500,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1776169779963',
      allocations: [
        { invNum: 1, total: 8300, outstanding: 8300, amount: 4500 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-04351',
      date: '2026-04-16',
      mode: 'Cash',
      amount: 1430,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1776317264494',
      allocations: [
        { invNum: 1, total: 8300, outstanding: 3800, amount: 1430 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-04352',
      date: '2026-04-16',
      mode: 'Cash',
      amount: 2370,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1776317333676',
      allocations: [
        { invNum: 1, total: 8300, outstanding: 2370, amount: 2370 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-07202',
      date: '2026-08-01',
      mode: 'Razorpay',
      amount: 3530,
      paidTo: 'Razorpay - SU CHL - SU CHL',
      refNo: 'pay_TKXLrY4hfIWnPL',
      allocations: [
        { invNum: 2, total: 4200, outstanding: 4200, amount: 3530 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-07203',
      date: '2026-08-01',
      mode: 'Cash',
      amount: 2370,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1785594215495',
      allocations: [
        { invNum: 2, total: 4200, outstanding: 670, amount: 670 },
        { invNum: 3, total: 4200, outstanding: 4200, amount: 1700 }
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
      party: 'LAMIA ASHKER BABU',
      paid_from: 'Debtors - SU CHL',
      paid_to: p.paidTo,
      paid_amount: p.amount,
      received_amount: p.amount,
      target_exchange_rate: 1,
      source_exchange_rate: 1,
      reference_no: p.refNo,
      reference_date: p.date,
      remarks: `Amount INR ${p.amount}.0 received from LAMIA ASHKER BABU\nTransaction reference no ${p.refNo} dated ${p.date}`,
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

  console.log('\n=== CONVERSION FOR LAMIA ASHKER BABU COMPLETED SUCCESSFULLY! ===');
}

executeLamiaConversion().catch(console.error);
