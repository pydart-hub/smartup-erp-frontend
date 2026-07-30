# Mentor Role Implementation Plan

## Scope

This plan converts the approved mentor-role structure into an execution plan.

This document does **not** implement anything.
It defines:

- delivery phases
- technical workstreams
- sequencing
- dependencies
- testing scope
- rollout approach

Related design document:

- [docs/MENTOR-ROLE-STRUCTURE.md](/abs/path/c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/docs/MENTOR-ROLE-STRUCTURE.md:1)

---

## Implementation Goal

Deliver a new branch-scoped `Mentor` workflow where:

1. Branch Manager manages mentors for a branch
2. Branch Manager assigns students to mentors
3. Mentors see only their assigned students
4. Mentors log call feedback in a dedicated system
5. Director and General Manager can review mentor feedback and mentor activity

---

## High-Level Delivery Strategy

The safest delivery path is:

1. Establish data model first
2. Establish permission and scoping rules second
3. Build Branch Manager control layer third
4. Build Mentor workspace fourth
5. Build Director / GM oversight last

### Why this order is best

- mentor pages depend on assignment data
- assignment depends on mentor master data
- reporting depends on feedback data existing
- access control must be stable before exposing dashboards

---

## Core Workstreams

## 1. Frappe Data Model

Deliverables:

- `Mentor` role
- `Mentor Profile` DocType
- `Mentor Student Assignment` DocType
- `Mentor Feedback` DocType

## 2. Session and Access Layer

Deliverables:

- role recognition in frontend auth/session flow
- mentor dashboard routing
- mentor sidebar navigation
- API-level branch and assignment scoping

## 3. Branch Manager Operations

Deliverables:

- mentor list page
- mentor capacity display
- mentor assignment / reassignment UI
- branch-level management actions

## 4. Mentor Workspace

Deliverables:

- mentor dashboard
- assigned student list
- mentor student detail page
- feedback creation flow
- feedback history view

## 5. Director / GM Oversight

Deliverables:

- mentor feedback reporting
- branch-wise mentor monitoring
- mentor load / pending follow-up visibility

---

## Phase Plan

## Phase 0: Requirement Freeze and Rule Confirmation

### Goal

Freeze the business rules before schema work starts.

### Confirmations required

1. One active mentor per student
2. Maximum `100` active students per mentor
3. Operational target of `4` mentors per branch
4. Mentor can view academic/fee/contact details
5. Mentor feedback is append-only timeline data
6. Director and GM can view all mentor feedback
7. Branch Manager owns assignment and reassignment

### Recommended decision

For v1:

- mentors can view core records
- mentors can add feedback/notes
- mentors cannot edit core student/contact/academic/fee records
- core record changes remain restricted to authorized staff only

### Output

- signed-off functional rules
- no open ambiguity on mentor view-only scope

---

## Phase 1: Frappe Foundation

### Goal

Create the data foundation without exposing UI yet.

### Tasks

1. Create `Mentor` Frappe role
2. Create `Mentor Profile` DocType
3. Create `Mentor Student Assignment` DocType
4. Create `Mentor Feedback` DocType
5. Define permission matrix for all three doctypes
6. Add validation rules

### Suggested validation rules

#### `Mentor Profile`

- linked employee must exist
- linked user must exist
- branch is mandatory
- max student limit defaults to `100`

#### `Mentor Student Assignment`

- student is mandatory
- mentor profile is mandatory
- branch is mandatory
- student branch must equal mentor branch
- only one active assignment per student
- cannot assign beyond mentor limit

#### `Mentor Feedback`

- student is mandatory
- mentor profile is mandatory
- mentor user is mandatory
- branch is mandatory
- feedback record must belong to an active assignment

### Permission matrix draft

#### Mentor

- `Mentor Profile`: read own
- `Mentor Student Assignment`: read own active assignments
- `Mentor Feedback`: create/read own

#### Branch Manager

- full branch-scoped access to all three

#### General Manager

- read all three

#### Director

- read all three

#### Administrator / System Manager

- full access

### Output

- schema ready
- validations ready
- permissions defined

### Dependency

Must complete before any mentor UI work.

---

## Phase 2: Frontend Role Integration

### Goal

Teach the frontend that `Mentor` is a first-class application role.

### Files likely affected later

- auth store
- role-to-dashboard map
- middleware/proxy dashboard redirects
- sidebar nav definitions
- dashboard layout role resolution

### Tasks

1. Add `Mentor` into role priority list
2. Add mentor dashboard route mapping
3. Add mentor sidebar configuration
4. Ensure session/user payload can expose mentor role cleanly
5. Decide whether mentor is switchable with any other role

### Recommendation

Do not make mentor role switchable in v1 unless there is an actual multi-role user need.

### Output

- mentor users can route to `/dashboard/mentor`
- app recognizes mentor as a dashboard role

### Dependency

Should happen before mentor page implementation, but after role creation is defined.

---

## Phase 3: Server API Layer

### Goal

Build secure mentor-aware APIs before UI screens.

### Why this phase is critical

The UI must not directly query broad student datasets and filter client-side.
Mentor access must be enforced server-side.

### Recommended API groups

#### Mentor APIs

- `GET /api/mentor/students`
- `GET /api/mentor/students/[id]`
- `GET /api/mentor/feedback`
- `POST /api/mentor/feedback`

#### Branch Manager APIs

- `GET /api/branch-manager/mentors`
- `POST /api/branch-manager/mentors`
- `GET /api/branch-manager/mentor-assignments`
- `POST /api/branch-manager/mentor-assignments`
- `PUT /api/branch-manager/mentor-assignments/[id]`

#### Director / GM APIs

- `GET /api/director/mentor-feedback`
- `GET /api/general-manager/mentor-feedback`
- `GET /api/director/mentor-summary`
- `GET /api/general-manager/mentor-summary`

### API behavior requirements

#### Mentor student list

- return only active assignments for current mentor user
- join student identity, contact snapshot, academic snapshot, fee snapshot

#### Mentor student detail

- verify student belongs to current mentor through assignment
- return merged student workspace data
- return latest feedback timeline

#### Assignment APIs

- enforce same-branch assignment
- enforce max student limit
- enforce one active assignment per student
- retain reassignment history

#### Feedback APIs

- mentor can only log feedback for assigned students
- branch manager / director / gm can read based on access scope

### Output

- secure backend contract for all mentor UI

### Dependency

Must complete before frontend screens.

---

## Phase 4: Branch Manager Mentor Management

### Goal

Enable branch-level mentor administration first.

### Why this comes before mentor UI

Mentors are not useful until:

- profiles exist
- students are assigned

### Pages to build

- `/dashboard/branch-manager/mentors`
- `/dashboard/branch-manager/mentors/assign`
- optional: `/dashboard/branch-manager/mentors/[id]`

### Features

#### Mentor list page

- show all mentors in branch
- show active/inactive status
- show assigned student count
- show max capacity
- show pending follow-ups count later if available

#### Assignment page

- list branch students
- list mentors
- show currently assigned mentor if any
- allow assign / reassign
- show capacity warnings

#### Branch control checks

- warn if branch has fewer than 4 active mentors
- warn if branch has more than 4 active mentors
- highlight overloaded mentors

### UX notes

This page should feel operational, not report-like.
Branch Manager needs speed and clarity more than analytics depth.

### Output

- branch can define and manage the mentoring network

### Dependency

Requires Phase 1 to 3.

---

## Phase 5: Mentor Dashboard and Student Workspace

### Goal

Deliver the mentor-facing experience.

### Pages to build

- `/dashboard/mentor`
- `/dashboard/mentor/students`
- `/dashboard/mentor/students/[id]`
- `/dashboard/mentor/feedback`

### Features

#### Mentor dashboard

- assigned student count
- today follow-ups
- pending callbacks
- students with fee issues
- students without recent feedback

#### Assigned students page

- search
- basic filters
- table/cards with:
  - student
  - class/program
  - parent contact
  - fee status
  - next follow-up
  - latest feedback date

#### Student detail page

Should reuse existing multi-source patterns already used in branch-manager student pages, but scoped and simplified for mentor usage.

Suggested sections:

- Student summary
- Contact details
- Academic details
- Fee details
- Feedback timeline
- Add feedback form

#### Feedback creation

- quick log entry from student page
- category/status/follow-up date
- timestamped history

### Important limitation for v1

Mentor should not become a second Branch Manager.
The page should prioritize:

- visibility
- note-taking
- follow-up logging

not any form of student-record editing.

### Output

- mentor can operate independently on assigned students

### Dependency

Requires Phases 1 to 4.

---

## Phase 6: Director and GM Oversight

### Goal

Provide leadership visibility after operational flows are working.

### Recommended screens

#### Director

- mentor feedback overview
- branch-wise mentor summary
- action-required items
- no-feedback / overdue follow-up list

#### General Manager

- same core reporting set
- mentor load comparison
- branch-wise coverage monitoring

### Suggested metrics

- total mentors
- total assigned students
- average students per mentor
- feedback count by mentor
- pending follow-ups
- students without mentor
- students without recent call log

### Suggested filters

- branch
- mentor
- date range
- feedback category
- call status
- action required

### Output

- top-level visibility and control

### Dependency

Should come after mentor workflow is proven stable.

---

## Phase 7: Hardening and Rollout

### Goal

Stabilize before full production use.

### Tasks

1. Access-control audit
2. Validation audit
3. performance review on list endpoints
4. empty-state review
5. branch edge-case review
6. mentor reassignment audit trail review
7. reporting consistency review

### Rollout suggestion

#### Pilot rollout

- enable in 1 branch first
- create 4 mentors
- assign sample students
- run live feedback cycle for a few days

#### Then expand

- remaining branches after pilot acceptance

### Why pilot first

This feature mixes:

- permissions
- operational workflow
- cross-role reporting

Pilot reduces risk significantly.

---

## Detailed Task Breakdown

## A. Data Model Tasks

### `Mentor Profile`

- define fields
- define naming strategy
- define active/inactive lifecycle
- define branch ownership
- define limit field behavior

### `Mentor Student Assignment`

- define active status model
- define reassignment model
- define uniqueness rule for active assignment
- define capacity check

### `Mentor Feedback`

- define category/status enums
- define timeline sorting standard
- define follow-up date behavior
- define audit expectations

---

## B. Backend Logic Tasks

### Branch checks

- mentor branch must equal student branch
- branch manager can only manage own branch

### Assignment checks

- prevent duplicate active assignments
- prevent over-capacity
- preserve old assignment history on reassignment

### Feedback checks

- mentor can post feedback only for assigned students
- feedback cannot be created against inactive assignment unless explicitly allowed

### Read checks

- mentor sees only assigned students
- branch manager sees only branch records
- gm/director see all permitted records

---

## C. Frontend Tasks

### Shared

- add role support
- add nav
- add API clients
- add types/interfaces

### Branch Manager

- mentor list
- mentor load cards
- student assignment UI
- reassignment flow

### Mentor

- dashboard
- student list
- student detail
- feedback creation
- feedback list

### Director / GM

- feedback dashboard
- mentor summary dashboard
- branch summary widgets

---

## D. Reporting Tasks

Recommended report dimensions:

- by branch
- by mentor
- by student
- by date
- by feedback category
- by follow-up status

Recommended report outputs:

- active mentor load
- feedback activity
- pending follow-up queue
- coverage gap report

---

## Dependency Map

## Hard dependencies

1. `Mentor Profile` before assignment UI
2. `Mentor Student Assignment` before mentor student pages
3. feedback schema before director/gm reporting
4. role integration before mentor dashboard routing
5. secure APIs before any mentor-facing UI

## Soft dependencies

1. branch alerts about “4 mentors” can come after initial mentor list page
2. advanced summary analytics can come after operational pages
3. performance optimization can follow pilot if first pass is correct

---

## Risks and Mitigations

## Risk 1: Mentor over-permission

### Problem

If client reads are not server-scoped, mentors may access unassigned students.

### Mitigation

- server-only scoping for mentor endpoints
- never rely on client-side filtering alone

---

## Risk 2: Confusion between viewing and editing

### Problem

If the requirement is not written clearly, mentor note-taking may be misread as permission to edit core ERP records.

### Mitigation

- document and enforce mentor access as view-only
- separate core ERP data from mentor feedback notes at both API and UI levels

---

## Risk 3: Reassignment history loss

### Problem

If assignment is stored only on Student, audit history will be weak.

### Mitigation

- keep separate `Mentor Student Assignment` doctype

---

## Risk 4: Reporting inconsistency

### Problem

If director/gm screens derive metrics from different sources, counts will drift.

### Mitigation

- define assignment doctype as source of truth for mentor ownership
- define feedback doctype as source of truth for mentor activity

---

## Risk 5: Branch rule rigidity

### Problem

Hard-enforcing exactly 4 mentors at schema level may block legitimate temporary operations.

### Mitigation

- treat 4 as an operational target with warning/validation at workflow level
- avoid making it an irreversible hard schema rule in v1

---

## Testing Plan

## 1. Permission Tests

- mentor cannot see unassigned students
- mentor cannot create feedback for unassigned students
- branch manager cannot manage other branches
- director and gm can view feedback correctly

## 2. Assignment Tests

- assign student to mentor
- reassign student to another mentor
- block duplicate active assignment
- block assignment over 100-student cap

## 3. Feedback Tests 

- create feedback successfully
- list feedback in mentor timeline
- visible in director/gm view
- filter by branch/mentor/date/category

## 4. Data Integrity Tests

- inactive assignment no longer appears in mentor student list
- current mentor count matches active assignments
- branch mismatch is blocked

## 5. UI Tests

- mentor dashboard loads for mentor role
- mentor sidebar routes work
- empty states work
- branch manager assignment flow is clear

---

## Suggested Delivery Milestones

## Milestone 1: Foundation Complete

- role defined
- doctypes created
- validations ready
- permissions ready

## Milestone 2: Branch Manager Control Complete

- mentor list page
- assignment flow
- reassignment flow

## Milestone 3: Mentor Operations Complete

- mentor dashboard
- assigned student list
- student detail
- feedback logging

## Milestone 4: Management Oversight Complete

- director views
- gm views
- summary metrics

## Milestone 5: Pilot Accepted

- one branch tested
- operational issues fixed
- rollout approval given

---

## Recommended First Release Scope

To keep v1 controlled, include:

- Mentor role
- Mentor profile management
- Student assignment
- Mentor student list/detail
- Mentor feedback creation and history
- Director/GM read-only oversight

### Defer if necessary

- advanced mentor analytics
- bulk assignment tools
- notification automation

---

## Practical Sequence for This Codebase

Based on current repository patterns, the most natural execution sequence is:

1. Add Frappe role + doctypes
2. Add frontend role mapping and sidebar
3. Add secure Next API routes
4. Build Branch Manager mentor pages
5. Build Mentor pages
6. Build Director / GM reporting pages
7. Pilot and harden

This matches how the repo already handles:

- work assignments
- fee follow-up
- branch-manager operational flows
- director reporting

---

## Final Recommendation

Implementation should start with the **data model and API contract**, not the UI.

The most important architectural rule is:

- `Mentor Student Assignment` must be the source of truth for visibility
- `Mentor Feedback` must be the source of truth for activity

If that is done correctly, the rest of the mentor workflow will fit the existing SmartUp ERP frontend structure cleanly.
