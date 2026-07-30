# Mentor Role Structure and Workflow

## Purpose

This document studies:

1. The new business requirement for a `Mentor` role
2. The current Frappe + Next.js frontend architecture in this repository
3. A proposed data structure, permission model, and workflow

This is a design document only.
No implementation is included here.

---

## Requirement Summary

### Requested by GM

Add a new role: `Mentor`

### Mentor role expectations

- Each mentor should see only assigned students
- A mentor should manage up to `100` students
- Mentor should be able to view:
  - academic details
  - fee details
  - contact details
- Mentor should call students / parents
- Mentor should record call feedback in a new DocType
- That feedback should be visible to both:
  - `Director`
  - `General Manager`

### Branch Manager expectations

- Branch Manager should manually assign students to mentors
- Each branch will have `4 mentors`
- Mentors of that branch should be manageable by the Branch Manager

---

## Deep Study of Existing System

## 1. Current Role Model

The frontend already uses a role-priority and role-based dashboard model.

Important files:

- [src/lib/stores/authStore.ts](/abs/path/c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/lib/stores/authStore.ts:1)
- [src/lib/utils/constants.ts](/abs/path/c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/lib/utils/constants.ts:1)
- [src/proxy.ts](/abs/path/c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/proxy.ts:1)
- [src/app/api/auth/me/route.ts](/abs/path/c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/auth/me/route.ts:1)

### What exists now

- Primary dashboards already exist for:
  - `Director`
  - `General Manager`
  - `Branch Manager`
  - `Instructor`
  - `Class Incharge`
  - `HR Manager`
  - `Sales User`
  - `Parent`
- Sidebar navigation is role-specific
- The session cookie already carries:
  - roles
  - default company
  - allowed companies
  - instructor info when relevant

### Impact for Mentor role

Adding `Mentor` is structurally feasible because the app is already designed around:

- role-specific routes
- role-based sidebar items
- branch scoping using `default_company`
- session-driven UI access

---

## 2. Current Branch Scoping Pattern

The system consistently scopes data by branch using Company.

Common branch fields:

- `Student.custom_branch`
- `Employee.company`
- `Instructor.custom_company`
- `Student Group.custom_branch`

Important files:

- [src/lib/api/students.ts](/abs/path/c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/lib/api/students.ts:1)
- [src/lib/api/employees.ts](/abs/path/c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/lib/api/employees.ts:1)
- [src/lib/api/director.ts](/abs/path/c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/lib/api/director.ts:1)

### Existing branch model

- Student records are branch-owned through `custom_branch`
- Employee records are branch-owned through `company`
- Branch Manager pages use `defaultCompany`
- Director / GM dashboards aggregate across branches

### Impact for Mentor design

Mentor should also be branch-scoped.

That means:

- each mentor belongs to exactly one branch operationally
- mentor assignments should be limited to students from that same branch
- branch manager of that branch should control assignment

---

## 3. Current Student Data Model

The student detail experience is already rich.

Important files:

- [src/lib/types/student.ts](/abs/path/c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/lib/types/student.ts:1)
- [src/app/dashboard/branch-manager/students/[id]/page.tsx](/abs/path/c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/dashboard/branch-manager/students/[id]/page.tsx:1)

### Student information already available

- Basic profile
- Guardian linkage
- Program Enrollment
- Fee Structure
- Sales Order summary
- Sales Invoice details
- Outstanding / overdue fee visibility
- Discontinuation details

### Important observation

The current student detail page already combines data from multiple doctypes:

- `Student`
- `Guardian`
- `Program Enrollment`
- `Student Group`
- `Sales Order`
- `Sales Invoice`

### Impact for Mentor design

Mentor does not need a brand new student data model.
Instead, the mentor module should reuse the existing student detail sources and expose only the subset relevant to mentoring:

- contact
- academic snapshot
- fee snapshot
- call history
- mentor notes

---

## 4. Current Staff / Role Management Pattern

Important files:

- [src/app/dashboard/branch-manager/employees/page.tsx](/abs/path/c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/dashboard/branch-manager/employees/page.tsx:1)
- [src/app/dashboard/branch-manager/employees/manage-instructors/page.tsx](/abs/path/c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/dashboard/branch-manager/employees/manage-instructors/page.tsx:1)
- [src/app/dashboard/branch-manager/teachers/page.tsx](/abs/path/c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/dashboard/branch-manager/teachers/page.tsx:1)

### Existing pattern

- Employees are the base staff record
- Instructors are a specialized business role mapped to Employee
- Branch Manager already manages staff at branch level
- Bulk role-assignment patterns already exist

### Impact for Mentor design

Mentor should follow the same organizational approach:

- employee/user identity remains in core Frappe doctypes
- mentor-specific operational behavior should be modeled separately
- Branch Manager should manage mentor assignment in a branch-scoped UI

This is better than treating mentor as only a UI label.

---

## 5. Current Call / Follow-Up Pattern

The closest existing feature is Fee Follow Up.

Important files:

- [src/lib/api/followup.ts](/abs/path/c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/lib/api/followup.ts:1)
- [src/app/api/fees/follow-up/route.ts](/abs/path/c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/fees/follow-up/route.ts:1)
- [scripts/create-fee-followup-doctype.mjs](/abs/path/c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/scripts/create-fee-followup-doctype.mjs:1)
- [src/app/dashboard/director/fee-followup/page.tsx](/abs/path/c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/dashboard/director/fee-followup/page.tsx:1)

### Existing pattern

- Create a custom DocType in Frappe
- Use Next.js API routes as the safe server-side access layer
- Use admin-token-backed server calls for cross-role visibility
- Show logs in role-specific dashboards

### Why this matters

Your mentor call-feedback requirement is almost the same structural problem:

- staff member logs a call
- log belongs to a student
- branch matters
- higher roles need visibility
- list and summary views are needed

### Design conclusion

The mentor feedback system should follow the same architecture style as `Fee Follow Up`, but with mentor-specific fields and permissions.

---

## Gaps Between Requirement and Current System

The current system does **not** yet have:

- a `Mentor` role
- a mentor master/profile structure
- a student-to-mentor assignment table
- mentor-only dashboard routes
- mentor feedback/call log doctype
- mentor capacity control
- mentor visibility rules for student detail access

---

## Proposed Structure

## 1. Role and Master Data Design

### New Frappe Role

Create role:

- `Mentor`

### Recommended master object

Create a new custom DocType:

- `Mentor Profile`

### Why a separate Mentor Profile is recommended

Because role alone is not enough.
We need structured metadata:

- linked employee
- linked user
- branch
- status
- active student count
- capacity limit

### Suggested `Mentor Profile` fields

- `mentor_name` or title field
- `employee` -> Link `Employee`
- `user_id` -> Link `User`
- `branch` -> Link `Company`
- `status` -> Active / Inactive
- `max_student_limit` -> Int, default `100`
- `current_student_count` -> Int, read-only/computed
- `remarks` -> Small Text

### Why this is better than only using Employee

- Employee is HR identity
- Mentor Profile is operational identity for the mentoring module
- Keeps mentor-specific logic isolated

---

## 2. Student Assignment Design

### Recommended DocType

Create a custom DocType:

- `Mentor Student Assignment`

### Purpose

This becomes the source of truth for:

- which mentor owns which student
- who assigned the student
- from which branch
- whether assignment is active

### Suggested fields

- `student` -> Link `Student`
- `student_name` -> fetched
- `mentor_profile` -> Link `Mentor Profile`
- `mentor_user` -> Link `User`
- `mentor_employee` -> Link `Employee`
- `branch` -> Link `Company`
- `assigned_by` -> Link `User`
- `assigned_on` -> Datetime
- `status` -> Active / Reassigned / Inactive
- `notes` -> Small Text

### Recommended constraints

- only one active mentor assignment per student at a time
- student branch must match mentor branch
- assignment blocked if mentor active student count is already `100`

### Why not store mentor directly on Student

It is technically possible, but not preferred.

Using a separate assignment doctype is better because:

- it preserves assignment history
- it supports reassignment cleanly
- it avoids overloading the core Student doctype
- it enables audit fields naturally

---

## 3. Mentor Feedback / Call Log Design

### Recommended DocType

Create a custom DocType:

- `Mentor Feedback`

### Purpose

Store every call / follow-up / mentoring note.

### Suggested fields

- `student` -> Link `Student`
- `student_name` -> fetched
- `mentor_profile` -> Link `Mentor Profile`
- `mentor_user` -> Link `User`
- `branch` -> Link `Company`
- `contact_person` -> Student / Father / Mother / Guardian / Other
- `contact_number` -> Data
- `call_datetime` -> Datetime
- `call_status` -> Answered / No Answer / Busy / Switched Off / Call Back Requested
- `discussion_category` -> Academic / Fees / Attendance / Behaviour / General / Other
- `academic_notes` -> Small Text
- `fee_notes` -> Small Text
- `contact_notes` -> Small Text
- `overall_feedback` -> Text
- `next_followup_date` -> Date
- `priority` -> Low / Medium / High
- `action_required` -> Check
- `visible_to_management` -> Check, default true

### Optional extra fields

- `program`
- `batch`
- `guardian_name`
- `outstanding_amount_snapshot`
- `attendance_snapshot`

These are not mandatory for v1 if they can be derived live.

---

## 4. Mentor Student View Model

Mentor should not edit any core ERP object.
Mentor access should be strictly view-only for student data.

Instead the mentor screen should present one unified student workspace made of 4 sections:

### Section A: Student identity

- student name
- student ID
- branch
- class/program
- batch

### Section B: Contact details

- student phone
- guardian phone
- parent name
- email
- address

### Section C: Academic details

- current program
- batch/group
- attendance summary
- academic remarks or status
- performance indicators if available

### Section D: Fee details

- current plan
- invoice summary
- outstanding amount
- due invoices
- last payment status

### Section E: Feedback history

- latest mentor feedback
- full feedback timeline
- next follow-up date

This matches the current repo style where student pages aggregate multiple doctypes into a single UI.

---

## Frontend Structure Proposal

## 1. New Mentor Dashboard Area

Recommended route family:

- `/dashboard/mentor`

### Suggested pages

- `/dashboard/mentor`
  - Mentor summary dashboard
- `/dashboard/mentor/students`
  - only assigned students
- `/dashboard/mentor/students/[id]`
  - mentor-specific student workspace
- `/dashboard/mentor/feedback`
  - all feedback logs by this mentor
- `/dashboard/mentor/feedback/new`
  - optional dedicated entry page if not embedded in student detail

### Mentor sidebar suggestion

- Dashboard
- Assigned Students
- Feedback Logs
- Today Follow-Ups

---

## 2. Branch Manager Mentor Management Area

Recommended route family:

- `/dashboard/branch-manager/mentors`

### Suggested pages

- `/dashboard/branch-manager/mentors`
  - list of branch mentors
  - count of assigned students per mentor
  - remaining capacity
- `/dashboard/branch-manager/mentors/assign`
  - student assignment interface
- `/dashboard/branch-manager/mentors/[id]`
  - mentor profile with assigned students

### Core functions on Branch Manager side

- add/select 4 mentors for branch
- activate/inactivate mentor
- assign student to mentor
- reassign student from mentor A to mentor B
- view mentor load

---

## 3. Director and GM Visibility

Feedback should not live only inside mentor pages.

Recommended visibility:

### Director

- branch filter
- mentor filter
- student filter
- date filter
- feedback timeline
- action-required queue

### General Manager

- same cross-branch visibility
- branch-wise mentor performance summary
- mentor load summary
- overdue follow-up summary

### Why this fits existing app

The current app already has cross-role reporting patterns:

- director fee follow-up
- director branch reports
- general manager branch dashboards

So mentor feedback can be integrated as another reporting domain.

---

## Proposed Workflow

## 1. Mentor Setup Workflow

1. Admin/System Manager creates the `Mentor` role in Frappe.
2. Relevant users receive that role.
3. Branch Manager or admin creates `Mentor Profile` records for branch staff.
4. Each profile is linked to:
   - Employee
   - User
   - Branch
5. Each branch should maintain exactly 4 active mentor profiles operationally.

### Note

This “4 mentors per branch” should be enforced as a business rule in UI/service layer, not necessarily as a hard Frappe schema restriction unless the organization is certain it will never change.

---

## 2. Student Assignment Workflow

1. Branch Manager opens mentor assignment screen.
2. Branch Manager sees:
   - list of branch students
   - list of branch mentors
   - current mentor load
3. Branch Manager assigns a student to one mentor.
4. System validates:
   - mentor and student belong to same branch
   - mentor active load is below 100
   - no conflicting active assignment exists
5. `Mentor Student Assignment` record is created or updated.
6. Mentor’s assigned student list updates automatically.

---

## 3. Mentor Daily Workflow

1. Mentor logs in.
2. Mentor dashboard shows only assigned students.
3. Mentor opens a student.
4. Mentor reviews:
   - academic info
   - fee info
   - contact info
5. Mentor calls the student/parent.
6. Mentor records a new `Mentor Feedback` entry.
7. If follow-up is needed, mentor sets:
   - next follow-up date
   - action required
   - category/priority

---

## 4. Management Review Workflow

1. Director or GM opens mentor feedback dashboard/report.
2. They filter by:
   - branch
   - mentor
   - student
   - date
   - action required
3. They review:
   - latest feedback
   - unresolved follow-ups
   - mentor activity
   - branch mentor distribution

---

## Permission and Visibility Model

## 1. Mentor

Should be able to:

- read only assigned students
- read related academic/contact/fee summaries for those students
- create mentor feedback
- read own mentor feedback logs

Should not be able to:

- see unassigned students
- edit student, guardian, academic, fee, or assignment master data
- assign students
- access other mentors’ students
- see all-branch management dashboards

---

## 2. Branch Manager

Should be able to:

- manage mentor profiles for own branch
- assign/reassign students to mentors
- see all mentor assignments inside own branch
- review mentor feedback for own branch

Should not be able to:

- manage mentors of other branches

---

## 3. General Manager

Should be able to:

- view all mentor feedback
- view branch-wise mentor operations
- view mentor loads and follow-up status

GM may also be allowed to reassign in future, but that is a policy choice.
For now, your requirement clearly places manual assignment responsibility with Branch Manager.

---

## 4. Director

Should be able to:

- view all mentor feedback across branches
- review mentor performance and escalation items
- inspect branch-wise load and coverage

---

## Recommended Data Access Strategy

## 1. Do not expose direct client-side Frappe reads for mentor-sensitive data

Follow the same safe pattern already used in this codebase:

- Next.js API routes
- server-side auth/session validation
- admin-token or privileged service calls where needed
- branch/role filtering in the route layer

### Why

Because mentor visibility is more sensitive than standard listing.
The system must guarantee:

- a mentor cannot query all students directly
- a mentor cannot alter assignment logic from the client

---

## 2. Build mentor-specific composite APIs

Recommended server routes:

- `/api/mentor/students`
- `/api/mentor/students/[id]`
- `/api/mentor/feedback`
- `/api/branch-manager/mentors`
- `/api/branch-manager/mentor-assignments`
- `/api/director/mentor-feedback`
- `/api/general-manager/mentor-feedback`

### Why composite APIs are better here

Because mentor pages need merged data from several doctypes:

- Student
- Guardian
- Program Enrollment
- Sales Invoice / Sales Order
- Mentor Student Assignment
- Mentor Feedback

This is already how several advanced screens in the repo work.

---

## Operational Rules

## 1. Mentor cap

- Maximum active students per mentor: `100`

Recommended enforcement:

- validate at API/service layer
- show current load in UI
- block assignment when count reaches 100

---

## 2. Branch mentor count

Requirement says:

- each branch has `4 mentors`

Recommended behavior:

- dashboard warns if active mentors are fewer or more than 4
- Branch Manager mentor page shows coverage status

### Suggested treatment

Use this as a business rule and dashboard alert first.
Avoid making the database overly rigid unless the organization is sure it will never need 5th mentor temporarily.

---

## 3. Reassignment

Student reassignment should:

- close previous active assignment
- create a new active assignment
- retain history

This is another reason a dedicated assignment doctype is better than a single mentor field on Student.

---

## 4. Feedback immutability

Mentor feedback should preferably be append-only in normal flow.

Recommended behavior:

- create new records for each call
- avoid overwriting old feedback
- avoid editing past feedback in normal flow

That preserves accountability and timeline history.

---

## Recommended UI Structure

## 1. Mentor Dashboard

Suggested summary cards:

- Assigned Students
- Today Follow-Ups
- Pending Action Required
- Students With Fee Issues

Suggested main table columns:

- Student
- Program/Class
- Batch
- Parent Contact
- Fee Status
- Last Feedback
- Next Follow-Up

---

## 2. Branch Manager Mentor Dashboard

Suggested mentor cards:

- Mentor name
- Assigned student count
- Capacity used
- Last feedback date
- Pending follow-ups

Suggested assignment screen:

- left panel: unassigned / all eligible branch students
- right panel: 4 mentor buckets
- mentor load indicator

---

## 3. Director / GM Monitoring Screens

Suggested views:

- Feedback timeline
- Mentor-wise summary
- Branch-wise summary
- Action-required queue

Suggested metrics:

- feedback count per mentor
- active students per mentor
- overdue follow-ups
- no-feedback students
- students without assigned mentor

---

## Risks and Design Decisions

## 1. Academic and Fee Access

Mentor access should be strictly view-only.

### Recommendation

For mentor role, allow:

- viewing academic details
- viewing fee details
- adding mentor notes about academic and fee issues

Do **not** let mentors directly modify:

- Program Enrollment
- Fee Structure linkage
- invoice/payment metadata
- any other core academic or fee doctype

---

## 2. Contact detail changes

Contact details should also be view-only for mentors.

### Recommendation

Best controlled v1 behavior:

- mentor can view contact details
- mentor can mention corrections inside feedback notes
- final core record update should remain under Branch Manager or authorized staff

This avoids accidental corruption of parent phone/email data.

---

## 3. Student ownership ambiguity

Need explicit rule:

- can one student have multiple mentors?

### Based on your requirement

The cleanest interpretation is:

- one active mentor per student

That should be the default model.

---

## Final Recommended Structure

## Core Frappe objects

- New Role: `Mentor`
- New DocType: `Mentor Profile`
- New DocType: `Mentor Student Assignment`
- New DocType: `Mentor Feedback`

## Core frontend areas

- New dashboard area: `/dashboard/mentor/*`
- New branch manager area: `/dashboard/branch-manager/mentors/*`
- New director/GM reporting views for mentor feedback

## Core workflow

- Branch Manager manages branch mentors
- Branch Manager assigns students to mentors
- Mentor sees only assigned students
- Mentor logs feedback after calls
- Director and GM monitor all feedback

---

## Recommended Implementation Order Later

When implementation starts, the safest order would be:

1. Create `Mentor` role
2. Create `Mentor Profile`
3. Create `Mentor Student Assignment`
4. Create `Mentor Feedback`
5. Build mentor-scoped APIs
6. Build Branch Manager mentor management UI
7. Build Mentor dashboard UI
8. Build Director/GM reporting UI

---

## Conclusion

This requirement fits the current architecture well.

The repo already shows a mature pattern for:

- role-based dashboards
- branch-scoped access
- custom Frappe doctypes
- server-side composite APIs
- management visibility layers

So the correct solution is **not** to directly patch mentor behavior into Student or Employee alone.

The clean structure is:

- `Mentor` as a new role
- `Mentor Profile` as mentor master data
- `Mentor Student Assignment` as student ownership/history
- `Mentor Feedback` as the call-note timeline

That structure will scale cleanly and match the existing SmartUp ERP frontend architecture.
