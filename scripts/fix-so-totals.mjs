/**
 * Step 1: Fix fractional SO totals for SHYAM, YOHAN, RIHAN
 * Uses frappe.db.set_value to update SO item amount and SO totals directly
 */
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const h = { Authorization: AUTH, 'Content-Type': 'application/json' };

const FIXES = [
  { student: 'SHYAM JITH',    so: 'SAL-ORD-2026-00953', old: 24500.96, rounded: 24501 },
  { student: 'YOHAN VIJAY',   so: 'SAL-ORD-2026-00952', old: 21460.98, rounded: 21461 },
  { student: 'RIHAN VIJAY',   so: 'SAL-ORD-2026-00951', old: 21460.98, rounded: 21461 },
];

async function runScript(name, code) {
  const r = await fetch(BASE + '/api/resource/Server Script', {
    method: 'POST', headers: h,
    body: JSON.stringify({ name, script_type: 'API', api_method: name, allow_guest: 0, disabled: 0, script: code }),
  });
  const ssName = (await r.json()).data?.name || name;
  const r2 = await fetch(BASE + '/api/method/' + ssName, { method: 'POST', headers: h, body: JSON.stringify({}) });
  const d = await r2.json();
  await fetch(BASE + '/api/resource/Server Script/' + encodeURIComponent(ssName), { method: 'DELETE', headers: h });
  return d;
}

for (const fix of FIXES) {
  console.log(`\nFixing SO for ${fix.student}: ${fix.so} | ₹${fix.old} → ₹${fix.rounded}`);
  const diff = fix.rounded - fix.old;

  const code = `
so_name = "${fix.so}"
new_total = ${fix.rounded}

# Get SO item row name
items = frappe.db.sql("""
    SELECT name, qty, rate, amount, base_amount
    FROM \`tabSales Order Item\`
    WHERE parent = %s
    LIMIT 1
""", (so_name,), as_dict=True)

if not items:
    frappe.response['message'] = {'error': 'No SO items found for ' + so_name}
    return

item = items[0]
item_name = item['name']

# Update SO item amount and base_amount
frappe.db.set_value('Sales Order Item', item_name, 'amount', new_total, update_modified=False)
frappe.db.set_value('Sales Order Item', item_name, 'base_amount', new_total, update_modified=False)

# Update SO-level totals
for field in ['grand_total', 'net_total', 'total', 'base_grand_total', 'base_net_total', 'base_total',
              'rounded_total', 'base_rounded_total']:
    try:
        old_val = frappe.db.get_value('Sales Order', so_name, field)
        if old_val is not None and abs(float(old_val) - ${fix.old}) < 0.1:
            frappe.db.set_value('Sales Order', so_name, field, new_total, update_modified=False)
    except Exception as e:
        pass  # Field might not exist

frappe.db.commit()

# Verify
updated = frappe.db.get_value('Sales Order', so_name, ['grand_total', 'net_total', 'total'], as_dict=True)
item_upd = frappe.db.get_value('Sales Order Item', item_name, ['amount', 'base_amount'], as_dict=True)
frappe.response['message'] = {
    'so': so_name,
    'so_grand_total': updated['grand_total'],
    'so_net_total': updated['net_total'],
    'so_total': updated['total'],
    'item_amount': item_upd['amount'],
    'item_base_amount': item_upd['base_amount']
}
`;

  const result = await runScript('fix-so-total-' + Date.now(), code);
  if (result.message?.error) {
    console.log(`  ❌ ERROR: ${result.message.error}`);
  } else if (result.message) {
    const m = result.message;
    const ok = Math.round(m.so_grand_total) === fix.rounded && Math.round(m.item_amount) === fix.rounded;
    console.log(`  ${ok ? '✅' : '⚠'} SO grand_total=${m.so_grand_total}, net_total=${m.so_net_total}, total=${m.so_total}`);
    console.log(`  ${ok ? '✅' : '⚠'} Item amount=${m.item_amount}, base_amount=${m.item_base_amount}`);
  } else {
    console.log('  ❌ Unexpected response:', JSON.stringify(result).slice(0, 300));
  }

  // Small delay between ops
  await new Promise(r => setTimeout(r, 500));
}

console.log('\n✅ SO total updates complete. Run fix-fractional-invoices.mjs next.');
