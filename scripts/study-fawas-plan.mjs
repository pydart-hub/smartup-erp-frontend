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
  { name: 'ACC-PAY-2026-04031', date: '2026-04-06', amount: 2000, mode: 'Cash' },
  { name: 'ACC-PAY-2026-06234', date: '2026-06-30', amount: 100, mode: 'Cash' },
  { name: 'ACC-PAY-2026-06235', date: '2026-06-30', amount: 2100, mode: 'Cash' },
  { name: 'ACC-PAY-2026-06236', date: '2026-06-30', amount: 300, mode: 'Cash' },
  { name: 'ACC-PAY-2026-09233', date: '2026-09-28', amount: 1800, mode: 'Cash' },
  { name: 'ACC-PAY-2026-09234', date: '2026-09-28', amount: 700, mode: 'Cash' },
];

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
  plan.push({ pe: p.name, amount: p.amount, date: p.date, allocs: pAllocs });
}

console.log('ALLOCATION PLAN:');
console.log(JSON.stringify(plan, null, 2));

console.log('\nFINAL INVOICE STATUSES:');
let totalCovered = 7000;
newInvs.forEach(inv => {
  const paid = Math.min(inv.rate, Math.max(0, totalCovered));
  totalCovered -= paid;
  const out = inv.rate - paid;
  console.log(`Inst ${inv.no}: Rate ₹${inv.rate}, Paid ₹${paid}, Out ₹${out}`);
});
