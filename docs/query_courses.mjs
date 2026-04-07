const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const headers = { 'Authorization': AUTH, 'Content-Type': 'application/json' };

async function main() {
  // 1. List courses
  const r1 = await fetch(BASE + '/api/resource/Course?fields=["name","course_name"]&limit_page_length=30', { headers });
  const j1 = await r1.json();
  console.log('=== COURSES ===');
  console.log(JSON.stringify(j1.data, null, 2));

  // 2. Get a single course doc to see full structure
  if (j1.data && j1.data[0]) {
    const r2 = await fetch(BASE + '/api/resource/Course/' + encodeURIComponent(j1.data[0].name), { headers });
    const j2 = await r2.json();
    console.log('\n=== COURSE DOC DETAIL ===');
    console.log(JSON.stringify(j2.data, null, 2));
  }

  // 3. Check if Topic doctype exists
  try {
    const r3 = await fetch(BASE + '/api/resource/Topic?limit_page_length=5', { headers });
    const j3 = await r3.json();
    console.log('\n=== TOPICS ===');
    console.log(JSON.stringify(j3.data, null, 2));
  } catch (e) {
    console.log('\n=== TOPICS: Not available ===');
  }

  // 4. Check if Course Topic child exists
  try {
    const r4 = await fetch(BASE + '/api/resource/Course Topic?limit_page_length=5', { headers });
    const j4 = await r4.json();
    console.log('\n=== COURSE TOPIC ===');
    console.log(JSON.stringify(j4.data, null, 2));
  } catch (e) {
    console.log('\n=== COURSE TOPIC: Not available ===');
  }

  // 5. Check Program doc structure
  const r5 = await fetch(BASE + '/api/resource/Program?fields=["name","program_name","program_abbreviation"]&limit_page_length=20', { headers });
  const j5 = await r5.json();
  console.log('\n=== PROGRAMS ===');
  console.log(JSON.stringify(j5.data, null, 2));

  // 6. Get a Program doc to see child tables (courses linked)
  if (j5.data && j5.data[0]) {
    const r6 = await fetch(BASE + '/api/resource/Program/' + encodeURIComponent(j5.data[0].name), { headers });
    const j6 = await r6.json();
    console.log('\n=== PROGRAM DOC DETAIL ===');
    console.log(JSON.stringify(j6.data, null, 2));
  }

  // 7. Check existing custom doctypes that might relate to syllabus/progress
  const r7 = await fetch(BASE + '/api/resource/DocType?filters=[["module","in",["Education","Frappe Education","Custom"]],["istable","=",0]]&fields=["name","module"]&limit_page_length=100', { headers });
  const j7 = await r7.json();
  console.log('\n=== EDUCATION DOCTYPES ===');
  console.log(JSON.stringify(j7.data, null, 2));

  // 8. Get instructor_log detail
  const r8 = await fetch(BASE + '/api/resource/Instructor?limit_page_length=2', { headers });
  const j8 = await r8.json();
  if (j8.data && j8.data[0]) {
    const r9 = await fetch(BASE + '/api/resource/Instructor/' + encodeURIComponent(j8.data[0].name), { headers });
    const j9 = await r9.json();
    console.log('\n=== INSTRUCTOR DOC DETAIL ===');
    console.log(JSON.stringify(j9.data, null, 2));
  }
}

main().catch(e => console.error(e));
