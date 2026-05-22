const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function get(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}/api/${path}${qs ? '?' + qs : ''}`;
  const res = await fetch(url, { headers: { Authorization: AUTH } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().then(t => t.slice(0, 200))}`);
  return res.json();
}

// Fetch Work Assignment doctype meta to understand field patterns
const wa = await get('resource/DocType/Work Assignment');
console.log('=== Work Assignment fields ===');
(wa.data?.fields ?? []).forEach(f => console.log(`  ${f.fieldname} [${f.fieldtype}] - "${f.label}"`));

// Check Complaint doctype (another Education custom)
const complaint = await get('resource/DocType/Complaint');
console.log('\n=== Complaint fields ===');
(complaint.data?.fields ?? []).forEach(f => console.log(`  ${f.fieldname} [${f.fieldtype}] - "${f.label}"`));
