/**
 * Fix fractional SO totals - complete fix for all fields
 * For SHYAM, YOHAN, RIHAN
 */
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const h = { Authorization: AUTH, 'Content-Type': 'application/json' };

async function runScript(name, code) {
  await fetch(BASE + '/api/resource/Server Script/' + encodeURIComponent(name), { method: 'DELETE', headers: h }).catch(() => {});
  await new Promise(r => setTimeout(r, 300));
  
  const cr = await fetch(BASE + '/api/resource/Server Script', {
    method: 'POST', headers: h,
    body: JSON.stringify({ name, script_type: 'API', api_method: name, allow_guest: 0, disabled: 0, script: code }),
  });
  const cd = await cr.json();
  if (!cd.data?.name) {
    throw new Error('Script creation failed: ' + JSON.stringify(cd).slice(0, 200));
  }
  
  const r2 = await fetch(BASE + '/api/method/' + cd.data.name, { method: 'POST', headers: h, body: JSON.stringify({}) });
  const d = await r2.json();
  await fetch(BASE + '/api/resource/Server Script/' + encodeURIComponent(cd.data.name), { method: 'DELETE', headers: h });
  return d;
}

const FIXES = [
  { student: 'SHYAM JITH',  so: 'SAL-ORD-2026-00953', rounded: 24501 },
  { student: 'YOHAN VIJAY', so: 'SAL-ORD-2026-00952', rounded: 21461 },
  { student: 'RIHAN VIJAY', so: 'SAL-ORD-2026-00951', rounded: 21461 },
];

for (const fix of FIXES) {
  console.log(`\nFixing SO for ${fix.student}: ${fix.so} -> Rs.${fix.rounded}`);
  
  const code = `
so = "${fix.so}"
v = ${fix.rounded}
frappe.db.set_value('Sales Order', so, 'grand_total', v, update_modified=False)
frappe.db.set_value('Sales Order', so, 'net_total', v, update_modified=False)
frappe.db.set_value('Sales Order', so, 'total', v, update_modified=False)
frappe.db.set_value('Sales Order', so, 'base_grand_total', v, update_modified=False)
frappe.db.set_value('Sales Order', so, 'base_net_total', v, update_modified=False)
frappe.db.set_value('Sales Order', so, 'base_total', v, update_modified=False)
item = frappe.db.get_value('Sales Order Item', {'parent': so}, 'name')
if item:
    frappe.db.set_value('Sales Order Item', item, 'amount', v, update_modified=False)
    frappe.db.set_value('Sales Order Item', item, 'base_amount', v, update_modified=False)
frappe.db.commit()
gt = frappe.db.get_value('Sales Order', so, 'grand_total')
ia = frappe.db.get_value('Sales Order Item', {'parent': so}, 'amount') if item else None
frappe.response['message'] = {'grand_total': gt, 'item_amount': ia}
`;

  try {
    const result = await runScript('fix_so_all_' + fix.so.replace(/[-\.]/g, '_'), code);
    if (result.message) {
      const m = result.message;
      const ok = parseFloat(m.grand_total) === fix.rounded;
      console.log(`  ${ok ? 'OK' : 'WARN'} grand_total=Rs.${m.grand_total} | item_amount=Rs.${m.item_amount}`);
    } else {
      console.log('  FAIL:', JSON.stringify(result).slice(0, 300));
    }
  } catch (e) {
    console.log('  ERROR:', e.message);
  }
  
  await new Promise(r => setTimeout(r, 1000));
}

console.log('\nSO totals fixed.');
