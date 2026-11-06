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

async function executeNadhiyaConversion() {
  const customerName = 'NADHIYA K A';
  const studentId = 'STU-SU ERV-26-120';
  const oldSoName = 'SAL-ORD-2026-00606';
  const penName = 'PEN-10th-Eraveli 26-27-120';
  const oldInvoiceName = 'ACC-SINV-2026-05204';

  console.log('====================================================');
  console.log('Starting Fee Conversion for NADHIYA K A');
  console.log('Target: Basic Plan | 8 Installments | Total: ₹16,300');
  console.log('====================================================\n');

  // Step 1: Fetch and cancel the 2 existing Payment Entries
  console.log('Step 1: Checking and cancelling 2 existing Payment Entries...');
  const peList = [
    'ACC-PAY-2026-08466',
    'ACC-PAY-2026-08537'
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

  // Step 2: Cancel the old single Sales Invoice
  console.log('\nStep 2: Checking and cancelling old Sales Invoice ACC-SINV-2026-05204...');
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

  // Step 3: Check/Cancel old Sales Order & Create amended Sales Order for ₹16,300
  console.log('\nStep 3: Creating amended Sales Order for ₹16,300...');
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

  // Check if an amended SO already exists
  const existingAmendedSo = await (await fetch(`${frappeUrl}/api/resource/Sales Order?filters=[["amended_from","=","${oldSoName}"],["docstatus","=","1"]]&fields=["name","grand_total"]`, { headers })).json();

  let newSo = existingAmendedSo.data?.[0];
  if (!newSo) {
    const oldSoDoc = oldSoCheck.data;
    // Set transaction_date to '2026-04-15' so that Row 1 due date (2026-04-15) is >= posting/transaction date
    const newSoDoc = {
      doctype: 'Sales Order',
      amended_from: oldSoName,
      customer: oldSoDoc.customer,
      student: oldSoDoc.student,
      company: oldSoDoc.company,
      custom_academic_year: oldSoDoc.custom_academic_year || '2026-2027',
      transaction_date: '2026-04-15',
      delivery_date: '2026-04-15',
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
    newSo = newSoResData.data;
    console.log(`Created new amended SO: ${newSo.name} | Grand Total: ₹${newSo.grand_total}`);
  } else {
    console.log(`Using already created amended SO: ${newSo.name}`);
  }

  // Fetch full SO to get item row name
  const fullSoRes = await (await fetch(`${frappeUrl}/api/resource/Sales Order/${encodeURIComponent(newSo.name)}`, { headers })).json();
  const soDetail = fullSoRes.data.items[0].name;

  // Step 4: Update Program Enrollment via Server Script
  console.log('\nStep 4: Updating Program Enrollment to Basic, 8 instalments...');
  const scriptName = 'temp_update_pen_nadhiya';
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
      custom_student_email: 'nadhiyaka.suerv.120@dummy.com',
      company: 'Smart Up Eraveli',
      custom_academic_year: '2026-2027',
      posting_date: '2026-04-15',
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

  // Step 6: Re-create 2 Payment Entries with exact date, mode, ref, and amounts
  console.log('\nStep 6: Re-creating 2 Payment Entries preserving exact date, mode, ref, and amounts...');

  // PE 1: ACC-PAY-2026-08466 (₹2000 Cash, 2026-09-07) -> allocated to Inst 1 (Total: 2100, Out: 2100, Alloc: 2000)
  const pe1Old = oldPeDocs['ACC-PAY-2026-08466'];
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
    paid_amount: 2000,
    received_amount: 2000,
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
        allocated_amount: 2000
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
  console.log(`Created PE from ACC-PAY-2026-08466 -> ${pe1Res.data?.name} | Date: ${pe1Res.data?.posting_date} | Mode: ${pe1Res.data?.mode_of_payment} | Paid: ₹${pe1Res.data?.paid_amount}`);

  // PE 2: ACC-PAY-2026-08537 (₹5000 Cash, 2026-09-08) ->
  // Inst 1: Out: 100, Alloc: 100
  // Inst 2: Out: 2100, Alloc: 2100
  // Inst 3: Out: 2100, Alloc: 2100
  // Inst 4: Out: 2100, Alloc: 700
  const pe2Old = oldPeDocs['ACC-PAY-2026-08537'];
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
    paid_amount: 5000,
    received_amount: 5000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe2Old.reference_no,
    reference_date: pe2Old.reference_date,
    remarks: pe2Old.remarks,
    docstatus: 1,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[0].name,
        due_date: createdInvoices[0].due_date,
        total_amount: createdInvoices[0].grand_total,
        outstanding_amount: 100,
        allocated_amount: 100
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
        allocated_amount: 700
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
  console.log(`Created PE from ACC-PAY-2026-08537 -> ${pe2Res.data?.name} | Date: ${pe2Res.data?.posting_date} | Mode: ${pe2Res.data?.mode_of_payment} | Paid: ₹${pe2Res.data?.paid_amount}`);

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
  console.log(`Total Outstanding: ₹${totOut} (Expected: ₹9300)`);

  const activePeRes = await (await fetch(`${frappeUrl}/api/resource/Payment Entry?filters=[["party","=","${customerName}"],["docstatus","=","1"]]&fields=["name","posting_date","paid_amount","mode_of_payment","reference_no"]&order_by=posting_date asc`, { headers })).json();
  let totPaid = 0;
  console.log('\nActive Payment Entries:');
  for (const pe of activePeRes.data || []) {
    totPaid += pe.paid_amount;
    console.log(`${pe.name} | Date: ${pe.posting_date} | Mode: ${pe.mode_of_payment} | Amount: ₹${pe.paid_amount} | Ref: ${pe.reference_no}`);
  }
  console.log(`Total Paid: ₹${totPaid} (Expected: ₹7000)`);
  console.log('\nCONVERSION COMPLETED SUCCESSFULLY!');
}

executeNadhiyaConversion().catch(err => {
  console.error('\nCONVERSION FAILED:', err);
  process.exit(1);
});
