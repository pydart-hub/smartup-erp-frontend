# Multi-Session Staff Attendance Implementation Plan

## Overview
Enable multiple attendance sessions per employee per day (e.g. 09:00 - 12:00 and 16:00 - 18:00) stored directly within Frappe `Attendance` DocType via `custom_branch_sessions` (child table) and `custom_sessions_json`.

## Checklist
- [x] Step 1: Update Server Script `set_attendance_status` to handle multiple sessions per branch and populate child table `custom_branch_sessions` + `working_hours` + `custom_sessions_json`.
- [x] Step 2: Update TypeScript types and API client functions in `src/lib/api/employees.ts`.
- [x] Step 3: Update Branch Manager Staff Attendance UI (`src/app/dashboard/branch-manager/attendance/staff/page.tsx`) to support viewing, adding, editing, and removing multiple sessions per employee.
- [x] Step 4: Update HR Manager Attendance Report (`src/app/dashboard/hr-manager/report/page.tsx`) to display multi-session chips, working hours sum, and handle Excel/PDF exports with multi-session breakdowns.
- [x] Step 5: Update Director Staff Attendance views (`src/app/dashboard/director/attendance/staff/[branchId]/page.tsx` & report) for consistency.
- [x] Step 6: Verify types (`npx tsc --noEmit`), test build, and verify end-to-end functionality.

## Verification
- Frappe Server Script `set_attendance_status` updated on Frappe Cloud (HTTP 200).
- `npx tsc --noEmit --skipLibCheck` executed with 0 errors.
