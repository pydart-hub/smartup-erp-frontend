const headers = { 
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 
  'Content-Type': 'application/json' 
};
const base = 'https://smartup.m.frappe.cloud';

async function main() {
  console.log('--- Starting Fee Conversion for AVINAND KRISHNA K A ---');

  // 1. Fetch details
  const oldSoName = 'SAL-ORD-2026-00779';
  const oldPayNames = ['ACC-PAY-2026-04703', 'ACC-PAY-2026-04825'];
  const oldSinvNames = ['ACC-SINV-2026-06175', 'ACC-SINV-2026-06176', 'ACC-SINV-2026-06177', 'ACC-SINV-2026-06178'];
  const customer = 'AVINAND KRISHNA K A';
  const company = 'Smart Up Moolamkuzhi';

  console.log('1. Fetching old Payment Entries to backup metadata...');
  const oldPays = [];
  for (const pName of oldPayNames) {
    const res = await fetch(`${base}/api/resource/Payment Entry/${pName}`, { headers });
    const data = (await res.json()).data;
    oldPays.push(data);
  }

  console.log('2. Fetching old Sales Order...');
  const soRes = await fetch(`${base}/api/resource/Sales Order/${oldSoName}`, { headers });
  const oldSo = (await soRes.json()).data;

  // Cancel old Payment Entries
  console.log('3. Cancelling old Payment Entries...');
  for (const pName of oldPayNames) {
    const cRes = await fetch(`${base}/api/resource/Payment Entry/${pName}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log(`Cancelled ${pName}:`, cRes.status);
    if (!cRes.ok) {
      console.error(await cRes.text());
      return;
    }
  }

  // Cancel old Sales Invoices
  console.log('4. Cancelling old Sales Invoices...');
  for (const sName of oldSinvNames) {
    const cRes = await fetch(`${base}/api/resource/Sales Invoice/${sName}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    console.log(`Cancelled ${sName}:`, cRes.status);
    if (!cRes.ok) {
      console.error(await cRes.text());
      return;
    }
  }

  // Cancel old Sales Order
  console.log('5. Cancelling old Sales Order...');
  const cSoRes = await fetch(`${base}/api/resource/Sales Order/${oldSoName}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  console.log(`Cancelled ${oldSoName}:`, cSoRes.status);
  if (!cSoRes.ok) {
    console.error(await cSoRes.text());
    return;
  }

  // Create amended Sales Order
  console.log('6. Creating amended Sales Order...');
  const newSoDoc = {
    doctype: 'Sales Order',
    amended_from: oldSoName,
    naming_series: oldSo.naming_series,
    customer: oldSo.customer,
    company: oldSo.company,
    transaction_date: oldSo.transaction_date,
    delivery_date: oldSo.delivery_date,
    order_type: oldSo.order_type || 'Sales',
    items: [
      {
        item_code: '10th State Tuition Fee',
        item_name: '10th State Tuition Fee',
        qty: 1,
        rate: 19100,
        amount: 19100,
        delivery_date: oldSo.delivery_date,
        uom: 'Nos',
        conversion_factor: 1,
        stock_uom: 'Nos'
      }
    ]
  };

  const createSoRes = await fetch(`${base}/api/resource/Sales Order`, {
    method: 'POST',
    headers,
    body: JSON.stringify(newSoDoc)
  });
  const createdSo = await createSoRes.json();
  if (!createSoRes.ok) {
    console.error('Failed to create SO:', JSON.stringify(createdSo, null, 2));
    return;
  }
  const newSoName = createdSo.data.name;
  console.log(`Created amended Sales Order draft: ${newSoName}`);

  // Submit new Sales Order
  const submitSoRes = await fetch(`${base}/api/resource/Sales Order/${newSoName}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 1 })
  });
  const submittedSo = await submitSoRes.json();
  if (!submitSoRes.ok) {
    console.error('Failed to submit SO:', JSON.stringify(submittedSo, null, 2));
    return;
  }
  console.log(`Submitted amended Sales Order: ${newSoName}`);

  // Fetch submitted SO to get item details
  const refetchedSoRes = await fetch(`${base}/api/resource/Sales Order/${newSoName}`, { headers });
  const refetchedSo = (await refetchedSoRes.json()).data;
  const soDetailName = refetchedSo.items[0].name;
  console.log(`SO Item Detail Name: ${soDetailName}`);

  // Installments definition
  const installments = [
    { num: 1, amount: 3000, due_date: '2026-04-30', posting_date: '2026-04-30' },
    { num: 2, amount: 3000, due_date: '2026-05-30', posting_date: '2026-04-30' },
    { num: 3, amount: 3000, due_date: '2026-06-30', posting_date: '2026-04-30' },
    { num: 4, amount: 2200, due_date: '2026-07-30', posting_date: '2026-04-30' },
    { num: 5, amount: 2200, due_date: '2026-08-30', posting_date: '2026-04-30' },
    { num: 6, amount: 2200, due_date: '2026-09-30', posting_date: '2026-04-30' },
    { num: 7, amount: 2200, due_date: '2026-10-30', posting_date: '2026-04-30' },
    { num: 8, amount: 1300, due_date: '2026-11-30', posting_date: '2026-04-30' },
  ];

  const createdInvoices = [];

  console.log('7. Creating and submitting 8 Sales Invoices...');
  for (const inst of installments) {
    const invDoc = {
      doctype: 'Sales Invoice',
      naming_series: 'ACC-SINV-.YYYY.-',
      customer: customer,
      company: company,
      posting_date: inst.posting_date,
      due_date: inst.due_date,
      set_posting_time: 1,
      posting_time: '00:00:00',
      items: [
        {
          item_code: '10th State Tuition Fee',
          item_name: '10th State Tuition Fee',
          description: `Inst ${inst.num} — 10th State Tuition Fee`,
          qty: 1,
          rate: inst.amount,
          amount: inst.amount,
          sales_order: newSoName,
          so_detail: soDetailName,
          income_account: 'Sales - SU MMK',
          cost_center: 'Main - SU MMK'
        }
      ],
      payment_schedule: [
        {
          due_date: inst.due_date,
          invoice_portion: 100,
          payment_amount: inst.amount
        }
      ]
    };

    const cInvRes = await fetch(`${base}/api/resource/Sales Invoice`, {
      method: 'POST',
      headers,
      body: JSON.stringify(invDoc)
    });
    const cInvData = await cInvRes.json();
    if (!cInvRes.ok) {
      console.error(`Failed to create invoice ${inst.num}:`, JSON.stringify(cInvData, null, 2));
      return;
    }
    const invName = cInvData.data.name;

    // Submit invoice
    const sInvRes = await fetch(`${base}/api/resource/Sales Invoice/${invName}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 1 })
    });
    const sInvData = await sInvRes.json();
    if (!sInvRes.ok) {
      console.error(`Failed to submit invoice ${invName}:`, JSON.stringify(sInvData, null, 2));
      return;
    }
    console.log(`Submitted Inst ${inst.num}: ${invName} (₹${inst.amount}, Due: ${inst.due_date})`);
    createdInvoices.push({ ...inst, name: invName });
  }

  // 8. Re-create Payment Entries
  console.log('8. Re-creating Payment Entries...');

  // PE 1: ₹1,000 against Inst 1
  const pe1Old = oldPays[0];
  const pe1Doc = {
    doctype: 'Payment Entry',
    amended_from: pe1Old.name,
    payment_type: 'Receive',
    party_type: 'Customer',
    party: customer,
    company: company,
    posting_date: pe1Old.posting_date, // 2026-04-30
    mode_of_payment: pe1Old.mode_of_payment, // Cash
    paid_from: pe1Old.paid_from,
    paid_to: pe1Old.paid_to,
    paid_amount: 1000,
    received_amount: 1000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe1Old.reference_no,
    reference_date: pe1Old.reference_date,
    remarks: `Amount INR 1000.0 received from ${customer}\nTransaction reference no ${pe1Old.reference_no} dated ${pe1Old.reference_date}\nAmount INR 1000.0 against Sales Invoice ${createdInvoices[0].name}`,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[0].name,
        total_amount: createdInvoices[0].amount,
        outstanding_amount: createdInvoices[0].amount,
        allocated_amount: 1000
      }
    ]
  };

  const createPe1Res = await fetch(`${base}/api/resource/Payment Entry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(pe1Doc)
  });
  const cPe1Data = await createPe1Res.json();
  if (!createPe1Res.ok) {
    console.error('Failed to create PE1:', JSON.stringify(cPe1Data, null, 2));
    return;
  }
  const pe1NewName = cPe1Data.data.name;

  const submitPe1Res = await fetch(`${base}/api/resource/Payment Entry/${pe1NewName}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 1 })
  });
  if (!submitPe1Res.ok) {
    console.error('Failed to submit PE1:', await submitPe1Res.text());
    return;
  }
  console.log(`Submitted amended PE1: ${pe1NewName} (₹1,000 on ${pe1Old.posting_date})`);

  // PE 2: ₹3,000 (₹2,000 to Inst 1, ₹1,000 to Inst 2)
  const pe2Old = oldPays[1];
  const pe2Doc = {
    doctype: 'Payment Entry',
    amended_from: pe2Old.name,
    payment_type: 'Receive',
    party_type: 'Customer',
    party: customer,
    company: company,
    posting_date: pe2Old.posting_date, // 2026-05-06
    mode_of_payment: pe2Old.mode_of_payment, // Cash
    paid_from: pe2Old.paid_from,
    paid_to: pe2Old.paid_to,
    paid_amount: 3000,
    received_amount: 3000,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    reference_no: pe2Old.reference_no,
    reference_date: pe2Old.reference_date,
    remarks: `Amount INR 3000.0 received from ${customer}\nTransaction reference no ${pe2Old.reference_no} dated ${pe2Old.reference_date}\nAmount INR 2000.0 against Sales Invoice ${createdInvoices[0].name}\nAmount INR 1000.0 against Sales Invoice ${createdInvoices[1].name}`,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[0].name,
        total_amount: createdInvoices[0].amount,
        outstanding_amount: 2000,
        allocated_amount: 2000
      },
      {
        reference_doctype: 'Sales Invoice',
        reference_name: createdInvoices[1].name,
        total_amount: createdInvoices[1].amount,
        outstanding_amount: createdInvoices[1].amount,
        allocated_amount: 1000
      }
    ]
  };

  const createPe2Res = await fetch(`${base}/api/resource/Payment Entry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(pe2Doc)
  });
  const cPe2Data = await createPe2Res.json();
  if (!createPe2Res.ok) {
    console.error('Failed to create PE2:', JSON.stringify(cPe2Data, null, 2));
    return;
  }
  const pe2NewName = cPe2Data.data.name;

  const submitPe2Res = await fetch(`${base}/api/resource/Payment Entry/${pe2NewName}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 1 })
  });
  if (!submitPe2Res.ok) {
    console.error('Failed to submit PE2:', await submitPe2Res.text());
    return;
  }
  console.log(`Submitted amended PE2: ${pe2NewName} (₹3,000 on ${pe2Old.posting_date})`);

  console.log('--- Conversion Completed Successfully! ---');
}

main().catch(console.error);
