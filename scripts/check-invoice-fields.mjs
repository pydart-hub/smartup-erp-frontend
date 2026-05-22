const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function get(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}/api/${path}${qs ? '?' + qs : ''}`;
  const res = await fetch(url, { headers: { Authorization: AUTH } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().then(t => t.slice(0, 300))}`);
  return res.json();
}

// Check Sales Invoice fields to understand what we can link to
const si = await get('resource/DocType/Sales Invoice');
console.log('=== Sales Invoice key fields ===');
(si.data?.fields ?? []).filter(f => 
  ['student','company','customer','due_date','outstanding_amount','naming_series'].includes(f.fieldname)
).forEach(f => console.log(`  ${f.fieldname} [${f.fieldtype}]`));

// Check Student doctype key fields
const stu = await get('resource/DocType/Student');
console.log('\n=== Student key fields ===');
(stu.data?.fields ?? []).filter(f => 
  ['student_name','customer','custom_branch','enabled','joining_date'].includes(f.fieldname)
).forEach(f => console.log(`  ${f.fieldname} [${f.fieldtype}]`));

// What users/roles exist?
const users = await get('resource/User', {
  filters: JSON.stringify([['enabled', '=', 1], ['user_type', '=', 'System User']]),
  fields: JSON.stringify(['name', 'full_name', 'role_profile_name']),
  limit_page_length: '30',
});
console.log('\n=== Active System Users ===');
(users.data ?? []).forEach(u => console.log(`  ${u.name} [${u.role_profile_name}]`));
