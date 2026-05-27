// Deep study - check raw API responses

const h = { 'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2' };
const base = 'https://smartup.m.frappe.cloud';

async function get(url) {
  const r = await fetch(base + url, { headers: h });
  const text = await r.text();
  try { return JSON.parse(text); }
  catch(e) { return { _raw: text.substring(0, 500) }; }
}

async function main() {
  const studentId = 'STU-SU FKO-26-011';
  const studentName = 'GLANIA PHILIP';

  // Try program enrollment with no field filter first
  console.log('=== Program Enrollment (no fields filter) ===');
  const pe = await get(`/api/resource/Program Enrollment?filters=[["student","=","${studentId}"]]&limit=5`);
  console.log(JSON.stringify(pe, null, 2));

  console.log('\n=== Course Enrollment (no fields filter) ===');
  const ce = await get(`/api/resource/Course Enrollment?filters=[["student","=","${studentId}"]]&limit=5`);
  console.log(JSON.stringify(ce, null, 2));

  // Sales invoice with customer
  console.log('\n=== Sales Invoice by customer ===');
  const si = await get(`/api/resource/Sales Invoice?filters=[["customer","=","${studentName}"]]&limit=5`);
  console.log(JSON.stringify(si, null, 2));

  // Check custom fee schedule doctype
  console.log('\n=== SmartUp Fee Schedule ===');
  const fs = await get(`/api/resource/SmartUp Fee Schedule?filters=[["student","=","${studentId}"]]&limit=5`);
  console.log(JSON.stringify(fs, null, 2));

  // Try Student Fee Structure
  console.log('\n=== Student Fee Structure ===');
  const sfs = await get(`/api/resource/Student Fee Structure?filters=[["student","=","${studentId}"]]&limit=5`);
  console.log(JSON.stringify(sfs, null, 2));

  // Try Fee Category
  console.log('\n=== Fee Category list ===');
  const fc = await get(`/api/resource/Fee Category?limit=20`);
  console.log(JSON.stringify(fc, null, 2));
  
  // List available doctypes - check if there's a custom fee plan doctype
  console.log('\n=== DocType list (custom) ===');
  const dt = await get(`/api/resource/DocType?filters=[["custom","=","1"],["name","like","%fee%"]]&fields=["name"]&limit=30`);
  console.log(JSON.stringify(dt, null, 2));
}

main().catch(console.error);
