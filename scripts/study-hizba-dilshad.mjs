const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function api(endpoint) {
  const r = await fetch(BASE + endpoint, { headers: { Authorization: AUTH } });
  return r.json();
}

async function apiPost(endpoint, data) {
  const r = await fetch(BASE + endpoint, {
    method: 'POST',
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return r.json();
}

async function main() {
  // Get full details of all relevant invoices
  const invoices = [
    'ACC-SINV-2026-04661', 'ACC-SINV-2026-04662', 'ACC-SINV-2026-04663', 'ACC-SINV-2026-04857', // HIZBA
    'ACC-SINV-2026-04664', 'ACC-SINV-2026-04665', 'ACC-SINV-2026-04666', 'ACC-SINV-2026-04858'  // DILSHAD
  ];

  for (const inv of invoices) {
    const si = await api(`/api/resource/Sales Invoice/${inv}`);
    const d = si.data;
    console.log(`\n=== ${inv} ===`);
    console.log(`  student: ${d.student} (${d.student_name})`);
    console.log(`  posting_date: ${d.posting_date} | due_date: ${d.due_date}`);
    console.log(`  grand_total: ${d.grand_total} | outstanding: ${d.outstanding_amount} | status: ${d.status}`);
    console.log(`  custom_installment_number: ${d.custom_installment_number}`);
    console.log(`  custom_fee_plan: ${d.custom_fee_plan}`);
    console.log(`  custom_installment_name: ${d.custom_installment_name}`);
    console.log(`  items: ${JSON.stringify(d.items?.map(i => ({code: i.item_code, name: i.item_name, qty: i.qty, rate: i.rate, amount: i.amount})))}`);
    console.log(`  payment_schedule: ${JSON.stringify(d.payment_schedule)}`);
  }

  // Get full payment entry details
  const payments = ['ACC-PAY-2026-04389', 'ACC-PAY-2026-04390'];
  for (const pe of payments) {
    const p = await api(`/api/resource/Payment Entry/${pe}`);
    const d = p.data;
    console.log(`\n=== Payment: ${pe} ===`);
    console.log(`  party: ${d.party} | amount: ${d.paid_amount}`);
    console.log(`  references: ${JSON.stringify(d.references?.map(r => ({doctype: r.reference_doctype, name: r.reference_name, amount: r.allocated_amount})))}`);
  }
}


main().catch(console.error);
