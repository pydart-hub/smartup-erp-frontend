// Fix 9th CBSE Kadavanthara: delete Basic+Intermediate, migrate 3 students to Advanced
const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json', 'Accept': 'application/json' };
const base = 'https://smartup.m.frappe.cloud/api';
const delay = ms => new Promise(r => setTimeout(r, ms));

async function query(q) {
  const r = await fetch(base + '/method/frappe.client.get_list', { method: 'POST', headers, body: JSON.stringify(q) });
  return (await r.json()).message || [];
}
async function getDoc(doctype, name) {
  const r = await fetch(base + '/resource/' + encodeURIComponent(doctype) + '/' + encodeURIComponent(name), { method: 'GET', headers });
  return (await r.json()).data;
}

const TARGETS = [
  'SU KDV-9th CBSE-Basic-1', 'SU KDV-9th CBSE-Basic-4', 'SU KDV-9th CBSE-Basic-6', 'SU KDV-9th CBSE-Basic-8',
  'SU KDV-9th CBSE-Intermediate-1', 'SU KDV-9th CBSE-Intermediate-4', 'SU KDV-9th CBSE-Intermediate-6', 'SU KDV-9th CBSE-Intermediate-8',
];

// Script: migrate 3 PEs + update custom_plan, then delete schedules+structures
const script = `
# 1. Migrate the 3 students from Basic-4 → Advanced-4
pe_names = ['PEN--Kadavanthara 26-27-003', 'PEN--Kadavanthara 26-27-007', 'PEN--Kadavanthara 26-27-011']
for pe_name in pe_names:
    frappe.db.set_value('Program Enrollment', pe_name, {
        'custom_fee_structure': 'SU KDV-9th CBSE-Advanced-4',
        'custom_plan': 'Advanced'
    }, update_modified=False)

frappe.db.commit()
frappe.response['msg'] = 'Migrated 3 PEs to Advanced-4'
`;

(async () => {
  // STEP 1: Migrate 3 students via server script
  console.log('=== STEP 1: Migrate 3 students to Advanced ===');
  let r = await fetch(base + '/resource/Server%20Script', {
    method: 'POST', headers,
    body: JSON.stringify({
      script_type: 'API', name: 'kdv-9th-migrate',
      api_method: 'kdv_9th_migrate', script, allow_guest: 0, enable_scheduler: 0
    })
  });
  let d = await r.json();
  console.log('Create script:', r.status, d?.data?.name || d?.exception?.slice(0, 80));
  await delay(500);

  r = await fetch(base + '/method/kdv_9th_migrate', { method: 'POST', headers });
  d = await r.json();
  console.log('Run:', r.status, d?.msg || d?.exception?.slice(0, 100));
  await delay(300);

  r = await fetch(base + '/resource/Server%20Script/kdv-9th-migrate', { method: 'DELETE', headers });
  console.log('Delete script:', r.status);
  await delay(500);

  // STEP 2: Verify migration
  console.log('\n=== STEP 2: Verify migration ===');
  const pes = await query({
    doctype: 'Program Enrollment', fields: ['name', 'student_name', 'custom_plan', 'custom_fee_structure'],
    filters: [['custom_fee_structure', 'in', TARGETS], ['docstatus', '=', 1]], limit: 50
  });
  if (pes.length > 0) {
    console.log('ERROR: Still have PEs linked to targets:', pes.map(p => p.name).join(', '));
    return;
  }
  console.log('No PEs still linked to targets ✅');

  // STEP 3: Cancel + delete fee schedules
  console.log('\n=== STEP 3: Cancel+delete Fee Schedules (8) ===');
  for (const name of TARGETS) {
    const cancel = await fetch(base + '/resource/Fee%20Schedule/' + encodeURIComponent(name), {
      method: 'PUT', headers, body: JSON.stringify({ docstatus: 2 })
    });
    console.log('CANCEL sched', name.padEnd(38), ':', cancel.status);
    await delay(300);
    const del = await fetch(base + '/resource/Fee%20Schedule/' + encodeURIComponent(name), { method: 'DELETE', headers });
    console.log('DELETE sched', name.padEnd(38), ':', del.status);
    await delay(300);
  }

  // STEP 4: Cancel + delete fee structures
  console.log('\n=== STEP 4: Cancel+delete Fee Structures (8) ===');
  for (const name of TARGETS) {
    const cancel = await fetch(base + '/resource/Fee%20Structure/' + encodeURIComponent(name), {
      method: 'PUT', headers, body: JSON.stringify({ docstatus: 2 })
    });
    const cj = await cancel.json();
    const cancelStatus = cj?.data?.docstatus ?? (cj?.exception ? cj.exception.slice(0, 60) : '');
    console.log('CANCEL struct', name.padEnd(38), ':', cancel.status, cancelStatus);
    await delay(300);
    const del = await fetch(base + '/resource/Fee%20Structure/' + encodeURIComponent(name), { method: 'DELETE', headers });
    console.log('DELETE struct', name.padEnd(38), ':', del.status);
    await delay(300);
  }

  // STEP 5: Verify final state
  console.log('\n=== STEP 5: Final Verification ===');
  const remaining = await query({
    doctype: 'Fee Structure', fields: ['name', 'custom_plan'],
    filters: [['company', '=', 'Smart Up Kadavanthara'], ['name', 'like', 'SU KDV-9th%'], ['docstatus', '=', 1]], limit: 20
  });
  console.log('9th CBSE submitted structures:', remaining.length);
  remaining.forEach(f => console.log(' ', f.name, '|', f.custom_plan));
  const badPlans = remaining.filter(f => f.custom_plan !== 'Advanced');
  console.log(badPlans.length === 0 ? '\n9th CBSE: Only Advanced ✅' : '\n❌ Still has non-Advanced: ' + badPlans.map(f => f.name).join(', '));
})();
