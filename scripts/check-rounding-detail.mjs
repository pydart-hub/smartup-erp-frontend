/**
 * Deep check on last invoices for rounding fields + SO items for Rihan/Yohan/Shyam
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const h = { Authorization: AUTH, 'Content-Type': 'application/json' };
const scriptName = 'check-rounding-' + Date.now();

const pyCode = `
# Check rounding fields on last invoices + full SO details
target_invoices = ['ACC-SINV-2026-07201', 'ACC-SINV-2026-07219', 'ACC-SINV-2026-07213']
target_sos = ['SAL-ORD-2026-00951', 'SAL-ORD-2026-00952', 'SAL-ORD-2026-00953']

inv_data = {}
for inv in target_invoices:
    row = frappe.db.sql("""
        SELECT name, grand_total, outstanding_amount, total, net_total,
               rounding_adjustment, base_rounding_adjustment,
               rounded_total, base_rounded_total, docstatus
        FROM \`tabSales Invoice\`
        WHERE name = %s
    """, (inv,), as_dict=True)
    inv_data[inv] = row[0] if row else None

so_data = {}
for so in target_sos:
    rows = frappe.db.sql("""
        SELECT so.name, so.grand_total, so.status, so.per_billed,
               soi.item_code, soi.qty, soi.rate, soi.amount
        FROM \`tabSales Order\` so
        JOIN \`tabSales Order Item\` soi ON soi.parent = so.name
        WHERE so.name = %s
    """, (so,), as_dict=True)
    so_data[so] = rows

frappe.response['message'] = {'invoices': inv_data, 'sales_orders': so_data}
`;

const r1 = await fetch(BASE + '/api/resource/Server Script', {
  method: 'POST', headers: h,
  body: JSON.stringify({ name: scriptName, script_type: 'API', api_method: scriptName, allow_guest: 0, disabled: 0, script: pyCode }),
});
const ssName = (await r1.json()).data?.name || scriptName;

const r2 = await fetch(BASE + '/api/method/' + ssName, { method: 'POST', headers: h, body: JSON.stringify({}) });
const d2 = await r2.json();
await fetch(BASE + '/api/resource/Server Script/' + encodeURIComponent(ssName), { method: 'DELETE', headers: h });

if (!d2.message) { console.log('ERROR:', JSON.stringify(d2).slice(0, 300)); process.exit(1); }

const { invoices, sales_orders } = d2.message;

console.log('=== LAST INVOICE ROUNDING FIELDS ===');
for (const [name, inv] of Object.entries(invoices)) {
  if (!inv) { console.log(name, '-> NOT FOUND'); continue; }
  console.log(`\n${name}:`);
  console.log(`  grand_total:              ₹${inv.grand_total}`);
  console.log(`  outstanding_amount:       ₹${inv.outstanding_amount}`);
  console.log(`  total/net_total:          ₹${inv.total} / ₹${inv.net_total}`);
  console.log(`  rounding_adjustment:      ₹${inv.rounding_adjustment}`);
  console.log(`  base_rounding_adjustment: ₹${inv.base_rounding_adjustment}`);
  console.log(`  rounded_total:            ₹${inv.rounded_total}`);
  console.log(`  base_rounded_total:       ₹${inv.base_rounded_total}`);
  console.log(`  docstatus: ${inv.docstatus}`);
}

console.log('\n=== SALES ORDER ITEMS ===');
for (const [soName, rows] of Object.entries(sales_orders)) {
  console.log(`\n${soName}:`);
  for (const row of rows) {
    console.log(`  item=${row.item_code} | qty=${row.qty} | rate=₹${row.rate} | amount=₹${row.amount}`);
    console.log(`  SO grand_total=₹${row.grand_total} | per_billed=${row.per_billed}%`);
  }
}
