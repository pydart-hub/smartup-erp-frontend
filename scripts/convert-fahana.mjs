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

async function executeFahanaConversion() {
  const customerName = 'FAHANA MS';
  const studentId = 'STU-SU ERV-26-070';
  const oldSoName = 'SAL-ORD-2026-00352';

  console.log('=== Step 1: Fetch and Cancel existing Payment Entries ===');
  const peList = [
    'ACC-PAY-2026-04167',
    'ACC-PAY-2026-07690',
    'ACC-PAY-2026-07691',
    'ACC-PAY-2026-07692',
    'ACC-PAY-2026-09200',
    'ACC-PAY-2026-09201'
  ];

  const oldPeDocs = {};
  for (const peName of peList) {
    const res = await (await fetch(`${frappeUrl}/api/resource/Payment Entry/${encodeURIComponent(peName)}`, { headers })).json();
    oldPeDocs[peName] = res.data;
    if (res.data?.docstatus === 1) {
      const cancelRes = await fetch(`${frappeUrl}/api/resource/Payment Entry/${encodeURIComponent(peName)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 2 })
      });
      console.log(`Cancelled PE ${peName}: status ${cancelRes.status}`);
    }
  }

  console.log('\n=== Step 2: Cancel old Sales Invoices ===');
  const oldInvoices = [
    'ACC-SINV-2026-03467',
    'ACC-SINV-2026-03468',
    'ACC-SINV-2026-03469',
    'ACC-SINV-2026-03470',
    'ACC-SINV-2026-03471',
    'ACC-SINV-2026-03472',
    'ACC-SINV-2026-03473',
    'ACC-SINV-2026-03474'
  ];

  for (const sinvName of oldInvoices) {
    const getRes = await (await fetch(`${frappeUrl}/api/resource/Sales Invoice/${encodeURIComponent(sinvName)}`, { headers })).json();
    if (getRes.data?.docstatus === 1) {
      const cancelRes = await fetch(`${frappeUrl}/api/resource/Sales Invoice/${encodeURIComponent(sinvName)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 2 })
      });
      console.log(`Cancelled SINV ${sinvName}: status ${cancelRes.status}`);
    }
  }

  console.log('\n=== Step 3: Cancel old Sales Order and create amended SO for 16,300 ===');
  const oldSoCheck = await (await fetch(`${frappeUrl}/api/resource/Sales Order/${encodeURIComponent(oldSoName)}`, { headers })).json();
  if (oldSoCheck.data?.docstatus === 1) {
    const cancelSoRes = await fetch(`${frappeUrl}/api/resource/Sales Order/${encodeURIComponent(oldSoName)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log(`Cancelled SO ${oldSoName}: status ${cancelSoRes.status}`);
  }

  const oldSoDoc = oldSoCheck.data;
  // 8 installments total: 7 * 2100 + 1 * 1600 = 16300.
  // Average rate per qty of 8 = 16300 / 8 = 2037.5
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
        rate: 2037.5,
        cost_center: oldSoDoc.items[0].cost_center
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

  const createSoRes = await fetch(`${frappeUrl}/api/resource/Sales Order`, {
    method: 'POST',
    headers,
    body: JSON.stringify(newSoDoc)
  });
  const newSo = (await createSoRes.json()).data;
  console.log(`Created new amended SO: ${newSo.name}, Grand Total: ₹${newSo.grand_total}`);
  const soDetail = newSo.items[0].name;

  console.log('\n=== Step 4: Create 8 new Sales Invoices linked to new SO ===');
  const schedule = [
    { due: '2026-04-15', rate: 2100 },
    { due: '2026-05-15', rate: 2100 },
    { due: '2026-06-15', rate: 2100 },
    { due: '2026-07-15', rate: 2100 },
    { due: '2026-08-15', rate: 2100 },
    { due: '2026-09-15', rate: 2100 },
    { due: '2026-10-15', rate: 2100 },
    { due: '2026-11-15', rate: 1600 }
  ];

  const createdInvoices = [];
  for (let i = 0; i < schedule.length; i++) {
    const item = schedule[i];
    const newInvDoc = {
      doctype: 'Sales Invoice',
      customer: customerName,
      student: studentId,
      custom_student_email: 'fahanams.suerv.070@dummy.com',
      company: 'Smart Up Eraveli',
      custom_academic_year: '2026-2027',
      posting_date: '2026-04-10',
      set_posting_time: 1,
      posting_time: '00:00:00',
      due_date: item.due,
      debit_to: 'Debtors - SU ERV',
      docstatus: 1,
      items: [
        {
          item_code: '10th State Tuition Fee',
          item_name: '10th State Tuition Fee',
          qty: 1,
          rate: item.rate,
          income_account: 'Sales - SU ERV',
          cost_center: 'Main - SU ERV',
          sales_order: newSo.name,
          so_detail: soDetail
        }
      ]
    };

    const invRes = await fetch(`${frappeUrl}/api/resource/Sales Invoice`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newInvDoc)
    });
    const invData = (await invRes.json()).data;
    createdInvoices.push(invData);
    console.log(`Created Inst ${i + 1}: ${invData.name} | Due: ${invData.due_date} | Amount: ₹${invData.grand_total}`);
  }

  console.log('\n=== Step 5: Re-create Payment Entries preserving mode, date, and amounts ===');

  // Payment 1: ACC-PAY-2026-04167 (₹2000 Cash, 2026-04-10) -> Inst 1 (allocated ₹2000)
  const pe1Old = oldPeDocs['ACC-PAY-2026-04167'];
  const pe1Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-04167',
    payment_type: pe1Old.payment_type,
    posting_date: pe1Old.posting_date,
    mode_of_payment: pe1Old.mode_of_payment,
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
    remarks: pe1Old.remarks,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[0].name,
        due_date: createdInvoices[0].due_date,
        total_amount: 2100,
        outstanding_amount: 2100,
        allocated_amount: 2000
      }
    ]
  };
  const pe1Res = await (await fetch(`${frappeUrl}/api/resource/Payment Entry`, { method: 'POST', headers, body: JSON.stringify(pe1Doc) })).json();
  console.log(`Created PE 1: ${pe1Res.data?.name} | Paid: ₹${pe1Res.data?.paid_amount} | Date: ${pe1Res.data?.posting_date}`);

  // Payment 2: ACC-PAY-2026-07690 (₹100 Cash, 2026-08-14) -> Inst 1 (allocated ₹100, clearing Inst 1)
  const pe2Old = oldPeDocs['ACC-PAY-2026-07690'];
  const pe2Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-07690',
    payment_type: pe2Old.payment_type,
    posting_date: pe2Old.posting_date,
    mode_of_payment: pe2Old.mode_of_payment,
    company: pe2Old.company,
    party_type: pe2Old.party_type,
    party: pe2Old.party,
    paid_from: pe2Old.paid_from,
    paid_to: pe2Old.paid_to,
    paid_amount: 100,
    received_amount: 100,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe2Old.reference_no,
    reference_date: pe2Old.reference_date,
    remarks: pe2Old.remarks,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[0].name,
        due_date: createdInvoices[0].due_date,
        total_amount: 2100,
        outstanding_amount: 100,
        allocated_amount: 100
      }
    ]
  };
  const pe2Res = await (await fetch(`${frappeUrl}/api/resource/Payment Entry`, { method: 'POST', headers, body: JSON.stringify(pe2Doc) })).json();
  console.log(`Created PE 2: ${pe2Res.data?.name} | Paid: ₹${pe2Res.data?.paid_amount} | Date: ${pe2Res.data?.posting_date}`);

  // Payment 3: ACC-PAY-2026-07691 (₹2100 Cash, 2026-08-14) -> Inst 2 (allocated ₹2100, clearing Inst 2)
  const pe3Old = oldPeDocs['ACC-PAY-2026-07691'];
  const pe3Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-07691',
    payment_type: pe3Old.payment_type,
    posting_date: pe3Old.posting_date,
    mode_of_payment: pe3Old.mode_of_payment,
    company: pe3Old.company,
    party_type: pe3Old.party_type,
    party: pe3Old.party,
    paid_from: pe3Old.paid_from,
    paid_to: pe3Old.paid_to,
    paid_amount: 2100,
    received_amount: 2100,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe3Old.reference_no,
    reference_date: pe3Old.reference_date,
    remarks: pe3Old.remarks,
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
  const pe3Res = await (await fetch(`${frappeUrl}/api/resource/Payment Entry`, { method: 'POST', headers, body: JSON.stringify(pe3Doc) })).json();
  console.log(`Created PE 3: ${pe3Res.data?.name} | Paid: ₹${pe3Res.data?.paid_amount} | Date: ${pe3Res.data?.posting_date}`);

  // Payment 4: ACC-PAY-2026-07692 (₹800 Cash, 2026-08-14) -> Inst 3 (allocated ₹800)
  const pe4Old = oldPeDocs['ACC-PAY-2026-07692'];
  const pe4Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-07692',
    payment_type: pe4Old.payment_type,
    posting_date: pe4Old.posting_date,
    mode_of_payment: pe4Old.mode_of_payment,
    company: pe4Old.company,
    party_type: pe4Old.party_type,
    party: pe4Old.party,
    paid_from: pe4Old.paid_from,
    paid_to: pe4Old.paid_to,
    paid_amount: 800,
    received_amount: 800,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe4Old.reference_no,
    reference_date: pe4Old.reference_date,
    remarks: pe4Old.remarks,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[2].name,
        due_date: createdInvoices[2].due_date,
        total_amount: 2100,
        outstanding_amount: 2100,
        allocated_amount: 800
      }
    ]
  };
  const pe4Res = await (await fetch(`${frappeUrl}/api/resource/Payment Entry`, { method: 'POST', headers, body: JSON.stringify(pe4Doc) })).json();
  console.log(`Created PE 4: ${pe4Res.data?.name} | Paid: ₹${pe4Res.data?.paid_amount} | Date: ${pe4Res.data?.posting_date}`);

  // Payment 5: ACC-PAY-2026-09200 (₹1300 Cash, 2026-09-26) -> Inst 3 (allocated ₹1300, clearing Inst 3)
  const pe5Old = oldPeDocs['ACC-PAY-2026-09200'];
  const pe5Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-09200',
    payment_type: pe5Old.payment_type,
    posting_date: pe5Old.posting_date,
    mode_of_payment: pe5Old.mode_of_payment,
    company: pe5Old.company,
    party_type: pe5Old.party_type,
    party: pe5Old.party,
    paid_from: pe5Old.paid_from,
    paid_to: pe5Old.paid_to,
    paid_amount: 1300,
    received_amount: 1300,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe5Old.reference_no,
    reference_date: pe5Old.reference_date,
    remarks: pe5Old.remarks,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[2].name,
        due_date: createdInvoices[2].due_date,
        total_amount: 2100,
        outstanding_amount: 1300,
        allocated_amount: 1300
      }
    ]
  };
  const pe5Res = await (await fetch(`${frappeUrl}/api/resource/Payment Entry`, { method: 'POST', headers, body: JSON.stringify(pe5Doc) })).json();
  console.log(`Created PE 5: ${pe5Res.data?.name} | Paid: ₹${pe5Res.data?.paid_amount} | Date: ${pe5Res.data?.posting_date}`);

  // Payment 6: ACC-PAY-2026-09201 (₹800 Cash, 2026-09-26) -> Inst 4 (allocated ₹800, leaving ₹1300 outstanding)
  const pe6Old = oldPeDocs['ACC-PAY-2026-09201'];
  const pe6Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-09201',
    payment_type: pe6Old.payment_type,
    posting_date: pe6Old.posting_date,
    mode_of_payment: pe6Old.mode_of_payment,
    company: pe6Old.company,
    party_type: pe6Old.party_type,
    party: pe6Old.party,
    paid_from: pe6Old.paid_from,
    paid_to: pe6Old.paid_to,
    paid_amount: 800,
    received_amount: 800,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe6Old.reference_no,
    reference_date: pe6Old.reference_date,
    remarks: pe6Old.remarks,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[3].name,
        due_date: createdInvoices[3].due_date,
        total_amount: 2100,
        outstanding_amount: 2100,
        allocated_amount: 800
      }
    ]
  };
  const pe6Res = await (await fetch(`${frappeUrl}/api/resource/Payment Entry`, { method: 'POST', headers, body: JSON.stringify(pe6Doc) })).json();
  console.log(`Created PE 6: ${pe6Res.data?.name} | Paid: ₹${pe6Res.data?.paid_amount} | Date: ${pe6Res.data?.posting_date}`);

  console.log('\n=== VERIFYING FINAL RESULT ===');
  const checkFilters = [
    ['Sales Invoice Item', 'sales_order', '=', newSo.name],
    ['docstatus', '=', '1']
  ];
  const url = `${frappeUrl}/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify(checkFilters))}&fields=${encodeURIComponent(JSON.stringify(['name', 'due_date', 'grand_total', 'outstanding_amount', 'status']))}&order_by=due_date asc`;
  const checkRes = await (await fetch(url, { headers })).json();
  console.table(checkRes.data);

  let totalGrand = 0;
  let totalOut = 0;
  for (const inv of checkRes.data || []) {
    totalGrand += inv.grand_total;
    totalOut += inv.outstanding_amount;
  }
  console.log(`TOTAL GRAND: ₹${totalGrand} (Expected: ₹16300)`);
  console.log(`TOTAL OUTSTANDING: ₹${totalOut} (Expected: ₹9200)`);
}

executeFahanaConversion().catch(console.error);
