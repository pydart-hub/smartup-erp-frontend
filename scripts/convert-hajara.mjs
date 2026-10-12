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

async function executeHajaraConversion() {
  const customerName = 'HAJARA BANU';
  const studentId = 'STU-SU ERV-26-062';
  const oldSoName = 'SAL-ORD-2026-00324';

  console.log('=== Step 1: Fetch and Cancel existing Payment Entry ===');
  const peName = 'ACC-PAY-2026-04135';
  const peRes = await (await fetch(`${frappeUrl}/api/resource/Payment Entry/${encodeURIComponent(peName)}`, { headers })).json();
  const oldPeDoc = peRes.data;
  if (oldPeDoc?.docstatus === 1) {
    const cancelRes = await fetch(`${frappeUrl}/api/resource/Payment Entry/${encodeURIComponent(peName)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log(`Cancelled PE ${peName}: status ${cancelRes.status}`);
  }

  console.log('\n=== Step 2: Cancel old Sales Invoices ===');
  const oldInvoices = [
    'ACC-SINV-2026-03295',
    'ACC-SINV-2026-03296',
    'ACC-SINV-2026-03297',
    'ACC-SINV-2026-03298',
    'ACC-SINV-2026-03299',
    'ACC-SINV-2026-03300',
    'ACC-SINV-2026-03301',
    'ACC-SINV-2026-03302'
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
      custom_student_email: 'hajarabanu.suerv.062@dummy.com',
      company: 'Smart Up Eraveli',
      custom_academic_year: '2026-2027',
      posting_date: '2026-04-08',
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

  console.log('\n=== Step 5: Re-create Payment Entry preserving mode, date, and amounts ===');

  // Payment 1: ACC-PAY-2026-04135 (₹2000 Cash, 2026-04-08) -> Inst 1 (allocated ₹2000, leaving ₹100 outstanding)
  const peDoc = {
    doctype: 'Payment Entry',
    amended_from: oldPeDoc.name,
    payment_type: oldPeDoc.payment_type,
    posting_date: oldPeDoc.posting_date,
    mode_of_payment: oldPeDoc.mode_of_payment,
    company: oldPeDoc.company,
    party_type: oldPeDoc.party_type,
    party: oldPeDoc.party,
    paid_from: oldPeDoc.paid_from,
    paid_to: oldPeDoc.paid_to,
    paid_amount: 2000,
    received_amount: 2000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: oldPeDoc.reference_no,
    reference_date: oldPeDoc.reference_date,
    remarks: oldPeDoc.remarks,
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
  const createPeRes = await (await fetch(`${frappeUrl}/api/resource/Payment Entry`, { method: 'POST', headers, body: JSON.stringify(peDoc) })).json();
  console.log(`Created PE: ${createPeRes.data?.name} | Paid: ₹${createPeRes.data?.paid_amount} | Date: ${createPeRes.data?.posting_date}`);

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
  console.log(`TOTAL OUTSTANDING: ₹${totalOut} (Expected: ₹14300)`);
}

executeHajaraConversion().catch(console.error);
