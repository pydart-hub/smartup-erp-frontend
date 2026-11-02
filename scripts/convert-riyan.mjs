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

export async function executeRiyanConversion() {
  const customerName = 'RIYAN P R';
  const studentId = 'STU-SU CHL-26-297';
  const oldSoName = 'SAL-ORD-2026-01456';
  
  const oldInvoices = [
    'ACC-SINV-2026-10546', 'ACC-SINV-2026-10547', 'ACC-SINV-2026-10548', 'ACC-SINV-2026-10549',
    'ACC-SINV-2026-10550', 'ACC-SINV-2026-10551', 'ACC-SINV-2026-10552', 'ACC-SINV-2026-10553'
  ];

  const peList = [
    { name: 'ACC-PAY-2026-06211', amount: 2000 },
    { name: 'ACC-PAY-2026-09878', amount: 2000 },
    { name: 'ACC-PAY-2026-09879', amount: 2000 },
    { name: 'ACC-PAY-2026-09880', amount: 2000 },
    { name: 'ACC-PAY-2026-09881', amount: 2000 },
    { name: 'ACC-PAY-2026-09882', amount: 2000 },
    { name: 'ACC-PAY-2026-09883', amount: 2000 },
    { name: 'ACC-PAY-2026-09884', amount: 1000 }
  ];

  console.log(`Starting conversion for ${customerName} (${studentId})...`);

  // Step 1: Fetch and cancel old Payment Entries
  console.log('Step 1: Cancel old Payment Entries...');
  const oldPeDocs = {};
  for (const pe of peList) {
    const res = await (await fetch(`${frappeUrl}/api/resource/Payment Entry/${encodeURIComponent(pe.name)}`, { headers })).json();
    oldPeDocs[pe.name] = res.data;
    if (res.data?.docstatus === 1) {
      const cancelRes = await fetch(`${frappeUrl}/api/resource/Payment Entry/${encodeURIComponent(pe.name)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 2 })
      });
      if (!cancelRes.ok) throw new Error(`Failed to cancel PE ${pe.name}: ${await cancelRes.text()}`);
      console.log('Cancelled old PE:', pe.name);
    }
  }

  // Step 2: Cancel old Sales Invoices
  console.log('Step 2: Cancel old Sales Invoices...');
  for (const sinvName of oldInvoices) {
    const sinvRes = await (await fetch(`${frappeUrl}/api/resource/Sales Invoice/${encodeURIComponent(sinvName)}`, { headers })).json();
    if (sinvRes.data?.docstatus === 1) {
      const cancelSinvRes = await fetch(`${frappeUrl}/api/resource/Sales Invoice/${encodeURIComponent(sinvName)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 2 })
      });
      if (!cancelSinvRes.ok) throw new Error(`Failed to cancel SINV ${sinvName}: ${await cancelSinvRes.text()}`);
      console.log('Cancelled old SINV:', sinvName);
    }
  }

  // Step 3: Cancel old Sales Order
  console.log('Step 3: Cancel old Sales Order:', oldSoName);
  const soRes = await (await fetch(`${frappeUrl}/api/resource/Sales Order/${encodeURIComponent(oldSoName)}`, { headers })).json();
  const oldSoDoc = soRes.data;
  if (oldSoDoc?.docstatus === 1) {
    const cancelSoRes = await fetch(`${frappeUrl}/api/resource/Sales Order/${encodeURIComponent(oldSoName)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    if (!cancelSoRes.ok) throw new Error(`Failed to cancel SO: ${await cancelSoRes.text()}`);
    console.log('Cancelled old SO successfully.');
  }

  // Step 4: Create amended 1-installment Sales Order for 15000
  console.log('Step 4: Create amended Sales Order (Total: 15000, Plan: Basic, Installments: 1)...');
  const newSoDoc = {
    doctype: 'Sales Order',
    amended_from: oldSoName,
    customer: customerName,
    student: studentId,
    company: oldSoDoc.company,
    custom_academic_year: oldSoDoc.custom_academic_year,
    transaction_date: oldSoDoc.transaction_date,
    delivery_date: oldSoDoc.delivery_date,
    custom_plan: 'Basic',
    custom_no_of_instalments: '1',
    docstatus: 1,
    items: [
      {
        item_code: '11th Science State Tuition Fee',
        item_name: '11th Science State Tuition Fee',
        qty: 1,
        rate: 15000,
        cost_center: oldSoDoc.items[0].cost_center
      }
    ],
    payment_schedule: [
      {
        due_date: '2026-06-29',
        payment_amount: 15000,
        invoice_portion: 100
      }
    ]
  };

  const createSoRes = await fetch(`${frappeUrl}/api/resource/Sales Order`, {
    method: 'POST',
    headers,
    body: JSON.stringify(newSoDoc)
  });
  const soJson = await createSoRes.json();
  if (!createSoRes.ok) throw new Error(`Failed to create SO: ${JSON.stringify(soJson)}`);
  const newSo = soJson.data;
  console.log('Created new SO:', newSo.name, 'Grand Total:', newSo.grand_total);
  const soDetail = newSo.items[0].name;

  // Step 5: Create 1 Sales Invoice for 15000 linked to new SO
  console.log('Step 5: Create new Sales Invoice (15000)...');
  const newInvDoc = {
    doctype: 'Sales Invoice',
    customer: customerName,
    student: studentId,
    custom_student_email: 'nimmyttambi@gmail.com',
    company: oldSoDoc.company,
    custom_academic_year: '2026-2027',
    posting_date: '2026-06-29',
    set_posting_time: 1,
    posting_time: '00:00:00',
    due_date: '2026-06-29',
    debit_to: 'Debtors - SU CHL',
    docstatus: 1,
    items: [
      {
        item_code: '11th Science State Tuition Fee',
        item_name: '11th Science State Tuition Fee',
        qty: 1,
        rate: 15000,
        income_account: 'Sales - SU CHL',
        sales_order: newSo.name,
        so_detail: soDetail
      }
    ]
  };

  const createInvRes = await fetch(`${frappeUrl}/api/resource/Sales Invoice`, {
    method: 'POST',
    headers,
    body: JSON.stringify(newInvDoc)
  });
  const invJson = await createInvRes.json();
  if (!createInvRes.ok) throw new Error(`Failed to create SINV: ${JSON.stringify(invJson)}`);
  const newInv = invJson.data;
  console.log('Created new SINV:', newInv.name, 'Due:', newInv.due_date, 'Grand Total:', newInv.grand_total);

  // Step 6: Recreate 8 Payment Entries with EXACT dates, modes, refs, accounts
  console.log('Step 6: Recreate 8 Payment Entries...');
  let remainingOutstanding = 15000;

  for (let i = 0; i < peList.length; i++) {
    const item = peList[i];
    const peOld = oldPeDocs[item.name];
    const peDoc = {
      doctype: 'Payment Entry',
      amended_from: item.name,
      payment_type: peOld.payment_type,
      posting_date: peOld.posting_date, // PRESERVED
      mode_of_payment: peOld.mode_of_payment, // Cash (PRESERVED)
      company: peOld.company,
      party_type: peOld.party_type,
      party: peOld.party,
      paid_from: peOld.paid_from,
      paid_to: peOld.paid_to, // Cash - SU CHL (PRESERVED)
      paid_amount: item.amount,
      received_amount: item.amount,
      target_exchange_rate: 1,
      source_exchange_rate: 1,
      reference_no: peOld.reference_no, // PRESERVED
      reference_date: peOld.reference_date, // PRESERVED
      docstatus: 1,
      references: [
        {
          reference_doctype: 'Sales Invoice',
          reference_name: newInv.name,
          due_date: newInv.due_date,
          total_amount: 15000,
          outstanding_amount: remainingOutstanding,
          allocated_amount: item.amount
        }
      ]
    };

    const peRes = await (await fetch(`${frappeUrl}/api/resource/Payment Entry`, { method: 'POST', headers, body: JSON.stringify(peDoc) })).json();
    console.log(`Created PE ${i + 1} (${item.name} -> ${peRes.data?.name}): Paid ${peRes.data?.paid_amount}, Date ${peRes.data?.posting_date}`);
    remainingOutstanding -= item.amount;
  }

  // Step 7: Verify final status
  console.log('\n=== VERIFYING FINAL RESULT ===');
  const verifyInv = await (await fetch(`${frappeUrl}/api/resource/Sales Invoice/${encodeURIComponent(newInv.name)}`, { headers })).json();
  console.log('Sales Invoice Status:', {
    name: verifyInv.data.name,
    due_date: verifyInv.data.due_date,
    grand_total: verifyInv.data.grand_total,
    outstanding_amount: verifyInv.data.outstanding_amount,
    status: verifyInv.data.status
  });
}

if (process.argv[2] === '--execute') {
  executeRiyanConversion().catch(console.error);
} else {
  console.log('Dry run: specify --execute to apply changes.');
}

