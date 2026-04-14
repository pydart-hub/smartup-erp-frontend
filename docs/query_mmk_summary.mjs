const base = 'https://smartup.m.frappe.cloud';
const headers = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2', 'Content-Type': 'application/json' };

async function query(endpoint) {
  const r = await fetch(base + endpoint, { headers });
  const d = await r.json();
  return d.data;
}

async function main() {
  // 1. All Fee Structure names for Moolamkuzhi
  const feeStructures = await query(
    '/api/resource/Fee Structure?filters=[["company","=","Smart Up Moolamkuzhi"]]&fields=["name","program","academic_year"]&limit_page_length=200&order_by=program asc'
  );
  
  console.log('=== ALL MOOLAMKUZHI FEE STRUCTURES IN BACKEND ===');
  console.log('Total:', feeStructures?.length);
  
  // Group by program
  const byProgram = {};
  for (const fs of feeStructures) {
    if (!byProgram[fs.program]) byProgram[fs.program] = [];
    byProgram[fs.program].push(fs.name);
  }
  
  for (const [prog, names] of Object.entries(byProgram).sort()) {
    console.log(`\n${prog} (${names.length} structures):`);
    names.sort().forEach(n => console.log(`  - ${n}`));
  }
  
  // 2. Check if "8th" program exists
  console.log('\n\n=== PROGRAMS WITH "8" IN NAME (ALL COMPANIES) ===');
  const prog8 = await query(
    '/api/resource/Program?filters=[["program_name","like","%8%"]]&fields=["name","program_name","company","is_published"]&limit_page_length=100'
  );
  console.log(JSON.stringify(prog8, null, 2));
  
  // 3. Check for "8th State" specifically
  console.log('\n=== PROGRAMS WITH "8th" IN NAME (ALL COMPANIES) ===');
  const prog8th = await query(
    '/api/resource/Program?filters=[["program_name","like","%8th%"]]&fields=["name","program_name","company","is_published"]&limit_page_length=100'
  );
  console.log(JSON.stringify(prog8th, null, 2));
  
  // 4. Check all programs for Moolamkuzhi
  console.log('\n=== ALL MOOLAMKUZHI PROGRAMS ===');
  const mmkPrograms = await query(
    '/api/resource/Program?filters=[["company","=","Smart Up Moolamkuzhi"]]&fields=["name","program_name","is_published"]&limit_page_length=100'
  );
  console.log(JSON.stringify(mmkPrograms, null, 2));
  
  // 5. Check Fee Category for 8th
  console.log('\n=== FEE CATEGORIES WITH "8" ===');
  const feecat8 = await query(
    '/api/resource/Fee Category?filters=[["name","like","%8%"]]&fields=["name"]&limit_page_length=100'
  );
  console.log(JSON.stringify(feecat8, null, 2));
  
  // 6. Check all fee structures for 8th State in ANY company
  console.log('\n=== FEE STRUCTURES WITH "8th" IN NAME (ALL COMPANIES) ===');
  const fs8th = await query(
    '/api/resource/Fee Structure?filters=[["name","like","%8th%"]]&fields=["name","program","company","academic_year"]&limit_page_length=100'
  );
  console.log(JSON.stringify(fs8th, null, 2));
  
  // 7. Also check for "8 State" pattern
  console.log('\n=== FEE STRUCTURES WITH "8 State" IN PROGRAM (ALL COMPANIES) ===');
  const fs8state = await query(
    '/api/resource/Fee Structure?filters=[["program","like","%8%State%"]]&fields=["name","program","company","academic_year"]&limit_page_length=100'
  );
  console.log(JSON.stringify(fs8state, null, 2));
}

main().catch(console.error);
