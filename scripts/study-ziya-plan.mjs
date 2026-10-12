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
  { name: 'ACC-PAY-2026-04136', date: '2026-04-08', amount: 2000, mode: 'Cash', ref: 'CASH-1775659303860' },
  { name: 'ACC-PAY-2026-08511', date: '2026-09-08', amount: 2100, mode: 'Cash', ref: 'CASH-1788842874291' },
  { name: 'ACC-PAY-2026-08512', date: '2026-09-08', amount: 100, mode: 'Cash', ref: 'CASH-1788842898393' },
  { name: 'ACC-PAY-2026-08513', date: '2026-09-08', amount: 2100, mode: 'Cash', ref: 'CASH-1788842916939' },
  { name: 'ACC-PAY-2026-08514', date: '2026-09-08', amount: 1700, mode: 'Cash', ref: 'CASH-1788842941738' },
];

// Total paid: 2000 + 2100 + 100 + 2100 + 1700 = 8000
const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
console.log('Total paid:', totalPaid);

// Allocation sequentially against new installments:
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
let totalCovered = totalPaid;
newInvs.forEach(inv => {
  const paid = Math.min(inv.rate, Math.max(0, totalCovered));
  totalCovered -= paid;
  const out = inv.rate - paid;
  console.log(`Inst ${inv.no} (${inv.due}): Rate ₹${inv.rate}, Paid ₹${paid}, Outstanding ₹${out} -> ${out === 0 ? 'PAID' : (paid > 0 ? 'PARTLY PAID' : 'UNPAID')}`);
});
