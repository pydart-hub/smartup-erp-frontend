/**
 * Check all 11 students for fractional SO totals and invoice amounts
 */
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const h = { Authorization: AUTH, 'Content-Type': 'application/json' };
const scriptName = 'check-fractional-' + Date.now();

const pyCode = `
student_ids = [
    'STU-SU FKO-26-076','STU-SU FKO-26-077','STU-SU FKO-26-078',
    'STU-SU FKO-26-094','STU-SU FKO-26-089','STU-SU FKO-26-090',
    'STU-SU FKO-26-088','STU-SU FKO-26-099','STU-SU ERV-26-153',
    'STU-SU CHL-26-014','STU-SU PLR-26-061'
]

result = []
for sid in student_ids:
    rows = frappe.db.sql("""
        SELECT so.name as so_name, so.grand_total as so_total, so.student,
               soi.name as item_row, soi.qty, soi.rate, soi.amount as item_amount,
               so.net_total, so.total, so.base_grand_total, so.base_net_total, so.base_total
        FROM \`tabSales Order\` so
        JOIN \`tabSales Order Item\` soi ON soi.parent = so.name
        WHERE so.student = %s AND so.docstatus = 1 AND so.grand_total > 1000
        ORDER BY so.transaction_date DESC LIMIT 1
    """, (sid,), as_dict=True)
    if not rows:
        continue
    row = rows[0]

    invs = frappe.db.sql("""
        SELECT si.name, si.grand_total, si.outstanding_amount, si.rounding_adjustment,
               si.disable_rounded_total, si.posting_date, si.due_date, sii.rate,
               sii.sales_order, sii.so_detail, sii.item_code, sii.item_name,
               si.customer, si.company, si.student, si.custom_academic_year
        FROM \`tabSales Invoice\` si
        JOIN \`tabSales Invoice Item\` sii ON sii.parent = si.name
        WHERE sii.sales_order = %s AND si.docstatus = 1
        ORDER BY si.posting_date, si.name
    """, (row['so_name'],), as_dict=True)

    row['invoices'] = invs
    result.append(row)

frappe.response['message'] = result
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

const isFractional = n => Math.abs(n - Math.round(n)) > 0.001;

console.log('=== FRACTIONAL AMOUNT AUDIT ===\n');
for (const s of d2.message) {
  const badSO = isFractional(s.so_total);
  const badInvs = s.invoices.filter(i => isFractional(i.grand_total));
  const flag = (badSO || badInvs.length > 0) ? '❌' : '✅';
  console.log(`${flag} ${s.so_name} | total=₹${s.so_total}${badSO ? ` → ₹${Math.round(s.so_total)}` : ''}`);
  for (const inv of s.invoices) {
    const bad = isFractional(inv.grand_total);
    console.log(`  ${bad ? '⚠' : '✓'} ${inv.name} ₹${inv.grand_total} | outstanding=₹${inv.outstanding_amount} | rounding=₹${inv.rounding_adjustment}`);
  }
  console.log();
}
