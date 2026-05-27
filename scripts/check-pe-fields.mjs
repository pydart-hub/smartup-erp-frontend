const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: AUTH, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

// Get the current draft PE for RUMAIS and examine it
const draft = await req('GET', '/api/resource/Program Enrollment/PEN-10th--056');
const d = draft?.data;
const exclude = ['owner','creation','modified','modified_by','idx','__onload'];
const filtered = Object.fromEntries(Object.entries(d||{}).filter(([k,v]) => !exclude.includes(k)));
console.log('Draft PE all fields:', JSON.stringify(filtered, null, 2));

// Get the full reference PE to see if it has custom_batch_name or similar field at PE level
const ref = await req('GET', '/api/resource/Program Enrollment/PEN-10th-Chullickal%2026-27-006');
const r = ref?.data;
const rf = Object.fromEntries(Object.entries(r||{}).filter(([k,v]) => !exclude.includes(k) && !['courses','fees'].includes(k)));
console.log('\nRef PE non-courses fields:', JSON.stringify(rf, null, 2));
