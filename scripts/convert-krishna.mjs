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

export async function executeKrishnaConversion() {
  const customerName = 'KRISHNA GADHA G';
  const studentId = 'STU-SU CHL-26-274';
  const oldSoName = 'SAL-ORD-2026-01403';
  const oldSinvName = 'ACC-SINV-2026-10222';
  const peList = ['ACC-PAY-2026-06015', 'ACC-PAY-2026-06364'];

  console.log(`Starting conversion for ${customerName} (${studentId})...`);

  // Step 1: Fetch and cancel old Payment Entries
  console.log('Step 1: Cancel old Payment Entries:', peList);
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
        due_date: '2026-06-22',
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
    custom_student_email: 'gopakumarkrishna123@gmail.com',
    company: oldSoDoc.company,
    custom_academic_year: '2026-2027',
    posting_date: '2026-06-22',
    set_posting_time: 1,
    posting_time: '00:00:00',
    due_date: '2026-06-22',
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

  // Step 6: Recreate Payment Entries with EXACT dates, modes, refs, accounts
  console.log('Step 6: Recreate Payment Entries...');
  
  // Payment 1: ACC-PAY-2026-06015 (2000, Cash, 2026-06-22)
  const pe1Old = oldPeDocs['ACC-PAY-2026-06015'];
  const pe1Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-06015',
    payment_type: pe1Old.payment_type,
    posting_date: pe1Old.posting_date, // 2026-06-22 (PRESERVED)
    mode_of_payment: pe1Old.mode_of_payment, // Cash (PRESERVED)
    company: pe1Old.company,
    party_type: pe1Old.party_type,
    party: pe1Old.party,
    paid_from: pe1Old.paid_from,
    paid_to: pe1Old.paid_to, // Cash - SU CHL (PRESERVED)
    paid_amount: 2000,
    received_amount: 2000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe1Old.reference_no, // CASH-1782132770099 (PRESERVED)
    reference_date: pe1Old.reference_date, // 2026-06-22 (PRESERVED)
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: newInv.name,
        due_date: newInv.due_date,
        total_amount: 15000,
        outstanding_amount: 15000,
        allocated_amount: 2000
      }
    ]
  };
  const createPe1Res = await (await fetch(`${frappeUrl}/api/resource/Payment Entry`, { method: 'POST', headers, body: JSON.stringify(pe1Doc) })).json();
  console.log('Created PE 1:', createPe1Res.data?.name, 'Paid:', createPe1Res.data?.paid_amount);

  // Payment 2: ACC-PAY-2026-06364 (13000, Cash, 2026-07-04)
  const pe2Old = oldPeDocs['ACC-PAY-2026-06364'];
  const pe2Doc = {
    doctype: 'Payment Entry',
    amended_from: 'ACC-PAY-2026-06364',
    payment_type: pe2Old.payment_type,
    posting_date: pe2Old.posting_date, // 2026-07-04 (PRESERVED)
    mode_of_payment: pe2Old.mode_of_payment, // Cash (PRESERVED)
    company: pe2Old.company,
    party_type: pe2Old.party_type,
    party: pe2Old.party,
    paid_from: pe2Old.paid_from,
    paid_to: pe2Old.paid_to, // Cash - SU CHL (PRESERVED)
    paid_amount: 13000,
    received_amount: 13000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe2Old.reference_no, // CASH-1783162132764 (PRESERVED)
    reference_date: pe2Old.reference_date, // 2026-07-04 (PRESERVED)
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: newInv.name,
        due_date: newInv.due_date,
        total_amount: 15000,
        outstanding_amount: 13000,
        allocated_amount: 13000
      }
    ]
  };
  const createPe2Res = await (await fetch(`${frappeUrl}/api/resource/Payment Entry`, { method: 'POST', headers, body: JSON.stringify(pe2Doc) })).json();
  console.log('Created PE 2:', createPe2Res.data?.name, 'Paid:', createPe2Res.data?.paid_amount);

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
  executeKrishnaConversion().catch(console.error);
} else {
  console.log('Dry run: specify --execute to apply changes.');
}

