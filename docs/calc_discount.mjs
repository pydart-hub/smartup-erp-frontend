// Let's analyze both interpretations for 10% of total fees:
// Total Fees = 16,900
// 10% of Total = 1,690

// 1st installment already paid = 5,900.

// Option A: 10% discount of total (₹1,690) applied fully onto the 2nd Installment:
// Inst 1: ₹5,900 (Paid)
// Inst 2: ₹4,200 - ₹1,690 = ₹2,510
// Inst 3: ₹4,200
// Inst 4: ₹2,600
// Total: ₹15,210 (16,900 - 1,690)

// Option B: 10% discount across all remaining installments, or 10% flat across all 4 installments.
console.log({
  total: 16900,
  discount: 1690,
  revised_total: 16900 - 1690,
  option_A_inst2_deducted: 4200 - 1690
});
