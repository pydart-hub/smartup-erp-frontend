const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function q(url) {
  const r = await fetch(BASE + url, { headers: { Authorization: AUTH } });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${url}: ${JSON.stringify(j)}`);
  return j.data;
}

async function main() {
  // 1. Payment entries (all statuses incl. cancelled)
  const pe = await q('/api/resource/Payment Entry?filters=[["party","=","ANGELENA CHRISTINA"],["party_type","=","Customer"]]&fields=["name","posting_date","paid_amount","payment_type","reference_no","mode_of_payment","docstatus","remarks"]&limit=20');
  console.log('=== PAYMENT ENTRIES (all) ===');
  console.log(JSON.stringify(pe, null, 2));

  // 2. Journal entries with customer
  const je = await q('/api/resource/Journal Entry?filters=[["Journal Entry Account","party","=","ANGELENA CHRISTINA"]]&fields=["name","posting_date","total_debit","total_credit","voucher_type","docstatus","remark"]&limit=20');
  console.log('\n=== JOURNAL ENTRIES ===');
  console.log(JSON.stringify(je, null, 2));

  // 3. Bank transactions — search by amount 8300
  const bt = await q('/api/resource/Bank Transaction?filters=[["deposit","=","8300"],["company","=","Smart Up Moolamkuzhi"]]&fields=["name","date","deposit","withdrawal","description","bank_account","status"]&limit=20');
  console.log('\n=== BANK TRANSACTIONS (deposit=8300) ===');
  console.log(JSON.stringify(bt, null, 2));

  // 4. Bank transactions — search by any amount for this customer description
  const bt2 = await q('/api/resource/Bank Transaction?filters=[["description","like","%ANGELENA%"],["company","=","Smart Up Moolamkuzhi"]]&fields=["name","date","deposit","withdrawal","description","bank_account","status"]&limit=20');
  console.log('\n=== BANK TRANSACTIONS (description contains ANGELENA) ===');
  console.log(JSON.stringify(bt2, null, 2));

  // 5. Check invoice ACC-SINV-2026-04829 payment status in detail
  const inv = await q('/api/resource/Sales Invoice/ACC-SINV-2026-04829');
  console.log('\n=== INVOICE ACC-SINV-2026-04829 (Q1 fixed) ===');
  console.log(JSON.stringify({
    name: inv.name, posting_date: inv.posting_date, due_date: inv.due_date,
    grand_total: inv.grand_total, outstanding_amount: inv.outstanding_amount,
    status: inv.status, docstatus: inv.docstatus,
    payment_schedule: inv.payment_schedule,
    payments: inv.payments
  }, null, 2));

  // 6. Check all 4 invoices outstanding
  const invoices = ['ACC-SINV-2026-04829','ACC-SINV-2026-04475','ACC-SINV-2026-04476','ACC-SINV-2026-04477'];
  console.log('\n=== ALL 4 INVOICES SUMMARY ===');
  for (const name of invoices) {
    const i = await q(`/api/resource/Sales Invoice/${name}`);
    console.log(`${i.name} | due=${i.due_date} | total=${i.grand_total} | outstanding=${i.outstanding_amount} | status=${i.status}`);
  }
}

main().catch(console.error);
