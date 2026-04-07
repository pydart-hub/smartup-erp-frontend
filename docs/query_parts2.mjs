const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const headers = { 'Authorization': AUTH, 'Content-Type': 'application/json' };

async function main() {
  // 1. Get ALL student groups across all branches
  const r1 = await fetch(BASE + '/api/resource/Student Group?limit_page_length=200&fields=["name","program","batch","academic_year","custom_branch","max_strength"]&order_by=custom_branch asc', { headers });
  const j1 = await r1.json();
  console.log('=== ALL STUDENT GROUPS ===');
  console.log('Total:', j1.data.length);
  
  // Group by branch
  const byBranch = {};
  for (const sg of j1.data) {
    const b = sg.custom_branch || 'No Branch';
    if (!byBranch[b]) byBranch[b] = [];
    byBranch[b].push({ name: sg.name, program: sg.program });
  }
  for (const [branch, groups] of Object.entries(byBranch)) {
    console.log(`\n  ${branch} (${groups.length} groups):`);
    for (const g of groups) {
      console.log(`    - ${g.name} → ${g.program}`);
    }
  }

  // 2. Get a student group doc with instructor assignments  
  const sgName = j1.data[0].name;
  const r2 = await fetch(BASE + '/api/resource/Student Group/' + encodeURIComponent(sgName), { headers });
  const j2 = await r2.json();
  console.log('\n=== STUDENT GROUP DOC:', sgName, '===');
  console.log('Instructors:', JSON.stringify(j2.data.instructors, null, 2));
  console.log('Student count:', (j2.data.students || []).length);

  // 3. Check a few more student groups for instructor assignments
  for (const sg of j1.data.slice(1, 6)) {
    const r = await fetch(BASE + '/api/resource/Student Group/' + encodeURIComponent(sg.name), { headers });
    const j = await r.json();
    const instList = (j.data.instructors || []).map(i => i.instructor_name || i.instructor);
    console.log(`\n  ${sg.name}: instructors=[${instList.join(', ')}], students=${(j.data.students || []).length}`);
  }

  // 4. Full list of all courses  
  const r4 = await fetch(BASE + '/api/resource/Course?limit_page_length=100&fields=["name","course_name"]&order_by=name asc', { headers });
  const j4 = await r4.json();
  console.log('\n=== ALL 50 COURSES ===');
  // Group by grade level
  const byGrade = {};
  for (const c of j4.data) {
    const match = c.name.match(/^(\d+\w*)\s/);
    const grade = match ? match[1] : 'Other';
    if (!byGrade[grade]) byGrade[grade] = [];
    byGrade[grade].push(c.name);
  }
  for (const [grade, courses] of Object.entries(byGrade).sort()) {
    console.log(`  Grade ${grade}: ${courses.join(', ')}`);
  }

  // 5. Check how many programs have courses assigned
  const progs = ['8th State', '8th CBSE', '9th State', '9th CBSE', '10th State', '10th CBSE', '11th Science State', '11th Science CBSE', '12th Science State', '12th Science CBSE', '11th State'];
  for (const p of progs) {
    const r = await fetch(BASE + '/api/resource/Program/' + encodeURIComponent(p), { headers });
    const j = await r.json();
    if (j.data) {
      const courseList = (j.data.courses || []).map(c => c.course);
      console.log(`\n  ${p}: [${courseList.join(', ')}]`);
    }
  }

  // 6. Specifically check - is there any "part" or "chapter" concept anywhere?
  // Check if there are custom doctypes related to parts/chapters/syllabus
  const searchTerms = ['Part', 'Chapter', 'Syllabus', 'Progress', 'Completion', 'Performance'];
  for (const term of searchTerms) {
    const r = await fetch(BASE + `/api/resource/DocType?filters=[["name","like","%${term}%"],["module","=","Education"]]&fields=["name","module","istable"]&limit_page_length=20`, { headers });
    const j = await r.json();
    if (j.data && j.data.length > 0) {
      console.log(`\n  Education DocTypes matching "${term}":`, j.data.map(d => d.name));
    }
  }
}

main().catch(e => console.error(e));
