/**
 * Study Student Group naming patterns + Batch Names across all branches
 */
const https = await import('https');
const BASE = 'https://smartup.m.frappe.cloud';
const auth = 'token 03330270e330d49:9c2261ae11ac2d2';

function get(path) {
  return new Promise((res, rej) => {
    https.default.get(BASE + path, { headers: { Authorization: auth } }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { res(JSON.parse(d)); } catch (e) { rej(e); }
      });
    }).on('error', rej);
  });
}

// 1. All Student Groups (Batch type)
const fields = JSON.stringify(['name','student_group_name','program','batch','custom_branch','academic_year','disabled']);
const filters = JSON.stringify([['group_based_on','=','Batch'],['disabled','=','0']]);
const res = await get(`/api/resource/Student Group?fields=${encodeURIComponent(fields)}&filters=${encodeURIComponent(filters)}&limit_page_length=300&order_by=name asc`);
const groups = res.data ?? [];

console.log(`Total active Student Groups (Batch): ${groups.length}\n`);

// Group by branch
const byBranch = {};
for (const g of groups) {
  const b = g.custom_branch || 'Unknown';
  if (!byBranch[b]) byBranch[b] = [];
  byBranch[b].push(g);
}

for (const [branch, bGroups] of Object.entries(byBranch).sort()) {
  console.log(`=== ${branch} (${bGroups.length} groups) ===`);
  for (const g of bGroups) {
    console.log(`  ${g.name.padEnd(45)} prog: ${(g.program||'?').padEnd(25)} batch: ${g.batch||'?'}`);
  }
  console.log('');
}

// 2. Student Batch Names
const bfQ = encodeURIComponent(JSON.stringify(['name']));
const bfR = await get(`/api/resource/Student Batch Name?fields=${bfQ}&limit_page_length=100&order_by=name asc`);
console.log('Student Batch Names:', (bfR.data||[]).map(b => b.name).join(', '));
