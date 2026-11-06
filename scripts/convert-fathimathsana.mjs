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

async function executeFathimathsanaConversion() {
  const customerName = 'FATHIMATHSANA K A';
  const studentId = 'STU-SU ERV-26-001';
  const oldSoName = 'SAL-ORD-2026-00114';
  const penName = 'PEN-9th-Eraveli 26-27-001';

  console.log('====================================================');
  console.log('Starting Fee Conversion for FATHIMATHSANA K A');
  console.log('Target: Basic Plan | 6 Installments | Total: ₹19,500');
  console.log('====================================================\n');

  // 1. Fetch & Store existing 9 Payment Entries
  const peList = [
    'ACC-PAY-2026-03917',
    'ACC-PAY-2026-05152',
    'ACC-PAY-2026-05772',
    'ACC-PAY-2026-06637',
    'ACC-PAY-2026-06638',
    'ACC-PAY-2026-07849',
    'ACC-PAY-2026-07850',
    'ACC-PAY-2026-08308',
    'ACC-PAY-2026-08309'
  ];

  console.log('Step 1: Fetching and cancelling 9 Payment Entries...');
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
      const cData = await cancelRes.json();
      if (cData.exc) {
        throw new Error(`Failed to cancel PE ${peName}: ${JSON.stringify(cData)}`);
      }
      console.log(`Cancelled PE ${peName}`);
    } else {
      console.log(`PE ${peName} is already cancelled (docstatus: ${res.data?.docstatus})`);
    }
  }

  // 2. Cancel all 8 existing Sales Invoices
  console.log('\nStep 2: Cancelling old 8 Sales Invoices...');
  const oldInvoices = [
    'ACC-SINV-2026-01922',
    'ACC-SINV-2026-01923',
    'ACC-SINV-2026-01924',
    'ACC-SINV-2026-01925',
    'ACC-SINV-2026-01926',
    'ACC-SINV-2026-01927',
    'ACC-SINV-2026-01928',
    'ACC-SINV-2026-01929'
  ];

  for (const sinvName of oldInvoices) {
    const getRes = await (await fetch(`${frappeUrl}/api/resource/Sales Invoice/${encodeURIComponent(sinvName)}`, { headers })).json();
    if (getRes.data?.docstatus === 1) {
      const cancelRes = await fetch(`${frappeUrl}/api/resource/Sales Invoice/${encodeURIComponent(sinvName)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ docstatus: 2 })
      });
      const cData = await cancelRes.json();
      if (cData.exc) {
        throw new Error(`Failed to cancel SINV ${sinvName}: ${JSON.stringify(cData)}`);
      }
      console.log(`Cancelled SINV ${sinvName}`);
    } else {
      console.log(`SINV ${sinvName} is already cancelled (docstatus: ${getRes.data?.docstatus})`);
    }
  }

  // 3. Cancel old Sales Order & Create amended Sales Order for ₹19,500
  console.log('\nStep 3: Cancelling old Sales Order and creating amended Sales Order for ₹19,500...');
  const oldSoCheck = await (await fetch(`${frappeUrl}/api/resource/Sales Order/${encodeURIComponent(oldSoName)}`, { headers })).json();
  if (oldSoCheck.data?.docstatus === 1) {
    const cancelSoRes = await fetch(`${frappeUrl}/api/resource/Sales Order/${encodeURIComponent(oldSoName)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    const cData = await cancelSoRes.json();
    if (cData.exc) {
      throw new Error(`Failed to cancel SO ${oldSoName}: ${JSON.stringify(cData)}`);
    }
    console.log(`Cancelled SO ${oldSoName}`);
  }

  const oldSoDoc = oldSoCheck.data;
  // 6 installments: 5 * 3300 + 1 * 3000 = 19500. Rate = 19500 / 6 = 3250
  const newSoDoc = {
    doctype: 'Sales Order',
    amended_from: oldSoName,
    customer: oldSoDoc.customer,
    student: oldSoDoc.student,
    company: oldSoDoc.company,
    custom_academic_year: oldSoDoc.custom_academic_year || '2026-2027',
    transaction_date: oldSoDoc.transaction_date || '2026-03-24',
    delivery_date: oldSoDoc.delivery_date || '2026-03-24',
    custom_plan: 'Basic',
    custom_no_of_instalments: '6',
    docstatus: 1,
    items: [
      {
        item_code: oldSoDoc.items[0].item_code,
        item_name: oldSoDoc.items[0].item_name,
        qty: 6,
        rate: 3250,
        cost_center: oldSoDoc.items[0].cost_center || 'Main - SU ERV'
      }
    ],
    payment_schedule: [
      { due_date: '2026-04-15', payment_amount: 3300, invoice_portion: 0 },
      { due_date: '2026-05-15', payment_amount: 3300, invoice_portion: 0 },
      { due_date: '2026-06-15', payment_amount: 3300, invoice_portion: 0 },
      { due_date: '2026-07-15', payment_amount: 3300, invoice_portion: 0 },
      { due_date: '2026-08-15', payment_amount: 3300, invoice_portion: 0 },
      { due_date: '2026-09-15', payment_amount: 3000, invoice_portion: 0 }
    ]
  };

  const createSoRes = await fetch(`${frappeUrl}/api/resource/Sales Order`, {
    method: 'POST',
    headers,
    body: JSON.stringify(newSoDoc)
  });
  const newSoResData = await createSoRes.json();
  if (newSoResData.exc) {
    throw new Error(`Failed to create amended SO: ${JSON.stringify(newSoResData)}`);
  }
  const newSo = newSoResData.data;
  console.log(`Created new amended SO: ${newSo.name} | Grand Total: ₹${newSo.grand_total}`);
  const soDetail = newSo.items[0].name;

  // 4. Update Program Enrollment to Basic / 6
  console.log('\nStep 4: Updating Program Enrollment to Basic, 6 instalments...');
  const penRes = await fetch(`${frappeUrl}/api/resource/Program Enrollment/${encodeURIComponent(penName)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      custom_plan: 'Basic',
      custom_no_of_instalments: '6',
      custom_fee_structure: 'SU ERV-9th State-Basic-6'
    })
  });
  const penData = await penRes.json();
  if (penData.exc) {
    throw new Error(`Failed to update Program Enrollment: ${JSON.stringify(penData)}`);
  }
  console.log(`Updated Program Enrollment ${penName}: plan = ${penData.data?.custom_plan}, instalments = ${penData.data?.custom_no_of_instalments}, fee_structure = ${penData.data?.custom_fee_structure}`);

  // 5. Create 6 new Sales Invoices
  console.log('\nStep 5: Creating 6 new Sales Invoices linked to new SO...');
  const schedule = [
    { due: '2026-04-15', rate: 3300 },
    { due: '2026-05-15', rate: 3300 },
    { due: '2026-06-15', rate: 3300 },
    { due: '2026-07-15', rate: 3300 },
    { due: '2026-08-15', rate: 3300 },
    { due: '2026-09-15', rate: 3000 }
  ];

  const createdInvoices = [];
  for (let i = 0; i < schedule.length; i++) {
    const item = schedule[i];
    const newInvDoc = {
      doctype: 'Sales Invoice',
      customer: customerName,
      student: studentId,
      custom_student_email: 'fathimathsana.dummy@gmail.com',
      company: 'Smart Up Eraveli',
      custom_academic_year: '2026-2027',
      posting_date: '2026-03-24',
      set_posting_time: 1,
      posting_time: '00:00:00',
      due_date: item.due,
      debit_to: 'Debtors - SU ERV',
      docstatus: 1,
      items: [
        {
          item_code: '9th State Tuition Fee',
          item_name: '9th State Tuition Fee',
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
    const invData = await invRes.json();
    if (invData.exc) {
      throw new Error(`Failed to create invoice ${i + 1}: ${JSON.stringify(invData)}`);
    }
    createdInvoices.push(invData.data);
    console.log(`Created Inst ${i + 1}: ${invData.data.name} | Due: ${invData.data.due_date} | Amount: ₹${invData.data.grand_total}`);
  }

  // 6. Re-create all 9 Payment Entries with exact date, mode, ref, and amounts
  console.log('\nStep 6: Re-creating 9 Payment Entries preserving exact date, mode, ref, and amounts...');

  // Allocation Plan:
  // PE 1 (ACC-PAY-2026-03917, 3300) -> createdInvoices[0] (Total: 3300, Out: 3300, Alloc: 3300)
  // PE 2 (ACC-PAY-2026-05152, 3300) -> createdInvoices[1] (Total: 3300, Out: 3300, Alloc: 3300)
  // PE 3 (ACC-PAY-2026-05772, 3000) -> createdInvoices[2] (Total: 3300, Out: 3300, Alloc: 3000)
  // PE 4 (ACC-PAY-2026-06637, 300)  -> createdInvoices[2] (Total: 3300, Out: 300,  Alloc: 300)
  // PE 5 (ACC-PAY-2026-06638, 3000) -> createdInvoices[3] (Total: 3300, Out: 3300, Alloc: 3000)
  // PE 6 (ACC-PAY-2026-07849, 300)  -> createdInvoices[3] (Total: 3300, Out: 300,  Alloc: 300)
  // PE 7 (ACC-PAY-2026-07850, 3000) -> createdInvoices[4] (Total: 3300, Out: 3300, Alloc: 3000)
  // PE 8 (ACC-PAY-2026-08308, 300)  -> createdInvoices[4] (Total: 3300, Out: 300,  Alloc: 300)
  // PE 9 (ACC-PAY-2026-08309, 3000) -> createdInvoices[5] (Total: 3000, Out: 3000, Alloc: 3000)

  const allocations = [
    { pe: 'ACC-PAY-2026-03917', invIdx: 0, out: 3300, alloc: 3300 },
    { pe: 'ACC-PAY-2026-05152', invIdx: 1, out: 3300, alloc: 3300 },
    { pe: 'ACC-PAY-2026-05772', invIdx: 2, out: 3300, alloc: 3000 },
    { pe: 'ACC-PAY-2026-06637', invIdx: 2, out: 300,  alloc: 300 },
    { pe: 'ACC-PAY-2026-06638', invIdx: 3, out: 3300, alloc: 3000 },
    { pe: 'ACC-PAY-2026-07849', invIdx: 3, out: 300,  alloc: 300 },
    { pe: 'ACC-PAY-2026-07850', invIdx: 4, out: 3300, alloc: 3000 },
    { pe: 'ACC-PAY-2026-08308', invIdx: 4, out: 300,  alloc: 300 },
    { pe: 'ACC-PAY-2026-08309', invIdx: 5, out: 3000, alloc: 3000 }
  ];

  for (const item of allocations) {
    const oldPe = oldPeDocs[item.pe];
    const targetInv = createdInvoices[item.invIdx];
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
      paid_amount: item.alloc,
      received_amount: item.alloc,
      target_exchange_rate: 1,
      source_exchange_rate: 1,
      reference_no: oldPe.reference_no,
      reference_date: oldPe.reference_date,
      remarks: oldPe.remarks,
      docstatus: 1,
      references: [
        {
          reference_doctype: 'Sales Invoice',
          reference_name: targetInv.name,
          due_date: targetInv.due_date,
          total_amount: targetInv.grand_total,
          outstanding_amount: item.out,
          allocated_amount: item.alloc
        }
      ]
    };

    const res = await (await fetch(`${frappeUrl}/api/resource/Payment Entry`, {
      method: 'POST',
      headers,
      body: JSON.stringify(peDoc)
    })).json();

    if (res.exc) {
      throw new Error(`Failed to create PE from ${item.pe}: ${JSON.stringify(res)}`);
    }
    console.log(`Created PE from ${item.pe} -> ${res.data?.name} | Date: ${res.data?.posting_date} | Mode: ${res.data?.mode_of_payment} | Paid: ₹${res.data?.paid_amount} | Alloc to ${targetInv.name}`);
  }

  // 7. Verify the final active state
  console.log('\n====================================================');
  console.log('VERIFYING FINAL ACTIVE STATE (docstatus = 1)');
  console.log('====================================================');

  const checkFilters = [
    ['customer', '=', customerName],
    ['docstatus', '=', '1']
  ];
  const url = `${frappeUrl}/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify(checkFilters))}&fields=${encodeURIComponent(JSON.stringify(['name', 'due_date', 'grand_total', 'outstanding_amount', 'status']))}&order_by=due_date asc`;
  const checkRes = await (await fetch(url, { headers })).json();

  let totGrand = 0, totOut = 0;
  console.log('\nActive Invoices:');
  checkRes.data?.forEach((si, i) => {
    totGrand += si.grand_total;
    totOut += si.outstanding_amount;
    console.log(`Inst ${i + 1}: ${si.name} | Due: ${si.due_date} | Amount: ₹${si.grand_total} | Out: ₹${si.outstanding_amount} | Status: ${si.status}`);
  });
  console.log(`Total Invoiced: ₹${totGrand} (Expected: ₹19500)`);
  console.log(`Total Outstanding: ₹${totOut} (Expected: ₹0)`);

  const peRes = await (await fetch(`${frappeUrl}/api/resource/Payment Entry?filters=[["party","=","${customerName}"],["docstatus","=","1"]]&fields=["name","posting_date","paid_amount","mode_of_payment","reference_no"]&order_by=posting_date asc`, { headers })).json();
  let totPaid = 0;
  console.log('\nActive Payment Entries:');
  for (const pe of peRes.data || []) {
    totPaid += pe.paid_amount;
    console.log(`${pe.name} | Date: ${pe.posting_date} | Mode: ${pe.mode_of_payment} | Amount: ₹${pe.paid_amount} | Ref: ${pe.reference_no}`);
  }
  console.log(`Total Paid: ₹${totPaid} (Expected: ₹19500)`);
  console.log('\nCONVERSION COMPLETED SUCCESSFULLY!');
}

executeFathimathsanaConversion().catch(err => {
  console.error('\nCONVERSION FAILED:', err);
  process.exit(1);
});

