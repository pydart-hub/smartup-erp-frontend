import https from 'https';

function rawGet(path) {
  return new Promise((resolve, reject) => {
    const url = `https://smartup.m.frappe.cloud${path}`;
    const req = https.request(url, {
      method: 'GET',
      headers: { Authorization: 'token 03330270e330d49:9c2261ae11ac2d2' },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve({ error: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

const STU_ID = 'STU-SU FKO-26-091';
const enc = encodeURIComponent;

async function main() {
  console.log('=== SANA FATHIMA TS — Raw URL Investigation ===\n');

  // 1. All PE for this student (all docstatuses)
  console.log('--- 1. Program Enrollments (all docstatuses) ---');
  const pe1 = await rawGet(`/api/resource/Program Enrollment?filters=[["student","=","${STU_ID}"]]&fields=["name","student","student_name","program","custom_branch","custom_fee_structure","custom_no_of_instalments","custom_billing_start_date","custom_demo","docstatus","academic_year","enrollment_date"]&limit_page_length=20`);
  console.log(JSON.stringify(pe1, null, 2));

  // 2. Program Enrollment with docstatus filter via method
  console.log('\n--- 2. PE via frappe.client.get_list (all) ---');
  const pe2 = await rawGet(`/api/method/frappe.client.get_list?doctype=Program%20Enrollment&filters=[["student","=","${STU_ID}"]]&fields=["name","docstatus","custom_demo","program","custom_fee_structure"]&limit_page_length=20`);
  console.log(JSON.stringify(pe2, null, 2));

  // 3. ALL Fort Kochi students
  console.log('\n--- 3. All Fort Kochi Students ---');
  const students = await rawGet(`/api/resource/Student?filters=[["custom_branch","=","Smart Up Fortkochi"]]&fields=["name","student_name","custom_branch","enabled","custom_demo","custom_student_type","joining_date","custom_srr_id"]&limit_page_length=100`);
  console.log('Count:', students.data?.length);
  console.log(JSON.stringify(students.data, null, 2));

  // 4. ALL PE for any Fort Kochi student
  console.log('\n--- 4. All Program Enrollments for Fort Kochi ---');
  const fkoPE = await rawGet(`/api/resource/Program Enrollment?filters=[["custom_branch","=","Smart Up Fortkochi"]]&fields=["name","student","student_name","program","custom_fee_structure","custom_demo","docstatus"]&limit_page_length=100`);
  console.log('Count:', fkoPE.data?.length);
  console.log(JSON.stringify(fkoPE.data, null, 2));

  // 5. All Sales Orders for this student
  console.log('\n--- 5. Sales Orders for STU-SU FKO-26-091 ---');
  const so = await rawGet(`/api/resource/Sales Order?filters=[["customer","=","${STU_ID}"]]&fields=["name","customer","customer_name","status","grand_total","advance_paid","transaction_date","custom_branch","per_billed","docstatus"]&limit_page_length=20`);
  console.log(JSON.stringify(so.data, null, 2));

  // 6. All Fee Structures (all, no filter)
  console.log('\n--- 6. All Fee Structures ---');
  const fs = await rawGet(`/api/resource/Fee Structure?fields=["name","custom_branch","program","academic_year","total_amount"]&limit_page_length=200`);
  console.log('Count:', fs.data?.length);
  // Group by branch
  if (fs.data) {
    const byBranch = {};
    for (const f of fs.data) {
      const b = f.custom_branch || 'Unknown';
      if (!byBranch[b]) byBranch[b] = [];
      byBranch[b].push(f.name);
    }
    console.log('By branch:', JSON.stringify(byBranch, null, 2));
  }

  // 7. All Programs
  console.log('\n--- 7. All Programs ---');
  const progs = await rawGet(`/api/resource/Program?fields=["name","program_name","custom_branch","department"]&limit_page_length=200`);
  console.log('Count:', progs.data?.length);
  console.log(JSON.stringify(progs.data, null, 2));

  // 8. Check if there's a demo PE in docstatus=2 (cancelled)
  console.log('\n--- 8. Cancelled/Amended PEs for FKO student ---');
  const cancelledPE = await rawGet(`/api/method/frappe.client.get_list?doctype=Program%20Enrollment&filters=[["student","=","${STU_ID}"],["docstatus","=",2]]&fields=["name","docstatus","custom_demo","program","custom_fee_structure"]&limit_page_length=20`);
  console.log(JSON.stringify(cancelledPE, null, 2));

  // 9. Check full student doc for custom_demo field specifically
  console.log('\n--- 9. Full Student Doc fields for 091 ---');
  const stuFull = await rawGet(`/api/resource/Student/${enc(STU_ID)}`);
  console.log('custom_demo:', stuFull.data?.custom_demo);
  console.log('custom_demo_converted:', stuFull.data?.custom_demo_converted);
  console.log('custom_student_type:', stuFull.data?.custom_student_type);
  
  // 10. Demo PEs for Fort Kochi
  console.log('\n--- 10. Demo PEs for any Fort Kochi student ---');
  const demoPE = await rawGet(`/api/resource/Program Enrollment?filters=[["custom_demo","=",1],["custom_branch","=","Smart Up Fortkochi"]]&fields=["name","student","student_name","program","custom_fee_structure","custom_demo","docstatus"]&limit_page_length=50`);
  console.log(JSON.stringify(demoPE.data, null, 2));

  console.log('\n=== RAW INVESTIGATION COMPLETE ===');
}

main().catch(console.error);
