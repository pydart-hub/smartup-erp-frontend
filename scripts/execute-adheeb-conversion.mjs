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

async function executeAdheebConversion() {
  console.log('=== RESUMING CONVERSION FOR ADHEEB RILLAH K U (SRR 058) ===');

  // STEP 2: Finish cancelling remaining Payment Entries
  console.log('\n--- Step 2: Cancel Active Payment Entries ---');
  const peNames = [
    'ACC-PAY-2026-04156',
    'ACC-PAY-2026-04799',
    'ACC-PAY-2026-05614',
    'ACC-PAY-2026-05615',
    'ACC-PAY-2026-07137',
    'ACC-PAY-2026-08619',
    'ACC-PAY-2026-08620'
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
    'ACC-SINV-2026-03398',
    'ACC-SINV-2026-03399',
    'ACC-SINV-2026-03400',
    'ACC-SINV-2026-03401',
    'ACC-SINV-2026-03402',
    'ACC-SINV-2026-03403',
    'ACC-SINV-2026-03404',
    'ACC-SINV-2026-03405'
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

  // STEP 4: Update Sales Order (SAL-ORD-2026-00342)
  console.log('\n--- Step 4: Update Sales Order Plan & Rate to Basic (₹19,000) ---');
  const soDoc = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00342`, { headers })).json();
  let targetSO = null;
  let soItemDetailName = null;

  if (soDoc.data?.docstatus === 1) {
    console.log('Cancelling old SO SAL-ORD-2026-00342...');
    await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00342`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
  }

  // Check if amended SO already exists
  const checkSO = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","ADHEEB RILLAH K U"],["docstatus","=",1]]&fields=["name"]`, { headers })).json();
  if (checkSO.data && checkSO.data.length > 0) {
    targetSO = checkSO.data[0].name;
    console.log('Active SO already found:', targetSO);
    const fullSO = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/${encodeURIComponent(targetSO)}`, { headers })).json();
    soItemDetailName = fullSO.data?.items?.[0]?.name;
  } else {
    const amendedSOPayload = {
      docstatus: 0,
      amended_from: 'SAL-ORD-2026-00342',
      naming_series: 'SAL-ORD-.YYYY.-',
      customer: 'ADHEEB RILLAH K U',
      customer_name: 'ADHEEB RILLAH K U',
      company: 'Smart Up Chullickal',
      student: 'STU-SU CHL-26-058',
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
          description: '12th State Tuition Fee',
          qty: 8,
          uom: 'Nos',
          stock_uom: 'Nos',
          conversion_factor: 1,
          rate: 2375, // 8 * 2375 = 19000
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

  // Check if any new invoices were already created
  const activeInvs = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","ADHEEB RILLAH K U"],["docstatus","=",1]]&fields=["name","due_date","grand_total"]&order_by=due_date asc`, { headers })).json();
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
        customer: 'ADHEEB RILLAH K U',
        customer_name: 'ADHEEB RILLAH K U',
        company: 'Smart Up Chullickal',
        student: 'STU-SU CHL-26-058',
        custom_academic_year: '2026-2027',
        posting_date: '2026-04-10',
        posting_time: '19:00:01',
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
  const paymentConfigs = [
    {
      origName: 'ACC-PAY-2026-04156',
      date: '2026-04-10',
      mode: 'Cash',
      amount: 2000,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1775827926701',
      allocations: [
        { invNum: 1, total: 2500, outstanding: 2500, amount: 2000 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-04799',
      date: '2026-05-06',
      mode: 'Cash',
      amount: 2000,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1778047295655',
      allocations: [
        { invNum: 1, total: 2500, outstanding: 500, amount: 500 },
        { invNum: 2, total: 2500, outstanding: 2500, amount: 1500 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-05614',
      date: '2026-06-09',
      mode: 'Razorpay',
      amount: 100,
      paidTo: 'Razorpay - SU CHL - SU CHL',
      refNo: 'pay_SzStYvEkuTr9Kl',
      allocations: [
        { invNum: 2, total: 2500, outstanding: 1000, amount: 100 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-05615',
      date: '2026-06-09',
      mode: 'Cash',
      amount: 1900,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1780993389887',
      allocations: [
        { invNum: 2, total: 2500, outstanding: 900, amount: 900 },
        { invNum: 3, total: 2500, outstanding: 2500, amount: 1000 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-07137',
      date: '2026-07-30',
      mode: 'Cash',
      amount: 2000,
      paidTo: 'Cash - SU CHL',
      refNo: 'CASH-1785414118616',
      allocations: [
        { invNum: 3, total: 2500, outstanding: 1500, amount: 1500 },
        { invNum: 4, total: 2500, outstanding: 2500, amount: 500 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-08619',
      date: '2026-09-10',
      mode: 'CoFee',
      amount: 200,
      paidTo: 'CoFee - SU CHL',
      refNo: 'ord_1OlQRNJCbY4604',
      allocations: [
        { invNum: 4, total: 2500, outstanding: 2000, amount: 200 }
      ]
    },
    {
      origName: 'ACC-PAY-2026-08620',
      date: '2026-09-10',
      mode: 'CoFee',
      amount: 2800,
      paidTo: 'CoFee - SU CHL',
      refNo: 'ord_TPyCm3eqBh0820',
      allocations: [
        { invNum: 4, total: 2500, outstanding: 1800, amount: 1800 },
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
      party: 'ADHEEB RILLAH K U',
      paid_from: 'Debtors - SU CHL',
      paid_to: p.paidTo,
      paid_amount: p.amount,
      received_amount: p.amount,
      target_exchange_rate: 1,
      source_exchange_rate: 1,
      reference_no: p.refNo,
      reference_date: p.date,
      remarks: `Amount INR ${p.amount}.0 received from ADHEEB RILLAH K U\nTransaction reference no ${p.refNo} dated ${p.date}`,
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

  console.log('\n=== CONVERSION COMPLETED SUCCESSFULLY! ===');
}

executeAdheebConversion().catch(console.error);
