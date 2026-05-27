// Study payment entry structure for Angel Mary Martin
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const headers = { Authorization: AUTH };

async function get(path) {
  const r = await fetch(BASE + path, { headers });
  const t = await r.text();
  try { const j = JSON.parse(t); return j.data ?? j; } catch { return t; }
}

async function main() {
  // Full detail of both payment entries
  for (const peName of ['ACC-PAY-2026-04000', 'ACC-PAY-2026-04179']) {
    const pe = await get(`/api/resource/Payment Entry/${encodeURIComponent(peName)}`);
    console.log(`\n=== ${peName} ===`);
    console.log(`  paid_amount:       ${pe.paid_amount}`);
    console.log(`  payment_type:      ${pe.payment_type}`);
    console.log(`  mode_of_payment:   ${pe.mode_of_payment}`);
    console.log(`  party_type:        ${pe.party_type}`);
    console.log(`  party:             ${pe.party}`);
    console.log(`  party_name:        ${pe.party_name}`);
    console.log(`  posting_date:      ${pe.posting_date}`);
    console.log(`  reference_no:      ${pe.reference_no}`);
    console.log(`  company:           ${pe.company}`);
    console.log(`  paid_from:         ${pe.paid_from}`);
    console.log(`  paid_to:           ${pe.paid_to}`);
    console.log(`  paid_from_account_currency: ${pe.paid_from_account_currency}`);
    console.log(`  paid_to_account_currency:   ${pe.paid_to_account_currency}`);
    console.log(`  source_exchange_rate:        ${pe.source_exchange_rate}`);
    console.log(`  target_exchange_rate:        ${pe.target_exchange_rate}`);
    console.log(`  received_amount:   ${pe.received_amount}`);
    console.log(`  cost_center:       ${pe.cost_center}`);
    console.log(`  remarks:           ${pe.remarks}`);
    console.log(`  docstatus:         ${pe.docstatus}`);
    console.log('  References (allocations):');
    (pe.references || []).forEach(r => {
      console.log(`    ${r.reference_doctype} | ${r.reference_name} | allocated=${r.allocated_amount} | total_amount=${r.total_amount} | outstanding=${r.outstanding_amount}`);
    });
    console.log('  Deductions:');
    (pe.deductions || []).forEach(d => console.log(`    account=${d.account} | cost_center=${d.cost_center} | amount=${d.amount}`));
  }

  // Also check the SO item row name (so_detail) for invoice creation
  const so = await get('/api/resource/Sales Order/SAL-ORD-2026-00194');
  console.log('\n=== SO ITEMS (for linking new invoice) ===');
  (so.items || []).forEach(i => console.log(`  row=${i.name} | item_code=${i.item_code} | qty=${i.qty} | rate=${i.rate} | amount=${i.amount}`));
  console.log('  Company:', so.company);

  // Also get the Debtors account for Fort Kochi
  const debtors = await get('/api/resource/Sales Invoice/ACC-SINV-2026-02484');
  console.log('\n=== ORIGINAL INVOICE (accounts) ===');
  console.log('  debit_to:', debtors.debit_to);
  console.log('  company:', debtors.company);
  console.log('  cost_center:', debtors.cost_center);
}

main().catch(console.error);
