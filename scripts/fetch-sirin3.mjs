const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function get(path) {
  const r = await fetch(BASE + path, { headers: { Authorization: AUTH } });
  return r.json();
}

// 1. Fee Structure details for 9th State Basic 6
const fs = await get('/api/resource/Fee Structure/SU PLR-9th State-Basic-6');
console.log('=== 9TH STATE BASIC-6 FEE STRUCTURE ===');
console.log(JSON.stringify(fs.data, null, 2));

// 2. 9th State program courses
const prog = await get('/api/resource/Program/9th State');
console.log('\n=== 9TH STATE PROGRAM ===');
console.log(JSON.stringify(prog.data, null, 2));

// 3. Paid invoice details
const inv = await get('/api/resource/Sales Invoice/ACC-SINV-2026-03520');
console.log('\n=== PAID INVOICE DETAILS ===');
console.log(JSON.stringify(inv.data, null, 2));

// 4. Payment entries for the paid invoice
const pe = await get('/api/resource/Payment Entry?filters=[["Payment Entry Reference.reference_doctype","=","Sales Invoice"],["Payment Entry Reference.reference_name","=","ACC-SINV-2026-03520"]]&fields=["name","payment_type","paid_amount","docstatus"]');
console.log('\n=== PAYMENT ENTRIES FOR PAID INVOICE ===');
console.log(JSON.stringify(pe.data, null, 2));

// 5. One unpaid invoice to see structure
const inv2 = await get('/api/resource/Sales Invoice/ACC-SINV-2026-03521');
console.log('\n=== UNPAID INVOICE SAMPLE ===');
console.log(JSON.stringify(inv2.data, null, 2));
