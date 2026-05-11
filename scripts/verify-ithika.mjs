const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

async function get(path) {
  const r = await fetch(BASE + path, { headers: { Authorization: AUTH } });
  return r.json();
}

// Fetch each known invoice directly
const knownInvoices = [
  'ACC-SINV-2026-05482',  // demo invoice (already paid)
  'ACC-SINV-2026-07158',  // Inst 2
  'ACC-SINV-2026-07159',  // Inst 3
  'ACC-SINV-2026-07160',  // Inst 4
  'ACC-SINV-2026-07161',  // Inst 5
  'ACC-SINV-2026-07162',  // Inst 7
  'ACC-SINV-2026-07163',  // Inst 8 (final, ₹1401)
  'ACC-SINV-2026-07164',  // Inst 1 (past, posted today)
  'ACC-SINV-2026-07165',  // Inst 6
];

console.log('\n=== ITHIKA SAJU — INVOICE VERIFICATION ===\n');
let grandTotal = 0;
let outstanding = 0;

for (const name of knownInvoices) {
  const d = await get('/api/resource/Sales Invoice/' + name);
  const inv = d.data;
  if (!inv) { console.log(name + ' → NOT FOUND'); continue; }
  const flag = inv.outstanding_amount > 0 ? '⚠️ OUTSTANDING' : '✓ PAID';
  console.log(`${name} | ₹${inv.grand_total} | due ${inv.due_date} | ${inv.status} | ${flag}`);
  grandTotal += inv.grand_total;
  outstanding += inv.outstanding_amount;
}

console.log('\n─────────────────────────────────────────');
console.log('Total invoiced:    ₹' + grandTotal.toFixed(2));
console.log('Total outstanding: ₹' + outstanding.toFixed(2));
console.log('Total paid:        ₹' + (grandTotal - outstanding).toFixed(2));
