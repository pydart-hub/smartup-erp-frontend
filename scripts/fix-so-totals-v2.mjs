/**
 * Fix fractional SO totals for SHYAM, YOHAN, RIHAN using a single script
 */
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const h = { Authorization: AUTH, 'Content-Type': 'application/json' };

async function runScript(name, code) {
  // Clean up any existing script with this name
  await fetch(BASE + '/api/resource/Server Script/' + encodeURIComponent(name), { method: 'DELETE', headers: h }).catch(() => {});
  
  const r = await fetch(BASE + '/api/resource/Server Script', {
    method: 'POST', headers: h,
    body: JSON.stringify({ name, script_type: 'API', api_method: name, allow_guest: 0, disabled: 0, script: code }),
  });
  const rd = await r.json();
  const ssName = rd.data?.name || name;
  
  const r2 = await fetch(BASE + '/api/method/' + ssName, { method: 'POST', headers: h, body: JSON.stringify({}) });
  const d = await r2.json();
  await fetch(BASE + '/api/resource/Server Script/' + encodeURIComponent(ssName), { method: 'DELETE', headers: h });
  return d;
}

const FIXES = [
  { student: 'SHYAM JITH',  so: 'SAL-ORD-2026-00953', old: 24500.96, rounded: 24501 },
  { student: 'YOHAN VIJAY', so: 'SAL-ORD-2026-00952', old: 21460.98, rounded: 21461 },
  { student: 'RIHAN VIJAY', so: 'SAL-ORD-2026-00951', old: 21460.98, rounded: 21461 },
];

for (const fix of FIXES) {
  console.log(`\nFixing SO for ${fix.student}: ${fix.so} | Rs.${fix.old} -> Rs.${fix.rounded}`);
  const scriptName = 'fix_so_' + fix.so.replace(/-/g, '_').replace(/\./g, '_');

  const code = `
so_name = "${fix.so}"
new_total = ${fix.rounded}

items = frappe.db.sql(
    "SELECT name, amount FROM \`tabSales Order Item\` WHERE parent = %s LIMIT 1",
    (so_name,), as_dict=True
)
if not items:
    frappe.response['message'] = {'error': 'No items for ' + so_name}
    return

item_row = items[0]['name']
frappe.db.set_value('Sales Order Item', item_row, 'amount', new_total, update_modified=False)
frappe.db.set_value('Sales Order Item', item_row, 'base_amount', new_total, update_modified=False)

money_fields = ['grand_total','net_total','total','base_grand_total','base_net_total','base_total']
for f in money_fields:
    cur = frappe.db.get_value('Sales Order', so_name, f)
    if cur is not None:
        frappe.db.set_value('Sales Order', so_name, f, new_total, update_modified=False)

frappe.db.commit()

gt = frappe.db.get_value('Sales Order', so_name, 'grand_total')
ia = frappe.db.get_value('Sales Order Item', item_row, 'amount')
frappe.response['message'] = {'grand_total': gt, 'item_amount': ia, 'so': so_name}
`;

  const result = await runScript(scriptName, code);
  
  if (result.message?.error) {
    console.log(`  ERROR: ${result.message.error}`);
  } else if (result.message?.grand_total !== undefined) {
    const m = result.message;
    const ok = parseFloat(m.grand_total) === fix.rounded;
    console.log(`  ${ok ? 'OK' : 'WARN'} grand_total = Rs.${m.grand_total} | item_amount = Rs.${m.item_amount}`);
  } else {
    console.log(`  FAIL: ${JSON.stringify(result).slice(0, 400)}`);
  }
  await new Promise(r => setTimeout(r, 800));
}

console.log('\nDone with SO total fixes.');
