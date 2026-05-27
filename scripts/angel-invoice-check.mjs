// Check Angel Mary invoices
const h = {'Authorization':'token 03330270e330d49:9c2261ae11ac2d2'};
const b = 'https://smartup.m.frappe.cloud';

async function get(path) {
  const r = await fetch(b + path, {headers: h});
  const t = await r.text();
  try { const j = JSON.parse(t); return j.data ?? j; } catch { return t; }
}

async function go() {
  // 1. Check the specific invoice from session context
  const inv = await get('/api/resource/Sales Invoice/ACC-SINV-2026-02484');
  if (inv && inv.name) {
    console.log('Invoice ACC-SINV-2026-02484:');
    console.log('  grand_total:', inv.grand_total);
    console.log('  outstanding:', inv.outstanding_amount);
    console.log('  status:', inv.status);
    console.log('  docstatus:', inv.docstatus, '(0=draft,1=submitted,2=cancelled)');
    console.log('  customer:', inv.customer);
    console.log('  sales_order:', inv.sales_order);
    console.log('  Items:');
    (inv.items||[]).forEach(i => console.log(`    ${i.item_code} | rate=${i.rate} | so_detail=${i.so_detail}`));
  } else {
    console.log('ACC-SINV-2026-02484: not found or error:', inv);
  }

  // 2. Query by sales_order
  const bySOParams = new URLSearchParams({
    filters: JSON.stringify([['sales_order','=','SAL-ORD-2026-00194']]),
    fields: JSON.stringify(['name','grand_total','outstanding_amount','status','docstatus','customer']),
    limit_page_length: '20',
  });
  const bySO = await get('/api/resource/Sales Invoice?' + bySOParams);
  console.log('\nInvoices by SO SAL-ORD-2026-00194:');
  const list = Array.isArray(bySO) ? bySO : (bySO.data || []);
  list.forEach(i => console.log(`  ${i.name} | ${i.grand_total} | ${i.status} (ds=${i.docstatus}) | cust=${i.customer}`));
  if (!list.length) console.log('  none found');

  // 3. Query all invoices for student STU-SU FKO-26-009
  const byStudentParams = new URLSearchParams({
    filters: JSON.stringify([['student','=','STU-SU FKO-26-009']]),
    fields: JSON.stringify(['name','grand_total','outstanding_amount','status','docstatus','customer','sales_order','due_date']),
    limit_page_length: '20',
  });
  const byStudent = await get('/api/resource/Sales Invoice?' + byStudentParams);
  console.log('\nInvoices by Student STU-SU FKO-26-009:');
  const list2 = Array.isArray(byStudent) ? byStudent : (byStudent.data || []);
  list2.forEach(i => console.log(`  ${i.name} | ${i.grand_total} | outstanding=${i.outstanding_amount} | ${i.status} (ds=${i.docstatus}) | so=${i.sales_order} | due=${i.due_date}`));
  if (!list2.length) console.log('  none found');

  // 4. Check payment entry references — what invoices are allocated
  const pe1 = await get('/api/resource/Payment Entry/ACC-PAY-2026-04000');
  console.log('\nPayment Entry ACC-PAY-2026-04000:');
  console.log('  paid_amount:', pe1.paid_amount);
  console.log('  References:');
  (pe1.references||[]).forEach(r => console.log(`    ${r.reference_doctype} | ${r.reference_name} | allocated=${r.allocated_amount}`));

  const pe2 = await get('/api/resource/Payment Entry/ACC-PAY-2026-04179');
  console.log('\nPayment Entry ACC-PAY-2026-04179:');
  console.log('  paid_amount:', pe2.paid_amount);
  console.log('  References:');
  (pe2.references||[]).forEach(r => console.log(`    ${r.reference_doctype} | ${r.reference_name} | allocated=${r.allocated_amount}`));
}

go().catch(console.error);
