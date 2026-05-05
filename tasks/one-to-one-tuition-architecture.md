# One-to-One Tuition (Independent) — Complete Structure and Workflow

Date: 2026-05-04
Scope: New one-to-one tuition model that is fully independent from existing admission/installment flow.

## 1) Existing Live Flow (What must not break)

Current standard flow:
1. Sales user admission page selects branch/program/plan/installments and resolves fee structure.
2. Fee option schedule is generated from static fee config JSON.
3. Student + Program Enrollment + Student Group assignment are created.
4. Sales Order is created and submitted.
5. One Sales Invoice per schedule entry is generated and submitted.
6. Parent portal and payment link pages read Sales Orders + Sales Invoices for dues and payments.

Critical code paths:
- Admission UI and schedule selection:
  - src/app/dashboard/sales-user/admit/page.tsx
  - src/lib/utils/feeSchedule.ts
  - src/app/api/fee-config/route.ts
- Admission orchestration:
  - src/lib/api/enrollment.ts
- Invoice creation route:
  - src/app/api/admission/create-invoices/route.ts
- Parent/token payment reads invoices:
  - src/app/api/parent/data/route.ts
  - src/app/api/pay/invoices/route.ts

Design rule: one-to-one tuition must use separate flags/data/documents so these paths continue working unchanged for existing students.

## 2) One-to-One Business Model (Requested)

Requested rules interpreted:
1. Fee is per class (rate per session).
2. Month payable amount = scheduled payable sessions in that month * rate_per_class.
3. If extra sessions are taken in month M, those extra sessions are not payable in month M.
4. Extra sessions become payable in month M+1 (carry-forward payable count).
5. One-to-one should be independent from existing package/installment plans.
6. Optional one-to-one student group should be possible.

## 3) Proposed Data Model (Independent)

Use separate doctypes or custom doctypes in Frappe (recommended), not Fee Structure totals.

### 3.1 One-to-One Plan (template)
Purpose: per-student or reusable pricing template.
Fields:
- student (Link Student, optional if reusable template)
- company (Link Company)
- academic_year
- subject (optional)
- rate_per_class (Currency)
- default_monthly_scheduled_classes (Int, e.g. 20)
- billing_cycle (Select: Monthly)
- active (Check)

### 3.2 One-to-One Monthly Schedule
Purpose: month-wise payable base and tracking.
Fields:
- student (Link Student)
- year (Int)
- month (Int)
- planned_classes (Int)  // schedule entered by admin
- rate_per_class (Currency)
- carry_forward_from_prev (Int)
- payable_classes (Int) = planned_classes + carry_forward_from_prev
- payable_amount (Currency) = payable_classes * rate_per_class
- billed_invoice (Link Sales Invoice)
- status (Draft/Billed/Closed)

### 3.3 One-to-One Session Log
Purpose: actual delivered class sessions.
Fields:
- student (Link Student)
- session_date (Date)
- subject/topic (optional)
- duration (optional)
- source_month (derived)
- included_in_month (year-month)
- billing_status (Not Billable Yet/Billed)

### 3.4 One-to-One Monthly Reconciliation
Purpose: month-end carry-forward calculation.
Fields:
- student
- year/month
- payable_classes (from monthly schedule)
- delivered_classes_in_month (count of session logs)
- extra_classes = max(delivered - payable_classes, 0)
- shortfall_classes = max(payable_classes - delivered, 0)
- next_month_carry_forward = extra_classes

Important: carry-forward rule from your request is modeled as next month payable increase.

## 4) Billing Workflow (Month-wise)

### 4.1 Before month starts
1. Admin creates or confirms One-to-One Monthly Schedule row for student.
2. Sets planned_classes and rate_per_class.
3. System fills carry_forward_from_prev from last reconciliation.
4. System computes payable_classes and payable_amount.

Formula:
- payable_classes_m = planned_classes_m + carry_forward_(m-1)
- payable_amount_m = payable_classes_m * rate_per_class_m

### 4.2 During month
1. Tutor/admin logs sessions in One-to-One Session Log.
2. No billing change during month unless admin regenerates preview.

### 4.3 Billing month M
1. On billing date, create Sales Invoice for payable_amount_m.
2. Invoice item description should include:
   - planned classes
   - carry forward classes from previous month
   - payable classes
   - rate per class
3. Submit invoice as normal.

### 4.4 Month-end reconciliation
1. Count delivered sessions in month M.
2. Compute extra_classes_m = delivered_m - payable_classes_m if positive.
3. Store extra_classes_m as carry_forward_(m+1).
4. Do not edit posted invoice of month M.

## 5) Optional Student Group Strategy for One-to-One

Goal: keep visibility for schedule/attendance while remaining independent.

Recommended pattern:
- Create Student Group per student for one-to-one, naming:
  O2O-{BRANCH_ABBR}-{STUDENT_SRR_OR_ID}
- group_based_on = Batch (to stay compatible with existing attendance/schedule tooling)
- program can be original program or dedicated one-to-one pseudo program.

Benefits:
- Reuses existing Student Group + attendance + schedule ecosystem.
- No mixing with classroom batches.
- Easy filtering in reports.

Safety guard:
- Mark these groups with custom_is_one_to_one = 1 to avoid normal batch KPIs contamination.

## 6) Frontend Integration Plan

### 6.1 Keep existing admission untouched
Do not alter default package/installment behavior for standard students.

### 6.2 Add one-to-one mode in admission (new branch path)
In Sales User admission UI:
- add student_type option or dedicated toggle: One-to-One Tuition.
- when enabled:
  - hide plan/installment selection
  - show rate_per_class and planned_classes
  - create one-to-one records instead of fee-config schedule generation.

### 6.3 New pages
1. One-to-One Monthly Planner page
- branch manager/sales user enters month schedule
2. One-to-One Session Log page
- tutor/admin logs delivered sessions
3. One-to-One Billing page
- preview payable classes and generate invoice
4. One-to-One Student summary in student detail
- monthly planned, delivered, carry-forward, invoices

## 7) Backend/API Integration Plan

Add new Next API routes (server-side token auth like existing routes):
1. POST /api/o2o/plan/create
2. POST /api/o2o/monthly-schedule/upsert
3. POST /api/o2o/session-log/create
4. GET /api/o2o/reconciliation/preview?student=&year=&month=
5. POST /api/o2o/invoice/create
6. POST /api/o2o/reconciliation/close-month

Implementation detail:
- Reuse invoice creation style from src/app/api/admission/create-invoices/route.ts.
- For one-to-one invoice, create one invoice per month (not installment split).
- Set custom fields on Sales Invoice:
  - custom_fee_mode = One-to-One
  - custom_o2o_year, custom_o2o_month
  - custom_o2o_payable_classes
  - custom_o2o_rate_per_class

## 8) Reporting and Parent Portal

### 8.1 Parent data endpoint
Extend parent data route to include one-to-one monthly breakdown if student is one-to-one:
- month
- payable classes
- rate per class
- billed amount
- delivered classes
- next carry-forward

### 8.2 Payment portal
Existing token invoice payment flow can remain, because it already reads Sales Invoices.
Only change needed:
- labels: if custom_fee_mode == One-to-One, show "Month YYYY One-to-One Fee".

## 9) Rollout Strategy

Phase 1: Data foundations
1. Create O2O doctypes/custom fields.
2. Add basic API helpers and type definitions.

Phase 2: Independent UI
1. Build O2O monthly planner and session logger.
2. Add O2O mode in admission without changing current default path.

Phase 3: Billing
1. Add monthly invoice generation with metadata.
2. Add reconciliation close-month action.

Phase 4: Parent visibility
1. Parent dashboard one-to-one cards.
2. Payment labels and invoice details.

Phase 5: Safeguards and reports
1. Branch-level O2O reports (planned vs delivered vs carry-forward).
2. Access controls and validation locks.

## 10) Validation Rules

Must enforce:
1. planned_classes >= 0
2. rate_per_class > 0
3. only one monthly schedule row per student per month
4. one billing invoice per student per month for o2o mode
5. cannot close month twice
6. carry forward is system-computed, not manual edit after close

## 11) Non-Destructive Constraints

To preserve existing flow:
1. Existing fee structure and installment code remains primary for non-o2o students.
2. Do not change existing fee config JSON logic.
3. Do not mutate submitted invoices.
4. Do not delete or modify existing production records automatically.

## 12) Example Calculation

Given:
- rate_per_class = 500
- planned_classes (June) = 20
- carry_forward_from_may = 3

Then:
- payable_classes_june = 20 + 3 = 23
- payable_amount_june = 23 * 500 = 11,500

If delivered_classes_june = 26:
- extra_june = 26 - 23 = 3
- carry_forward_july = 3

## 13) Minimal Code Touch Points (for implementation)

Likely files to extend:
- src/lib/types/fee.ts (or new src/lib/types/o2o.ts)
- src/lib/api/enrollment.ts (admission branching)
- src/app/dashboard/sales-user/admit/page.tsx (one-to-one UI branch)
- src/app/api/parent/data/route.ts (one-to-one summary response)
- new src/app/api/o2o/* routes

Keep unchanged unless needed:
- src/lib/utils/feeSchedule.ts (normal package flow)
- src/app/api/admission/create-invoices/route.ts (normal installment flow)

## 14) Recommendation

Best approach:
1. Implement one-to-one as a parallel fee mode (custom_fee_mode = One-to-One).
2. Use month-wise invoice model, not installment model.
3. Carry-forward based on month-end reconciliation only.
4. Create dedicated one-to-one student groups optionally for schedule/attendance isolation.

This gives full independence while preserving existing admission and payment pipeline.
