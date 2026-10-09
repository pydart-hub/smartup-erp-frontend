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

async function studyRizwana() {
  console.log('--- 1. Search Student RIZWANA PARVEEN K S ---');
  let res = await fetch(`${baseUrl}/api/resource/Student?filters=[["first_name","like","%RIZWANA%"]]&fields=["name","student_name","first_name","last_name","custom_branch"]`, { headers });
  let data = await res.json();
  console.log('Student search by first_name:', JSON.stringify(data.data, null, 2));

  if (!data.data || data.data.length === 0) {
    let res2 = await fetch(`${baseUrl}/api/resource/Student?filters=[["student_name","like","%RIZWANA%"]]&fields=["name","student_name","first_name","last_name","custom_branch"]`, { headers });
    data = await res2.json();
    console.log('Student search by student_name:', JSON.stringify(data.data, null, 2));
  }

  let matched = data.data?.find(s => s.custom_branch?.includes('Eraveli') || s.name?.includes('052')) || data.data?.[0];
  if (!matched) {
    console.log('Could not find student by name, trying search in Eraveli branch for 052...');
    let bRes = await fetch(`${baseUrl}/api/resource/Student?filters=[["custom_branch","like","%Eraveli%"]]&fields=["name","student_name","first_name"]&limit_page_length=200`, { headers });
    let bData = await bRes.json();
    matched = bData.data?.find(s => s.student_name?.toLowerCase().includes('rizwana') || s.name?.includes('052'));
  }

  if (!matched) {
    console.log('Student not found!');
    return;
  }

  const studentId = matched.name;
  console.log(`\n--- 2. Full Student Details for ${studentId} ---`);
  let fullStudentRes = await fetch(`${baseUrl}/api/resource/Student/${encodeURIComponent(studentId)}`, { headers });
  let fullStudent = await fullStudentRes.json();
  const student = fullStudent.data;
  console.log('Student details:', {
    name: student.name,
    student_name: student.student_name,
    custom_branch: student.custom_branch,
    customer: student.customer
  });

  const customerName = student.customer || student.student_name;

  // Program Enrollment
  let peEnrollRes = await fetch(`${baseUrl}/api/resource/Program Enrollment?filters=[["student","=","${studentId}"]]&fields=["name","program","academic_year","student_batch_name"]`, { headers });
  let peEnrollData = await peEnrollRes.json();
  console.log('\nProgram Enrollment:', peEnrollData.data);

  // Sales Orders
  let soRes = await fetch(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","${customerName}"],["docstatus","<",2]]&fields=["name","grand_total","status","docstatus","per_billed"]`, { headers });
  let soData = await soRes.json();
  console.log('\nActive Sales Orders:', soData.data);
  for (const so of soData.data || []) {
    let fullSo = (await (await fetch(`${baseUrl}/api/resource/Sales Order/${encodeURIComponent(so.name)}`, { headers })).json()).data;
    console.log(`SO ${so.name} details: items count: ${fullSo.items?.length}, total: ${fullSo.grand_total}`);
    console.log('Items:', fullSo.items?.map(it => ({ name: it.name, item_code: it.item_code, qty: it.qty, rate: it.rate, cost_center: it.cost_center })));
  }

  // Sales Invoices
  let invRes = await fetch(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${customerName}"],["docstatus","<",2]]&fields=["name","posting_date","due_date","grand_total","outstanding_amount","status","docstatus"]&order_by=due_date asc`, { headers });
  let invData = await invRes.json();
  console.log('\nActive Sales Invoices:');
  let totalGrand = 0, totalOut = 0;
  invData.data?.forEach((inv, i) => {
    totalGrand += inv.grand_total;
    totalOut += inv.outstanding_amount;
    console.log(`  Inst ${i+1}: ${inv.name} | Due: ${inv.due_date} | Grand: ₹${inv.grand_total} | Out: ₹${inv.outstanding_amount} | Status: ${inv.status} | Docstatus: ${inv.docstatus}`);
  });
  console.log(`TOTAL INVOICED: ₹${totalGrand} | TOTAL OUTSTANDING: ₹${totalOut}`);

  // Sample Invoice
  if (invData.data && invData.data.length > 0) {
    const sampleInv = (await (await fetch(`${baseUrl}/api/resource/Sales Invoice/${invData.data[0].name}`, { headers })).json()).data;
    console.log('\nSample Invoice Details:', {
      name: sampleInv.name,
      customer: sampleInv.customer,
      student: sampleInv.student,
      custom_student_email: sampleInv.custom_student_email,
      company: sampleInv.company,
      posting_date: sampleInv.posting_date,
      debit_to: sampleInv.debit_to,
      items: sampleInv.items?.map(it => ({
        item_code: it.item_code,
        item_name: it.item_name,
        income_account: it.income_account,
        cost_center: it.cost_center,
        sales_order: it.sales_order,
        so_detail: it.so_detail
      }))
    });
  }

  // Payment Entries
  let payRes = await fetch(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","${customerName}"],["docstatus","=","1"]]&fields=["name","posting_date","paid_amount","mode_of_payment","docstatus","status","remarks","reference_no"]&order_by=posting_date asc`, { headers });
  let payData = await payRes.json();
  console.log('\nActive Payment Entries:');
  let totalPaid = 0;
  for (const pay of payData.data || []) {
    totalPaid += pay.paid_amount;
    const fullPay = (await (await fetch(`${baseUrl}/api/resource/Payment Entry/${encodeURIComponent(pay.name)}`, { headers })).json()).data;
    const alloc = fullPay.references?.map(r => `${r.reference_name} (₹${r.allocated_amount})`).join(', ');
    console.log(`  ${pay.name} | Date: ${pay.posting_date} | Amount: ₹${pay.paid_amount} | Mode: ${pay.mode_of_payment} | Ref: ${pay.reference_no}`);
    console.log(`    Allocated: ${alloc}`);
    console.log(`    Accounts: paid_from: ${fullPay.paid_from}, paid_to: ${fullPay.paid_to}`);
  }
  console.log(`TOTAL PAID: ₹${totalPaid}`);
}

studyRizwana().catch(console.error);
