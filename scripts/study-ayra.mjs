/**
 * Deep study script — Ayra Rahmath (STU-SU FKO-26-002)
 * Read-only. No modifications.
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function get(path) {
  const r = await fetch(`${BASE}${path}`, {
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' }
  });
  const j = await r.json();
  return j.data ?? j.message ?? j;
}

async function main() {
  console.log('=================================================================');
  console.log('AYRA RAHMATH — Deep Study');
  console.log('=================================================================\n');

  // ── 1. Student record ────────────────────────────────────────────────────
  console.log('── 1. Student record ──────────────────────────────────────────');
  const student = await get('/api/resource/Student/STU-SU FKO-26-002');
  console.log(`  Name:       ${student.first_name} ${student.last_name ?? ''}`);
  console.log(`  Customer:   ${student.customer}`);
  console.log(`  Status:     ${student.enabled}`);
  console.log();

  // ── 2. Program Enrollment ────────────────────────────────────────────────
  console.log('── 2. Program Enrollment ──────────────────────────────────────');
  const pe = await get('/api/resource/Program Enrollment/PEN-9th-Fortkochi 26-27-002');
  console.log(`  Name:              ${pe.name}`);
  console.log(`  Student:           ${pe.student}`);
  console.log(`  Program:           ${pe.program}`);
  console.log(`  custom_plan:       ${pe.custom_plan}`);
  console.log(`  custom_fee_structure: ${pe.custom_fee_structure}`);
  console.log(`  docstatus:         ${pe.docstatus}`);
  console.log();

  // ── 3. Sales Order ───────────────────────────────────────────────────────
  console.log('── 3. Sales Order ─────────────────────────────────────────────');
  const so = await get('/api/resource/Sales Order/SAL-ORD-2026-00108');
  console.log(`  Name:              ${so.name}`);
  console.log(`  Customer:          ${so.customer}`);
  console.log(`  grand_total:       ${so.grand_total}`);
  console.log(`  custom_plan:       ${so.custom_plan}`);
  console.log(`  custom_fee_structure: ${so.custom_fee_structure}`);
  console.log(`  custom_no_of_instalments: ${so.custom_no_of_instalments}`);
  console.log(`  docstatus:         ${so.docstatus}`);
  console.log(`  billing_status:    ${so.billing_status}`);
  console.log(`  Items:`);
  for (const item of so.items ?? []) {
    console.log(`    [${item.name}] ${item.item_code} | qty=${item.qty} | rate=${item.rate} | amount=${item.amount}`);
  }
  console.log();

  // ── 4. Sales Invoices (via SO item filter) ───────────────────────────────
  console.log('── 4. Sales Invoices linked to SAL-ORD-2026-00108 ─────────────');
  const invList = await get(
    '/api/resource/Sales Invoice?filters=[["Sales Invoice Item","sales_order","=","SAL-ORD-2026-00108"]]&fields=["name","grand_total","outstanding_amount","docstatus","status","posting_date","due_date"]&limit=20'
  );
  let totalOutstanding = 0; let totalPaid = 0;
  for (const inv of invList) {
    const paid = inv.grand_total - inv.outstanding_amount;
    totalPaid += paid;
    totalOutstanding += inv.outstanding_amount;
    const status = inv.docstatus === 2 ? 'CANCELLED' : inv.status;
    console.log(`  ${inv.name}: ₹${inv.grand_total} | outstanding=₹${inv.outstanding_amount} | paid=₹${paid} | status=${status} | due=${inv.due_date} | docstatus=${inv.docstatus}`);
  }
  console.log(`  Total Paid: ₹${totalPaid} | Total Outstanding: ₹${totalOutstanding} | Active Total: ₹${totalPaid + totalOutstanding}`);
  console.log();

  // ── 4b. Active invoices only (docstatus=1) ───────────────────────────────
  console.log('── 4b. Active invoices only ───────────────────────────────────');
  const activeInvs = invList.filter(i => i.docstatus === 1);
  for (const inv of activeInvs) {
    // Fetch full invoice to see items
    const full = await get(`/api/resource/Sales Invoice/${inv.name}`);
    console.log(`  ${inv.name}:`);
    console.log(`    grand_total: ${full.grand_total} | outstanding: ${full.outstanding_amount} | status: ${full.status}`);
    console.log(`    due_date: ${full.due_date} | posting_date: ${full.posting_date}`);
    for (const it of full.items ?? []) {
      console.log(`    item: [row=${it.name}] ${it.item_code} | qty=${it.qty} | rate=${it.rate} | so=${it.sales_order} | so_detail=${it.so_detail}`);
    }
  }
  console.log();

  // ── 5. Payment Entries ───────────────────────────────────────────────────
  console.log('── 5. Payment Entries for customer ────────────────────────────');
  const customer = student.customer;
  const peList = await get(
    `/api/resource/Payment Entry?filters=[["party","=","${customer}"],["party_type","=","Customer"],["docstatus","!=","2"]]&fields=["name","paid_amount","mode_of_payment","posting_date","reference_no","docstatus","payment_type","remarks"]&limit=30`
  );
  for (const p of peList) {
    console.log(`  ${p.name}: ₹${p.paid_amount} | mode=${p.mode_of_payment} | date=${p.posting_date} | ref=${p.reference_no} | docstatus=${p.docstatus}`);
    // Fetch full PE to check invoice references
    const full = await get(`/api/resource/Payment Entry/${p.name}`);
    for (const ref of full.references ?? []) {
      console.log(`    → ref: ${ref.reference_doctype} / ${ref.reference_name} | allocated=₹${ref.allocated_amount}`);
    }
  }
  console.log();

  // ── 6. Target fee structure ──────────────────────────────────────────────
  console.log('── 6. Target fee structure: SU FKO-9th State-Basic-4 ──────────');
  const fs = await get('/api/resource/Fee Structure/SU FKO-9th State-Basic-4');
  console.log(`  Name:          ${fs.name}`);
  console.log(`  Program:       ${fs.program}`);
  console.log(`  total_amount:  ${fs.total_amount}`);
  console.log(`  Components:`);
  for (const c of fs.components ?? []) {
    console.log(`    ${c.fees_category}: ₹${c.amount}`);
  }
  console.log();

  // ── 7. Current fee structure ─────────────────────────────────────────────
  console.log('── 7. Current fee structure: SU FKO-9th State-Advanced-4 ──────');
  const fsAdv = await get('/api/resource/Fee Structure/SU FKO-9th State-Advanced-4');
  console.log(`  Name:          ${fsAdv.name}`);
  console.log(`  total_amount:  ${fsAdv.total_amount}`);
  console.log(`  Components:`);
  for (const c of fsAdv.components ?? []) {
    console.log(`    ${c.fees_category}: ₹${c.amount}`);
  }
  console.log();

  // ── 8. Program Enrollment history (amends) ───────────────────────────────
  console.log('── 8. All Program Enrollments for this student ────────────────');
  const peAll = await get(
    '/api/resource/Program Enrollment?filters=[["student","=","STU-SU FKO-26-002"]]&fields=["name","custom_fee_structure","custom_plan","docstatus","amended_from"]&limit=20'
  );
  for (const p of peAll) {
    console.log(`  ${p.name}: plan=${p.custom_plan} | fs=${p.custom_fee_structure} | docstatus=${p.docstatus} | amended_from=${p.amended_from}`);
  }
  console.log();

  // ── 9. Also check cancelled invoices ─────────────────────────────────────
  console.log('── 9. ALL invoices (including cancelled) ──────────────────────');
  const allInvs = await get(
    '/api/resource/Sales Invoice?filters=[["Sales Invoice Item","sales_order","=","SAL-ORD-2026-00108"]]&fields=["name","grand_total","outstanding_amount","docstatus","status","posting_date","due_date"]&limit=20&order_by=name asc'
  );
  for (const inv of allInvs) {
    const status = inv.docstatus === 2 ? 'CANCELLED' : inv.status;
    console.log(`  ${inv.name}: ₹${inv.grand_total} | status=${status} | due=${inv.due_date}`);
  }

  console.log('\n=================================================================');
  console.log('END STUDY');
  console.log('=================================================================');
}

main().catch(console.error);
