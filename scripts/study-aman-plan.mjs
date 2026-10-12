const newInvs = [
  { no: 1, due: '2026-04-15', rate: 2100 },
  { no: 2, due: '2026-05-15', rate: 2100 },
  { no: 3, due: '2026-06-15', rate: 2100 },
  { no: 4, due: '2026-07-15', rate: 2100 },
  { no: 5, due: '2026-08-15', rate: 2100 },
  { no: 6, due: '2026-09-15', rate: 2100 },
  { no: 7, due: '2026-10-15', rate: 2100 },
  { no: 8, due: '2026-11-15', rate: 1600 },
];

const payments = [
  { name: 'ACC-PAY-2026-04105', date: '2026-04-07', amount: 1000, mode: 'Cash', ref: 'CASH-1775573325081' },
  { name: 'ACC-PAY-2026-06263-1', date: '2026-06-26', amount: 2000, mode: 'Bank Transfer', ref: '617782237057' },
  { name: 'ACC-PAY-2026-06264-1', date: '2026-06-26', amount: 100, mode: 'Bank Transfer', ref: '617709939352' },
  { name: 'ACC-PAY-2026-06141', date: '2026-06-27', amount: 1100, mode: 'Cash', ref: 'CASH-1782521918122' },
  { name: 'ACC-PAY-2026-06142', date: '2026-06-27', amount: 2400, mode: 'Cash', ref: '1000' },
  { name: 'ACC-PAY-2026-07078-1', date: '2026-07-27', amount: 2000, mode: 'Bank Transfer', ref: '620851100939' },
  { name: 'ACC-PAY-2026-07079-1', date: '2026-07-27', amount: 100, mode: 'Bank Transfer', ref: '657466396268' },
  { name: 'ACC-PAY-2026-08013', date: '2026-08-28', amount: 2000, mode: 'Bank Transfer', ref: '660681057426' },
  { name: 'ACC-PAY-2026-08014', date: '2026-08-28', amount: 100, mode: 'Bank Transfer', ref: '660627841537' },
];

// Sort payments chronologically:
payments.sort((a, b) => a.date.localeCompare(b.date));

let invIdx = 0;
let invRemain = newInvs[0].rate;

const plan = [];

for (const p of payments) {
  let pRemain = p.amount;
  const pAllocs = [];
  while (pRemain > 0 && invIdx < newInvs.length) {
    const take = Math.min(pRemain, invRemain);
    pAllocs.push({ invNo: newInvs[invIdx].no, amount: take });
    pRemain -= take;
    invRemain -= take;
    if (invRemain === 0) {
      invIdx++;
      if (invIdx < newInvs.length) invRemain = newInvs[invIdx].rate;
    }
  }
  plan.push({ pe: p.name, amount: p.amount, date: p.date, mode: p.mode, allocs: pAllocs });
}

console.log('ALLOCATION PLAN:');
console.log(JSON.stringify(plan, null, 2));

console.log('\nFINAL INVOICE STATUSES:');
let totalCovered = 10800;
newInvs.forEach(inv => {
  const paid = Math.min(inv.rate, Math.max(0, totalCovered));
  totalCovered -= paid;
  const out = inv.rate - paid;
  console.log(`Inst ${inv.no}: Rate ₹${inv.rate}, Paid ₹${paid}, Out ₹${out}`);
});
