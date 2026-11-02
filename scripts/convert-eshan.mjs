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

export async function executeEshanConversion() {
  const customerName = 'ESHAN RAFEEK';
  const studentId = 'STU-SU CHL-26-228';
  const oldSoName = 'SAL-ORD-2026-01137';
  const oldSinvName = 'ACC-SINV-2026-08416';
  const oldPeName = 'ACC-PAY-2026-05274';

  console.log(`Starting conversion for ${customerName} (${studentId})...`);

  // Step 1: Fetch and cancel old Payment Entry
  console.log('Step 1: Cancel old Payment Entry:', oldPeName);
  const peRes = await (await fetch(`${frappeUrl}/api/resource/Payment Entry/${encodeURIComponent(oldPeName)}`, { headers })).json();
  const oldPeDoc = peRes.data;
  if (oldPeDoc?.docstatus === 1) {
    const cancelPeRes = await fetch(`${frappeUrl}/api/resource/Payment Entry/${encodeURIComponent(oldPeName)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    if (!cancelPeRes.ok) throw new Error(`Failed to cancel PE: ${await cancelPeRes.text()}`);
    console.log('Cancelled old PE successfully.');
  }

  // Step 2: Cancel old Sales Invoice
  console.log('Step 2: Cancel old Sales Invoice:', oldSinvName);
  const sinvRes = await (await fetch(`${frappeUrl}/api/resource/Sales Invoice/${encodeURIComponent(oldSinvName)}`, { headers })).json();
  const oldSinvDoc = sinvRes.data;
  if (oldSinvDoc?.docstatus === 1) {
    const cancelSinvRes = await fetch(`${frappeUrl}/api/resource/Sales Invoice/${encodeURIComponent(oldSinvName)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    if (!cancelSinvRes.ok) throw new Error(`Failed to cancel SINV: ${await cancelSinvRes.text()}`);
    console.log('Cancelled old SINV successfully.');
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

  // Step 4: Create amended 1-installment Sales Order for 20800
  console.log('Step 4: Create amended Sales Order (Total: 20800, Plan: Advanced, Installments: 1)...');
  const newSoDoc = {
    doctype: 'Sales Order',
    amended_from: oldSoName,
    customer: customerName,
    student: studentId,
    company: oldSoDoc.company,
    custom_academic_year: oldSoDoc.custom_academic_year,
    transaction_date: oldSoDoc.transaction_date,
    delivery_date: oldSoDoc.delivery_date,
    custom_plan: 'Advanced',
    custom_no_of_instalments: '1',
    docstatus: 1,
    items: [
      {
        item_code: '8th State Tuition Fee',
        item_name: '8th State Tuition Fee',
        qty: 1,
        rate: 20800,
        cost_center: oldSoDoc.items[0].cost_center
      }
    ],
    payment_schedule: [
      {
        due_date: '2026-06-01',
        payment_amount: 20800,
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

  // Step 5: Create 1 Sales Invoice for 20800 linked to new SO
  console.log('Step 5: Create new Sales Invoice (20800)...');
  const newInvDoc = {
    doctype: 'Sales Invoice',
    customer: customerName,
    student: studentId,
    custom_student_email: 'eshanrafeek.suchl.228@dummy.com',
    company: oldSoDoc.company,
    custom_academic_year: '2026-2027',
    posting_date: '2026-06-01',
    set_posting_time: 1,
    posting_time: '00:00:00',
    due_date: '2026-06-01',
    debit_to: 'Debtors - SU CHL',
    docstatus: 1,
    items: [
      {
        item_code: '8th State Tuition Fee',
        item_name: '8th State Tuition Fee',
        qty: 1,
        rate: 20800,
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

  // Step 6: Create amended Payment Entry with EXACT date, mode, ref
  console.log('Step 6: Recreate Payment Entry (Razorpay, 2026-06-01, 20800)...');
  const newPeDoc = {
    doctype: 'Payment Entry',
    amended_from: oldPeName,
    payment_type: oldPeDoc.payment_type,
    posting_date: oldPeDoc.posting_date, // 2026-06-01 (PRESERVED)
    mode_of_payment: oldPeDoc.mode_of_payment, // Razorpay (PRESERVED)
    company: oldPeDoc.company,
    party_type: oldPeDoc.party_type,
    party: oldPeDoc.party,
    paid_from: oldPeDoc.paid_from,
    paid_to: oldPeDoc.paid_to,
    paid_amount: 20800,
    received_amount: 20800,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: oldPeDoc.reference_no, // pay_SwNZnmu3wUypDa (PRESERVED)
    reference_date: oldPeDoc.reference_date, // 2026-06-01 (PRESERVED)
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: newInv.name,
        due_date: newInv.due_date,
        total_amount: 20800,
        outstanding_amount: 20800,
        allocated_amount: 20800
      }
    ]
  };

  const createPeRes = await fetch(`${frappeUrl}/api/resource/Payment Entry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(newPeDoc)
  });
  const peJson = await createPeRes.json();
  if (!createPeRes.ok) throw new Error(`Failed to create PE: ${JSON.stringify(peJson)}`);
  const newPe = peJson.data;
  console.log('Created new PE:', newPe.name, 'Date:', newPe.posting_date, 'Paid:', newPe.paid_amount, 'Allocated:', newPe.references[0]?.allocated_amount);

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
  executeEshanConversion().catch(console.error);
} else {
  console.log('Dry run: specify --execute to apply changes.');
}

