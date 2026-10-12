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

async function executeZiyaConversion() {
  const customerName = 'ZIYA UL HAQ B';
  const studentId = 'STU-SU ERV-26-063';
  const newSoName = 'SAL-ORD-2026-00325-1';

  console.log('=== Step 1: Verify Amended Sales Order ===');
  const soRes = await (await fetch(`${frappeUrl}/api/resource/Sales Order/${encodeURIComponent(newSoName)}`, { headers })).json();
  const soDoc = soRes.data;
  console.log('Amended SO:', soDoc?.name, 'docstatus:', soDoc?.docstatus, 'grand_total:', soDoc?.grand_total);
  const soDetail = soDoc.items[0].name;

  console.log('\n=== Step 2: Fetch Original Payment Entry Details for Re-creation ===');
  const peList = [
    'ACC-PAY-2026-04136',
    'ACC-PAY-2026-08511',
    'ACC-PAY-2026-08512',
    'ACC-PAY-2026-08513',
    'ACC-PAY-2026-08514'
  ];

  const oldPeDocs = {};
  for (const peName of peList) {
    const res = await (await fetch(`${frappeUrl}/api/resource/Payment Entry/${encodeURIComponent(peName)}`, { headers })).json();
    oldPeDocs[peName] = res.data;
  }

  console.log('\n=== Step 3: Create 8 New Sales Invoices ===');
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
      custom_student_email: 'ziyaulhaqb.suerv.063@dummy.com',
      company: 'Smart Up Eraveli',
      custom_academic_year: '2026-2027',
      posting_date: '2026-04-06',
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
          sales_order: newSoName,
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

  console.log('\n=== Step 4: Re-create Payment Entries preserving mode, date, and amounts ===');

  async function createPE(oldName, references) {
    const oldPe = oldPeDocs[oldName];
    const peDoc = {
      doctype: 'Payment Entry',
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
      docstatus: 1,
      references: references.map(r => ({
        reference_doctype: 'Sales Invoice',
        reference_name: r.invoiceName,
        total_amount: r.totalAmount,
        outstanding_amount: r.outstandingAmount,
        allocated_amount: r.allocatedAmount
      }))
    };

    const res = await fetch(`${frappeUrl}/api/resource/Payment Entry`, {
      method: 'POST',
      headers,
      body: JSON.stringify(peDoc)
    });
    const data = await res.json();
    console.log(`Created PE for ${oldName}: ${data.data?.name} | Amount: ₹${data.data?.paid_amount}`);
    return data.data;
  }

  // 1. ACC-PAY-2026-04136: ₹2,000 -> Inst 1 (₹2,000)
  await createPE('ACC-PAY-2026-04136', [
    {
      invoiceName: createdInvoices[0].name,
      totalAmount: 2100,
      outstandingAmount: 2100,
      allocatedAmount: 2000
    }
  ]);

  // 2. ACC-PAY-2026-08511: ₹2,100 -> Inst 1 (₹100) + Inst 2 (₹2,000)
  await createPE('ACC-PAY-2026-08511', [
    {
      invoiceName: createdInvoices[0].name,
      totalAmount: 2100,
      outstandingAmount: 100,
      allocatedAmount: 100
    },
    {
      invoiceName: createdInvoices[1].name,
      totalAmount: 2100,
      outstandingAmount: 2100,
      allocatedAmount: 2000
    }
  ]);

  // 3. ACC-PAY-2026-08512: ₹100 -> Inst 2 (₹100)
  await createPE('ACC-PAY-2026-08512', [
    {
      invoiceName: createdInvoices[1].name,
      totalAmount: 2100,
      outstandingAmount: 100,
      allocatedAmount: 100
    }
  ]);

  // 4. ACC-PAY-2026-08513: ₹2,100 -> Inst 3 (₹2,100)
  await createPE('ACC-PAY-2026-08513', [
    {
      invoiceName: createdInvoices[2].name,
      totalAmount: 2100,
      outstandingAmount: 2100,
      allocatedAmount: 2100
    }
  ]);

  // 5. ACC-PAY-2026-08514: ₹1,700 -> Inst 4 (₹1,700)
  await createPE('ACC-PAY-2026-08514', [
    {
      invoiceName: createdInvoices[3].name,
      totalAmount: 2100,
      outstandingAmount: 2100,
      allocatedAmount: 1700
    }
  ]);

  console.log('\n=== Step 5: Verification of Active Invoices ===');
  let totalOutstanding = 0;
  for (let i = 0; i < createdInvoices.length; i++) {
    const inv = createdInvoices[i];
    const checkRes = await fetch(`${frappeUrl}/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}`, { headers });
    const checkData = (await checkRes.json()).data;
    console.log(`Inst ${i + 1} (${checkData.name} | Due: ${checkData.due_date}): Total ₹${checkData.grand_total} | Outstanding: ₹${checkData.outstanding_amount} | Status: ${checkData.status}`);
    totalOutstanding += checkData.outstanding_amount;
  }

  console.log(`\nConversion Complete! Total Outstanding across all 8 installments: ₹${totalOutstanding}`);
}

executeZiyaConversion().catch(console.error);
