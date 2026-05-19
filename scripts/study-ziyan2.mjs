/**
 * study-ziyan2.mjs — Fix invoice query and get full picture
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const HEADERS = { Authorization: AUTH };

const STUDENT_ID = 'STU-SU PLR-26-078';
const CUSTOMER   = 'Mohammed Ziyan S';
const SO_NAME    = 'SAL-ORD-2026-00751';

async function fetchJSON(url) {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) { console.error(`[SKIP] HTTP ${r.status}`); return { data: null }; }
  return r.json();
}

async function main() {

  // ── All Invoices by customer name ─────────────────────────────
  console.log('\n═══ INVOICES (by customer name, all docstatus) ═══');
  const invRes = await fetchJSON(
    BASE + '/api/resource/Sales Invoice?filters=' + encodeURIComponent(JSON.stringify([
      ['customer_name', '=', CUSTOMER],
      ['is_return', '=', 0],
    ])) +
    '&fields=' + encodeURIComponent(JSON.stringify([
      'name','customer_name','posting_date','due_date',
      'grand_total','outstanding_amount','status','docstatus',
    ])) +
    '&limit=30&order_by=posting_date asc'
  );
  const allInv = invRes.data || [];
  console.log(`Total invoices: ${allInv.length}`);
  allInv.forEach(i => {
    const st = i.docstatus === 2 ? 'CANCELLED' : i.status;
    console.log(`  ${i.name} | posted=${i.posting_date} | due=${i.due_date} | ₹${i.grand_total} | outstanding=₹${i.outstanding_amount} | ${st}`);
  });

  // ── Full details of each non-cancelled invoice ────────────────
  console.log('\n═══ INVOICE DETAILS ═══');
  for (const inv of allInv) {
    console.log(`\n--- ${inv.name} (${inv.docstatus === 2 ? 'CANCELLED' : inv.status}) ---`);
    if (inv.docstatus === 2) continue;
    const d = (await fetchJSON(`${BASE}/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}`)).data;
    if (!d) continue;
    console.log(`  posting_date   : ${d.posting_date}`);
    console.log(`  due_date       : ${d.due_date}`);
    console.log(`  grand_total    : ₹${d.grand_total}`);
    console.log(`  outstanding_amt: ₹${d.outstanding_amount}`);
    console.log(`  status         : ${d.status}`);
    if (d.items) d.items.forEach(i =>
      console.log(`  item: ${i.item_code} | desc: "${i.description}" | rate=₹${i.rate} | qty=${i.qty} | SO=${i.sales_order}`)
    );
    if (d.payment_schedule) d.payment_schedule.forEach(p =>
      console.log(`  sched: due=${p.due_date} | amt=₹${p.payment_amount} | outstanding=₹${p.outstanding}`)
    );
    if (d.payments) d.payments.forEach(p =>
      console.log(`  payment: ref=${p.reference_name} | amt=₹${p.amount}`)
    );
  }

  // ── Sales Order full detail ───────────────────────────────────
  console.log('\n═══ SALES ORDER DETAIL ═══');
  const so = (await fetchJSON(`${BASE}/api/resource/Sales Order/${SO_NAME}`)).data;
  if (so) {
    console.log(`status        : ${so.status}`);
    console.log(`grand_total   : ₹${so.grand_total}`);
    console.log(`per_billed    : ${so.per_billed}%`);
    console.log(`custom_plan   : ${so.custom_plan}`);
    console.log(`instalments   : ${so.custom_no_of_instalments}`);
    console.log(`transaction_dt: ${so.transaction_date}`);
    if (so.items) so.items.forEach(i =>
      console.log(`  item: ${i.item_code} | qty=${i.qty} | rate=₹${i.rate} | billed=₹${i.billed_amt} | delivered=${i.delivered_qty}`)
    );
  }

  // ── Invoices linked to the SO (via items) ─────────────────────
  console.log('\n═══ INVOICES LINKED TO SO (SAL-ORD-2026-00751) ═══');
  const soInv = await fetchJSON(
    BASE + '/api/resource/Sales Invoice?filters=' + encodeURIComponent(JSON.stringify([
      ['customer_name', '=', CUSTOMER],
    ])) +
    '&fields=' + encodeURIComponent(JSON.stringify([
      'name','posting_date','due_date','grand_total','outstanding_amount','status','docstatus',
    ])) +
    '&limit=30'
  );
  // Check each invoice item for SO link
  const candidates = soInv.data || [];
  for (const inv of candidates) {
    const d = (await fetchJSON(`${BASE}/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}`)).data;
    const hasSOLink = d?.items?.some(i => i.sales_order === SO_NAME);
    if (hasSOLink) {
      console.log(`  ${inv.name} | due=${inv.due_date} | ₹${inv.grand_total} | outstanding=₹${inv.outstanding_amount} | ${inv.docstatus === 2 ? 'CANCELLED' : inv.status}`);
    }
  }

  // ── Fee schedule that SHOULD exist for 8 instalments ─────────
  console.log('\n═══ EXPECTED 8-INSTALMENT SCHEDULE ═══');
  console.log('Fee Structure: SU PLR-10th State-Basic-8 | total_amount: ₹17,800');
  console.log('8 instalments of ~₹2,225 each');
  console.log('Standard PLR Basic-8 due dates: Apr 15, May 15, Jun 15, Jul 15, Aug 15, Sep 15, Oct 15, Nov 15');
  const instAmt = Math.round(17800 / 8);
  const months = ['Apr 15, 2026','May 15, 2026','Jun 15, 2026','Jul 15, 2026','Aug 15, 2026','Sep 15, 2026','Oct 15, 2026','Nov 15, 2026'];
  months.forEach((m, idx) => {
    const paid = idx === 0 ? '✓ PAID (₹2400 via UPI Apr 29)' : idx === 1 ? '⚠ DUE MAY 15 (today: May 17 → OVERDUE?)' : '— upcoming';
    console.log(`  Inst ${idx+1}: ${m} | ~₹${instAmt} | ${paid}`);
  });
}

main().catch(console.error);
