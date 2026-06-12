const BASE='https://smartup.m.frappe.cloud';
const AUTH='token 03330270e330d49:9c2261ae11ac2d2';
async function get(path) {
  const res = await fetch(BASE + path, { headers: { Authorization: AUTH, Accept: 'application/json' } });
  return res.json();
}

const branches = ['Smart Up Kadavanthra','Smart Up Thoppumpadi','Smart Up Vennala'];

for (const branch of branches) {
  const rawActive = await get('/api/method/frappe.client.get_count?' + new URLSearchParams({
    doctype: 'Student', filters: JSON.stringify({ custom_branch: branch, enabled: '1' })
  }));
  const studentsRes = await get('/api/resource/Student?' + new URLSearchParams({
    fields: JSON.stringify(['name','enabled']),
    filters: JSON.stringify([['custom_branch','=',branch],['enabled','=',1]]),
    limit_page_length:'500',
    order_by:'name asc'
  }));
  const students = studentsRes.data || [];
  const groupRes = await get('/api/resource/Student Group?' + new URLSearchParams({
    fields: JSON.stringify(['name','program','student_group_name','disabled']),
    filters: JSON.stringify([['custom_branch','=',branch]]),
    limit_page_length:'500',
    order_by:'name asc'
  }));
  const groups = groupRes.data || [];
  const activeGroups = groups.filter(g => !g.disabled);
  let batchTotal = 0;
  const programTotals = {};
  for (const g of activeGroups) {
    const sg = await get('/api/resource/Student Group/' + encodeURIComponent(g.name));
    const mem = sg.data?.students || [];
    batchTotal += mem.filter(s => s.active).length;
    const program = g.program || 'Uncategorised';
    programTotals[program] = (programTotals[program] || 0) + mem.filter(s => s.active).length;
  }

  const ids = students.map(s => s.name);
  const latest = new Map();
  const chunk = 100;
  for (let i=0;i<ids.length;i+=chunk) {
    const batch = ids.slice(i, i+chunk);
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
  const peByProgram = {};
  for (const s of students) {
    const p = latest.get(s.name) || 'Uncategorised';
    peByProgram[p] = (peByProgram[p] || 0) + 1;
  }

  console.log('\nBRANCH', branch);
  console.log('RAW_ACTIVE', rawActive.message || 0, 'STUDENT_LIST', students.length);
  console.log('BATCH_TOTAL_ACTIVE', batchTotal, 'BATCH_BY_PROGRAM', programTotals);
  console.log('PE_TOTAL_ACTIVE', Object.values(peByProgram).reduce((a,b)=>a+b,0), 'PE_BY_PROGRAM', peByProgram);
  const missingFromBatch = students.filter(s => !activeGroups.some(g => (g.data?.students||[]).includes(s.name) ));
  console.log('MISSING_FROM_BATCH_MEMBERSHIP', missingFromBatch.length);
}
