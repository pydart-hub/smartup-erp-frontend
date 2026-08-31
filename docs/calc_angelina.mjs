// Basic 4 Breakdown for 10th State in Thopumpadi (Total: ₹16,900):
// Standard 4 installments (as in Akmal: SU THP-10th State-Basic-4):
// Inst 1: ₹5,900 (15-Apr-2026)
// Inst 2: ₹4,200 (15-Jul-2026)
// Inst 3: ₹4,200 (15-Oct-2026)
// Inst 4: ₹2,600 (15-Jan-2027)
// Total = ₹16,900

// Angelina has ALREADY paid: ₹8,300 on Inst 1 (ACC-PAY-2026-03945).
// In Basic 4, Inst 1 is ₹5,900.
// Excess paid on Inst 1 = ₹8,300 - ₹5,900 = ₹2,400.
// When ₹2,400 credit is applied to Inst 2 (₹4,200):
// Inst 2 net bill = ₹4,200 - ₹2,400 = ₹1,800.

// Check total course fee with this adjustment:
// Inst 1: ₹8,300 (Paid)
// Inst 2: ₹1,800 (Due)
// Inst 3: ₹4,200 (Due)
// Inst 4: ₹2,600 (Due)
// Total = 8,300 + 1,800 + 4,200 + 2,600 = ₹16,900!
// Remaining outstanding = 1,800 + 4,200 + 2,600 = ₹8,600!

console.log({
  totalBasic4: 16900,
  alreadyPaid: 8300,
  excessFromInst1: 8300 - 5900,
  inst2Adjusted: 4200 - (8300 - 5900),
  inst3: 4200,
  inst4: 2600,
  totalRemainingDue: 1800 + 4200 + 2600,
  reductionInTotalFee: 23700 - 16900
});
