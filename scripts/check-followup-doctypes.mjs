const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function get(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}/api/${path}${qs ? '?' + qs : ''}`;
  const res = await fetch(url, { headers: { Authorization: AUTH } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().then(t => t.slice(0, 200))}`);
  return res.json();
}

// Check for existing call log / follow up doctypes
const searches = ['Follow', 'Call', 'Log', 'Remark', 'Note', 'Contact'];
for (const term of searches) {
  const res = await get('resource/DocType', {
    filters: JSON.stringify([['name', 'like', `%${term}%`]]),
    fields: JSON.stringify(['name', 'module']),
    limit_page_length: '20',
  });
  const hits = (res.data ?? []).filter(d => !d.module?.includes('Core'));
  if (hits.length) {
    console.log(`\n=== "${term}" matches ===`);
    hits.forEach(d => console.log(`  ${d.name} [${d.module}]`));
  }
}

// Also check custom doctypes
console.log('\n=== All Custom Doctypes ===');
const custom = await get('resource/DocType', {
  filters: JSON.stringify([['custom', '=', 1]]),
  fields: JSON.stringify(['name', 'module']),
  limit_page_length: '50',
});
(custom.data ?? []).forEach(d => console.log(`  ${d.name} [${d.module}]`));
