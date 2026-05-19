const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

// All groups with "-B" in their name across entire backend
const r = await fetch(
  BASE + '/api/resource/Student Group?filters=[["student_group_name","like","%-B%"]]&fields=["name","student_group_name","disabled","academic_year","group_based_on","custom_branch"]&limit=100',
  { headers: { Authorization: AUTH } }
);
const j = await r.json();
console.log('Total "-B" groups:', j.data?.length);
j.data?.forEach(b => console.log(`  ${b.student_group_name} | branch: ${b.custom_branch} | disabled: ${b.disabled} | year: ${b.academic_year} | based_on: ${b.group_based_on}`));

// Also check all Thopumpadi groups regardless of type
const r2 = await fetch(
  BASE + '/api/resource/Student Group?filters=[["custom_branch","=","Smart Up Thopumpadi"]]&fields=["name","student_group_name","disabled","academic_year","group_based_on"]&limit=200',
  { headers: { Authorization: AUTH } }
);
const j2 = await r2.json();
console.log('\nAll Thopumpadi groups (all types):', j2.data?.length);
j2.data?.forEach(b => console.log(`  ${b.student_group_name} | based_on: ${b.group_based_on} | disabled: ${b.disabled}`));
