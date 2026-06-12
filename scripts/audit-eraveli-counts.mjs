const BASE='https://smartup.m.frappe.cloud';
const AUTH='token 03330270e330d49:9c2261ae11ac2d2';
async function get(path) {
  const res = await fetch(BASE + path, { headers: { Authorization: AUTH, Accept: 'application/json' } });
  return res.json();
}
const branch='Smart Up Eraveli';

async function main() {
  const totalRes = await get('/api/method/frappe.client.get_count?' + new URLSearchParams({
    doctype: 'Student',
    filters: JSON.stringify({ custom_branch: branch })
  }));
  const activeRes = await get('/api/method/frappe.client.get_count?' + new URLSearchParams({
    doctype: 'Student',
    filters: JSON.stringify({ custom_branch: branch, enabled: '1' })
  }));
  const inactiveRes = await get('/api/method/frappe.client.get_count?' + new URLSearchParams({
    doctype: 'Student',
    filters: JSON.stringify({ custom_branch: branch, enabled: '0' })
  }));
  console.log('RAW_TOTAL', totalRes.message || 0);
  console.log('RAW_ACTIVE', activeRes.message || 0, 'RAW_INACTIVE', inactiveRes.message || 0);

  const groupsRes = await get('/api/resource/Student Group?' + new URLSearchParams({
    fields: JSON.stringify(['name','program','student_group_name','custom_branch','disabled']),
    filters: JSON.stringify([['custom_branch','=',branch]]),
    limit_page_length:'500',
    order_by:'name asc'
  }));
  const groups = groupsRes.data || [];
  console.log('TOTAL_GROUPS', groups.length, 'ACTIVE_GROUPS', groups.filter(g=>!g.disabled).length, 'DISABLED_GROUPS', groups.filter(g=>g.disabled).length);

  const seen = new Map();
  let duplicateStudents = 0;
  let totalMemberRecords = 0;
  for (const g of groups) {
    const sg = await get('/api/resource/Student Group/' + encodeURIComponent(g.name));
    const students = sg.data?.students || [];
    totalMemberRecords += students.length;
    for (const s of students) {
      if (!s.student) continue;
      if (seen.has(s.student)) duplicateStudents++;
      else seen.set(s.student, { group: g.name, active: Boolean(s.active) });
    }
  }
  console.log('TOTAL_MEMBER_RECORDS', totalMemberRecords, 'UNIQUE_STUDENTS_IN_GROUPS', seen.size, 'DUPLICATES', duplicateStudents);

  const rawStudentsRes = await get('/api/resource/Student?' + new URLSearchParams({
    fields: JSON.stringify(['name','enabled']),
    filters: JSON.stringify([['custom_branch','=',branch]]),
    limit_page_length:'500',
    order_by:'name asc'
  }));
  const rawStudents = rawStudentsRes.data || [];
  console.log('RAW_STUDENT_LIST', rawStudents.length, 'ACTIVE_RAW', rawStudents.filter(s=>Number(s.enabled)===1).length, 'INACTIVE_RAW', rawStudents.filter(s=>Number(s.enabled)===0).length);

  const missingFromGroups = rawStudents.filter(s => !seen.has(s.name));
  console.log('MISSING_FROM_GROUPS', missingFromGroups.length);
  for (const s of missingFromGroups.slice(0, 50)) {
    console.log('MISSING_STUDENT', s.name, 'enabled=', s.enabled);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
