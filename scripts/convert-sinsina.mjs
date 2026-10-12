import fs from 'fs';

const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};

const BASE_URL = 'https://smartup.m.frappe.cloud';

async function main() {
  const customerId = 'SINSINA V S';
  const customerName = 'SINSINA V S';
  const oldSoName = 'SAL-ORD-2026-00350';
  const company = 'Smart Up Eraveli';
  const academicYear = '2026-2027';

  console.log('--- STARTING CONVERSION FOR SINSINA V S ---');

  // Step 1: Get old active Payment Entries (MUST PRESERVE DATES, MODES, AMOUNTS, REFS)
  const peRes = await fetch(`${BASE_URL}/api/resource/Payment%20Entry?filters=` + encodeURIComponent(JSON.stringify([
    ['party', '=', customerId],
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
    ['customer', '=', customerId],
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

  // Step 3: Fetch old SO, cancel it, create amended SO (16625)
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

  // Build new payment schedule (8 installments: 7x2200 + 1x1225 = 16625)
  const scheduleAmounts = [2200, 2200, 2200, 2200, 2200, 2200, 2200, 1225];
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
    invoice_portion: (amt / 16625) * 100,
    payment_amount: amt,
    outstanding: amt
  }));

  const amendedSoData = {
    ...oldSo,
    name: undefined,
    amended_from: oldSoName,
    docstatus: 1,
    items: [
      {
        ...oldSo.items[0],
        qty: 8,
        rate: 2078.125,
        amount: 16625
      }
    ],
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
      company,
      customer: customerId,
      customer_name: customerName,
      custom_academic_year: academicYear,
      set_posting_time: 1,
      posting_date: '2026-04-10',
      due_date: dueDate,
      items: [
        {
          item_code: oldSo.items[0].item_code,
          qty: 1,
          rate: amt,
          amount: amt,
          sales_order: newSo.name
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

    // Submit invoice
    const submitRes = await fetch(`${BASE_URL}/api/resource/Sales%20Invoice/${inv.name}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 1 })
    });
    if (!submitRes.ok) {
      throw new Error(`Failed to submit invoice ${inv.name}: ${await submitRes.text()}`);
    }
    const submittedInv = (await submitRes.json()).data;
    console.log(`Created & Submitted Inst ${i + 1}: ${submittedInv.name} due: ${dueDate} amount: ${amt}`);
    newSINVs.push(submittedInv);
  }

  // Step 5: Re-create Payment Entries preserving EXACT dates, modes, and amounts
  // Old PEs:
  // PE 1: 1550 (2026-04-10) -> Inst 1 (1550)
  // PE 2: 650  (2026-04-10) -> Inst 1 (650) -> Inst 1 fully paid (2200)
  // PE 3: 1850 (2026-06-17) -> Inst 2 (1850)
  // PE 4: 650  (2026-06-17) -> Inst 2 (350) + Inst 3 (300) -> Inst 2 fully paid (2200)
  // PE 5: 1850 (2026-07-29) -> Inst 3 (1850)
  // PE 6: 350  (2026-07-29) -> Inst 3 (50) + Inst 4 (300) -> Inst 3 fully paid (2200)
  // PE 7: 2150 (2026-08-19) -> Inst 4 (1900) + Inst 5 (250) -> Inst 4 fully paid (2200)
  // PE 8: 50   (2026-08-19) -> Inst 5 (50)
  // PE 9: 2200 (2026-09-24) -> Inst 5 (1900) + Inst 6 (300) -> Inst 5 fully paid (2200)
  const peConfigs = [
    {
      pe: oldPEs[0], // 1550
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[0].name, allocated_amount: 1550 }
      ]
    },
    {
      pe: oldPEs[1], // 650
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[0].name, allocated_amount: 650 }
      ]
    },
    {
      pe: oldPEs[2], // 1850
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[1].name, allocated_amount: 1850 }
      ]
    },
    {
      pe: oldPEs[3], // 650
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[1].name, allocated_amount: 350 },
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[2].name, allocated_amount: 300 }
      ]
    },
    {
      pe: oldPEs[4], // 1850
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[2].name, allocated_amount: 1850 }
      ]
    },
    {
      pe: oldPEs[5], // 350
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[2].name, allocated_amount: 50 },
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[3].name, allocated_amount: 300 }
      ]
    },
    {
      pe: oldPEs[6], // 2150
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[3].name, allocated_amount: 1900 },
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[4].name, allocated_amount: 250 }
      ]
    },
    {
      pe: oldPEs[7], // 50
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[4].name, allocated_amount: 50 }
      ]
    },
    {
      pe: oldPEs[8], // 2200
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[4].name, allocated_amount: 1900 },
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[5].name, allocated_amount: 300 }
      ]
    }
  ];

  for (let idx = 0; idx < peConfigs.length; idx++) {
    const cfg = peConfigs[idx];
    const oldPe = cfg.pe;
    const peDoc = {
      company,
      payment_type: 'Receive',
      party_type: 'Customer',
      party: customerId,
      party_name: customerName,
      paid_from: 'Debtors - SU ERV',
      paid_to: 'Cash - SU ERV',
      paid_from_account_currency: 'INR',
      paid_to_account_currency: 'INR',
      source_exchange_rate: 1,
      target_exchange_rate: 1,
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
