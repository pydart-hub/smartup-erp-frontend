# One-to-One Tuition — Scheduling and Attendance Structure & Workflow

Date: 2026-05-04
Status: Design only (no implementation)

## 1. Objective

Build a one-to-one tuition operating model that is independent from current package/installment flow while reusing existing scheduling and attendance foundations.

This document covers:
1. Class scheduling lifecycle
2. Session execution and attendance marking
3. Billing and carry-forward effects
4. Role-wise operations
5. Controls, validations, and edge cases

## 2. Existing System Capabilities (What we can reuse)

Current codebase already supports:
1. Course schedule creation (single and bulk)
   - Course Schedule doctype with date, time, instructor, student_group, topic, event metadata
2. Topic sequencing in bulk schedule
3. Instructor-batch scoping via instructor assignments
4. Session-level attendance marking by instructor and branch manager
5. Parent attendance visibility and session topic/video linkage

Relevant modules:
- src/lib/api/courseSchedule.ts
- src/lib/api/attendance.ts
- src/lib/hooks/useInstructorBatches.ts
- src/app/dashboard/branch-manager/course-schedule/page.tsx
- src/app/dashboard/branch-manager/course-schedule/new/page.tsx
- src/app/dashboard/branch-manager/course-schedule/bulk/page.tsx
- src/app/dashboard/instructor/attendance/page.tsx
- src/app/dashboard/parent/attendance/page.tsx

## 3. One-to-One Operating Data Model

Recommended independent model:

### 3.1 O2O Enrollment Meta
Per student flags and pricing mode:
- custom_fee_mode = One-to-One
- custom_o2o_active = 1
- custom_o2o_rate_per_class

### 3.2 O2O Monthly Plan
One row per student-month:
- student, year, month
- planned_classes
- carry_forward_from_prev
- payable_classes
- rate_per_class
- payable_amount
- billed_invoice
- close_status

### 3.3 O2O Session (Execution Unit)
One row per class session (recommended as dedicated doctype OR extended Course Schedule fields):
- student
- instructor
- session_date, from_time, to_time
- status: Scheduled | Completed | Cancelled | Rescheduled | No-Show
- billable_month (YYYY-MM)
- billing_bucket: Planned | CarryForward | Extra | Makeup
- linked_course_schedule (optional)
- linked_attendance (optional)
- remarks

### 3.4 O2O Attendance Snapshot
For each scheduled session:
- attendance_state: Present | Absent | Late | Instructor Absent | Cancelled
- attendance_marked_by
- attendance_marked_on

If reusing Student Attendance:
- Present/Late count as delivered session
- Absent means not delivered
- Instructor Absent / Cancelled tracked on O2O Session status

## 4. Scheduling Lifecycle

## 4.1 Month Planning (Branch Manager / Academic Coordinator)
Input:
- planned classes for month
- rate per class (or inherited)
- preferred weekdays/time windows
- instructor preference

System does:
1. Pull carry_forward_from_prev
2. Compute payable_classes and payable_amount
3. Create planning target for calendar generation

Formula:
- payable_classes = planned_classes + carry_forward_from_prev
- payable_amount = payable_classes * rate_per_class

## 4.2 Slot Generation (Weekly/Monthly)
Generate actual session slots as Scheduled sessions.

Rules:
1. No overlap for instructor
2. No overlap for student
3. Respect holidays/closures
4. Optional fallback room or Online tag

Output:
- N scheduled sessions for month
- status = Scheduled
- billing_bucket default = Planned

## 4.3 Day Operations (Instructor)
Before class:
1. Instructor sees today sessions (already supported pattern)
2. Session starts and class delivered

After class:
1. Mark attendance
2. Mark session status Completed (if delivered)
3. Add topic covered/notes

## 4.4 Reschedule / Cancellation
If class moved:
1. Original session -> status Rescheduled (or Cancelled with reference)
2. New session created with linked origin
3. Billing bucket remains consistent unless explicitly changed

If instructor absent:
1. Mark status Instructor Absent
2. Session does not count as delivered
3. Optionally auto-create makeup candidate

## 5. Attendance Workflow for One-to-One

## 5.1 Attendance Marking Window
Recommended policy:
1. Attendance enabled only after session end time (for instructor view)
2. Branch Manager can override if needed

## 5.2 Attendance to Delivery Mapping
Map attendance to delivery count for billing reconciliation:
1. Present -> delivered_count +1
2. Late -> delivered_count +1 (or 0.5 if business wants weighted rule)
3. Absent -> no delivered count
4. Cancelled / Instructor Absent -> no delivered count

## 5.3 Re-open / Correction
Allow controlled correction with audit log:
1. Who changed status
2. Old value -> new value
3. Reason mandatory

## 6. Monthly Reconciliation Workflow

At month close:
1. Read payable_classes_m from plan
2. Compute delivered_classes_m from completed sessions
3. extra_classes_m = max(delivered - payable_classes, 0)
4. shortfall_classes_m = max(payable_classes - delivered, 0)
5. carry_forward_(m+1) = extra_classes_m

Important business rule from request:
- Extra sessions in month M are not payable in M
- They become payable in month M+1

Therefore:
- Invoice for month M must be based on payable_classes_m only
- Delivered extras adjust next month payable, not current month invoice

## 7. Billing Linkage Workflow

## 7.1 Invoice Creation (Accounts/BM)
Once month is ready:
1. Lock monthly plan row
2. Create one Sales Invoice for payable_amount
3. Include description metadata:
   - planned classes
   - carry-forward from previous month
   - payable classes
   - rate per class
4. Mark month row as Billed

## 7.2 Payment Collection
Use existing invoice payment flow unchanged.

## 7.3 Month Close
After billing snapshot + attendance finalization:
1. Close month reconciliation
2. Write next month carry-forward
3. Prevent editing closed month without privileged override

## 8. Role-Wise End-to-End Workflow

## 8.1 Sales User
1. Admit student in One-to-One mode
2. Capture rate per class and initial monthly planned classes
3. Create or assign one-to-one group if enabled

## 8.2 Branch Manager / Academic Coordinator
1. Create monthly plan
2. Generate session slots
3. Monitor daily completion and missed sessions
4. Approve reconciliation and invoice creation

## 8.3 Instructor
1. Conduct sessions from assigned list
2. Mark attendance/session completion
3. Add topic and remarks
4. Raise reschedule request when needed

## 8.4 Accounts
1. Generate monthly invoice from payable snapshot
2. Track payments through existing invoice flow

## 8.5 Parent
1. View session calendar/history
2. View attendance status per session
3. View monthly payable basis and invoices
4. Pay invoice using existing payment portal

## 9. Student Group Strategy for One-to-One

Recommended:
1. One group per student (O2O-...)
2. Keep group_based_on = Batch for compatibility
3. Add custom_is_one_to_one flag
4. Exclude these groups from normal classroom analytics where needed

Benefits:
1. Reuses schedule and attendance screens
2. Clear instructor assignment and permissions
3. Isolated reporting

## 10. UI/Screen Structure (Design)

## 10.1 New One-to-One Dashboard (BM)
Cards:
1. This month planned vs delivered
2. Extra sessions accrued
3. Upcoming sessions
4. Billing readiness

## 10.2 One-to-One Planner
1. Student selector
2. Month planner
3. Auto slot generation
4. Manual add/edit session

## 10.3 One-to-One Attendance Board
1. Session list by date
2. Attendance status toggles
3. Session status controls
4. Audit trail

## 10.4 One-to-One Billing Board
1. Monthly snapshot preview
2. Reconciliation result
3. Create invoice action
4. Close month action

## 11. Validations and Guardrails

Must enforce:
1. Single monthly plan row per student-month
2. No schedule overlap for instructor and student
3. Session cannot be Completed without attendance status
4. Closed month cannot be modified without override role
5. Invoice generation once per student-month
6. Carry-forward always system-calculated

## 12. Edge Case Handling

## 12.1 Student No-Show
- Session status No-Show or Absent
- Not counted as delivered
- Does not create carry-forward

## 12.2 Instructor No-Show
- Session status Instructor Absent
- Not delivered
- Eligible for makeup scheduling

## 12.3 Extra Session Added Mid-Month
- Mark billing_bucket = Extra
- Not billed in current month
- Added to next month carry-forward

## 12.4 Month Locked but Late Attendance Correction
- Create correction record
- Recompute next month carry-forward delta
- Do not mutate past invoice

## 13. Suggested API Surfaces (Design)

1. POST /api/o2o/month-plan/upsert
2. POST /api/o2o/session/generate
3. POST /api/o2o/session/update
4. POST /api/o2o/attendance/mark
5. GET /api/o2o/reconciliation/preview
6. POST /api/o2o/reconciliation/close
7. POST /api/o2o/invoice/create-monthly

All new endpoints must be parallel to existing flow and never break existing admission/invoice paths.

## 14. Month Workflow Timeline (Example)

For June:
1. June 1: Plan created (planned=20, carry=3, payable=23)
2. June 1-30: Sessions scheduled and delivered
3. June 30: Reconciliation computes delivered and extra
4. July 1: June invoice already based on payable=23 only
5. July planning receives carry-forward from June extras

## 15. Rollout Plan

1. Phase A: Data + backend contracts (no UI switch)
2. Phase B: BM planner + session management
3. Phase C: Instructor attendance and session closure
4. Phase D: Billing and month close
5. Phase E: Parent visibility and reports

## 16. Final Recommendation

Best practical approach for your project:
1. Keep existing Course Schedule + Student Attendance as operational engines
2. Add one-to-one monthly planning and reconciliation as independent layer
3. Use one-to-one session metadata to control billing behavior
4. Bill strictly from monthly payable snapshot, not from raw delivered count
5. Carry forward only extras to next month as requested

This gives full one-to-one independence with minimal disruption to your current production flow.
