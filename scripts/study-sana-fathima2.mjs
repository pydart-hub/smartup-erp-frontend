const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const STUDENT_ID = 'STU-SU PLR-26-061';

async function fetchJSON(url) {
  const r = await fetch(url, { headers: { Authorization: AUTH } });
  if (!r.ok) {
    const text = await r.text();
    console.error(`[SKIP] HTTP ${r.status} for ${url.slice(0,120)}: ${text.slice(0,150)}`);
    return { data: [] };
  }
  return r.json();
}

async function main() {
  // 1. Item Price list
  console.log('\n========== ITEM PRICES: 10th State Tuition Fee ==========');
  const ip = await fetchJSON(BASE + '/api/resource/Item Price?filters=[["item_code","=","10th State Tuition Fee"]]&fields=["name","item_code","item_name","price_list","selling","buying","currency","price_list_rate","valid_from","valid_upto","customer"]&limit=50');
  console.log(JSON.stringify(ip, null, 2));

  // 2. Student Group memberships
  console.log('\n========== STUDENT GROUPS for Sana ==========');
  const sgList = await fetchJSON(BASE + '/api/resource/Student Group?limit=200&fields=["name","student_group_name","program","academic_year","max_strength"]&filters=[["name","like","%Palluruthy%"]]');
  for (const sg of (sgList.data || [])) {
    const members = await fetchJSON(BASE + '/api/resource/Student Group/' + encodeURIComponent(sg.name));
    const found = (members.data?.students || []).find(s => s.student === STUDENT_ID);
    if (found) {
      console.log('MEMBER OF:', sg.name, '|', sg.program, '|', sg.academic_year);
      console.log('  Members count:', members.data?.students?.length);
    }
  }

  // 3. Work Assignments
  console.log('\n========== WORK ASSIGNMENTS ==========');
  const wa = await fetchJSON(BASE + '/api/resource/Work Assignment?filters=[["student","=","' + STUDENT_ID + '"]]&fields=["name","student","student_name","instructor","course","date","status","branch"]&limit=20');
  console.log(JSON.stringify(wa, null, 2));

  // 4. All invoices for this student
  console.log('\n========== ALL INVOICES FOR SANA ==========');
  const allInv = await fetchJSON(BASE + '/api/resource/Sales Invoice?filters=[["customer_name","=","Sana Fathima Ismail"]]&fields=["name","posting_date","due_date","grand_total","outstanding_amount","status","remarks"]&limit=50');
  console.log(JSON.stringify(allInv, null, 2));

  // 5. Program record: 10th State
  console.log('\n========== PROGRAM: 10th State ==========');
  const prog = await fetchJSON(BASE + '/api/resource/Program/10th State');
  const p = prog.data;
  console.log('name:', p?.name, '| department:', p?.department);
  console.log('fees:', JSON.stringify(p?.fees, null, 2));
  console.log('Courses:', JSON.stringify(p?.courses?.map(c => c.course), null, 2));

  // 6. Admission via custom filters
  console.log('\n========== STUDENT APPLICANT (by name pattern) ==========');
  const app = await fetchJSON(BASE + '/api/resource/Student Applicant?filters=[["name","like","%PLR-26-061%"]]&fields=["name","student_name","program","application_status","student"]&limit=10');
  console.log(JSON.stringify(app, null, 2));
}

main().catch(console.error);
