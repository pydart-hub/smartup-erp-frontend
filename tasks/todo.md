# SmartUp ERP — Task Tracker

## Current: GM Reports Tab Simplification (2026-05-05)

- [x] Remove Overview and Fees categories from General Manager reports
- [x] Keep Students and Attendance categories only
- [x] Add student academic items section using existing academic summary/detail components
- [x] Validate TypeScript compile and add review notes

### Review
- Removed top-level Reports categories for Overview and Fees.
- Kept only Students and Attendance as requested.
- Added a Students sub-tab switch with Student Items and Academic Items.
- Wired Academic Items to existing academic branch/class summary and drilldown components.
- Verified with `npx tsc --noEmit` (Exit 0).

## Current: GM Course Schedule Export (2026-05-05)

- [x] Add export actions on GM course schedule overview (PDF + Excel)
- [x] Export visible, filter-aware branch comparison rows and key summary metadata
- [x] Validate TypeScript compile and add review notes

### Review
- Added an Export button on GM course schedule overview with two options: Export PDF and Export Excel.
- Export output uses the currently visible branch rows after filters and holiday adjustment, so exported data always matches on-screen branch comparison.
- Included summary metadata in exports: working-day range, public holidays, working days, and active filter mode.
- Verified with `npx tsc --noEmit` (Exit 0).

## Current: GM Card Click Date Details (2026-05-05)

- [x] Extend branch academics API to return per-branch non-scheduled dates and attendance-not-marked dates
- [x] Extend analytics types for new date arrays
- [x] Make GM course schedule branch cards expandable on click and render date lists
- [x] Keep branch drilldown access via explicit Open action and validate TypeScript compile

### Review
- Added date-level arrays in branch analytics response: non_scheduled_dates and attendance_not_marked_dates.
- Updated GM course schedule cards to expand on click and display exact dates as chips under two sections.
- Kept drilldown navigation by adding an Open button on each card.
- Verified with npx tsc --noEmit (clean).

## Current: Instructor Topic Coverage Mark Covered Fix (2026-05-05)

- [x] Trace failing Mark Covered write path and confirm root cause in proxy/auth flow
- [x] Add secure proxy allowance for instructors to update only Course Schedule custom_topic_covered
- [x] Preserve branch/instructor safety checks for allowed schedule updates
- [x] Validate TypeScript compile and add review notes

### Review
- Root cause identified in proxy auth behavior: pure-instructor updates to Course Schedule relied on instructor token permissions, which can block `custom_topic_covered` writes even though reads succeed.
- Added a narrow instructor write pathway in proxy for `PUT /resource/Course Schedule/:name` only when payload is exactly `{ custom_topic_covered: 0|1 }`.
- Added server-side access validation before forwarding: topics require ownership (`schedule.instructor === session.instructor_name`), events are allowed only within instructor's allowed branch scope.
- For this validated path only, proxy now uses admin token fallback to execute the write safely.
- Reused parsed request body (single parse) and validated with `npx tsc --noEmit` and zero diagnostics in proxy file.

## Current: GM Branch-Wise Actions Needed Page (2026-05-05)

- [x] Add analytics API for branch-wise current-week actions (not scheduled, attendance not marked on scheduled days)
- [x] Add client API/types for actions-needed response
- [x] Build new General Manager Actions Needed page with branch-wise action cards/table
- [x] Add General Manager sidebar + dashboard entry for Actions Needed page
- [x] Validate TypeScript compile and add review notes

### Review
- Added a new analytics route at /api/analytics/branch-actions-needed that computes branch-wise weekly actions from live Course Schedule + Student Attendance data.
- Weekly metrics include: working days this week, scheduled days, not scheduled days, attendance marked on scheduled days, attendance not marked on scheduled days, and total action days.
- Added typed contracts and client API integration for actions-needed analytics.
- Built a dedicated GM page at /dashboard/general-manager/actions-needed with summary cards, filter chips, branch-wise action rows, and action-item labels.
- Added navigation entry in General Manager sidebar and a dashboard quick card to open the new Actions Needed page.
- Verified with npx tsc --noEmit and file diagnostics (no errors).

## Current: GM Course Schedule Problem-Branch Filter (2026-05-05)

- [x] Add filter controls for All Branches and Only Problem Branches
- [x] Apply branch filter to branch list, comparison table, and summary cards
- [x] Add empty-state handling for strict filter results
- [x] Validate TypeScript compile and add review notes

### Review
- Added two clear filter chips on GM course schedule page: All Branches and Only Problem Branches.
- Problem branch criteria uses branch-level metrics: non-scheduled working days > 0 OR attendance not marked on scheduled days > 0.
- Applied the filter consistently to the KPI summary cards, branch rows, and comparison table.
- Added an empty-state card when no branch matches the chosen filter.
- Validation completed with npx tsc --noEmit and no diagnostics in changed files.

## Current: GM Branch Working Days + Schedule/Attendance Metrics (2026-05-05)

- [x] Audit General Manager course schedule page data sources and branch-level aggregation logic
- [x] Define working-day window from 2026-05-01 onward excluding Sundays and wire into branch metrics
- [x] Add per-branch metrics: total working days, scheduled days, non-scheduled days, attendance marked on scheduled days, attendance not marked on scheduled days
- [x] Update General Manager course schedule UI to display the new branch-level details cleanly
- [x] Validate TypeScript compile and add review notes

### Review
- Extended /api/analytics/branch-academics to compute branch day metrics from academic-year window (May 1 to today, Sundays excluded).
- Added per-branch fields for total working days, scheduled days, non-scheduled days, attendance marked on scheduled days, and attendance not marked on scheduled days.
- Updated General Manager course schedule page to display the new metrics in summary cards, branch rows, and branch comparison table.
- Added explicit working-day window display on the page for clarity.
- Verified changes with npx tsc --noEmit and file-level diagnostics (no errors).

## Current: Login Slider Refresh (2026-05-05)

- [x] Study current login carousel implementation and asset usage
- [x] Add new visual slide asset and replace login slider copy with the five requested messages
- [x] Upgrade text animation on the login carousel without affecting login form behavior
- [x] Validate TypeScript compile and add review notes

### Review
- Replaced the login carousel copy with the five requested Smartup messaging blocks and kept the login form workflow unchanged.
- Added the user-provided fifth hero asset at /public/login-slide-5.png for the classroom-analytics themed slide, and removed the temporary SVG version.
- Refined the left-panel presentation to a more formal style with a cleaner overlay, reduced visual glow, and restrained text animation while preserving the existing auto-rotation and manual progress controls.
- Verified with `npx tsc --noEmit` (Exit 0) and checked editor diagnostics for the updated login page and new asset.

## Current: Parent Scheduled Courses Calendar (2026-05-05)

- [x] Study parent role data surfaces and choose safe calendar entry point
- [x] Add parent schedules API for child course schedules by month
- [x] Build parent schedule calendar page and sidebar entry
- [x] Validate TypeScript compile and add review notes

### Review
- Added a dedicated parent schedules API at /api/parent/schedules that resolves the logged-in parent's children, their student groups, and month-scoped Course Schedule entries.
- Added a new parent page at /dashboard/parent/schedule with a monthly calendar grid, child filter, month navigation, and selected-day schedule details.
- Included both regular batch schedules and One-to-One schedules, with a badge for One-to-One entries.
- Added a new Schedule entry to the parent sidebar without changing existing parent pages or dashboard data flow.
- Verified with `npx tsc --noEmit` (Exit 0).

## Current: One-to-One Billing Regenerate from Student Profile (2026-05-05)

- [x] Study current One-to-One student profile and scheduler billing flow
- [x] Add server route to regenerate missing Sales Order or Sales Invoice from scheduled O2O sessions
- [x] Add student-profile actions for One-to-One students only when billing is missing
- [x] Validate TypeScript compile and add review notes

### Review
- Added a new staff-only API route at /api/one-to-one/regenerate-billing that recalculates billing from the student's actual scheduled One-to-One sessions.
- Route supports two recovery actions: generate missing Sales Order, or generate missing Sales Invoice from an existing submitted Sales Order.
- Added a One-to-One billing recovery card on the branch-manager student profile that appears only for One-to-One students with missing billing documents.
- Recovery card shows schedule-derived billing summary and exposes only the relevant regenerate action(s), leaving existing regular students and already-billed One-to-One students unchanged.
- Verified with `npx tsc --noEmit` (Exit 0).

## Current: Pending Fees — Include One-to-One Drilldown (2026-05-04)

- [x] Audit pending fees data source and identify One-to-One student mapping path
- [x] Add One-to-One pending aggregation on pending-fees class summary page
- [x] Add dropdown/drilldown UI for One-to-One student-wise dues
- [x] Validate TypeScript compile and add review notes

### Review
- Pending class summary page now also computes One-to-One dues by resolving One-to-One student groups, collecting active student IDs, and filtering pending Sales Invoices for those students.
- Added a dedicated "One-to-One Pending Fees" expandable panel with per-student rows (student name/ID, outstanding total, and due-invoice count).
- Preserved existing class cards and navigation behavior; One-to-One section is additive and non-destructive.
- Fixed class drilldown classification so One-to-One students are grouped under a dedicated "One-to-One Students" card/route instead of showing inside "Unassigned Students".
- Verified with `npx tsc --noEmit` (Exit 0).

## Current: One-to-One Exam Scheduler (2026-05-04)

- [x] Study current branch-manager exams create/list flow and API usage
- [x] Add separate One-to-One exam scheduler page without altering existing regular scheduler logic
- [x] Add top-level button entry for One-to-One scheduler on exams page
- [x] Validate TypeScript compile and add review notes

### Review
- Added a new dedicated route for One-to-One exam scheduling at /dashboard/branch-manager/exams/create-one-to-one.
- New scheduler loads only One-to-One student groups and reuses existing exam creation backend flow, so regular exam behavior remains unchanged.
- Added a separate top button on the exams page header (and empty-state actions) to open the One-to-One exam scheduler.
- Verified with `npx tsc --noEmit` (Exit 0).

## Current: One-to-One Admission Billing Enablement (2026-05-04)

- [x] Move O2O billing to schedule creation (duration-based)
- [x] Compute amount from sessions × time duration × O2O hourly rate
- [x] Create SO + invoice from One-to-One scheduling flow
- [x] Keep One-to-One admission as free-access (no upfront fixed-fee billing)
- [x] Validate TypeScript compile and verify no regression

### Review
- One-to-one billing is now generated after schedule creation (not at admission), so fixed program fee no longer drives O2O invoices.
- Amount is computed from created sessions and class duration using O2O hourly rate mapping.
- One-to-one scheduling now creates and submits a Sales Order, then creates invoice(s) from that order.
- One-to-one admission remains `isFreeAccess: true` to avoid incorrect upfront standard-fee SO creation.
- Verified with `npx tsc --noEmit` (Exit 0).

## Current: One-to-One Scheduling Page Implementation (2026-05-04)

- [x] Add One-to-One-only student group filtering in course schedule API helper
- [x] Build dedicated One-to-One scheduling page with 2-step flow (dates/time -> manual labels)
- [x] Route One-to-One admission success to One-to-One scheduling page
- [x] Add entry button for One-to-One scheduling in course schedule hub
- [x] TypeScript verification and review notes

### Review
- Added one-to-one filtering support in course schedule student group API lookups via `oneToOneOnly` and `custom_is_one_to_one`.
- Implemented a dedicated one-to-one scheduler at `/dashboard/branch-manager/course-schedule/one-to-one` with a strict 2-step flow: setup dates/time, then manual per-date subject labels.
- Kept the one-to-one page intentionally minimal: no course selection, no room selection, no topic sequencing or other batch functionality.
- Updated one-to-one admission success flow to auto-redirect to the new one-to-one scheduler and pass the newly created group in query params.
- Added a direct "One-to-One" entry button to the course schedule hub and verified with `npx tsc --noEmit`.


## Current: One-to-One Tuition (Independent Flow) Deep Study (2026-05-04)

- [x] Audit existing admission, fee-structure lookup, schedule generation, SO, and invoice creation flow
- [x] Audit parent/payment portal dependencies on Program Enrollment, Sales Order, and Sales Invoice fields
- [x] Design independent one-to-one tuition data model and month-wise billing workflow
- [x] Define extra-session carry-forward rules without mutating past invoices
- [x] Define student-group strategy for one-to-one tuition (optional but supported)
- [x] Produce implementation plan (frontend + API + Frappe custom fields/doctypes + migration + rollout)

### Review
- Completed an end-to-end analysis of live flow from Sales User admission to parent payment portal and invoice generation.
- Produced a separate one-to-one tuition architecture that does not break the existing instalment-based program workflow.
- Added month-wise per-class payable calculation model with extra-session carry-forward to next month.
- Included optional one-to-one student group strategy for scheduling/attendance visibility without batch mixing.
- Prepared phased implementation guidance with exact integration points in current frontend modules and API routes.

## Current: One-to-One Scheduling & Attendance Workflow Deep Study (2026-05-04)

- [x] Audit existing course-schedule creation, bulk scheduling, and instructor assignment flow
- [x] Audit existing student attendance marking flow (branch manager and instructor)
- [x] Design one-to-one class scheduling lifecycle (plan, slotting, execution, reschedule, cancellation)
- [x] Design one-to-one attendance lifecycle and billing impact rules
- [x] Define role-wise workflow across Sales User, Branch Manager, Instructor, Parent, and Accounts
- [x] Produce complete one-to-one operations structure for approval before implementation

### Review
- Studied current scheduling APIs and pages including single and bulk schedule creation, topic sequencing, and instructor/batch scoping.
- Studied current attendance APIs and pages including per-session attendance marking, state transitions, and summary dashboards.
- Produced an implementation-ready operational workflow for one-to-one tuition that keeps existing batch workflows unchanged.
- Added month, week, and session-level operating model covering scheduling, attendance, reconciliation, and fee carry-forward behavior.

## Current: Manual Invoice Discount for Kadavanthara / Edappally (2026-05-04)

- [x] Add backend route for branch-gated manual discount application
- [x] Enforce newest-unpaid-first allocation with spillover to older invoices
- [x] Require remark and reject non-eligible branches server-side
- [x] Add branch-manager invoice UI for discount amount and reason
- [x] Refresh invoice state after discount and verify TypeScript build

### Review
- Corrected the feature scope from invoice management to new-admission pricing after user clarification.
- Added shared branch-gating constants so only Smart Up Kadavanthara and Smart Up Edappally expose the manual discount option.
- Updated both regular admission and subject-admission flows to accept a manual discount amount plus mandatory remark.
- Implemented last-invoice-first allocation at schedule-building time, so the discount reduces the final instalment first and spills backward if needed before SO and invoice creation.
- Carried discount metadata into Sales Order item descriptions and generated Sales Invoice item descriptions for auditability.
- Removed the mistaken invoice-detail discount action and deleted the unused invoice-level discount API route.
- Verified with `npx tsc --noEmit`.

## Current: Branch Discount Workflow Study (Kadavanthara / Pathadipaalam) (2026-05-04)

- [x] Audit current invoice generation flow from admission to submitted Sales Invoices
- [x] Audit current online and offline payment entry creation paths
- [x] Identify existing credit-note-based discount and write-off mechanisms
- [x] Verify branch naming and branch-specific assumptions for Kadavanthara and Pathadipaalam
- [x] Define proposed non-implemented workflow for manual discount with mandatory remark
- [x] Document risks, constraints, and recommended implementation surfaces

### Review
- Studied the live frontend and backend paths that create Sales Orders, generate instalment Sales Invoices, expose parent payment links, and record Payment Entries.
- Confirmed there is no existing manual branch-level discount field in the branch manager invoice/payment flow.
- Confirmed the safest accounting pattern for a future discount is credit-note based adjustment against submitted Sales Invoices, not direct mutation of invoice totals.
- Verified an existing sibling-discount route already uses Credit Notes against unpaid invoices, which is the closest reusable backend pattern.
- Verified discontinuation also uses Credit Notes to zero outstanding balances while preserving paid revenue, which reinforces the same accounting approach.
- Verified the repo uses the official branch/company name "Smart Up Kadavanthara"; Pathadipaalam does not currently appear in the frontend branch mappings and would need backend/company/account mapping confirmation before implementation.

## Current: Director Alumni UI Split (2026-05-04)

- [x] Create dedicated Alumni Entry page with polished form layout
- [x] Convert main Alumni page into data dashboard view with Add Entry button
- [x] Ensure entry page links back to dashboard and keeps standalone API flow
- [x] Validate TypeScript compile and add review notes

### Review
- Moved alumni creation into a dedicated page at /dashboard/director/alumni/new with focused form-first layout.
- Refactored the main alumni page into dashboard/list mode and added an explicit Add Alumni Entry button.
- Added two-way navigation: dashboard -> entry page and entry page -> dashboard/detail routes after create.
- Verified with npx tsc --noEmit (clean).
- Added graceful fallback for missing Alumni DocType: list API now returns empty state with setup warning instead of hard 500.

## Current: Director Alumni Module (Standalone) (2026-05-04)

- [x] Define standalone Alumni data contracts and API client
- [x] Add Director API routes for Alumni create/list/get/update
- [x] Build Director Alumni page with entry form and formal data dashboard
- [x] Build Alumni detail and edit pages
- [x] Add Director navigation entry for Alumni
- [x] Validate TypeScript compile

### Review
- Implemented a standalone Director Alumni module with no link fields to existing doctypes.
- Added dedicated types and API client contracts for alumni list/create/detail/update.
- Added server routes under /api/director/alumni and /api/director/alumni/[id] using Director/Admin role checks.
- Wired new Director UI pages: alumni dashboard entry page, detail page, and edit page.
- Added Alumni navigation item to Director sidebar navigation.
- TypeScript verification completed with npx tsc --noEmit and no diagnostics in changed files.

## Current: Deploy ERP Frontend to Portal Server (2026-05-02)

- [x] Validate deployment prerequisites (SSH access, target paths, process names)
- [x] Sync latest code on server and install dependencies
- [x] Build production bundle on server
- [x] Restart/ensure PM2 app on port 3001
- [x] Verify Nginx and live endpoint health checks
- [x] Document deployment result in review section

### Review
- Connected to portal server via direct SSH (`root@76.13.244.60`) because local alias `smartup-portal` was not configured.
- Verified app directory `/var/www/smartup-erp`, branch `main`, and `git pull --ff-only` result: already up to date.
- Installed dependencies and completed production build successfully with Next.js 16.1.6.
- Restarted PM2 process `smartup-erp` on port 3001 and saved PM2 process list.
- Verified Nginx syntax and reloaded service successfully.
- Final health checks: localhost app `307`, Nginx HTTPS origin `307`, public domain `https://smartuplearning.net` `307` (expected redirect to login).
- Root cause for "not updated": server and origin were on same commit, while latest UI/API edits existed only in local uncommitted files.
- Deployed local working-tree changes by packaging changed `src/` paths, uploading to server, extracting into `/var/www/smartup-erp`, rebuilding, and restarting PM2.
- Post-hotfix checks: local app `307`, Nginx origin `307`, public domain `307`.

## Current: Director Expense Two-Level Classification Filters (2026-05-02)

- [x] Review existing class_filter wiring in director expense API and UI
- [x] Add backend support for parent filter (Branch/Head Office)
- [x] Add backend support for nature filter (Fixed/Variable)
- [x] Extend client API contract for the two new filters
- [x] Replace UI single class dropdown with two dropdowns
- [x] Verify branch detail and transaction table both respect new filters
- [x] Validate TypeScript compile

### Review
- Replaced the single Class filter in director branch expense detail with two dropdowns: Type (Branch/Head Office) and Nature (Fixed/Variable).
- Extended director expenses API to accept class_parent and class_nature filters and apply them consistently for both branch-detail and transactions modes.
- Kept class_filter compatibility intact and layered parent/nature filters in a shared matcher so existing integrations are not broken.
- Updated client API contracts to pass the new filter parameters for detail and transaction queries.
- Restructured class view into explicit hierarchy: Branch and Head Office as main sections, each showing Fixed and Variable sub-classification rows.
- Verified compile with npx tsc --noEmit and confirmed no diagnostics in modified files.

## Current: Director Expense 4-Type Classification (2026-05-02)

- [x] Audit existing director expense UI pages and API data flow
- [x] Verify how category grouping is currently derived (parent expense group)
- [x] Identify risks and gaps for strict 4-type grouping across all branches
- [x] Finalize approved taxonomy and backend mapping rules
- [x] Implement 4-type classification filter/view in branch expense detail
- [x] Add dropdown/filter UX and transaction-level type visibility
- [x] Validate TypeScript compile and run manual UI verification

### Review
- Added shared expense classification utility with canonical classes and deterministic mapping rules.
- Extended director expenses API to return `expenseClass` metadata and support `class_filter` for branch-detail and transactions.
- Updated branch expense page with Class dropdown, View dropdown (Class/Category), and class badges in transaction rows.
- Updated KPI card to show active class count and added unmapped warning chip for mapping maintenance.
- TypeScript check passed with `npx tsc --noEmit`.

## Current: HR Payment Status Rebuild (2026-05-01)

- [x] Recreate payment-status route under salary month
- [x] Load data directly from SmartUp Salary Record (same month/year)
- [x] Add Paid/Not Paid per-employee status control
- [x] Add branch and grand totals based on saved salary sheet
- [x] Validate TypeScript compile and route linkability

### Review
- Added a new salary month payment-status page using saved salary sheet records only.
- Added manual status controls for each employee (Paid / Not Paid -> Draft).
- Wired quick access from salary sheet header to payment-status route.
- TypeScript compile is clean.

---

## Current: HR Salary Sheet UI Cleanup (2026-05-01)

- [x] Review current salary month screen pain points from live UI
- [x] Improve desktop table readability (row contrast, spacing, input size)
- [x] Improve branch header clarity with unsaved-change indication
- [x] Improve mobile editing ergonomics and add Available Leave input parity
- [x] Validate TypeScript compile after UI changes

### Review
- Updated salary month page interactions without touching backend logic.
- Made input controls larger and easier to tap/click across desktop and mobile.
- Added per-branch unsaved indicator to make save workflow clearer.
- Verified with clean `npx tsc --noEmit`.
- Added Comfortable/Compact density toggle to switch editing layout quickly.

---

## Current: Subject-Wise Admission (Fee Structure Only)

- [ ] Update live fee_structure_parsed.json with subject-wise entries
- [ ] Add subject-wise PROGRAM_MAP entries in feeSchedule.ts
- [ ] Add subject-wise toggle + subject dropdown in admission form Step 3
- [ ] Override fee-config lookup to use subject key when subject-wise is ON
- [ ] Create Frappe backend records (Programs, Fee Structures, Items, Student Groups)
- [ ] Test end-to-end subject-wise admission flow
- [ ] TypeScript clean compile verification

---

## Previous: Student Branch Transfer Feature (Completed)

### Implementation Summary
- [x] Frappe DocType "Student Branch Transfer" created on cloud (SBT-.##### autoname, 32 fields)
- [x] Types: `src/lib/types/transfer.ts`
- [x] API helpers: `src/lib/api/transfers.ts`
- [x] POST /api/transfer/request — sender BM creates transfer request
- [x] POST /api/transfer/respond — receiver BM accepts/rejects
- [x] POST /api/transfer/execute — 13-step transfer chain (cancel old SIs/SO/PE/CE/batch, update student, create new PE/batch/SO/SIs)
- [x] GET /api/transfer/list — filtered transfer list
- [x] GET /api/transfer/[id] — single transfer detail
- [x] TransferStatusBadge, TransferTimeline, TransferRequestModal, TransferReviewCard components
- [x] BM transfers list page (`/dashboard/branch-manager/transfers`)
- [x] BM transfer detail page (`/dashboard/branch-manager/transfers/[id]`)
- [x] Nav item added to BRANCH_MANAGER_NAV and DIRECTOR_NAV
- [x] Transfer button (ArrowRightLeft) added to students page actions
- [x] TypeScript clean compile (`npx tsc --noEmit` ✅)

---

## Previous: Student Admission Bug Fix Sprint (2026-03-07)

### 18 Bugs Found, 15 Fixed

#### CRITICAL
- [x] Bug #1: PE 409 Conflict kills entire admission flow → `createProgramEnrollment()` now handles 409 + recovers existing PE
- [x] Bug #2: Invoice overbilling (all invoices use same so_detail qty=1) → SO now uses qty=numInstalments, rate=perInstalmentRate

#### HIGH
- [x] Bug #3: No rollback — orphaned records on partial failure → Stage-based error tracking with warnings for partial success
- [x] Bug #4: `getBatchEnrollmentCounts()` compares SG names vs batch codes → Fixed to use `sg.batch` not `sg.name`
- [x] Bug #5: Invoice submission failure silently reported as success → Separate `drafts` array in response

#### MEDIUM
- [x] Bug #6: Mixed client-side fetch() and proxy in admitStudent → Kept fetch for Next.js API routes (correct usage)
- [x] Bug #7: "Auto-assign batch" label misleading → Changed to "No batch — assign later"
- [x] Bug #8: full_name → first_name with no last name splitting → Now splits on last space
- [x] Bug #9: Batch dropdown deduplicates by code, wrong group selected → Now shows Student Group names directly
- [x] Bug #11: getItemPriceRate falls back to 0 → admitStudent warns when rate=0
- [x] Bug #13: Auto-generated email collision across branches → Includes branch abbreviation in email
- [x] Bug #14: Mobile placeholder "+91 9876543210" vs 10-digit validation → Fixed to "9876543210"
- [x] Bug #16: create-invoices doesn't verify SO is submitted → Added docstatus check

#### LOW / DEFERRED
- [ ] Bug #10: createProgramEnrollment sends non-Frappe field student_group_name (handled gracefully)
- [ ] Bug #12: SRR ID race condition under concurrent admissions (needs server-side unique constraint)
- [ ] Bug #15: custom_mode_of_payment default value TypeScript hack (kept as-is, cleanest option)
- [ ] Bug #17: Fee Structure lookup uses transformed program name (edge case)
- [ ] Bug #18: Plaintext password in parent welcome email (needs password reset flow)

### Files Modified
1. `src/lib/api/enrollment.ts` — createProgramEnrollment 409 fix, admitStudent full rewrite, getBatch/getEnrolled fixes
2. `src/app/api/admission/create-invoices/route.ts` — SO docstatus check, submission failure tracking
3. `src/app/dashboard/branch-manager/students/new/page.tsx` — batch dropdown, name split, mobile placeholders, error handling
4. `src/lib/validators/student.ts` — (reviewed, kept as-is)

### TypeScript Verification
- `npx tsc --noEmit` ✅ (only pre-existing razorpay type error remains)

---

## Previous: E2E Admission-Fee-Payment Test (2026-03-06)

### Test Results — Full Pipeline
- [x] BM login (branchmanager@gmail.com) ✅
- [x] Guardian created: EDU-GRD-2026-00019 ✅
- [x] Parent user created: solutions.pydart@gmail.com / Test@123 ✅
- [x] Student created: STU-SU VYT-26-011 "Test Student Pydart" ✅
- [x] Program Enrollment: PEN-10th-Vennala 26-27-011 (submitted) ✅
- [x] Student Group: Added to Vennala-10th State-A ✅
- [x] Sales Order: SAL-ORD-2026-00047 | ₹23,800 (submitted) ✅
- [x] Invoices: 4 created (₹7000 + ₹5600×3 = ₹23,800) ✅ **(after qty=1 fix)**
- [x] SO billed: per_billed=100% ✅
- [x] Parent login: 200 OK, role=Parent ✅
- [x] Parent data API: 1 child, 1 SO, 4 invoices ✅
- [x] Razorpay create-order: order_SNi9gLa0B7CKNQ for ₹7,000 ✅
- [x] Generate Invoices button: hidden when per_billed=100% ✅

### Bug Fixed: UOM Fractional Qty Error
- **File**: `src/app/api/admission/create-invoices/route.ts`
- **Bug**: Calculated `qty = instalment_amount / so_total * so_item_qty` → 0.294 (fractional)
- **Error**: `UOMMustBeIntegerError: Quantity (0.294) cannot be a fraction`
- **Fix**: Use `qty: 1, rate: instalment_amount` per invoice item

### Previous Fixes (same session)
- [x] Added warnings array to `admitStudent()` return
- [x] Toast warnings in admission form for SO/invoice failures
- [x] "Generate Invoices" retry button on SO detail page
- [x] Parent portal "Invoices being processed" warning

---

## Previous: Create Sales Invoice from Sales Order

- [x] Deep study of all Frappe education DocType schemas and permissions
- [x] Audit instructor user roles, User Permissions, and API keys
- [x] Auto-add "Academics User" role to instructors at login
- [x] Guard DELETE on Student Group in proxy (prevent instructors deleting batches)
- [x] Add Room as required on new schedule form (matches Frappe schema)
- [x] TypeScript build passes clean

## Frappe Permission Matrix — Final State

| DocType | Instructor Role | Academics User Role | Gap Fixed? |
|---|---|---|---|
| **Student Attendance** | ❌ Not listed | read/write/create/submit/cancel/delete | ✅ Auto-added Academics User at login |
| **Course Schedule** | ❌ Not listed | read/write/create/delete | ✅ Auto-added Academics User at login |
| **Student Group** | read only | full CRUD | ✅ Proxy blocks write+delete for instructors |
| **Student** | read only | full CRUD | OK (read-only sufficient) |
| **Course** | full CRUD | full CRUD | OK |
| **Instructor** | read only | N/A | OK |

## Known Configuration Issue (Frappe Admin Action Needed)

The instructor `salihsali04@gmail.com` has a **Company User Permission** set to `Smart Up Thopumpadi`, but has course schedules at `Smart Up GCC` and `Smart Up Kacheripady`. When using the instructor's own API token, Frappe would restrict results to Thopumpadi only — hiding their actual schedules.

**Impact**: Once the instructor logs in (and gets api_key generated), the proxy will use their token, and they may not see their GCC/Kacheripady schedules.

**Fix options (Frappe admin)**:
1. Add additional Company User Permissions for each branch where the instructor teaches
2. Remove the Company User Permission and rely on frontend filtering by instructor name
3. Use `apply_to_all_doctypes: 0` on the Company permission so it only applies to HR doctypes

## Changes Made

### 1. Login Route (`src/app/api/auth/login/route.ts`)
- After detect instructor → check if "Academics User" role exists
- If missing → add via PUT to User doc's roles child table using admin token
- This is a one-time side effect per instructor login

### 2. Proxy (`src/app/api/proxy/[...path]/route.ts`)
- Extended write-guard to include DELETE method alongside PUT/POST
- Prevents instructors from deleting Student Group records (Academics User role grants this)

### 3. New Schedule Form (`src/app/dashboard/instructor/course-schedule/new/page.tsx`)
- Room field now marked as required with validation error
- Matches Frappe's `reqd: 1` on the Room field in Course Schedule schema
