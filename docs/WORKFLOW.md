# Smartup ERP — Complete Workflow Document
**As of: February 24, 2026**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Authentication Flow](#5-authentication-flow)
6. [API Layer](#6-api-layer)
7. [Branch Manager Dashboard](#7-branch-manager-dashboard)
8. [Student Module — Complete Workflow](#8-student-module--complete-workflow)
   - 8.1 [Student List Page](#81-student-list-page)
   - 8.2 [Add New Student (Admission Wizard)](#82-add-new-student-admission-wizard)
   - 8.3 [View Student](#83-view-student)
   - 8.4 [Edit Student](#84-edit-student)
9. [Batches Module](#9-batches-module)
10. [Fees Module](#10-fees-module)
11. [Attendance Module](#11-attendance-module)
12. [Frappe Backend — Live Data Reference](#12-frappe-backend--live-data-reference)
13. [Key Technical Decisions](#13-key-technical-decisions)
14. [Known Frappe Quirks & Fixes](#14-known-frappe-quirks--fixes)
15. [Environment & Configuration](#15-environment--configuration)

---

## 1. Project Overview

Smartup Education is a chain of tuition centres (11 branches) in Kerala. They operate on a customized **Frappe / ERPNext** backend with the **Education** app installed.

The goal of this project is to build a modern **Next.js frontend** (Smartup Offline ERP) that replaces/supplements the default Frappe UI while using the same Frappe Cloud backend as the source of truth.

**Backend:** `https://smartup.m.frappe.cloud`
**Frontend:** Next.js 16 running locally / deployed separately

### Installed Frappe Apps
| App | Version |
|-----|---------|
| frappe | 15.87 |
| erpnext | 15.85 |
| education | 15.5.3 |
| hrms | 15.52 |
| crm | 1.58.5 |
| insights | 2.2.9 |
| frappe_whatsapp | 1.0.12 |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  BROWSER (Next.js Client)               │
│                                                         │
│  Auth → Dashboard → Students / Batches / Fees /         │
│         Attendance / Classes                            │
│                                                         │
│  React Query (server cache) + Zustand (UI state)        │
│  React Hook Form + Zod (forms & validation)             │
└──────────────────────┬──────────────────────────────────┘
                       │ Axios (API Key:Secret header)
                       │
┌──────────────────────▼──────────────────────────────────┐
│            NEXT.JS API ROUTES (Proxy Layer)             │
│                                                         │
│   /api/auth/login       — login + generate user keys    │
│   /api/auth/logout      — clear cookie                  │
│   /api/auth/me          — return current session        │
│   /api/proxy/[...path]  — transparent Frappe proxy      │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS Token Auth
                       │ Authorization: token KEY:SECRET
┌──────────────────────▼──────────────────────────────────┐
│          FRAPPE CLOUD BACKEND (ERPNext + Education)      │
│                                                         │
│  Standard Doctypes: Student, Program Enrollment,        │
│  Student Group, Guardian, Program, Academic Year,       │
│  Company, Fees, Fee Structure, Student Attendance       │
│                                                         │
│  Custom Fields: custom_branch, custom_srr_id,           │
│  custom_parent_name, custom_branch_abbr                 │
│                                                         │
│  Custom Doctypes: Online Batch, Online Class Room,      │
│  Online Class Room Student, Collection Target           │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (`@theme inline {}` syntax) |
| Animation | Framer Motion |
| Server State | TanStack React Query v5 |
| Global State | Zustand |
| HTTP | Axios with interceptors |
| Forms | React Hook Form v7 + Zod v4 |
| UI Components | Custom (Button, Input, Card, Badge, Skeleton) |
| Notifications | Sonner (toast) |
| Icons | Lucide React |
| Validation | Zod v4 (uses `message:` not `required_error:`) |

---

## 4. Project Structure

```
smartup-erp-frontend/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts       ← Login handler (admin token auth)
│   │   │   │   ├── logout/route.ts
│   │   │   │   └── me/route.ts
│   │   │   └── proxy/[...path]/route.ts ← Transparent Frappe proxy
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   └── dashboard/
│   │       └── branch-manager/
│   │           ├── page.tsx             ← Overview dashboard
│   │           ├── students/
│   │           │   ├── page.tsx         ← Student list (React Query, paginated)
│   │           │   ├── new/page.tsx     ← Admission wizard (3 steps)
│   │           │   └── [id]/
│   │           │       ├── page.tsx     ← Student view / detail
│   │           │       └── edit/page.tsx ← Student edit form
│   │           ├── batches/page.tsx
│   │           ├── classes/page.tsx
│   │           ├── fees/page.tsx
│   │           └── attendance/page.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   └── BreadcrumbNav.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx    ← supports label, leftIcon, error, hint props
│   │       ├── Card.tsx
│   │       ├── Badge.tsx
│   │       └── Skeleton.tsx
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts        ← Axios instance (reads token from cookie)
│   │   │   ├── auth.ts
│   │   │   ├── students.ts      ← getStudents, getStudent, updateStudent, deleteStudent
│   │   │   ├── enrollment.ts    ← admitStudent(), getNextSrrId(), getBranches(), etc.
│   │   │   ├── batches.ts
│   │   │   ├── fees.ts
│   │   │   └── attendance.ts
│   │   ├── types/
│   │   │   ├── student.ts       ← Student, Guardian, ProgramEnrollment, StudentGroup
│   │   │   ├── batch.ts
│   │   │   ├── fee.ts
│   │   │   ├── attendance.ts
│   │   │   └── api.ts           ← FrappeListResponse, FrappeSingleResponse
│   │   ├── validators/
│   │   │   └── student.ts       ← Zod schema for admission wizard
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── utils/
│   │       └── constants.ts
│   └── middleware.ts             ← Route protection (redirect /dashboard → /auth/login)
├── .env.local
└── package.json
```

---

## 5. Authentication Flow

### Login Process (Fixed — no 403)

**Problem solved:** The original code called `frappe.client.get_list` on the `Has Role` doctype using the session cookie. Regular user sessions can't read that table → 403 error.

**Current flow:**

```
1. User submits email + password on /auth/login
       ↓
2. POST /api/auth/login (Next.js route)
       ↓
3. Server calls Frappe /method/login with credentials
   → Gets session cookie (confirms credentials are valid)
       ↓
4. Server uses ADMIN TOKEN (FRAPPE_API_KEY:FRAPPE_API_SECRET) to:
   a. GET /resource/User/{email}  → full User doc (includes roles child table)
   b. POST /method/frappe.core.doctype.user.user.generate_keys
      → returns fresh api_key + api_secret for the user
       ↓
5. Roles extracted from User.roles child table
6. User's api_key:api_secret stored in httpOnly cookie
       ↓
7. All subsequent API calls use:
   Authorization: token {user_api_key}:{user_api_secret}
```

### Proxy Layer (`/api/proxy/[...path]`)

All frontend app calls go through `/api/proxy/*` which:
- Reads `user_token` from cookie
- Falls back to server admin token if user has no secret (admin actions)
- Forwards to `https://smartup.m.frappe.cloud/api/{path}`
- Passes all query params + body through transparently

### Route Protection (middleware.ts)

- Unauthenticated users hitting `/dashboard/*` → redirect to `/auth/login`
- Authenticated users hitting `/auth/*` → redirect to `/dashboard/branch-manager`

---

## 6. API Layer

### Axios Client (`src/lib/api/client.ts`)

- Base URL: `/api/proxy` (hits the Next.js proxy, not Frappe directly)
- Reads auth token from cookie on every request
- Standard headers: `Content-Type: application/json`

### API Files

#### `students.ts`
| Function | Description |
|----------|-------------|
| `getStudents(params)` | List with search, `enabled` filter, `custom_branch`, pagination |
| `getStudent(id)` | Single student full doc |
| `createStudent(data)` | POST /resource/Student |
| `updateStudent(id, data)` | PUT /resource/Student/{id} |
| `deleteStudent(id)` | DELETE |
| `searchStudents(query, branch?)` | Autocomplete search |

**Important:** Students use `enabled: 0\|1` — NOT a `status` text field.

#### `enrollment.ts`
| Function | Description |
|----------|-------------|
| `getBranches()` | All companies (branches) from Frappe |
| `getPrograms()` | All Program records |
| `getAcademicYears()` | All Academic Year records |
| `getStudentGroups(params)` | Student Groups filtered by branch/program/batch |
| `getNextSrrId(branch)` | Query max SRR ID for branch, return next sequential |
| `createProgramEnrollment(data)` | Create + auto-submit Program Enrollment |
| `addStudentToGroup(group, studentId)` | Append student to Student Group child table |
| `admitStudent(form)` | **Full 4-step enrollment** (see Section 8.2) |

#### `batches.ts`
- `getBatches(params)` — filters by `custom_branch`, uses `group_based_on: "Batch"`
- `createBatch(data)` — requires `student_group_name`, `academic_year`, `custom_branch`

#### `fees.ts`
- `getFeeStructures(params)` — filters by `academic_year`, `company`
- `getFeeRecords(params)` — uses `program_enrollment`, `company`

#### `attendance.ts`
- `getAttendance(params)` — supports `custom_branch`, student filter

---

## 7. Branch Manager Dashboard

Entry point: `/dashboard/branch-manager`

**Sidebar navigation:**
- Overview (stats cards)
- Students → `/dashboard/branch-manager/students`
- Batches → `/dashboard/branch-manager/batches`
- Classes → `/dashboard/branch-manager/classes`
- Fees → `/dashboard/branch-manager/fees`
- Attendance → `/dashboard/branch-manager/attendance`

Dashboard overview shows summary cards for Students, Batches, Fees, Attendance using React Query.

---

## 8. Student Module — Complete Workflow

### 8.1 Student List Page
**Route:** `/dashboard/branch-manager/students`

**Features:**
- Real-time data from Frappe via React Query
- **Debounced search** (400ms) by student name
- **Status filter tabs:** All / Active / Inactive (maps to `enabled: 1/0`)
- **Pagination:** 25 students per page, Previous/Next buttons
- **Dual-query pattern:**
  1. Query 1: `getStudents()` → returns paginated Student records
  2. Query 2: `fetchEnrollmentMap(studentIds)` → single Frappe call with `["student","in",[...ids]]` filter, returns Program Enrollment data; builds a lookup map for Class + Batch columns
- **Columns:** Student name + ID, Class, Batch, Branch (strips "Smart Up " prefix), Mobile, Joined date, Status badge, Actions
- **Action buttons:**
  - 👁 Eye → `/dashboard/branch-manager/students/{id}` (View page)
  - ✏️ Pencil → `/dashboard/branch-manager/students/{id}/edit` (Edit page)
  - 🗑 Trash → (wired for delete)
- Skeleton loading state (8 rows × 8 cells)
- Empty state message when no results

### 8.2 Add New Student (Admission Wizard)
**Route:** `/dashboard/branch-manager/students/new`

A **3-step wizard** that creates a student in Frappe through 4 sequential API calls.

#### Step 1 — Student Info
Fields: First Name*, Middle Name, Last Name, Date of Birth*, Gender*, Blood Group, Email, Mobile

Validation triggered on "Next": `first_name`, `date_of_birth`, `gender`

#### Step 2 — Academic Details
Fields and their data sources:

| Field | Source | Behavior |
|-------|--------|----------|
| Branch | `getBranches()` → Frappe Company list | Required dropdown |
| Class | `getStudentGroups({custom_branch})` → unique programs | Loads after branch selected; shows "Select branch first" if none |
| Academic Year | `getAcademicYears()` | Dropdown |
| Enrollment Date | Date input | Defaults to today |
| SRR ID | `getNextSrrId(branch)` | Auto-filled when branch selected; editable by staff |
| Batch | `getStudentGroups({custom_branch, program})` | Optional; auto-assign if left blank |

**Branch → Class cascade:**
- Selecting a branch triggers `getStudentGroups({custom_branch})` → extracts unique program names
- Class dropdown is **disabled and shows "Select branch first"** until a branch is chosen
- Changing branch resets Class and Batch via `setValue()`

**Batch info panel:**
- After branch + class selected: shows available Student Groups (e.g. `CHL-10th-25-1`)
- Shows warning if no batches exist for that combination

Validation: `custom_branch`, `program`, `academic_year`, `enrollment_date`

#### Step 3 — Guardian / Parent
Fields: Guardian Name*, Relation*, Mobile*, Email (optional)
Plus a read-only **Admission Summary** panel showing all Step 2 selections.

#### `admitStudent()` — 4-Step API Chain

```
Step 1: POST /resource/Guardian
        { guardian_name, email_address, mobile_number }
        → returns guardianName (e.g. "GRD-00001")

Step 2: POST /resource/Student
        { first_name, ..., custom_branch, custom_srr_id, enabled: 1,
          student_email_id (auto: "{name}{srr}@dummy.com" if blank),
          guardians: [{ guardian, guardian_name, relation }] }
        → returns student.name (e.g. "STU-SU CHL-26-550")

Step 3: POST /resource/Program Enrollment
        { student, program, academic_year, enrollment_date, student_batch_name }
        then PUT docstatus=1 to SUBMIT the enrollment
        → returns programEnrollment.name (e.g. "PEN-10th-CHL-00001")

Step 4 (if batch selected): addStudentToGroup(groupName, studentId)
        Fetches current Student Group, appends student to `students` child table
        PUT /resource/Student Group/{name}
```

**Auto-generated email:** `{firstname+lastname stripped of spaces/special chars}{srr_id}@dummy.com`
Example: `pranavkrishna550@dummy.com`

**SRR ID logic:** `getNextSrrId(branch)` queries `Student` filtered by `custom_branch`, ordered by `CAST(custom_srr_id AS UNSIGNED) desc`, limit 1, increments by 1.

### 8.3 View Student
**Route:** `/dashboard/branch-manager/students/{id}`

Three parallel queries on load:
1. `getStudent(id)` → full Student doc (personal info, guardians child table)
2. Program Enrollment query → latest submitted enrollment (class, academic year, batch, dates)
3. Guardian query → Guardian doc from `student.guardians[0].guardian` link

**Layout:**
- Back button + Edit button in header
- **Hero card:** avatar initials, full name, status badge, SRR ID, branch, class, batch
- **Personal Information card:** full name, DOB, gender, blood group, email, mobile
- **Academic Details card:** branch, SRR ID, class, academic year, batch, enrollment date, joining date, enrollment ID
- **Guardian/Parent card:** name, relation, mobile, email (loaded lazily)

Loading: skeleton cards while fetching
Error: "Student not found" state

### 8.4 Edit Student
**Route:** `/dashboard/branch-manager/students/{id}/edit`

**Pre-fills all fields** from live data when the page loads.

**Editable sections:**

**Personal Information:**
- First / Middle / Last name
- Date of birth, Gender, Blood Group
- Email (validated), Mobile

**Academic Details:**
- Branch (text input — branch changes handled manually to avoid breaking enrollment)
- Status: Active / Inactive (maps to `enabled: 1/0`)
- Note: Class/Batch changes must be done via Program Enrollment in Frappe directly

**Guardian / Parent:**
- Guardian Name, Relation, Mobile, Email
- Updates the linked `Guardian` doctype separately

**Save behavior:**
1. `PUT /resource/Student/{id}` — student fields
2. `PUT /resource/Guardian/{guardianId}` — guardian fields
3. If relation changed: re-PUT student with updated `guardians` child table
4. Invalidates React Query cache: `["student", id]`, `["guardian", ...]`, `["students"]`
5. Redirects to view page (`/students/{id}`)

**Save button** is disabled until `isDirty` (a field has changed) or while saving.

---

## 9. Batches Module

**Route:** `/dashboard/branch-manager/batches`

Maps to Frappe **Student Group** doctype (filtered by `group_based_on: "Batch"`).

**Key field mappings:**
| UI Label | Frappe Field |
|----------|-------------|
| Batch Name | `student_group_name` |
| Branch | `custom_branch` (Company name) |
| Academic Year | `academic_year` |
| Batch Code | `batch` (Student Batch Name, e.g. "CHL-25") |
| Max Students | `max_strength` |

**Naming convention:** `{BRANCH_CODE}-{PROG_ABB}-{YY}-{SEQ}` e.g. `CHL-10th-25-1`

---

## 10. Fees Module

**Route:** `/dashboard/branch-manager/fees`

Maps to Frappe **Fees** doctype.

**Required fields for Fee record:**
- `student` — link to Student
- `program_enrollment` — link to **submitted** (docstatus=1) Program Enrollment
- `fee_structure` — link to Fee Structure
- `company` — the branch (Company name)
- `posting_date`, `due_date`

**Fee Structure naming format:** `FSH-10th-SU CHL-25`

Note: A Program Enrollment **must be submitted (docstatus=1)** before it can be linked to a Fee record. The admission wizard always submits the enrollment automatically.

---

## 11. Attendance Module

**Route:** `/dashboard/branch-manager/attendance`

Maps to Frappe **Student Attendance** doctype.

**API filter:** Uses `custom_branch` to filter by branch.

**Status values:** `enabled` (1=present, 0=absent) — no text status field.

---

## 12. Frappe Backend — Live Data Reference

### Branches (Companies) — 11 total
```
Smart Up Chullickal    (CHL)
Smart Up GCC           (GCC)
Smart Up Chamber       
Smart Up Eraveli       (ERV)
Smart Up Fortkochi     (FKO)
Smart Up Kacheripady   (KCH)
Smart Up MLA Road      (MLA)
Smart Up Moolamkuzhi   
Smart Up Palluruthy    
Smart Up Thopumpadi    (THP)
Smart Up Vyttila       (VYT)
```

### Programs (Classes) — 18 total
```
5th Grade           11th Commerce
6th Grade           11th Commerce 1 to 1
7th Grade           11th Science
8th Grade           11th Science 1 to 1
8th Grade 1 to 1    12th Commerce
9th Grade           12th Commerce 1 to 1
9th Grade 1 to 1    12th Science
10th Grade          12th Science 1 to 1
10th Grade 1 to 1   12th Science 1 to M
```

### Academic Years
- `2025-2026` (current default)
- `2026-27`

### Student Naming Convention
```
STU-SU {BRANCH_ABBR}-{YY}-{SRR_ID_PADDED}
Example: STU-SU CHL-25-550
```

### Program Enrollment Naming Convention
```
PEN-{PROGRAM_ABB}--{SEQ}
Example: PEN-5th--10001
```

### Student Group (Batch) Naming Convention
```
{BRANCH_CODE}-{PROG_ABB}-{YY}-{SEQ}
Example: CHL-10th-25-1
```

### SRR ID Formats (per branch)
- CHL: simple sequential `000`, `001`, ..., `549`, `550`
- GCC: year-prefixed `202501`, `202502`, ..., `202510`
- Other branches: generally sequential

### Student Email Convention (auto-generated)
```
{normalizedname}{srr_id}@dummy.com
Example: pranavkrishna.v000@dummy.com
```

### Custom Fields on Student Doctype
| Field | Type | Description |
|-------|------|-------------|
| `custom_branch` | Link → Company | Branch the student belongs to |
| `custom_branch_abbr` | Data | e.g. "SU CHL" |
| `custom_srr_id` | Data | **Required** — branch-scoped sequential ID |
| `custom_parent_name` | Data | Parent/guardian name (legacy?) |

---

## 13. Key Technical Decisions

### 1. Admin Token for Post-Login Operations
Regular user sessions cannot read the `Has Role` doctype. We use the server-side `FRAPPE_API_KEY:FRAPPE_API_SECRET` (admin token) to:
- Fetch the User doc (contains roles)
- Call `generate_keys` to get user-level API credentials

### 2. `enabled` vs `status` on Student
The Student doctype has **no `status` text field**. The activation state is:
- `enabled: 1` = Active
- `enabled: 0` = Inactive / Left

All filters and displays use `enabled`, not `status`.

### 3. Enrollment Map Join Pattern
Rather than N+1 queries (one per student for their class), the list page does:
```
One bulk call: GET /resource/Program Enrollment
  filters: [["student","in",[...25 ids]], ["docstatus","=",1]]
  → builds a Map<studentId, {program, student_batch_name}>
```
This keeps the list page to 2 total API calls regardless of page size.

### 4. Branch-Scoped Class Dropdown
Instead of showing all 18 programs globally, the admission wizard queries Student Groups filtered by `custom_branch` to show only classes that actually exist for that branch.

### 5. Auto-generated SRR ID
Since `custom_srr_id` is mandatory in Frappe, we query the max existing SRR ID for the chosen branch and suggest the next one. Staff can override it before submitting.

### 6. Program Enrollment Must Be Submitted
Frappe validates that the `program_enrollment` linked to a `Fees` record must have `docstatus = 1` (submitted). The `createProgramEnrollment()` function always POSTs then immediately PUTs `{docstatus: 1}` to submit.

### 7. Guardian as Separate Doctype
Guardian information is stored in a separate `Guardian` doctype, linked from `Student.guardians` child table. When editing a student's guardian details, we PUT to `/resource/Guardian/{name}` separately from the Student PUT.

---

## 14. Known Frappe Quirks & Fixes

| Issue | Root Cause | Fix Applied |
|-------|-----------|-------------|
| 403 on login | `Has Role` not readable by session cookie | Use admin token for User doc + generate_keys |
| 417 on Student POST | `custom_srr_id` and `student_email_id` both mandatory | Auto-generate SRR ID and dummy email |
| Class dropdown shows all classes | Was using global `getPrograms()` | Now uses `getStudentGroups({custom_branch})` to extract branch-specific programs |
| Students show mock data | Page used hardcoded `mockStudents` array | Replaced with React Query + real Frappe API |
| Batch select width | Student Group naming is long | Show group names as tags, not inline text |
| Program Enrollment link fails in Fees | Enrollment was draft (docstatus=0) | Always submit enrollment after creation |

---

## 15. Environment & Configuration

### `.env.local`
```env
# Frappe Backend
NEXT_PUBLIC_FRAPPE_URL=https://smartup.m.frappe.cloud

# App Name
NEXT_PUBLIC_APP_NAME=Smartup ERP

# Server-only admin credentials (NEVER NEXT_PUBLIC_)
FRAPPE_API_KEY=<admin_api_key>
FRAPPE_API_SECRET=<admin_api_secret>

# Cookie signing
NEXTAUTH_SECRET=<random_32_char_string>
```

### Running the App
```bash
cd smartup-erp-frontend
npm run dev        # development (Turbopack)
npm run build      # production build
npm run start      # production server
```

### Build Status
All **19 routes** compile cleanly as of last build:
```
/api/auth/login           (Dynamic)
/api/auth/logout          (Dynamic)
/api/auth/me              (Dynamic)
/api/proxy/[...path]      (Dynamic)
/auth/forgot-password     (Static)
/auth/login               (Static)
/dashboard/branch-manager                        (Static)
/dashboard/branch-manager/attendance             (Static)
/dashboard/branch-manager/batches                (Static)
/dashboard/branch-manager/classes                (Static)
/dashboard/branch-manager/fees                   (Static)
/dashboard/branch-manager/students               (Static)
/dashboard/branch-manager/students/[id]          (Dynamic)
/dashboard/branch-manager/students/[id]/edit     (Dynamic)
/dashboard/branch-manager/students/new           (Static)
```

---

## Pending / Planned Work

- [ ] Delete student (trash button in list) with confirmation dialog
- [ ] Students list: branch filter dropdown
- [ ] Fees page: connect to real Frappe data (currently scaffold)
- [ ] Attendance page: connect to real Frappe data (currently scaffold)
- [ ] Batches page: connect to real Frappe data (currently scaffold)
- [ ] Classes page: connect to real Frappe data (currently scaffold)
- [ ] Student photo upload (image field on Student doctype)
- [ ] Fee collection / payment recording
- [ ] Bulk student import from CSV
- [ ] Role-based access: Super Admin view (cross-branch)
- [ ] Offline support (PWA / local cache)
