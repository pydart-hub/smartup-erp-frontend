import fs from 'fs';
import dotenv from 'dotenv';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const frappeUrl = envConfig.NEXT_PUBLIC_FRAPPE_URL;
const apiKey = envConfig.FRAPPE_API_KEY;
const apiSecret = envConfig.FRAPPE_API_SECRET;

const headers = {
  'Authorization': 'token ' + apiKey + ':' + apiSecret,
  'Content-Type': 'application/json'
};

async function inspectDoc(doctype, name) {
  const res = await fetch(`${frappeUrl}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { headers });
  const data = await res.json();
  return data.data;
}

async function run() {
  // 1. Student
  const stuList = await (await fetch(`${frappeUrl}/api/resource/Student?filters=[["first_name","like","%Advaith%"]]&fields=["name","first_name","last_name","student_email_id","custom_branch"]`, { headers })).json();
  console.log('STUDENT SUMMARY:', stuList);

  const stuName = stuList.data?.[0]?.name;
  if (stuName) {
    const student = await inspectDoc('Student', stuName);
    console.log('\n--- STUDENT DETAILS ---');
    console.log('Name:', student.name);
    console.log('Full Name:', student.student_name || `${student.first_name} ${student.last_name || ''}`);
    console.log('Custom Branch:', student.custom_branch);
    console.log('Custom Batch / Class:', student.custom_batch, student.custom_class, student.custom_academic_year);
  }

  // 2. Sales Order
  const so = await inspectDoc('Sales Order', 'SAL-ORD-2026-00104');
  console.log('\n--- SALES ORDER DETAILS (SAL-ORD-2026-00104) ---');
  console.log('Docstatus:', so.docstatus);
  console.log('Customer:', so.customer);
  console.log('Grand Total:', so.grand_total);
  console.log('Payment Schedule:', JSON.stringify(so.payment_schedule, null, 2));
  console.log('Items:', JSON.stringify(so.items?.map(it => ({
    item_code: it.item_code,
    item_name: it.item_name,
    qty: it.qty,
    rate: it.rate,
    amount: it.amount
  })), null, 2));

  // 3. Sales Invoice
  const sinv = await inspectDoc('Sales Invoice', 'ACC-SINV-2026-01883');
  console.log('\n--- SALES INVOICE DETAILS (ACC-SINV-2026-01883) ---');
  console.log('Docstatus:', sinv.docstatus);
  console.log('Grand Total:', sinv.grand_total);
  console.log('Outstanding:', sinv.outstanding_amount);
  console.log('Payment Schedule:', JSON.stringify(sinv.payment_schedule, null, 2));
  console.log('Items:', JSON.stringify(sinv.items?.map(it => ({
    item_code: it.item_code,
    item_name: it.item_name,
    qty: it.qty,
    rate: it.rate,
    amount: it.amount
  })), null, 2));

  // 4. Payment Entry
  const pe = await inspectDoc('Payment Entry', 'ACC-PAY-2026-03907');
  console.log('\n--- PAYMENT ENTRY DETAILS (ACC-PAY-2026-03907) ---');
  console.log('Docstatus:', pe.docstatus);
  console.log('Posting Date:', pe.posting_date);
  console.log('Mode of Payment:', pe.mode_of_payment);
  console.log('Paid Amount:', pe.paid_amount);
  console.log('Received Amount:', pe.received_amount);
  console.log('References:', JSON.stringify(pe.references, null, 2));
  console.log('Deductions:', JSON.stringify(pe.deductions, null, 2));
}

run();
