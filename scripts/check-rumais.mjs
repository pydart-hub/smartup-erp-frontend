const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
async function get(url) { return (await fetch(url, { headers:{ Authorization: AUTH, Accept:'application/json' } })).json(); }

const sg = await get(BASE + '/api/resource/Student Group Student?' + new URLSearchParams({
  fields: JSON.stringify(['student','student_name','group_roll_number','parent']),
  filters: JSON.stringify([['student','=','STU-SU CHL-26-056']]),
  limit_page_length: '10'
}));
console.log('Student Group memberships:', JSON.stringify(sg?.data, null, 2));

const res = await get(BASE + '/api/resource/Student/STU-SU%20CHL-26-056');
const s = res?.data;
const exclude = ['name','owner','creation','modified','modified_by','docstatus','idx','doctype','__onload'];
const filtered = Object.fromEntries(Object.entries(s||{}).filter(([k,v]) => !exclude.includes(k) && v !== null && v !== '' && v !== 0 && v !== '0'));
console.log('Non-empty student fields:', JSON.stringify(filtered, null, 2));

// Also check all programs available
const progs = await get(BASE + '/api/resource/Program?' + new URLSearchParams({
  fields: JSON.stringify(['name']),
  limit_page_length: '50'
}));
console.log('Available Programs:', progs?.data?.map(p => p.name));
