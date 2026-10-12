// Allocation plan for Muhammed Nihal M A
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
  { name: 'ACC-PAY-2026-04075', date: '2026-04-07', amount: 2100 },
  { name: 'ACC-PAY-2026-05685', date: '2026-06-09', amount: 2100 },
  { name: 'ACC-PAY-2026-06265', date: '2026-06-30', amount: 1500 },
  { name: 'ACC-PAY-2026-06266', date: '2026-06-30', amount: 600 },
  { name: 'ACC-PAY-2026-07636', date: '2026-08-13', amount: 1800 },
  { name: 'ACC-PAY-2026-07637', date: '2026-08-13', amount: 300 },
  { name: 'ACC-PAY-2026-08198', date: '2026-09-01', amount: 2100 },
  { name: 'ACC-PAY-2026-09728', date: '2026-10-07', amount: 2100 },
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
let totalCovered = 12600;
newInvs.forEach(inv => {
  const paid = Math.min(inv.rate, Math.max(0, totalCovered));
  totalCovered -= paid;
  const out = inv.rate - paid;
  console.log(`Inst ${inv.no}: Rate ₹${inv.rate}, Paid ₹${paid}, Out ₹${out}`);
});
