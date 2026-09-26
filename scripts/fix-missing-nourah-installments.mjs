const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function run() {
  try {
    let soMainRes = await fetch(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-01763`, { headers });
    let soMainData = await soMainRes.json();
    let mainSO = soMainData.data;
    let item = mainSO.items[0];

    const missingInstallments = [
      { num: 2, posting_date: '2026-08-10', due_date: '2026-08-10' },
      { num: 3, posting_date: '2026-09-10', due_date: '2026-09-10' }
    ];

    for (let inst of missingInstallments) {
      let invoiceDoc = {
        docstatus: 1,
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
        console.log(`[Success] Installment ${inst.num}/8 created: ${createData.data.name} on ${inst.posting_date} for ₹2,000`);
      } else {
        console.error(`[Error] Failed to create Installment ${inst.num}:`, JSON.stringify(createData));
      }
    }
  } catch(e) {
    console.error(e);
  }
}

run();
