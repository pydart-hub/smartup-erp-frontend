const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json', 'Accept': 'application/json' };
const base = 'https://smartup.m.frappe.cloud/api';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Updated script: sets custom_plan on FS AND updates all Edappally PEs to Advanced
const fixedScript = `if 'Advanced' in doc.name:
    frappe.db.set_value('Fee Structure', doc.name, 'custom_plan', 'Advanced', update_modified=False)
elif 'Basic' in doc.name:
    frappe.db.set_value('Fee Structure', doc.name, 'custom_plan', 'Basic', update_modified=False)

# Also fix all Edappally PE custom_plan values
pe_names = [
    'PEN--Edappally 26-27-002-1',
    'PEN--Edappally 26-27-009',
    'PEN-10th-Edappally 26-27-007',
    'PEN-10th-Edappally 26-27-008',
    'PEN-12sc state-Edappally 26-27-003',
    'PEN-12sc state-Edappally 26-27-004',
    'PEN-12sc state-Edappally 26-27-005',
    'PEN-12sc state-Edappally 26-27-006',
    'PEN-9th-Edappally 26-27-001-1',
]
for pe in pe_names:
    frappe.db.set_value('Program Enrollment', pe, 'custom_plan', 'Advanced', update_modified=False)
`;

(async () => {
  // Update the server script
  const r1 = await fetch(base + '/resource/Server Script/edply-set-plan-after-rename', {
    method: 'PUT', headers,
    body: JSON.stringify({ script: fixedScript })
  });
  const j1 = await r1.json();
  console.log('Script updated:', j1?.data?.name || j1?.exception?.slice(0, 80));

  await sleep(500);

  // Trigger it with a dummy rename: rename 9th CBSE-Advanced-2 to temp, then back
  const target = 'SU EDPLY-9th CBSE-Advanced-2';
  const temp = 'SU EDPLY-9th CBSE-Advanced-2-temp';

  const r2 = await fetch(base + '/method/frappe.client.rename_doc', {
    method: 'POST', headers,
    body: JSON.stringify({ doctype: 'Fee Structure', old_name: target, new_name: temp })
  });
  console.log('Renamed to temp:', (await r2.json())?.message || 'error');
  await sleep(700);

  const r3 = await fetch(base + '/method/frappe.client.rename_doc', {
    method: 'POST', headers,
    body: JSON.stringify({ doctype: 'Fee Structure', old_name: temp, new_name: target })
  });
  console.log('Renamed back:', (await r3.json())?.message || 'error');
  await sleep(500);

  // Verify PEs
  const q = (f) => fetch(base + '/method/frappe.client.get_list', { method: 'POST', headers, body: JSON.stringify(f) }).then(r => r.json()).then(j => j.message || []);
  const pes = await q({
    doctype: 'Program Enrollment',
    fields: ['name', 'student_name', 'custom_plan'],
    filters: [['custom_fee_structure', 'like', 'SU EDPLY%'], ['docstatus', '=', 1]],
    limit: 20
  });
  console.log('\nPE custom_plan after update:');
  pes.forEach(p => console.log(' ', p.name, '|', p.student_name, '| plan:', p.custom_plan));
})();
