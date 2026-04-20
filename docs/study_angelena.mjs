const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function q(url) {
  const r = await fetch(BASE + url, { headers: { Authorization: AUTH } });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${url}: ${JSON.stringify(j)}`);
  return j.data;
}

async function main() {
  // Guardian
  const gd = await q('/api/resource/Guardian/EDU-GRD-2026-00495');
  console.log('=== GUARDIAN ===');
  console.log(JSON.stringify({
    name: gd.name, guardian_name: gd.guardian_name,
    mobile: gd.mobile_number, email: gd.email_address,
    occupation: gd.occupation
  }, null, 2));

  // Program Enrollments
  const pe = await q('/api/resource/Program Enrollment?filters=[["student","=","STU-SU MMK-26-039"]]&fields=["name","program","academic_year","student_batch_name","enrollment_date","docstatus"]');
  console.log('\n=== PROGRAM ENROLLMENTS ===');
  console.log(JSON.stringify(pe, null, 2));

  // Course Enrollments
  const ce = await q('/api/resource/Course Enrollment?filters=[["student","=","STU-SU MMK-26-039"]]&fields=["name","course","program_enrollment","enrollment_date"]');
  console.log('\n=== COURSE ENROLLMENTS ===');
  console.log(JSON.stringify(ce, null, 2));

  // Sales Order
  const so = await q('/api/resource/Sales Order/SAL-ORD-2026-00504');
  console.log('\n=== SALES ORDER ===');
  console.log(JSON.stringify({
    name: so.name, customer: so.customer, company: so.company,
    transaction_date: so.transaction_date, delivery_date: so.delivery_date,
    grand_total: so.grand_total, billing_status: so.billing_status,
    per_billed: so.per_billed, docstatus: so.docstatus,
    custom_plan: so.custom_plan, custom_no_of_instalments: so.custom_no_of_instalments,
    custom_academic_year: so.custom_academic_year,
    items: so.items?.map(i => ({
      item_code: i.item_code, item_name: i.item_name,
      qty: i.qty, rate: i.rate, amount: i.amount, delivered_qty: i.delivered_qty, billed_qty: i.billed_qty
    }))
  }, null, 2));

  // Sales Invoices
  const si = await q('/api/resource/Sales Invoice?filters=[["customer","=","ANGELENA CHRISTINA"]]&fields=["name","posting_date","due_date","grand_total","outstanding_amount","status","docstatus"]&order_by=posting_date asc&limit=20');
  console.log('\n=== SALES INVOICES ===');
  console.log(JSON.stringify(si, null, 2));

  // Payment Entries
  const pmt = await q('/api/resource/Payment Entry?filters=[["party","=","ANGELENA CHRISTINA"],["party_type","=","Customer"]]&fields=["name","posting_date","paid_amount","payment_type","reference_no","mode_of_payment","docstatus"]&order_by=posting_date asc&limit=20');
  console.log('\n=== PAYMENT ENTRIES ===');
  console.log(JSON.stringify(pmt, null, 2));

  // Student Batch
  try {
    const sb = await q('/api/resource/Student Batch Enrollment?filters=[["student","=","STU-SU MMK-26-039"]]&fields=["name","student_batch","program","academic_year"]');
    console.log('\n=== STUDENT BATCH ===');
    console.log(JSON.stringify(sb, null, 2));
  } catch(e) {
    console.log('\n=== STUDENT BATCH === (error:', e.message, ')');
  }
}

main().catch(console.error);
