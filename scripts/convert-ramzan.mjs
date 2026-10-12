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

async function executeRamzanConversion() {
  const customerName = 'MUHAMMED RAMZAN PS';
  const studentId = 'STU-SU ERV-26-048';
  const oldSoName = 'SAL-ORD-2026-00290';
  const company = 'Smart Up Eraveli';
  const debitTo = 'Debtors - SU ERV';
  const incomeAccount = 'Sales - SU ERV';
  const costCenter = 'Main - SU ERV';
  const itemCode = '9th State Tuition Fee';

  console.log('Step 1: Fetch and Cancel old active Payment Entries...');
  const peList = [
    'ACC-PAY-2026-04099',
    'ACC-PAY-2026-06067',
    'ACC-PAY-2026-06543',
    'ACC-PAY-2026-08312',
    'ACC-PAY-2026-09666'
  ];

  const oldPeDocs = {};
  for (const peName of peList) {
    const res = await (await fetch(frappeUrl + '/api/resource/Payment Entry/' + encodeURIComponent(peName), { headers })).json();
    oldPeDocs[peName] = res.data;
    if (res.data?.docstatus === 1) {
      const cancelRes = await fetch(frappeUrl + '/api/resource/Payment Entry/' + encodeURIComponent(peName), {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 2 })
      });
      const cancelData = await cancelRes.json();
      if (cancelData.exc) {
        throw new Error(`Failed to cancel PE ${peName}: ` + JSON.stringify(cancelData));
      }
      console.log('Cancelled PE:', peName);
    }
  }

  console.log('Step 2: Cancel old Sales Invoices...');
  const oldInvoices = [
    'ACC-SINV-2026-03085', 'ACC-SINV-2026-03086', 'ACC-SINV-2026-03087', 'ACC-SINV-2026-03088',
    'ACC-SINV-2026-03089', 'ACC-SINV-2026-03090', 'ACC-SINV-2026-03091', 'ACC-SINV-2026-03092'
  ];
  for (const sinvName of oldInvoices) {
    const getRes = await (await fetch(frappeUrl + '/api/resource/Sales Invoice/' + encodeURIComponent(sinvName), { headers })).json();
    if (getRes.data?.docstatus === 1) {
      const cancelRes = await fetch(frappeUrl + '/api/resource/Sales Invoice/' + encodeURIComponent(sinvName), {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 2 })
      });
      const cancelData = await cancelRes.json();
      if (cancelData.exc) {
        throw new Error(`Failed to cancel SINV ${sinvName}: ` + JSON.stringify(cancelData));
      }
      console.log('Cancelled SINV:', sinvName);
    }
  }

  console.log('Step 3: Cancel old Sales Order and create amended 8-installment Sales Order (16300)...');
  const oldSoCheck = await (await fetch(frappeUrl + '/api/resource/Sales Order/' + encodeURIComponent(oldSoName), { headers })).json();
  if (oldSoCheck.data?.docstatus === 1) {
    const cancelRes = await fetch(frappeUrl + '/api/resource/Sales Order/' + encodeURIComponent(oldSoName), {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    const cancelData = await cancelRes.json();
    if (cancelData.exc) {
      throw new Error(`Failed to cancel SO ${oldSoName}: ` + JSON.stringify(cancelData));
    }
    console.log('Cancelled SO:', oldSoName);
  }

  const oldSoDoc = oldSoCheck.data;
  const newSoDoc = {
    doctype: 'Sales Order',
    amended_from: oldSoName,
    customer: oldSoDoc.customer,
    student: oldSoDoc.student,
    company: oldSoDoc.company,
    custom_academic_year: oldSoDoc.custom_academic_year || '2026-2027',
    transaction_date: oldSoDoc.transaction_date || '2026-04-07',
    delivery_date: oldSoDoc.delivery_date || '2026-04-07',
    custom_plan: 'Basic',
    custom_no_of_instalments: '8',
    docstatus: 1,
    items: [
      {
        item_code: itemCode,
        item_name: itemCode,
        qty: 8,
        rate: 2037.5, // 8 * 2037.5 = 16300
        cost_center: costCenter
      }
    ],
    payment_schedule: [
      { due_date: '2026-04-15', payment_amount: 2100, invoice_portion: 0 },
      { due_date: '2026-05-15', payment_amount: 2100, invoice_portion: 0 },
      { due_date: '2026-06-15', payment_amount: 2100, invoice_portion: 0 },
      { due_date: '2026-07-15', payment_amount: 2100, invoice_portion: 0 },
      { due_date: '2026-08-15', payment_amount: 2100, invoice_portion: 0 },
      { due_date: '2026-09-15', payment_amount: 2100, invoice_portion: 0 },
      { due_date: '2026-10-15', payment_amount: 2100, invoice_portion: 0 },
      { due_date: '2026-11-15', payment_amount: 1600, invoice_portion: 0 }
    ]
  };

  const createSoRes = await fetch(frappeUrl + '/api/resource/Sales Order', {
    method: 'POST',
    headers,
    body: JSON.stringify(newSoDoc)
  });
  const createSoJson = await createSoRes.json();
  if (createSoJson.exc || !createSoJson.data) {
    throw new Error('Failed to create new SO: ' + JSON.stringify(createSoJson));
  }
  const newSo = createSoJson.data;
  console.log('Created new SO:', newSo.name, 'grand_total:', newSo.grand_total);
  const soDetail = newSo.items[0].name;

  console.log('Step 4: Create 8 Sales Invoices linked to new SO...');
  const schedule = [
    { due: '2026-04-15', rate: 2100, label: 'Inst 1' },
    { due: '2026-05-15', rate: 2100, label: 'Inst 2' },
    { due: '2026-06-15', rate: 2100, label: 'Inst 3' },
    { due: '2026-07-15', rate: 2100, label: 'Inst 4' },
    { due: '2026-08-15', rate: 2100, label: 'Inst 5' },
    { due: '2026-09-15', rate: 2100, label: 'Inst 6' },
    { due: '2026-10-15', rate: 2100, label: 'Inst 7' },
    { due: '2026-11-15', rate: 1600, label: 'Inst 8' }
  ];

  const createdInvoices = [];
  for (let i = 0; i < schedule.length; i++) {
    const item = schedule[i];
    const newInvDoc = {
      doctype: 'Sales Invoice',
      customer: customerName,
      student: studentId,
      custom_student_email: 'muhammedramzanps.suerv.048@dummy.com',
      company: company,
      custom_academic_year: '2026-2027',
      posting_date: '2026-04-07',
      set_posting_time: 1,
      posting_time: '00:00:00',
      due_date: item.due,
      debit_to: debitTo,
      docstatus: 1,
      items: [
        {
          item_code: itemCode,
          item_name: itemCode,
          description: `${item.label} — ${itemCode}`,
          qty: 1,
          rate: item.rate,
          income_account: incomeAccount,
          cost_center: costCenter,
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
    const invJson = await invRes.json();
    if (invJson.exc || !invJson.data) {
      throw new Error(`Failed to create ${item.label}: ` + JSON.stringify(invJson));
    }
    const invData = invJson.data;
    createdInvoices.push(invData);
    console.log(`Created ${item.label}: ${invData.name} due: ${invData.due_date} amount: ${invData.grand_total}`);
  }

  console.log('Step 5: Re-create 5 Payment Entries with EXACT dates, modes, and amounts...');

  // PE 1: ACC-PAY-2026-04099 (2100 Cash, 2026-04-07) -> 2100 to Inst 1
  const pe1Old = oldPeDocs['ACC-PAY-2026-04099'];
  const pe1Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-04099',
    payment_type: pe1Old.payment_type,
    posting_date: pe1Old.posting_date,
    mode_of_payment: pe1Old.mode_of_payment,
    company: pe1Old.company,
    party_type: pe1Old.party_type,
    party: pe1Old.party,
    paid_from: pe1Old.paid_from,
    paid_to: pe1Old.paid_to,
    paid_amount: pe1Old.paid_amount,
    received_amount: pe1Old.received_amount,
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
        total_amount: 2100,
        outstanding_amount: 2100,
        allocated_amount: 2100
      }
    ]
  };
  const pe1Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe1Doc) })).json();
  if (pe1Res.exc) throw new Error('PE 1 error: ' + JSON.stringify(pe1Res));
  console.log('Created PE 1:', pe1Res.data?.name, pe1Res.data?.paid_amount);

  // PE 2: ACC-PAY-2026-06067 (2100 Cash, 2026-06-23) -> 2100 to Inst 2
  const pe2Old = oldPeDocs['ACC-PAY-2026-06067'];
  const pe2Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-06067',
    payment_type: pe2Old.payment_type,
    posting_date: pe2Old.posting_date,
    mode_of_payment: pe2Old.mode_of_payment,
    company: pe2Old.company,
    party_type: pe2Old.party_type,
    party: pe2Old.party,
    paid_from: pe2Old.paid_from,
    paid_to: pe2Old.paid_to,
    paid_amount: pe2Old.paid_amount,
    received_amount: pe2Old.received_amount,
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
        total_amount: 2100,
        outstanding_amount: 2100,
        allocated_amount: 2100
      }
    ]
  };
  const pe2Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe2Doc) })).json();
  if (pe2Res.exc) throw new Error('PE 2 error: ' + JSON.stringify(pe2Res));
  console.log('Created PE 2:', pe2Res.data?.name, pe2Res.data?.paid_amount);

  // PE 3: ACC-PAY-2026-06543 (2000 Cash, 2026-07-09) -> 2000 to Inst 3
  const pe3Old = oldPeDocs['ACC-PAY-2026-06543'];
  const pe3Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-06543',
    payment_type: pe3Old.payment_type,
    posting_date: pe3Old.posting_date,
    mode_of_payment: pe3Old.mode_of_payment,
    company: pe3Old.company,
    party_type: pe3Old.party_type,
    party: pe3Old.party,
    paid_from: pe3Old.paid_from,
    paid_to: pe3Old.paid_to,
    paid_amount: pe3Old.paid_amount,
    received_amount: pe3Old.received_amount,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe3Old.reference_no,
    reference_date: pe3Old.reference_date,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[2].name,
        due_date: createdInvoices[2].due_date,
        total_amount: 2100,
        outstanding_amount: 2100,
        allocated_amount: 2000
      }
    ]
  };
  const pe3Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe3Doc) })).json();
  if (pe3Res.exc) throw new Error('PE 3 error: ' + JSON.stringify(pe3Res));
  console.log('Created PE 3:', pe3Res.data?.name, pe3Res.data?.paid_amount);

  // PE 4: ACC-PAY-2026-08312 (2000 Cash, 2026-09-02) -> 100 to Inst 3 (clearing Inst 3: 2000 + 100 = 2100), 1900 to Inst 4
  const pe4Old = oldPeDocs['ACC-PAY-2026-08312'];
  const pe4Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-08312',
    payment_type: pe4Old.payment_type,
    posting_date: pe4Old.posting_date,
    mode_of_payment: pe4Old.mode_of_payment,
    company: pe4Old.company,
    party_type: pe4Old.party_type,
    party: pe4Old.party,
    paid_from: pe4Old.paid_from,
    paid_to: pe4Old.paid_to,
    paid_amount: pe4Old.paid_amount,
    received_amount: pe4Old.received_amount,
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
        total_amount: 2100,
        outstanding_amount: 100,
        allocated_amount: 100
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[3].name,
        due_date: createdInvoices[3].due_date,
        total_amount: 2100,
        outstanding_amount: 2100,
        allocated_amount: 1900
      }
    ]
  };
  const pe4Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe4Doc) })).json();
  if (pe4Res.exc) throw new Error('PE 4 error: ' + JSON.stringify(pe4Res));
  console.log('Created PE 4:', pe4Res.data?.name, pe4Res.data?.paid_amount);

  // PE 5: ACC-PAY-2026-09666 (2000 Cash, 2026-10-06) -> 200 to Inst 4 (clearing Inst 4: 1900 + 200 = 2100), 1800 to Inst 5
  const pe5Old = oldPeDocs['ACC-PAY-2026-09666'];
  const pe5Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-09666',
    payment_type: pe5Old.payment_type,
    posting_date: pe5Old.posting_date,
    mode_of_payment: pe5Old.mode_of_payment,
    company: pe5Old.company,
    party_type: pe5Old.party_type,
    party: pe5Old.party,
    paid_from: pe5Old.paid_from,
    paid_to: pe5Old.paid_to,
    paid_amount: pe5Old.paid_amount,
    received_amount: pe5Old.received_amount,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe5Old.reference_no,
    reference_date: pe5Old.reference_date,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[3].name,
        due_date: createdInvoices[3].due_date,
        total_amount: 2100,
        outstanding_amount: 200,
        allocated_amount: 200
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[4].name,
        due_date: createdInvoices[4].due_date,
        total_amount: 2100,
        outstanding_amount: 2100,
        allocated_amount: 1800
      }
    ]
  };
  const pe5Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe5Doc) })).json();
  if (pe5Res.exc) throw new Error('PE 5 error: ' + JSON.stringify(pe5Res));
  console.log('Created PE 5:', pe5Res.data?.name, pe5Res.data?.paid_amount);

  console.log('--- ALL DONE SUCCESSFULLY! ---');
}

executeRamzanConversion().catch(err => {
  console.error('CONVERSION FAILED:', err);
  process.exit(1);
});
