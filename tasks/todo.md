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
- [/] 1. Pre-Deployment Verification <!-- id: dep-1 -->
  - [x] Run `npx tsc --noEmit` locally (verified: 0 errors).
  - [/] Run `npm run build` locally to ensure zero build or packaging issues before pushing to main.
- [ ] 2. Review & Stage Git Changes <!-- id: dep-2 -->
  - Stage verified changes in `src/app/dashboard/curriculum-dept/` (Excel exports for CWC & Exam Corner ranking), `src/app/scholar/page.tsx`, and fee conversion utility scripts.
  - Retain clean commit message adhering to conventional commits.
- [ ] 3. Push to Remote Repository (`origin/main`) <!-- id: dep-3 -->
  - Push committed changes to GitHub `pydart-hub/smartup-erp-frontend.git` on branch `main`.
- [ ] 4. Execute Server Clustered Safe Deployment <!-- id: dep-4 -->
  - Execute `bash /var/www/smartup-erp/scripts/deploy.sh` via SSH on `smartup-portal` (with `BypassSandbox: true` for network/SSH access).
- [ ] 5. Post-Deployment Verification <!-- id: dep-5 -->
  - Verify all 4 cluster instances (`smartup-erp-1` to `smartup-erp-4`) are online in PM2.
  - Verify local node responses on ports 3001, 3005, 3006, 3007.
  - Verify public HTTPS endpoint `https://smartuplearning.net` returns 200/307 OK.

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







- [x] Task 1: Update Hover Animation Properties in `src/app/scholar/page.tsx` <!-- id: hov-1 -->
  - Increased `whileHover` scale from `1.05` to `1.16` with smooth spring transition (`stiffness: 320, damping: 20`).
  - Added subtle 3D tilt enhancement (`rotateY: -7, rotateX: 4`) and `whileTap={{ scale: 1.02 }}`.
- [x] Task 2: Type Check & Build Verification <!-- id: hov-2 -->
  - Ran `npx tsc --noEmit` which completed with code 0 (zero errors).
- [x] Task 3: Production Deployment & Verification <!-- id: hov-3 -->
  - Deployed to production via `npm run deploy` and verified `200 OK` on `https://diagnosis.smartuplearning.net`.
  - Zero-downtime clustered reload of all 4 PM2 instances completed successfully with live commit `39e8be8`.



