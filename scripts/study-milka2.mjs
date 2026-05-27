#!/usr/bin/env node
/**
 * Deep study: MILKA T SUNIL - Kadavanthra branch
 * Current: 4-installment plan, paid first installment ₹2000
 * Goal: Understand current state before changing to 8-installment plan
 */

const BASE = 'https://smartup.m.frappe.cloud';
const HEADERS = { 
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};

async function get(doctype, params) {
  const url = `${BASE}/api/resource/${encodeURIComponent(doctype)}?${params}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${doctype} failed ${res.status}: ${text.slice(0, 500)}`);
  }
  return res.json();
}

async function getDoc(doctype, name) {
  const url = `${BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${doctype}/${name} failed ${res.status}: ${text.slice(0, 500)}`);
  }
  return res.json();
}

const STUDENT_ID = 'STU-SU KDV-26-009';
const CUSTOMER_ID = 'MILKA T SUNIL';

async function main() {
  console.log('='.repeat(60));
  console.log('DEEP STUDY: MILKA T SUNIL - INSTALLMENT PLAN CHANGE');
  console.log(`Student ID: ${STUDENT_ID}`);
  console.log(`Customer ID: ${CUSTOMER_ID}`);
  console.log('='.repeat(60));

  // ── STEP 1: Program Enrollment ───────────────────────────────
  console.log('\n📋 STEP 1: Program Enrollments...');
  const peParams = new URLSearchParams({
    filters: JSON.stringify([['student', '=', STUDENT_ID]]),
    fields: JSON.stringify(['name','student','student_name','program','academic_year','docstatus','enrollment_date']),
    limit_page_length: '10'
  });
  const peResult = await get('Program Enrollment', peParams.toString());
  const enrollments = peResult.data || [];
  console.log(`Found ${enrollments.length} enrollment(s):`);
  for (const enr of enrollments) {
    console.log(JSON.stringify(enr, null, 2));
  }

  if (enrollments.length === 0) {
    console.log('⚠️  No enrollments found.');
    return;
  }

  // ── STEP 2: Get full enrollment detail (for custom fields) ──
  for (const enr of enrollments) {
    console.log(`\n📋 STEP 2: Full enrollment detail for ${enr.name}...`);
    const detail = await getDoc('Program Enrollment', enr.name);
    const d = detail.data;
    console.log(JSON.stringify({
      name: d.name,
      student: d.student,
      student_name: d.student_name,
      program: d.program,
      company: d.company,
      academic_year: d.academic_year,
      docstatus: d.docstatus,
      enrollment_date: d.enrollment_date,
      custom_plan: d.custom_plan,
      custom_no_of_instalments: d.custom_no_of_instalments,
      custom_fee_structure: d.custom_fee_structure,
      custom_branch: d.custom_branch,
    }, null, 2));
  }

  // ── STEP 3: Sales Invoices ────────────────────────────────────
  console.log('\n📋 STEP 3: Sales Invoices for MILKA T SUNIL...');
  const siParams = new URLSearchParams({
    filters: JSON.stringify([['customer', '=', CUSTOMER_ID]]),
    fields: JSON.stringify(['name','customer','customer_name','grand_total','outstanding_amount','due_date','posting_date','docstatus','status','company','is_return','amended_from']),
    order_by: 'posting_date asc',
    limit_page_length: '0'
  });
  const siResult = await get('Sales Invoice', siParams.toString());
  const invoices = siResult.data || [];
  console.log(`\nSales Invoices (${invoices.length} found):`);
  for (const inv of invoices) {
    console.log(`  ${inv.name}: ₹${inv.grand_total} | Outstanding: ₹${inv.outstanding_amount} | Due: ${inv.due_date} | Status: ${inv.status} | Docstatus: ${inv.docstatus}`);
  }

  // ── STEP 4: First invoice full detail ────────────────────────
  if (invoices.length > 0) {
    console.log(`\n📋 STEP 4: Full detail of first invoice (${invoices[0].name})...`);
    const invDetail = await getDoc('Sales Invoice', invoices[0].name);
    const inv = invDetail.data;
    console.log(JSON.stringify({
      name: inv.name,
      grand_total: inv.grand_total,
      outstanding_amount: inv.outstanding_amount,
      due_date: inv.due_date,
      docstatus: inv.docstatus,
      status: inv.status,
      items: inv.items?.map(i => ({item_code: i.item_code, qty: i.qty, rate: i.rate, amount: i.amount})),
      custom_fee_structure: inv.custom_fee_structure,
      custom_no_of_instalments: inv.custom_no_of_instalments,
      custom_plan: inv.custom_plan,
      custom_installment_no: inv.custom_installment_no,
      custom_program_enrollment: inv.custom_program_enrollment,
    }, null, 2));
  }

  // ── STEP 5: Payment Entries ───────────────────────────────────
  console.log('\n📋 STEP 5: Payment Entries (submitted) for MILKA T SUNIL...');
  const peParamsPayment = new URLSearchParams({
    filters: JSON.stringify([['party','=',CUSTOMER_ID],['payment_type','=','Receive'],['docstatus','=','1']]),
    fields: JSON.stringify(['name','party','party_name','paid_amount','mode_of_payment','posting_date','reference_no','docstatus']),
    order_by: 'posting_date asc',
    limit_page_length: '0'
  });
  const payResult = await get('Payment Entry', peParamsPayment.toString());
  const payments = payResult.data || [];
  console.log(`\nPayment Entries (${payments.length} found):`);
  for (const pe of payments) {
    console.log(`  ${pe.name}: ₹${pe.paid_amount} | Mode: ${pe.mode_of_payment} | Date: ${pe.posting_date}`);
  }

  // ── STEP 6: What fee structures exist for this student's program ─
  const program = enrollments[0]?.program;
  if (program) {
    console.log(`\n📋 STEP 6: Available Fee Structures for program "${program}" in Kadavanthra...`);
    const fsParams4 = new URLSearchParams({
      filters: JSON.stringify([['company','like','%Kadavanthra%'],['program','=',program],['docstatus','=','1']]),
      fields: JSON.stringify(['name','program','company','custom_plan','custom_no_of_instalments','total_amount','academic_year']),
      limit_page_length: '50'
    });
    const fsResult = await get('Fee Structure', fsParams4.toString());
    const feeStructures = fsResult.data || [];
    console.log(`Fee Structures (${feeStructures.length} found):`);
    for (const fs of feeStructures) {
      console.log(`  ${fs.name}: Plan=${fs.custom_plan} | Inst=${fs.custom_no_of_instalments} | Total=₹${fs.total_amount} | AY=${fs.academic_year}`);
    }

    // Also search broadly for Kadavanthra 8-inst
    console.log(`\n📋 All 8-inst Fee Structures for Kadavanthra...`);
    const fs8Params = new URLSearchParams({
      filters: JSON.stringify([['company','like','%Kadavanthra%'],['custom_no_of_instalments','=','8'],['docstatus','=','1']]),
      fields: JSON.stringify(['name','program','company','custom_plan','custom_no_of_instalments','total_amount','academic_year']),
      limit_page_length: '50'
    });
    const fs8Result = await get('Fee Structure', fs8Params.toString());
    const feeStructures8 = fs8Result.data || [];
    console.log(`8-inst Fee Structures (${feeStructures8.length} found):`);
    for (const fs of feeStructures8) {
      console.log(`  ${fs.name}: Plan=${fs.custom_plan} | Inst=${fs.custom_no_of_instalments} | Total=₹${fs.total_amount} | AY=${fs.academic_year}`);
    }
  }

  // ── STEP 7: Invoice Payment Allocations ──────────────────────
  if (invoices.length > 0) {
    console.log(`\n📋 STEP 7: Payment allocations on paid invoice (${invoices[0].name})...`);
    const paParams = new URLSearchParams({
      filters: JSON.stringify([['reference_name','=',invoices[0].name],['docstatus','=','1']]),
      fields: JSON.stringify(['name','parent','allocated_amount','reference_name']),
      limit_page_length: '10'
    });
    try {
      const paResult = await get('Payment Entry Reference', paParams.toString());
      console.log('Payment allocations:', JSON.stringify(paResult.data, null, 2));
    } catch(e) {
      console.log('Could not fetch payment allocations:', e.message.slice(0, 200));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('STUDY COMPLETE');
  console.log('='.repeat(60));
}

main().catch(e => {
  console.error('\nERROR:', e.message);
  process.exit(1);
});
