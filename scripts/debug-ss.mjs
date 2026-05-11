/**
 * Debug server script creation and execution
 */
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const h = { Authorization: AUTH, 'Content-Type': 'application/json' };

const name = 'fix_so_shyam_test';
const code = `
frappe.db.set_value('Sales Order', 'SAL-ORD-2026-00953', 'grand_total', 24501, update_modified=False)
frappe.db.commit()
frappe.response['message'] = {'ok': True, 'gt': frappe.db.get_value('Sales Order', 'SAL-ORD-2026-00953', 'grand_total')}
`;

// Delete if exists
const del = await fetch(BASE + '/api/resource/Server Script/' + encodeURIComponent(name), { method: 'DELETE', headers: h });
console.log('DELETE:', del.status);

// Create
const create = await fetch(BASE + '/api/resource/Server Script', {
  method: 'POST', headers: h,
  body: JSON.stringify({ name, script_type: 'API', api_method: name, allow_guest: 0, disabled: 0, script: code }),
});
const cd = await create.json();
console.log('CREATE status:', create.status);
console.log('CREATE response:', JSON.stringify(cd).slice(0, 500));

const ssName = cd.data?.name;
if (!ssName) {
  console.log('FAILED - no script name returned');
  process.exit(1);
}

// Call
const call = await fetch(BASE + '/api/method/' + ssName, { method: 'POST', headers: h, body: JSON.stringify({}) });
const callD = await call.json();
console.log('CALL status:', call.status);
console.log('CALL response:', JSON.stringify(callD).slice(0, 500));

// Cleanup
await fetch(BASE + '/api/resource/Server Script/' + encodeURIComponent(ssName), { method: 'DELETE', headers: h });
