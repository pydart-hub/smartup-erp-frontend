/**
 * Deep study: payment entries and invoice details for NIVEDH KRISHNA
 */

const FRAPPE_URL = 'https://smartup.m.frappe.cloud';
const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2' };

const INVOICES = [
  'ACC-SINV-2026-06731',
  'ACC-SINV-2026-06732',
  'ACC-SINV-2026-06733',
  'ACC-SINV-2026-06734',
];

async function main() {
  // 1. Check Payment Entries by party = NIVEDH KRISHNA
  console.log('=== Payment Entries (by party) ===');
  const peByParty = new URLSearchParams({
    filters: JSON.stringify([['party', '=', 'NIVEDH KRISHNA'], ['party_type', '=', 'Customer']]),
    fields: JSON.stringify(['name', 'paid_amount', 'reference_no', 'mode_of_payment', 'posting_date', 'docstatus', 'remarks']),
    order_by: 'posting_date asc',
    limit_page_length: '20',
  });
  const rPE = await fetch(`${FRAPPE_URL}/api/resource/Payment Entry?${peByParty}`, { headers });
  const peByPartyList = (await rPE.json()).data;
  console.log(JSON.stringify(peByPartyList, null, 2));

  // 2. Full invoice docs (to see items, linked SO, etc.)
  console.log('\n=== Full Invoice Docs ===');
  for (const invName of INVOICES) {
    const r = await fetch(`${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(invName)}`, { headers });
    const inv = (await r.json()).data;
    console.log(`\n--- ${invName} ---`);
    console.log(JSON.stringify({
      name: inv.name,
      docstatus: inv.docstatus,
      status: inv.status,
      grand_total: inv.grand_total,
      outstanding_amount: inv.outstanding_amount,
      posting_date: inv.posting_date,
      due_date: inv.due_date,
      company: inv.company,
      customer: inv.customer,
      student: inv.student,
      academic_year: inv.academic_year,
      items: inv.items?.map(i => ({
        item_code: i.item_code,
        item_name: i.item_name,
        qty: i.qty,
        rate: i.rate,
        amount: i.amount,
        sales_order: i.sales_order,
      })),
    }, null, 2));
  }

  // 3. Check Payment Entry References (the child table)
  console.log('\n=== Payment Entry References per Invoice ===');
  for (const invName of INVOICES) {
    const perParams = new URLSearchParams({
      filters: JSON.stringify([['reference_name', '=', invName]]),
      fields: JSON.stringify(['name', 'parent', 'reference_name', 'allocated_amount', 'total_amount']),
      limit_page_length: '10',
    });
    const rPER = await fetch(`${FRAPPE_URL}/api/resource/Payment Entry Reference?${perParams}`, { headers });
    const perList = (await rPER.json()).data;
    if (perList?.length) {
      console.log(`\n  ${invName}:`);
      for (const per of perList) {
        // Fetch the parent PE
        const rPE2 = await fetch(`${FRAPPE_URL}/api/resource/Payment Entry/${encodeURIComponent(per.parent)}`, { headers });
        const pe2 = (await rPE2.json()).data;
        console.log(`    PE ${per.parent}: allocated=${per.allocated_amount}, paid_amount=${pe2?.paid_amount}, mode=${pe2?.mode_of_payment}, ref=${pe2?.reference_no}, docstatus=${pe2?.docstatus}`);
      }
    } else {
      console.log(`  ${invName}: no PER found`);
    }
  }
}

main().catch(console.error);
