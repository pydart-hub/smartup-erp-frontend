const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json', 'Accept': 'application/json' };
const base = 'https://smartup.m.frappe.cloud/api';
const delay = ms => new Promise(r => setTimeout(r, ms));

const script = `
structures = frappe.get_all('Fee Structure',
    filters={'company': 'Smart Up Kadavanthara'},
    fields=['name','custom_plan'],
    limit=100
)

updated = []
for s in structures:
    frappe.db.set_value('Fee Structure', s['name'], 'custom_plan', 'Advanced', update_modified=False)
    updated.append(s['name'] + ' (was: ' + (s['custom_plan'] or '') + ')')

# Also update Program Enrollments
pes = frappe.get_all('Program Enrollment',
    filters={'custom_plan': 'Basic'},
    fields=['name','student_name'],
    limit=100
)
pe_updated = []
for pe in pes:
    frappe.db.set_value('Program Enrollment', pe['name'], 'custom_plan', 'Advanced', update_modified=False)
    pe_updated.append(pe['name'] + ' ' + pe['student_name'])

frappe.db.commit()
frappe.response['updated_fs'] = updated
frappe.response['updated_pe'] = pe_updated
frappe.response['fs_count'] = len(updated)
frappe.response['pe_count'] = len(pe_updated)
`;

(async () => {
  // Create server script
  let r = await fetch(base + '/resource/Server%20Script', {
    method: 'POST', headers,
    body: JSON.stringify({
      script_type: 'API',
      name: 'kdv-update-fee-plan',
      api_method: 'kdv_update_fee_plan',
      script: script,
      allow_guest: 0,
      enable_scheduler: 0
    })
  });
  let d = await r.json();
  console.log('Create script:', r.status, d?.data?.name || d?.exception?.slice(0, 120));
  await delay(800);

  if (r.status !== 200) {
    console.log('Script creation failed — aborting');
    return;
  }

  // Run it
  r = await fetch(base + '/method/kdv_update_fee_plan', { method: 'POST', headers });
  d = await r.json();
  console.log('\nRun script:', r.status, d?.exception?.slice(0, 120) || '');
  if (d?.updated_fs) {
    console.log('\nFee Structures updated (' + d.fs_count + '):');
    d.updated_fs.forEach(u => console.log(' ', u));
  }
  if (d?.updated_pe) {
    console.log('\nProgram Enrollments updated (' + d.pe_count + '):');
    d.updated_pe.forEach(u => console.log(' ', u));
  }
  await delay(500);

  // Delete script
  r = await fetch(base + '/resource/Server%20Script/kdv-update-fee-plan', { method: 'DELETE', headers });
  console.log('\nDelete script:', r.status);
})();
