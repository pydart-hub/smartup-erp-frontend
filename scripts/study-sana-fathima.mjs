const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

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
  const STUDENT_ID = 'STU-SU PLR-26-061';

  // 1. Item Price list (without restricted fields)
  console.log('\n========== ITEM PRICES: 10th State Tuition Fee ==========');
  const ip = await fetchJSON(BASE + '/api/resource/Item Price?filters=[["item_code","=","10th State Tuition Fee"]]&fields=["name","item_code","item_name","price_list","selling","buying","currency","price_list_rate","valid_from","valid_upto","customer"]&limit=50');
  console.log(JSON.stringify(ip, null, 2));

  // 2. Student Group memberships via Student Group Student doctype
  console.log('\n========== STUDENT GROUPS for Sana ==========');
  const sgList = await fetchJSON(BASE + '/api/resource/Student Group?limit=200&fields=["name","student_group_name","program","academic_year","max_strength"]&filters=[["name","like","%Palluruthy%"]]');
  // Get groups that contain this student
  for (const sg of (sgList.data || [])) {
    const members = await fetchJSON(BASE + `/api/resource/Student Group/${encodeURIComponent(sg.name)}`);
    const found = (members.data?.students || []).find(s => s.student === STUDENT_ID);
    if (found) {
      console.log('MEMBER OF:', sg.name, '|', sg.program, '|', sg.academic_year);
      console.log('  Members count:', members.data?.students?.length);
    }
  }

  // 3. Custom Work Assignment for this student
  console.log('\n========== WORK ASSIGNMENTS ==========');
  const wa = await fetchJSON(BASE + `/api/resource/Work Assignment?filters=[["student","=","${STUDENT_ID}"]]&fields=["name","student","student_name","instructor","course","date","status","branch"]&limit=20`);
  console.log(JSON.stringify(wa, null, 2));

  // 4. All invoices strictly for this student
  console.log('\n========== ALL INVOICES FOR SANA ==========');
  const allInv = await fetchJSON(BASE + '/api/resource/Sales Invoice?filters=[["customer_name","=","Sana Fathima Ismail"]]&fields=["name","posting_date","due_date","grand_total","outstanding_amount","status","remarks"]&limit=50');
  console.log(JSON.stringify(allInv, null, 2));

  // 5. Fee Category check
  console.log('\n========== FEE CATEGORY: 10th State ==========');
  const fc = await fetchJSON(BASE + '/api/resource/Fee Category?limit=20&fields=["name"]');
  console.log(JSON.stringify(fc, null, 2));

  // 6. Program record: 10th State
  console.log('\n========== PROGRAM: 10th State ==========');
  const prog = await fetchJSON(BASE + '/api/resource/Program/10th State');
  const p = prog.data;
  console.log('name:', p?.name, '| department:', p?.department, '| fees:', JSON.stringify(p?.fees), '| courses:', p?.courses?.length);
  console.log('Courses:', JSON.stringify(p?.courses?.map(c => c.course), null, 2));

  // 7. Admission Application  
  console.log('\n========== STUDENT APPLICANT ==========');
  const app = await fetchJSON(BASE + '/api/resource/Student Applicant?filters=[["name","like","%PLR%061%"]]&fields=["name","student_name","program","application_status","student"]&limit=10');
  console.log(JSON.stringify(app, null, 2));
}

main().catch(console.error);

  // 1. Item record: 10th State Tuition Fee
  console.log('\n========== ITEM: 10th State Tuition Fee ==========');
  const item = await fetchJSON(BASE + '/api/resource/Item/10th State Tuition Fee');
  console.log(JSON.stringify(item.data, null, 2));

  // 2. Item Price for the item
  console.log('\n========== ITEM PRICES: 10th State Tuition Fee ==========');
  const ip = await fetchJSON(BASE + '/api/resource/Item Price?filters=[["item_code","=","10th State Tuition Fee"]]&fields=["name","item_code","item_name","price_list","selling","buying","currency","price_list_rate","valid_from","valid_upto","customer","territory"]&limit=50');
  console.log(JSON.stringify(ip, null, 2));

  // 3. Guardian record
  console.log('\n========== GUARDIAN: EDU-GRD-2026-00548 ==========');
  const grd = await fetchJSON(BASE + '/api/resource/Guardian/EDU-GRD-2026-00548');
  console.log(JSON.stringify(grd.data, null, 2));

  // 4. Check for Admission (Student Admission)
  console.log('\n========== STUDENT ADMISSION ==========');
  const admission = await fetchJSON(BASE + '/api/resource/Student Admission?filters=[["title","like","%Sana%Ismail%"]]&fields=["name","title","program","academic_year","admission_start_date","admission_end_date"]&limit=10');
  console.log(JSON.stringify(admission, null, 2));

  // 5. Student Application
  console.log('\n========== STUDENT APPLICANT ==========');
  const app = await fetchJSON(BASE + '/api/resource/Student Applicant?filters=[["student_name","like","%Sana%Ismail%"]]&fields=["name","student_name","program","academic_year","application_status","student"]&limit=10');
  console.log(JSON.stringify(app, null, 2));

  // 6. All invoices for Palluruthy - 10th State students to compare
  console.log('\n========== ALL 10th State Tuition Fee INVOICES - PLR (recent) ==========');
  const allPlr = await fetchJSON(BASE + '/api/resource/Sales Invoice?filters=[["company","=","Smart Up Palluruthy"],["posting_date",">=","2026-04-01"]]&fields=["name","customer_name","posting_date","grand_total","outstanding_amount","status"]&order_by=posting_date desc&limit=30');
  console.log(JSON.stringify(allPlr, null, 2));

  // 7. Check student group for Palluruthy 10th
  console.log('\n========== STUDENT GROUPS: PLR 10th ==========');
  const sg = await fetchJSON(BASE + '/api/resource/Student Group?filters=[["branch","like","%Palluruthy%"],["program","like","%10th%"]]&fields=["name","student_group_name","program","batch","branch","academic_year","max_strength"]&limit=20');
  console.log(JSON.stringify(sg, null, 2));

  // 8. Check for fee plan using the invoice custom fields we saw
  console.log('\n========== FULL INV1 CUSTOM FIELDS ==========');
  const inv1full = await fetchJSON(BASE + '/api/resource/Sales Invoice/ACC-SINV-2026-05659');
  const customKeys = Object.keys(inv1full.data || {}).filter(k => k.startsWith('custom_'));
  const customVals = {};
  customKeys.forEach(k => customVals[k] = inv1full.data[k]);
  console.log(JSON.stringify(customVals, null, 2));

  // 9. Fee Structure for 10th State Palluruthy
  console.log('\n========== FEE STRUCTURES: 10th Palluruthy ==========');
  const feeStruct = await fetchJSON(BASE + '/api/resource/Fee Structure?filters=[["program","like","%10th%"]]&fields=["name","program","academic_year","academic_term","total_amount","company"]&limit=20');
  console.log(JSON.stringify(feeStruct, null, 2));
}

main().catch(console.error);
