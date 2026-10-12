# Implementation Plan: Live Branch Account Ledger Balances (GL Entry)

## Context & User Goal
The user wants to display live GL Entry ledger balances for their specific branch on the Branch Manager Fees page:
- **Cash in Hand / Cash Account** (e.g. `Cash In Hand - SU KDV` and `Cash - SU KDV` with exact Dr/Cr amount)
- **UPI Account** (e.g. `UPI - SU KDV - SU KDV` with Dr/Cr amount)
- **Bank Transfer / Entity Account** (e.g. `SMARTUP LEARNING VENTURES...` or the branch's specific LLP bank account)
- **Requirements**:
  - Live data from Frappe backend (no hardcoded accounts or amounts).
  - Only show the user's branch data based on `defaultCompany`.
  - Display with proper Dr/Cr indicators and account names matching the Chart of Accounts.

---

## Proposed Changes

### 1. New API Route: `src/app/api/fees/branch-ledger-balances/route.ts`
- Authenticates session and derives user's branch / `company`.
- Queries Frappe `Account` resource for the specific branch:
  - Cash leaf account (`account_type = 'Cash'`, `is_group = 0`) & parent (`Cash In Hand - ...`)
  - UPI account (`account_name` matching UPI or name matching UPI, `is_group = 0`)
  - Bank entity account (non-Razorpay, non-UPI bank account, `is_group = 0`)
- Queries Frappe `GL Entry` for each account to get real-time `sum(debit)` and `sum(credit)` where `is_cancelled = 0`.
- Calculates net balance: `debit - credit`. If positive -> `Dr`, if negative -> `Cr`.
- Returns clean JSON with `{ cash, cash_parent, upi, bank, company }`.

### 2. Frontend Updates in `src/app/dashboard/branch-manager/fees/page.tsx`
- Add query / fetch hook for `/api/fees/branch-ledger-balances?company=...`.
- Render a new card section **"Account Ledger Balances (GL Entry)"**:
  - Card 1: **Cash In Hand**
    - Leaf account: e.g. `Cash - SU KDV`
    - Parent group: e.g. `Cash In Hand - SU KDV`
    - Live Balance: e.g. `₹ 13,850.00 Dr`
  - Card 2: **UPI Account**
    - Account: e.g. `UPI - SU KDV - SU KDV`
    - Live Balance: e.g. `₹ 37,710.00 Dr`
  - Card 3: **Bank Transfer**
    - Account: e.g. `SMARTUP LEARNING VENTURES PRIVATE LIMITED - SU KDV`
    - Live Balance with Dr/Cr notation.
- Include a manual refresh trigger icon and auto-fetch so the data is always fresh.

---

## Verification
- [x] Run test query against the API with different branch names (`Smart Up Kadavanthara`, `Smart Up Chullickal`, etc.) to confirm dynamic discovery.
- [x] Run `npx tsc --noEmit` to verify type safety (passed with 0 errors).
- [x] Verify API security authentication guard (401 without valid session).
- [x] Validated live Frappe calculation matches Chart of Accounts tree directly (₹13,850.00 Dr).
