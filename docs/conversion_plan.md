# Implementation Plan: Convert Mohammed Bilal to Basic Fee Structure (8 Instalments)

## Student Summary
- **Student Name:** Mohammed bilal
- **Student ID:** `STU-SU THP-26-103`
- **Customer:** `Mohammed bilal`
- **Branch:** Smart Up Thopumpadi (`SU THP`)
- **Course / Batch:** 12th Science State (`Thopumpadi 26-27`)
- **Current Incorrect Plan:** Advanced 8-Instalment (`SU THP-12th Science State-Advanced-8` — ₹31,000)
- **Target Plan:** Basic 8-Instalment (`SU THP-12th Science State-Basic-8` — ₹19,000)

## Payment Entries (To be Preserved Intact)
All posting dates and payment modes remain strictly unchanged:
1. `ACC-PAY-2026-05471` (Date: 2026-06-03, Mode: Cash, Amount: ₹3,300)
2. `ACC-PAY-2026-05473` (Date: 2026-06-03, Mode: Cash, Amount: ₹800)
3. `ACC-PAY-2026-06361` (Date: 2026-07-04, Mode: Razorpay, Amount: ₹2,500)
4. `ACC-PAY-2026-07578` (Date: 2026-08-12, Mode: CoFee, Amount: ₹3,300)
**Total Collected:** ₹9,900

## Target Invoice Schedule (SU THP-12th Science State-Basic-8 — ₹19,000)
- Inst 1: Due `2026-06-03` — ₹2,500 (Covered by ₹2,500 from `ACC-PAY-2026-05471`) → **Paid**
- Inst 2: Due `2026-07-03` — ₹2,500 (Covered by ₹800 rem. `ACC-PAY-2026-05471` + ₹800 `ACC-PAY-2026-05473` + ₹900 `ACC-PAY-2026-06361`) → **Paid**
- Inst 3: Due `2026-08-03` — ₹2,500 (Covered by ₹1,600 rem. `ACC-PAY-2026-06361` + ₹900 `ACC-PAY-2026-07578`) → **Paid**
- Inst 4: Due `2026-09-03` — ₹2,500 (Covered by ₹2,400 rem. `ACC-PAY-2026-07578`) → **Partially Paid (Outstanding ₹100)**
- Inst 5: Due `2026-10-03` — ₹2,500 → **Unpaid**
- Inst 6: Due `2026-11-03` — ₹2,500 → **Unpaid**
- Inst 7: Due `2026-12-03` — ₹2,500 → **Unpaid**
- Inst 8: Due `2027-01-03` — ₹1,500 → **Unpaid**

## Execution Steps
1. Unlink references on Payment Entries (temporarily clear invoice links so invoices can be modified/cancelled).
2. Cancel old Sales Invoices `ACC-SINV-2026-09172` through `ACC-SINV-2026-09179`.
3. Cancel & update old Sales Order `SAL-ORD-2026-01246` (or create new Sales Order for Basic 8 instalments ₹19,000).
4. Create & Submit 8 new Basic Sales Invoices corresponding to the Basic fee schedule.
5. Re-link the 4 Payment Entries to the new invoices (allocating the ₹9,900 across Inst 1, 2, 3, and 4) with zero change to payment dates or payment modes.
6. Update Program Enrollment `PEN-12sc state-Thopumpadi 26-27-103` to `custom_plan: "Basic"` and `custom_fee_structure: "SU THP-12th Science State-Basic-8"`.
