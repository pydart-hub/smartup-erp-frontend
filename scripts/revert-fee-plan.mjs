// RECOVERY SCRIPT: Revert incorrectly changed records back to original plan values
const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json', 'Accept': 'application/json' };
const base = 'https://smartup.m.frappe.cloud/api';
const delay = ms => new Promise(r => setTimeout(r, ms));

// Fee structures that were WRONGLY changed and need reverting
const REVERT_FS = {
  // 9th CBSE Basic → back to Basic
  'SU KDV-9th CBSE-Basic-1': 'Basic',
  'SU KDV-9th CBSE-Basic-4': 'Basic',
  'SU KDV-9th CBSE-Basic-6': 'Basic',
  'SU KDV-9th CBSE-Basic-8': 'Basic',
  // 9th CBSE Intermediate → back to Intermediate
  'SU KDV-9th CBSE-Intermediate-1': 'Intermediate',
  'SU KDV-9th CBSE-Intermediate-4': 'Intermediate',
  'SU KDV-9th CBSE-Intermediate-6': 'Intermediate',
  'SU KDV-9th CBSE-Intermediate-8': 'Intermediate',
  // 12th Science State Intermediate → back to Intermediate
  'SU KDV-12th Science State-Intermediate-1': 'Intermediate',
  'SU KDV-12th Science State-Intermediate-4': 'Intermediate',
  'SU KDV-12th Science State-Intermediate-6': 'Intermediate',
  'SU KDV-12th Science State-Intermediate-8': 'Intermediate',
};

// PEs that are KDV and should STAY as Advanced
const KDV_PE_NAMES = [
  'PEN--Kadavanthara 26-27-001-1',
  'PEN--Kadavanthara 26-27-002-1',
  'PEN--Kadavanthara 26-27-003',
  'PEN--Kadavanthara 26-27-005', 
  'PEN--Kadavanthara 26-27-007',
  'PEN--Kadavanthara 26-27-009',
  'PEN--Kadavanthara 26-27-011',
  'PEN--Kadavanthara 26-27-013',
  'PEN-12sc cbse-Kadavanthara 26-27-005',
  'PEN-12sc cbse-Kadavanthara 26-27-008',
  'PEN-12sc cbse-Kadavanthara 26-27-010',
  'PEN-12sc cbse-Kadavanthara 26-27-012',
];

// Server script to:
// 1. Revert wrongly changed fee structures
// 2. Revert ALL PEs except KDV ones back to Basic
const script = `
# Revert wrongly changed fee structures
fs_to_revert = ${JSON.stringify(Object.entries(REVERT_FS).map(([k, v]) => [k, v]))}
for name, plan in fs_to_revert:
    frappe.db.set_value('Fee Structure', name, 'custom_plan', plan, update_modified=False)

# Revert all non-KDV PEs back to Basic
# Strategy: set ALL PEs to Basic where name doesn't contain 'Kadavanthara'
# Do this in batches to handle more than 100
kdv_pe_names = ${JSON.stringify(KDV_PE_NAMES)}

offset = 0
batch = 200
total_reverted = 0
while True:
    pes = frappe.get_all('Program Enrollment',
        filters={'custom_plan': 'Advanced'},
        fields=['name'],
        limit=batch,
        start=offset
    )
    if not pes:
        break
    for pe in pes:
        if pe['name'] not in kdv_pe_names and 'Kadavanthara' not in pe['name']:
            frappe.db.set_value('Program Enrollment', pe['name'], 'custom_plan', 'Basic', update_modified=False)
            total_reverted += 1
    if len(pes) < batch:
        break
    offset += batch

frappe.db.commit()
frappe.response['fs_reverted'] = len(fs_to_revert)
frappe.response['pe_reverted'] = total_reverted
frappe.response['msg'] = 'Revert complete'
`;

(async () => {
  console.log('Creating recovery script...');
  let r = await fetch(base + '/resource/Server%20Script', {
    method: 'POST', headers,
    body: JSON.stringify({
      script_type: 'API',
      name: 'kdv-revert-fee-plan',
      api_method: 'kdv_revert_fee_plan',
      script: script,
      allow_guest: 0,
      enable_scheduler: 0
    })
  });
  let d = await r.json();
  console.log('Create:', r.status, d?.data?.name || d?.exception?.slice(0, 120));
  await delay(800);

  if (r.status !== 200) { console.log('FAILED'); return; }

  // Run recovery
  r = await fetch(base + '/method/kdv_revert_fee_plan', { method: 'POST', headers });
  d = await r.json();
  console.log('Run:', r.status, d?.exception?.slice(0, 120) || '');
  console.log('FS reverted:', d?.fs_reverted);
  console.log('PE reverted:', d?.pe_reverted);
  console.log('Message:', d?.msg);
  await delay(500);

  // Delete script
  r = await fetch(base + '/resource/Server%20Script/kdv-revert-fee-plan', { method: 'DELETE', headers });
  console.log('Delete script:', r.status);
})();
