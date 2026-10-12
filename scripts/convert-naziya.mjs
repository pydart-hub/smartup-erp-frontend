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

async function executeNaziyaConversion() {
  const customerName = 'NAZIYA NOURIN M S';
  const studentId = 'STU-SU ERV-26-013';
  const oldSoName = 'SAL-ORD-2026-00204';
  const company = 'Smart Up Eraveli';
  const debitTo = 'Debtors - SU ERV';
  const incomeAccount = 'Sales - SU ERV';
  const costCenter = 'Main - SU ERV';
  const itemCode = '9th State Tuition Fee';

  console.log('Step 1: Fetch and Cancel old active Payment Entries...');
  const peList = [
    'ACC-PAY-2026-04011',
    'ACC-PAY-2026-05762'
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
    'ACC-SINV-2026-02536', 'ACC-SINV-2026-02537', 'ACC-SINV-2026-02538', 'ACC-SINV-2026-02539',
    'ACC-SINV-2026-02540', 'ACC-SINV-2026-02541', 'ACC-SINV-2026-02542', 'ACC-SINV-2026-02543'
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
    transaction_date: oldSoDoc.transaction_date || '2026-04-04',
    delivery_date: oldSoDoc.delivery_date || '2026-04-04',
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
      custom_student_email: 'naziyanourinms.suerv.013@dummy.com',
      company: company,
      custom_academic_year: '2026-2027',
      posting_date: '2026-04-04',
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

  console.log('Step 5: Re-create 2 Payment Entries with EXACT dates, modes, and amounts...');

  // PE 1: ACC-PAY-2026-04011 (2100 Razorpay, 2026-04-04) -> 2100 to Inst 1
  const pe1Old = oldPeDocs['ACC-PAY-2026-04011'];
  const pe1Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-04011',
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

  // PE 2: ACC-PAY-2026-05762 (2100 Cash, 2026-06-10) -> 2100 to Inst 2
  const pe2Old = oldPeDocs['ACC-PAY-2026-05762'];
  const pe2Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-05762',
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

  console.log('--- ALL DONE SUCCESSFULLY! ---');
}

executeNaziyaConversion().catch(err => {
  console.error('CONVERSION FAILED:', err);
  process.exit(1);
});
