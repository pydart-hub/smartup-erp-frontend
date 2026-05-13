const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json', 'Accept': 'application/json' };
const base = 'https://smartup.m.frappe.cloud/api';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function createAndRunScript(script) {
  const create = await fetch(base + '/resource/Server Script', {
    method: 'POST', headers,
    body: JSON.stringify({
      name: 'fix-edply-adv-to-basic',
      script_type: 'Script API',
      api_method: 'fix_edply_adv_to_basic',
      script,
      allow_guest: 0,
      disabled: 0
    })
  });
  const cj = await create.json();
  const scriptName = cj?.data?.name;
  console.log('Script created:', scriptName, '| err:', cj?.exception?.slice(0, 80));
  if (!scriptName) return;

  await sleep(500);

  const run = await fetch(base + '/api/method/fix_edply_adv_to_basic', { method: 'POST', headers, body: JSON.stringify({}) });
  const rj = await run.json();
  console.log('Run result:', JSON.stringify(rj).slice(0, 300));

  await sleep(300);
  await fetch(base + '/resource/Server Script/' + encodeURIComponent(scriptName), { method: 'DELETE', headers });
  console.log('Script deleted');
}

const script = `import frappe
# Mohammed Dua zain: 10th CBSE Advanced-4 -> Basic-4
frappe.db.set_value('Program Enrollment', 'PEN--Edappally 26-27-002', {
    'custom_fee_structure': 'SU EDPLY-10th CBSE-Basic-4',
    'custom_plan': 'Basic'
}, update_modified=False)

# AYSHA ZEHRA: 9th State Advanced-4 -> Basic-4
frappe.db.set_value('Program Enrollment', 'PEN-9th-Edappally 26-27-001', {
    'custom_fee_structure': 'SU EDPLY-9th State-Basic-4',
    'custom_plan': 'Basic'
}, update_modified=False)

frappe.db.commit()
frappe.response['message'] = 'Updated 2 program enrollments to Basic'
`;

(async () => {
  await createAndRunScript(script);

  console.log('\n=== Verifying enrollment updates ===');
  for (const pen of ['PEN--Edappally 26-27-002', 'PEN-9th-Edappally 26-27-001']) {
    const r = await fetch(base + '/resource/Program Enrollment/' + encodeURIComponent(pen), { headers });
    const d = (await r.json()).data;
    console.log(pen, '| plan:', d?.custom_plan, '| fee_structure:', d?.custom_fee_structure);
  }
})();
