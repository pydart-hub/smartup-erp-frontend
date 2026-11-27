# Task: Director Fees Overview — Accuracy Audit & Excel Report Export

## Status: COMPLETED & VERIFIED

## Deep Audit Findings (Verified Against Live Frappe Data)
1. **Branch Card Pending vs Top Summary Pending Mismatch (`₹1,32,610` gap)**:
   - `SummaryCards` (`src/app/dashboard/director/fees/page.tsx`): `Pending = Total Outstanding - Forfeited = ₹96,69,698` (true unpaid active invoice balance).
   - `BranchFeeCard` & `BranchFeesPage`: previously used `Total Invoiced - PE Collected - Forfeited = ₹95,37,088` because `PE Collected` (`₹1,88,06,827`) exceeded `Invoice Settled` (`₹1,86,74,217`) by `₹1,32,610` (`₹1,28,410` unallocated / cross-branch PEs + `₹4,200` duplicate invoice allocation in Chullickal).
2. **Dues Till Today (`₹45,98,422`) Leaked `₹19,800` From Discontinued Student**:
   - `STU-SU PLR-26-160` (`Reyone C F`, Palluruthy) had `enabled = 0` with `custom_discontinuation_date = null`, so `dues-till-today` failed to exclude her `₹19,800` overdue balance.

## Completed Implementation
- [x] 1. Fixed calculation consistency across UI and APIs:
  - [x] Updated `BranchFeeCard` Pending (`src/app/dashboard/director/fees/page.tsx`) and `BranchFeesPage` Pending (`src/app/dashboard/director/branches/[id]/fees/page.tsx`) to `(invoiceStats?.totalOutstanding ?? 0) - forfeited`.
  - [x] Updated `getDiscontinuedCustomers` in `src/app/api/fees/dues-till-today/route.ts` to filter `enabled = 0` with pagination (removes the `₹19,800` leak; true total `₹45,78,622`).
  - [x] Paginated `getBranchCollectedByMode` in `src/lib/api/director.ts`.
- [x] 2. Built `GET /api/director/fees-overview-export` (`src/app/api/director/fees-overview-export/route.ts`) using `exceljs` with a single `Branch Fees` sheet matching the Fees Overview page columns (`Branch`, `Students`, `Total Fees`, `Collected`, `Pending`, `Forfeited`, `Dues Today`, `Collection %`) + `TOTAL` row, and fixed Row 1 title banner overwrite by setting `sheet.columns` without `header`.
- [x] 3. Added `Download Excel Report` button to `/dashboard/director/fees` (`src/app/dashboard/director/fees/page.tsx`).
- [x] 4. Verified with `npx tsc --noEmit`, ESLint on changed files, and live ExcelJS generation & read-back verification.
