import fs from 'fs';
import dotenv from 'dotenv';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const frappeUrl = envConfig.NEXT_PUBLIC_FRAPPE_URL || 'https://smartup.m.frappe.cloud';
const apiKey = envConfig.FRAPPE_API_KEY;
const apiSecret = envConfig.FRAPPE_API_SECRET;

const headers = {
  'Authorization': 'token ' + apiKey + ':' + apiSecret,
  'Content-Type': 'application/json'
};

async function fetchRetry(url, options = {}, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error(`Failed to fetch ${url}`);
}

async function studyNathan() {
  console.log('=== SEARCHING STUDENT NATHAN JOSEPH / SRR 064 ===');
  const studentId = 'STU-SU MMK-26-064';
  const customerName = 'NATHAN JOSEPH';

  // 1. Student
  const stu = await (await fetchRetry(`${frappeUrl}/api/resource/Student/${encodeURIComponent(studentId)}`, { headers })).json();
  console.log('Student:', stu.data?.name, stu.data?.student_name, stu.data?.custom_branch, stu.data?.custom_srr_id);

  // 2. Program Enrollment
  const penRes = await (await fetchRetry(`${frappeUrl}/api/resource/Program Enrollment?filters=[["student","=","${encodeURIComponent(studentId)}"]]&fields=["*"]`, { headers })).json();
  console.log('\n=== PROGRAM ENROLLMENTS ===');
  for (const pen of (penRes.data || [])) {
    console.log(`${pen.name} | Program: ${pen.program} | AY: ${pen.academic_year} | Plan: ${pen.custom_plan} | Fee Structure: ${pen.custom_fee_structure}`);
  }

  // 3. Sales Order
  const soRes = await (await fetchRetry(`${frappeUrl}/api/resource/Sales Order?filters=[["customer","=","${encodeURIComponent(customerName)}"]]&fields=["*"]&order_by=creation desc`, { headers })).json();
  console.log('\n=== SALES ORDERS (' + (soRes.data?.length || 0) + ') ===');
  for (const so of (soRes.data || [])) {
    console.log(`${so.name} | Status: ${so.status} | Docstatus: ${so.docstatus} | Total: ₹${so.grand_total} | Plan: ${so.custom_plan} | Inst: ${so.custom_no_of_instalments}`);
    const soDetail = await (await fetchRetry(`${frappeUrl}/api/resource/Sales Order/${encodeURIComponent(so.name)}`, { headers })).json();
    console.log('  Items:', JSON.stringify(soDetail.data?.items?.map(it => ({ code: it.item_code, name: it.item_name, qty: it.qty, rate: it.rate, amount: it.amount })), null, 2));
    console.log('  Payment Schedule:', JSON.stringify(soDetail.data?.payment_schedule?.map(ps => ({ idx: ps.idx, due: ps.due_date, amount: ps.payment_amount })), null, 2));
  }

  // 4. Sales Invoices
  const invRes = await (await fetchRetry(`${frappeUrl}/api/resource/Sales Invoice?filters=[["customer","=","${encodeURIComponent(customerName)}"]]&fields=["name","posting_date","due_date","grand_total","outstanding_amount","status","docstatus"]&order_by=due_date asc`, { headers })).json();
  console.log('\n=== SALES INVOICES (' + (invRes.data?.length || 0) + ') ===');
  for (const inv of (invRes.data || [])) {
    console.log(`${inv.name} | Date: ${inv.posting_date} | Due: ${inv.due_date} | Total: ₹${inv.grand_total} | Out: ₹${inv.outstanding_amount} | Status: ${inv.status} | Docstatus: ${inv.docstatus}`);
  }

  // 5. Payment Entries
  const peRes = await (await fetchRetry(`${frappeUrl}/api/resource/Payment Entry?filters=[["party","=","${encodeURIComponent(customerName)}"]]&fields=["name","posting_date","mode_of_payment","paid_amount","paid_to","paid_from","reference_no","reference_date","docstatus","remarks"]&order_by=posting_date asc`, { headers })).json();
  console.log('\n=== PAYMENT ENTRIES (' + (peRes.data?.length || 0) + ') ===');
  for (const pe of (peRes.data || [])) {
    console.log(`${pe.name} | Date: ${pe.posting_date} | Amount: ₹${pe.paid_amount} | Mode: ${pe.mode_of_payment} | Status: ${pe.docstatus === 1 ? 'Submitted' : 'Draft/Cancelled'} | Ref: ${pe.reference_no} | Remarks: ${pe.remarks}`);
    const peDetail = await (await fetchRetry(`${frappeUrl}/api/resource/Payment Entry/${encodeURIComponent(pe.name)}`, { headers })).json();
    for (const ref of (peDetail.data?.references || [])) {
      console.log(`   -> Allocated to ${ref.reference_doctype} ${ref.reference_name}: Allocated Amount = ₹${ref.allocated_amount}`);
    }
  }
}

studyNathan().catch(console.error);
