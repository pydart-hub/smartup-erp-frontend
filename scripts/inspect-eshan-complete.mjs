import fs from 'fs';
import dotenv from 'dotenv';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const frappeUrl = envConfig.NEXT_PUBLIC_FRAPPE_URL;
const apiKey = envConfig.FRAPPE_API_KEY;
const apiSecret = envConfig.FRAPPE_API_SECRET;

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json'
};

async function getDoc(doctype, name) {
  const res = await fetch(`${frappeUrl}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { headers });
  return (await res.json()).data;
}

async function getList(doctype, filters = [], fields = ['*'], orderBy = null) {
  let url = `${frappeUrl}/api/resource/${encodeURIComponent(doctype)}?filters=${encodeURIComponent(JSON.stringify(filters))}&fields=${encodeURIComponent(JSON.stringify(fields))}&limit_page_length=100`;
  if (orderBy) {
    url += `&order_by=${encodeURIComponent(orderBy)}`;
  }
  const res = await fetch(url, { headers });
  return (await res.json()).data || [];
}

async function studyStudent() {
  const studentId = 'STU-SU CHL-26-228';
  console.log(`=== STUDYING STUDENT: ${studentId} ===\n`);

  // 1. Student Doc
  const student = await getDoc('Student', studentId);
  console.log('--- STUDENT DETAILS ---');
  console.log({
    name: student.name,
    student_name: student.student_name,
    customer: student.customer,
    student_email_id: student.student_email_id,
    student_mobile_number: student.student_mobile_number,
    branch: student.custom_branch || student.branch,
    date_of_joining: student.date_of_joining,
    enabled: student.enabled
  });

  // 2. Program Enrollment
  const enrollments = await getList('Program Enrollment', [['student', '=', studentId]]);
  console.log('\n--- PROGRAM ENROLLMENTS ---');
  for (const enr of enrollments) {
    const fullEnr = await getDoc('Program Enrollment', enr.name);
    console.log({
      name: fullEnr.name,
      program: fullEnr.program,
      academic_year: fullEnr.academic_year,
      academic_term: fullEnr.academic_term,
      fee_structure: fullEnr.fee_structure,
      enrollment_date: fullEnr.enrollment_date,
      docstatus: fullEnr.docstatus,
      custom_plan: fullEnr.custom_plan,
      fees: fullEnr.fees
    });
  }

  // 3. Sales Order
  const salesOrders = await getList('Sales Order', [['customer', '=', student.customer]]);
  console.log('\n--- SALES ORDERS ---');
  for (const so of salesOrders) {
    const fullSo = await getDoc('Sales Order', so.name);
    console.log({
      name: fullSo.name,
      docstatus: fullSo.docstatus,
      status: fullSo.status,
      company: fullSo.company,
      transaction_date: fullSo.transaction_date,
      delivery_date: fullSo.delivery_date,
      custom_plan: fullSo.custom_plan,
      custom_no_of_instalments: fullSo.custom_no_of_instalments,
      custom_academic_year: fullSo.custom_academic_year,
      grand_total: fullSo.grand_total,
      items: fullSo.items?.map(it => ({
        item_code: it.item_code,
        item_name: it.item_name,
        qty: it.qty,
        rate: it.rate,
        amount: it.amount
      })),
      payment_schedule: fullSo.payment_schedule?.map(ps => ({
        due_date: ps.due_date,
        payment_amount: ps.payment_amount,
        outstanding: ps.outstanding
      }))
    });
  }

  // 4. Sales Invoices
  const salesInvoices = await getList('Sales Invoice', [['customer', '=', student.customer]], ['name', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status', 'docstatus', 'remarks'], 'due_date asc');
  console.log('\n--- SALES INVOICES ---');
  for (const inv of salesInvoices) {
    const fullInv = await getDoc('Sales Invoice', inv.name);
    console.log({
      name: fullInv.name,
      posting_date: fullInv.posting_date,
      due_date: fullInv.due_date,
      grand_total: fullInv.grand_total,
      outstanding_amount: fullInv.outstanding_amount,
      status: fullInv.status,
      docstatus: fullInv.docstatus,
      sales_order: fullInv.items?.[0]?.sales_order,
      item: fullInv.items?.[0]?.item_code,
      item_name: fullInv.items?.[0]?.item_name,
      debit_to: fullInv.debit_to,
      income_account: fullInv.items?.[0]?.income_account
    });
  }

  // 5. Payment Entries
  const paymentEntries = await getList('Payment Entry', [['party', '=', student.customer]], ['name', 'posting_date', 'mode_of_payment', 'paid_amount', 'docstatus', 'status', 'reference_no', 'reference_date'], 'posting_date asc');
  console.log('\n--- PAYMENT ENTRIES ---');
  for (const pe of paymentEntries) {
    const fullPe = await getDoc('Payment Entry', pe.name);
    console.log({
      name: fullPe.name,
      docstatus: fullPe.docstatus,
      status: fullPe.status,
      posting_date: fullPe.posting_date,
      mode_of_payment: fullPe.mode_of_payment,
      paid_amount: fullPe.paid_amount,
      received_amount: fullPe.received_amount,
      paid_from: fullPe.paid_from,
      paid_to: fullPe.paid_to,
      reference_no: fullPe.reference_no,
      reference_date: fullPe.reference_date,
      references: fullPe.references?.map(r => ({
        reference_doctype: r.reference_doctype,
        reference_name: r.reference_name,
        due_date: r.due_date,
        total_amount: r.total_amount,
        outstanding_amount: r.outstanding_amount,
        allocated_amount: r.allocated_amount
      }))
    });
  }

  // 6. Fee Structures available for this Course / Branch
  console.log('\n--- AVAILABLE FEE STRUCTURES (8th State / Chullickal) ---');
  const feeStructures = await getList('Fee Structure', [['program', 'like', '%8th%']]);
  console.log(feeStructures);
}

studyStudent().catch(console.error);

