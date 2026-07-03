# SmartUp ERP — Task Tracker

## Current: PDF and Excel Report Downloads (2026-07-01)

- [x] Plan and analyze PDF and Excel export libraries
- [x] Implement Excel generation and cell styling in `DiagnosisExamsReport.tsx`
- [x] Implement PDF generation and auto-table styling in `DiagnosisExamsReport.tsx`
- [x] Replace CSV button with a dropdown selecting Excel/PDF
- [x] Verify build correctness and deploy to production

### Review
- Replaced the single CSV download button with a dropdown menu displaying "Excel Document (.xlsx)" and "PDF Document (.pdf)".
- Implemented `handleDownloadExcel` utilizing `exceljs` to generate class-level sheet data with lavender header backgrounds and auto-fit column dimensions.
- Implemented `handleDownloadPDF` utilizing `jspdf` and `jspdf-autotable` to generate a styled landscape PDF report with brand violet headers (`#5f2ea8`) and italicized red text matching the UI styling for "Not Attended" entries.
- Verified TypeScript checks and deployed directly to production server (`smartup-erp`).

## Current: Diagnosis Exam Report Enhancements (2026-07-01)

- [x] Plan and analyze branch filtering and level score extraction
- [x] Modify `diagnostics.ts` helper to extract correct/total questions count per level
- [x] Implement branch filter dropdown, unattempted state, and scores under badge in `DiagnosisExamsReport.tsx`
- [x] Update attempt breakdown in `src/lib/public-exam/diagnostics.ts`
- [x] Update `getAttemptLevelBreakdown` to group questions, compute marks-based percentages, and mark the level with the minimum percentage as the diagnosed level.
- [x] Verify build correctness via typescript compilation

### Review
- Modified `diagnostics.ts` (`getAttemptLevelBreakdown`) to extract the `correctCount` and `totalCount` of the diagnosed level (the first failed level or the highest assessed level) and return them as `diagnosedCorrect` and `diagnosedTotal`.
- Added a Branch Filter dropdown in `DiagnosisExamsReport.tsx` allowing users to filter diagnostic details dynamically by branch.
- Filtered the CSV export output to match the current filtered view (branch & search parameters).
- Rendered "Not Attended" in styled, italicized red text when a student hasn't taken a subject's diagnosis exam (instead of showing a silent dash `—`).
- Displayed the score obtained in the diagnosed level questions (e.g. `3/5 marks`) directly underneath each diagnosed level badge.
- Verified compilation and production build correctness.

## Current: Restrict Overdue Batch Mapping to Current Class (2026-07-01)

- [x] Plan and analyze the mapping between clicked class and Student Group programs
- [x] Modify dues-till-today API route to filter student groups and support "Unassigned" batch query
- [x] Modify `getDuesTodayByStudent` client API helper and pages to pass class/item code
- [x] Verify TypeScript compiler diagnostics and build success

### Review
- Analyzed the backend database structure and identified that students transferred from 10th State to 10th CBSE still had outstanding 10th State Tuition Fee invoices, but were only enrolled in the `Edappally-10th CBSE-A` student group.
- Restructured `dues-till-today/route.ts` so that in `level === "batch"`, student groups are filtered by `program` matching the queried `item_code`'s program. This avoids mapping State fee dues to CBSE batches.
- Kept the `"Unassigned"` grouping in the response mapping as `"Unassigned Batch"` when students have dues but do not belong to any student group of that program.
- Enhanced the `level === "student"` endpoint to support `"Unassigned"` batch query and to filter invoices by `item_code` when queried, returning only class-specific dues.
- Updated `getDuesTodayByStudent` client API query helper to accept and pass the class/item code.
- Updated both Director and Sales User batch details pages to pass the queried `classId` parameter down.
- Verified compilation and build success cleanly via `npx tsc --noEmit` and `npx next build`.

## Current: Sales User Branch Restrictions (2026-06-22)

- [x] Add `SALES_USER_BRANCH_MAP` and helper to `src/lib/utils/constants.ts`
- [x] Overwrite allowed branches during login in `src/app/api/auth/login/route.ts`
- [x] Overwrite allowed branches in `src/app/api/auth/me/route.ts`
- [x] Scope API proxy queries to allowed branches for Sales Users in `src/app/api/proxy/[...path]/route.ts`
- [x] Scope dues-till-today endpoints for Sales Users in `src/app/api/fees/dues-till-today/route.ts`
- [x] Scope recently-paid-claims in `src/app/api/fees/recently-paid-claims/route.ts` and followup-dashboard in `src/app/api/sales-user/followup-dashboard/route.ts`
- [x] Filter dashboard and students list pages to show only allowed branches in frontend
- [x] Filter overdue-paid page to show only allowed branches in frontend
- [x] Add client-side route guards for overdue branch sub-pages
- [x] Run typechecks and build verification

### Review
- Enforced branch-level scoping on proxy request context for GET queries when roles includes "Sales User" mapping email via `getSalesUserBranches`.
- Enforced allowed company scoping for Sales Users in `dues-till-today/route.ts`, `recently-paid-claims/route.ts`, and `followup-dashboard/route.ts`. Attempting to load unauthorized branches directly returns `403 Forbidden`.
- Scoped frontend dashboard, students list, and overdue paid pages by destructuring `allowedCompanies` from `useAuth` and filtering branch records accordingly.
- Added strict client-side route guards on all overdue branch sub-routes (`/overdue/[branch]`, `/overdue/[branch]/all`, `/overdue/[branch]/[classId]`, `/overdue/[branch]/[classId]/[batch]`, and `/overdue/[branch]/paid-history`) displaying a custom Access Denied screen instead of initiating query fetch parameters.
- Verified compilation and build success cleanly via `npx tsc --noEmit` and `npx next build`.

## Current: Sales User Overdue Paid Overview Production Fix (2026-06-22)

- [x] Refactor `level === "branch_students"` logic in `src/app/api/fees/dues-till-today/route.ts` into a standalone helper
- [x] Modify `src/app/api/fees/recently-paid-claims/route.ts` to call this helper directly
- [x] Run typechecks and builds to verify changes
- [x] Test API endpoints locally

## Current: Push + Server Deployment & TS Bug Fixes (2026-06-22)

- [x] Fix TypeScript compilation errors in `BranchAllStudentsPage`
- [x] Verify repo state and build success locally
- [ ] Commit and push latest changes to origin/main
- [ ] Deploy latest commit on server and restart PM2 process
- [ ] Run post-deploy health checks and verify `https://smartuplearning.net`

## Previous: Remove Sales User Leads Dashboard & CRM Implementation (2026-06-18)

- [x] Remove Leads navigation link from `src/lib/utils/constants.ts`
- [x] Delete `src/lib/types/crm.ts`
- [x] Delete `src/lib/api/crm.ts`
- [x] Delete components under `src/components/crm/`
- [x] Delete route page under `src/app/dashboard/sales-user/leads/`
- [x] Delete offline CRM structure documentation and scratch scripts (`docs/offline_crm_structure.md`, `scripts/inspect_lead.js`)
- [x] Run compiler check (`npx tsc --noEmit` and `npx next build`) to verify a clean codebase

### Review
- Reverted Leads sidebar navigation links from `SALES_USER_NAV` in `src/lib/utils/constants.ts`.
- Deleted type, API client, custom components, routes, scripts, and documentation related to the offline CRM/Leads dashboard.
- Cleaned the `.next` compilation cache folder and verified a fully error-free project compile.

## Previous: Sales User Leads Dashboard (2026-06-18)

- [x] Create TypeScript types for `CRM Lead`, `CRM Lead Status`, and `CRM Lead Source` in `src/lib/types/crm.ts`
- [x] Implement client-side API helper functions in `src/lib/api/crm.ts`
- [x] Register navigation link for Leads in `src/lib/utils/constants.ts` under `SALES_USER_NAV`
- [x] Create `LeadStatusBadge` component at `src/components/crm/LeadStatusBadge.tsx`
- [x] Create `LeadFormModal` component at `src/components/crm/LeadFormModal.tsx`
- [x] Implement the Leads page at `src/app/dashboard/sales-user/leads/page.tsx`
- [x] Verify functionality, run build checks (`npx tsc --noEmit` and `npx next build`)

### Review
- Defined complete CRM type definitions matching the Frappe `CRM Lead`, `CRM Lead Status`, and `CRM Lead Source` Doctype schemas.
- Developed clean, typed client-side API helper queries using `@tanstack/react-query` to fetch leads (scoped to `lead_owner`), fetch dynamic dropdown options, update individual lead statuses, and aggregate KPI statistics.
- Added a "Leads" link to the `SALES_USER_NAV` sidebar definition under `src/lib/utils/constants.ts`.
- Created a robust color-coded status badge component mapping all 21+ backend stages to Tailwind CSS color styles.
- Created `LeadFormModal` using `react-hook-form` + `zod` to validate and submit new/edited leads, dynamically fetching status/source choices from Frappe and auto-filling `lead_owner` with the user's email.
- Created `/dashboard/sales-user/leads` route with KPI summary cards (Total, Active, Follow-up, Converted), a real-time searching/filtering control panel, a details table, inline quick status-change select triggers, and full-detail edit actions.
- Verified TypeScript compilation and production builds cleanly without errors.


## Current: Restrict Mentors Dashboard for Branch Manager (2026-06-18)

- [x] Create new API route `src/app/api/branch-manager/mentor-summary/route.ts` for branch-manager mentor summary
- [x] Add client-side fetch helper `getBranchMentorSummary` to `src/lib/api/mentors.ts`
- [x] Update `src/components/mentors/MentorSummaryReport.tsx` to support `hideBranchFilters`, `lockedBranch`, and `backHref` props
- [x] Update `src/app/dashboard/branch-manager/mentors/dashboard/page.tsx` to render `MentorSummaryReport` locked to the branch
- [x] Validate and run type checks (`npx tsc --noEmit`) and Next build (`npx next build`)
- [x] Verify functionality and visual layout

### Review
- Developed a new API route `/api/branch-manager/mentor-summary` requiring the "Branch Manager" role (or higher) and validating that the requested branch matches the operator's company access.
- Registered the `getBranchMentorSummary` fetch helper in `src/lib/api/mentors.ts` client API.
- Hardened the `MentorSummaryReport` component to support conditional filters and branch-locking props. When locked, the branch filter selection and the overall "Branch Coverage" list are hidden, and the mentor loading and comparison table expands to full screen width.
- Refactored `src/app/dashboard/branch-manager/mentors/dashboard/page.tsx` to render the brand-new restricted summary dashboard layout.
- Verified TypeScript compilation and production builds cleanly.

## Current: Mentors Landing Hub and Sub-pages Split (2026-06-18)

- [x] Revert Mentors sidebar navigation to a single link in constants.ts
- [x] Create a Landing Hub page at `src/app/dashboard/branch-manager/mentors/page.tsx` with 3 main navigation cards and live stats
- [x] Create Dashboard & Load details page at `src/app/dashboard/branch-manager/mentors/dashboard/page.tsx`
- [x] Create Mentor Profile Creation page at `src/app/dashboard/branch-manager/mentors/create/page.tsx`
- [x] Create Student Assignment page at `src/app/dashboard/branch-manager/mentors/assign/page.tsx`
- [x] Validate and run type checks (`npx tsc --noEmit`) and Next build (`npx next build`)
- [x] Verify functionality and visual appearance

### Review
- Reverted the Branch Manager sidebar layout for "Mentors" to a clean single link in `src/lib/utils/constants.ts` to keep the menu compact.
- Implemented a premium Mentors Portal Landing Hub page at `src/app/dashboard/branch-manager/mentors/page.tsx` with three 3D tilt cards utilizing the brand's primary teal and lime green color gradients.
- Created `/dashboard/branch-manager/mentors/dashboard` containing the metrics overview cards and expandable Branch Mentor Load lists.
- Created `/dashboard/branch-manager/mentors/create` containing the selector form to enroll active employees as new mentors.
- Created `/dashboard/branch-manager/mentors/assign` containing the student assignment tabs, search tools, and allocation table.
- Verified compilation and build success cleanly via `npx tsc --noEmit` and `npx next build`.

## Current: Mentor Students Academic Score & Attendance Details (2026-06-17)

- [x] Show academic average score and attendance rate directly on the "Assigned Students" table view
- [x] Integrate backend queries to fetch Student Attendance and Assessment Results from Frappe
- [x] Build redesigned Student details card with Academic Exam Results breakdown table
- [x] Add Attendance & Absent Days tracker card, detailing absent history and recent logs
- [x] Validate TypeScript compilation and production build cleanly

### Review
- Added average score and attendance rate calculation to `MentorStudentSummary` types and server builder in `src/lib/server/mentorData.ts`.
- Integrated `Student Attendance` and `Assessment Result` queries from Frappe into `buildMentorStudentSummaries` and `buildMentorStudentDetail`.
- Reworked Assigned Students table to show Academic Score and Attendance columns with colored outline badges.
- Updated Student details view to include:
  - **Academic Exam Results**: Showing Course, Assessment Group, score/maximum, grade badge, and exam date.
  - **Attendance & Absent Days**: Showing attendance rate (%), Present Days/Total, Absent Days count, Absent History dates, and recent logs list.
- Verified TypeScript compilation (`npx tsc --noEmit`) and next build (`npx next build`) passed successfully.
- Conducted interactive verification via browser subagent and confirmed visual appeal and correct behavior of all components.

## Current: Director Mentor Feedback Drill-down View (2026-06-17)


- [x] Add state variables for active category tab, selected branch, and selected mentor
- [x] Calculate branch-level aggregates (total logs, action items, unique mentors)
- [x] Build Level 1 view showing a grid of branch classification cards
- [x] Build Level 2 view showing branch-specific mentors cards
- [x] Build Level 3 view displaying selected mentor's feedback logs with back-navigation
- [x] Verify functionality and compile check cleanly

### Review
- Restructured `MentorFeedbackReport` to include a category tabs view-switcher for **Drill-down View** (default) and **Global Search**.
- Added branch classification cards (Level 1) displaying total feedback count, action required badge, and unique mentor count.
- Added branch-specific mentor cards (Level 2) with individual logs and action counts.
- Added structured logs timeline (Level 3) displaying Academic Notes, Fee Notes, Contact Notes, and Overall Feedback side-by-side with appropriate headers.
- Wired back-navigation paths between all drilldown levels.
- Verified compilation and build success cleanly via `npx tsc --noEmit` and `npx next build`.
- Interactively verified using browser subagent (navigating through Edappally branch and testing notes display).

## Current: Batch-wise Student Assignment Classification (2026-06-17)

- [x] Fetch active Student Groups (batches) and details for the branch in parallel
- [x] Compute batch-wise total, assigned, and unassigned student counts
- [x] Build interactive grid of batch cards (including "All Students") showing assignment progress
- [x] Filter student table on card selection and support searching within selected batch
- [x] Verify functionality and clean compile check via typescript build
- [x] Group batches into categories: Regular, Subject-Wise, and One-to-One
- [x] Add category tabs switcher to filter the batch cards grid
- [x] Implement category-level student list filtering when no specific batch is selected

### Review
- Added `batchesDetailedQuery` to fetch all active `Student Group` (batch) records for the active branch and resolve their student memberships in parallel using `getBatch`.
- Computed batch-wise metrics: total, assigned, and unassigned (pending) students.
- Implemented a premium interactive cards grid displaying batch names, programs, assignment progress percentage, a linear progress bar, and metrics breakdown.
- Wired card selection state (`selectedBatchId`) to filter the student table, displaying only students enrolled in the selected batch.
- Verified compilation and build success via `npx tsc --noEmit` and `npx next build`.
- Interactively verified behavior using a browser subagent: clicking batch cards filters the student table to the correct active students.

## Current: Director Fee Follow-Up Shows No Data (2026-05-25)

- [x] Reproduce and trace director fee-followup request params from UI state to API route
- [x] Identify and fix filter/parsing mismatch causing empty logs and zero summary cards
- [x] Validate with TypeScript diagnostics and targeted runtime request checks
- [x] Add review notes with root cause and behavior impact

### Review
- Root cause confirmed from live Frappe data: records exist, but the dashboard defaulted to a narrow date window that can become a same-day filter with no rows, resulting in empty cards/logs.
- Updated [src/app/dashboard/director/fee-followup/page.tsx](src/app/dashboard/director/fee-followup/page.tsx) to default `from` to the last 7 days instead of week-start, so recent follow-ups are visible on initial load.
- Hardened [src/app/api/director/fee-followup/route.ts](src/app/api/director/fee-followup/route.ts) with `normalizeDateParam()` to accept both `YYYY-MM-DD` and `DD-MM-YYYY` query params and avoid silent empty results from format mismatch.
- Verification completed: touched-file diagnostics show no errors and `npx tsc --noEmit` completed cleanly.

## Current: Director Leaderboard Route Split (2026-05-14)

- [x] Create a Director leaderboard selector page with two cards (Branch, Instructor)
- [x] Move existing Director Branch Leaderboard implementation behind the Branch card route
- [x] Add an empty Instructor leaderboard page as placeholder
- [x] Validate TypeScript diagnostics on touched files

### Review
- Replaced the Director leaderboard index route with a two-card selector page so sidebar click now opens Branch/Instructor options.
- Moved the previous full Branch Leaderboard implementation to `/dashboard/director/leaderboard/branch` by copying the existing page into that route.
- Added a new Instructor Leaderboard route at `/dashboard/director/leaderboard/instructor` as an intentionally empty placeholder.
- Verified diagnostics for touched files with no TypeScript errors.

## Current: Kadavanthra + Edappally Advanced Fee Structure Deep Study (2026-05-13)

- [x] Locate and inspect the workbook `docs/kadavanthra&EDAPPALLY fee structure newww.xlsx`
- [x] Extract all Advanced pricing blocks branch-wise from both sheets
- [x] Validate instalment and quarterly arithmetic for each block
- [x] Produce an update-ready normalized structure for existing Advanced fee updates

### Review
- Deeply studied the workbook with two sheets: `KADAVANTHARA` and `EDAPPALLY`.
- Confirmed common class-level Advanced pricing is identical across branches for overlapping classes.
- Identified Edappally-specific row `9 State` and Kadavanthra-only additional blocks (HSS + 10th subject-wise in quarterly and 6/8 formats).
- Created a full reference structure document in `docs/ADVANCED_FEE_STRUCTURE_KDV_EDAPPALLY_2026-27.md` with all extracted tables and validation notes.

## Current: Work Assignment MVP Completion (2026-05-12)

- [x] Build General Manager Work Assignment form (create/edit draft) with instructor row management
- [x] Build General Manager Work Assignment detail review page with approve/reject actions
- [x] Build Instructor Assignment detail page with submission modal and status timeline
- [x] Add missing routes for create/details and align list page links
- [x] Validate with TypeScript compile and add review notes

### Review
- Implemented `WorkAssignmentForm`, `WorkAssignmentDetail`, and `InstructorAssignmentDetail` components with live API integration for create/save/submit, instructor submission, and GM approve/reject workflow.
- Added missing routes for GM create/detail and instructor detail pages under the dashboard route tree.
- Fixed initial scaffolding issues in work-assignment files (invalid UI imports and non-existent components) and aligned links to real dashboard paths.
- Added Work Assignment navigation entries for General Manager and My Assignments for Instructor.
- Validation: `npx tsc --noEmit` completed with no TypeScript output and focused diagnostics on newly added files returned no errors.

## Current: Director Students Dark Mode Visual Refresh (2026-05-11)

- [x] Audit current Director Students dark-mode visual hierarchy and identify low-contrast/flat sections
- [x] Redesign dark-mode styling for header, summary strip, and branch cards with stronger depth and accents
- [x] Preserve existing data logic/interactions and improve perceived motion/hover states only
- [x] Validate with TypeScript compile and document review notes

### Review
- Updated only `src/app/dashboard/director/students/page.tsx` with class/markup-level styling improvements; no query keys, API calls, counting logic, or navigation routes were changed.
- Added a stronger dark-mode visual direction: atmospheric gradient glows, glass-like card surfaces, richer contrast, and premium accent tones across summary blocks and branch cards.
- Reworked light-only chips/tiles into dark-aware palettes for plan and type distribution so counts remain readable and visually distinct in dark mode.
- Improved polish in header/search CTA surfaces and button emphasis while preserving existing interactions and motion behavior.
- Validation: `npx tsc --noEmit` completed with no TypeScript output (clean run).

## Current: HR Manager Attendance UI Polish (2026-05-08)

- [x] Audit current HR attendance page layout and preserve all existing behavior/data flow
- [x] Apply professional visual redesign (header, KPI cards, list rows, status chips, save bar) with UI-only class/markup updates
- [x] Validate with TypeScript compile and document review notes

### Review
- Updated only `src/app/dashboard/hr-manager/attendance/page.tsx` with class/markup-level UI polish; no API, query, save, or attendance-status logic was changed.
- Refined visual hierarchy: premium header card with date control, upgraded search container, richer KPI cards with icons, cleaner employee rows, clearer status/pending badges, and glass-style sticky save bar.
- Kept all existing interactions unchanged: date selection reset behavior, search filtering, per-employee status toggles, pending-change tracking, and save flow.
- Validation: file diagnostics reported no errors and `npx tsc --noEmit` completed without TypeScript output (clean run).

## Current: Instructor Dashboard Batches Not Loading on 403 Instructor Doc Access (2026-05-08)

- [x] Reproduce and trace instructor dashboard batch-loading path for restricted Instructor role
- [x] Add permission-safe fallback in instructor batches hook when Instructor doctype read fails (403)
- [x] Ensure fallback sources use existing session permissions (`allowed_batches`) and instructor-owned schedules
- [x] Validate with TypeScript compile and summarize behavioral impact

### Review
- Root cause confirmed: `useInstructorBatches` depended on direct `GET /resource/Instructor/{name}`. Restricted instructor users can get `403 PermissionError` for the Instructor doctype, so batch resolution failed early and returned no groups.
- Updated `src/lib/hooks/useInstructorBatches.ts` to use a resilient lookup chain:
  - Primary: Instructor `instructor_log` mapping (existing behavior)
  - Fallback A: session `allowed_batches` permissions from login cookie/store
  - Fallback B: infer assigned `student_group` values from the instructor's own Course Schedule rows
- This keeps existing behavior for fully permitted users while allowing restricted-role instructors to still load My Batches.
- Validation: `npx tsc --noEmit` completed cleanly after the patch.

## Current: Submit SUHANA Program Enrollment (2026-05-08)

- [x] Submit Program Enrollment `PEN-10th--169` for `STU-SU ERV-26-169`
- [x] Verify Program Enrollment moved to `docstatus = 1`
- [x] Verify downstream academic records (course enrollment / student group) status after submit

### Review
- First submit attempt failed with mandatory validation: Course Enrollment required Batch Name (`custom_batch_name`).
- Patched Program Enrollment `student_batch_name` to `Eraveli 26-27` (matching successful Eraveli admissions).
- Re-submitted Program Enrollment successfully; `docstatus` moved from `0` to `1`.
- Auto-created Course Enrollment rows now exist (10 rows) with `custom_batch_name = Eraveli 26-27`, linked to `PEN-10th--169`.

## Current: SUHANA PARVEEN KS Admission Integrity Audit (2026-05-08)

- [x] Locate student record in Eraveli branch and confirm identity fields
- [x] Trace latest admission/program enrollment and submission state
- [x] Verify linked course schedule/course enrollment/student group consistency
- [x] Verify linked Sales Order and Sales Invoice chain consistency
- [x] Document whether all required records are correctly created and note any mismatch

### Review
- Student exists and branch is correct: `STU-SU ERV-26-169` / `SUHANA PARVEEN KS` / `Smart Up Eraveli`.
- Program Enrollment `PEN-10th--169` exists but is `docstatus = 0` (Draft), with `student_batch_name = null`.
- No Course Enrollment rows were found for this student.
- No Course Schedule evidence was found for this student path.
- Sales Order `SAL-ORD-2026-00911` exists and is submitted (`docstatus = 1`) with `grand_total = 16300`, `per_billed = 100`, `billing_status = Fully Billed`.
- 8 Sales Invoices exist for this customer (`ACC-SINV-2026-06912` to `ACC-SINV-2026-06919`) under company `Smart Up Eraveli`.
- Core mismatch: finance flow completed, but admission academic flow did not complete (PE still Draft), so downstream academic artifacts were not generated.

## Current: Director Actions Needed Page + Nav Integration (2026-05-07)

- [x] Create Director Actions Needed overview page matching GM actions-needed behavior
- [x] Create Director branch-level Actions Needed detail page
- [x] Add top-level Director sidebar/nav item for Actions Needed and validate TypeScript

### Review
- Added Director routes at `dashboard/director/actions-needed` and `dashboard/director/actions-needed/[branch]` using the same weekly analytics workflow as General Manager.
- Wired Director navigation with a top-level `Actions Needed` item so it appears in the main sidebar/top nav hierarchy.
- Added enhanced visual motion in the Director actions overview (animated hero glow + hover lift) for a more attractive animated feel.
- Verified with `npx tsc --noEmit` (`tsc_ok`).

## Current: Director Academics Course Schedule Parity with GM (2026-05-07)

- [x] Mirror GM course-schedule controls and KPI layout in Director Academics course-schedule page
- [x] Add branch expansion details and export actions on Director Academics course-schedule page
- [x] Validate with TypeScript compile and add review notes

### Review
- Replaced Director Academics Course Schedule overview with GM-parity layout and behavior.
- Added public-holiday adjustment, All/Only Problem Branches filter chips, and the 5 KPI cards (Working, Scheduled, Attendance Marked, Attendance Not Marked, Operational %).
- Added expandable branch rows with Not Scheduled Dates and Attendance Not Marked Dates chips.
- Added export actions (PDF/Excel) and full branch comparison table matching GM structure.
- Verified with `npx tsc --noEmit` (`tsc_ok`).

## Current: Director Academics Exams Scheduled/Completed Metrics (2026-05-07)

- [x] Add scheduled/upcoming/completed exam status metrics to Director Academics Exams overview
- [x] Show branch-wise scheduled/upcoming/completed counts in branch rows
- [x] Validate with TypeScript compile and add review notes

### Review
- Added a second KPI row on Director Academics Exams for Scheduled, Upcoming, and Completed counts.
- Wired status counts from live Assessment Plan data (`schedule_date` vs today) and grouped by branch.
- Added branch-row detail line to show branch-wise Scheduled/Upcoming/Completed counts under existing exam/pass-rate text.
- Fixed zero-value mismatch by normalizing branch keys during Assessment Plan grouping (`branch`, `branch_name`, and `custom_branch`) and adding fallback to `total_exams_conducted` when matching plans are unavailable.
- Verified with `npx tsc --noEmit` (`tsc_ok`).

## Current: Director Academics Attendance Parity with GM (2026-05-07)

- [x] Study General Manager attendance implementation and identify parity gaps in Director Academics attendance page
- [x] Update Director Academics attendance page to match GM attendance controls, summary cards, and branch metrics presentation
- [x] Validate with TypeScript compile and add review notes

### Review
- Updated Director Academics attendance page to mirror General Manager attendance behavior and layout.
- Added public-holiday adjustment controls (`-`, `+`, `Reset`) and problem-branch filter chips (`All Branches`, `Only Problem Branches`).
- Added second KPI row: Working Days, Scheduled Days, Not Scheduled, Attendance Marked, and Att Not Marked.
- Extended each branch row to show detailed metrics line (working/scheduled/not scheduled/attendance marked/attendance not marked), matching GM presentation.
- Verified with `npx tsc --noEmit` (`tsc_ok`).

## Current: Director N/A Plan Count Mismatch (2026-05-07)

- [x] Reproduce global vs branch-wise N/A mismatch from current counting paths
- [x] Align branch fallback plan-count source with global per-student latest PE logic
- [x] Fix global plan aggregation to sum grouped rows safely
- [x] Update branch students summary math to include Demo bucket in known plans
- [x] Validate with typecheck/build and summarize root cause + resolution

## Current: Director Student Plan Count Reconciliation (2026-05-07)

- [x] Trace Director overview and branch-card count mismatch to plan aggregation logic
- [x] Extend plan-count data source to include Free Access and reconcile uncategorized active students
- [x] Update Director overview and branch cards to display the missing buckets clearly
- [x] Validate TypeScript compile and summarize root cause

## Current: Converted Student Invoice Mismatch Fix (2026-05-07)

- [x] Reproduce and study mismatch between student Fee & Payments card and View Order page
- [x] Scope student invoice list/totals to the same Sales Order opened by View Order
- [x] Validate TypeScript compile and runtime data path assumptions
- [ ] Push and deploy after fix verification (paused by user)

### Review
- Verified live data mismatch: order `SAL-ORD-2026-00903` has zero linked invoices, while customer invoices exist under another order (`SAL-ORD-2026-00905`).
- Updated student page to select a primary billed order (`per_billed > 0`) so Fee & Payments and View Order target the same order context.
- Kept the invoice list scoped to the selected order only (no customer-wide mixing), preventing cross-order confusion.

## Current: Push + Server Deployment (2026-05-07)

- [ ] Verify repo state and deployment target
- [ ] Run pre-push validation (type check/build where needed)
- [ ] Commit and push latest changes to origin/main
- [ ] Deploy latest commit on server and restart process
- [ ] Run post-deploy health checks and record review notes

## Current: Edappally Fee Structure Study From Kadavanthra Workbook (2026-05-07)

- [x] Inspect the provided Kadavanthra fee structure workbook directly
- [x] Normalize the pricing blocks into a branch-ready structure for Edappally
- [x] Confirm this is analysis only and defer implementation until user command

### Review
- Studied [docs/kadavanthra fee structure newww.xlsx](c:\Users\arjun\Desktop\Stibe\smartup-erp-frontend\docs\kadavanthra fee structure newww.xlsx) directly instead of relying on older parsed JSON.
- Confirmed the workbook is a single-sheet table with six pricing blocks: Basic quarterly, Basic 6/8 instalment, HSS quarterly, HSS 6/8 instalment, 10th subject-wise quarterly, and 10th subject-wise 6/8 instalment.
- Normalized the structure for Edappally on the stated assumption that Edappally and Kadavanthra use the same fee structure.
- No implementation or backend/frontend data changes were made.

## Current: Edappally Basic Fee Structure Sync (2026-05-07)

- [x] Update Edappally Basic standard-program pricing data to match the provided workbook
- [x] Add a targeted audit script for matching Edappally Basic Fee Structure records in Frappe
- [x] Route admission billing to prefer the computed schedule total so new Edappally pricing is used even when submitted Fee Structure totals are stale
- [x] Validate TypeScript and verify the updated Edappally pricing slice

### Review
- Updated Edappally Basic standard-program entries in [docs/fee_structure_parsed.json](c:\Users\arjun\Desktop\Stibe\smartup-erp-frontend\docs\fee_structure_parsed.json) for 9th CBSE, 10th State, 10th CBSE, Plus One, and Plus Two to match the provided Kadavanthara workbook values.
- Updated [src/lib/api/enrollment.ts](c:\Users\arjun\Desktop\Stibe\smartup-erp-frontend\src\lib\api\enrollment.ts) so Sales Order pricing prefers the computed instalment schedule total for one-time payment too, removing dependence on stale immutable Fee Structure totals for new admissions.
- Updated [src/lib/api/fees.ts](c:\Users\arjun\Desktop\Stibe\smartup-erp-frontend\src\lib\api\fees.ts) to request the newest matching Fee Structures first.
- Confirmed live submitted Fee Structure docs for Edappally reject `total_amount` changes via Frappe `UpdateAfterSubmitError`, so backend document totals were not modified through the available API.
- Added [scripts/sync-edappally-basic-fees.mjs](c:\Users\arjun\Desktop\Stibe\smartup-erp-frontend\scripts\sync-edappally-basic-fees.mjs) as an audit script to compare live Edappally Basic records against the workbook target values without attempting an invalid in-place mutation.

## Current: Admission-Date Based Instalment Due Dates (2026-05-07)

- [x] Update central instalment due-date generation to derive dates from enrollment/admission date for 1/4/6/8 options
- [x] Reuse shared schedule generator in demo-conversion backend route to remove fixed calendar templates
- [x] Update demo-conversion preview UI to use shared schedule generator for consistent due dates
- [x] Update branch-manager manual invoice generation flow to anchor due dates to Sales Order transaction date
- [x] Update branch-transfer schedule generation to pass transfer enrollment date into shared generator
- [x] Validate TypeScript compile and add review notes

### Review
- Centralized due-date logic now computes due dates from `enrollmentDate` using month offsets: `1:[0]`, `4:[0,3,6,9]`, `6:[0,2,4,6,8,10]`, `8:[0..7]`.
- Added robust month-addition with day clamping (e.g., 31st to shorter months) in `feeSchedule.ts`.
- Demo conversion backend and preview UI now consume the same shared generator, eliminating hardcoded June/September/December/March templates.
- Branch Manager invoice-generation fallback now derives due dates from SO `transaction_date` instead of fixed academic-month templates.
- Transfer execution schedule generation now passes transfer date to the shared generator, so transfer invoices also follow admission-date anchoring.
- Verified with `npx tsc --noEmit` (clean).

## Current: Multi-Branch Instructor Scheduling + Attendance Design (2026-05-06)

- [x] Audit current instructor assignment, scheduling, and attendance flows across frontend and backend routes
- [x] Identify single-branch assumptions that block cross-branch instructor scheduling
- [x] Propose target data structure, API contract, permissions model, and operational workflow (design only)
- [x] Document phased implementation plan with validation and rollout safeguards (no code implementation yet)

### Review
- Completed deep code and docs study for instructor assignment, course schedule creation, and attendance marking paths.
- Confirmed the primary blocker: instructor discovery is filtered by employee home company rather than instructor_log branch assignments.
- Confirmed attendance flow is session-driven and can support multi-branch instructors once schedule + permission scoping is made explicit.
- Prepared a phased, non-destructive implementation structure covering backend data model, API changes, frontend UX, conflict checks, and rollout strategy.

## Current: Multi-Branch Instructor Scheduling + Attendance Implementation (2026-05-06)

- [x] Switch instructor discovery to instructor_log branch matching (with legacy fallback)
- [x] Enforce branch+program+course instructor assignment validation before schedule creation
- [x] Update branch-manager schedule filtering to include branch-aware instructor_log checks
- [x] Make instructor attendance session completion and save path course_schedule-aware
- [x] Validate TypeScript compile and add review notes

### Review
- Updated instructor discovery so branch eligibility is read primarily from `instructor_log.custom_branch`, with a legacy fallback to employee company only when logs are empty.
- Added server-side assignment validation endpoint (`/api/course-schedule/validate-assignment`) and wired schedule creation to validate branch+program+course before writing standard class schedules.
- Updated branch-manager schedule filtering logic to require branch-aware instructor_log matches in all program/course narrowing paths.
- Updated instructor attendance to treat completion and writes as session-specific (`course_schedule`) rather than only batch+date, fixing same-day multi-session ambiguity.
- Verified with `npx tsc --noEmit` and workspace diagnostics (no errors).

## Current: Demo Conversion Sibling Discount Backward Allocation (2026-05-06)

- [x] Change demo-conversion sibling discount allocation from first instalment to last-invoice-backward in backend
- [x] Mirror the same backward sibling discount allocation in conversion preview UI
- [x] Validate TypeScript compile and add review notes

### Review
- Updated demo-conversion sibling offer allocation so the sibling discount is deducted from the last invoice first, then second-last, and so on when needed.
- Kept the existing operation order: sibling discount is applied first, then demo credit is also reduced from the end backward on the already-discounted schedule.
- Preserved accumulated discount metadata on schedule rows so invoice descriptions can reflect combined adjustments more safely.
- Verified with `npx tsc --noEmit`.

## Current: Demo Conversion Sibling Toggle-Only (2026-05-06)

- [x] Remove sibling picker UI from demo conversion modal and keep only toggle behavior
- [x] Add backend auto-resolution for eligible sibling when toggle is ON
- [x] Keep strict validation and discount order (sibling first, demo credit second)
- [x] Validate TypeScript compile and add review notes

### Review
- Removed manual sibling search/select UI from demo conversion and retained a toggle-only sibling offer interaction.
- Updated conversion API so sibling offer can be enabled without sending a sibling ID; backend now auto-resolves sibling from `custom_sibling_of` first, then `custom_sibling_group`.
- Added first-student fallback auto-resolution by matching `custom_parent_name` within the same branch when sibling link/group is not yet set.
- Added guardian-based auto-resolution fallback so first-student conversion can still resolve a sibling when the sibling relationship exists through shared guardian links instead of text/link fields.
- Fixed a stale React callback dependency in conversion submit logic that could send sibling offer as OFF despite toggle ON, causing full-amount invoices.
- Preserved existing safety checks (same student blocked, inactive sibling blocked, cross-branch blocked) and preserved discount order: sibling discount first, demo credit second.
- Verified with `npx tsc --noEmit`.

## Current: Demo To Regular Sibling Offer (2026-05-06)

- [x] Add sibling selection and preview support in demo-to-regular conversion modal
- [x] Apply sibling-offer discount in conversion API before demo credit adjustment
- [x] Persist sibling linking fields during conversion without touching demo payments
- [x] Validate TypeScript compile and add review notes

### Review
- Added sibling-offer selection to the demo-to-regular conversion modal using the existing sibling search endpoints, scoped to the same branch.
- Conversion preview now shows sibling-offer math together with demo credit math: sibling discount is applied first to the first instalment, then demo credit is reduced from the last instalment(s).
- Updated the conversion API to validate the selected sibling, apply the sibling discount during regular invoice generation, and persist sibling linking fields without altering existing demo payments.
- Verified with `npx tsc --noEmit` after implementation.

## Current: Director Teachers Page — Permission Fix (2026-05-06)

- [x] Trace "Failed to load teachers" error on Director Teachers page
- [x] Create server-side `/api/director/branch-instructors` route with admin token fallback
- [x] Update client API to call server route instead of direct Frappe API calls
- [x] Fix route authorization to check Director role instead of branch restrictions
- [x] Fix response structure mismatch (API wrapper and axios double-wrapping)
- [x] Fix instructor count consistency — overview now shows Instructor count, not total staff count
- [x] Validate TypeScript compile and add review notes

### Review
- The Director Teachers page was failing because it tried to fetch Instructor and Employee records directly from Frappe API, which are restricted by role permissions for non-admin users.
- Added a new server-side route at `/api/director/branch-instructors` that uses admin credentials (`FRAPPE_API_KEY`/`FRAPPE_API_SECRET`) to safely fetch instructors for a branch without permission issues.
- Updated `getBranchInstructors()` to call the server route instead of making direct Frappe calls.
- Fixed the route authorization to check for Director/Management/Administrator role instead of branch-company restrictions. This allows Directors to view instructors for any branch they request, consistent with the leaderboard and other Director endpoints.
- Fixed API response structure: server now returns the array directly, and the client properly extracts it from axios response.
- Updated `getInstructorCountForBranch()` to count only employees with Instructor records (via the new route), not all Active Employees. This makes the overview branch card counts consistent with the detailed instructors page.
- Verified all changes have no TypeScript errors.

## Previous: Instructor Attendance Start-Time Unlock + Error Surface (2026-05-06)

- [x] Change instructor attendance session unlock from class end time to class start time
- [x] Add backend error message parsing on instructor attendance save failures
- [x] Validate TypeScript compile and add review notes

### Review
- Updated instructor attendance session gating so instructors can open and mark attendance once a class starts, while still keeping future sessions locked.
- Added Frappe `_server_messages` parsing to the instructor attendance save path, so select-field validation and similar backend failures now show the actual message instead of a generic failure toast.
- Verified the changed file has no editor diagnostics and ran `npx tsc --noEmit` without reported diagnostics.

## Current: ERP Frontend Server Deployment (2026-05-06)

- [x] Verify current deployment status on portal server (repo, PM2, Nginx)
- [x] Pull latest code and install dependencies on server
- [x] Build and restart `smartup-erp` on port 3001 via PM2
- [x] Run post-deploy health checks for app and domain
- [x] Add review notes with deployed commit and verification result

### Review
- Verified server repo at `/var/www/smartup-erp` on branch `main` with commit `691b8434f6d941372b26804210d3714c7b610d6a`.
- Executed `git fetch` and `git pull --ff-only origin main`; server was already up to date.
- Ran production build with `npx next build` successfully (compiled and generated all routes).
- Restarted PM2 process `smartup-erp` with `--update-env` and saved PM2 process list.
- Post-deploy checks passed: `pm2 status smartup-erp` is `online`, `http://localhost:3001` returns `HTTP/1.1 307 Temporary Redirect`, and `https://smartuplearning.net` returns `HTTP/2 307`.

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

## Current: Standalone Diagnosis Exam Website (Decoupled)

- [x] Install PostgreSQL on VPS & Create database `smartup_offline` with user `smartup_offline_admin` and password `Smartup@123`
- [x] Add `STANDALONE_DATABASE_URL` environment variable to `.env.local`
- [x] Add `prisma` and `@prisma/client` dependencies to `package.json` and initialize Prisma schema
- [x] Create `prisma/schema.prisma` with standalone schemas
- [x] Write database client singleton helper in `src/lib/public-exam/db.ts`
- [x] Write seeding script `scripts/seed-standalone-exams.ts` to parse `docs/Level Test/JSON/*.json`
  - Rule: Grade 10 exam uses levels 5-9 questions; Grade 9 uses levels 5-8; Grade 8 uses levels 5-7.
  - Quality check: Filter for valid MCQs (`correct_option_key` and at least 2 options).
- [x] Run the database seeding to populate Postgres tables
- [x] Implement Serverless APIs for the public exam:
  - `GET /api/public-exam/active` (fetch active exam for class)
  - `POST /api/public-exam/start` (register user, snapshot questions, return session token)
  - `POST /api/public-exam/attempt/[attemptId]/answer` (autosave single answer)
  - `POST /api/public-exam/attempt/[attemptId]/submit` (grade attempt, save stats & AI feedback)
- [x] Create Standalone public pages under `/exam-site`:
  - `/exam-site` (Landing/Registration page)
  - `/exam-site/attempt/[attemptId]` (Interactive player, timer, and autosave)
  - `/exam-site/result/[attemptId]` (Score card & feedback summary)
- [x] Add "Diagnosis Exam" button next to "Try Demo" in `src/app/auth/login/page.tsx`
- [x] Add Admin Results viewer pages under `/dashboard/general-manager/standalone-exams`
- [x] Run type-checking `npx tsc --noEmit` and production build `npm run build` to verify

---

## Pending: Subject-Wise Admission (Fee Structure Only)

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
