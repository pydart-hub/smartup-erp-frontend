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

async function executeNihalConversion() {
  const customerName = 'MUHAMMED NIHAL M A';
  const studentId = 'STU-SU ERV-26-032';
  const oldSoName = 'SAL-ORD-2026-00267';

  console.log('=== Step 1: Fetch and Cancel existing Payment Entries ===');
  const peList = [
    'ACC-PAY-2026-04075',
    'ACC-PAY-2026-05685',
    'ACC-PAY-2026-06265',
    'ACC-PAY-2026-06266',
    'ACC-PAY-2026-07636',
    'ACC-PAY-2026-07637',
    'ACC-PAY-2026-08198',
    'ACC-PAY-2026-09728'
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
    'ACC-SINV-2026-02937',
    'ACC-SINV-2026-02938',
    'ACC-SINV-2026-09773',
    'ACC-SINV-2026-02939',
    'ACC-SINV-2026-02940',
    'ACC-SINV-2026-02941',
    'ACC-SINV-2026-02942',
    'ACC-SINV-2026-02943-1'
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
      custom_student_email: 'muhammednihalma.suerv.032@dummy.com',
      company: 'Smart Up Eraveli',
      custom_academic_year: '2026-2027',
      posting_date: '2026-04-07',
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

  async function createPE(oldName, references) {
    const oldPe = oldPeDocs[oldName];
    const peDoc = {
      doctype: 'Payment Entry',
      amended_from: oldPe.name,
      payment_type: oldPe.payment_type,
      posting_date: oldPe.posting_date,
      mode_of_payment: oldPe.mode_of_payment,
      company: oldPe.company,
      party_type: oldPe.party_type,
      party: oldPe.party,
      paid_from: oldPe.paid_from,
      paid_to: oldPe.paid_to,
      paid_amount: oldPe.paid_amount,
      received_amount: oldPe.received_amount,
      target_exchange_rate: 1,
      source_exchange_rate: 1,
      reference_no: oldPe.reference_no,
      reference_date: oldPe.reference_date,
      remarks: oldPe.remarks,
      docstatus: 1,
      references
    };
    const res = await (await fetch(`${frappeUrl}/api/resource/Payment Entry`, { method: 'POST', headers, body: JSON.stringify(peDoc) })).json();
    console.log(`Created PE from ${oldName}: ${res.data?.name} | Paid: ₹${res.data?.paid_amount} | Date: ${res.data?.posting_date}`);
  }

  // 1. ACC-PAY-2026-04075 (2100) -> Inst 1 (2100)
  await createPE('ACC-PAY-2026-04075', [
    { reference_doctype: 'Sales Invoice', reference_name: createdInvoices[0].name, due_date: createdInvoices[0].due_date, total_amount: 2100, outstanding_amount: 2100, allocated_amount: 2100 }
  ]);

  // 2. ACC-PAY-2026-05685 (2100) -> Inst 2 (2100)
  await createPE('ACC-PAY-2026-05685', [
    { reference_doctype: 'Sales Invoice', reference_name: createdInvoices[1].name, due_date: createdInvoices[1].due_date, total_amount: 2100, outstanding_amount: 2100, allocated_amount: 2100 }
  ]);

  // 3. ACC-PAY-2026-06265 (1500) -> Inst 3 (1500)
  await createPE('ACC-PAY-2026-06265', [
    { reference_doctype: 'Sales Invoice', reference_name: createdInvoices[2].name, due_date: createdInvoices[2].due_date, total_amount: 2100, outstanding_amount: 2100, allocated_amount: 1500 }
  ]);

  // 4. ACC-PAY-2026-06266 (600) -> Inst 3 (600, clears Inst 3)
  await createPE('ACC-PAY-2026-06266', [
    { reference_doctype: 'Sales Invoice', reference_name: createdInvoices[2].name, due_date: createdInvoices[2].due_date, total_amount: 2100, outstanding_amount: 600, allocated_amount: 600 }
  ]);

  // 5. ACC-PAY-2026-07636 (1800) -> Inst 4 (1800)
  await createPE('ACC-PAY-2026-07636', [
    { reference_doctype: 'Sales Invoice', reference_name: createdInvoices[3].name, due_date: createdInvoices[3].due_date, total_amount: 2100, outstanding_amount: 2100, allocated_amount: 1800 }
  ]);

  // 6. ACC-PAY-2026-07637 (300) -> Inst 4 (300, clears Inst 4)
  await createPE('ACC-PAY-2026-07637', [
    { reference_doctype: 'Sales Invoice', reference_name: createdInvoices[3].name, due_date: createdInvoices[3].due_date, total_amount: 2100, outstanding_amount: 300, allocated_amount: 300 }
  ]);

  // 7. ACC-PAY-2026-08198 (2100) -> Inst 5 (2100, clears Inst 5)
  await createPE('ACC-PAY-2026-08198', [
    { reference_doctype: 'Sales Invoice', reference_name: createdInvoices[4].name, due_date: createdInvoices[4].due_date, total_amount: 2100, outstanding_amount: 2100, allocated_amount: 2100 }
  ]);

  // 8. ACC-PAY-2026-09728 (2100) -> Inst 6 (2100, clears Inst 6)
  await createPE('ACC-PAY-2026-09728', [
    { reference_doctype: 'Sales Invoice', reference_name: createdInvoices[5].name, due_date: createdInvoices[5].due_date, total_amount: 2100, outstanding_amount: 2100, allocated_amount: 2100 }
  ]);

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
  console.log(`TOTAL OUTSTANDING: ₹${totalOut} (Expected: ₹3700)`);
}

executeNihalConversion().catch(console.error);
