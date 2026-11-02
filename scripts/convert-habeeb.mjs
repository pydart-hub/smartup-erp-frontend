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

export async function executeHabeebConversion() {
  const customerName = 'MUHAMMED HABEEB MANSHAD';
  const studentId = 'STU-SU CHL-26-174';
  const oldSoName = 'SAL-ORD-2026-00785';

  const oldInvoices = [
    'ACC-SINV-2026-06210', 'ACC-SINV-2026-06211', 'ACC-SINV-2026-06213', 'ACC-SINV-2026-06214',
    'ACC-SINV-2026-06215', 'ACC-SINV-2026-06216', 'ACC-SINV-2026-06212-1', 'ACC-SINV-2026-06217'
  ];

  const peList = [
    'ACC-PAY-2026-04709', 'ACC-PAY-2026-05942', 'ACC-PAY-2026-06816', 'ACC-PAY-2026-07780', 'ACC-PAY-2026-08948'
  ];

  console.log(`Starting conversion for ${customerName} (${studentId})...`);

  // Step 1: Fetch and cancel old Payment Entries
  console.log('Step 1: Cancel old Payment Entries...');
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
      if (!cancelRes.ok) throw new Error(`Failed to cancel PE ${peName}: ${await cancelRes.text()}`);
      console.log('Cancelled old PE:', peName);
    }
  }

  // Step 2: Cancel old active Sales Invoices
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

  // Step 4: Create amended 8-installment Sales Order for 22300
  console.log('Step 4: Create amended Sales Order (Total: 22300, Plan: Basic, Installments: 8)...');
  const targetSchedule = [
    { due: '2026-05-02', amount: 3300 },
    { due: '2026-05-15', amount: 3300 },
    { due: '2026-07-15', amount: 3300 },
    { due: '2026-08-15', amount: 3300 },
    { due: '2026-09-15', amount: 3300 },
    { due: '2026-10-15', amount: 2400 },
    { due: '2026-11-15', amount: 2400 },
    { due: '2026-12-15', amount: 1000 }
  ];

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
    custom_no_of_instalments: '8',
    docstatus: 1,
    items: [
      {
        item_code: '10th State Tuition Fee',
        item_name: '10th State Tuition Fee',
        qty: 8,
        rate: 2787.5, // 8 * 2787.5 = 22300
        cost_center: oldSoDoc.items[0].cost_center
      }
    ],
    payment_schedule: targetSchedule.map(s => ({
      due_date: s.due,
      payment_amount: s.amount,
      invoice_portion: 0
    }))
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

  // Step 5: Create 8 Sales Invoices linked to new SO
  console.log('Step 5: Create 8 Sales Invoices...');
  const createdInvoices = [];
  for (let i = 0; i < targetSchedule.length; i++) {
    const item = targetSchedule[i];
    const newInvDoc = {
      doctype: 'Sales Invoice',
      customer: customerName,
      student: studentId,
      custom_student_email: 'manshad01@gmail.com',
      company: oldSoDoc.company,
      custom_academic_year: '2026-2027',
      posting_date: '2026-05-02',
      set_posting_time: 1,
      posting_time: '00:00:00',
      due_date: item.due,
      debit_to: 'Debtors - SU CHL',
      docstatus: 1,
      items: [
        {
          item_code: '10th State Tuition Fee',
          item_name: '10th State Tuition Fee',
          qty: 1,
          rate: item.amount,
          income_account: 'Sales - SU CHL',
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
    const invJson = await invRes.json();
    if (!invRes.ok) throw new Error(`Failed to create SINV: ${JSON.stringify(invJson)}`);
    const invData = invJson.data;
    createdInvoices.push(invData);
    console.log(`Created Inst ${i + 1}: ${invData.name} due ${invData.due_date} amount ${invData.grand_total}`);
  }

  // Step 6: Recreate 5 Payment Entries with EXACT dates, modes, refs, accounts
  console.log('Step 6: Recreate 5 Payment Entries...');
  for (let i = 0; i < peList.length; i++) {
    const peName = peList[i];
    const peOld = oldPeDocs[peName];
    const targetInvoice = createdInvoices[i]; // Each of the 5 PEs is 3300, matching Inst 1 to 5 exactly!

    const peDoc = {
      doctype: 'Payment Entry',
      amended_from: peName,
      payment_type: peOld.payment_type,
      posting_date: peOld.posting_date, // PRESERVED
      mode_of_payment: peOld.mode_of_payment, // PRESERVED
      company: peOld.company,
      party_type: peOld.party_type,
      party: peOld.party,
      paid_from: peOld.paid_from,
      paid_to: peOld.paid_to, // PRESERVED
      paid_amount: peOld.paid_amount,
      received_amount: peOld.received_amount,
      target_exchange_rate: 1,
      source_exchange_rate: 1,
      reference_no: peOld.reference_no, // PRESERVED
      reference_date: peOld.reference_date, // PRESERVED
      docstatus: 1,
      references: [
        {
          reference_doctype: 'Sales Invoice',
          reference_name: targetInvoice.name,
          due_date: targetInvoice.due_date,
          total_amount: targetInvoice.grand_total,
          outstanding_amount: targetInvoice.grand_total,
          allocated_amount: targetInvoice.grand_total
        }
      ]
    };

    const peRes = await (await fetch(`${frappeUrl}/api/resource/Payment Entry`, { method: 'POST', headers, body: JSON.stringify(peDoc) })).json();
    console.log(`Created PE ${i + 1} (${peName} -> ${peRes.data?.name}): Paid ${peRes.data?.paid_amount}, Date ${peRes.data?.posting_date}, Mode ${peRes.data?.mode_of_payment}`);
  }

  // Step 7: Update Program Enrollment custom_plan to Basic
  console.log('Step 7: Update Program Enrollment plan to Basic...');
  await fetch(`${frappeUrl}/api/resource/Program Enrollment/PEN-10th-Chullickal 26-27-174`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ custom_plan: 'Basic' })
  });

  // Step 8: Verify final invoices
  console.log('\n=== VERIFYING FINAL RESULT ===');
  const verifyRes = await (await fetch(`${frappeUrl}/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([['customer', '=', customerName], ['docstatus', '=', 1]]))}&fields=${encodeURIComponent(JSON.stringify(['name', 'due_date', 'grand_total', 'outstanding_amount', 'status']))}&order_by=due_date asc`, { headers })).json();
  console.table(verifyRes.data);
}

if (process.argv[2] === '--execute') {
  executeHabeebConversion().catch(console.error);
} else {
  console.log('Dry run: specify --execute to apply changes.');
}

