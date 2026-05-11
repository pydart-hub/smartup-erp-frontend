/**
 * Verify the fractional SO patch logic works correctly.
 * Simulates: create a fractional SO, run the patch, confirm whole-rupee total.
 * Uses the same Server Script approach as convert-to-regular route.
 */
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const h = { Authorization: AUTH, 'Content-Type': 'application/json' };

async function runScript(name, code) {
  await fetch(BASE + '/api/resource/Server Script/' + encodeURIComponent(name), { method: 'DELETE', headers: h }).catch(() => {});
  await new Promise(r => setTimeout(r, 200));
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

console.log('=== VERIFY: Fractional SO Patch Logic ===\n');

// Test Case 1: 6-instalment (21461/6 = 3576.83 → 21460.98)
// Test Case 2: 8-instalment (17301/8 = 2162.625 → 2162.63 × 8 = 17301.04 ... let's check)
// Test Case 3: 4-instalment (16401/4 = 4100.25 → oops, but fee config has q1/q2/q3/q4 directly)

const CASES = [
  { label: '6-inst: 21461/6', total: 21461, N: 6, expected: 21461 },
  { label: '8-inst: 17301/8', total: 17301, N: 8, expected: 17301 },
  { label: '6-inst: 24501/6', total: 24501, N: 6, expected: 24501 },
  { label: '1-inst: 15801/1', total: 15801, N: 1, expected: 15801 }, // Should be fine
];

for (const tc of CASES) {
  const soRate = Math.round((tc.total / tc.N) * 100) / 100;
  const frappeStored = Math.round(soRate * tc.N * 100) / 100;
  const needsPatch = Math.abs(frappeStored - tc.total) > 0.005;
  
  console.log(`[${tc.label}]`);
  console.log(`  rate = ${tc.total}/${tc.N} = ${soRate} (2dp rounded)`);
  console.log(`  Frappe stored grand_total = ${soRate} × ${tc.N} = ${frappeStored}`);
  console.log(`  scheduleSum = ${tc.total}, diff = ${(frappeStored - tc.total).toFixed(4)}`);
  console.log(`  Needs patch: ${needsPatch ? 'YES ❌' : 'NO ✅'}`);
  console.log();
}

// Now test the actual Server Script patch mechanism end-to-end on a real draft SO
console.log('=== LIVE TEST: Create fractional SO, patch, verify, cancel ===\n');

// First find a valid customer, company, and item to use for test SO
const findCode = `
# Get a real submitted SO to borrow customer/company/item details
so = frappe.db.sql("""
    SELECT so.customer, so.company, soi.item_code
    FROM \`tabSales Order\` so
    JOIN \`tabSales Order Item\` soi ON soi.parent = so.name
    WHERE so.docstatus = 1 AND so.company LIKE 'Smart Up%'
    LIMIT 1
""", as_dict=True)
frappe.response['message'] = so[0] if so else None
`;
const findResult = await runScript('find_test_data', findCode);
if (!findResult.message) { console.log('No data found for test'); process.exit(1); }
const { customer, company, item_code } = findResult.message;
console.log(`Using: customer=${customer}, company=${company}, item=${item_code}`);

// Create a fractional SO (scheduleSum=21461, qty=6, rate=3576.83)
const createCode = `
soRate = round(21461 / 6, 2)  # = 3576.83
payload = frappe.get_doc({
    'doctype': 'Sales Order',
    'customer': '${customer}',
    'company': '${company}',
    'transaction_date': frappe.utils.today(),
    'delivery_date': frappe.utils.today(),
    'order_type': 'Sales',
    'items': [{'item_code': '${item_code}', 'qty': 6, 'rate': soRate}]
})
payload.insert(ignore_permissions=True)
frappe.db.commit()
frappe.response['message'] = {
    'name': payload.name,
    'grand_total': payload.grand_total,
    'item_amount': payload.items[0].amount,
    'item_name': payload.items[0].name
}
`;
const createResult = await runScript('create_test_fractional_so', createCode);
if (!createResult.message?.name) { console.log('Failed to create test SO:', JSON.stringify(createResult).slice(0, 300)); process.exit(1); }
const testSO = createResult.message;
console.log(`Created test SO: ${testSO.name} | grand_total=₹${testSO.grand_total} (expected ~21460.98)`);

// Run the patch (same logic as in convert-to-regular route)
const roundedTotal = Math.round(21461);
const needsPatch = Math.abs(testSO.grand_total - roundedTotal) > 0.005;
if (needsPatch) {
  console.log(`Patching ₹${testSO.grand_total} → ₹${roundedTotal}...`);
  const patchCode = `
so = "${testSO.name}"
v = ${roundedTotal}
item = frappe.db.get_value("Sales Order Item", {"parent": so}, "name")
if item:
    frappe.db.set_value("Sales Order Item", item, "amount", v, update_modified=False)
    frappe.db.set_value("Sales Order Item", item, "base_amount", v, update_modified=False)
for f in ["grand_total","net_total","total","base_grand_total","base_net_total","base_total"]:
    frappe.db.set_value("Sales Order", so, f, v, update_modified=False)
frappe.db.commit()
frappe.response["message"] = {"patched": True, "grand_total": frappe.db.get_value("Sales Order", so, "grand_total")}
`;
  const patchResult = await runScript('patch_test_so_' + testSO.name.replace(/[^a-zA-Z0-9]/g, '_'), patchCode);
  if (patchResult.message?.patched) {
    const newGT = patchResult.message.grand_total;
    const ok = parseFloat(newGT) === 21461;
    console.log(`  Patch result: grand_total = ₹${newGT} ${ok ? '✅ CORRECT' : '❌ WRONG'}`);
  } else {
    console.log('  Patch failed:', JSON.stringify(patchResult).slice(0, 200));
  }
} else {
  console.log('No patch needed (already whole rupee)');
}

// Clean up: delete the test SO
const cleanupCode = `
so = frappe.get_doc('Sales Order', '${testSO.name}')
frappe.delete_doc('Sales Order', '${testSO.name}', force=True)
frappe.db.commit()
frappe.response['message'] = {'deleted': True}
`;
const cleanResult = await runScript('cleanup_test_so_' + testSO.name.replace(/[^a-zA-Z0-9]/g, '_'), cleanupCode);
console.log(`\nCleanup: ${cleanResult.message?.deleted ? 'Test SO deleted ✅' : 'Cleanup note: ' + JSON.stringify(cleanResult.message)}`);

console.log('\n=== VERIFICATION COMPLETE ===');
