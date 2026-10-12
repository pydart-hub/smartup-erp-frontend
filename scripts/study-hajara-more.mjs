import fs from 'fs';
import dotenv from 'dotenv';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const baseUrl = envConfig.NEXT_PUBLIC_FRAPPE_URL;
const apiKey = envConfig.FRAPPE_API_KEY;
const apiSecret = envConfig.FRAPPE_API_SECRET;

const headers = {
  'Authorization': 'token ' + apiKey + ':' + apiSecret,
  'Content-Type': 'application/json'
};

async function checkDetails() {
  const invRes = await (await fetch(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-03295`, { headers })).json();
  const inv = invRes.data;
  console.log('Sample Invoice Details:', {
    name: inv.name,
    customer: inv.customer,
    student: inv.student,
    custom_student_email: inv.custom_student_email,
    company: inv.company,
    custom_academic_year: inv.custom_academic_year,
    posting_date: inv.posting_date,
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

  const peRes = await (await fetch(`${baseUrl}/api/resource/Payment Entry/ACC-PAY-2026-04135`, { headers })).json();
  console.log('\nPayment Entry Details:', peRes.data);
}

checkDetails().catch(console.error);
