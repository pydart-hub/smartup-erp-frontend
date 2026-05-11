/**
 * Fix HANAN's fractional invoices:
 * - SAL-ORD-2026-00860: last inv ACC-SINV-2026-07235 (Rs.500.96) -> Rs.501
 * - SAL-ORD-2026-00905: SO total Rs.17300.96 -> Rs.17301 (invoices already whole)
 * Also fix SAL-ORD-2026-00860's SO total
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
  if (!cd.data?.name) throw new Error('Script creation failed: ' + JSON.stringify(cd).slice(0, 200));
  const r2 = await fetch(BASE + '/api/method/' + cd.data.name, { method: 'POST', headers: h, body: JSON.stringify({}) });
  const d = await r2.json();
  await fetch(BASE + '/api/resource/Server Script/' + encodeURIComponent(cd.data.name), { method: 'DELETE', headers: h });
  return d;
}

// Step 1: Fix both HANAN SOs grand_total
console.log('=== Step 1: Fix HANAN SO totals ===');
const soFixCode = `
for so_name in ['SAL-ORD-2026-00905', 'SAL-ORD-2026-00860']:
    v = 17301
    frappe.db.set_value('Sales Order', so_name, 'grand_total', v, update_modified=False)
    frappe.db.set_value('Sales Order', so_name, 'net_total', v, update_modified=False)
    frappe.db.set_value('Sales Order', so_name, 'total', v, update_modified=False)
    frappe.db.set_value('Sales Order', so_name, 'base_grand_total', v, update_modified=False)
    frappe.db.set_value('Sales Order', so_name, 'base_net_total', v, update_modified=False)
    frappe.db.set_value('Sales Order', so_name, 'base_total', v, update_modified=False)
    item = frappe.db.get_value('Sales Order Item', {'parent': so_name}, 'name')
    if item:
        frappe.db.set_value('Sales Order Item', item, 'amount', v, update_modified=False)
        frappe.db.set_value('Sales Order Item', item, 'base_amount', v, update_modified=False)
frappe.db.commit()
result = {}
for so_name in ['SAL-ORD-2026-00905', 'SAL-ORD-2026-00860']:
    result[so_name] = frappe.db.get_value('Sales Order', so_name, 'grand_total')
frappe.response['message'] = result
`;

const soResult = await runScript('fix_hanan_so_totals', soFixCode);
if (soResult.message) {
  for (const [so, gt] of Object.entries(soResult.message)) {
    console.log(`  ${so}: grand_total = Rs.${gt} ${parseFloat(gt) === 17301 ? 'OK' : 'WARN'}`);
  }
} else {
  console.log('  FAIL:', JSON.stringify(soResult).slice(0, 300));
  process.exit(1);
}
await new Promise(r => setTimeout(r, 500));

// Step 2: Get details of fractional invoice ACC-SINV-2026-07235
console.log('\n=== Step 2: Fetch SINV-07235 details ===');
const fetchCode = `
si = frappe.get_doc('Sales Invoice', 'ACC-SINV-2026-07235')
item = si.items[0]
frappe.response['message'] = {
    'name': si.name, 'grand_total': si.grand_total,
    'customer': si.customer, 'company': si.company,
    'student': si.student, 'posting_date': str(si.posting_date),
    'due_date': str(si.due_date),
    'custom_academic_year': si.custom_academic_year,
    'item_code': item.item_code, 'item_name': item.item_name,
    'sales_order': item.sales_order, 'so_detail': item.so_detail
}
`;
const fetchResult = await runScript('fetch_hanan_inv', fetchCode);
const d = fetchResult.message;
if (!d?.name) { console.log('FAIL:', JSON.stringify(fetchResult).slice(0, 300)); process.exit(1); }
console.log(`  ${d.name}: Rs.${d.grand_total} | due=${d.due_date} | so=${d.sales_order}`);
await new Promise(r => setTimeout(r, 500));

// Step 3: Cancel SINV-07235
console.log('\n=== Step 3: Cancel ACC-SINV-2026-07235 ===');
const cancelCode = `
si = frappe.get_doc('Sales Invoice', 'ACC-SINV-2026-07235')
if si.docstatus == 1:
    si.cancel()
    frappe.db.commit()
frappe.response['message'] = {'docstatus': si.docstatus}
`;
const cancelResult = await runScript('cancel_hanan_inv', cancelCode);
console.log(`  Result: docstatus=${cancelResult.message?.docstatus} (2=cancelled)`);
await new Promise(r => setTimeout(r, 500));

// Step 4: Recreate with Rs.501
console.log('\n=== Step 4: Recreate HANAN last invoice Rs.501 ===');
const createCode = `
new_inv = frappe.get_doc({
    'doctype': 'Sales Invoice',
    'customer': '${d.customer}',
    'company': '${d.company}',
    'student': '${d.student}',
    'posting_date': '${d.posting_date}',
    'due_date': '${d.due_date}',
    'custom_academic_year': '${d.custom_academic_year}',
    'disable_rounded_total': 1,
    'items': [{
        'item_code': '${d.item_code}',
        'item_name': '${d.item_name}',
        'qty': 1,
        'rate': 501,
        'sales_order': '${d.sales_order}',
        'so_detail': '${d.so_detail}',
    }]
})
new_inv.insert(ignore_permissions=True)
new_inv.submit()
frappe.db.commit()
frappe.response['message'] = {
    'name': new_inv.name, 'grand_total': new_inv.grand_total,
    'outstanding': new_inv.outstanding_amount, 'rounding': new_inv.rounding_adjustment
}
`;
const createResult = await runScript('create_hanan_inv', createCode);
if (createResult.message?.name) {
  const m = createResult.message;
  console.log(`  Created ${m.name} | Rs.${m.grand_total} | outstanding=Rs.${m.outstanding} | rounding=Rs.${m.rounding}`);
} else {
  console.log(`  FAIL: ${JSON.stringify(createResult).slice(0, 400)}`);
}

console.log('\nHANAN fix complete.');
