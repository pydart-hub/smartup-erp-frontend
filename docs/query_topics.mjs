const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const headers = { 'Authorization': AUTH, 'Content-Type': 'application/json' };

async function main() {
  // 1. Get Topic doctype meta
  const r1 = await fetch(BASE + '/api/method/frappe.client.get_list?doctype=DocField&filters=[["parent","=","Topic"],["parenttype","=","DocType"]]&fields=["fieldname","fieldtype","label","options","reqd"]&limit_page_length=50&order_by=idx asc', { headers });
  const j1 = await r1.json();
  console.log('=== TOPIC DOCTYPE FIELDS ===');
  console.log(JSON.stringify(j1.message, null, 2));

  // 2. Get Course Activity doctype meta
  const r2 = await fetch(BASE + '/api/method/frappe.client.get_list?doctype=DocField&filters=[["parent","=","Course Activity"],["parenttype","=","DocType"]]&fields=["fieldname","fieldtype","label","options","reqd"]&limit_page_length=50&order_by=idx asc', { headers });
  const j2 = await r2.json();
  console.log('\n=== COURSE ACTIVITY DOCTYPE FIELDS ===');
  console.log(JSON.stringify(j2.message, null, 2));

  // 3. Get Course Topic child table meta
  const r3 = await fetch(BASE + '/api/method/frappe.client.get_list?doctype=DocField&filters=[["parent","=","Course Topic"],["parenttype","=","DocType"]]&fields=["fieldname","fieldtype","label","options","reqd"]&limit_page_length=50&order_by=idx asc', { headers });
  const j3 = await r3.json();
  console.log('\n=== COURSE TOPIC CHILD TABLE FIELDS ===');
  console.log(JSON.stringify(j3.message, null, 2));

  // 4. Student Group - check instructor assignment structure
  const r4 = await fetch(BASE + '/api/method/frappe.client.get_list?doctype=DocField&filters=[["parent","=","Student Group Instructor"],["parenttype","=","DocType"]]&fields=["fieldname","fieldtype","label","options","reqd"]&limit_page_length=50', { headers });
  const j4 = await r4.json();
  console.log('\n=== STUDENT GROUP INSTRUCTOR FIELDS ===');
  console.log(JSON.stringify(j4.message, null, 2));

  // 5. Check Student Branch Transfer doctype (custom approval pattern)
  const r5 = await fetch(BASE + '/api/method/frappe.client.get_list?doctype=DocField&filters=[["parent","=","Student Branch Transfer"],["parenttype","=","DocType"]]&fields=["fieldname","fieldtype","label","options","reqd"]&limit_page_length=80&order_by=idx asc', { headers });
  const j5 = await r5.json();
  console.log('\n=== STUDENT BRANCH TRANSFER FIELDS ===');
  console.log(JSON.stringify(j5.message, null, 2));

  // 6. Check if there's a custom "Syllabus" or "Part" doctype
  const r6 = await fetch(BASE + '/api/resource/DocType?filters=[["name","like","%Part%"]]&fields=["name","module","istable"]&limit_page_length=20', { headers });
  const j6 = await r6.json();
  console.log('\n=== DOCTYPES MATCHING "Part" ===');
  console.log(JSON.stringify(j6.data, null, 2));

  // 7. Check for Syllabus/Progress doctypes
  const r7 = await fetch(BASE + '/api/resource/DocType?filters=[["name","like","%Syllabus%"]]&fields=["name","module","istable"]&limit_page_length=20', { headers });
  const j7 = await r7.json();
  console.log('\n=== DOCTYPES MATCHING "Syllabus" ===');
  console.log(JSON.stringify(j7.data, null, 2));

  // 8. Check for Progress doctypes
  const r8 = await fetch(BASE + '/api/resource/DocType?filters=[["name","like","%Progress%"]]&fields=["name","module","istable"]&limit_page_length=20', { headers });
  const j8 = await r8.json();
  console.log('\n=== DOCTYPES MATCHING "Progress" ===');
  console.log(JSON.stringify(j8.data, null, 2));

  // 9. Check Student Group doc structure for context
  const r9 = await fetch(BASE + '/api/method/frappe.client.get_list?doctype=DocField&filters=[["parent","=","Student Group"],["parenttype","=","DocType"]]&fields=["fieldname","fieldtype","label","options","reqd"]&limit_page_length=80&order_by=idx asc', { headers });
  const j9 = await r9.json();
  console.log('\n=== STUDENT GROUP FIELDS ===');
  console.log(JSON.stringify(j9.message, null, 2));
}

main().catch(e => console.error(e));
