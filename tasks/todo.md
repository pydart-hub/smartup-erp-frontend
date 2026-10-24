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
