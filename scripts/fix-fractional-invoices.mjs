/**
 * Fix fractional last invoices for SHYAM, YOHAN, RIHAN
 * Cancel the .96/.98 invoice and recreate with rounded whole rupee amount
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

// First: fetch details of each fractional invoice to get all fields for recreation
const INVOICES = [
  { inv: 'ACC-SINV-2026-07240', rounded: 1401, label: 'SHYAM last' },
  { inv: 'ACC-SINV-2026-07239', rounded: 461,  label: 'YOHAN last' },
  { inv: 'ACC-SINV-2026-07238', rounded: 461,  label: 'RIHAN last' },
];

console.log('=== Step 1: Fetching invoice details ===');
const detailsCode = `
invs = ${JSON.stringify(INVOICES.map(i => i.inv))}
result = []
for name in invs:
    si = frappe.get_doc('Sales Invoice', name)
    item = si.items[0] if si.items else None
    result.append({
        'name': si.name,
        'grand_total': si.grand_total,
        'customer': si.customer,
        'company': si.company,
        'student': si.student,
        'posting_date': str(si.posting_date),
        'due_date': str(si.due_date),
        'custom_academic_year': si.custom_academic_year,
        'item_code': item.item_code if item else None,
        'item_name': item.item_name if item else None,
        'sales_order': item.sales_order if item else None,
        'so_detail': item.so_detail if item else None,
    })
frappe.response['message'] = result
`;

const detailsResult = await runScript('fetch_inv_details_fix', detailsCode);
if (!detailsResult.message) {
  console.log('FAIL:', JSON.stringify(detailsResult).slice(0, 400));
  process.exit(1);
}

const invDetails = {};
for (const d of detailsResult.message) {
  invDetails[d.name] = d;
  console.log(`  ${d.name}: gt=Rs.${d.grand_total}, customer=${d.customer}, so=${d.sales_order}`);
}

console.log('\n=== Step 2: Cancel and recreate invoices ===');

for (const fix of INVOICES) {
  const d = invDetails[fix.inv];
  if (!d) { console.log(`  SKIP ${fix.inv} - no details`); continue; }
  
  console.log(`\n[${fix.label}] ${fix.inv} Rs.${d.grand_total} -> Rs.${fix.rounded}`);

  // Cancel the fractional invoice
  const cancelCode = `
si = frappe.get_doc('Sales Invoice', '${fix.inv}')
if si.docstatus == 1:
    si.cancel()
    frappe.db.commit()
    frappe.response['message'] = {'cancelled': True, 'status': si.docstatus}
else:
    frappe.response['message'] = {'cancelled': False, 'status': si.docstatus, 'msg': 'Already not submitted'}
`;

  const cancelResult = await runScript('cancel_inv_' + fix.inv.replace(/-/g, '_'), cancelCode);
  if (cancelResult.message?.cancelled) {
    console.log(`  Cancelled ${fix.inv}`);
  } else {
    console.log(`  Cancel result: ${JSON.stringify(cancelResult.message)}`);
    if (cancelResult.message?.status !== 2) {
      console.log('  Stopping - unexpected cancel result');
      continue;
    }
  }
  await new Promise(r => setTimeout(r, 500));

  // Recreate with rounded amount
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
        'rate': ${fix.rounded},
        'sales_order': '${d.sales_order}',
        'so_detail': '${d.so_detail}',
    }]
})
new_inv.insert(ignore_permissions=True)
new_inv.submit()
frappe.db.commit()
frappe.response['message'] = {
    'name': new_inv.name,
    'grand_total': new_inv.grand_total,
    'outstanding': new_inv.outstanding_amount,
    'rounding': new_inv.rounding_adjustment
}
`;

  const createResult = await runScript('create_inv_' + fix.inv.replace(/-/g, '_'), createCode);
  if (createResult.message?.name) {
    const m = createResult.message;
    console.log(`  Created ${m.name} | Rs.${m.grand_total} | outstanding=Rs.${m.outstanding} | rounding=Rs.${m.rounding}`);
  } else {
    console.log(`  Create failed: ${JSON.stringify(createResult).slice(0, 400)}`);
  }
  
  await new Promise(r => setTimeout(r, 800));
}

console.log('\nDone fixing invoices.');
