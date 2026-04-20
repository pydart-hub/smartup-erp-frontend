const BASE = 'https://smartup.m.frappe.cloud';
const HEADERS = { 'Content-Type': 'application/json', Authorization: 'token 03330270e330d49:9c2261ae11ac2d2' };

async function api(method, path, body) {
  const r = await fetch(BASE + path, { method, headers: HEADERS, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${path}: ${JSON.stringify(j)}`);
  return j.data;
}

async function main() {
  const payload = {
    doctype: 'Payment Entry',
    payment_type: 'Receive',
    mode_of_payment: 'Cash',
    company: 'Smart Up Moolamkuzhi',
    posting_date: '2026-04-20',
    party_type: 'Customer',
    party: 'ANGELENA CHRISTINA',
    paid_from: 'Debtors - SU MMK',
    paid_to: 'Cash - SU MMK',
    paid_from_account_currency: 'INR',
    paid_to_account_currency: 'INR',
    paid_amount: 8300,
    received_amount: 8300,
    references: [
      {
        reference_doctype: 'Sales Invoice',
        reference_name: 'ACC-SINV-2026-04829',
        total_amount: 8300,
        outstanding_amount: 8300,
        allocated_amount: 8300,
      }
    ]
  };

  console.log('Creating payment entry draft...');
  const created = await api('POST', '/api/resource/Payment Entry', payload);
  console.log('Draft created:', created.name);
  console.log('Paid amount:', created.paid_amount, '| Party:', created.party);

  console.log('\nSubmitting...');
  const submitted = await api('PUT', `/api/resource/Payment Entry/${created.name}`, { docstatus: 1 });
  console.log('Submitted:', submitted.name, '| docstatus:', submitted.docstatus);

  // Verify invoice outstanding
  console.log('\nVerifying invoice...');
  const inv = await api('GET', '/api/resource/Sales Invoice/ACC-SINV-2026-04829', null);
  console.log('Invoice ACC-SINV-2026-04829 | outstanding:', inv.outstanding_amount, '| status:', inv.status);
}

main().catch(console.error);
