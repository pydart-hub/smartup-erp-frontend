import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const getVal = (k) => lines.find(l => l.startsWith(k))?.split('=')[1]?.trim();
const baseUrl = getVal('NEXT_PUBLIC_FRAPPE_URL');
const key = getVal('FRAPPE_API_KEY');
const sec = getVal('FRAPPE_API_SECRET');
const headers = { 'Authorization': `token ${key}:${sec}`, 'Content-Type': 'application/json' };

async function run() {
  const invPayload = {
    docstatus: 1,
    naming_series: 'ACC-SINV-.YYYY.-',
    customer: 'SAYED MOHAMMED MANSUR ANSARI',
    customer_name: 'SAYED MOHAMMED MANSUR ANSARI',
    company: 'Smart Up Chullickal',
    student: 'STU-SU CHL-26-024',
    custom_academic_year: '2026-2027',
    posting_date: '2026-03-31',
    due_date: '2026-04-15',
    debit_to: 'Debtors - SU CHL',
    against_income_account: 'Sales - SU CHL',
    payment_schedule: [
      {
        due_date: '2026-04-15',
        invoice_portion: 100,
        payment_amount: 3300
      }
    ],
    items: [
      {
        item_code: '10th State Tuition Fee',
        item_name: '10th State Tuition Fee',
        description: 'Inst 1 — 10th State Tuition Fee',
        qty: 1,
        rate: 3300,
        amount: 3300,
        income_account: 'Sales - SU CHL',
        cost_center: 'Main - SU CHL',
        sales_order: 'SAL-ORD-2026-00153-1'
      }
    ]
  };

  const res = await fetch(`${baseUrl}/api/resource/Sales Invoice`, {
    method: 'POST',
    headers,
    body: JSON.stringify(invPayload)
  });
  console.log('Status:', res.status);
  console.log('Response:', await res.text());
}
run();
