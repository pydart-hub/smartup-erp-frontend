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

async function completeMansur() {
  const targetSO = 'SAL-ORD-2026-00153-1';

  // We already have:
  // Inst 1: ACC-SINV-2026-13764 (due 2026-04-15, ₹3300)
  // Inst 7: ACC-SINV-2026-13762 (due 2026-10-15, ₹2400)
  // Inst 8: ACC-SINV-2026-13763 (due 2026-11-15, ₹1000)

  // We need to create:
  // Inst 2: due 2026-05-15, ₹3300
  // Inst 3: due 2026-06-15, ₹2400
  // Inst 4: due 2026-07-15, ₹2400
  // Inst 5: due 2026-08-15, ₹2400
  // Inst 6: due 2026-09-15, ₹2400

  const missingConfigs = [
    { num: 2, due_date: '2026-05-15', amount: 3300 },
    { num: 3, due_date: '2026-06-15', amount: 2400 },
    { num: 4, due_date: '2026-07-15', amount: 2400 },
    { num: 5, due_date: '2026-08-15', amount: 2400 },
    { num: 6, due_date: '2026-09-15', amount: 2400 }
  ];

  for (const cfg of missingConfigs) {
    const invPayload = {
      docstatus: 1,
      naming_series: 'ACC-SINV-.YYYY.-',
      customer: 'SAYED MOHAMMED MANSUR ANSARI',
      customer_name: 'SAYED MOHAMMED MANSUR ANSARI',
      company: 'Smart Up Chullickal',
      student: 'STU-SU CHL-26-024',
      custom_academic_year: '2026-2027',
      posting_date: '2026-03-31',
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
          item_code: '10th State Tuition Fee',
          item_name: '10th State Tuition Fee',
          description: `Inst ${cfg.num} — 10th State Tuition Fee`,
          qty: 1,
          rate: cfg.amount,
          amount: cfg.amount,
          income_account: 'Sales - SU CHL',
          cost_center: 'Main - SU CHL',
          sales_order: targetSO
        }
      ]
    };

    const res = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice`, {
      method: 'POST',
      headers,
      body: JSON.stringify(invPayload)
    })).json();

    console.log(`Created Inst ${cfg.num} (₹${cfg.amount}, due ${cfg.due_date}): ${res.data?.name}`);
  }

  // Now create amended Payment Entry ACC-PAY-2026-03956 -> ACC-PAY-2026-03956-1
  // Paid to Cash - SU CHL, mode Razorpay, ₹1000 on 2026-03-31, allocated to Inst 1: ACC-SINV-2026-13764
  console.log('\n--- Creating Payment Entry ---');
  const pePayload = {
    docstatus: 0,
    amended_from: 'ACC-PAY-2026-03956',
    payment_type: 'Receive',
    posting_date: '2026-03-31',
    company: 'Smart Up Chullickal',
    mode_of_payment: 'Razorpay',
    party_type: 'Customer',
    party: 'SAYED MOHAMMED MANSUR ANSARI',
    paid_from: 'Debtors - SU CHL',
    paid_to: 'Cash - SU CHL',
    paid_amount: 1000,
    received_amount: 1000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: 'pay_SXreYDCNaX5ebi',
    reference_date: '2026-03-31',
    remarks: 'Amount INR 1000.0 received from SAYED MOHAMMED MANSUR ANSARI\nTransaction reference no pay_SXreYDCNaX5ebi dated 2026-03-31',
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: 'ACC-SINV-2026-13764',
        total_amount: 3300,
        outstanding_amount: 3300,
        allocated_amount: 1000
      }
    ]
  };

  const createPeRes = await (await fetchWithRetry(`${baseUrl}/api/resource/Payment Entry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(pePayload)
  })).json();

  console.log(`Created amended PE:`, createPeRes.data?.name);

  if (createPeRes.data?.name) {
    const subPeRes = await (await fetchWithRetry(`${baseUrl}/api/resource/Payment Entry/${encodeURIComponent(createPeRes.data.name)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 1 })
    })).json();
    console.log(`Submitted amended PE: ${subPeRes.data?.name}`);
  }
}

completeMansur().catch(console.error);
