import https from 'https';

function rawGet(path) {
  // Encode any spaces in the path (but not in query params that are already encoded)
  const safePath = path.replace(/ /g, '%20');
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'smartup.m.frappe.cloud',
      path: safePath,
      method: 'GET',
      headers: { Authorization: 'token 03330270e330d49:9c2261ae11ac2d2' },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve({ _raw: data.slice(0, 200) }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

const STU_ID = 'STU-SU FKO-26-091';

async function main() {
  console.log('=== SANA FATHIMA TS — Correct URL Investigation ===\n');

  // 1. All PE for this student (only safe fields)
  console.log('--- 1. Program Enrollments (minimal fields) ---');
  const pe1 = await rawGet(`/api/resource/Program Enrollment?filters=[["student","=","${STU_ID}"]]&fields=["name","student","student_name","program","academic_year","enrollment_date","docstatus"]&limit_page_length=20`);
  console.log(JSON.stringify(pe1.data, null, 2));

  // 2. PE with more fields  
  console.log('\n--- 2. PE with fee fields ---');
  const pe2 = await rawGet(`/api/resource/Program Enrollment?filters=[["student","=","${STU_ID}"]]&fields=["name","student","student_name","program","academic_year","enrollment_date","custom_fee_structure","custom_no_of_instalments","custom_billing_start_date","docstatus"]&limit_page_length=20`);
  console.log(JSON.stringify(pe2.data, null, 2));
  if (pe2.exception) console.log('Exception:', pe2.exc_type, pe2._server_messages);

  // 3. ALL Fort Kochi students
  console.log('\n--- 3. All Fort Kochi Students ---');
  const students = await rawGet(`/api/resource/Student?filters=[["custom_branch","=","Smart Up Fortkochi"]]&fields=["name","student_name","custom_branch","enabled","joining_date","custom_srr_id","custom_student_type"]&limit_page_length=200`);
  console.log('Count:', students.data?.length);
  console.log(JSON.stringify(students.data, null, 2));

  // 4. ALL PE for Fort Kochi (by student field only, no custom fields)
  console.log('\n--- 4. All Program Enrollments (unfiltered, last 50) ---');
  const allPE = await rawGet(`/api/resource/Program Enrollment?fields=["name","student","student_name","program","academic_year","docstatus"]&limit_page_length=200&order_by=creation desc`);
  console.log('Count:', allPE.data?.length);
  if (allPE.data) {
    // Find FKO ones
    const fkoPE = allPE.data.filter(p => p.student && p.student.includes('FKO'));
    console.log('FKO PEs:', JSON.stringify(fkoPE, null, 2));
  }
  if (allPE.exception) console.log('Exception:', allPE.exc_type);

  // 5. Sales Orders for this student
  console.log('\n--- 5. Sales Orders for STU-SU FKO-26-091 ---');
  const so = await rawGet(`/api/resource/Sales Order?filters=[["customer","=","${STU_ID}"]]&fields=["name","customer","customer_name","status","grand_total","advance_paid","transaction_date","docstatus"]&limit_page_length=20`);
  console.log(JSON.stringify(so.data, null, 2));
  if (so.exception) console.log('Exception:', so.exc_type);

  // 6. Sales Invoices for this student
  console.log('\n--- 6. Sales Invoices ---');
  const sinv = await rawGet(`/api/resource/Sales Invoice?filters=[["customer","=","${STU_ID}"]]&fields=["name","customer","customer_name","status","grand_total","outstanding_amount","due_date","posting_date","docstatus"]&limit_page_length=50`);
  console.log(JSON.stringify(sinv.data, null, 2));
  if (sinv.exception) console.log('Exception:', sinv.exc_type);

  // 7. All Fee Structures
  console.log('\n--- 7. All Fee Structures ---');
  const fs = await rawGet(`/api/resource/Fee Structure?fields=["name","program","academic_year","total_amount"]&limit_page_length=200`);
  console.log('Count:', fs.data?.length);
  if (fs.data) {
    console.log(JSON.stringify(fs.data, null, 2));
  }
  if (fs.exception) console.log('Exception:', fs.exc_type);
  if (fs._raw) console.log('Raw:', fs._raw);

  // 8. All Programs
  console.log('\n--- 8. All Programs ---');
  const progs = await rawGet(`/api/resource/Program?fields=["name","program_name","department"]&limit_page_length=200`);
  console.log('Count:', progs.data?.length);
  console.log(JSON.stringify(progs.data, null, 2));
  if (progs.exception) console.log('Exception:', progs.exc_type);

  // 9. Sample PE from another branch (no custom fields - for comparison)
  console.log('\n--- 9. Sample PE from Palluruthy (for comparison) ---');
  const samplePE = await rawGet(`/api/resource/Program Enrollment?filters=[["student","like","STU-SU PLR%"]]&fields=["name","student","student_name","program","academic_year","enrollment_date","custom_fee_structure","custom_no_of_instalments","custom_billing_start_date","docstatus"]&limit_page_length=3`);
  console.log(JSON.stringify(samplePE.data, null, 2));
  if (samplePE.exception) console.log('Exception:', samplePE.exc_type);

  console.log('\n=== INVESTIGATION COMPLETE ===');
}

main().catch(console.error);
