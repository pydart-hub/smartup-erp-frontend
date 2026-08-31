// Current situation for Henock Joseph:
// Already Paid:
// - ACC-PAY-2026-04400: ₹2,500 (against Inst 1)
// - ACC-PAY-2026-07771: ₹1,700 (against Inst 1) -> Inst 1 had total ₹4,200 paid.
// - ACC-PAY-2026-07772: ₹300 (against Inst 2) -> Total paid across student = ₹4,500.

// New Structure: SU THP-10th State-Basic-6 (Total: ₹17,400)
// Standard breakdown for Basic-6:
// Inst 1: ₹3,000 (15-Apr-2026)
// Inst 2: ₹3,000 (15-Jun-2026)
// Inst 3: ₹3,000 (15-Aug-2026)
// Inst 4: ₹3,000 (15-Oct-2026)
// Inst 5: ₹3,000 (15-Dec-2026)
// Inst 6: ₹2,400 (15-Feb-2027)
// Total = ₹17,400

// Since student has already paid ₹4,500:
// - Inst 1 (₹3,000): Fully covered by ₹3,000.
// - Inst 2 (₹3,000): Partially covered with remaining ₹1,500 paid (₹4,500 - ₹3,000).
//   -> Inst 2 Outstanding will be: ₹3,000 - ₹1,500 = ₹1,500.
// - Inst 3: ₹3,000 Unpaid
// - Inst 4: ₹3,000 Unpaid
// - Inst 5: ₹3,000 Unpaid
// - Inst 6: ₹2,400 Unpaid
// Total Outstanding remaining = ₹17,400 - ₹4,500 = ₹12,900.
console.log({
  totalPaid: 4500,
  inst1: 3000, // fully paid
  inst2Paid: 1500,
  inst2Outstanding: 1500,
  inst3_6Total: 3000 + 3000 + 3000 + 2400,
  totalRemaining: 1500 + 3000 + 3000 + 3000 + 2400
});
