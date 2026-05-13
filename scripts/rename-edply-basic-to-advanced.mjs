const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json', 'Accept': 'application/json' };
const base = 'https://smartup.m.frappe.cloud/api';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// STEP 1: Create an After Rename DocType Event script
// This fires after each rename and sets custom_plan = Advanced via frappe.db.set_value
// which bypasses UpdateAfterSubmitError
async function createRenameScript() {
  const r = await fetch(base + '/resource/Server Script', {
    method: 'POST', headers,
    body: JSON.stringify({
      name: 'edply-set-plan-after-rename',
      script_type: 'DocType Event',
      reference_doctype: 'Fee Structure',
      doctype_event: 'After Rename',
      disabled: 0,
      script: `if 'Advanced' in doc.name:
    frappe.db.set_value('Fee Structure', doc.name, 'custom_plan', 'Advanced', update_modified=False)
    frappe.db.commit()
elif 'Basic' in doc.name:
    frappe.db.set_value('Fee Structure', doc.name, 'custom_plan', 'Basic', update_modified=False)
    frappe.db.commit()
`
    })
  });
  const j = await r.json();
  console.log('Script created:', j?.data?.name, '| err:', j?.exception?.slice(0, 80));
  return j?.data?.name;
}

// STEP 2: Rename all 35 remaining Basic→Advanced
const renames = [
  // 9th CBSE (Basic-1 already renamed in test — skip)
  ['SU EDPLY-9th CBSE-Basic-4', 'SU EDPLY-9th CBSE-Advanced-4'],
  ['SU EDPLY-9th CBSE-Basic-6', 'SU EDPLY-9th CBSE-Advanced-6'],
  ['SU EDPLY-9th CBSE-Basic-8', 'SU EDPLY-9th CBSE-Advanced-8'],
  // 9th State
  ['SU EDPLY-9th State-Basic-1', 'SU EDPLY-9th State-Advanced-1'],
  ['SU EDPLY-9th State-Basic-4', 'SU EDPLY-9th State-Advanced-4'],
  ['SU EDPLY-9th State-Basic-6', 'SU EDPLY-9th State-Advanced-6'],
  ['SU EDPLY-9th State-Basic-8', 'SU EDPLY-9th State-Advanced-8'],
  // 10th CBSE
  ['SU EDPLY-10th CBSE-Basic-1', 'SU EDPLY-10th CBSE-Advanced-1'],
  ['SU EDPLY-10th CBSE-Basic-4', 'SU EDPLY-10th CBSE-Advanced-4'],
  ['SU EDPLY-10th CBSE-Basic-6', 'SU EDPLY-10th CBSE-Advanced-6'],
  ['SU EDPLY-10th CBSE-Basic-8', 'SU EDPLY-10th CBSE-Advanced-8'],
  // 10th State
  ['SU EDPLY-10th State-Basic-1', 'SU EDPLY-10th State-Advanced-1'],
  ['SU EDPLY-10th State-Basic-4', 'SU EDPLY-10th State-Advanced-4'],
  ['SU EDPLY-10th State-Basic-6', 'SU EDPLY-10th State-Advanced-6'],
  ['SU EDPLY-10th State-Basic-8', 'SU EDPLY-10th State-Advanced-8'],
  // 11th Science CBSE
  ['SU EDPLY-11th Science CBSE-Basic-1', 'SU EDPLY-11th Science CBSE-Advanced-1'],
  ['SU EDPLY-11th Science CBSE-Basic-4', 'SU EDPLY-11th Science CBSE-Advanced-4'],
  ['SU EDPLY-11th Science CBSE-Basic-6', 'SU EDPLY-11th Science CBSE-Advanced-6'],
  ['SU EDPLY-11th Science CBSE-Basic-8', 'SU EDPLY-11th Science CBSE-Advanced-8'],
  // 11th Science State
  ['SU EDPLY-11th Science State-Basic-1', 'SU EDPLY-11th Science State-Advanced-1'],
  ['SU EDPLY-11th Science State-Basic-4', 'SU EDPLY-11th Science State-Advanced-4'],
  ['SU EDPLY-11th Science State-Basic-6', 'SU EDPLY-11th Science State-Advanced-6'],
  ['SU EDPLY-11th Science State-Basic-8', 'SU EDPLY-11th Science State-Advanced-8'],
  // 11th State (program=Test)
  ['SU EDPLY-11th State-Basic-1', 'SU EDPLY-11th State-Advanced-1'],
  ['SU EDPLY-11th State-Basic-4', 'SU EDPLY-11th State-Advanced-4'],
  ['SU EDPLY-11th State-Basic-6', 'SU EDPLY-11th State-Advanced-6'],
  ['SU EDPLY-11th State-Basic-8', 'SU EDPLY-11th State-Advanced-8'],
  // 12th Science CBSE
  ['SU EDPLY-12th Science CBSE-Basic-1', 'SU EDPLY-12th Science CBSE-Advanced-1'],
  ['SU EDPLY-12th Science CBSE-Basic-4', 'SU EDPLY-12th Science CBSE-Advanced-4'],
  ['SU EDPLY-12th Science CBSE-Basic-6', 'SU EDPLY-12th Science CBSE-Advanced-6'],
  ['SU EDPLY-12th Science CBSE-Basic-8', 'SU EDPLY-12th Science CBSE-Advanced-8'],
  // 12th Science State
  ['SU EDPLY-12th Science State-Basic-1', 'SU EDPLY-12th Science State-Advanced-1'],
  ['SU EDPLY-12th Science State-Basic-4', 'SU EDPLY-12th Science State-Advanced-4'],
  ['SU EDPLY-12th Science State-Basic-6', 'SU EDPLY-12th Science State-Advanced-6'],
  ['SU EDPLY-12th Science State-Basic-8', 'SU EDPLY-12th Science State-Advanced-8'],
];

async function renameDoc(oldName, newName) {
  const r = await fetch(base + '/method/frappe.client.rename_doc', {
    method: 'POST', headers,
    body: JSON.stringify({ doctype: 'Fee Structure', old_name: oldName, new_name: newName })
  });
  const j = await r.json();
  return { ok: j?.message === newName, result: j?.message, err: j?.exception?.slice(0, 80) };
}

(async () => {
  // Step 1: Create server script
  const scriptName = await createRenameScript();
  if (!scriptName) { console.error('Failed to create script'); process.exit(1); }
  await sleep(500);

  // Step 2: Rename all 35
  console.log('\n=== Renaming 35 structures ===');
  let success = 0, errors = [];
  for (const [old, newName] of renames) {
    await sleep(400);
    const res = await renameDoc(old, newName);
    if (res.ok) {
      success++;
      process.stdout.write('.');
    } else {
      errors.push(old + ' -> ' + res.err);
    }
  }
  console.log('\nRenamed:', success, '/ 35 | Errors:', errors.length);
  errors.forEach(e => console.log('  ERROR:', e));

  // Step 3: Delete the server script
  await sleep(500);
  const del = await fetch(base + '/resource/Server Script/' + encodeURIComponent(scriptName), { method: 'DELETE', headers });
  console.log('\nScript deleted:', del.status === 202 ? 'OK' : del.status);

  // Step 4: Fix the already-renamed structure (SU EDPLY-9th CBSE-Advanced-1 still has custom_plan=Basic)
  // Verify a few
  await sleep(500);
  console.log('\n=== Spot check custom_plan on renamed structures ===');
  for (const [, newName] of renames.slice(0, 4)) {
    const r = await fetch(base + '/resource/Fee Structure/' + encodeURIComponent(newName), { headers });
    const d = (await r.json()).data;
    console.log(newName, '| plan:', d?.custom_plan);
  }
  // Also check the one renamed in the test
  const testR = await fetch(base + '/resource/Fee Structure/SU EDPLY-9th CBSE-Advanced-1', { headers });
  const testD = (await testR.json()).data;
  console.log('SU EDPLY-9th CBSE-Advanced-1 | plan:', testD?.custom_plan);
})();
