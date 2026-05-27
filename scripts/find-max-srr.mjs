const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
async function req(path) {
  const res = await fetch(BASE + path, { headers: { Authorization: AUTH, Accept: 'application/json' } });
  return res.json();
}

// Get all Chullickal students and their SRR IDs
const stu = await req('/api/resource/Student?' + new URLSearchParams({
  fields: JSON.stringify(['name','student_name','custom_srr_id','custom_branch']),
  filters: JSON.stringify([['custom_branch','=','Smart Up Chullickal'],['enabled','=',1]]),
  limit_page_length: '300',
  order_by: 'custom_srr_id asc'
}));

const students = stu?.data ?? [];
console.log('Chullickal active student count:', students.length);

// Find max SRR
const srrNums = students.map(s => parseInt(s.custom_srr_id || '0')).filter(n => !isNaN(n));
const maxSrr = Math.max(...srrNums);
console.log('Max SRR:', maxSrr);
console.log('SRR 056 students:', students.filter(s => s.custom_srr_id === '056').map(s => ({name: s.name, student_name: s.student_name})));
console.log('\nTop 5 highest SRRs:', 
  students.sort((a,b) => parseInt(b.custom_srr_id||'0') - parseInt(a.custom_srr_id||'0'))
  .slice(0,5).map(s => ({srr: s.custom_srr_id, name: s.name, student_name: s.student_name}))
);

// Verify: does any Chullickal student have SRR = maxSrr+1?
const nextSrr = (maxSrr + 1).toString().padStart(3, '0');
console.log('\nNext available SRR would be:', nextSrr);
console.log('Students with SRR', nextSrr, ':', students.filter(s => s.custom_srr_id === nextSrr));
