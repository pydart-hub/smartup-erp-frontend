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
