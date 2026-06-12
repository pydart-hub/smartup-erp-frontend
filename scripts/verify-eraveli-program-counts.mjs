const BASE='https://smartup.m.frappe.cloud';
const AUTH='token 03330270e330d49:9c2261ae11ac2d2';
async function get(path) {
  const res = await fetch(BASE + path, { headers: { Authorization: AUTH, Accept: 'application/json' } });
  return res.json();
}
const branch='Smart Up Eraveli';

async function main() {
  const studentsRes = await get('/api/resource/Student?' + new URLSearchParams({
    fields: JSON.stringify(['name','enabled']),
    filters: JSON.stringify([['custom_branch','=',branch],['enabled','=',1]]),
    limit_page_length:'500',
    order_by:'name asc'
  }));
  const students = studentsRes.data || [];
  const ids = students.map((s) => s.name);
  const latest = new Map();
  const chunk = 100;
  for (let i = 0; i < ids.length; i += chunk) {
    const batch = ids.slice(i, i + chunk);
    const peRes = await get('/api/resource/Program Enrollment?' + new URLSearchParams({
      fields: JSON.stringify(['student','program','enrollment_date']),
      filters: JSON.stringify([['docstatus','=','1'],['student','in',batch]]),
      order_by:'enrollment_date desc',
      limit_page_length:'5000'
    }));
    for (const row of peRes.data || []) {
      if (!row.student || latest.has(row.student)) continue;
      latest.set(row.student, row.program || 'Uncategorised');
    }
  }
  const byProgram = {};
  for (const s of students) {
    const p = latest.get(s.name) || 'Uncategorised';
    byProgram[p] = (byProgram[p] || 0) + 1;
  }
  console.log('ACTIVE_STUDENTS', students.length);
  console.log('PROGRAM_COUNTS', byProgram);
  console.log('SUM_PROGRAM_COUNTS', Object.values(byProgram).reduce((a, b) => a + b, 0));
}
main().catch((e) => { console.error(e); process.exit(1); });
