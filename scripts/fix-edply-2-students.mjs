const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json', 'Accept': 'application/json' };
const base = 'https://smartup.m.frappe.cloud/api';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const updates = [
  { pen: 'PEN--Edappally 26-27-002', fs: 'SU EDPLY-10th CBSE-Basic-4', plan: 'Basic', student: 'Mohammed Dua zain' },
  { pen: 'PEN-9th-Edappally 26-27-001', fs: 'SU EDPLY-9th State-Basic-4', plan: 'Basic', student: 'AYSHA ZEHRA' }
];

async function tryDirectPut(pen, fs, plan) {
  const r = await fetch(base + '/resource/Program Enrollment/' + encodeURIComponent(pen), {
    method: 'PUT', headers,
    body: JSON.stringify({ custom_fee_structure: fs, custom_plan: plan })
  });
  const j = await r.json();
  return { status: r.status, ok: r.status === 200, err: j?.exception?.slice(0, 120) };
}

async function getDoc(pen) {
  const r = await fetch(base + '/resource/Program Enrollment/' + encodeURIComponent(pen), { headers });
  return (await r.json()).data;
}

async function amendDoc(pen, fs, plan) {
  // GET the cancelled doc
  const doc = await getDoc(pen);
  if (!doc) return { ok: false, err: 'doc not found' };

  // Create amended copy - POST as new doc
  const payload = {
    ...doc,
    name: undefined,       // let Frappe assign new name
    docstatus: 0,          // draft
    amended_from: pen,     // link to cancelled parent
    custom_fee_structure: fs,
    custom_plan: plan,
    creation: undefined,
    modified: undefined,
    owner: undefined,
    modified_by: undefined
  };

  const r = await fetch(base + '/resource/Program Enrollment', {
    method: 'POST', headers, body: JSON.stringify(payload)
  });
  const j = await r.json();
  return { ok: !!j?.data?.name, name: j?.data?.name, err: j?.exception?.slice(0, 120) };
}

async function submitDoc(name) {
  const r = await fetch(base + '/resource/Program Enrollment/' + encodeURIComponent(name), {
    method: 'PUT', headers, body: JSON.stringify({ docstatus: 1 })
  });
  const j = await r.json();
  return { ok: j?.data?.docstatus === 1, err: j?.exception?.slice(0, 120) };
}

(async () => {
  for (const { pen, fs, plan, student } of updates) {
    console.log('\nAmending', student, '(' + pen + ') ...');

    const a = await amendDoc(pen, fs, plan);
    console.log('  Amend (create draft):', a.ok ? 'OK -> ' + a.name : 'FAILED - ' + a.err);
    if (!a.ok) continue;
    await sleep(400);

    const s = await submitDoc(a.name);
    console.log('  Submit:', s.ok ? 'OK' : 'FAILED - ' + s.err);
    await sleep(400);

    // Verify new doc
    const d = await getDoc(a.name);
    console.log('  Final: plan=' + d?.custom_plan + ' | fs=' + d?.custom_fee_structure + ' | docstatus=' + d?.docstatus);
  }
})();
