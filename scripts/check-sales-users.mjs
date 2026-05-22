const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function get(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}/api/${path}${qs ? '?' + qs : ''}`;
  const res = await fetch(url, { headers: { Authorization: AUTH } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().then(t => t.slice(0, 300))}`);
  return res.json();
}

// Find sales user accounts specifically
const sales = await get('resource/User', {
  filters: JSON.stringify([['enabled', '=', 1], ['name', 'like', '%sales%']]),
  fields: JSON.stringify(['name', 'full_name', 'role_profile_name']),
  limit_page_length: '20',
});
console.log('=== Sales users ===');
(sales.data ?? []).forEach(u => console.log(`  ${u.name} (${u.full_name}) [${u.role_profile_name}]`));

// Check what role profiles exist
const roles = await get('resource/Role Profile', {
  fields: JSON.stringify(['name']),
  limit_page_length: '30',
});
console.log('\n=== Role Profiles ===');
(roles.data ?? []).forEach(r => console.log(`  ${r.name}`));

// Check session cookie format to understand user identity
// Look at one real sales user to understand their roles
const saniya = await get('resource/User/saniya@smartup.in');
console.log('\n=== Saniya user roles ===');
(saniya.data?.roles ?? []).forEach(r => console.log(`  ${r.role}`));
