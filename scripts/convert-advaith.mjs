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

async function executeAdvaithConversion() {
  const customerName = 'Advaith Krishna S prabhu';
  const studentId = 'STU-SU KDV-26-001';
  const oldSoName = 'SAL-ORD-2026-00104';
  const oldSinvName = 'ACC-SINV-2026-01883';
  const oldPeName = 'ACC-PAY-2026-03907';

  console.log('--- STARTING CONVERSION FOR ADVAITH KRISHNA S PRABHU ---');

  // Step 1: Fetch and Cancel Old Payment Entry
  console.log('\nStep 1: Fetch and Cancel old active Payment Entry...');
  const peRes = await fetch(`${frappeUrl}/api/resource/Payment Entry/${encodeURIComponent(oldPeName)}`, { headers });
  const oldPeDoc = (await peRes.json()).data;
  if (!oldPeDoc) {
    throw new Error(`Could not fetch Payment Entry ${oldPeName}`);
  }

  if (oldPeDoc.docstatus === 1) {
    const cancelPeRes = await fetch(`${frappeUrl}/api/resource/Payment Entry/${encodeURIComponent(oldPeName)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    const cancelPeData = await cancelPeRes.json();
    if (cancelPeData.exc) {
      throw new Error(`Failed to cancel PE: ${JSON.stringify(cancelPeData.exc)}`);
    }
    console.log(`Cancelled PE: ${oldPeName}`);
  } else {
    console.log(`PE ${oldPeName} docstatus is already ${oldPeDoc.docstatus}`);
  }

  // Step 2: Fetch and Cancel Old Sales Invoice
  console.log('\nStep 2: Fetch and Cancel old Sales Invoice...');
  const sinvRes = await fetch(`${frappeUrl}/api/resource/Sales Invoice/${encodeURIComponent(oldSinvName)}`, { headers });
  const oldSinvDoc = (await sinvRes.json()).data;
  if (!oldSinvDoc) {
    throw new Error(`Could not fetch Sales Invoice ${oldSinvName}`);
  }

  if (oldSinvDoc.docstatus === 1) {
    const cancelSinvRes = await fetch(`${frappeUrl}/api/resource/Sales Invoice/${encodeURIComponent(oldSinvName)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    const cancelSinvData = await cancelSinvRes.json();
    if (cancelSinvData.exc) {
      throw new Error(`Failed to cancel SINV: ${JSON.stringify(cancelSinvData.exc)}`);
    }
    console.log(`Cancelled SINV: ${oldSinvName}`);
  } else {
    console.log(`SINV ${oldSinvName} docstatus is already ${oldSinvDoc.docstatus}`);
  }

  // Step 3: Fetch, Cancel and Amend Sales Order
  console.log('\nStep 3: Fetch, Cancel and Amend Sales Order...');
  const soRes = await fetch(`${frappeUrl}/api/resource/Sales Order/${encodeURIComponent(oldSoName)}`, { headers });
  const oldSoDoc = (await soRes.json()).data;
  if (!oldSoDoc) {
    throw new Error(`Could not fetch Sales Order ${oldSoName}`);
  }

  if (oldSoDoc.docstatus === 1) {
    const cancelSoRes = await fetch(`${frappeUrl}/api/resource/Sales Order/${encodeURIComponent(oldSoName)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    const cancelSoData = await cancelSoRes.json();
    if (cancelSoData.exc) {
      throw new Error(`Failed to cancel SO: ${JSON.stringify(cancelSoData.exc)}`);
    }
    console.log(`Cancelled SO: ${oldSoName}`);
  } else {
    console.log(`SO ${oldSoName} docstatus is already ${oldSoDoc.docstatus}`);
  }

  const scheduleBreakdown = [
    { due: '2026-03-19', amount: 16000 },
    { due: '2026-09-15', amount: 8250 },
    { due: '2026-10-15', amount: 1950 },
    { due: '2026-11-15', amount: 1950 },
    { due: '2026-12-15', amount: 1950 },
    { due: '2027-01-15', amount: 1950 },
    { due: '2027-02-15', amount: 1950 },
    { due: '2027-03-15', amount: 1950 },
  ];

  const totalFee = scheduleBreakdown.reduce((sum, item) => sum + item.amount, 0); // 35950
  console.log(`Verified total fee calculation: ₹${totalFee}`);

  const newSoDoc = {
    doctype: 'Sales Order',
    amended_from: oldSoName,
    customer: oldSoDoc.customer,
    student: oldSoDoc.student,
    company: oldSoDoc.company,
    custom_academic_year: oldSoDoc.custom_academic_year,
    transaction_date: oldSoDoc.transaction_date,
    delivery_date: oldSoDoc.delivery_date,
    custom_plan: oldSoDoc.custom_plan || 'Advanced',
    custom_no_of_instalments: '8',
    docstatus: 1,
    items: [
      {
        item_code: oldSoDoc.items[0].item_code,
        item_name: oldSoDoc.items[0].item_name,
        qty: 1,
        rate: totalFee, // 35950
        cost_center: oldSoDoc.items[0].cost_center
      }
    ],
    payment_schedule: scheduleBreakdown.map(s => ({
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
  const createSoJson = await createSoRes.json();
  if (!createSoJson.data) {
    throw new Error(`Failed to create new SO: ${JSON.stringify(createSoJson)}`);
  }
  const newSo = createSoJson.data;
  console.log(`Created new Sales Order: ${newSo.name} with Grand Total: ₹${newSo.grand_total}`);
  const soDetail = newSo.items[0].name;

  // Step 4: Create 8 Individual Sales Invoices
  console.log('\nStep 4: Create 8 Sales Invoices linked to new SO...');
  const createdInvoices = [];

  for (let i = 0; i < scheduleBreakdown.length; i++) {
    const item = scheduleBreakdown[i];
    const newInvDoc = {
      doctype: 'Sales Invoice',
      customer: customerName,
      student: studentId,
      custom_student_email: oldSinvDoc.custom_student_email || 'dummy@gmail.com',
      company: oldSinvDoc.company,
      custom_academic_year: oldSinvDoc.custom_academic_year,
      posting_date: oldSinvDoc.posting_date, // 2026-03-19
      set_posting_time: 1,
      posting_time: '00:00:00',
      due_date: item.due,
      debit_to: oldSinvDoc.debit_to,
      docstatus: 1,
      items: [
        {
          item_code: oldSinvDoc.items[0].item_code,
          item_name: oldSinvDoc.items[0].item_name,
          description: `Installment ${i + 1} (${item.due}) — 10th CBSE Tuition Fee`,
          qty: 1,
          rate: item.amount,
          income_account: oldSinvDoc.items[0].income_account,
          cost_center: oldSinvDoc.items[0].cost_center,
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
    if (!invJson.data) {
      throw new Error(`Failed to create Sales Invoice for installment ${i + 1}: ${JSON.stringify(invJson)}`);
    }
    const invData = invJson.data;
    createdInvoices.push(invData);
    console.log(`Created Installment ${i + 1}: ${invData.name} | Due: ${invData.due_date} | Amount: ₹${invData.grand_total}`);
  }

  // Step 5: Re-create Payment Entry
  console.log('\nStep 5: Re-create Payment Entry for ₹16,000 linked to Installment 1...');
  const peDoc = {
    doctype: 'Payment Entry',
    amended_from: oldPeName,
    payment_type: oldPeDoc.payment_type,
    posting_date: oldPeDoc.posting_date, // 2026-03-19
    mode_of_payment: oldPeDoc.mode_of_payment, // Bank Transfer
    company: oldPeDoc.company,
    party_type: oldPeDoc.party_type,
    party: oldPeDoc.party,
    paid_from: oldPeDoc.paid_from,
    paid_to: oldPeDoc.paid_to,
    paid_amount: 16000,
    received_amount: 16000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: oldPeDoc.reference_no, // S22813514
    reference_date: oldPeDoc.reference_date, // 2026-03-19
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[0].name,
        due_date: createdInvoices[0].due_date,
        total_amount: 16000,
        outstanding_amount: 16000,
        allocated_amount: 16000
      }
    ]
  };

  const newPeRes = await fetch(`${frappeUrl}/api/resource/Payment Entry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(peDoc)
  });
  const newPeJson = await newPeRes.json();
  if (!newPeJson.data) {
    throw new Error(`Failed to create Payment Entry: ${JSON.stringify(newPeJson)}`);
  }
  const newPe = newPeJson.data;
  console.log(`Created Payment Entry: ${newPe.name} | Date: ${newPe.posting_date} | Mode: ${newPe.mode_of_payment} | Ref: ${newPe.reference_no} | Amount: ₹${newPe.paid_amount}`);

  // Step 6: Update Program Enrollment
  console.log('\nStep 6: Update Program Enrollment custom_no_of_instalments to 8...');
  const progEnrollmentName = 'PEN--Kadavanthara 26-27-001-1';
  const penRes = await fetch(`${frappeUrl}/api/resource/Program Enrollment/${encodeURIComponent(progEnrollmentName)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ custom_no_of_instalments: '8' })
  });
  const penJson = await penRes.json();
  console.log(`Updated Program Enrollment ${progEnrollmentName}: custom_no_of_instalments = ${penJson.data?.custom_no_of_instalments}`);

  console.log('\n--- CONVERSION FINISHED SUCCESSFULLY ---');
}

executeAdvaithConversion().catch(err => {
  console.error('\nEXECUTION ERROR:', err);
  process.exit(1);
});
