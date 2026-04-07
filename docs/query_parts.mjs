const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const headers = { 'Authorization': AUTH, 'Content-Type': 'application/json' };

async function main() {
  // 1. Get ALL courses with their full docs to see topics child table
  const r1 = await fetch(BASE + '/api/resource/Course?limit_page_length=100&fields=["name","course_name"]', { headers });
  const j1 = await r1.json();
  console.log('=== TOTAL COURSES:', j1.data.length, '===');
  
  // 2. Check a few courses for topics child table
  const sampleCourses = ['10th Physics', '10th Mathematics', '11th Physics', '12th Chemistry', '8th English'];
  for (const c of sampleCourses) {
    const r = await fetch(BASE + '/api/resource/Course/' + encodeURIComponent(c), { headers });
    const j = await r.json();
    console.log(`\n=== ${c} ===`);
    console.log('Topics:', JSON.stringify(j.data.topics, null, 2));
    console.log('Assessment Criteria:', JSON.stringify(j.data.assessment_criteria, null, 2));
    // Check all custom fields
    const keys = Object.keys(j.data).filter(k => k.startsWith('custom'));
    if (keys.length > 0) {
      console.log('Custom fields:', keys.map(k => `${k}=${j.data[k]}`));
    }
  }

  // 3. Check Topic doctype - look for existing Topic records (even if empty in courses)
  const r3 = await fetch(BASE + '/api/resource/Topic?limit_page_length=50&fields=["name","topic_name"]', { headers });
  const j3 = await r3.json();
  console.log('\n=== ALL TOPICS ON BACKEND ===');
  console.log(JSON.stringify(j3.data, null, 2));

  // 4. Check Program → Course mapping for a few programs
  const programs = ['10th State', '10th CBSE', '11th Science State', '12th Science State'];
  for (const p of programs) {
    const r = await fetch(BASE + '/api/resource/Program/' + encodeURIComponent(p), { headers });
    const j = await r.json();
    console.log(`\n=== Program: ${p} ===`);
    console.log('Courses:', (j.data.courses || []).map(c => `${c.course} (required=${c.required})`));
  }

  // 5. Check how instructor_log entries map (all entries for Kadavanthra branch)
  const r5 = await fetch(BASE + '/api/resource/Instructor?limit_page_length=200&fields=["name","instructor_name","custom_company"]', { headers });
  const j5 = await r5.json();
  console.log('\n=== ALL INSTRUCTORS ===');
  console.log('Count:', j5.data.length);
  
  // Group by branch
  const branchCounts = {};
  for (const i of j5.data) {
    const b = i.custom_company || 'No Branch';
    branchCounts[b] = (branchCounts[b] || 0) + 1;
  }
  console.log('By branch:', JSON.stringify(branchCounts, null, 2));

  // 6. Get a few instructor docs with full instructor_log to see course assignments
  const sampleInstructors = j5.data.slice(0, 5);
  for (const inst of sampleInstructors) {
    const r = await fetch(BASE + '/api/resource/Instructor/' + encodeURIComponent(inst.name), { headers });
    const j = await r.json();
    console.log(`\n=== Instructor: ${inst.instructor_name} (${inst.custom_company}) ===`);
    console.log('Courses taught:', (j.data.instructor_log || []).map(l => ({
      program: l.program,
      course: l.course,
      branch: l.custom_branch,
      year: l.academic_year,
      student_group: l.student_group
    })));
  }

  // 7. Check Student Groups to see how batches link to courses
  const r7 = await fetch(BASE + '/api/resource/Student Group?limit_page_length=5&fields=["name","student_group_name","program","batch","academic_year","custom_branch","max_strength"]', { headers });
  const j7 = await r7.json();
  console.log('\n=== SAMPLE STUDENT GROUPS ===');
  console.log(JSON.stringify(j7.data, null, 2));

  // 8. Check Course Schedule to see what's being scheduled
  const r8 = await fetch(BASE + '/api/resource/Course Schedule?limit_page_length=10&fields=["name","student_group","course","instructor","schedule_date","from_time","to_time","custom_branch"]&order_by=schedule_date desc', { headers });
  const j8 = await r8.json();
  console.log('\n=== RECENT COURSE SCHEDULES ===');
  console.log(JSON.stringify(j8.data, null, 2));
}

main().catch(e => console.error(e));
