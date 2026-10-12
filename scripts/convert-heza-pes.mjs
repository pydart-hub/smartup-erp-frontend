import fs from 'fs';

const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};

const BASE_URL = 'https://smartup.m.frappe.cloud';

async function main() {
  const customerId = 'HEZA FATHIMA PA';
  const customerName = 'HEZA FATHIMA PA';

  console.log('--- RE-CREATING REMAINING 6 PAYMENT ENTRIES FOR HEZA FATHIMA PA ---');

  // Invoices:
  // Inst 1: ACC-SINV-2026-14405 (already allocated 1000 from PE 1)
  // Inst 2: ACC-SINV-2026-14406
  // Inst 3: ACC-SINV-2026-14407
  // Inst 4: ACC-SINV-2026-14408
  // Inst 5: ACC-SINV-2026-14409
  // Inst 6: ACC-SINV-2026-14410
  // Inst 7: ACC-SINV-2026-14411
  // Inst 8: ACC-SINV-2026-14412

  const remainingConfigs = [
    {
      posting_date: '2026-10-03',
      mode_of_payment: 'Cash',
      paid_amount: 1100,
      reference_no: 'CASH-1791005088293',
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: 'ACC-SINV-2026-14405', allocated_amount: 1100 }
      ]
    },
    {
      posting_date: '2026-10-03',
      mode_of_payment: 'Cash',
      paid_amount: 2100,
      reference_no: 'CASH-1791005099721',
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: 'ACC-SINV-2026-14406', allocated_amount: 2100 }
      ]
    },
    {
      posting_date: '2026-10-03',
      mode_of_payment: 'Cash',
      paid_amount: 2100,
      reference_no: 'CASH-1791005205303',
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: 'ACC-SINV-2026-14407', allocated_amount: 2100 }
      ]
    },
    {
      posting_date: '2026-10-03',
      mode_of_payment: 'Cash',
      paid_amount: 2100,
      reference_no: 'CASH-1791005220037',
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: 'ACC-SINV-2026-14408', allocated_amount: 2100 }
      ]
    },
    {
      posting_date: '2026-10-03',
      mode_of_payment: 'Cash',
      paid_amount: 2100,
      reference_no: 'CASH-1791005235094',
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: 'ACC-SINV-2026-14409', allocated_amount: 2100 }
      ]
    },
    {
      posting_date: '2026-10-03',
      mode_of_payment: 'Cash',
      paid_amount: 500,
      reference_no: 'CASH-1791005250681',
      allocations: [
        { reference_doctype: 'Sales Invoice', reference_name: 'ACC-SINV-2026-14410', allocated_amount: 500 }
      ]
    }
  ];

  for (let idx = 0; idx < remainingConfigs.length; idx++) {
    const cfg = remainingConfigs[idx];
    const peDoc = {
      company: 'Smart Up Eraveli',
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
      throw new Error(`Failed to create PE ${idx + 2}: ${await createPeRes.text()}`);
    }
    const createdPE = (await createPeRes.json()).data;
    console.log(`Created PE ${idx + 2}: ${createdPE.name} ${createdPE.paid_amount}`);
  }

  console.log('--- ALL PAYMENT ENTRIES DONE! ---');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
