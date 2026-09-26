const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function run() {
  try {
    console.log('=== EXECUTION START: DEVDARSHAN (SRR 303) ===');

    // 1. Cancel old Demo Sales Invoice (ACC-SINV-2026-10683)
    console.log('\nStep 1: Cancelling Demo Sales Invoice ACC-SINV-2026-10683...');
    let invCancelRes = await fetch(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-10683`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    let invCancelData = await invCancelRes.json();
    if (invCancelRes.ok) {
      console.log('Successfully cancelled Demo Sales Invoice ACC-SINV-2026-10683');
    } else {
      console.error('Error cancelling Sales Invoice:', invCancelData);
    }

    // 2. Cancel old Demo Sales Order (SAL-ORD-2026-01475)
    console.log('\nStep 2: Cancelling Demo Sales Order SAL-ORD-2026-01475...');
    let soCancelRes = await fetch(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-01475`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    let soCancelData = await soCancelRes.json();
    if (soCancelRes.ok) {
      console.log('Successfully cancelled Demo Sales Order SAL-ORD-2026-01475');
    } else {
      console.error('Error cancelling Sales Order:', soCancelData);
    }

    // 3. Fetch details of main Sales Order SAL-ORD-2026-01761
    console.log('\nStep 3: Fetching main Sales Order SAL-ORD-2026-01761 details...');
    let soMainRes = await fetch(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-01761`, { headers });
    let soMainData = await soMainRes.json();
    let mainSO = soMainData.data;

    if (!mainSO) {
      throw new Error('Sales Order SAL-ORD-2026-01761 not found');
    }

    let item = mainSO.items[0];

    // Dates for 8 installments starting July 2026
    const installments = [
      { num: 1, posting_date: '2026-07-03', due_date: '2026-07-03' },
      { num: 2, posting_date: '2026-08-10', due_date: '2026-08-10' },
      { num: 3, posting_date: '2026-09-10', due_date: '2026-09-10' },
      { num: 4, posting_date: '2026-09-22', due_date: '2026-10-10' },
      { num: 5, posting_date: '2026-09-22', due_date: '2026-11-10' },
      { num: 6, posting_date: '2026-09-22', due_date: '2026-12-10' },
      { num: 7, posting_date: '2026-09-22', due_date: '2027-01-10' },
      { num: 8, posting_date: '2026-09-22', due_date: '2027-02-10' }
    ];

    console.log('\nStep 4: Creating 8 Sales Invoices of ₹2,000 each...');

    for (let inst of installments) {
      let invoiceDoc = {
        docstatus: 1, // Submit invoice directly
        naming_series: 'ACC-SINV-.YYYY.-',
        customer: mainSO.customer,
        customer_name: mainSO.customer_name,
        company: mainSO.company,
        student: mainSO.student,
        custom_academic_year: mainSO.custom_academic_year || '2026-2027',
        posting_date: inst.posting_date,
        due_date: inst.due_date,
        set_posting_time: 1,
        debit_to: 'Debtors - SU CHL',
        against_income_account: 'Sales - SU CHL',
        payment_schedule: [
          {
            due_date: inst.due_date,
            invoice_portion: 100,
            payment_amount: 2000
          }
        ],
        items: [
          {
            item_code: item.item_code,
            item_name: item.item_name,
            description: `11th Science State Tuition Fee - Installment ${inst.num} of 8`,
            qty: 1,
            uom: item.uom || 'Nos',
            stock_uom: item.stock_uom || 'Nos',
            conversion_factor: 1,
            rate: 2000,
            amount: 2000,
            income_account: 'Sales - SU CHL',
            expense_account: 'Cost of Goods Sold - SU CHL',
            cost_center: 'Main - SU CHL',
            sales_order: mainSO.name,
            so_detail: item.name
          }
        ]
      };

      let createRes = await fetch(`${baseUrl}/api/resource/Sales Invoice`, {
        method: 'POST',
        headers,
        body: JSON.stringify(invoiceDoc)
      });

      let createData = await createRes.json();
      if (createRes.ok) {
        console.log(`[Success] Installment ${inst.num}/8 created: ${createData.data.name} on posting date ${inst.posting_date} (due ${inst.due_date}) for ₹2,000`);
      } else {
        console.error(`[Error] Failed to create Installment ${inst.num}:`, JSON.stringify(createData));
      }
    }

    console.log('\n=== EXECUTION COMPLETED ===');

  } catch(e) {
    console.error('Execution Error:', e);
  }
}

run();
