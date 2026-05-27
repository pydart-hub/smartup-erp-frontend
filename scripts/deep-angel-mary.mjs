// Deep study of Angel Mary Martin — STU-SU FKO-26-009
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const headers = { Authorization: AUTH };

async function get(path) {
  const r = await fetch(BASE + path, { headers });
  const t = await r.text();
  try { const j = JSON.parse(t); return j.data ?? j; } catch { return t; }
}

async function main() {
  const STUDENT  = 'STU-SU FKO-26-009';
  const CUSTOMER = 'ANGEL MARY MARTIN';
  const SO_NAME  = 'SAL-ORD-2026-00194';
  const PE_NAME  = 'PEN-10th-Fortkochi 26-27-009';

  // 1. Full SO
  const so = await get(`/api/resource/Sales Order/${encodeURIComponent(SO_NAME)}`);
  console.log('\n=== SALES ORDER ===');
  console.log(`  Name:          ${so.name}`);
  console.log(`  Customer:      ${so.customer}`);
  console.log(`  Grand Total:   ${so.grand_total}`);
  console.log(`  Plan:          ${so.custom_plan}`);
  console.log(`  Instalments:   ${so.custom_no_of_instalments}`);
  console.log(`  Fee Structure: ${so.custom_fee_structure}`);
  console.log(`  Status:        ${so.status}`);
  (so.items || []).forEach(i => console.log(`  SO item: ${i.item_code} | qty=${i.qty} | rate=${i.rate} | amount=${i.amount} | row=${i.name}`));

  // 2. All invoices
  const invRes = await get(`/api/resource/Sales Invoice?filters=[["customer","=","${CUSTOMER}"]]&fields=["name","grand_total","outstanding_amount","status","docstatus","due_date","posting_date","sales_order"]&limit=30&order_by=posting_date%20asc`);
  const invoices = Array.isArray(invRes) ? invRes : (invRes.data || []);
  console.log('\n=== ALL INVOICES ===');
  invoices.forEach(i => {
    const mark = i.docstatus === 2 ? 'CANCELLED' : (i.outstanding_amount === 0 ? 'PAID' : i.status);
    console.log(`  ${i.name} | total=${i.grand_total} | paid=${i.grand_total - i.outstanding_amount} | outstanding=${i.outstanding_amount} | ${mark} (ds=${i.docstatus}) | due=${i.due_date}`);
  });

  // 3. Invoice items for each active invoice
  const activeInvoices = invoices.filter(i => i.docstatus !== 2);
  for (const ai of activeInvoices) {
    const inv = await get(`/api/resource/Sales Invoice/${encodeURIComponent(ai.name)}`);
    console.log(`\n  Invoice ${inv.name} items:`);
    (inv.items || []).forEach(i => console.log(`    ${i.item_code} | qty=${i.qty} | rate=${i.rate} | so_detail=${i.so_detail} | sales_order=${i.sales_order}`));
  }

  // 4. Program Enrollment
  const pe = await get(`/api/resource/Program Enrollment/${encodeURIComponent(PE_NAME)}`);
  console.log('\n=== PROGRAM ENROLLMENT ===');
  console.log(`  Name:          ${pe.name}`);
  console.log(`  Plan:          ${pe.custom_plan}`);
  console.log(`  Fee Structure: ${pe.custom_fee_structure}`);
  console.log(`  Instalments:   ${pe.custom_no_of_instalments}`);
  console.log(`  docstatus:     ${pe.docstatus}`);

  // 5. Payment Entries
  const pyRes = await get(`/api/resource/Payment Entry?filters=[["party","=","${CUSTOMER}"],["docstatus","=",1]]&fields=["name","paid_amount","mode_of_payment","reference_no","posting_date"]&limit=20`);
  const payments = Array.isArray(pyRes) ? pyRes : (pyRes.data || []);
  console.log('\n=== PAYMENT ENTRIES ===');
  payments.forEach(p => console.log(`  ${p.name} | ${p.paid_amount} | ${p.mode_of_payment} | ref=${p.reference_no} | date=${p.posting_date}`));

  // 6. Fee structures
  const basicOTP = await get('/api/resource/Fee%20Structure/SU%20FKO-10th%20State-Basic-1');
  console.log('\n=== TARGET: SU FKO-10th State-Basic-1 ===');
  console.log(`  Total: ${basicOTP.total_amount}`);
  (basicOTP.components || []).forEach(c => console.log(`    ${c.fees_category}: ${c.amount}`));

  const advOTP = await get('/api/resource/Fee%20Structure/SU%20FKO-10th%20State-Advanced-1');
  console.log('\n=== CURRENT: SU FKO-10th State-Advanced-1 ===');
  console.log(`  Total: ${advOTP.total_amount}`);
  (advOTP.components || []).forEach(c => console.log(`    ${c.fees_category}: ${c.amount}`));

  // 7. Summary
  const totalBilled = activeInvoices.reduce((s,i) => s + i.grand_total, 0);
  const totalPaid = activeInvoices.reduce((s,i) => s + (i.grand_total - i.outstanding_amount), 0);
  const totalOutstanding = activeInvoices.reduce((s,i) => s + i.outstanding_amount, 0);
  console.log('\n=== SUMMARY ===');
  console.log(`  SO Grand Total:    ${so.grand_total}`);
  console.log(`  Active invoices:   ${activeInvoices.length}`);
  console.log(`  Total billed:      ${totalBilled}`);
  console.log(`  Total paid:        ${totalPaid}`);
  console.log(`  Total outstanding: ${totalOutstanding}`);
}

main().catch(console.error);
