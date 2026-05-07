const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function get(path) {
  const r = await fetch(BASE + path, { headers: { Authorization: AUTH } });
  return r.json();
}

// Sales Order
const so = await get('/api/resource/Sales Order/SAL-ORD-2026-00361');
console.log('=== SALES ORDER ===');
const soData = so.data;
console.log('Name:', soData?.name, '| Status:', soData?.status, '| docstatus:', soData?.docstatus);
console.log('Grand Total:', soData?.grand_total, '| Advance Paid:', soData?.advance_paid);
console.log('Items count:', soData?.items?.length);
if (soData?.items) {
  soData.items.forEach(i => console.log('  -', i.item_code, i.qty, i.rate, i.amount, '| SO:', i.name));
}

// Payment Entries for Sirin
const pe = await get('/api/resource/Payment Entry?filters=[["party","=","Sirin Fathima"],["party_type","=","Customer"]]&fields=["name","payment_type","paid_amount","docstatus","mode_of_payment","creation","references"]&order_by=creation desc&limit=10');
console.log('\n=== PAYMENT ENTRIES ===');
console.log(JSON.stringify(pe.data, null, 2));

// Journal Entries
const je = await get('/api/resource/Journal Entry?filters=[["accounts.party","=","Sirin Fathima"]]&fields=["name","docstatus","total_debit","creation","user_remark"]&order_by=creation desc&limit=5');
console.log('\n=== JOURNAL ENTRIES ===');
console.log(JSON.stringify(je.data, null, 2));

// Check the create-invoices route to understand instalment structure
console.log('\n=== INSTALMENT BREAKDOWN (17300 / 6) ===');
const total = 17300;
const n = 6;
const base = Math.floor(total / n);
const last = total - base * (n-1);
for (let i = 1; i <= n; i++) {
  console.log('Inst', i, ':', i < n ? base : last);
}
