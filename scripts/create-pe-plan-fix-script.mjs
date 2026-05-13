const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json', 'Accept': 'application/json' };
const base = 'https://smartup.m.frappe.cloud/api';

// Creates a Scheduler Event script that updates custom_plan=Advanced on all 9 Edappally PEs
const script = `pe_names = [
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
for name in pe_names:
    frappe.db.set_value('Program Enrollment', name, 'custom_plan', 'Advanced', update_modified=False)
`;

(async () => {
  const r = await fetch(base + '/resource/Server Script', {
    method: 'POST', headers,
    body: JSON.stringify({
      name: 'edply-set-pe-plan-advanced',
      script_type: 'Scheduler Event',
      event_frequency: 'Daily',
      disabled: 0,
      script: script
    })
  });
  const j = await r.json();
  console.log('Created:', j?.data?.name || j?.exception?.slice(0, 120));
})();
