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

async function studyZiya() {
  const studentId = 'STU-SU ERV-26-063';
  console.log(`\n--- 1. Full Student Details for ${studentId} ---`);
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
  console.log('\nActive Sales Invoices count:', invData.data?.length);
  console.log('Invoices:', invData.data);

  // Payment Entries
  let peRes = await fetch(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","${customerName}"],["docstatus","<",2]]&fields=["name","posting_date","paid_amount","mode_of_payment","reference_no","reference_date","paid_to","docstatus"]&order_by=posting_date asc`, { headers });
  let peData = await peRes.json();
  console.log('\nActive Payment Entries count:', peData.data?.length);
  console.log('Payment Entries:', peData.data);

  for (const pe of peData.data || []) {
    let fullPe = (await (await fetch(`${baseUrl}/api/resource/Payment Entry/${encodeURIComponent(pe.name)}`, { headers })).json()).data;
    console.log(`\nPE ${pe.name} (${pe.mode_of_payment}, ₹${pe.paid_amount}, ${pe.posting_date}, ref: ${pe.reference_no}):`);
    console.log('References:', fullPe.references?.map(r => ({ reference_name: r.reference_name, allocated_amount: r.allocated_amount, total_amount: r.total_amount, outstanding_amount: r.outstanding_amount })));
  }
}

studyZiya().catch(console.error);
