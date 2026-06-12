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

  const uniqueInBatches = new Set();
  const batchProgramCounts = {};
  let batchMemberRecords = 0;
  let batchActiveRecords = 0;
  let batchInactiveRecords = 0;
  let duplicateMemberships = 0;

  for (const g of activeGroups) {
    const sg = await get('/api/resource/Student Group/' + encodeURIComponent(g.name));
    const members = sg.data?.students || [];
    batchMemberRecords += members.length;
    batchActiveRecords += members.filter(s => s.active).length;
    batchInactiveRecords += members.filter(s => !s.active).length;
    for (const s of members) {
      if (!s.student) continue;
      if (uniqueInBatches.has(s.student)) duplicateMemberships++;
      uniqueInBatches.add(s.student);
    }
    const program = g.program || 'Uncategorised';
    batchProgramCounts[program] = (batchProgramCounts[program] || 0) + members.filter(s => s.active).length;
  }

  const ids = students.map(s => s.name);
  const latest = new Map();
  const chunk = 100;
  for (let i=0;i<ids.length;i+=chunk) {
    const batch = ids.slice(i,i+chunk);
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

  const missingFromBatches = students.filter(s => !uniqueInBatches.has(s.name));
  console.log('\nBRANCH', branch);
  console.log('RAW_ACTIVE', rawActive.message || 0, 'STUDENTS_LIST', students.length);
  console.log('ACTIVE_GROUPS', activeGroups.length, 'MEMBER_RECORDS', batchMemberRecords, 'UNIQUE_IN_BATCHES', uniqueInBatches.size, 'DUPLICATES', duplicateMemberships);
  console.log('ACTIVE_RECORDS', batchActiveRecords, 'INACTIVE_RECORDS', batchInactiveRecords);
  console.log('BATCH_PROGRAM_COUNTS', batchProgramCounts);
  console.log('PE_PROGRAM_COUNTS', peByProgram, 'PE_TOTAL', Object.values(peByProgram).reduce((a,b)=>a+b,0));
  console.log('MISSING_FROM_BATCHES', missingFromBatches.length);
  console.log('SAMPLE_MISSING', missingFromBatches.slice(0,10).map(s=>s.name));
}
