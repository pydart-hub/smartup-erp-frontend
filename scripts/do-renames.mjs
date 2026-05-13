const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json', 'Accept': 'application/json' };
const base = 'https://smartup.m.frappe.cloud/api';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const renames = [
  ['SU EDPLY-9th CBSE-Basic-4', 'SU EDPLY-9th CBSE-Advanced-4'],
  ['SU EDPLY-9th CBSE-Basic-6', 'SU EDPLY-9th CBSE-Advanced-6'],
  ['SU EDPLY-9th CBSE-Basic-8', 'SU EDPLY-9th CBSE-Advanced-8'],
  ['SU EDPLY-9th State-Basic-1', 'SU EDPLY-9th State-Advanced-1'],
  ['SU EDPLY-9th State-Basic-4', 'SU EDPLY-9th State-Advanced-4'],
  ['SU EDPLY-9th State-Basic-6', 'SU EDPLY-9th State-Advanced-6'],
  ['SU EDPLY-9th State-Basic-8', 'SU EDPLY-9th State-Advanced-8'],
  ['SU EDPLY-10th CBSE-Basic-1', 'SU EDPLY-10th CBSE-Advanced-1'],
  ['SU EDPLY-10th CBSE-Basic-4', 'SU EDPLY-10th CBSE-Advanced-4'],
  ['SU EDPLY-10th CBSE-Basic-6', 'SU EDPLY-10th CBSE-Advanced-6'],
  ['SU EDPLY-10th CBSE-Basic-8', 'SU EDPLY-10th CBSE-Advanced-8'],
  ['SU EDPLY-10th State-Basic-1', 'SU EDPLY-10th State-Advanced-1'],
  ['SU EDPLY-10th State-Basic-4', 'SU EDPLY-10th State-Advanced-4'],
  ['SU EDPLY-10th State-Basic-6', 'SU EDPLY-10th State-Advanced-6'],
  ['SU EDPLY-10th State-Basic-8', 'SU EDPLY-10th State-Advanced-8'],
  ['SU EDPLY-11th Science CBSE-Basic-1', 'SU EDPLY-11th Science CBSE-Advanced-1'],
  ['SU EDPLY-11th Science CBSE-Basic-4', 'SU EDPLY-11th Science CBSE-Advanced-4'],
  ['SU EDPLY-11th Science CBSE-Basic-6', 'SU EDPLY-11th Science CBSE-Advanced-6'],
  ['SU EDPLY-11th Science CBSE-Basic-8', 'SU EDPLY-11th Science CBSE-Advanced-8'],
  ['SU EDPLY-11th Science State-Basic-1', 'SU EDPLY-11th Science State-Advanced-1'],
  ['SU EDPLY-11th Science State-Basic-4', 'SU EDPLY-11th Science State-Advanced-4'],
  ['SU EDPLY-11th Science State-Basic-6', 'SU EDPLY-11th Science State-Advanced-6'],
  ['SU EDPLY-11th Science State-Basic-8', 'SU EDPLY-11th Science State-Advanced-8'],
  ['SU EDPLY-11th State-Basic-1', 'SU EDPLY-11th State-Advanced-1'],
  ['SU EDPLY-11th State-Basic-4', 'SU EDPLY-11th State-Advanced-4'],
  ['SU EDPLY-11th State-Basic-6', 'SU EDPLY-11th State-Advanced-6'],
  ['SU EDPLY-11th State-Basic-8', 'SU EDPLY-11th State-Advanced-8'],
  ['SU EDPLY-12th Science CBSE-Basic-1', 'SU EDPLY-12th Science CBSE-Advanced-1'],
  ['SU EDPLY-12th Science CBSE-Basic-4', 'SU EDPLY-12th Science CBSE-Advanced-4'],
  ['SU EDPLY-12th Science CBSE-Basic-6', 'SU EDPLY-12th Science CBSE-Advanced-6'],
  ['SU EDPLY-12th Science CBSE-Basic-8', 'SU EDPLY-12th Science CBSE-Advanced-8'],
  ['SU EDPLY-12th Science State-Basic-1', 'SU EDPLY-12th Science State-Advanced-1'],
  ['SU EDPLY-12th Science State-Basic-4', 'SU EDPLY-12th Science State-Advanced-4'],
  ['SU EDPLY-12th Science State-Basic-6', 'SU EDPLY-12th Science State-Advanced-6'],
  ['SU EDPLY-12th Science State-Basic-8', 'SU EDPLY-12th Science State-Advanced-8'],
];

async function renameDoc(oldName, newName, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(base + '/method/frappe.client.rename_doc', {
        method: 'POST', headers,
        body: JSON.stringify({ doctype: 'Fee Structure', old_name: oldName, new_name: newName })
      });
      const j = await r.json();
      if (j?.message === newName) return { ok: true };
      // If new name already exists (was already renamed), treat as success
      if (j?.exception?.includes('already exists') || j?.exception?.includes('Fee Schedule not allowed')) {
        return { ok: false, skip: true, err: j?.exception?.slice(0, 80) };
      }
      return { ok: false, err: j?.exception?.slice(0, 80) || 'result: ' + j?.message };
    } catch (e) {
      if (i < retries) { await sleep(1000); continue; }
      return { ok: false, err: 'CONN: ' + e.message.slice(0, 50) };
    }
  }
}

(async () => {
  let success = 0, skipped = 0, errors = [];
  for (const [old, newName] of renames) {
    await sleep(600);
    const res = await renameDoc(old, newName);
    if (res.ok) {
      success++;
      process.stdout.write('.');
    } else if (res.skip) {
      skipped++;
      process.stdout.write('s');
    } else {
      errors.push(old + ': ' + res.err);
      process.stdout.write('x');
    }
  }
  console.log('\nRenamed:', success, '| Skipped:', skipped, '| Errors:', errors.length, '/ 35');
  errors.forEach(e => console.log('  ERROR:', e));
})();
