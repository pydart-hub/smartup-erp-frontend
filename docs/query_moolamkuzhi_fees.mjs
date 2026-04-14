const base = 'https://smartup.m.frappe.cloud';
const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json' };

async function query(endpoint) {
  const r = await fetch(base + endpoint, { headers });
  const d = await r.json();
  return d.data;
}

async function main() {
  // 1. Get all Fee Structures for Moolamkuzhi
  console.log('=== FEE STRUCTURES (Moolamkuzhi) ===');
  const feeStructures = await query(
    '/api/resource/Fee Structure?filters=[["company","=","Smart Up Moolamkuzhi"]]&fields=["name","program","academic_year","academic_term","company"]&limit_page_length=100&order_by=name asc'
  );
  console.log(JSON.stringify(feeStructures, null, 2));
  console.log('Total Fee Structures:', feeStructures?.length);

  // 2. Get all Programs linked to Moolamkuzhi
  console.log('\n=== PROGRAMS (Moolamkuzhi) ===');
  const programs = await query(
    '/api/resource/Program?filters=[["company","=","Smart Up Moolamkuzhi"]]&fields=["name","program_name","program_abbreviation","department","is_published"]&limit_page_length=100'
  );
  console.log(JSON.stringify(programs, null, 2));
  console.log('Total Programs:', programs?.length);

  // 3. Get all Courses that might relate to 8th class
  console.log('\n=== COURSES with "8" in name ===');
  const courses8 = await query(
    '/api/resource/Course?filters=[["course_name","like","%8%"]]&fields=["name","course_name","department"]&limit_page_length=100'
  );
  console.log(JSON.stringify(courses8, null, 2));

  // 4. Check Fee Categories 
  console.log('\n=== FEE CATEGORIES ===');
  const feeCategories = await query(
    '/api/resource/Fee Category?limit_page_length=100&fields=["name","description"]'
  );
  console.log(JSON.stringify(feeCategories, null, 2));

  // 5. Get details of each Moolamkuzhi fee structure (with components)
  if (feeStructures?.length > 0) {
    console.log('\n=== DETAILED FEE STRUCTURES ===');
    for (const fs of feeStructures) {
      const detail = await query(`/api/resource/Fee Structure/${encodeURIComponent(fs.name)}`);
      console.log(`\n--- ${fs.name} ---`);
      console.log('Program:', detail.program);
      console.log('Academic Year:', detail.academic_year);
      console.log('Academic Term:', detail.academic_term);
      console.log('Components:', JSON.stringify(detail.components, null, 2));
    }
  }
}

main().catch(console.error);
