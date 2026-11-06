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

async function executeIrfanConversion() {
  const customerName = 'C A MOHAMMED IRFAN';
  const studentId = 'STU-SU ERV-26-036';
  const oldSoName = 'SAL-ORD-2026-00273';
  const penName = 'PEN-10th-Eraveli 26-27-036-1';
  const oldInvoiceName = 'ACC-SINV-2026-02979';
  const oldPeName = 'ACC-PAY-2026-04081';

  console.log('====================================================');
  console.log('Starting Fee Conversion for C A MOHAMMED IRFAN');
  console.log('Target: Basic Plan | 8 Installments | Total: ₹16,300');
  console.log('====================================================\n');

  // Step 1: Fetch and cancel the existing Payment Entry
  console.log('Step 1: Fetching and cancelling Payment Entry...');
  const peRes = await (await fetch(`${frappeUrl}/api/resource/Payment Entry/${encodeURIComponent(oldPeName)}`, { headers })).json();
  const oldPeDoc = peRes.data;
  if (oldPeDoc?.docstatus === 1) {
    const cancelRes = await fetch(`${frappeUrl}/api/resource/Payment Entry/${encodeURIComponent(oldPeName)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    const cData = await cancelRes.json();
    if (cData.exc) {
      throw new Error(`Failed to cancel PE ${oldPeName}: ${JSON.stringify(cData)}`);
    }
    console.log(`Cancelled PE ${oldPeName}`);
  } else {
    console.log(`PE ${oldPeName} is already cancelled (docstatus: ${oldPeDoc?.docstatus})`);
  }

  // Step 2: Cancel the old single Sales Invoice
  console.log('\nStep 2: Cancelling old Sales Invoice ACC-SINV-2026-02979...');
  const invCheck = await (await fetch(`${frappeUrl}/api/resource/Sales Invoice/${encodeURIComponent(oldInvoiceName)}`, { headers })).json();
  if (invCheck.data?.docstatus === 1) {
    const cancelRes = await fetch(`${frappeUrl}/api/resource/Sales Invoice/${encodeURIComponent(oldInvoiceName)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    const cData = await cancelRes.json();
    if (cData.exc) {
      throw new Error(`Failed to cancel SINV ${oldInvoiceName}: ${JSON.stringify(cData)}`);
    }
    console.log(`Cancelled SINV ${oldInvoiceName}`);
  } else {
    console.log(`SINV ${oldInvoiceName} is already cancelled`);
  }

  // Step 3: Cancel old Sales Order & Create amended Sales Order for ₹16,300
  console.log('\nStep 3: Cancelling old Sales Order and creating amended Sales Order for ₹16,300...');
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
  } else {
    console.log(`Old SO ${oldSoName} is already cancelled`);
  }

  const oldSoDoc = oldSoCheck.data;
  // 8 installments: 7 * 2100 + 1 * 1600 = 16300. Rate = 16300 / 8 = 2037.5
  const newSoDoc = {
    doctype: 'Sales Order',
    amended_from: oldSoName,
    customer: oldSoDoc.customer,
    student: oldSoDoc.student,
    company: oldSoDoc.company,
    custom_academic_year: oldSoDoc.custom_academic_year || '2026-2027',
    transaction_date: '2026-04-07',
    delivery_date: '2026-04-07',
    custom_plan: 'Basic',
    custom_no_of_instalments: '8',
    docstatus: 1,
    items: [
      {
        item_code: oldSoDoc.items[0].item_code,
        item_name: oldSoDoc.items[0].item_name,
        qty: 8,
        rate: 2037.5,
        cost_center: oldSoDoc.items[0].cost_center || 'Main - SU ERV'
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
  const newSoResData = await createSoRes.json();
  if (newSoResData.exc) {
    throw new Error(`Failed to create amended SO: ${JSON.stringify(newSoResData)}`);
  }
  const newSo = newSoResData.data;
  console.log(`Created new amended SO: ${newSo.name} | Grand Total: ₹${newSo.grand_total}`);
  const soDetail = newSo.items[0].name;

  // Step 4: Update Program Enrollment
  console.log('\nStep 4: Updating Program Enrollment to Basic, 8 instalments...');
  const scriptName = 'temp_update_pen_irfan';
  await fetch(`${frappeUrl}/api/resource/Server Script/${scriptName}`, { method: 'DELETE', headers }).catch(() => {});

  const patchCode = `
pen = "${penName}"
frappe.db.set_value("Program Enrollment", pen, "custom_plan", "Basic", update_modified=False)
frappe.db.set_value("Program Enrollment", pen, "custom_no_of_instalments", "8", update_modified=False)
frappe.db.set_value("Program Enrollment", pen, "custom_fee_structure", "SU ERV-10th State-Basic-8", update_modified=False)
frappe.db.commit()
frappe.response["message"] = {
  "plan": frappe.db.get_value("Program Enrollment", pen, "custom_plan"),
  "inst": frappe.db.get_value("Program Enrollment", pen, "custom_no_of_instalments"),
  "fs": frappe.db.get_value("Program Enrollment", pen, "custom_fee_structure")
}
`;

  const createScriptRes = await fetch(`${frappeUrl}/api/resource/Server Script`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: scriptName,
      script_type: 'API',
      api_method: scriptName,
      allow_guest: 0,
      disabled: 0,
      script: patchCode
    })
  });
  await createScriptRes.json();

  const callScriptRes = await (await fetch(`${frappeUrl}/api/method/${scriptName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({})
  })).json();
  console.log('Program Enrollment updated:', callScriptRes.message);

  await fetch(`${frappeUrl}/api/resource/Server Script/${scriptName}`, { method: 'DELETE', headers });
  console.log('Cleaned up helper Server Script');

  // Step 5: Create 8 new Sales Invoices
  console.log('\nStep 5: Creating 8 new Sales Invoices linked to new SO...');
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
      custom_student_email: 'camohammedirfan.suerv.036@dummy.com',
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
    const invData = await invRes.json();
    if (invData.exc) {
      throw new Error(`Failed to create invoice ${i + 1}: ${JSON.stringify(invData)}`);
    }
    createdInvoices.push(invData.data);
    console.log(`Created Inst ${i + 1}: ${invData.data.name} | Due: ${invData.data.due_date} | Amount: ₹${invData.data.grand_total}`);
  }

  // Step 6: Re-create Payment Entry preserving exact date, mode, ref, and amounts
  console.log('\nStep 6: Re-creating Payment Entry preserving exact date, mode, ref, and amounts...');

  // PE: ACC-PAY-2026-04081 (₹10000 Cash, 2026-04-07) ->
  // Inst 1: Out 2100, Alloc 2100
  // Inst 2: Out 2100, Alloc 2100
  // Inst 3: Out 2100, Alloc 2100
  // Inst 4: Out 2100, Alloc 2100
  // Inst 5: Out 2100, Alloc 1600
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
    paid_amount: 10000,
    received_amount: 10000,
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
        total_amount: createdInvoices[0].grand_total,
        outstanding_amount: 2100,
        allocated_amount: 2100
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[1].name,
        due_date: createdInvoices[1].due_date,
        total_amount: createdInvoices[1].grand_total,
        outstanding_amount: 2100,
        allocated_amount: 2100
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[2].name,
        due_date: createdInvoices[2].due_date,
        total_amount: createdInvoices[2].grand_total,
        outstanding_amount: 2100,
        allocated_amount: 2100
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[3].name,
        due_date: createdInvoices[3].due_date,
        total_amount: createdInvoices[3].grand_total,
        outstanding_amount: 2100,
        allocated_amount: 2100
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[4].name,
        due_date: createdInvoices[4].due_date,
        total_amount: createdInvoices[4].grand_total,
        outstanding_amount: 2100,
        allocated_amount: 1600
      }
    ]
  };

  const createPeRes = await (await fetch(`${frappeUrl}/api/resource/Payment Entry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(peDoc)
  })).json();
  if (createPeRes.exc) {
    throw new Error(`Failed to create PE: ${JSON.stringify(createPeRes)}`);
  }
  console.log(`Created PE from ACC-PAY-2026-04081 -> ${createPeRes.data?.name} | Date: ${createPeRes.data?.posting_date} | Mode: ${createPeRes.data?.mode_of_payment} | Paid: ₹${createPeRes.data?.paid_amount}`);

  // Step 7: Verify final state
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
  console.log(`Total Invoiced: ₹${totGrand} (Expected: ₹16300)`);
  console.log(`Total Outstanding: ₹${totOut} (Expected: ₹6300)`);

  const activePeRes = await (await fetch(`${frappeUrl}/api/resource/Payment Entry?filters=[["party","=","${customerName}"],["docstatus","=","1"]]&fields=["name","posting_date","paid_amount","mode_of_payment","reference_no"]&order_by=posting_date asc`, { headers })).json();
  let totPaid = 0;
  console.log('\nActive Payment Entries:');
  for (const pe of activePeRes.data || []) {
    totPaid += pe.paid_amount;
    console.log(`${pe.name} | Date: ${pe.posting_date} | Mode: ${pe.mode_of_payment} | Amount: ₹${pe.paid_amount} | Ref: ${pe.reference_no}`);
  }
  console.log(`Total Paid: ₹${totPaid} (Expected: ₹10000)`);
  console.log('\nCONVERSION COMPLETED SUCCESSFULLY!');
}

executeIrfanConversion().catch(err => {
  console.error('\nCONVERSION FAILED:', err);
  process.exit(1);
});

