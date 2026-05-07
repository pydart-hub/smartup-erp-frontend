const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function get(path) {
  const r = await fetch(BASE + path, { headers: { Authorization: AUTH } });
  return r.json();
}

const sid = 'STU-SU PLR-26-024';

// Sales Orders linked via customer
const soByCustomer = await get('/api/resource/Sales Order?filters=[["customer","=","Sirin Fathima"]]&fields=["name","status","grand_total","docstatus","creation","custom_program","custom_batch"]&order_by=creation desc&limit=10');
console.log('=== SALES ORDERS (by customer) ===');
console.log(JSON.stringify(soByCustomer.data, null, 2));

// Sales Invoices
const si = await get('/api/resource/Sales Invoice?filters=[["customer","=","Sirin Fathima"]]&fields=["name","status","grand_total","docstatus","outstanding_amount","creation"]&order_by=creation desc&limit=10');
console.log('\n=== SALES INVOICES ===');
console.log(JSON.stringify(si.data, null, 2));

// Available 9th Grade programs
const prog9 = await get('/api/resource/Program?filters=[["name","like","%9th%"]]&fields=["name","program_abbreviation"]');
console.log('\n=== 9TH PROGRAMS ===');
console.log(JSON.stringify(prog9.data, null, 2));

// Available fee structures for 9th in Palluruthy
const fs9 = await get('/api/resource/Fee Structure?filters=[["name","like","%PLR%9th%"]]&fields=["name","program","components","academic_year"]');
console.log('\n=== 9TH FEE STRUCTURES (PLR) ===');
console.log(JSON.stringify(fs9.data, null, 2));

// Available Student Groups for 9th in Palluruthy
const sg9 = await get('/api/resource/Student Group?filters=[["name","like","%Palluruthy%"],["name","like","%9th%"]]&fields=["name","program","batch","academic_year","custom_branch","max_strength"]');
console.log('\n=== 9TH STUDENT GROUPS (Palluruthy) ===');
console.log(JSON.stringify(sg9.data, null, 2));
