const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
async function get(path) {
  const res = await fetch(BASE + path, { headers: { Authorization: AUTH, Accept: 'application/json' } });
  return res.json();
}

const student = 'STU-SU CHL-26-056';
const customer = 'RUMAIS RAZEEM';

// Check for Sales Invoices
const si = await get('/api/resource/Sales Invoice?' + new URLSearchParams({
  fields: JSON.stringify(['name','docstatus','grand_total','customer']),
  filters: JSON.stringify([['customer','=',customer]]),
  limit_page_length: '10'
}));
console.log('Sales Invoices:', JSON.stringify(si?.data));

// Check for Payment Entries
const pe = await get('/api/resource/Payment Entry?' + new URLSearchParams({
  fields: JSON.stringify(['name','docstatus','paid_amount','party']),
  filters: JSON.stringify([['party','=',customer]]),
  limit_page_length: '10'
}));
console.log('Payment Entries:', JSON.stringify(pe?.data));

// Check for Student Batch memberships
const sb = await get('/api/resource/Student Batch Student?' + new URLSearchParams({
  fields: JSON.stringify(['name','student','student_name','parent']),
  filters: JSON.stringify([['student','=',student]]),
  limit_page_length: '10'
}));
console.log('Student Batch memberships:', JSON.stringify(sb?.data));

// Check for Fee Schedules
const fs = await get('/api/resource/Fee Schedule Student?' + new URLSearchParams({
  fields: JSON.stringify(['name','student','student_name','parent']),
  filters: JSON.stringify([['student','=',student]]),
  limit_page_length: '10'
}));
console.log('Fee Schedule entries:', JSON.stringify(fs?.data));
