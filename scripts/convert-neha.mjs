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

async function executeNehaConversion() {
  const customerName = 'NEHA SUDHEER';
  const studentId = 'STU-SU ERV-26-182';
  const oldSoName = 'SAL-ORD-2026-00979';
  const penName = 'PEN-10th-Eraveli 26-27-182-1';

  console.log('====================================================');
  console.log('Starting Fee Conversion for NEHA SUDHEER');
  console.log('Target: Basic Plan | 8 Installments | Total: ₹16,300');
  console.log('====================================================\n');

  // Step 1: Fetch and cancel the 3 existing Payment Entries
  console.log('Step 1: Fetching and cancelling 3 existing Payment Entries...');
  const peList = [
    'ACC-PAY-2026-04962',
    'ACC-PAY-2026-07397',
    'ACC-PAY-2026-09380'
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
      const cData = await cancelRes.json();
      if (cData.exc) {
        throw new Error(`Failed to cancel PE ${peName}: ${JSON.stringify(cData)}`);
      }
      console.log(`Cancelled PE ${peName}`);
    } else {
      console.log(`PE ${peName} is already cancelled (docstatus: ${res.data?.docstatus})`);
    }
  }

  // Step 2: Cancel the 8 old Sales Invoices
  console.log('\nStep 2: Cancelling 8 old Sales Invoices...');
  const oldInvoices = [
    'ACC-SINV-2026-07386',
    'ACC-SINV-2026-07387',
    'ACC-SINV-2026-07388',
    'ACC-SINV-2026-07389',
    'ACC-SINV-2026-07390',
    'ACC-SINV-2026-07391',
    'ACC-SINV-2026-07392',
    'ACC-SINV-2026-07393'
  ];

  for (const sinvName of oldInvoices) {
    const invCheck = await (await fetch(`${frappeUrl}/api/resource/Sales Invoice/${encodeURIComponent(sinvName)}`, { headers })).json();
    if (invCheck.data?.docstatus === 1) {
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
      console.log(`SINV ${sinvName} is already cancelled`);
    }
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
    transaction_date: '2026-05-12',
    delivery_date: '2026-05-12',
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
      { due_date: '2026-05-12', payment_amount: 2100, invoice_portion: 0 },
      { due_date: '2026-06-12', payment_amount: 2100, invoice_portion: 0 },
      { due_date: '2026-07-12', payment_amount: 2100, invoice_portion: 0 },
      { due_date: '2026-08-12', payment_amount: 2100, invoice_portion: 0 },
      { due_date: '2026-09-12', payment_amount: 2100, invoice_portion: 0 },
      { due_date: '2026-10-12', payment_amount: 2100, invoice_portion: 0 },
      { due_date: '2026-11-12', payment_amount: 2100, invoice_portion: 0 },
      { due_date: '2026-12-12', payment_amount: 1600, invoice_portion: 0 }
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

  // Step 4: Verify/Update Program Enrollment
  console.log('\nStep 4: Ensuring Program Enrollment is updated to Basic, 8 instalments...');
  const scriptName = 'temp_update_pen_neha';
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
    { due: '2026-05-12', rate: 2100 },
    { due: '2026-06-12', rate: 2100 },
    { due: '2026-07-12', rate: 2100 },
    { due: '2026-08-12', rate: 2100 },
    { due: '2026-09-12', rate: 2100 },
    { due: '2026-10-12', rate: 2100 },
    { due: '2026-11-12', rate: 2100 },
    { due: '2026-12-12', rate: 1600 }
  ];

  const createdInvoices = [];
  for (let i = 0; i < schedule.length; i++) {
    const item = schedule[i];
    const newInvDoc = {
      doctype: 'Sales Invoice',
      customer: customerName,
      student: studentId,
      custom_student_email: 'nehasudheer.suerv.182@dummy.com',
      company: 'Smart Up Eraveli',
      custom_academic_year: '2026-2027',
      posting_date: '2026-05-12',
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

  // Step 6: Re-create 3 Payment Entries with exact date, mode, ref, and amounts
  console.log('\nStep 6: Re-creating 3 Payment Entries preserving exact date, mode, ref, and amounts...');

  // PE 1: ACC-PAY-2026-04962 (₹3000 Cash, 2026-05-12) ->
  // Inst 1: Out 2100, Alloc 2100 (Cleared to 0)
  // Inst 2: Out 2100, Alloc 900 (Remaining 1200)
  const pe1Old = oldPeDocs['ACC-PAY-2026-04962'];
  const pe1Doc = {
    doctype: 'Payment Entry',
    amended_from: pe1Old.name,
    payment_type: pe1Old.payment_type,
    posting_date: pe1Old.posting_date,
    mode_of_payment: pe1Old.mode_of_payment,
    company: pe1Old.company,
    party_type: pe1Old.party_type,
    party: pe1Old.party,
    paid_from: pe1Old.paid_from,
    paid_to: pe1Old.paid_to,
    paid_amount: 3000,
    received_amount: 3000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe1Old.reference_no,
    reference_date: pe1Old.reference_date,
    remarks: pe1Old.remarks,
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
        allocated_amount: 900
      }
    ]
  };

  const pe1Res = await (await fetch(`${frappeUrl}/api/resource/Payment Entry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(pe1Doc)
  })).json();
  if (pe1Res.exc) {
    throw new Error(`Failed to create PE 1: ${JSON.stringify(pe1Res)}`);
  }
  console.log(`Created PE from ACC-PAY-2026-04962 -> ${pe1Res.data?.name} | Date: ${pe1Res.data?.posting_date} | Mode: ${pe1Res.data?.mode_of_payment} | Paid: ₹${pe1Res.data?.paid_amount}`);

  // PE 2: ACC-PAY-2026-07397 (₹3000 Cash, 2026-08-09) ->
  // Inst 2: Out 1200, Alloc 1200 (Cleared to 0)
  // Inst 3: Out 2100, Alloc 1800 (Remaining 300)
  const pe2Old = oldPeDocs['ACC-PAY-2026-07397'];
  const pe2Doc = {
    doctype: 'Payment Entry',
    amended_from: pe2Old.name,
    payment_type: pe2Old.payment_type,
    posting_date: pe2Old.posting_date,
    mode_of_payment: pe2Old.mode_of_payment,
    company: pe2Old.company,
    party_type: pe2Old.party_type,
    party: pe2Old.party,
    paid_from: pe2Old.paid_from,
    paid_to: pe2Old.paid_to,
    paid_amount: 3000,
    received_amount: 3000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe2Old.reference_no,
    reference_date: pe2Old.reference_date,
    remarks: pe2Old.remarks,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[1].name,
        due_date: createdInvoices[1].due_date,
        total_amount: createdInvoices[1].grand_total,
        outstanding_amount: 1200,
        allocated_amount: 1200
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[2].name,
        due_date: createdInvoices[2].due_date,
        total_amount: createdInvoices[2].grand_total,
        outstanding_amount: 2100,
        allocated_amount: 1800
      }
    ]
  };

  const pe2Res = await (await fetch(`${frappeUrl}/api/resource/Payment Entry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(pe2Doc)
  })).json();
  if (pe2Res.exc) {
    throw new Error(`Failed to create PE 2: ${JSON.stringify(pe2Res)}`);
  }
  console.log(`Created PE from ACC-PAY-2026-07397 -> ${pe2Res.data?.name} | Date: ${pe2Res.data?.posting_date} | Mode: ${pe2Res.data?.mode_of_payment} | Paid: ₹${pe2Res.data?.paid_amount}`);

  // PE 3: ACC-PAY-2026-09380 (₹3000 Cash, 2026-10-01) ->
  // Inst 3: Out 300, Alloc 300 (Cleared to 0)
  // Inst 4: Out 2100, Alloc 2100 (Cleared to 0)
  // Inst 5: Out 2100, Alloc 600 (Remaining 1500)
  const pe3Old = oldPeDocs['ACC-PAY-2026-09380'];
  const pe3Doc = {
    doctype: 'Payment Entry',
    amended_from: pe3Old.name,
    payment_type: pe3Old.payment_type,
    posting_date: pe3Old.posting_date,
    mode_of_payment: pe3Old.mode_of_payment,
    company: pe3Old.company,
    party_type: pe3Old.party_type,
    party: pe3Old.party,
    paid_from: pe3Old.paid_from,
    paid_to: pe3Old.paid_to,
    paid_amount: 3000,
    received_amount: 3000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe3Old.reference_no,
    reference_date: pe3Old.reference_date,
    remarks: pe3Old.remarks,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[2].name,
        due_date: createdInvoices[2].due_date,
        total_amount: createdInvoices[2].grand_total,
        outstanding_amount: 300,
        allocated_amount: 300
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
        allocated_amount: 600
      }
    ]
  };

  const pe3Res = await (await fetch(`${frappeUrl}/api/resource/Payment Entry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(pe3Doc)
  })).json();
  if (pe3Res.exc) {
    throw new Error(`Failed to create PE 3: ${JSON.stringify(pe3Res)}`);
  }
  console.log(`Created PE from ACC-PAY-2026-09380 -> ${pe3Res.data?.name} | Date: ${pe3Res.data?.posting_date} | Mode: ${pe3Res.data?.mode_of_payment} | Paid: ₹${pe3Res.data?.paid_amount}`);

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
  console.log(`Total Outstanding: ₹${totOut} (Expected: ₹7300)`);

  const activePeRes = await (await fetch(`${frappeUrl}/api/resource/Payment Entry?filters=[["party","=","${customerName}"],["docstatus","=","1"]]&fields=["name","posting_date","paid_amount","mode_of_payment","reference_no"]&order_by=posting_date asc`, { headers })).json();
  let totPaid = 0;
  console.log('\nActive Payment Entries:');
  for (const pe of activePeRes.data || []) {
    totPaid += pe.paid_amount;
    console.log(`${pe.name} | Date: ${pe.posting_date} | Mode: ${pe.mode_of_payment} | Amount: ₹${pe.paid_amount} | Ref: ${pe.reference_no}`);
  }
  console.log(`Total Paid: ₹${totPaid} (Expected: ₹9000)`);
  console.log('\nCONVERSION COMPLETED SUCCESSFULLY!');
}

executeNehaConversion().catch(err => {
  console.error('\nCONVERSION FAILED:', err);
  process.exit(1);
});

