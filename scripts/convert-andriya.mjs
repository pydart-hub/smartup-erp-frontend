import fs from 'fs';
import dotenv from 'dotenv';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const frappeUrl = envConfig.NEXT_PUBLIC_FRAPPE_URL;
const apiKey = envConfig.FRAPPE_API_KEY;
const apiSecret = envConfig.FRAPPE_API_SECRET;

const headers = {
  'Authorization': 'token ' + apiKey + ':' + apiSecret,
  'Content-Type': 'application/json'
};

async function executeAndriyaConversion() {
  const customerName = 'ANDRIYA MARY';
  const studentId = 'STU-SU MMK-26-068';
  const oldSoName = 'SAL-ORD-2026-01528';

  console.log('Step 1: Fetch and Cancel old active Payment Entries...');
  const peList = ['ACC-PAY-2026-06602', 'ACC-PAY-2026-07810', 'ACC-PAY-2026-07811'];
  const oldPeDocs = {};
  for (const peName of peList) {
    const res = await (await fetch(frappeUrl + '/api/resource/Payment Entry/' + encodeURIComponent(peName), { headers })).json();
    oldPeDocs[peName] = res.data;
    if (res.data?.docstatus === 1) {
      await fetch(frappeUrl + '/api/resource/Payment Entry/' + encodeURIComponent(peName), {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 2 })
      });
      console.log('Cancelled PE:', peName);
    }
  }

  console.log('Step 2: Cancel old Sales Invoices...');
  const oldInvoices = [
    'ACC-SINV-2026-11061', 'ACC-SINV-2026-11062', 'ACC-SINV-2026-11063', 'ACC-SINV-2026-11064',
    'ACC-SINV-2026-11065', 'ACC-SINV-2026-11066', 'ACC-SINV-2026-11067', 'ACC-SINV-2026-11068'
  ];
  for (const sinvName of oldInvoices) {
    const getRes = await (await fetch(frappeUrl + '/api/resource/Sales Invoice/' + encodeURIComponent(sinvName), { headers })).json();
    if (getRes.data?.docstatus === 1) {
      await fetch(frappeUrl + '/api/resource/Sales Invoice/' + encodeURIComponent(sinvName), {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 2 })
      });
      console.log('Cancelled SINV:', sinvName);
    }
  }

  console.log('Step 3: Cancel old Sales Order and create amended 8-installment Sales Order (12500)...');
  const oldSoCheck = await (await fetch(frappeUrl + '/api/resource/Sales Order/' + encodeURIComponent(oldSoName), { headers })).json();
  if (oldSoCheck.data?.docstatus === 1) {
    await fetch(frappeUrl + '/api/resource/Sales Order/' + encodeURIComponent(oldSoName), {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log('Cancelled SO:', oldSoName);
  }

  const oldSoDoc = oldSoCheck.data;
  const newSoDoc = {
    doctype: 'Sales Order',
    amended_from: oldSoName,
    customer: oldSoDoc.customer,
    student: oldSoDoc.student,
    company: oldSoDoc.company,
    custom_academic_year: oldSoDoc.custom_academic_year,
    transaction_date: oldSoDoc.transaction_date,
    delivery_date: oldSoDoc.delivery_date,
    custom_plan: 'Basic',
    custom_no_of_instalments: '8',
    docstatus: 1,
    items: [
      {
        item_code: oldSoDoc.items[0].item_code,
        item_name: oldSoDoc.items[0].item_name,
        qty: 8,
        rate: 1562.5, // 8 * 1562.5 = 12500
        cost_center: oldSoDoc.items[0].cost_center
      }
    ],
    payment_schedule: [
      { due_date: '2026-07-10', payment_amount: 1600, invoice_portion: 0 },
      { due_date: '2026-08-10', payment_amount: 1600, invoice_portion: 0 },
      { due_date: '2026-09-10', payment_amount: 1600, invoice_portion: 0 },
      { due_date: '2026-10-10', payment_amount: 1600, invoice_portion: 0 },
      { due_date: '2026-11-10', payment_amount: 1600, invoice_portion: 0 },
      { due_date: '2026-12-10', payment_amount: 1600, invoice_portion: 0 },
      { due_date: '2027-01-10', payment_amount: 1600, invoice_portion: 0 },
      { due_date: '2027-02-10', payment_amount: 1300, invoice_portion: 0 },
    ]
  };

  const createSoRes = await fetch(frappeUrl + '/api/resource/Sales Order', {
    method: 'POST',
    headers,
    body: JSON.stringify(newSoDoc)
  });
  const newSo = (await createSoRes.json()).data;
  console.log('Created new SO:', newSo.name, 'grand_total:', newSo.grand_total);
  const soDetail = newSo.items[0].name;

  console.log('Step 4: Create 8 Sales Invoices linked to new SO...');
  const schedule = [
    { due: '2026-07-10', rate: 1600 },
    { due: '2026-08-10', rate: 1600 },
    { due: '2026-09-10', rate: 1600 },
    { due: '2026-10-10', rate: 1600 },
    { due: '2026-11-10', rate: 1600 },
    { due: '2026-12-10', rate: 1600 },
    { due: '2027-01-10', rate: 1600 },
    { due: '2027-02-10', rate: 1300 },
  ];

  const createdInvoices = [];
  for (let i = 0; i < schedule.length; i++) {
    const item = schedule[i];
    const newInvDoc = {
      doctype: 'Sales Invoice',
      customer: customerName,
      student: studentId,
      custom_student_email: 'andriyamary.summk.068@dummy.com',
      company: 'Smart Up Moolamkuzhi',
      custom_academic_year: '2026-2027',
      posting_date: '2026-07-10',
      set_posting_time: 1,
      posting_time: '00:00:00',
      due_date: item.due,
      debit_to: 'Debtors - SU MMK',
      docstatus: 1,
      items: [
        {
          item_code: '10th State Tuition Fee',
          item_name: '10th State Tuition Fee',
          qty: 1,
          rate: item.rate,
          income_account: 'Sales - SU MMK',
          sales_order: newSo.name,
          so_detail: soDetail
        }
      ]
    };

    const invRes = await fetch(frappeUrl + '/api/resource/Sales Invoice', {
      method: 'POST',
      headers,
      body: JSON.stringify(newInvDoc)
    });
    const invData = (await invRes.json()).data;
    createdInvoices.push(invData);
    console.log(`Created Inst ${i + 1}: ${invData.name} due: ${invData.due_date} amount: ${invData.grand_total}`);
  }

  console.log('Step 5: Re-create 3 Payment Entries with EXACT dates, modes, and amounts...');

  // Payment 1: ACC-PAY-2026-06602 (2000 Cash, 2026-07-10) -> 1600 to Inst 1, 400 to Inst 2
  const pe1Old = oldPeDocs['ACC-PAY-2026-06602'];
  const pe1Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-06602',
    payment_type: pe1Old.payment_type,
    posting_date: pe1Old.posting_date, // 2026-07-10
    mode_of_payment: pe1Old.mode_of_payment, // Cash
    company: pe1Old.company,
    party_type: pe1Old.party_type,
    party: pe1Old.party,
    paid_from: pe1Old.paid_from,
    paid_to: pe1Old.paid_to,
    paid_amount: 2000,
    received_amount: 2000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe1Old.reference_no,
    reference_date: pe1Old.reference_date,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[0].name,
        due_date: createdInvoices[0].due_date,
        total_amount: 1600,
        outstanding_amount: 1600,
        allocated_amount: 1600
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[1].name,
        due_date: createdInvoices[1].due_date,
        total_amount: 1600,
        outstanding_amount: 1600,
        allocated_amount: 400
      }
    ]
  };
  const pe1Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe1Doc) })).json();
  console.log('Created PE 1:', pe1Res.data?.name, 'Date:', pe1Res.data?.posting_date, 'Paid:', pe1Res.data?.paid_amount);

  // Payment 2: ACC-PAY-2026-07810 (400 Cash, 2026-08-18) -> 400 to Inst 2
  const pe2Old = oldPeDocs['ACC-PAY-2026-07810'];
  const pe2Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-07810',
    payment_type: pe2Old.payment_type,
    posting_date: pe2Old.posting_date, // 2026-08-18
    mode_of_payment: pe2Old.mode_of_payment, // Cash
    company: pe2Old.company,
    party_type: pe2Old.party_type,
    party: pe2Old.party,
    paid_from: pe2Old.paid_from,
    paid_to: pe2Old.paid_to,
    paid_amount: 400,
    received_amount: 400,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe2Old.reference_no,
    reference_date: pe2Old.reference_date,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[1].name,
        due_date: createdInvoices[1].due_date,
        total_amount: 1600,
        outstanding_amount: 1200,
        allocated_amount: 400
      }
    ]
  };
  const pe2Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe2Doc) })).json();
  console.log('Created PE 2:', pe2Res.data?.name, 'Date:', pe2Res.data?.posting_date, 'Paid:', pe2Res.data?.paid_amount);

  // Payment 3: ACC-PAY-2026-07811 (600 Cash, 2026-08-18) -> 600 to Inst 2
  const pe3Old = oldPeDocs['ACC-PAY-2026-07811'];
  const pe3Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-07811',
    payment_type: pe3Old.payment_type,
    posting_date: pe3Old.posting_date, // 2026-08-18
    mode_of_payment: pe3Old.mode_of_payment, // Cash
    company: pe3Old.company,
    party_type: pe3Old.party_type,
    party: pe3Old.party,
    paid_from: pe3Old.paid_from,
    paid_to: pe3Old.paid_to,
    paid_amount: 600,
    received_amount: 600,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe3Old.reference_no,
    reference_date: pe3Old.reference_date,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[1].name,
        due_date: createdInvoices[1].due_date,
        total_amount: 1600,
        outstanding_amount: 800,
        allocated_amount: 600
      }
    ]
  };
  const pe3Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe3Doc) })).json();
  console.log('Created PE 3:', pe3Res.data?.name, 'Date:', pe3Res.data?.posting_date, 'Paid:', pe3Res.data?.paid_amount);

  console.log('=== VERIFYING FINAL RESULT ===');
  const checkFilters = [
    ['Sales Invoice Item', 'sales_order', '=', newSo.name],
    ['docstatus', '=', '1']
  ];
  const url = frappeUrl + '/api/resource/Sales Invoice?filters=' + encodeURIComponent(JSON.stringify(checkFilters)) + '&fields=' + encodeURIComponent(JSON.stringify(['name', 'due_date', 'grand_total', 'outstanding_amount', 'status'])) + '&order_by=due_date asc';
  const checkRes = await (await fetch(url, { headers })).json();
  console.table(checkRes.data);
}

executeAndriyaConversion().catch(console.error);
