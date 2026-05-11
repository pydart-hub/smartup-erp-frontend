/**
 * Check what invoice amounts exist for already-billed SOs
 */
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const h = { Authorization: AUTH, 'Content-Type': 'application/json' };
const scriptName = 'check-si-items-' + Date.now();

async function p(url, body) {
  const r = await fetch(BASE + url, { method: 'POST', headers: h, body: JSON.stringify(body) });
  const d = await r.json();
  return d;
}

const pyCode = `
so_list = ['SAL-ORD-2026-00950','SAL-ORD-2026-00933','SAL-ORD-2026-00937','SAL-ORD-2026-00951']
result = {}
for so in so_list:
    rows = frappe.db.sql('''
        SELECT si.name, si.posting_date, si.grand_total, sii.rate, sii.amount, si.docstatus
        FROM \`tabSales Invoice\` si
        JOIN \`tabSales Invoice Item\` sii ON sii.parent = si.name
        WHERE sii.sales_order = %s AND si.docstatus != 2
        ORDER BY si.posting_date, si.name
    ''', (so,), as_dict=True)
    result[so] = rows
frappe.response['message'] = result
`;

// Create server script
const ss = await p('/api/resource/Server Script', {
  name: scriptName, script_type: 'API', api_method: scriptName,
  allow_guest: 0, disabled: 0, script: pyCode,
});
const ssName = ss.data?.name || scriptName;
console.log('Script created:', ssName);

// Execute
const r2 = await fetch(BASE + '/api/method/' + ssName, { method: 'POST', headers: h, body: JSON.stringify({}) });
const d2 = await r2.json();
const result = d2.message || d2;

// Print
for (const [so, rows] of Object.entries(result)) {
  console.log('\n' + so + ':');
  if (!rows || !rows.length) { console.log('  (no invoices)'); continue; }
  rows.forEach(r => console.log(`  ${r.name} | rate=${r.rate} | amount=${r.amount} | status=${r.docstatus}`));
  const tot = rows.reduce((s, r) => s + r.amount, 0);
  console.log('  Billed total: ' + tot.toFixed(2));
}

// Cleanup
await fetch(BASE + '/api/resource/Server Script/' + encodeURIComponent(ssName), { method: 'DELETE', headers: h });
console.log('\nScript deleted.');
