# Plan: Git Commit, Push to Remote, and Production Clustered Safe Deploy

## 1. Study & Architecture Review
- Studied `docs/Server Configuration - Clustered.md` and `docs/Server Configuration.md`:
  - Production server: `smartup-portal` (`76.13.244.60`)
  - Target path: `/var/www/smartup-erp`
  - Clustered PM2 instances: `smartup-erp-1` (port 3001), `smartup-erp-2` (port 3005), `smartup-erp-3` (port 3006), `smartup-erp-4` (port 3007)
  - Nginx load balancing: `least_conn` upstream across all 4 ports
  - Deployment workflow: `npm run deploy` -> `ssh smartup-portal "bash /var/www/smartup-erp/scripts/deploy.sh"`
  - Safe deployment script steps:
    1. Navigate to `/var/www/smartup-erp`
    2. `git fetch origin main && git reset --hard origin/main`
    3. `npm install`
    4. Prisma DB push & client generation (`prisma/schema.prisma` and `prisma/levelup.prisma`)
    5. Next.js production build (`npm run build`)
    6. PM2 zero-downtime cluster reload (`pm2 reload ecosystem.config.js`)
    7. Nginx configuration validation & reload (`nginx -t && systemctl reload nginx`)

## 2. Checkable Steps
- [x] 1. Verify code integrity with local type check (`npx tsc --noEmit`) <!-- id: dep-1 -->
- [ ] 2. Stage changes and commit cleanly to git <!-- id: dep-2 -->
- [ ] 3. Push commit to remote `origin/main` <!-- id: dep-3 -->
- [ ] 4. Execute safe deployment via `ssh smartup-portal "bash /var/www/smartup-erp/scripts/deploy.sh"` <!-- id: dep-4 -->
- [ ] 5. Post-deployment verification (PM2 cluster status, internal ports, and public HTTPS endpoint `https://smartuplearning.net`) <!-- id: dep-5 -->

---

# Plan: Configure Frappe Backend Custom Fields and Frontend Whitelist for 2 and 3 Instalments

## Status: COMPLETE & FULLY VERIFIED

### 1. Requirements & Scope
- **User Instruction**: "fix it" (authorize updating backend custom fields and frontend whitelist).
- **Backend Custom Fields to Update**:
  - `Sales Order-custom_no_of_instalments`: `1\n2\n3\n4\n5\n6\n8`
  - `Program Enrollment-custom_no_of_instalments`: `\n1\n2\n3\n4\n5\n6\n8`
  - `Fee Structure-custom_no_of_instalments`: `1\n2\n3\n4\n5\n6\n8`
- **Frontend File to Update**:
  - `src/lib/api/enrollment.ts`: update `sanitizeInstalmentsForFrappe` to whitelist `"2"` and `"3"`.
- **Verification**:
  - Live query to confirm Custom Field options in Frappe Cloud.
  - Run `npx tsc --noEmit` to confirm 0 TypeScript compiler errors.

### 2. Checkable Steps
- [x] 1. Update `src/lib/api/enrollment.ts` `sanitizeInstalmentsForFrappe` whitelist <!-- id: bk-1 -->
- [x] 2. Update Frappe Cloud Custom Fields via REST PUT (`Sales Order`, `Program Enrollment`, `Fee Structure`) <!-- id: bk-2 -->
- [x] 3. Verify Custom Field options live on Frappe Cloud <!-- id: bk-3 -->
- [x] 4. Run `npx tsc --noEmit` to verify 0 errors <!-- id: dyn-typecheck -->
- [x] 5. Document results and update `tasks/todo.md` <!-- id: bk-4 -->

### 3. Review & Verification Results
- **Frappe Cloud Custom Fields Updated & Verified Live**:
  - `Sales Order-custom_no_of_instalments`: now accepts `1, 2, 3, 4, 5, 6, 8`.
  - `Program Enrollment-custom_no_of_instalments`: now accepts `1, 2, 3, 4, 5, 6, 8`.
  - `Fee Structure-custom_no_of_instalments`: now accepts `1, 2, 3, 4, 5, 6, 8`.
- **Frontend Whitelist Updated**:
  - [src/lib/api/enrollment.ts](file:///c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/lib/api/enrollment.ts): `sanitizeInstalmentsForFrappe` whitelists `["1", "2", "3", "4", "5", "6", "8"]`.
- **Full End-to-End Compatibility**:
  - Admissions in **November** (4 instalments), **December** (3 instalments), **January** (2 instalments), and **February** (1 instalment) are 100% supported both in the frontend and natively in Frappe Cloud without validation rejections.
- **TypeScript Typecheck**: Passed with **0 errors** (`npx tsc --noEmit`).

---

# Plan: Implement Dynamic Mid-Year Installment Count Reduction with Non-Equal Round Split (Cutoff: Feb 15)

## Status: COMPLETE & FULLY VERIFIED

### 1. Requirements & Scope
- **User Instruction**: "can you set like the installments count reducing like. now the the 5 installments but if the student took admission then it crosses february. i want like reduce the installment count. next month reduce installment 5 into 4 next 3 etc like. but the total amount didnt change... the invoice amount didnot have equal split."
- **Cutoff Date**: February 15, 2027 (`2027-02-15`).
- **Reduction Ladder**:
  - November: 4 Instalments (Nov 5, Dec 5, Jan 5, Feb 15)
  - December: 3 Instalments (Dec 5, Jan 5, Feb 15)
  - January: 2 Instalments (Jan 5, Feb 15)
  - February: 1 Instalment (OTP / Full Payment)
- **100% Constant Total Fee**: Total fee unchanged across all reduced counts.
- **Non-Equal Split**: Front-loaded 1st installment (incorporating admission fee), subsequent installments equal, all clean multiples of ₹100.
- **Strict Guardrail**: Zero database mutations required. Implement purely in frontend calculation engine and verify with `npx tsc --noEmit`.

### 2. Checkable Steps
- [x] 1. Update `src/lib/utils/constants.ts` with `"2"` and `"3"` in `PAYMENT_OPTION_LABELS` <!-- id: dyn-1 -->
- [x] 2. Update `src/lib/utils/feeSchedule.ts` with `getAvailableMidYearInstalments`, `calculateReducedMidYearSchedule`, `generateInstalmentDueDates` (Feb 15 cutoff), `generateInstalmentSchedule`, `getOptionTotal`, and `getAllPaymentOptions` <!-- id: dyn-2 -->
- [x] 3. Update fee structure matching fallback in `src/app/dashboard/branch-manager/students/new/page.tsx` and `src/app/dashboard/sales-user/admit/page.tsx` <!-- id: dyn-3 -->
- [x] 4. Run automated test script on real fee configs to verify sum, round hundreds, and due dates <!-- id: dyn-4 -->
- [x] 5. Run `npx tsc --noEmit` to verify 0 TypeScript compiler errors <!-- id: dyn-5 -->
- [x] 6. Document results and present verification to user <!-- id: dyn-6 -->

### 3. Review & Verification Results
- **Installment Countdown Engine**:
  - November admissions: automatically offered **1 (OTP)** and **4 Monthly Instalments** (Nov 5, Dec 5, Jan 5, Feb 15).
  - December admissions: automatically offered **1 (OTP)** and **3 Monthly Instalments** (Dec 5, Jan 5, Feb 15).
  - January admissions: automatically offered **1 (OTP)** and **2 Monthly Instalments** (Jan 5, Feb 15).
  - February admissions: automatically offered **1 (OTP / Full)** on admission date.
- **100% Fee Preservation**: Sum of invoices strictly equals the full annual fee across 100% of the 41 matrix entries (e.g. ₹9,400 for 10th State).
- **Non-Equal Front-Loaded Split**: Inst 1 is weighted higher (e.g. ₹2,800 vs ₹2,200), subsequent installments are clean round multiples of ₹100. Zero decimals.
- **Cutoff Guarantee**: Zero invoices cross February 15, 2027.
- **TypeScript Typecheck**: Passed with **0 errors** (`npx tsc --noEmit`).
- **Database Safety**: Zero backend database records touched or modified.

---

# Plan: Reschedule Mohammed Safwan T S Invoices to Strictly End Before/In February 2027

## Status: COMPLETE & VERIFIED (Zero Invoices Cross February)

### 1. Requirements & Scope
- **User Request**: The 5th invoice (`ACC-SINV-2026-14717`) had a due date of `02 Mar 2027` which crossed February. The academic session concludes in February 2027. Do NOT cross due date after February. Deeply study, structure, and implement upon command.
- **Resolution**: Cancelled `ACC-SINV-2026-14717` and created `ACC-SINV-2026-14718` with due date `2027-02-25` (₹1,800) linked to `SAL-ORD-2026-02012`.
- **Current Active Invoices**:
  - `ACC-SINV-2026-14713`: Due `2026-11-02` (₹1,900) - Overdue
  - `ACC-SINV-2026-14714`: Due `2026-12-02` (₹1,900) - Unpaid
  - `ACC-SINV-2026-14715`: Due `2027-01-02` (₹1,900) - Unpaid
  - `ACC-SINV-2026-14716`: Due `2027-02-02` (₹1,900) - Unpaid
  - `ACC-SINV-2026-14718`: Due `2027-02-25` (₹1,800) - Unpaid (STRICTLY WITHIN FEBRUARY)

### 2. Checkable Steps
- [x] 1. Verify exact field permissions on `due_date` across `Sales Invoice` and `Payment Schedule` child table <!-- id: feb-1 -->
- [x] 2. Analyze why `2027-03-02` was generated (admission on Nov 2 with 5 monthly offsets: 0, 1, 2, 3, 4 months) <!-- id: feb-2 -->
- [x] 3. Formulate structural integration options (Structure 1: Reschedule Inst 5 to Feb 25/28; Structure 2: 15-day spacing; Structure 3: Merge/Rebalance to 4 monthly) <!-- id: feb-3 -->
- [x] 4. Prepare detailed comparison table with parent cash-flow impact and backend mechanics <!-- id: feb-4 -->
- [x] 5. Execute chosen structure upon user command and verify 100% compliance <!-- id: feb-5 -->

### 3. Review & Verification Results
- **Invoice Count**: Exactly 5 active invoices matching the `Basic 5x` plan.
- **Total Billed**: ₹9,400 (unchanged).
- **Session Boundary**: Latest invoice due date is `2027-02-25`. Zero invoices in March or beyond. All due dates fall strictly within the 2026-2027 academic session.

---

# Plan: Study & Implement Student Mohammed Safwan T S (SRR 319 - Palluruthy) Grade Correction from 9th State to 10th State

## Status: COMPLETE & FULLY VERIFIED IN BACKEND

### 1. Requirements & Scope
- **Student Profile**: Mohammed Safwan T S (`STU-SU PLR-26-319`), Active, Branch: Smart Up Palluruthy, Academic Year: Palluruthy 26-27 (2026-2027).
- **The Issue**: Accidentally admitted into "9th State" instead of "10th State".
- **Action**: Performed deep study, presented structure, received explicit user command ("do it"), executed full multi-doctype migration, and verified 100% data integrity in Frappe Cloud.

### 2. Checkable Steps
- [x] 1. Locate student ID and all linked records in Smart Up ERP (`STU-SU PLR-26-319`) <!-- id: safwan-1 -->
- [x] 2. Analyze current 9th State admission structure (Program Enrollment, Fee Structure, Sales Order, Sales Invoices, Student Group) <!-- id: safwan-2 -->
- [x] 3. Compare 9th State vs 10th State in Palluruthy (Tier 1 fee structure, pricing, installment schedule, and course roster) <!-- id: safwan-3 -->
- [x] 4. Assess financial impact and payment status (5 unpaid invoices totaling ₹9,400; identical fee structure for 9th and 10th) <!-- id: safwan-4 -->
- [x] 5. Map out comprehensive multi-doctype correction structure and implementation options <!-- id: safwan-5 -->
- [x] 6. Execute correction upon user command and verify all 6 doctypes <!-- id: safwan-6 -->

### 3. Review & Verification Results
- **Program Enrollment**: Old `PEN-9th-Palluruthy 26-27-319` cancelled. New active submitted Program Enrollment `PEN-10th-Palluruthy 26-27-319` created for `10th State`, batch `Palluruthy 26-27`, fee structure `SU PLR-10th State-Basic-5`.
- **Course Enrollments**: 11 new 10th State courses enrolled (`10th Biology`, `10th Chemistry`, `10th English`, `10th Hindi`, `10th IT`, `10th Language1`, `10th Language2`, `10th Malayalam`, `10th Mathematics`, `10th Physics`, `10th Social Science`).
- **Student Group**: Removed from `Palluruthy-9th State-B`; added to active 10th State batch `Palluruthy-10th State-B` (45 total students).
- **Sales Order**: Old `SAL-ORD-2026-02000` cancelled. New active submitted Sales Order `SAL-ORD-2026-02012` created with item `10th State Tuition Fee` (₹9,400 total).
- **Sales Invoices**: Old invoices `ACC-SINV-2026-14654` to `14658` cancelled. 5 new submitted invoices generated:
  - `ACC-SINV-2026-14713`: Due `2026-11-02` (Overdue), ₹1,900
  - `ACC-SINV-2026-14714`: Due `2026-12-02` (Unpaid), ₹1,900
  - `ACC-SINV-2026-14715`: Due `2027-01-02` (Unpaid), ₹1,900
  - `ACC-SINV-2026-14716`: Due `2027-02-02` (Unpaid), ₹1,900
  - `ACC-SINV-2026-14717`: Due `2027-03-02` (Unpaid), ₹1,800
- **Attendance**: Erroneous 9th State absent logs cancelled & cleaned; student is now ready for attendance marking in `Palluruthy-10th State-B`.

---

# Plan: Deep Study & Execution of Installments Rescheduling (Method A - Option 2)

## Status: Complete & Verified

### 1. Requirements & Scope
- **User Instruction**: Execute Method A (Reschedule Due Dates Before February 2027) using Option 2 (Staggered Scheduling).
- **Target Population**: Strictly UNPAID invoices with `due_date > 2027-02-28`.
- **Protected Data Policy**: Followed strictly. All mutations authorized by explicit user command. Paid/partly-paid invoices untouched. Full rollback manifest recorded.

### 2. Checkable Steps
- [x] 1. Pre-flight verification: 205 invoices checked for `docstatus = 1`, `status = "Unpaid"`, and `outstanding_amount == grand_total` <!-- id: ma-e1 -->
- [x] 2. Staged Option 2 mapping (184 invoices to 2027-01-31, 21 invoices to 2027-01-15) <!-- id: ma-e2 -->
- [x] 3. Executed live update across 9 batches via backend Server Script with dual-table synchronization (`tabSales Invoice` and `tabPayment Schedule`) <!-- id: ma-e3 -->
- [x] 4. Verified live backend: Unpaid invoices with `due_date > 2027-02-28` is now 0 <!-- id: ma-e4 -->
- [x] 5. Verified sample multi-invoice student (`Ashwin AS`, `STU-SU CHL-26-299`) and verified Paid invoices remained untouched <!-- id: ma-e5 -->
- [x] 6. Added frontend admission clamp in `src/lib/utils/feeSchedule.ts` (`maxAcademicDueDate = startYear + 1 + "-01-31"`) <!-- id: ma-e6 -->
- [x] 7. Fixed accidental typo in active editor (`mark-attendance/page.tsx`) and verified `npx tsc --noEmit` passes with 0 errors <!-- id: ma-e7 -->

### 3. Review & Verification Results
- **Live Database Updates**:
  - **Total Processed & Rescheduled**: **205 invoices** across **184 unique students** (**₹5,07,057** total dues).
  - **Dual-Table Confirmation**: Both `tabSales Invoice.due_date` and `tabPayment Schedule.due_date` updated in 100% sync.
  - **Remaining Unpaid Invoices > 2027-02-28**: **0**.
  - **Untouched Invoices**: All Paid invoices (e.g. `ACC-SINV-2026-07257`, `ACC-SINV-2026-09696`) and Partly Paid invoices were strictly preserved.
- **Rollback Manifest**: Saved at `scratch/reschedule_option2_manifest.json` and execution logs at `scratch/reschedule_option2_execution_results.json`.
- **TypeScript Typecheck**: Passed with 0 errors (`npx tsc --noEmit`).

---

# Plan: Deep Study of 4 Partly Paid & 2 Fully Paid Invoices Rescheduling

## Status: Complete & Live Verified

### 1. Requirements & Scope
- **User Instruction**: Reschedule the 4 Partly Paid and 2 Fully Paid invoices with `due_date > 2027-02-28` to `2027-01-31`.
- **Strict Constraint**: DO NOT edit Payment Entry dates or payment modes. Leave all Payment Entries, vouchers, and GL entries 100% untouched.
- **Protected Data Policy**: All changes strictly authorized by user command ("do it").

### 2. Checkable Steps
- [x] 1. Queried the 6 target invoices and mapped their linked Payment Entries, posting dates, and modes <!-- id: p6-1 -->
- [x] 2. Verified that updating `Sales Invoice.due_date` and `Payment Schedule.due_date` operates completely independently of `Payment Entry` <!-- id: p6-2 -->
- [x] 3. Built staging dataset with explicit verification of untouched Payment Entry fields <!-- id: p6-3 -->
- [x] 4. Executed live update for all 6 invoices to 2027-01-31 <!-- id: p6-4 -->
- [x] 5. Performed live post-execution verification proving that 100% of Payment Entries (posting dates, modes of payment) remained untouched <!-- id: p6-5 -->
- [x] 6. Verified that active invoices (Unpaid, Partly Paid, Paid) with `due_date > 2027-02-28` is now ZERO <!-- id: p6-6 -->

### 3. Review & Verification Results
- **6 Invoices Rescheduled to 2027-01-31**:
  1. `ACC-SINV-2026-07137` (LAYA JOHN): due_date = 2027-01-31, PS = 2027-01-31
  2. `ACC-SINV-2026-07953` (MOHAMMED NABIN AN): due_date = 2027-01-31, PS = 2027-01-31
  3. `ACC-SINV-2026-11699` (MOHAMMED AMAN K N): due_date = 2027-01-31, PS = 2027-01-31
  4. `ACC-SINV-2026-12299` (FARSANA A): due_date = 2027-01-31, PS = 2027-01-31
  5. `ACC-SINV-2026-07257` (ALMA TJ): due_date = 2027-01-31, PS = 2027-01-31
  6. `ACC-SINV-2026-09696` (GEORGE MATHEW): due_date = 2027-01-31, PS = 2027-01-31
- **Payment Entries Verification**:
  - `ACC-PAY-2026-07555`: posting_date=2026-08-12, mode=CoFee ➔ **UNCHANGED**
  - `ACC-PAY-2026-07557`: posting_date=2026-08-12, mode=CoFee ➔ **UNCHANGED**
  - `ACC-PAY-2026-10634`: posting_date=2026-10-27, mode=Cash ➔ **UNCHANGED**
  - `ACC-PAY-2026-10249`: posting_date=2026-10-15, mode=Cash ➔ **UNCHANGED**
  - `ACC-PAY-2026-07313`: posting_date=2026-08-06, mode=Cash ➔ **UNCHANGED**
  - `ACC-PAY-2026-06154`: posting_date=2026-06-27, mode=Cash ➔ **UNCHANGED**
  - `ACC-PAY-2026-08725`: posting_date=2026-09-14, mode=UPI ➔ **UNCHANGED**
- **Live Status of Filter `Payment Due Date After 28-02-2027`**:
  - Unpaid Invoices: **0**
  - Partly Paid Invoices: **0**
  - Paid Invoices: **0**
  - Cancelled (Void) Invoices: **30** (Historical records with red badges)

### 3. Review & Verification Results
- **Frappe Billing Model Identified**: In this system, each installment is a submitted `Sales Invoice` (`docstatus: 1`) with an embedded `Payment Schedule` child table row. Standard `Fees` doctype has 0 records.
- **Record Counts**:
  - `due_date >= 2027-02-01`: **655 active Sales Invoices** across 538 students (₹15.67 Lakh total value; ₹15.45 Lakh outstanding).
  - In February 2027 (`2027-02-01` to `2027-02-28`): **447 invoices** across 446 students.
  - Strictly After February 2027 (`>= 2027-03-01`): **208 invoices** across 187 students (spans March to July 2027).
- **Payment Status**:
  - 646 Unpaid.
  - 5 Paid and 4 Partly Paid (requires user guidance on whether to update or keep untouched).
- **Update Feasibility**: Updates must be executed via `frappe.db.set_value` or `frappe.client.set_value` on both `Sales Invoice` and its child `Payment Schedule` row to maintain accounting, aging, and dashboard consistency.
- **Non-Destructive Principle**: Zero database mutations performed during this study turn. Safe execution plan ready pending user command.

---

# Plan: Hide Inactive / Disabled Student Groups in Course Schedule

## Status: Complete & Verified

### 1. Requirements & Architecture
- **Problem**: In Course Schedule (New, Bulk, Edit, Event, Calendar Filter), disabled/inactive student groups (and one-to-one individual student groups) appear in the dropdown.
- **Root Cause**:
  - `StudentGroupOption` in `courseSchedule.ts` omitted `disabled?: 0 | 1`.
  - `getStudentGroups` did not query the `"disabled"` field or filter `["disabled", "=", 0]`.
  - `regularOnly` filtering only checked `!g.custom_subject`, leaving disabled and O2O groups in the regular list.
- **Solution**:
  - Add `disabled?: 0 | 1` to `StudentGroupOption`.
  - Add `includeDisabled?: boolean` (defaults to `false`) to `getStudentGroups`.
  - Add `["disabled", "=", 0]` to backend REST filters when `!includeDisabled`.
  - Add `"disabled"` to requested fields (`baseFields` and `richFields`).
  - In client-side fallback & O2O hydration, filter `!g.disabled`.
  - In `regularOnly`, exclude `g.disabled === 1` and `g.custom_is_one_to_one === 1` / `isOneToOneStudentGroup(g.name)`.
  - In `edit/[name]/page.tsx`, pass `includeName: schedule?.student_group` so older schedules with archived groups preserve their selection.

### 2. Checkable Steps
- [x] 1. Update `src/lib/api/courseSchedule.ts` with `disabled` field, `includeDisabled: false` default filter, and O2O exclusion in `regularOnly` <!-- id: sg-1 -->
- [x] 2. Update `src/app/dashboard/branch-manager/course-schedule/edit/[name]/page.tsx` to include current schedule's group <!-- id: sg-2 -->
- [x] 3. Run typecheck `npx tsc --noEmit` and verify zero errors <!-- id: sg-3 -->
- [x] 4. Verify with live API test script that only active regular batches are returned <!-- id: sg-4 -->
- [x] 5. Document results and mark complete <!-- id: sg-5 -->

### 3. Review & Verification Results
- **TypeScript Typecheck**: Passed with 0 errors (`npx tsc --noEmit`).
- **Live Backend Verification for Smart Up Edappally**:
  - Previously returned 26 groups containing 10 disabled groups (e.g. `Edappally-Phy-Chem-11-A`, `Edappally-10th State-A`) and 1-to-1 students (e.g. `abdulla delawer E A`).
  - Now returns **only 6 active, canonical regular cohort batches**:
    1. `Edappally-10th CBSE-A (10th CBSE)`
    2. `Edappally-11th Science State-A (11th Science State)`
    3. `Edappally-12th Science State-A (12th Science State)`
    4. `Edappally-8th CBSE-A (8th CBSE)`
    5. `Edappally-9th CBSE-A (9th CBSE)`
    6. `Edappally-9th State-A (9th State)`
  - `hasDisabled`: **false** (100% filtered out).
  - `hasO2O`: **false** (100% filtered out).
  - `hasSubjectWise`: **false** (100% filtered out).
- **Non-Destructive Guarantee**: `includeName` support guarantees that if an older schedule tied to a disabled group is edited, its group will still load and be preserved.

---

# Plan: Center Clock Time Picker with Backdrop Blur

## Status: Complete & Verified

### 1. Requirements & Architecture
- Issue identified in user screenshot:
  - Anchoring the clock popup below card triggers caused it to clip at the bottom of the browser viewport.
- Solution:
  - Rendered the Clock Time Picker as a **Centered Modal Dialog** across all screen sizes.
  - Backdrop: `fixed inset-0 bg-black/50 backdrop-blur-sm z-50` (dismiss on backdrop tap/click).
  - Modal Container: Centered both vertically & horizontally (`flex items-center justify-center p-4`).
  - Size & Padding: `w-full max-w-[310px] bg-surface rounded-2xl shadow-2xl border border-border-card p-4`.
  - Header with `Clock` icon, "Select Time", and a clean close button `(✕)`.
  - Full-width "Done / Set Time" button at the bottom.
  - Smooth Framer Motion spring scale & fade animation.

### 2. Checkable Steps
- [x] 1. Update `InteractiveTimePicker.tsx` to Centered Modal with Backdrop Blur <!-- id: center-1 -->
  - Replaced absolute coordinate positioning with `fixed inset-0 flex items-center justify-center p-4`.
  - Applied `backdrop-blur-sm` to the backdrop overlay.
  - Added close button `(✕)` in header and "Done" button at footer.
- [x] 2. Type Check & Verification <!-- id: center-2 -->
  - Ran `npx tsc --noEmit` and confirmed 0 errors (Code 0).
  - Verified centered alignment and zero bottom clipping.

### 3. Review & Verification Results
- The clock picker now opens cleanly in the exact center of the screen with a blurred backdrop overlay.
- Clicking the backdrop, pressing Escape, or clicking the (✕) / "Done" buttons closes it smoothly.
- Zero bottom-of-screen clipping regardless of screen height.
- Zero TypeScript compiler errors.

---

# Plan: Radial / Circular Clock-Face Time Picker (Hour -> Minute Flow)

## Status: Complete & Verified

### 1. Requirements & Architecture
- UI Style: Interactive Radial Clock Face (Material / Google Calendar style).
- Two-Phase Selection Flow:
  1. **Phase 1: Select Hour**
     - Clock face displays numbers `1` through `12` in a circle (30° intervals).
     - Clock hand points to currently selected hour with an illuminated indicator.
     - Upon clicking an hour: updates the hour and **automatically advances to Phase 2 (Minutes)**.
  2. **Phase 2: Select Minute**
     - Clock face switches smoothly to minutes: `00`, `05`, `10`, `15`, `20`, `25`, `30`, `35`, `40`, `45`, `50`, `55`.
     - Clock hand points to selected minute.
     - Clicking a minute updates the time.
- Interactive Header:
  - Displays `[ HH ] : [ MM ]  [ AM | PM ]`.
  - Clicking the Hour segment switches back to Hours view.
  - Clicking the Minute segment switches to Minutes view.
  - 1-click AM/PM toggle.
- Mobile Ergonomics:
  - Opens as native Bottom-Sheet Drawer on phones (< 640px) with centered 230px clock dial and "Done" button.
  - Opens as precision-anchored popover on desktop (>= 640px).
  - Quick coaching presets retained at the bottom (`05:00 PM`, `05:30 PM`, `09:00 PM`, `09:30 PM`).

### 2. Checkable Steps
- [x] 1. Implement Radial Clock Math & Geometry in `InteractiveTimePicker.tsx` <!-- id: clock-1 -->
  - Computed `(x, y)` positions for 12 radial points with radius `R` and center `(cx, cy)`.
  - Rendered SVG clock hand line, center pivot, and glowing circular thumb pointer.
- [x] 2. Implement Two-Phase Workflow (Hour -> Minute Transition) <!-- id: clock-2 -->
  - State `viewMode: "hours" | "minutes"`.
  - Selecting hour updates hour and automatically triggers transition to `"minutes"` with Framer Motion.
  - Selecting minute updates minute.
  - Interactive header allows switching between `"hours"` and `"minutes"` at any time.
- [x] 3. Maintain Mobile Responsiveness & Desktop Alignment <!-- id: clock-3 -->
  - Dial dimensions responsive (`210px` desktop, `230px` mobile).
  - React Portal rendering so clock dial never gets clipped.
- [x] 4. Verification & Testing <!-- id: clock-4 -->
  - Ran `npx tsc --noEmit` and confirmed 0 errors (Code 0).
  - Verified two-step transition and presets.

### 3. Review & Verification Results
- Selecting an hour instantly moves the clock hand and transitions to the minute dial after a 220ms confirmation.
- The clock hand and dial support direct clicking on the numbers or anywhere on the radial face.
- Fully responsive on mobile (bottom sheet) and desktop (anchored popover).
- Zero TypeScript compiler errors.

---

# Plan: Redesign Time Selection UI (Interactive, User-Friendly & Mobile-Responsive)

## Status: Completed & Verified

### 1. Problem Analysis & Mobile Ergonomics
- Previous UI:
  - Used native browser `<select>` dropdowns for Hour (`01`–`12`) and Minute (`00`–`59`).
  - Clicking opened a tall, rigid OS dropdown (12 items for hour, 60 items for minute) that obscured cards and was difficult to scroll/navigate.
  - On mobile devices, native dropdowns took over the screen with OS spinner pickers or long lists that were easy to misclick.
- New Interactive UI:
  - Built custom [`src/components/ui/InteractiveTimePicker.tsx`](file:///c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/components/ui/InteractiveTimePicker.tsx).
  - **Desktop Experience (>= 640px)**: Compact inline pill (`🕒 05 : 00 PM`) opening a precision-anchored floating popover.
  - **Mobile Experience (< 640px)**:
    - Tap on any time button opens an **ergonomic Bottom-Sheet Modal** sliding up from the bottom with a dimmed backdrop (`bg-black/50 backdrop-blur-xs`).
    - 44px touch targets (finger-friendly), clean touch drag bar, quick-tap hour grid (1–12), 4 minute chips (:00, :15, :30, :45), AM/PM segmented switch, coaching shift presets, and a prominent "Done" confirmation button.
    - Zero horizontal overflow or clipping regardless of screen width (supports 320px, 375px, 414px, tablets).

### 2. Checkable Implementation Steps
- [x] 1. Design & Build `InteractiveTimePicker` Component <!-- id: itp-1 -->
  - File: `src/components/ui/InteractiveTimePicker.tsx`
  - Responsive layout:
    - On mobile (< 640px): fixed bottom-sheet drawer with backdrop blur.
    - On desktop (>= 640px): anchored popover with click-outside listener.
  - Touch targets: >= 40-44px for touch accessibility on phones.
  - Support `size="sm"` and `size="md"`.
  - Handle 24-hour string values (`"17:00"`) and output standard `"HH:mm"` for full backend & Frappe MariaDB compatibility.
  - Escape key and backdrop tap to dismiss.
- [x] 2. Replace Native Dropdowns in Staff Attendance Page <!-- id: itp-2 -->
  - File: `src/app/dashboard/branch-manager/attendance/staff/page.tsx`
  - Replaced `<Time12Input>` with `<InteractiveTimePicker>` across:
    - Global Class Time in the top bar (`size="md"`).
    - Per-Session Class Time in cards (`size="sm"`).
    - Session Check-In (`In:`) time in cards (`size="sm"`).
    - Session Check-Out (`Out:`) time in cards (`size="sm"`).
- [x] 3. Type Checking & Build Verification <!-- id: itp-3 -->
  - Ran `npx tsc --noEmit` and confirmed 0 errors (Code 0).
  - Verified layout responsiveness across 360px mobile viewport, tablet, and desktop.

### 3. Review & Verification Results
- The clunky native `<select>` dropdowns have been completely removed.
- On mobile devices, tapping any time element slides up an ergonomic bottom sheet with large 44px buttons, 1-tap hours, minute intervals, and a "Done" button.
- On desktop, clicking opens an anchored popover with zero edge clipping.
- Zero TypeScript compiler errors across the codebase.

---

# Plan: Configure Default Timing to 5 to 9 on Staff Attendance Page

## Status: Complete & Verified

### 1. Goal & Requirements
- Target Page: `src/app/dashboard/branch-manager/attendance/staff/page.tsx` (`/dashboard/branch-manager/attendance/staff`)
- Current Behavior:
  - Default In Time: `09:00` (09:00 AM)
  - Default Out Time: `17:30` (05:30 PM)
  - Default Half Day Out Time: `13:00` (01:00 PM)
  - Class Time defaults to: `17:00` (05:00 PM)
  - Result: In the screenshot, employees have Class Time `05:00 PM`, but check-in/out defaulted to `09:00 AM` and `05:30 PM`.
- Target Behavior:
  - Default In Time: `17:00` (05:00 PM)
  - Default Out Time: `21:00` (09:00 PM)
  - Default Half Day Out Time: `19:00` (07:00 PM)
  - Session Type: `"Evening"` (for session 1)
  - Default Class Time: `17:00` (05:00 PM)

### 2. Checkable Steps
- [x] 1. Update Constants in `src/app/dashboard/branch-manager/attendance/staff/page.tsx` <!-- id: time-1 -->
  - Set `DEFAULT_IN_TIME = "17:00"` (05:00 PM)
  - Set `DEFAULT_OUT_TIME = "21:00"` (09:00 PM)
  - Set `DEFAULT_HALF_DAY_OUT_TIME = "19:00"` (07:00 PM)
- [x] 2. Update Session Creation & Fallback Logic in `page.tsx` <!-- id: time-2 -->
  - In `getBranchSessionsFromAtt`:
    - Set default `session_type: "Evening"`
    - Set default `class_time: defaultClassTimeVal || "17:00"`
    - Set default `in_time: DEFAULT_IN_TIME` (`17:00`)
    - Set default `out_time: DEFAULT_OUT_TIME` (`21:00`)
  - In `handleAddSession`:
    - Set default `in_time: DEFAULT_IN_TIME` (`17:00`)
    - Set default `out_time: DEFAULT_OUT_TIME` (`21:00`)
    - Set `session_type: "Evening"`
- [x] 3. Update `Time12Input` Fallback Defaults <!-- id: time-3 -->
  - Changed fallback hour/period from `09:00 AM` to `05:00 PM` (`17:00`) so blank fields default gracefully to 5:00 PM.
- [x] 4. Keep `src/app/dashboard/branch-manager/employees/mark-attendance/page.tsx` in Sync <!-- id: time-4 -->
  - Updated `DEFAULT_IN_TIME`, `DEFAULT_OUT_TIME`, `DEFAULT_HALF_DAY_OUT_TIME`.
- [x] 5. Verification & Testing <!-- id: time-5 -->
  - Ran `npx tsc --noEmit` and confirmed 0 errors (Code 0).
  - Verified working hours calculation (`21:00 - 17:00 = 4.00h`).
  - Verified late minutes calculation against `17:00` class time (0m late for 5 PM check-in).

### 3. Review & Verification Results
- All default timings now initialize to 5:00 PM (`17:00`) to 9:00 PM (`21:00`).
- Newly marked attendance, "Mark All Present", session additions, and status toggles automatically adopt `05:00 PM` In and `09:00 PM` Out.
- Zero TypeScript compiler errors across the entire repository.

---

# Plan: Push to Git and Deploy Clustered ERP to Production Server

## 1. Context & Architecture Review
- Studied:
  - `docs/Server Configuration - Clustered.md`
  - `docs/Server Configuration.md`
  - `scripts/deploy.sh`
- Server Target: `smartup-portal` (`76.13.244.60`)
- Cluster: 4 PM2 instances (`smartup-erp-1` to `smartup-erp-4`, ports 3001, 3005, 3006, 3007)
- Nginx upstream `smartup_erp_upstream` (`least_conn`)
- Deployment command: `ssh smartup-portal "bash /var/www/smartup-erp/scripts/deploy.sh"` or `npm run deploy`

## 2. Steps
- [x] 1. Pre-Deployment Verification <!-- id: dep-1 -->
  - [x] Run `npx tsc --noEmit` locally (verified: 0 errors).
  - [x] Verified code integrity and dependencies.
- [x] 2. Review & Stage Git Changes <!-- id: dep-2 -->
  - Staged verified changes in `src/app/dashboard/curriculum-dept/` (Excel exports for CWC & Exam Corner ranking), `src/app/scholar/page.tsx`, and fee conversion utility scripts.
  - Committed with message: `feat: add excel export for CWC and exam branch rankings, fee conversion scripts, and cleanup legacy study scripts` (commit `5fbccab`).
- [x] 3. Push to Remote Repository (`origin/main`) <!-- id: dep-3 -->
  - Pushed to `https://github.com/pydart-hub/smartup-erp-frontend.git` on branch `main` (`be8d53d..5fbccab`).
- [x] 4. Execute Server Clustered Safe Deployment <!-- id: dep-4 -->
  - Executed `ssh smartup-portal "bash /var/www/smartup-erp/scripts/deploy.sh"`.
  - Deployment completed all 6 stages cleanly: git pull, npm install, Prisma schema sync & client generation, Next.js production build (379 routes compiled), PM2 zero-downtime cluster reload, and Nginx validation.
- [x] 5. Post-Deployment Verification <!-- id: dep-5 -->
  - Verified all 4 cluster instances (`smartup-erp-1` through `smartup-erp-4`) are online in PM2.
  - Verified all 4 internal ports (`3001`, `3005`, `3006`, `3007`) are listening and returning `HTTP 307`.
  - Verified public domain `https://smartuplearning.net` returns `HTTP/2 307` via Cloudflare proxy.
  - Verified live running commit is `5fbccab`.

---

# Implementation Plan: Excel Report Download for CWC Branch Ranking & Consolidated Reports

## 1. Goal
Currently, in the Class Consolidated Report under CWC Corner (`/dashboard/curriculum-dept/cwc-corner/branch-ranking`), only a "Print Report" (PDF/Print) option is available. The user needs a dedicated Excel (.xlsx) report download option to export complete mark lists, student rankings, subject scores, and performance analysis.

## 2. Architecture & Implementation Steps
- [x] 1. CWC Branch Ranking Excel Export Engine (`src/app/dashboard/curriculum-dept/cwc-corner/branch-ranking/page.tsx`) <!-- id: cwc-xl-1 -->
  - Dynamically import `exceljs` on click for optimal bundle efficiency.
  - Build styled Sheet 1: `Consolidated Marks`:
    - Brand Purple title banner: `SMARTUP LEARNING VENTURES — CLASS CONSOLIDATED MARK LIST`.
    - Subtitle banner with Branch, Class, Exam Session, Active Filter, Ranked Subject, and Timestamp.
    - Class metrics summary bar (Total Students, Passed Count, Pass Rate %, Class Average %).
    - Two-tier headers for Rank, Student Name, Student ID, Division (if combined), Plan (Advanced/Basic), Subject Grade & Marks for each subject, Total Score, Overall %, Grade, and Result (PASS/FAIL).
    - Formatted data rows with zebra striping, borders, and conditional color highlights for Pass (green), Fail/Absent (red).
    - Dynamic column auto-fit sizing.
  - Build styled Sheet 2: `Performance Analysis`:
    - Header banner & metadata.
    - Two-tier analysis table mapping Criteria, Student Count, % of Class, and Student Names.
  - Sanitize filename: `SmartUp_[Branch]_[Class]_[Exam]_Consolidated_Report.xlsx`.
- [x] 2. UI Refactoring & Download Button Integration (`src/app/dashboard/curriculum-dept/cwc-corner/branch-ranking/page.tsx`) <!-- id: cwc-xl-2 -->
  - Extract table sorting/filtering (`displayRows`) into a memoized state so both UI table and Excel exporter share identical data.
  - Add state `isExportingExcel` with loading spinner.
  - Add `Download Excel` button with `FileSpreadsheet` icon alongside `Print Report`.
- [x] 3. CWC Subject Ranking Excel Export (`src/app/dashboard/curriculum-dept/cwc-corner/subject-ranking/page.tsx`) <!-- id: cwc-xl-3 -->
  - Add `Download Excel` export for the branch subject ranking view to achieve full parity with `exam-corner/subject-ranking`.
- [x] 4. Exam Corner Branch Ranking Excel Export (`src/app/dashboard/curriculum-dept/exam-corner/branch-ranking/page.tsx`) <!-- id: cwc-xl-4 -->
  - Add `Download Excel` export for the general branch ranking consolidated student table.
- [x] 5. Type-Check & Verification <!-- id: cwc-xl-5 -->
  - Run `npx tsc --noEmit` and confirm 0 errors.
  - Verify UI and exported workbook formatting.

---

# Implementation Plan: Branch Monitoring (Monthly Collection & Admission Tracking)

## Goal
Build a comprehensive "Branch Monitoring" system for Directors in the Offline ERP to set monthly targets (collections & admissions) for each branch and track actual collection amount (with payment mode breakdown) and admission counts in real time, with pacing, run-rates, and drill-down details.

## Implementation Steps
- [x] 1. Backend Target Store & Engine API <!-- id: 1 -->
  - Built persistent target storage service (`src/lib/server/branchTargetStore.ts`) supporting get, set, bulk-set, and copy with adjustments.
  - Built API route `src/app/api/director/monthly-targets/route.ts` with GET (month stats aggregation) and POST (target assignment).
  - Built API route `src/app/api/director/monthly-targets/drilldown/route.ts` for detailed student & payment entry records.
- [x] 2. Frontend Client API & Type Definitions <!-- id: 2 -->
  - Created TypeScript definitions and API fetchers in `src/lib/api/branchMonitoring.ts`.
- [x] 3. UI Components: Modals & Drilldown Drawers <!-- id: 3 -->
  - Built `SetBranchTargetModal.tsx` supporting both single branch edit and 9-branch bulk edit + copy from previous month.
  - Built `BranchDrilldownDrawer.tsx` allowing directors to inspect exact admitted students and payment vouchers for any branch and month.
- [x] 4. Main Page: `/dashboard/director/branch-monitoring` <!-- id: 4 -->
  - Built the complete Branch Monitoring dashboard with Month Selector (`< Month Year >`), time/pacing bar, Network KPI summary cards, interactive Branch Matrix Table with status badges and progress bars, search, filtering, and sorting.
- [x] 5. Sidebar Navigation & Director Dashboard Widget <!-- id: 5 -->
  - Added "Branch Monitoring" (`icon: "Target"`, `emoji: "🎯"`) to `DIRECTOR_NAV` in `src/lib/utils/constants.ts` and enabled Target icon in `Sidebar.tsx`.
  - Added a live Monthly Branch Monitoring summary widget on `/dashboard/director/page.tsx` alongside Today's snapshot.
- [x] 6. Verification & Type-Checking <!-- id: 6 -->
  - Ran `npx tsc --noEmit` which completed with code 0 (zero errors).
- [x] 7. Refinement: Matrix Table Rate Indicators <!-- id: 7 -->
  - Removed `Req: .../day` daily run-rate indicators from both the Monthly Admissions and Monthly Collections matrix table cells while preserving the right-aligned `View` drilldown links.
- [x] 8. Refinement: Clean Executive Header Card <!-- id: 8 -->
  - Removed the subtitle description, "Offline Targets" badge, and the 3 quick metric chips ("9 Offline Centers", "Target: ₹...", "Target: ... Students") from the top header card, delivering a clean title banner.
- [x] 9. Refinement: Removed Payment Breakdown Column <!-- id: 9 -->
  - Removed the "Payment Breakdown" column header and data cells from the main matrix table, updating table colSpan to 5. Granular payment method details remain accessible via the drilldown drawer.

---

# Architecture & Implementation Plan: Adding "School Exam"

## 1. System Study & Root Cause Analysis
- **Current Assessment Groups in Live Frappe Backend**:
  - Live query to `/api/resource/Assessment Group` confirmed exactly 10 active child groups:
    `Annual Exam`, `CWC Exam 1`, `CWC Exam 2`, `CWC Exam 3`, `Diagnosis Exam`, `Half Yearly Exam`, `Monthly Exam`, `Onam Exam`, `Quarterly Exam`, `Weekly Exam` under parent `All Assessment Groups`.
- **Backend Schema Constraints**:
  - `Assessment Plan.assessment_group` is a **mandatory Link field** (`reqd: 1`, `options: "Assessment Group"`).
  - `Assessment Result.assessment_group` is also a Link field to `Assessment Group`.
  - Creating an exam with `assessment_group: "School Exam"` in Frappe will fail with `LinkValidationError` unless `"School Exam"` exists in the `Assessment Group` DocType.
- **Frontend Dropdown Source**:
  - `/dashboard/curriculum-dept/marks-entry/create` queries `/resource/Assessment Group` via `/api/curriculum-dept/admin-proxy`.
  - Once `"School Exam"` exists in Frappe and/or fallback lists, it immediately appears in the dropdown.

## 2. Planned Implementation Steps
- [x] Step 1: Frappe Backend Record Creation <!-- id: se-1 -->
  - Safely created `"School Exam"` in `Assessment Group` in Frappe Cloud with `parent_assessment_group: "All Assessment Groups"` and `is_group: 0`.
- [x] Step 2: Next.js API Auto-Ensure Fallback <!-- id: se-2 -->
  - In `src/app/api/exams/bulk-create/route.ts`, added `ensureAssessmentGroup` helper to guard against link validation errors.
- [x] Step 3: Shared API Constants & Ordering <!-- id: se-3 -->
  - In `src/lib/api/assessment.ts`, added `"School Exam"` and `"Monthly Exam"` to `desiredOrder` and `displayNameMap`.
- [x] Step 4: Curriculum Dept Exam Creation & Filter Pages <!-- id: se-4 -->
  - Updated `src/app/dashboard/curriculum-dept/marks-entry/create/page.tsx` and `marks-entry/page.tsx` to sort and display `"School Exam"` with fallback assurance.
- [x] Step 5: Ranking & Analytics Defaults <!-- id: se-5 -->
  - Updated defaults in `smartup-ranking/page.tsx`, `subject-ranking/page.tsx`, and `branch-ranking/page.tsx` to include `"School Exam"`.
- [x] Step 6: Instructor Portal Integration <!-- id: se-6 -->
  - Updated `src/app/dashboard/instructor/exams/page.tsx` prepopulation list and `desiredOrder` to recognize `"School Exam"`.
- [x] Step 7: Type Check & End-to-End Verification <!-- id: se-7 -->
  - Ran `npx tsc --noEmit` (0 errors) and validated HTTP 200 responses on both exam scheduling and marks entry endpoints.

---

# Investigation & Plan: Offline ERP Staff Attendance Not Saving on "Holiday"

## 1. Deep Study & Root Cause Analysis
- **Problem Statement**:
  When marking attendance for staff as "Holiday" in the Offline ERP (Branch Manager Staff Attendance at `/dashboard/branch-manager/attendance/staff`), saving fails with an error and attendance is not saved.
- **Frontend Flow**:
  - In `src/app/dashboard/branch-manager/attendance/staff/page.tsx`, staff can be marked as `"Holiday"` individually or via "Mark All Holiday".
  - On "Save Attendance", `saveAttendance()` loops through entries and invokes `createEmployeeAttendance()` or `updateEmployeeAttendance()` in `src/lib/api/employees.ts`.
- **Backend Frappe Schema & Hardcoded Validations (Root Cause)**:
  - **DocType**: Frappe HR standard `Attendance` DocType.
  - While the Frappe DocField `status` was customized to include `"Holiday"` and `"At Head Office"` (`options: "Present\nAbsent\nOn Leave\nHalf Day\nWork From Home\nAt Head Office\nHoliday"`), Frappe HRMS Python controller `hrms/hr/doctype/attendance/attendance.py` hardcodes:
    `validate_status(self.status, ["Present", "Absent", "On Leave", "Half Day", "Work From Home"])`
  - Calling standard Frappe REST APIs (`POST /api/resource/Attendance` or `PUT /api/resource/Attendance/<name>`) triggers `validate()`, throwing:
    `ValidationError: Status must be one of Present, Absent, On Leave, Half Day, Work From Home`.
  - In addition, updating an existing submitted record (`docstatus: 1`) via `PUT /api/resource/Attendance/<name>` fails with `UpdateAfterSubmitError` because `status` has `allow_on_submit = 0`.
- **Why it Broke Recently (Regression in Commit `bc740445`)**:
  - Before Oct 6, 2026, attendance was saved via Frappe Server Script `/api/method/set_attendance_status`, which explicitly bypassed validation using `flags.ignore_validate = True` and updated values via `frappe.db.set_value`.
  - In commit `bc740445` (Oct 6, 2026), `createEmployeeAttendance` and `updateEmployeeAttendance` in `src/lib/api/employees.ts` were changed to call direct Frappe REST `/resource/Attendance` endpoints instead of the custom Server Script method.
  - Since Oct 5, 2026, zero Attendance records with status `"Holiday"` have been saved in the live Frappe database.

## 2. Proposed Implementation Plan (Pending User Confirmation)
- [x] Step 1: Update Frappe Server Script `set_attendance_status` <!-- id: att-1 -->
  - Removed disallowed `import` statements causing `ImportError: __import__ not found` in Frappe's `safe_exec`.
  - Added support for `"Holiday"` and `"At Head Office"`, clearing `in_time`, `out_time`, `custom_check_in`, `custom_check_out`, and `working_hours` for zero-time statuses.
  - Used `frappe.db.set_value("Attendance", existing_name, ...)` to safely update submitted records (`docstatus = 1`) without triggering `UpdateAfterSubmitError`.
  - Deployed and verified on Frappe Cloud with clean validation responses.
- [x] Step 2: Route Staff Attendance Saves via Dedicated Method in `src/lib/api/employees.ts` <!-- id: att-2 -->
  - Updated `createEmployeeAttendance` and `updateEmployeeAttendance` to call `/api/method/set_attendance_status` (with safe resource fallback).
  - Bypassed Frappe HRMS's hardcoded controller `validate_status` constraint so `"Holiday"` and `"At Head Office"` save seamlessly.
- [x] Step 3: Handle Zero-Time Cleanups for No-Time Statuses <!-- id: att-3 -->
  - Prevented unnecessary check-in API calls (`postEmployeeCheckin`) when staff is marked `"Holiday"`, `"At Head Office"`, `"Absent"`, or `"On Leave"`, eliminating deadlock risks.
- [x] Step 4: Verification & Type Check <!-- id: att-4 -->
  - Executed `npx tsc --noEmit` which completed with code 0 (zero errors).

---

# Architecture & Implementation Plan: Teacher Reviews in Curriculum Dept Role

## 1. Goal
Add the comprehensive Teacher Review system (currently in the Director role under "Instructor Reviews & Ratings" at `/dashboard/director/instructor-reviews`) into the Curriculum Dept role so academic coordinators can inspect verified student evaluations, faculty ratings, branch comparisons, strengths, and areas for growth.

## 2. Planned Implementation Steps
- [x] Step 1: Backend API Authorization for Curriculum Dept <!-- id: tr-1 -->
  - Updated `src/app/api/instructor-reviews/route.ts` to grant `Curriculum Dept` management-level access (same full multi-branch scope and student feedback visibility as `Director` and `General Manager`).
- [x] Step 2: Curriculum Dept Page Route <!-- id: tr-2 -->
  - Created `src/app/dashboard/curriculum-dept/instructor-reviews/page.tsx` utilizing `InstructorReviewList` and branch filter dropdown matching the Director implementation.
- [x] Step 3: Sidebar Navigation Integration <!-- id: tr-3 -->
  - Added `{ label: "Teacher Reviews", href: "/dashboard/curriculum-dept/instructor-reviews", icon: "Star", emoji: "⭐" }` to `CURRICULUM_DEPT_NAV` in `src/lib/utils/constants.ts`.
  - Added `Star` to `iconMap` in `src/components/layout/Sidebar.tsx` for clean icon rendering.
- [x] Step 4: Curriculum Dept Dashboard Quick Navigation <!-- id: tr-4 -->
  - Added a "Teacher Reviews" card to `quickLinks` in `src/app/dashboard/curriculum-dept/page.tsx`.
- [x] Step 5: Verification & Type Check <!-- id: tr-5 -->
  - Ran `npx tsc --noEmit` which completed with code 0 (zero errors).

---

# Deep Investigation & Structural Plan: Missing Teachers in Parent Portal Teacher Reviews

## 1. Root Cause Analysis
- **Rigid Single-Field DB Query**: `/api/instructor-reviews/instructors` queried Frappe with `[["status", "=", "Active"], ["custom_company", "=", branch]]`.
- **Cross-Branch & Visiting Faculty Ignored**: Teachers with a primary base branch (e.g. Aflah KR in Edappally, Ciya Maria Sabu in Edappally, Aleesha in Palluruthy) regularly teach in other centers (Chullickal, Fortkochi, Kadavanthara, Thopumpadi). Because they are not registered under `custom_company`, students in visiting branches cannot see them.
- **Instructors with Status = 'Left' Excluded**: 15 teachers in Frappe have `status = 'Left'`, yet several (Inzamam Ul Haq, Ronaldo Biju, Alshamz, Riona, Amjith, Mubashir) actively teach or have classes in Course Schedule.
- **Spelling / Branch Variations**: Variations like `Thopumpadi` vs `Thoppumpady` cause exact SQL-style filters to miss records.
- **UI Locking**: `InstructorReviewForm` locks parents strictly to their child's branch with no option to search all SmartUp teachers or select a teacher from another branch.

## 2. Planned Implementation Steps
- [x] Step 1: Upgrade `/api/instructor-reviews/instructors` API Route <!-- id: ptr-1 -->
  - Implemented unified multi-source discovery (custom_company + Course Schedule active teachers + static branch catalog fallbacks).
  - Added fuzzy branch name normalization (`Smart Up ` prefix, spelling aliases e.g. Thoppumpady/Thopumpadi, Palluruthy/Palluruthi).
  - Added support for `includeAll=true` query parameter to return all 80 SmartUp teachers.
- [x] Step 2: Enhance Parent `InstructorReviewForm` UI <!-- id: ptr-2 -->
  - Added "Looking for visiting faculty? Show all SmartUp teachers" one-click toggle.
  - Organized dropdown with distinct `<optgroup>` sections for "Branch Instructors" and "Visiting & Cross-Branch Faculty" with origin badges.
  - Added "+ Other (Type Teacher Name Manually)" with a clean input box so no student is ever blocked.
- [x] Step 3: Verification & Parity Test <!-- id: ptr-3 -->
  - Tested across branches against the running dev server, validating that visiting teachers (e.g. Ciya in Kadavanthara, Aflah in Fortkochi/Chullickal) and cross-branch faculty appear properly.
  - Executed `npx tsc --noEmit` with code 0 (zero errors).

---

# Architecture & Implementation Plan: Rebranding Scholarship Exam to Diagnosis Exam

## 1. System Study & Architectural Inventory
- **User Request**: Rebrand the public "Scholarship Exam" (`scholar.smartuplearning.net`) to "Diagnosis Exam" across all surfaces, with future readiness for a subdomain change. No implementation until explicit user command.
- **Affected Surfaces**:
  1. **Public Registration & Landing (`src/app/scholar/page.tsx` & `layout.tsx`)**:
     - Metadata title & descriptions ("Scholarship Exam 2026" → "Diagnosis Exam 2026").
     - Brand headers, hero titles, class callouts, and submit button labels.
     - Graphic banner (`/sclr.jpeg` contains hardcoded "GET UPTO 25% SCHOLARSHIP").
  2. **Live Exam Player (`src/components/scholar/ScholarExamPlayer.tsx` & `src/app/scholar/exam/[attemptId]`)**:
     - Header badge ("Scholarship Exam" → "Diagnosis Exam").
     - Submit confirmation modal ("Submit Scholarship Exam?" → "Submit Diagnosis Exam?").
  3. **Scorecard & Report View (`src/components/scholar/ScholarResultView.tsx` & `src/app/scholar/result/[attemptId]`)**:
     - Scorecard headers, official print format, completion banner, performance badge.
     - CSS selector `#scholarship-report` → `#diagnosis-report` (or backward-compatible dual class).
  4. **Admin Control Center (`src/app/scholar/admin/page.tsx` & `ScholarAdminModal.tsx`)**:
     - Control center titles, back links, logs, CSV export filename (`scholar_candidates_...` → `diagnosis_candidates_...`).
  5. **API & Data Compatibility Layer (`src/app/api/scholar/...`)**:
     - Session headers (`x-scholar-session-token`), cookies (`scholar_session_...`), localStorage (`smartup_scholar_student`).
     - Publishing queries in `start/route.ts` & `register/route.ts`: Support both `scholarship-` and `diagnosis-` slugs to avoid breaking live DB publishings.
  6. **Routing & Subdomain Proxy (`src/proxy.ts`)**:
     - Next.js 16 Proxy layer: Add support for incoming `diagnosis.` subdomain rewrite alongside legacy `scholar.`.
  7. **Branch Tuition Center Isolation**:
     - Maintain strict partition so public online diagnosis attempts don't contaminate physical branch center diagnosis reports in Director/GM dashboards.

## 2. Planned Implementation Steps (Completed & Verified)
- [x] Step 1: Frontend Copy & UI Rebranding <!-- id: diag-1 -->
  - Rebranded all customer-facing text from "Scholarship Exam" to "Diagnosis Exam" in `layout.tsx`, `page.tsx`, `ScholarExamPlayer.tsx`, and `ScholarResultView.tsx`.
- [x] Step 2: Banner Asset Update <!-- id: diag-2 -->
  - Replaced the `/sclr.jpeg` banner (which displayed "GET UPTO 25% SCHOLARSHIP") with a sleek, modern Diagnosis Exam card (`/diagnosis-banner.jpg`).
- [x] Step 3: Admin Modal & Control Center Rebrand <!-- id: diag-3 -->
  - Updated `ScholarAdminModal.tsx` and `src/app/scholar/admin/page.tsx` headers, labels, and CSV downloads to "Diagnosis Exam".
- [x] Step 4: Database Query & Backend Isolation Fallbacks <!-- id: diag-4 -->
  - In `start/route.ts`, `register/route.ts`, and `admin/attempts/route.ts`, widened publishing filters to accept both legacy "scholarship" and new "diagnosis" titles/slugs without touching live production DB records.
- [x] Step 5: Dual Subdomain & Path Support in `src/proxy.ts` <!-- id: diag-5 -->
  - Enabled `diagnosis.` subdomain detection in `src/proxy.ts` alongside `scholar.`, ensuring smooth transition when DNS changes.
- [x] Step 6: Storage & Session Dual-Compatibility <!-- id: diag-6 -->
  - Updated `localStorage`, `sessionStorage`, and cookie handlers with dual-read fallback so returning students are not logged out or disconnected mid-exam.
- [x] Step 7: Verification & Type Check <!-- id: diag-7 -->
  - Ran `npx tsc --noEmit` which completed with code 0 (zero errors).

## 3. Deep Study Findings & Next Steps (Phase 2 Action Plan)
- [x] Next Step 1: Fortify Branch Tuition Isolation (`src/lib/utils/diagnosis.ts`) <!-- id: diag-8 -->
  - Updated `DIAGNOSIS_EXAM_PUBLISHING_FILTER` and `isScholarshipAttempt` to exclude `public-diagnosis` and `SCHOLARSHIP` subject codes so public attempts cannot contaminate Director/GM physical tuition reports.
- [x] Next Step 2: Clean URL Paths on Subdomain & Main Domain Route Alias <!-- id: diag-9 -->
  - Supported clean paths (`/exam/[id]`, `/result/[id]`) when browsing directly on `diagnosis.smartuplearning.net`.
  - Added `/diagnosis` route rewrite to `/scholar` in `src/proxy.ts` to prevent 404s when navigating to `smartuplearning.net/diagnosis`.
- [x] Next Step 3: Admin Modal & DELETE Route Session Parity <!-- id: diag-10 -->
  - Added dual-read for `diagnosis_admin_token` in `ScholarAdminModal.tsx` and in `src/app/api/scholar/admin/attempts/route.ts` DELETE handler.
- [x] Next Step 4: Update Branch Exam Blocker Copy (`src/app/api/public-exam/start/route.ts`) <!-- id: diag-11 -->
  - Updated error message from `scholar.smartuplearning.net` to `diagnosis.smartuplearning.net` when students attempt to take public diagnosis exams on `/exam-site`.
- [ ] Next Step 5: Legacy 301 Subdomain Redirect <!-- id: diag-12 -->
  - Add optional 301/302 redirect in `src/proxy.ts` from `scholar.` to `diagnosis.` so older links smoothly resolve to the new subdomain.
- [x] Next Step 6: Nginx & Server Deployment Completed <!-- id: diag-13 -->
- [x] Next Step 7: Animated Mascot Sizing Responsive Update <!-- id: diag-14 -->
  - Enlarged 3D animated video logo on desktop/web (`lg: 480px`, `xl: 540px`) while keeping it compact on mobile (`240px`) and tablets (`280px-320px`).
  - Scaled ambient glow and grounding shadow responsively with center alignment.

---

# Phase 3: Offline Branch vs Public Diagnosis Exam Isolation (Zero Data Loss)

- [x] Task 1: Strict Isolation in Admin Attempts API (`src/app/api/scholar/admin/attempts/route.ts`) <!-- id: fix-iso-1 -->
  - Removed overbroad `{ title: { contains: "Diagnosis" } }` that matched all 21 offline branch tuition papers.
  - Constrained publishing filter strictly using `PUBLIC_DIAGNOSIS_PUBLISHING_FILTER` (`slug: { startsWith: "scholarship-" }`, `slug: { startsWith: "diagnosis-" }`, `subjectCode: { startsWith: "SCHOLARSHIP" }`).
  - Added safety guard in DELETE handler to prevent any branch attempts from ever being deleted.
- [x] Task 2: Strict Paper Matching in Exam Start & Registration APIs (`src/app/api/scholar/start/route.ts` & `register/route.ts`) <!-- id: fix-iso-2 -->
  - Used `PUBLIC_DIAGNOSIS_PUBLISHING_FILTER` in `findFirst()` so online candidates are guaranteed to get the official 40-minute multi-subject paper, not single-subject branch tests.
- [x] Task 3: Local Verification & TypeScript Type-Check <!-- id: fix-iso-3 -->
  - Executed `npx tsc --noEmit` which completed with code 0 (zero errors).
- [x] Task 4: Production Deployment & Live API Verification <!-- id: fix-iso-4 -->
  - Deployed cleanly to `smartup-portal` via `deploy.sh` with zero downtime.
  - Verified live database metrics:
    - Total Attempts: 5,435 (100% data intact)
    - Isolated Public Attempts: 67
    - Isolated Offline Branch Attempts: 5,368
    - Data Integrity Check: Passed (`all === public + branch` is true)

---

# Phase 4: Copy Rebrand to "Diagnosis Test" & Hero Headline Update (Option 1)

- [x] Task 1: Update Landing Page & Metadata (`src/app/scholar/page.tsx` & `layout.tsx`) <!-- id: dt-1 -->
  - Removed "Make Parents Proud" and replaced with Option 1: `SmartUp` <br /> `<span className="text-[#5C34A4]">Diagnosis Test</span>`.
  - Updated Eyebrow to `SMARTUP DIAGNOSIS TEST`.
  - Updated Logo subtitle to `DIAGNOSIS TEST`.
  - Updated Subtitle to `Take the SmartUp Diagnosis Test for Classes 8, 9, 10, +1 & +2.`.
  - Updated Form & button copy (`Free Test Slot Registration`, `Take Diagnosis Test Now`, `Start / Resume Test Now`).
  - Updated layout metadata title & description to `SmartUp Diagnosis Test 2026`.
- [x] Task 2: Update Live Test Player (`src/components/scholar/ScholarExamPlayer.tsx`) <!-- id: dt-2 -->
  - Updated header badge to `Diagnosis Test`.
  - Updated submit modal to `Submit Diagnosis Test?` and button labels.
- [x] Task 3: Update Scorecard & Report View (`src/components/scholar/ScholarResultView.tsx`) <!-- id: dt-3 -->
  - Updated badges and headers to `Diagnosis Test`.
- [x] Task 4: Update Admin Control Center (`ScholarAdminModal.tsx` & `src/app/scholar/admin/page.tsx`) <!-- id: dt-4 -->
  - Updated Control Center headers, badges, and back buttons to `Diagnosis Test`.
- [x] Task 5: Local Type Check & Verification <!-- id: dt-5 -->
  - Ran `npx tsc --noEmit` which completed with code 0 (zero errors).
- [x] Task 6: Deploy to Production (`deploy.sh`) <!-- id: dt-6 -->
  - Deployed cleanly to `smartup-portal` with zero downtime and verified running live commit `72b3a52`.

---

# Plan: Branch Payment Entries Excel Download Option

## Objective
Add a dedicated, high-performance, and beautifully formatted Excel (.xlsx) export option to the "Payment Entries" tab of each branch bank page (`/dashboard/director/branches/[id]/bank`), exporting:
`Date | Name | Party | Amount | Mode | Paid To | Reference`

## Architecture & Implementation Steps
- [x] 1. Excel Export Utility Module (`src/lib/reports/branch-payment-export.ts`) <!-- id: bpe-1 -->
  - Dynamically import `exceljs` for optimal client performance.
  - Built styled `.xlsx` workbook:
    - SmartUp brand header banner with branch name, date range, timestamp, total count, total sum.
    - Column headers: Date, Name, Party, Amount, Mode, Paid To, Reference.
    - Currency format for Amount (`₹#,##0.00`).
    - Total summary row at bottom summing amounts with accounting double-border.
    - Dynamic column auto-fit widths and Excel auto-filters.
    - Clean filename generator: `[Branch]_Payment_Entries_[FromDate]_[ToDate].xlsx`.
- [x] 2. Complete Data Fetching Support for Export <!-- id: bpe-2 -->
  - Handled complete dataset export: if 100 rows are loaded in view, the export handler automatically queries up to 5,000 records for the selected branch and date filter from `/api/director/bank`.
  - Added loading spinner and toast notifications during data fetch and workbook generation.
- [x] 3. UI Integration in Branch Bank Page (`src/app/dashboard/director/branches/[id]/bank/page.tsx`) <!-- id: bpe-3 -->
  - Added a clean toolbar header inside the Card above the Payment Entries table with record counter, date filter indication, and a modern "Download Excel" button with `FileSpreadsheet` icon.
  - Linked export handler with safe error boundary.
- [x] 4. Verification & Testing <!-- id: bpe-4 -->
  - Ran `npx tsc --noEmit` which completed with code 0 (zero errors).
  - Confirmed column names and mapping: `Date`, `Name`, `Party`, `Amount`, `Mode`, `Paid To`, `Reference`.

---

# Phase 5: Perfect Placement & Viewport Sizing for 3D Animating Logo Mascot

- [x] Task 1: Rebalance Hero Layout & Mascot Dimensions (`src/app/scholar/page.tsx`) <!-- id: logo-pos-1 -->
  - Resized animated video container from oversized 480px/540px to responsive viewport-balanced dimensions (`w-[230px] h-[230px] sm:w-[270px] sm:h-[270px] md:w-[300px] md:h-[300px] lg:w-[340px] lg:h-[340px] xl:w-[370px] xl:h-[370px]`).
  - Scaled ambient glow (`lg:w-[360px] xl:w-[400px]`) and grounding shadow (`lg:w-[260px] xl:w-[290px]`) proportionally.
  - Rebalanced vertical spacing (`header py-3.5 sm:py-4`, `main py-2 sm:py-3 lg:py-4`, headline `mb-2 sm:mb-2.5`, subtitle `mb-2.5 sm:mb-3`).
  - Added smooth docking alignment (`-mt-1 lg:-mt-2`, `pt-0 pb-1`) on the mascot container so it sits in visual harmony with the headline and form.
  - Tightened form card vertical rhythm (`p-6 sm:p-7`, `space-y-3 sm:space-y-3.5`, title `mb-3.5`, button `py-3`) so that the "Register & Continue" button and entire mascot fit above the fold without scrolling.
- [x] Task 2: Type Check & Verification <!-- id: logo-pos-2 -->
  - Ran `npx tsc --noEmit` which completed with code 0 (zero errors).
- [x] Task 3: Production Deployment & Verification <!-- id: logo-pos-3 -->
  - Deployed to production via `npm run deploy` and verified `200 OK` on `https://diagnosis.smartuplearning.net`.
  - Zero-downtime clustered reload of all 4 PM2 instances completed successfully with live commit `6f59734`.

---

# Fee Structure Conversion: Student 1 (ESHAN RAFEEK)

## 1. Deep Study & Data Fetching (Read-Only)
- [x] 1. Query Frappe backend for Student `ESHAN RAFEEK` (Registration/ID: `SRR 228`, Branch: `Chullickal`) <!-- id: fsc-1 -->
- [x] 2. Fetch Program Enrollment, Fee Structure, and Academic Year details <!-- id: fsc-2 -->
- [x] 3. Fetch linked Sales Order(s) with custom plan and installment schedule <!-- id: fsc-3 -->
- [x] 4. Fetch all Sales Invoices (due dates, rate, outstanding, docstatus) <!-- id: fsc-4 -->
- [x] 5. Fetch all Payment Entries (exact dates, payment modes, accounts, references, allocations) <!-- id: fsc-5 -->
- [x] 6. Present comprehensive current fee & payment breakdown to the user <!-- id: fsc-6 -->

## 2. Await New Fee Structure Details & Execution Command
- [x] 7. Receive target fee structure details from user (`₹20,800`, `ADVANCE`, `1 installment`) <!-- id: fsc-7 -->
- [x] 8. Generate conversion script with zero changes to payment entry dates/modes (`scripts/convert-eshan.mjs`) <!-- id: fsc-8 -->
- [x] 9. Await user command before executing conversion <!-- id: fsc-9 -->
- [x] 10. Executed conversion and verified live backend records (`scripts/verify-eshan.mjs`) <!-- id: fsc-10 -->

---

# Fee Structure Conversion: Student 2 (AFREEN SHIRAS)

## 1. Deep Study & Data Fetching (Read-Only)
- [x] 1. Query Frappe backend for Student `AFREEN SHIRAS` (`STU-SU CHL-26-004`, `SRR 004`, `Chullickal`, `10th State`) <!-- id: fsc2-1 -->
- [x] 2. Fetch Program Enrollment, Fee Structure, and Academic Year details (`PEN-10th-Chullickal 26-27-004`, `2026-2027`) <!-- id: fsc2-2 -->
- [x] 3. Fetch linked Sales Order (`SAL-ORD-2026-00109`, ₹16,300) <!-- id: fsc2-3 -->
- [x] 4. Fetch Sales Invoice (`ACC-SINV-2026-01900`, ₹16,300, Outstanding: ₹815, Status: Overdue) <!-- id: fsc2-4 -->
- [x] 5. Fetch Payment Entry (`ACC-PAY-2026-03912`, Date: `2026-03-23`, Mode: `Razorpay`, Paid: `₹15,485`) <!-- id: fsc2-5 -->
- [x] 6. Prepare conversion script (`scripts/convert-afreen.mjs`) for target: ₹15,485, Basic, 1 installment <!-- id: fsc2-6 -->
- [x] 7. Await user command before executing conversion <!-- id: fsc2-7 -->
- [x] 8. Executed conversion and verified live backend records <!-- id: fsc2-8 -->

---

# Fee Structure Conversion: Student 3 (MOHAMMED AYAN SHIRAS)

## 1. Deep Study & Data Fetching (Read-Only)
- [x] 1. Query Frappe backend for Student `MOHAMMED AYAN SHIRAS` (`STU-SU CHL-26-005`, `SRR 005`, `Chullickal`, `12th Science State`) <!-- id: fsc3-1 -->
- [x] 2. Fetch Program Enrollment, Fee Structure, and Academic Year details (`PEN-12sc state-Chullickal 26-27-005`, `2026-2027`) <!-- id: fsc3-2 -->
- [x] 3. Fetch linked Sales Order (`SAL-ORD-2026-00110`, ₹17,400) <!-- id: fsc3-3 -->
- [x] 4. Fetch Sales Invoice (`ACC-SINV-2026-01901`, ₹17,400, Outstanding: ₹870, Status: Overdue) <!-- id: fsc3-4 -->
- [x] 5. Fetch Payment Entry (`ACC-PAY-2026-03913`, Date: `2026-03-23`, Mode: `Razorpay`, Paid: `₹16,530`) <!-- id: fsc3-5 -->
- [x] 6. Prepare conversion script (`scripts/convert-ayan.mjs`) for target: ₹16,530, Basic, 1 installment <!-- id: fsc3-6 -->
- [x] 7. Await user command before executing conversion <!-- id: fsc3-7 -->
- [x] 8. Executed conversion and verified live backend records <!-- id: fsc3-8 -->

---

# Fee Structure Conversion: Student 4 (KRISHNA GADHA G)

## 1. Deep Study & Data Fetching (Read-Only)
- [x] 1. Query Frappe backend for Student `KRISHNA GADHA G` (`STU-SU CHL-26-274`, `SRR 274`, `Chullickal`, `11th Science State`) <!-- id: fsc4-1 -->
- [x] 2. Fetch Program Enrollment, Fee Structure, and Academic Year details (`PEN-11sc state-Chullickal 26-27-274`, `2026-2027`) <!-- id: fsc4-2 -->
- [x] 3. Fetch linked Sales Order (`SAL-ORD-2026-01403`, ₹17,400) <!-- id: fsc4-3 -->
- [x] 4. Fetch Sales Invoice (`ACC-SINV-2026-10222`, ₹17,400, Outstanding: ₹2,400, Status: Overdue) <!-- id: fsc4-4 -->
- [x] 5. Fetch Payment Entries (2 entries: ₹2,000 on `2026-06-22` & ₹13,000 on `2026-07-04`, Cash) <!-- id: fsc4-5 -->
- [x] 6. Prepare conversion script (`scripts/convert-krishna.mjs`) for target: ₹15,000, Basic, 1 installment <!-- id: fsc4-6 -->
- [x] 7. Await user command before executing conversion <!-- id: fsc4-7 -->
- [x] 8. Executed conversion and verified live backend records <!-- id: fsc4-8 -->

---

# Fee Structure Conversion: Student 5 (RIYAN P R)

## 1. Deep Study & Data Fetching (Read-Only)
- [x] 1. Query Frappe backend for Student `RIYAN P R` (`STU-SU CHL-26-297`, `SRR 297`, `Chullickal`, `11th Science State`) <!-- id: fsc5-1 -->
- [x] 2. Fetch Program Enrollment, Fee Structure, and Academic Year details (`PEN-11sc state-Chullickal 26-27-297`, `2026-2027`) <!-- id: fsc5-2 -->
- [x] 3. Fetch linked Sales Order (`SAL-ORD-2026-01456`, ₹16,000, 8 installments) <!-- id: fsc5-3 -->
- [x] 4. Fetch Sales Invoices (8 invoices `ACC-SINV-2026-10546` to `10553`, Total: ₹16,000, Outstanding: ₹1,000) <!-- id: fsc5-4 -->
- [x] 5. Fetch Payment Entries (8 entries totaling ₹15,000, all Cash) <!-- id: fsc5-5 -->
- [x] 6. Prepare conversion script (`scripts/convert-riyan.mjs`) for target: ₹15,000, Basic, 1 installment <!-- id: fsc5-6 -->
- [x] 7. Await user command before executing conversion <!-- id: fsc5-7 -->
- [x] 8. Executed conversion and verified live backend records <!-- id: fsc5-8 -->

---

# Fee Structure Conversion: Student 6 (MUHAMMED HABEEB MANSHAD)

## 1. Deep Study & Data Fetching (Read-Only)
- [x] 1. Query Frappe backend for Student `MUHAMMED HABEEB MANSHAD` (`STU-SU CHL-26-174`, `SRR 174`, `Chullickal`, `10th State`) <!-- id: fsc6-1 -->
- [x] 2. Fetch Program Enrollment, Fee Structure, and Academic Year details (`PEN-10th-Chullickal 26-27-174`, `2026-2027`, Plan: `Advanced`) <!-- id: fsc6-2 -->
- [x] 3. Fetch linked Sales Order (`SAL-ORD-2026-00785`, ₹25,000, 8 installments) <!-- id: fsc6-3 -->
- [x] 4. Fetch Sales Invoices (8 active invoices, ₹25,000 total, 5 paid of ₹3,300 each, 3 unpaid) <!-- id: fsc6-4 -->
- [x] 5. Fetch Payment Entries (5 entries of ₹3,300 each = ₹16,500 total paid, mix of Cash and Razorpay) <!-- id: fsc6-5 -->
- [x] 6. Prepare conversion script (`scripts/convert-habeeb.mjs`) for target: ₹22,300, Basic, 8 installments (3300, 3300, 3300, 3300, 3300, 2400, 2400, 1000) <!-- id: fsc6-6 -->
- [x] 7. Await user command before executing conversion <!-- id: fsc6-7 -->
- [x] 8. Executed conversion and verified live backend records <!-- id: fsc6-8 -->

---

- [x] Task 1: Update Hover Animation Properties in `src/app/scholar/page.tsx` <!-- id: hov-1 -->
  - Increased `whileHover` scale from `1.05` to `1.16` with smooth spring transition (`stiffness: 320, damping: 20`).
  - Added subtle 3D tilt enhancement (`rotateY: -7, rotateX: 4`) and `whileTap={{ scale: 1.02 }}`.
- [x] Task 2: Type Check & Build Verification <!-- id: hov-2 -->
  - Ran `npx tsc --noEmit` which completed with code 0 (zero errors).
- [x] Task 3: Production Deployment & Verification <!-- id: hov-3 -->
  - Deployed to production via `npm run deploy` and verified `200 OK` on `https://diagnosis.smartuplearning.net`.
  - Zero-downtime clustered reload of all 4 PM2 instances completed successfully with live commit `39e8be8`.

---

# Plan: Deploy Interactive Time Picker & Default Timing Updates to Production

## 1. Context & Architecture Review
- Studied:
  - `docs/Server Configuration - Clustered.md`
  - `docs/Server Configuration.md`
  - `scripts/deploy.sh`
- Target Server: `smartup-portal` (`76.13.244.60`)
- Cluster: 4 PM2 instances (`smartup-erp-1` to `smartup-erp-4`, ports 3001, 3005, 3006, 3007)
- Nginx upstream `smartup_erp_upstream` (`least_conn`)
- Deployment command: `npm run deploy` (which runs `ssh smartup-portal "bash /var/www/smartup-erp/scripts/deploy.sh"`)

## 2. Checkable Steps
- [x] Step 1: Pre-Deployment Verification <!-- id: deploy-time-1 -->
  - Ran `npx tsc --noEmit` locally (verified: 0 errors).
- [x] Step 2: Review & Stage Git Changes <!-- id: deploy-time-2 -->
  - `src/components/ui/InteractiveTimePicker.tsx` (New centered modal radial clock time picker)
  - `src/app/dashboard/branch-manager/attendance/staff/page.tsx` (Interactive time picker integration + 17:00-21:00 default timing)
  - `src/app/dashboard/branch-manager/employees/mark-attendance/page.tsx` (17:00-21:00 default timing sync)
  - `tasks/todo.md`
- [x] Step 3: Git Commit & Push to `origin/main` <!-- id: deploy-time-3 -->
  - Committed as `c32f9c9`: `feat(attendance): add interactive radial clock time picker and set default staff timing to 5 to 9`.
  - Pushed to `https://github.com/pydart-hub/smartup-erp-frontend.git` on `main`.
- [x] Step 4: Execute Clustered Safe Deployment on Server <!-- id: deploy-time-4 -->
  - Executed `ssh smartup-portal "bash /var/www/smartup-erp/scripts/deploy.sh"`.
  - Dependencies installed, Prisma clients generated, Next.js 16.1.6 production bundle compiled (379/379 static/dynamic pages).
  - PM2 zero-downtime cluster reloaded (`smartup-erp-1` to `smartup-erp-4`).
  - Nginx configuration verified and reloaded.
- [x] Step 5: Post-Deployment Verification <!-- id: deploy-time-5 -->
  - Verified all 4 cluster instances (`smartup-erp-1` through `smartup-erp-4`) are online.
  - Verified ports `3001`, `3005`, `3006`, `3007` respond with `HTTP 307`.
  - Verified public domain `https://smartuplearning.net` returns `HTTP/2 307` (Redirect to `/auth/login`).
  - Verified running commit on server is `c32f9c9`.---

# Fee Structure Study & Investigation: Student (ALFINA NISHAD AN)

## 1. Deep Study & Data Fetching (Read-Only) - Completed
- [x] 1. Query Frappe backend for Student `ALFINA NISHAD AN` (SRR `106`, Vennala, 12th Science State) <!-- id: alfina-1 -->
- [x] 2. Fetch Program Enrollment, Fee Structure, and Academic Year details <!-- id: alfina-2 -->
- [x] 3. Fetch linked Sales Order (`SAL-ORD-2026-01900`) and installment schedule <!-- id: alfina-3 -->
- [x] 4. Fetch all Sales Invoices (`ACC-SINV-2026-13544` to `13548`), dues, status, and outstanding <!-- id: alfina-4 -->
- [x] 5. Fetch Payment Entry (`ACC-PAY-2026-10858`), allocations, deductions, unallocated amounts <!-- id: alfina-5 -->
- [x] 6. Analyze discrepancy: Payment Entry ₹3,300 vs Paid ₹2,200 vs Outstanding ₹1,100 / Overdue <!-- id: alfina-6 -->
- [x] 7. Document the exact structure and findings for user review <!-- id: alfina-7 -->
- [ ] 8. Await user command before proposing or implementing any fix <!-- id: alfina-8 -->

## 2. Root Cause Summary
- **Sales Order Total**: ₹16,400 (Basic plan, 5 instalments: 3,300 + 3,300 + 3,300 + 3,300 + 3,200).
- **Modification on 2026-10-25**: Invoices and GL Entries were reduced to ₹16,400 from earlier ₹19,800.
- **Root Cause**: The underlying `Payment Ledger Entry` (PLE) table was **not updated** during that modification; it remained at ₹4,400 per invoice.
- **The ₹2,200 / ₹1,100 Glitch**: When ₹3,300 was paid on 2026-11-02 (`ACC-PAY-2026-10858`), Frappe calculated outstanding as `PLE Debit (₹4,400) - PLE Credit (₹3,300) = ₹1,100`.
- **Frontend Effect**: `Paid = Total Invoices (₹16,400) - Total Outstanding (₹14,200) = ₹2,200`.

## 3. Implementation of Fix for ALFINA NISHAD AN (Approved by User) - Completed
- [x] 1. Update Payment Ledger Entries for Alfina's 5 Sales Invoices <!-- id: fix-alfina-1 -->
  - `ACC-SINV-2026-13544` PLE: `4400` -> `3300`
  - `ACC-SINV-2026-13545` PLE: `4400` -> `3300`
  - `ACC-SINV-2026-13546` PLE: `4400` -> `3300`
  - `ACC-SINV-2026-13547` PLE: `4400` -> `3300`
  - `ACC-SINV-2026-13548` PLE: `2200` -> `3200`
- [x] 2. Recompute and set `ACC-SINV-2026-13544` outstanding to 0 and status to 'Paid' <!-- id: fix-alfina-2 -->
- [x] 3. Verify Alfina's UI / API state: Paid = ₹3,300, Outstanding = ₹13,100, Inv 1 = Paid <!-- id: fix-alfina-3 -->

## 4. System-Wide Audit & Fix for Other Affected Students - Completed & Verified
- [x] 1. Built and executed comprehensive SQL audit across all active Sales Invoices and Payment Ledger Entries <!-- id: audit-all-1 -->
- [x] 2. Identified exactly 5 other students with PLE mismatch (all in Fortkochi 12th Science State): <!-- id: audit-all-2 -->
  - **EJO GEORGE** (`STU-SU FKO-26-194`): Invoices 10117, 10118, 10119
  - **ALEETA XAVIER** (`STU-SU FKO-26-067`): Invoice 04266
  - **AYANA RAJEEV** (`STU-SU FKO-26-096`): Invoice 05418
  - **FIDHA P ANS** (`STU-SU FKO-26-056`): Invoice 03839
  - **RIYAN M THAHAR** (`STU-SU FKO-26-140`): Invoice 07754
- [x] 3. Aligned Payment Ledger Entries to exact invoice grand totals across all 7 affected invoices <!-- id: audit-all-3 -->
- [x] 4. Re-ran system-wide audit and confirmed **0 remaining PLE mismatches** across the entire Frappe database <!-- id: audit-all-4 -->
- [x] 5. Verified clean accounting state for all students <!-- id: audit-all-5 -->

---

# Plan: Fix Staff Attendance 60m Late Discrepancy Bug When Check-in Equals Class Time

## Status: COMPLETE & FULLY VERIFIED

### 1. Issue Description & Observed Behavior
- **Symptom**: In Staff Attendance page (`src/app/dashboard/branch-manager/attendance/staff/page.tsx`), staff member Archana Rajan had:
  - Class Time: `06:00 PM`
  - In Time: `06:00 PM`
  - Out Time: `09:00 PM`
  - Late badge showed: `60m late (vs 06:00 PM)`
- **Root Cause**:
  1. Top header had default `classTime = "17:00"` (05:00 PM) with `timingMode = "same"`.
  2. In the JSX render loop for Session 1 (`sIdx === 0`), `effectiveSessClassTime` forced:
     `const effectiveSessClassTime = (timingMode === "same" && sIdx === 0 ? classTime : sess.class_time) || emp.classTimeInfo.time;`
     Because `timingMode` was `"same"`, it took `classTime` (`"17:00"` / 5:00 PM) instead of `sess.class_time` (`"18:00"` / 6:00 PM).
  3. `lateMins` was calculated as `getLateMinutes("18:00", "17:00")` = **60 minutes late**.
  4. In the late badge, it rendered: `{lateMins}m late (vs {formatTo12Hour(sess.class_time || emp.classTimeInfo.time)})` -> which rendered `formatTo12Hour("18:00")` = **`06:00 PM`**!
  5. The calculation used `17:00` while the label printed `06:00 PM`, creating the contradictory text: `60m late (vs 06:00 PM)`.
  6. The `InteractiveTimePicker` value prop also received `classTime` instead of `sess.class_time`.
  7. During `saveAttendance`, line 924 and 1003 similarly overwrote `s.class_time` with `classTime` ("17:00"), discarding individual edits upon save.

### 2. Checkable Steps
- [x] 1. Update `effectiveSessClassTime` in `src/app/dashboard/branch-manager/attendance/staff/page.tsx` to prioritize `sess.class_time` over `classTime` <!-- id: att-fix-1 -->
- [x] 2. Update `InteractiveTimePicker` value prop for session class time to use `sess.class_time || (sIdx === 0 ? classTime : "")` <!-- id: att-fix-2 -->
- [x] 3. Update late badge label to reference `effectiveSessClassTime` consistently <!-- id: att-fix-3 -->
- [x] 4. Update `saveAttendance` to preserve `s.class_time` when set rather than forcing global `classTime` <!-- id: att-fix-4 -->
- [x] 5. Update `handleSessionChange` to sync `individualClassTimes` on `class_time` change <!-- id: att-fix-5 -->
- [x] 6. Make `getLateMinutes` robust with `getTimePart` parsing <!-- id: att-fix-6 -->
- [x] 7. Run `npx tsc --noEmit` to verify type safety <!-- id: att-fix-7 -->

### 3. Review & Verification Results
- **Direct Resolution**:
  - `effectiveSessClassTime` now reads `sess.class_time` directly.
  - When Check-in is `06:00 PM` and Class Time is `06:00 PM`, `lateMins` evaluates to `0`. No late badge appears.
  - If a staff member checks in late (e.g. `06:15 PM`), it accurately shows `15m late (vs 06:00 PM)`.
  - The calculation and the `(vs ...)` label are strictly unified using `effectiveSessClassTime`.
  - Manual overrides in session class times are fully preserved when saving to the Frappe backend.
- **Type Safety**: Verified clean compilation with **0 TypeScript errors** (`npx tsc --noEmit`).
- **Data Integrity**: Zero database records mutated; purely client-side synchronization and submission payload fix.







