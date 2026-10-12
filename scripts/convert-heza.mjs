import fs from 'fs';

const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};

const BASE_URL = 'https://smartup.m.frappe.cloud';

async function main() {
  const customerId = 'HEZA FATHIMA PA';
  const customerName = 'HEZA FATHIMA PA';
  const oldSoName = 'SAL-ORD-2026-00291';

  console.log('--- STARTING CONVERSION FOR HEZA FATHIMA PA ---');

  // Step 1: Get old active Payment Entries
  const peRes = await fetch(`${BASE_URL}/api/resource/Payment%20Entry?filters=` + encodeURIComponent(JSON.stringify([
    ['party_name', '=', customerName],
    ['docstatus', '=', 1]
  ])) + `&fields=` + encodeURIComponent(JSON.stringify(['name', 'paid_amount', 'posting_date', 'mode_of_payment', 'reference_no', 'reference_date'])) + `&order_by=posting_date%20asc`, { headers });
  
  const oldPEs = (await peRes.json()).data;
  console.log(`Found ${oldPEs.length} active PEs to cancel:`);
  for (const pe of oldPEs) {
    console.log(`Cancelling PE: ${pe.name} (${pe.paid_amount})`);
    const cancelRes = await fetch(`${BASE_URL}/api/resource/Payment%20Entry/${pe.name}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    if (!cancelRes.ok) {
      throw new Error(`Failed to cancel PE ${pe.name}: ${await cancelRes.text()}`);
    }
  }

  // Step 2: Get and cancel old Sales Invoices
  const sinvRes = await fetch(`${BASE_URL}/api/resource/Sales%20Invoice?filters=` + encodeURIComponent(JSON.stringify([
    ['customer_name', '=', customerName],
    ['docstatus', '=', 1]
  ])) + `&fields=` + encodeURIComponent(JSON.stringify(['name'])) + `&order_by=posting_date%20asc`, { headers });

  const oldSINVs = (await sinvRes.json()).data;
  console.log(`Found ${oldSINVs.length} active SINVs to cancel:`);
  for (const inv of oldSINVs) {
    console.log(`Cancelling SINV: ${inv.name}`);
    const cancelRes = await fetch(`${BASE_URL}/api/resource/Sales%20Invoice/${inv.name}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    if (!cancelRes.ok) {
      throw new Error(`Failed to cancel SINV ${inv.name}: ${await cancelRes.text()}`);
    }
  }

  // Step 3: Fetch old SO, cancel it, create amended SO
  const oldSoRes = await fetch(`${BASE_URL}/api/resource/Sales%20Order/${oldSoName}`, { headers });
  const oldSo = (await oldSoRes.json()).data;

  console.log(`Cancelling SO: ${oldSoName}`);
  const cancelSoRes = await fetch(`${BASE_URL}/api/resource/Sales%20Order/${oldSoName}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  if (!cancelSoRes.ok) {
    throw new Error(`Failed to cancel SO ${oldSoName}: ${await cancelSoRes.text()}`);
  }

  // Build new payment schedule (8 installments)
  const scheduleAmounts = [2100, 2100, 2100, 2100, 2100, 2100, 2100, 1600];
  const dueDates = [
    '2026-04-15',
    '2026-05-15',
    '2026-06-15',
    '2026-07-15',
    '2026-08-15',
    '2026-09-15',
    '2026-10-15',
    '2026-11-15'
  ];

  const paymentSchedule = scheduleAmounts.map((amt, idx) => ({
    payment_term: `Inst ${idx + 1}`,
    due_date: dueDates[idx],
    invoice_portion: (amt / 16300) * 100,
    payment_amount: amt,
    outstanding: amt
  }));

  const amendedSoData = {
    ...oldSo,
    name: undefined,
    amended_from: oldSoName,
    docstatus: 1,
    items: oldSo.items.map(it => ({
      ...it,
      rate: 16300,
      amount: 16300
    })),
    payment_schedule: paymentSchedule
  };
  delete amendedSoData.name;

  const createSoRes = await fetch(`${BASE_URL}/api/resource/Sales%20Order`, {
    method: 'POST',
    headers,
    body: JSON.stringify(amendedSoData)
  });
  if (!createSoRes.ok) {
    throw new Error(`Failed to create amended SO: ${await createSoRes.text()}`);
  }
  const newSo = (await createSoRes.json()).data;
  console.log(`Created new SO: ${newSo.name} grand_total: ${newSo.grand_total}`);

  // Step 4: Create 8 Sales Invoices linked to new SO
  const newSINVs = [];
  for (let i = 0; i < 8; i++) {
    const amt = scheduleAmounts[i];
    const dueDate = dueDates[i];
    const invData = {
      customer: customerId,
      customer_name: customerName,
      posting_date: '2026-04-07',
      due_date: dueDate,
      docstatus: 1,
      items: [
        {
          item_code: oldSo.items[0].item_code,
          item_name: oldSo.items[0].item_name,
          qty: 1,
          rate: amt,
          amount: amt,
          sales_order: newSo.name,
          so_detail: newSo.items[0].name
        }
      ]
    };

    const createInvRes = await fetch(`${BASE_URL}/api/resource/Sales%20Invoice`, {
      method: 'POST',
      headers,
      body: JSON.stringify(invData)
    });
    if (!createInvRes.ok) {
      throw new Error(`Failed to create invoice ${i + 1}: ${await createInvRes.text()}`);
    }
    const inv = (await createInvRes.json()).data;
    console.log(`Created Inst ${i + 1}: ${inv.name} due: ${dueDate} amount: ${amt}`);
    newSINVs.push(inv);
  }

  // Step 5: Re-create Payment Entries
  // Old PEs:
  // 1: 1000 -> Inst 1 (1000)
  // 2: 1100 -> Inst 1 (1100) -> Inst 1 fully paid
  // 3: 2100 -> Inst 2 (2100) -> Inst 2 fully paid
  // 4: 2100 -> Inst 3 (2100) -> Inst 3 fully paid
  // 5: 2100 -> Inst 4 (2100) -> Inst 4 fully paid
  // 6: 2100 -> Inst 5 (2100) -> Inst 5 fully paid
  // 7: 500  -> Inst 6 (500)  -> Inst 6 1600 remaining
  const peConfigs = [
    {
      pe: oldPEs[0], // 1000
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[0].name, allocated_amount: 1000 }
      ]
    },
    {
      pe: oldPEs[1], // 1100
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[0].name, allocated_amount: 1100 }
      ]
    },
    {
      pe: oldPEs[2], // 2100
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[1].name, allocated_amount: 2100 }
      ]
    },
    {
      pe: oldPEs[3], // 2100
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[2].name, allocated_amount: 2100 }
      ]
    },
    {
      pe: oldPEs[4], // 2100
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[3].name, allocated_amount: 2100 }
      ]
    },
    {
      pe: oldPEs[5], // 2100
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[4].name, allocated_amount: 2100 }
      ]
    },
    {
      pe: oldPEs[6], // 500
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[5].name, allocated_amount: 500 }
      ]
    }
  ];

  for (let idx = 0; idx < peConfigs.length; idx++) {
    const cfg = peConfigs[idx];
    const oldPe = cfg.pe;
    const peDoc = {
      payment_type: 'Receive',
      party_type: 'Customer',
      party: customerId,
      party_name: customerName,
      posting_date: oldPe.posting_date,
      mode_of_payment: oldPe.mode_of_payment,
      paid_amount: oldPe.paid_amount,
      received_amount: oldPe.paid_amount,
      reference_no: oldPe.reference_no,
      reference_date: oldPe.reference_date || oldPe.posting_date,
      docstatus: 1,
      references: cfg.allocations
    };

    const createPeRes = await fetch(`${BASE_URL}/api/resource/Payment%20Entry`, {
      method: 'POST',
      headers,
      body: JSON.stringify(peDoc)
    });
    if (!createPeRes.ok) {
      throw new Error(`Failed to re-create PE ${idx + 1}: ${await createPeRes.text()}`);
    }
    const createdPE = (await createPeRes.json()).data;
    console.log(`Created PE ${idx + 1}: ${createdPE.name} ${createdPE.paid_amount}`);
  }

  console.log('--- ALL DONE SUCCESSFULLY! ---');
}

main().catch(err => {
  console.error('Error during conversion:', err);
  process.exit(1);
});
