const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function checkDetails() {
  const invRes = await (await fetch(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-03467`, { headers })).json();
  console.log('Sample invoice fields:');
  const inv = invRes.data;
  console.log({
    name: inv.name,
    customer: inv.customer,
    student: inv.student,
    custom_student: inv.custom_student,
    custom_student_email: inv.custom_student_email,
    company: inv.company,
    custom_academic_year: inv.custom_academic_year,
    posting_date: inv.posting_date,
    due_date: inv.due_date,
    debit_to: inv.debit_to,
    items: inv.items?.map(it => ({
      item_code: it.item_code,
      item_name: it.item_name,
      qty: it.qty,
      rate: it.rate,
      income_account: it.income_account,
      cost_center: it.cost_center,
      sales_order: it.sales_order,
      so_detail: it.so_detail
    }))
  });

  const soRes = await (await fetch(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00352`, { headers })).json();
  console.log('\nSO fields:');
  const so = soRes.data;
  console.log({
    name: so.name,
    customer: so.customer,
    student: so.student,
    company: so.company,
    custom_academic_year: so.custom_academic_year,
    transaction_date: so.transaction_date,
    delivery_date: so.delivery_date,
    custom_plan: so.custom_plan,
    custom_no_of_instalments: so.custom_no_of_instalments,
    items: so.items?.map(it => ({
      name: it.name,
      item_code: it.item_code,
      item_name: it.item_name,
      qty: it.qty,
      rate: it.rate,
      cost_center: it.cost_center
    }))
  });
}

checkDetails().catch(console.error);
