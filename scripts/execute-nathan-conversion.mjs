import fs from 'fs';
import dotenv from 'dotenv';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const frappeUrl = envConfig.NEXT_PUBLIC_FRAPPE_URL || 'https://smartup.m.frappe.cloud';
const apiKey = envConfig.FRAPPE_API_KEY;
const apiSecret = envConfig.FRAPPE_API_SECRET;

const headers = {
  'Authorization': 'token ' + apiKey + ':' + apiSecret,
  'Content-Type': 'application/json'
};

async function executeNathanConversion() {
  const customerName = 'NATHAN JOSEPH';
  const studentId = 'STU-SU MMK-26-064';
  const currentSoName = 'SAL-ORD-2026-01265-1';

  console.log('=== STEP 1: Fetch and Cancel current active Payment Entries ===');
  const activePeList = [
    'ACC-PAY-2026-05512-1',
    'ACC-PAY-2026-06574-2',
    'ACC-PAY-2026-06575-2',
    'ACC-PAY-2026-08425-1',
    'ACC-PAY-2026-08426-1'
  ];

  const peDocs = {};
  for (const peName of activePeList) {
    const res = await (await fetch(frappeUrl + '/api/resource/Payment Entry/' + encodeURIComponent(peName), { headers })).json();
    peDocs[peName] = res.data;
    if (res.data?.docstatus === 1) {
      const cancelRes = await fetch(frappeUrl + '/api/resource/Payment Entry/' + encodeURIComponent(peName), {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 2 })
      });
      console.log('Cancelled PE:', peName, cancelRes.status);
    } else {
      console.log('PE not active:', peName, res.data?.docstatus);
    }
  }

  console.log('\n=== STEP 2: Cancel current active 8 Sales Invoices (14059 to 14066) ===');
  const activeInvoices = [
    'ACC-SINV-2026-14059', 'ACC-SINV-2026-14060', 'ACC-SINV-2026-14061', 'ACC-SINV-2026-14062',
    'ACC-SINV-2026-14063', 'ACC-SINV-2026-14064', 'ACC-SINV-2026-14065', 'ACC-SINV-2026-14066'
  ];

  for (const sinvName of activeInvoices) {
    const getRes = await (await fetch(frappeUrl + '/api/resource/Sales Invoice/' + encodeURIComponent(sinvName), { headers })).json();
    if (getRes.data?.docstatus === 1) {
      const cancelRes = await fetch(frappeUrl + '/api/resource/Sales Invoice/' + encodeURIComponent(sinvName), {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 2 })
      });
      console.log('Cancelled SINV:', sinvName, cancelRes.status);
    } else {
      console.log('SINV already cancelled:', sinvName);
    }
  }

  console.log('\n=== STEP 3: Cancel Sales Order SAL-ORD-2026-01265-1 and create amended SO for 14250 (Basic, 8 installments) ===');
  const soCheck = await (await fetch(frappeUrl + '/api/resource/Sales Order/' + encodeURIComponent(currentSoName), { headers })).json();
  if (soCheck.data?.docstatus === 1) {
    await fetch(frappeUrl + '/api/resource/Sales Order/' + encodeURIComponent(currentSoName), {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log('Cancelled SO:', currentSoName);
  }

  const soDoc = soCheck.data;
  const newSoDoc = {
    doctype: 'Sales Order',
    amended_from: currentSoName,
    customer: soDoc.customer,
    student: soDoc.student,
    company: soDoc.company,
    custom_academic_year: soDoc.custom_academic_year,
    transaction_date: soDoc.transaction_date,
    delivery_date: soDoc.delivery_date,
    custom_plan: 'Basic',
    custom_no_of_instalments: '8',
    docstatus: 1,
    items: [
      {
        item_code: '9th State Tuition Fee',
        item_name: '9th State Tuition Fee',
        qty: 8,
        rate: 1781.25, // 8 * 1781.25 = 14250
        cost_center: soDoc.items[0].cost_center
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
      { due_date: '2027-01-04', payment_amount: 950, invoice_portion: 0 }
    ]
  };

  const createSoRes = await fetch(frappeUrl + '/api/resource/Sales Order', {
    method: 'POST',
    headers,
    body: JSON.stringify(newSoDoc)
  });
  const newSoData = await createSoRes.json();
  if (!newSoData.data) {
    console.error('Failed to create new SO:', JSON.stringify(newSoData));
    throw new Error('SO creation failed');
  }
  const newSo = newSoData.data;
  console.log('Created new SO:', newSo.name, 'Grand Total:', newSo.grand_total, 'Plan:', newSo.custom_plan);
  const soDetail = newSo.items[0].name;

  console.log('\n=== STEP 4: Create 8 Sales Invoices linked to new SO (1900 * 7 + 950) ===');
  const schedule = [
    { due: '2026-06-04', rate: 1900 },
    { due: '2026-07-04', rate: 1900 },
    { due: '2026-08-04', rate: 1900 },
    { due: '2026-09-04', rate: 1900 },
    { due: '2026-10-04', rate: 1900 },
    { due: '2026-11-04', rate: 1900 },
    { due: '2026-12-04', rate: 1900 },
    { due: '2027-01-04', rate: 950 }
  ];

  const createdInvoices = [];
  for (let i = 0; i < schedule.length; i++) {
    const item = schedule[i];
    const newInvDoc = {
      doctype: 'Sales Invoice',
      customer: customerName,
      student: studentId,
      custom_student_email: 'nathanjoseph.summk.064@dummy.com',
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
    console.log(`Created Inst ${i + 1}: ${invData.name} | Due: ${invData.due_date} | Amount: ₹${invData.grand_total}`);
  }

  console.log('\n=== STEP 5: Re-create 5 Payment Entries with EXACT dates, modes, and amounts ===');

  // PE 1: ACC-PAY-2026-05512-1 (2500 Cash, 2026-06-04) -> 1900 to Inst 1, 600 to Inst 2
  const pe1Old = peDocs['ACC-PAY-2026-05512-1'];
  const pe1Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-05512-1',
    payment_type: pe1Old.payment_type,
    posting_date: pe1Old.posting_date, // 2026-06-04
    mode_of_payment: pe1Old.mode_of_payment, // Cash
    company: pe1Old.company,
    party_type: pe1Old.party_type,
    party: pe1Old.party,
    paid_from: pe1Old.paid_from,
    paid_to: pe1Old.paid_to,
    paid_amount: 2500,
    received_amount: 2500,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe1Old.reference_no,
    reference_date: pe1Old.reference_date,
    remarks: `Amount INR 2500 received from ${customerName}\nTransaction reference no ${pe1Old.reference_no} dated ${pe1Old.posting_date}\nAmount INR 1900 against Sales Invoice ${createdInvoices[0].name}\nAmount INR 600 against Sales Invoice ${createdInvoices[1].name}`,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[0].name,
        due_date: createdInvoices[0].due_date,
        total_amount: 1900,
        outstanding_amount: 1900,
        allocated_amount: 1900
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[1].name,
        due_date: createdInvoices[1].due_date,
        total_amount: 1900,
        outstanding_amount: 1900,
        allocated_amount: 600
      }
    ]
  };
  const pe1Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe1Doc) })).json();
  console.log('Created PE 1:', pe1Res.data?.name, '| Date:', pe1Res.data?.posting_date, '| Paid: ₹', pe1Res.data?.paid_amount);

  // PE 2: ACC-PAY-2026-06574-2 (500 Bank Transfer, 2026-07-04) -> 500 to Inst 2
  const pe2Old = peDocs['ACC-PAY-2026-06574-2'];
  const pe2Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-06574-2',
    payment_type: pe2Old.payment_type,
    posting_date: pe2Old.posting_date, // 2026-07-04
    mode_of_payment: pe2Old.mode_of_payment, // Bank Transfer
    company: pe2Old.company,
    party_type: pe2Old.party_type,
    party: pe2Old.party,
    paid_from: pe2Old.paid_from,
    paid_to: pe2Old.paid_to,
    paid_amount: 500,
    received_amount: 500,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe2Old.reference_no,
    reference_date: pe2Old.reference_date,
    remarks: `Amount INR 500 received from ${customerName}\nTransaction reference no ${pe2Old.reference_no} dated ${pe2Old.posting_date}\nAmount INR 500 against Sales Invoice ${createdInvoices[1].name}`,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[1].name,
        due_date: createdInvoices[1].due_date,
        total_amount: 1900,
        outstanding_amount: 1300,
        allocated_amount: 500
      }
    ]
  };
  const pe2Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe2Doc) })).json();
  console.log('Created PE 2:', pe2Res.data?.name, '| Date:', pe2Res.data?.posting_date, '| Paid: ₹', pe2Res.data?.paid_amount);

  // PE 3: ACC-PAY-2026-06575-2 (2500 Bank Transfer, 2026-07-04) -> 800 to Inst 2, 1700 to Inst 3
  const pe3Old = peDocs['ACC-PAY-2026-06575-2'];
  const pe3Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-06575-2',
    payment_type: pe3Old.payment_type,
    posting_date: pe3Old.posting_date, // 2026-07-04
    mode_of_payment: pe3Old.mode_of_payment, // Bank Transfer
    company: pe3Old.company,
    party_type: pe3Old.party_type,
    party: pe3Old.party,
    paid_from: pe3Old.paid_from,
    paid_to: pe3Old.paid_to,
    paid_amount: 2500,
    received_amount: 2500,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe3Old.reference_no,
    reference_date: pe3Old.reference_date,
    remarks: `Amount INR 2500 received from ${customerName}\nTransaction reference no ${pe3Old.reference_no} dated ${pe3Old.posting_date}\nAmount INR 800 against Sales Invoice ${createdInvoices[1].name}\nAmount INR 1700 against Sales Invoice ${createdInvoices[2].name}`,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[1].name,
        due_date: createdInvoices[1].due_date,
        total_amount: 1900,
        outstanding_amount: 800,
        allocated_amount: 800
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[2].name,
        due_date: createdInvoices[2].due_date,
        total_amount: 1900,
        outstanding_amount: 1900,
        allocated_amount: 1700
      }
    ]
  };
  const pe3Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe3Doc) })).json();
  console.log('Created PE 3:', pe3Res.data?.name, '| Date:', pe3Res.data?.posting_date, '| Paid: ₹', pe3Res.data?.paid_amount);

  // PE 4: ACC-PAY-2026-08425-1 (500 Cash, 2026-09-05) -> 200 to Inst 3, 300 to Inst 4
  const pe4Old = peDocs['ACC-PAY-2026-08425-1'];
  const pe4Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-08425-1',
    payment_type: pe4Old.payment_type,
    posting_date: pe4Old.posting_date, // 2026-09-05
    mode_of_payment: pe4Old.mode_of_payment, // Cash
    company: pe4Old.company,
    party_type: pe4Old.party_type,
    party: pe4Old.party,
    paid_from: pe4Old.paid_from,
    paid_to: pe4Old.paid_to,
    paid_amount: 500,
    received_amount: 500,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe4Old.reference_no,
    reference_date: pe4Old.reference_date,
    remarks: `Amount INR 500 received from ${customerName}\nTransaction reference no ${pe4Old.reference_no} dated ${pe4Old.posting_date}\nAmount INR 200 against Sales Invoice ${createdInvoices[2].name}\nAmount INR 300 against Sales Invoice ${createdInvoices[3].name}`,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[2].name,
        due_date: createdInvoices[2].due_date,
        total_amount: 1900,
        outstanding_amount: 200,
        allocated_amount: 200
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[3].name,
        due_date: createdInvoices[3].due_date,
        total_amount: 1900,
        outstanding_amount: 1900,
        allocated_amount: 300
      }
    ]
  };
  const pe4Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe4Doc) })).json();
  console.log('Created PE 4:', pe4Res.data?.name, '| Date:', pe4Res.data?.posting_date, '| Paid: ₹', pe4Res.data?.paid_amount);

  // PE 5: ACC-PAY-2026-08426-1 (2000 Cash, 2026-09-05) -> 1600 to Inst 4, 400 to Inst 5
  const pe5Old = peDocs['ACC-PAY-2026-08426-1'];
  const pe5Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-08426-1',
    payment_type: pe5Old.payment_type,
    posting_date: pe5Old.posting_date, // 2026-09-05
    mode_of_payment: pe5Old.mode_of_payment, // Cash
    company: pe5Old.company,
    party_type: pe5Old.party_type,
    party: pe5Old.party,
    paid_from: pe5Old.paid_from,
    paid_to: pe5Old.paid_to,
    paid_amount: 2000,
    received_amount: 2000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe5Old.reference_no,
    reference_date: pe5Old.reference_date,
    remarks: `Amount INR 2000 received from ${customerName}\nTransaction reference no ${pe5Old.reference_no} dated ${pe5Old.posting_date}\nAmount INR 1600 against Sales Invoice ${createdInvoices[3].name}\nAmount INR 400 against Sales Invoice ${createdInvoices[4].name}`,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[3].name,
        due_date: createdInvoices[3].due_date,
        total_amount: 1900,
        outstanding_amount: 1600,
        allocated_amount: 1600
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[4].name,
        due_date: createdInvoices[4].due_date,
        total_amount: 1900,
        outstanding_amount: 1900,
        allocated_amount: 400
      }
    ]
  };
  const pe5Res = await (await fetch(frappeUrl + '/api/resource/Payment Entry', { method: 'POST', headers, body: JSON.stringify(pe5Doc) })).json();
  console.log('Created PE 5:', pe5Res.data?.name, '| Date:', pe5Res.data?.posting_date, '| Paid: ₹', pe5Res.data?.paid_amount);

  console.log('\n=== STEP 6: Verify Final Invoices Statuses ===');
  const checkFilters = [
    ['Sales Invoice Item', 'sales_order', '=', newSo.name],
    ['docstatus', '=', '1']
  ];
  const url = frappeUrl + '/api/resource/Sales Invoice?filters=' + encodeURIComponent(JSON.stringify(checkFilters)) + '&fields=' + encodeURIComponent(JSON.stringify(['name', 'due_date', 'grand_total', 'outstanding_amount', 'status'])) + '&order_by=due_date asc';
  const checkRes = await (await fetch(url, { headers })).json();
  console.table(checkRes.data);
}

executeNathanConversion().catch(console.error);
