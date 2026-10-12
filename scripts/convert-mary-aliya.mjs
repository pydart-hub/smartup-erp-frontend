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

async function executeMaryAliyaConversion() {
  const customerName = 'MARY ALIYA P J';
  const studentId = 'STU-SU MMK-26-060';
  const oldSoName = 'SAL-ORD-2026-01541';

  console.log('Step 1: Fetch and Cancel old active Payment Entries...');
  const peList = ['ACC-PAY-2026-06664', 'ACC-PAY-2026-06665', 'ACC-PAY-2026-09420', 'ACC-PAY-2026-09421', 'ACC-PAY-2026-09422'];
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

  console.log('Step 2: Cancel old 8 Sales Invoices...');
  const oldInvoices = [
    'ACC-SINV-2026-11176', 'ACC-SINV-2026-11177', 'ACC-SINV-2026-11178', 'ACC-SINV-2026-11179',
    'ACC-SINV-2026-11180', 'ACC-SINV-2026-11181', 'ACC-SINV-2026-11182', 'ACC-SINV-2026-11183'
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

  console.log('Step 3: Cancel old Sales Order and create amended 8-installment Sales Order (15000)...');
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
        rate: 1875, // 8 * 1875 = 15000
        cost_center: oldSoDoc.items[0].cost_center
      }
    ],
    payment_schedule: [
      { due_date: '2026-06-04', payment_amount: 1900, invoice_portion: 0 },
      { due_date: '2026-07-04', payment_amount: 1900, invoice_portion: 0 },
      { due_date: '2026-08-04', payment_amount: 1900, invoice_portion: 0 },
      { due_date: '2026-09-04', payment_amount: 1900, invoice_portion: 0 },
      { due_date: '2026-10-04', payment_amount: 1900, invoice_portion: 0 },
      { due_date: '2026-11-04', payment_amount: 1900, invoice_portion: 0 },
      { due_date: '2026-12-04', payment_amount: 1900, invoice_portion: 0 },
      { due_date: '2027-01-04', payment_amount: 1700, invoice_portion: 0 },
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
    { due: '2026-06-04', rate: 1900 },
    { due: '2026-07-04', rate: 1900 },
    { due: '2026-08-04', rate: 1900 },
    { due: '2026-09-04', rate: 1900 },
    { due: '2026-10-04', rate: 1900 },
    { due: '2026-11-04', rate: 1900 },
    { due: '2026-12-04', rate: 1900 },
    { due: '2027-01-04', rate: 1700 },
  ];

  const createdInvoices = [];
  for (let i = 0; i < schedule.length; i++) {
    const item = schedule[i];
    const newInvDoc = {
      doctype: 'Sales Invoice',
      customer: customerName,
      student: studentId,
      custom_student_email: 'maryaliyapj.summk.060@dummy.com',
      company: 'Smart Up Moolamkuzhi',
      custom_academic_year: '2026-2027',
      posting_date: '2026-06-04',
      set_posting_time: 1,
      posting_time: '00:00:00',
      due_date: item.due,
      debit_to: 'Debtors - SU MMK',
      docstatus: 1,
      items: [
        {
          item_code: '9th State Tuition Fee',
          item_name: '9th State Tuition Fee',
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

  console.log('Step 5: Re-create 5 Payment Entries with EXACT dates, modes, and amounts...');
  // Payment 1: ACC-PAY-2026-06664 (1000 Cash, 2026-06-04) -> 1000 to Inst 1
  const pe1Old = oldPeDocs['ACC-PAY-2026-06664'];
  const pe1Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-06664',
    payment_type: pe1Old.payment_type,
    posting_date: pe1Old.posting_date, // 2026-06-04
    mode_of_payment: pe1Old.mode_of_payment, // Cash
    company: pe1Old.company,
    party_type: pe1Old.party_type,
    party: pe1Old.party,
    paid_from: pe1Old.paid_from,
    paid_to: pe1Old.paid_to,
    paid_amount: 1000,
    received_amount: 1000,
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
        total_amount: 1900,
        outstanding_amount: 1900,
        allocated_amount: 1000
      }
    ]
  };
  const pe1Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe1Doc) })).json();
  console.log('Created PE 1:', pe1Res.data?.name, 'Date:', pe1Res.data?.posting_date, 'Paid:', pe1Res.data?.paid_amount);

  // Payment 2: ACC-PAY-2026-06665 (2300 Cash, 2026-06-23) -> 900 to Inst 1, 1400 to Inst 2
  const pe2Old = oldPeDocs['ACC-PAY-2026-06665'];
  const pe2Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-06665',
    payment_type: pe2Old.payment_type,
    posting_date: pe2Old.posting_date, // 2026-06-23
    mode_of_payment: pe2Old.mode_of_payment, // Cash
    company: pe2Old.company,
    party_type: pe2Old.party_type,
    party: pe2Old.party,
    paid_from: pe2Old.paid_from,
    paid_to: pe2Old.paid_to,
    paid_amount: 2300,
    received_amount: 2300,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe2Old.reference_no,
    reference_date: pe2Old.reference_date,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[0].name,
        due_date: createdInvoices[0].due_date,
        total_amount: 1900,
        outstanding_amount: 900,
        allocated_amount: 900
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[1].name,
        due_date: createdInvoices[1].due_date,
        total_amount: 1900,
        outstanding_amount: 1900,
        allocated_amount: 1400
      }
    ]
  };
  const pe2Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe2Doc) })).json();
  console.log('Created PE 2:', pe2Res.data?.name, 'Date:', pe2Res.data?.posting_date, 'Paid:', pe2Res.data?.paid_amount);

  // Payment 3: ACC-PAY-2026-09420 (1900 Cash, 2026-10-02) -> 500 to Inst 2, 1400 to Inst 3
  const pe3Old = oldPeDocs['ACC-PAY-2026-09420'];
  const pe3Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-09420',
    payment_type: pe3Old.payment_type,
    posting_date: pe3Old.posting_date, // 2026-10-02
    mode_of_payment: pe3Old.mode_of_payment, // Cash
    company: pe3Old.company,
    party_type: pe3Old.party_type,
    party: pe3Old.party,
    paid_from: pe3Old.paid_from,
    paid_to: pe3Old.paid_to,
    paid_amount: 1900,
    received_amount: 1900,
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
        total_amount: 1900,
        outstanding_amount: 500,
        allocated_amount: 500
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[2].name,
        due_date: createdInvoices[2].due_date,
        total_amount: 1900,
        outstanding_amount: 1900,
        allocated_amount: 1400
      }
    ]
  };
  const pe3Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe3Doc) })).json();
  console.log('Created PE 3:', pe3Res.data?.name, 'Date:', pe3Res.data?.posting_date, 'Paid:', pe3Res.data?.paid_amount);

  // Payment 4: ACC-PAY-2026-09421 (2600 Cash, 2026-10-02) -> 500 to Inst 3, 1900 to Inst 4, 200 to Inst 5
  const pe4Old = oldPeDocs['ACC-PAY-2026-09421'];
  const pe4Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-09421',
    payment_type: pe4Old.payment_type,
    posting_date: pe4Old.posting_date, // 2026-10-02
    mode_of_payment: pe4Old.mode_of_payment, // Cash
    company: pe4Old.company,
    party_type: pe4Old.party_type,
    party: pe4Old.party,
    paid_from: pe4Old.paid_from,
    paid_to: pe4Old.paid_to,
    paid_amount: 2600,
    received_amount: 2600,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe4Old.reference_no,
    reference_date: pe4Old.reference_date,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[2].name,
        due_date: createdInvoices[2].due_date,
        total_amount: 1900,
        outstanding_amount: 500,
        allocated_amount: 500
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[3].name,
        due_date: createdInvoices[3].due_date,
        total_amount: 1900,
        outstanding_amount: 1900,
        allocated_amount: 1900
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[4].name,
        due_date: createdInvoices[4].due_date,
        total_amount: 1900,
        outstanding_amount: 1900,
        allocated_amount: 200
      }
    ]
  };
  const pe4Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe4Doc) })).json();
  console.log('Created PE 4:', pe4Res.data?.name, 'Date:', pe4Res.data?.posting_date, 'Paid:', pe4Res.data?.paid_amount);

  // Payment 5: ACC-PAY-2026-09422 (500 Cash, 2026-10-02) -> 500 to Inst 5
  const pe5Old = oldPeDocs['ACC-PAY-2026-09422'];
  const pe5Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-09422',
    payment_type: pe5Old.payment_type,
    posting_date: pe5Old.posting_date, // 2026-10-02
    mode_of_payment: pe5Old.mode_of_payment, // Cash
    company: pe5Old.company,
    party_type: pe5Old.party_type,
    party: pe5Old.party,
    paid_from: pe5Old.paid_from,
    paid_to: pe5Old.paid_to,
    paid_amount: 500,
    received_amount: 500,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe5Old.reference_no,
    reference_date: pe5Old.reference_date,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[4].name,
        due_date: createdInvoices[4].due_date,
        total_amount: 1900,
        outstanding_amount: 1700,
        allocated_amount: 500
      }
    ]
  };
  const pe5Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe5Doc) })).json();
  console.log('Created PE 5:', pe5Res.data?.name, 'Date:', pe5Res.data?.posting_date, 'Paid:', pe5Res.data?.paid_amount);

  console.log('=== VERIFYING FINAL RESULT ===');
  const checkFilters = [
    ['Sales Invoice Item', 'sales_order', '=', newSo.name],
    ['docstatus', '=', '1']
  ];
  const url = frappeUrl + '/api/resource/Sales Invoice?filters=' + encodeURIComponent(JSON.stringify(checkFilters)) + '&fields=' + encodeURIComponent(JSON.stringify(['name', 'due_date', 'grand_total', 'outstanding_amount', 'status'])) + '&order_by=due_date asc';
  const checkRes = await (await fetch(url, { headers })).json();
  console.table(checkRes.data);
}

executeMaryAliyaConversion().catch(console.error);
