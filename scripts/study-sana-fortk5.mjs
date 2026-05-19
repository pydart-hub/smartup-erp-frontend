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

async function main() {
  console.log('=== Fort Kochi Branch — Infrastructure Study ===\n');

  // 1. Branch document
  console.log('--- 1. Branch Record: Smart Up Fortkochi ---');
  const branch = await getDoc('Branch', 'Smart Up Fortkochi');
  console.log(JSON.stringify(branch, null, 2));

  // 2. All branches (to compare)
  console.log('\n--- 2. All Branches ---');
  const branches = await getList('Branch', [], ['name', 'branch', 'custom_abbr', 'custom_branch_abbr'], 50);
  console.log(JSON.stringify(branches, null, 2));

  // 3. All Programs (unfiltered)
  console.log('\n--- 3. All Programs ---');
  const allPrograms = await getList('Program', [], ['name', 'program_name', 'custom_branch', 'department'], 100);
  console.log(JSON.stringify(allPrograms, null, 2));

  // 4. All Fee Structures (sample)
  console.log('\n--- 4. All Fee Structures (first 100) ---');
  const allFS = await getList('Fee Structure', [], ['name', 'custom_branch', 'program', 'academic_year', 'total_amount'], 100);
  console.log('Total found:', allFS.length);
  // Group by branch
  const byBranch = {};
  for (const fs of allFS) {
    const b = fs.custom_branch || 'Unknown';
    if (!byBranch[b]) byBranch[b] = [];
    byBranch[b].push(fs.name);
  }
  console.log('By branch:', JSON.stringify(byBranch, null, 2));

  // 5. All Sales Orders for Fort Kochi
  console.log('\n--- 5. All Sales Orders for Fort Kochi ---');
  const fkoSO = await getList('Sales Order',
    [['custom_branch', 'like', '%Fort%']],
    ['name', 'customer', 'customer_name', 'status', 'grand_total', 'transaction_date'],
    50
  );
  console.log('Count:', fkoSO.length);
  console.log(JSON.stringify(fkoSO, null, 2));

  // Try by FKO abbreviation
  const fkoSO2 = await getList('Sales Order',
    [['custom_branch', 'like', '%FKO%']],
    ['name', 'customer', 'customer_name', 'status', 'grand_total', 'transaction_date'],
    50
  );
  console.log('FKO abbreviation count:', fkoSO2.length);
  console.log(JSON.stringify(fkoSO2, null, 2));

  // 6. All Students in Fort Kochi
  console.log('\n--- 6. All Fort Kochi Students ---');
  const fkoStudents = await getList('Student',
    [['custom_branch', '=', 'Smart Up Fortkochi']],
    ['name', 'student_name', 'custom_branch', 'enabled', 'custom_demo',
     'custom_student_type', 'joining_date', 'custom_srr_id'],
    100
  );
  console.log('Total FKO students:', fkoStudents.length);
  console.log(JSON.stringify(fkoStudents, null, 2));

  // 7. Look at an existing PE from another branch to understand structure (e.g., Palluruthy)
  console.log('\n--- 7. Sample PE from another branch (Palluruthy) ---');
  const samplePE = await getList('Program Enrollment',
    [['custom_branch', 'like', '%Palluruthy%']],
    ['name', 'student', 'student_name', 'program', 'custom_branch', 'custom_fee_structure',
     'custom_no_of_instalments', 'custom_billing_start_date', 'custom_demo', 'docstatus', 'academic_year'],
    5
  );
  console.log(JSON.stringify(samplePE, null, 2));
  if (samplePE.length > 0) {
    const fullPE = await getDoc('Program Enrollment', samplePE[0].name);
    console.log('Full PE:', JSON.stringify({
      name: fullPE.name,
      program: fullPE.program,
      custom_fee_structure: fullPE.custom_fee_structure,
      custom_no_of_instalments: fullPE.custom_no_of_instalments,
      custom_billing_start_date: fullPE.custom_billing_start_date,
      custom_demo: fullPE.custom_demo,
      academic_year: fullPE.academic_year,
      enrollment_date: fullPE.enrollment_date,
    }, null, 2));
  }

  // 8. Items for Fort Kochi (all items, look for FKO in name)
  console.log('\n--- 8. Items search for Fort/FKO ---');
  const itemsFort = await getList('Item',
    [['custom_branch', 'like', '%Fort%']],
    ['name', 'item_name', 'item_group', 'custom_branch'],
    50
  );
  console.log('Fort items:', JSON.stringify(itemsFort, null, 2));

  // Also search items linked to any FKO student SO
  // 9. Customer record for Sana
  console.log('\n--- 9. Customer record: SANA FATHIMA TS ---');
  const custDoc = await getDoc('Customer', 'SANA FATHIMA TS');
  console.log(JSON.stringify(custDoc, null, 2));

  console.log('\n=== INFRASTRUCTURE STUDY COMPLETE ===');
}

main().catch(console.error);
