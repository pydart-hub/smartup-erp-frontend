const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function run() {
  try {
    console.log('=== EXECUTION START: NOURAH JAMSHID (SRR 333) ===');

    // 1. Cancel old Demo Sales Invoice (ACC-SINV-2026-11937)
    console.log('\nStep 1: Cancelling Demo Sales Invoice ACC-SINV-2026-11937...');
    let invCancelRes = await fetch(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-11937`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    let invCancelData = await invCancelRes.json();
    if (invCancelRes.ok) {
      console.log('Successfully cancelled Demo Sales Invoice ACC-SINV-2026-11937');
    } else {
      console.error('Error cancelling Sales Invoice:', invCancelData);
    }

    // 2. Cancel old Demo Sales Order (SAL-ORD-2026-01646)
    console.log('\nStep 2: Cancelling Demo Sales Order SAL-ORD-2026-01646...');
    let soCancelRes = await fetch(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-01646`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 })
    });
    let soCancelData = await soCancelRes.json();
    if (soCancelRes.ok) {
      console.log('Successfully cancelled Demo Sales Order SAL-ORD-2026-01646');
    } else {
      console.error('Error cancelling Sales Order:', soCancelData);
    }

    // 3. Fetch details of main Sales Order SAL-ORD-2026-01763
    console.log('\nStep 3: Fetching main Sales Order SAL-ORD-2026-01763 details...');
    let soMainRes = await fetch(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-01763`, { headers });
    let soMainData = await soMainRes.json();
    let mainSO = soMainData.data;

    if (!mainSO) {
      throw new Error('Sales Order SAL-ORD-2026-01763 not found');
    }

    let item = mainSO.items[0];

    // Dates for 8 installments starting July 2026
    const installmentDates = [
      '2026-07-25', // Installment 1 (Admission Month)
      '2026-08-10', // Installment 2
      '2026-09-10', // Installment 3
      '2026-10-10', // Installment 4
      '2026-11-10', // Installment 5
      '2026-12-10', // Installment 6
      '2027-01-10', // Installment 7
      '2027-02-10'  // Installment 8
    ];

    console.log('\nStep 4: Creating 8 Sales Invoices of ₹2,000 each...');

    for (let i = 0; i < installmentDates.length; i++) {
      let date = installmentDates[i];
      let invoiceDoc = {
        docstatus: 1, // Submit invoice directly
        naming_series: 'ACC-SINV-.YYYY.-',
        customer: mainSO.customer,
        customer_name: mainSO.customer_name,
        company: mainSO.company,
        student: mainSO.student,
        custom_academic_year: mainSO.custom_academic_year || '2026-2027',
        posting_date: date,
        due_date: date,
        debit_to: 'Debtors - SU CHL',
        against_income_account: 'Sales - SU CHL',
        items: [
          {
            item_code: item.item_code,
            item_name: item.item_name,
            description: `11th Science State Tuition Fee - Installment ${i + 1} of 8`,
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
        console.log(`[Success] Installment ${i + 1}/8 created: ${createData.data.name} on ${date} for ₹2,000`);
      } else {
        console.error(`[Error] Failed to create Installment ${i + 1}:`, JSON.stringify(createData));
      }
    }

    console.log('\n=== EXECUTION COMPLETED SUCCESSFULLY ===');

  } catch(e) {
    console.error('Execution Error:', e);
  }
}

run();
