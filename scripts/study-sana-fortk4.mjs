import https from 'https';

function apiFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function getList(doctype, filters, fields, limit) {
  const f = encodeURIComponent(JSON.stringify(filters));
  const fl = encodeURIComponent(JSON.stringify(fields));
  const url = `${BASE}/api/resource/${encodeURIComponent(doctype)}?filters=${f}&fields=${fl}&limit_page_length=${limit || 50}`;
  const res = await apiFetch(url, { headers: { Authorization: AUTH } });
  return res.data || [];
}

async function getDoc(doctype, name) {
  const url = `${BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`;
  const res = await apiFetch(url, { headers: { Authorization: AUTH } });
  return res.data;
}

const STU_ID = 'STU-SU FKO-26-091';
const STU_NAME = 'SANA FATHIMA TS';

async function main() {
  console.log('=== SANA FATHIMA TS — Extended Investigation ===\n');

  // 1. All PE for Fort Kochi branch
  console.log('--- 1. All Fort Kochi Program Enrollments (recent) ---');
  const fkoPE = await getList('Program Enrollment',
    [['custom_branch', 'like', '%Fort%']],
    ['name', 'student', 'student_name', 'program', 'custom_branch', 'enrollment_date',
     'custom_fee_structure', 'custom_demo', 'docstatus'],
    100
  );
  console.log('Total FKO PEs:', fkoPE.length);
  // Show last few
  const recent = fkoPE.slice(-10);
  console.log('Last 10:', JSON.stringify(recent, null, 2));
  
  // Find Sana specifically
  const sanaPE = fkoPE.filter(p => p.student_name && p.student_name.includes('SANA'));
  console.log('Sana PEs:', JSON.stringify(sanaPE, null, 2));

  // 2. PE by student name
  console.log('\n--- 2. PE search by student_name ---');
  const peByName = await getList('Program Enrollment',
    [['student_name', 'like', '%SANA FATHIMA%']],
    ['name', 'student', 'student_name', 'program', 'custom_branch', 'custom_fee_structure', 'custom_demo', 'docstatus'],
    20
  );
  console.log(JSON.stringify(peByName, null, 2));

  // 3. Check if customer account exists
  console.log('\n--- 3. Customer Account for STU-SU FKO-26-091 ---');
  const custRes = await getList('Customer',
    [['name', '=', STU_ID]],
    ['name', 'customer_name', 'customer_group', 'territory', 'customer_type'],
    5
  );
  console.log(JSON.stringify(custRes, null, 2));

  // 4. All programs (to know what FKO offers)
  console.log('\n--- 4. Programs available ---');
  const programs = await getList('Program',
    [],
    ['name', 'program_name', 'custom_branch'],
    100
  );
  const fkoPrograms = programs.filter(p => p.name?.includes('FKO') || p.custom_branch?.includes('Fort'));
  console.log('FKO Programs:', JSON.stringify(fkoPrograms, null, 2));

  // 5. All items for Fort Kochi
  console.log('\n--- 5. Items for Fort Kochi ---');
  const items = await getList('Item',
    [['item_name', 'like', '%FKO%']],
    ['name', 'item_name', 'item_group', 'custom_branch'],
    20
  );
  console.log(JSON.stringify(items, null, 2));

  // 6. All students near STU-SU FKO-26-091
  console.log('\n--- 6. Students STU-SU FKO-26-085 to 095 ---');
  const nearStudents = await getList('Student',
    [['custom_branch', 'like', '%Fort%']],
    ['name', 'student_name', 'custom_branch', 'enabled', 'custom_demo', 'custom_student_type', 'joining_date'],
    100
  );
  console.log('Total FKO students:', nearStudents.length);
  const near = nearStudents.filter(st => {
    const num = parseInt(st.name.split('-').pop());
    return num >= 85 && num <= 95;
  });
  console.log('Near 91:', JSON.stringify(near, null, 2));

  // 7. Check PE for neighboring students to understand the pattern
  console.log('\n--- 7. PE for FKO students 088-091 ---');
  const neighbor088 = await getList('Program Enrollment',
    [['student', '=', 'STU-SU FKO-26-088']],
    ['name', 'student', 'student_name', 'program', 'custom_fee_structure', 'custom_no_of_instalments',
     'custom_billing_start_date', 'custom_demo', 'docstatus', 'academic_year', 'enrollment_date'],
    5
  );
  console.log('088 (SANA FATHIMA KA) PEs:', JSON.stringify(neighbor088, null, 2));

  const neighbor090 = await getList('Program Enrollment',
    [['student', '=', 'STU-SU FKO-26-090']],
    ['name', 'student', 'student_name', 'program', 'custom_fee_structure', 'custom_no_of_instalments',
     'custom_billing_start_date', 'custom_demo', 'docstatus', 'academic_year', 'enrollment_date'],
    5
  );
  console.log('090 PEs:', JSON.stringify(neighbor090, null, 2));

  const neighbor092 = await getList('Program Enrollment',
    [['student', '=', 'STU-SU FKO-26-092']],
    ['name', 'student', 'student_name', 'program', 'custom_fee_structure', 'custom_no_of_instalments',
     'custom_billing_start_date', 'custom_demo', 'docstatus', 'academic_year', 'enrollment_date'],
    5
  );
  console.log('092 PEs:', JSON.stringify(neighbor092, null, 2));

  // 8. Check full student doc again - look for ALL fields
  console.log('\n--- 8. Full Student Doc (all fields) ---');
  const fullStu = await getDoc('Student', STU_ID);
  // Print all non-null/non-empty fields
  const fields = {};
  for (const [k, v] of Object.entries(fullStu)) {
    if (v !== null && v !== undefined && v !== '' && !Array.isArray(v)) {
      fields[k] = v;
    }
  }
  console.log(JSON.stringify(fields, null, 2));

  // 9. Check recent PEs for all FKO (what PE numbers were recently created for FKO)
  console.log('\n--- 9. Most recent FKO PEs ---');
  const sortedPE = fkoPE.sort((a, b) => a.name.localeCompare(b.name));
  const last15 = sortedPE.slice(-15);
  console.log(JSON.stringify(last15, null, 2));

  console.log('\n=== INVESTIGATION COMPLETE ===');
}

main().catch(console.error);
