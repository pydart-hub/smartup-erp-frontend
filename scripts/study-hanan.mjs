/**
 * Deep study of HANAN SUDHEER's SOs and invoices
 */
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const h = { Authorization: AUTH, 'Content-Type': 'application/json' };
const scriptName = 'study-hanan-' + Date.now();

const pyCode = `
sid = 'STU-SU FKO-26-099'

sos = frappe.db.sql("""
    SELECT so.name, so.transaction_date, so.grand_total, so.per_billed, so.docstatus, so.status,
           soi.qty, soi.rate, soi.amount as item_amount
    FROM \`tabSales Order\` so
    JOIN \`tabSales Order Item\` soi ON soi.parent = so.name
    WHERE so.student = %s AND so.docstatus IN (0,1)
    ORDER BY so.transaction_date DESC, so.name DESC
""", (sid,), as_dict=True)

all_invs = frappe.db.sql("""
    SELECT si.name, si.grand_total, si.outstanding_amount, si.posting_date, si.docstatus,
           sii.sales_order, sii.rate
    FROM \`tabSales Invoice\` si
    JOIN \`tabSales Invoice Item\` sii ON sii.parent = si.name
    WHERE si.student = %s
    ORDER BY si.posting_date, si.name
""", (sid,), as_dict=True)

frappe.response['message'] = {'sales_orders': sos, 'invoices': all_invs}
`;

const r1 = await fetch(BASE + '/api/resource/Server Script', {
  method: 'POST', headers: h,
  body: JSON.stringify({ name: scriptName, script_type: 'API', api_method: scriptName, allow_guest: 0, disabled: 0, script: pyCode }),
});
const ssName = (await r1.json()).data?.name || scriptName;
const r2 = await fetch(BASE + '/api/method/' + ssName, { method: 'POST', headers: h, body: JSON.stringify({}) });
const d2 = await r2.json();
await fetch(BASE + '/api/resource/Server Script/' + encodeURIComponent(ssName), { method: 'DELETE', headers: h });

if (!d2.message) { console.log('ERROR:', JSON.stringify(d2).slice(0, 500)); process.exit(1); }

const { sales_orders, invoices } = d2.message;

console.log('=== HANAN SUDHEER FULL AUDIT ===\n');
console.log('--- SALES ORDERS ---');
for (const so of sales_orders) {
  console.log(`${so.name} | date=${so.transaction_date} | total=₹${so.grand_total} | billed=${so.per_billed}% | docstatus=${so.docstatus} | status=${so.status}`);
  console.log(`  item: qty=${so.qty} rate=₹${so.rate} amount=₹${so.item_amount}`);
}

console.log('\n--- ALL INVOICES ---');
const grouped = {};
for (const inv of invoices) {
  const so = inv.sales_order || 'unknown';
  if (!grouped[so]) grouped[so] = [];
  grouped[so].push(inv);
}
for (const [so, invs] of Object.entries(grouped)) {
  const total = invs.filter(i => i.docstatus === 1).reduce((s, i) => s + i.grand_total, 0);
  console.log(`SO: ${so} (total billed=₹${total.toFixed(2)}):`);
  for (const inv of invs) {
    const st = inv.docstatus === 0 ? 'Draft' : inv.docstatus === 1 ? 'Submitted' : 'Cancelled';
    console.log(`  ${inv.name} | ₹${inv.grand_total} | outstanding=₹${inv.outstanding_amount} | ${st} | date=${inv.posting_date}`);
  }
}
