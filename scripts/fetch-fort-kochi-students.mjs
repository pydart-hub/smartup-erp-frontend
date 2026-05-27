// uses built-in fetch (Node 18+)

const h = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2' };
const base = 'https://smartup.m.frappe.cloud';

async function get(url) {
  const r = await fetch(base + url, { headers: h });
  return r.json();
}

async function main() {
  // 1. Find students
  const [g, a, ay] = await Promise.all([
    get('/api/resource/Student?filters=[["student_name","like","%Glania%"]]&fields=["name","student_name","custom_branch"]&limit=5'),
    get('/api/resource/Student?filters=[["student_name","like","%Angel Mary%"]]&fields=["name","student_name","custom_branch"]&limit=5'),
    get('/api/resource/Student?filters=[["student_name","like","%Ayra%"]]&fields=["name","student_name","custom_branch"]&limit=5'),
  ]);
  console.log('GLANIA:', JSON.stringify(g.data, null, 2));
  console.log('ANGEL:', JSON.stringify(a.data, null, 2));
  console.log('AYRA:', JSON.stringify(ay.data, null, 2));

  // Get all student IDs
  const students = [
    ...(g.data || []),
    ...(a.data || []),
    ...(ay.data || []),
  ];

  console.log('\n=== Student IDs Found ===');
  students.forEach(s => console.log(s.name, '-', s.student_name, '-', s.custom_branch));

  // 2. Fetch full student details for each
  for (const s of students) {
    console.log(`\n========== FULL RECORD: ${s.student_name} (${s.name}) ==========`);
    const full = await get(`/api/resource/Student/${s.name}`);
    console.log(JSON.stringify(full.data, null, 2));
  }
}

main().catch(console.error);
