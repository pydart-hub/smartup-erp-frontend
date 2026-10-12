import fs from 'fs';

const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};

const BASE_URL = 'https://smartup.m.frappe.cloud';

async function main() {
  const customerId = 'HEZA FATHIMA PA';
  const customerName = 'HEZA FATHIMA PA';
  const newSoName = 'SAL-ORD-2026-00291-2';

  console.log('--- COMPLETING CONVERSION FOR HEZA FATHIMA PA ---');

  // We already created and submitted Inst 1: ACC-SINV-2026-14405
  const newSINVs = [{ name: 'ACC-SINV-2026-14405' }];

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

  // Create remaining 7 invoices: Inst 2 to Inst 8
  for (let i = 1; i < 8; i++) {
    const amt = scheduleAmounts[i];
    const dueDate = dueDates[i];
    const invData = {
      company: 'Smart Up Eraveli',
      customer: customerId,
      customer_name: customerName,
      custom_academic_year: '2026-2027',
      set_posting_time: 1,
      posting_date: '2026-04-07',
      due_date: dueDate,
      items: [
        {
          item_code: '9th State Tuition Fee',
          qty: 1,
          rate: amt,
          amount: amt,
          sales_order: newSoName
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

  // Payment entries details from original
  const peConfigs = [
    {
      posting_date: '2026-04-07',
      mode_of_payment: 'Cash',
      paid_amount: 1000,
      reference_no: 'CASH-1775571256710',
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[0].name, allocated_amount: 1000 }
      ]
    },
    {
      posting_date: '2026-10-03',
      mode_of_payment: 'Cash',
      paid_amount: 1100,
      reference_no: 'CASH-1791005088293',
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[0].name, allocated_amount: 1100 }
      ]
    },
    {
      posting_date: '2026-10-03',
      mode_of_payment: 'Cash',
      paid_amount: 2100,
      reference_no: 'CASH-1791005099721',
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[1].name, allocated_amount: 2100 }
      ]
    },
    {
      posting_date: '2026-10-03',
      mode_of_payment: 'Cash',
      paid_amount: 2100,
      reference_no: 'CASH-1791005205303',
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[2].name, allocated_amount: 2100 }
      ]
    },
    {
      posting_date: '2026-10-03',
      mode_of_payment: 'Cash',
      paid_amount: 2100,
      reference_no: 'CASH-1791005220037',
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[3].name, allocated_amount: 2100 }
      ]
    },
    {
      posting_date: '2026-10-03',
      mode_of_payment: 'Cash',
      paid_amount: 2100,
      reference_no: 'CASH-1791005235094',
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[4].name, allocated_amount: 2100 }
      ]
    },
    {
      posting_date: '2026-10-03',
      mode_of_payment: 'Cash',
      paid_amount: 500,
      reference_no: 'CASH-1791005250681',
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: newSINVs[5].name, allocated_amount: 500 }
      ]
    }
  ];

  for (let idx = 0; idx < peConfigs.length; idx++) {
    const cfg = peConfigs[idx];
    const peDoc = {
      company: 'Smart Up Eraveli',
      payment_type: 'Receive',
      party_type: 'Customer',
      party: customerId,
      party_name: customerName,
      posting_date: cfg.posting_date,
      mode_of_payment: cfg.mode_of_payment,
      paid_amount: cfg.paid_amount,
      received_amount: cfg.paid_amount,
      reference_no: cfg.reference_no,
      reference_date: cfg.posting_date,
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
