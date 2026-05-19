/**
 * study-ziyan-schedule.mjs
 * Understand WHY Inst 2 & 3 have wrong due dates.
 * Check the fee-config for PLR 10th State Basic.
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const HEADERS = { Authorization: AUTH };

async function fetchJSON(url, opts = {}) {
  const r = await fetch(url, { headers: HEADERS, ...opts });
  if (!r.ok) { console.error('[SKIP]', r.status); return { data: null }; }
  return r.json();
}

async function main() {

  // ── Fee config from Next.js API ───────────────────────────────
  console.log('\n═══ FEE CONFIG: PLR 10th State Basic ═══');
  const fc = await fetch('http://localhost:3000/api/fee-config?company=Smart+Up+Palluruthy&program=10th+State&plan=Basic')
    .then(r => r.json())
    .catch(() => null);
  if (fc?.data) {
    console.log(JSON.stringify(fc.data, null, 2));
  } else {
    console.log('(Could not reach localhost — app not running)');
  }

  // ── Check Invoice creation dates (vs posting dates) ──────────
  console.log('\n═══ INVOICE CREATION TIMESTAMPS ═══');
  const invs = ['ACC-SINV-2026-06021','ACC-SINV-2026-06022','ACC-SINV-2026-06023'];
  for (const name of invs) {
    const d = (await fetchJSON(`${BASE}/api/resource/Sales Invoice/${name}`)).data;
    if (!d) continue;
    console.log(`${name}:`);
    console.log(`  creation     : ${d.creation}`);
    console.log(`  modified     : ${d.modified}`);
    console.log(`  owner        : ${d.owner}`);
    console.log(`  due_date     : ${d.due_date}`);
    console.log(`  payment_terms: ${d.payment_terms_template}`);
    if (d.payment_schedule) {
      d.payment_schedule.forEach(p => console.log(`  sched_due: ${p.due_date} | amt: ${p.payment_amount} | outstanding: ${p.outstanding}`));
    }
  }

  // ── SO items — qty breakdown ──────────────────────────────────
  console.log('\n═══ SO ITEMS BREAKDOWN ═══');
  const so = (await fetchJSON(`${BASE}/api/resource/Sales Order/SAL-ORD-2026-00751`)).data;
  if (so) {
    console.log(`SO qty: ${so.items?.[0]?.qty} | rate: ${so.items?.[0]?.rate} | total: ${so.grand_total}`);
    console.log(`SO per_billed: ${so.per_billed}%`);
    console.log(`SO transaction_date: ${so.transaction_date}`);
    console.log(`SO creation: ${so.creation}`);
    console.log(`SO owner: ${so.owner}`);
  }

  // ── What the correct schedule SHOULD be ──────────────────────
  console.log('\n═══ CORRECT SCHEDULE (standard Monthly-8) ═══');
  console.log('Enrollment date: 2026-04-22');
  console.log('Based on INSTALMENT_DUE_DATES.inst8 = [Apr15, May15, Jun15, Jul15, Aug15, Sep15, Oct15, Nov15]');
  console.log('');
  console.log('Since enrollment Apr 22 > Apr 15: Inst 1 = due ASAP (enrollment date Apr 22)');
  console.log('May 15, Jun 15 are FUTURE as of Apr 22 → Inst 2 = May 15, Inst 3 = Jun 15');
  console.log('');
  const correct = [
    { n: 1, due: '2026-04-22', amt: 2400, note: 'PAID ✓' },
    { n: 2, due: '2026-05-15', amt: 2400, note: 'should be May 15 — currently Apr 29 ❌' },
    { n: 3, due: '2026-06-15', amt: 2400, note: 'should be Jun 15 — currently Apr 29 ❌' },
    { n: 4, due: '2026-07-15', amt: 2400, note: 'correct ✓' },
    { n: 5, due: '2026-08-15', amt: 2400, note: 'correct ✓' },
    { n: 6, due: '2026-09-15', amt: 2400, note: 'correct ✓' },
    { n: 7, due: '2026-10-15', amt: 2400, note: 'correct ✓' },
    { n: 8, due: '2026-11-15', amt: 1000, note: 'correct ✓' },
  ];
  correct.forEach(r => console.log(`  Inst ${r.n}: due=${r.due} | ₹${r.amt} | ${r.note}`));
  console.log('\nTotal: ₹17,800 ✓');

  // ── Payment entries to understand what was paid ───────────────
  console.log('\n═══ PAYMENT ENTRIES DETAIL ═══');
  const pe = (await fetchJSON(
    BASE + '/api/resource/Payment Entry/ACC-PAY-2026-04669'
  )).data;
  if (pe) {
    console.log('paid_amount:', pe.paid_amount);
    console.log('posting_date:', pe.posting_date);
    console.log('mode_of_payment:', pe.mode_of_payment);
    console.log('reference_no:', pe.reference_no);
    console.log('remarks:', pe.remarks);
    console.log('references (invoices):');
    (pe.references || []).forEach(r => {
      console.log(`  doctype=${r.reference_doctype} | name=${r.reference_name} | total=₹${r.total_amount} | outstanding=₹${r.outstanding_amount} | allocated=₹${r.allocated_amount}`);
    });
  }
}

main().catch(console.error);
