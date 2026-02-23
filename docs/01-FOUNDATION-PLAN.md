# Smartup Offline ERP — Foundation Plan & Current State
## Next.js + Frappe ERPNext (Customized Backend)
**Last updated: February 24, 2026**

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    BROWSER (Next.js Client)                  │
│                                                              │
│  Auth    →  Branch Manager Dashboard                         │
│             ├── Students (list / view / edit / new)          │
│             ├── Batches                                       │
│             ├── Classes                                       │
│             ├── Fees                                          │
│             └── Attendance                                    │
│                                                              │
│  React Query (server state)  +  Zustand (UI state)           │
│  React Hook Form + Zod (forms)                               │
└──────────────────────┬───────────────────────────────────────┘
                       │ Axios  (/api/proxy/*)
                       │
┌──────────────────────▼───────────────────────────────────────┐
│               NEXT.JS API ROUTES (Proxy Layer)               │
│                                                              │
│  /api/auth/login        Login + generate user API keys       │
│  /api/auth/logout       Clear session cookie                 │
│  /api/auth/me           Return current session               │
│  /api/proxy/[...path]   Transparent Frappe proxy             │
│                         (injects Authorization header)       │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTPS
                       │ Authorization: token KEY:SECRET
┌──────────────────────▼───────────────────────────────────────┐
│           FRAPPE CLOUD BACKEND  smartup.m.frappe.cloud        │
│                                                              │
│  Apps: frappe 15.87 · erpnext 15.85 · education 15.5.3      │
│        hrms 15.52 · crm 1.58.5 · frappe_whatsapp 1.0.12     │
│                                                              │
│  Doctypes used:                                              │
│    Student, Guardian, Program Enrollment, Student Group      │
│    Program, Academic Year, Company, Fee Structure, Fees      │
│    Student Attendance, Student Batch Name                    │
│                                                              │
│  Custom fields on Student:                                   │
│    custom_branch (→Company), custom_srr_id (required)        │
│    custom_branch_abbr, custom_parent_name                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Version / Notes |
|-------|-----------|----------------|
| Framework | Next.js App Router | 16.1.6 (Turbopack) |
| Language | TypeScript | strict mode |
| Styling | Tailwind CSS | v4 — `@theme inline {}` syntax |
| Animation | Framer Motion | `ease: "easeOut" as const` |
| Server State | TanStack React Query | v5 |
| Global State | Zustand | auth + UI state |
| HTTP | Axios | interceptors; calls `/api/proxy` |
| Forms | React Hook Form + Zod | Zod v4: use `message:`, not `required_error:` |
| UI Components | Custom | Button, Input, Card, Badge, Skeleton |
| Notifications | Sonner | toast() |
| Icons | Lucide React | |

---

## 3. Authentication Flow

### 3.1 The Problem (and Fix)

The original plan called for calling `frappe.client.get_list` on the `Has Role` doctype after login to get the user's roles. **This fails with 403** — regular user session cookies cannot read that table.

### 3.2 Current Login Flow

```
User enters email + password
        ↓
POST /api/auth/login  (Next.js route — server side only)
        ↓
1. Frappe POST /api/method/login  { usr, pwd }
   → Confirms credentials; gets session cookie
        ↓
2. Using ADMIN token (FRAPPE_API_KEY:FRAPPE_API_SECRET from .env.local):
   a. GET /api/resource/User/{email}
      → Full User doc with `roles` child table  ← roles extracted here
   b. POST /api/method/frappe.core.doctype.user.user.generate_keys
         body: { user: email }
      → Returns { api_key, api_secret } for this user
        ↓
3. Store  api_key:api_secret  in httpOnly cookie (`user_token`)
        ↓
All subsequent calls: Authorization: token {user_key}:{user_secret}
```

### 3.3 Proxy Layer (`/api/proxy/[...path]`)

Every frontend request goes to `/api/proxy/*` (never directly to Frappe). The proxy:
- Reads `user_token` cookie
- Falls back to server admin token for requests that require elevated permissions
- Forwards verbatim to `https://smartup.m.frappe.cloud/api/{path}`

### 3.4 Route Protection (`middleware.ts`)

| Condition | Action |
|-----------|--------|
| No cookie → `/dashboard/*` | Redirect to `/auth/login` |
| Has cookie → `/auth/*` | Redirect to `/dashboard/branch-manager` |

---

## 4. Frappe Data Model — Actual Field Names

> ⚠️ These differ from standard ERPNext documentation — verified against the live instance.

### Student

| Field | Type | Notes |
|-------|------|-------|
| `name` | Data | Auto: `STU-SU CHL-26-550` |
| `first_name` | Data | **Required** |
| `student_email_id` | Data | **Required** — auto-generated as `{name}{srr}@dummy.com` if blank |
| `enabled` | Check | **1 = Active, 0 = Inactive** — NO `status` text field |
| `custom_branch` | Link→Company | **Required** — branch name e.g. "Smart Up Chullickal" |
| `custom_srr_id` | Data | **Required** — branch-scoped sequential ID e.g. "550" |
| `guardians` | Child table | `Student Guardian` rows: `guardian`, `guardian_name`, `relation` |

### Program Enrollment

| Field | Type | Notes |
|-------|------|-------|
| `student` | Link→Student | Required |
| `program` | Link→Program | Required |
| `academic_year` | Link→Academic Year | Required |
| `enrollment_date` | Date | Required |
| `student_batch_name` | Link→Student Batch Name | Optional batch code e.g. "CHL-25" |
| `docstatus` | Int | **Must be 1 (Submitted)** to link to Fees |

### Student Group (Batch)

| Field | Notes |
|-------|-------|
| `name` | e.g. `CHL-10th-25-1` |
| `group_based_on` | Always `"Batch"` for our batches |
| `program` | Linked Program |
| `batch` | Student Batch Name code |
| `custom_branch` | Company name |
| `max_strength` | Capacity (typically 60) |

### Guardian

| Field | Notes |
|-------|-------|
| `guardian_name` | Required |
| `mobile_number` | Phone |
| `email_address` | Email |

---

## 5. Frappe API Endpoints (In Use)

### Authentication

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/method/login` | Verify credentials |
| GET | `/api/resource/User/{email}` | Fetch User doc + roles (admin token) |
| POST | `/api/method/frappe.core.doctype.user.user.generate_keys` | Get user API key/secret |

### Student CRUD

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/resource/Student` | `filters`, `fields`, `limit_page_length`, `order_by` |
| GET | `/api/resource/Student/{id}` | Full doc including `guardians` child table |
| POST | `/api/resource/Student` | `custom_srr_id` and `student_email_id` are mandatory |
| PUT | `/api/resource/Student/{id}` | Partial update |
| DELETE | `/api/resource/Student/{id}` | |

### Enrollment & Batch

| Method | Endpoint | Notes |
|--------|----------|-------|
| POST | `/api/resource/Guardian` | Create guardian first |
| POST | `/api/resource/Program Enrollment` | Then PUT docstatus=1 to submit |
| PUT | `/api/resource/Program Enrollment/{id}` | Submit: `{docstatus: 1}` |
| GET | `/api/resource/Student Group` | Filter: `group_based_on=Batch`, `custom_branch`, `program` |
| PUT | `/api/resource/Student Group/{name}` | Append student to `students` child table |
| GET | `/api/resource/Program` | All programs (classes) |
| GET | `/api/resource/Academic Year` | All academic years |
| GET | `/api/resource/Company` | All branches |

### Fees

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/resource/Fee Structure` | Filter: `academic_year`, `company` |
| POST | `/api/resource/Fees` | Requires submitted Program Enrollment |
| GET | `/api/resource/Fees` | Filter: `program_enrollment`, `company` |

### Attendance

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/resource/Student Attendance` | Filter: `custom_branch`, `student_group`, `date` |
| POST | `/api/resource/Student Attendance` | Mark single attendance |

---

## 6. Role-Based Access

### Current Roles → Routes

| Frappe Role | Dashboard Route |
|-------------|----------------|
| Branch Manager | `/dashboard/branch-manager` |
| Batch Coordinator | `/dashboard/batch-coordinator` *(planned)* |
| Teacher | `/dashboard/teacher` *(planned)* |
| Accountant | `/dashboard/accountant` *(planned)* |

Currently only the **Branch Manager** dashboard is built.

---

## 7. Implementation Phases

### Phase 1: Foundation ✅ Complete
- [x] Next.js 16 project setup (App Router, TypeScript, Tailwind v4)
- [x] API service layer with Axios + proxy routes
- [x] Auth module — login, logout, session management
- [x] Login 403 fix — admin token for role lookup + generate_keys
- [x] Layout shell (sidebar, topbar, breadcrumbs)
- [x] Route protection middleware
- [x] Custom UI components (Button, Input, Card, Badge, Skeleton)
- [x] React Query provider in dashboard layout
- [x] All type definitions matching real Frappe schemas
- [x] All API service files wired to real Frappe (students, batches, fees, attendance, enrollment)

### Phase 2: Branch Manager — Student Module ✅ Complete
- [x] Student list — React Query, debounced search, status filter tabs, pagination
- [x] Enrollment map join (single bulk query for class/batch columns)
- [x] Student view page — hero card, personal/academic/guardian sections
- [x] Student edit page — pre-fill, dual PUT (Student + Guardian), cache invalidation
- [x] Admission wizard — 3-step form with live Frappe dropdowns
- [x] Branch → Class cascade (class dropdown filters by branch's actual Student Groups)
- [x] Auto SRR ID generation (`getNextSrrId`)
- [x] Auto dummy email generation (`{name}{srr}@dummy.com`)
- [x] Full `admitStudent()` 4-step chain: Guardian → Student → Program Enrollment → Student Group

### Phase 3: Batch & Class Management 🔲 Scaffold Only
- [ ] Batch list connected to real Frappe data
- [ ] Batch creation form
- [ ] Batch capacity monitoring
- [ ] Student-to-batch assignment

### Phase 4: Attendance System 🔲 Scaffold Only
- [ ] Daily attendance marking interface
- [ ] Bulk attendance entry
- [ ] Attendance reports & analytics

### Phase 5: Fee Management 🔲 Scaffold Only
- [ ] Fee structure builder
- [ ] Fee record creation (linked to Program Enrollment)
- [ ] Payment entry
- [ ] Receipt PDF generation
- [ ] Fee reports

### Phase 6: Additional Roles 🔲 Not Started
- [ ] Batch Coordinator dashboard
- [ ] Teacher dashboard (schedule + attendance)
- [ ] Accountant dashboard (fees + reports)

---

## 8. Folder Structure (Current)

```
smartup-erp-frontend/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts       ← admin token auth, role extraction, generate_keys
│   │   │   │   ├── logout/route.ts
│   │   │   │   └── me/route.ts
│   │   │   └── proxy/[...path]/route.ts ← transparent Frappe proxy
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   └── dashboard/
│   │       └── branch-manager/
│   │           ├── page.tsx             ← Overview / stats
│   │           ├── students/
│   │           │   ├── page.tsx         ← List: React Query, search, filter, pagination
│   │           │   ├── new/page.tsx     ← Admission wizard (3 steps, live dropdowns)
│   │           │   └── [id]/
│   │           │       ├── page.tsx     ← View: hero card + 3 section cards
│   │           │       └── edit/page.tsx  ← Edit: pre-fill, dual PUT
│   │           ├── batches/page.tsx     ← Scaffold
│   │           ├── classes/page.tsx     ← Scaffold
│   │           ├── fees/page.tsx        ← Scaffold
│   │           └── attendance/page.tsx  ← Scaffold
│   ├── components/
│   │   ├── layout/BreadcrumbNav.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx       ← label, leftIcon, rightIcon, error, hint props
│   │       ├── Card.tsx
│   │       ├── Badge.tsx
│   │       └── Skeleton.tsx
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts           ← Axios: base=/api/proxy, reads user_token cookie
│   │   │   ├── auth.ts
│   │   │   ├── students.ts         ← getStudents/getStudent/updateStudent/deleteStudent
│   │   │   ├── enrollment.ts       ← admitStudent, getNextSrrId, getBranches, getPrograms, etc.
│   │   │   ├── batches.ts
│   │   │   ├── fees.ts
│   │   │   └── attendance.ts
│   │   ├── types/
│   │   │   ├── student.ts          ← Student, Guardian, ProgramEnrollment, StudentGroup
│   │   │   ├── batch.ts
│   │   │   ├── fee.ts
│   │   │   ├── attendance.ts
│   │   │   └── api.ts              ← FrappeListResponse, FrappeSingleResponse
│   │   ├── validators/
│   │   │   └── student.ts          ← Zod schema: custom_branch, enrollment_date, custom_srr_id
│   │   ├── hooks/
│   │   ├── stores/
│   │   │   ├── authStore.ts
│   │   │   ├── uiStore.ts
│   │   │   └── featureFlagsStore.ts  ← dev feature flags (Zustand + persist)
│   │   └── utils/constants.ts
│   └── middleware.ts                ← Route protection + dev_auth_bypass cookie
├── .env.local
└── package.json
```

---

## 9. Key Technical Decisions

### 9.1 Enrollment Map Join (N+1 Fix)
The student list needs `program` and `batch` per row, but the Student doctype has no program field. Instead of fetching an enrollment per student row:

```
One call: GET /resource/Program Enrollment
  filters: [["student","in",[...25 ids]], ["docstatus","=",1]]
  fields: ["student","program","student_batch_name"]
→ Build Map<studentId, {program, batch}> in JS
```
2 total API calls regardless of page size.

### 9.2 Branch → Class Cascade
Rather than showing all 18 global programs, the class dropdown queries:
```
GET /resource/Student Group
  filters: [["custom_branch","=",selectedBranch], ["group_based_on","=","Batch"]]
→ Extract unique program values → populate Class dropdown
```
This shows only classes the selected branch actually runs.

### 9.3 Auto SRR ID
`custom_srr_id` is mandatory on Student. `getNextSrrId(branch)`:
```
GET /resource/Student
  filters: [["custom_branch","=",branch]]
  fields: ["custom_srr_id"]
  order_by: "CAST(custom_srr_id AS UNSIGNED) desc"
  limit: 1
→ parseInt + 1 → suggest to staff (editable before submit)
```

### 9.4 Program Enrollment Must Be Submitted
Fee records require `docstatus=1` on the linked Program Enrollment. `createProgramEnrollment()` always:
1. `POST /resource/Program Enrollment` → creates draft
2. `PUT /resource/Program Enrollment/{id}` `{docstatus: 1}` → submits it

### 9.5 Guardian as Separate Doctype
Guardian info is in a separate `Guardian` doctype linked via `Student.guardians` child table. The edit page PUTs to both `/resource/Student` and `/resource/Guardian/{name}` separately.

---

## 10. Environment Variables

```env
# .env.local

# Frappe backend
NEXT_PUBLIC_FRAPPE_URL=https://smartup.m.frappe.cloud

# App name
NEXT_PUBLIC_APP_NAME=Smartup ERP

# Server-side ONLY — admin credentials for post-login operations
# NEVER prefix with NEXT_PUBLIC_
FRAPPE_API_KEY=<admin_api_key>
FRAPPE_API_SECRET=<admin_api_secret>

# Cookie signing secret (openssl rand -base64 32)
NEXTAUTH_SECRET=<random_32_char_string>
```

### Running

```bash
npm run dev       # development (Turbopack, http://localhost:3000)
npm run build     # production build
npm run start     # production server
```

---

## 11. Live Reference Data (Frappe Instance)

### Branches — 11 Companies
```
Smart Up Chullickal    Smart Up Kacheripady    Smart Up Thopuppadi
Smart Up GCC           Smart Up MLA Road       Smart Up Vyttila
Smart Up Chamber       Smart Up Moolamkuzhi
Smart Up Eraveli       Smart Up Palluruthy
Smart Up Fortkochi
```

### Programs (Classes) — 18
```
5th Grade    8th Grade 1 to 1   11th Commerce        12th Commerce 1 to 1
6th Grade    9th Grade          11th Commerce 1 to 1  12th Science
7th Grade    9th Grade 1 to 1   11th Science          12th Science 1 to 1
8th Grade    10th Grade         11th Science 1 to 1   12th Science 1 to M
             10th Grade 1 to 1  12th Commerce
```

### Academic Years
- `2025-2026` (default)
- `2026-27`

### Naming Conventions
| Entity | Pattern | Example |
|--------|---------|---------|
| Student | `STU-SU {ABBR}-{YY}-{SRR}` | `STU-SU CHL-25-550` |
| Program Enrollment | `PEN-{PROG_ABB}--{SEQ}` | `PEN-5th--10001` |
| Student Group | `{BRANCH}-{PROG_ABB}-{YY}-{SEQ}` | `CHL-10th-25-1` |
| Student Email | `{name}{srr}@dummy.com` | `pranavkrishna550@dummy.com` |

---

## 12. Build Status (Feb 24, 2026)

All **20 routes** compile cleanly:

```
/api/auth/login                          Dynamic
/api/auth/logout                         Dynamic
/api/auth/me                             Dynamic
/api/proxy/[...path]                     Dynamic
/auth/forgot-password                    Static
/auth/login                              Static
/dashboard/branch-manager                Static
/dashboard/branch-manager/attendance     Static
/dashboard/branch-manager/batches        Static
/dashboard/branch-manager/classes        Static
/dashboard/branch-manager/fees           Static
/dashboard/branch-manager/students       Static
/dashboard/branch-manager/students/[id]         Dynamic  ← view
/dashboard/branch-manager/students/[id]/edit    Dynamic  ← edit
/dashboard/branch-manager/students/new          Static   ← admission wizard
/toggle                                  Static   ← developer toggle screen
```

---

## 13. Pending Work

- [ ] Delete student — trash button with confirmation dialog
- [ ] Students list — branch filter dropdown
- [ ] Batches page — connect to real Frappe data
- [ ] Classes page — connect to real Frappe data  
- [ ] Fees page — connect to real Frappe data
- [ ] Attendance page — daily marking interface
- [ ] Student photo upload (image field)
- [ ] Fee collection / payment recording
- [ ] Receipt PDF generation
- [ ] Bulk student import from CSV
- [ ] Batch Coordinator dashboard
- [ ] Teacher dashboard (schedule + attendance)
- [ ] Accountant dashboard
- [ ] Cross-branch Admin view
- [ ] Offline / PWA support

---

## 14. Developer Toggle Screen

**URL:** `http://localhost:3000/toggle` (no auth required — public path in middleware)

### Purpose
Allows developers to independently show/hide every UI feature without touching code or restarting the server. All flags persist in `localStorage` and take effect instantly across all open tabs.

### Architecture

```
src/lib/stores/featureFlagsStore.ts   ← Zustand + persist middleware
  - FeatureFlags interface (all flag keys)
  - DEFAULT_FLAGS (all true)
  - useFeatureFlagsStore hook
  - setFlag() — also syncs dev_auth_bypass cookie for middleware
  - resetFlags() — restores defaults, clears cookie

src/app/toggle/page.tsx               ← Dark GitHub-style UI
  - Section cards: Auth / Layout / Students / Other Nav
  - Toggle switch per flag
  - Live JSON state dump
  - Eye/strikethrough visibility preview
  - "Reset all" button
  - "Open App" link
```

### Auth bypass mechanism
When `auth` flag is turned OFF:
1. Toggle page sets cookie `dev_auth_bypass=1`
2. Middleware reads this cookie before session check → skips auth entirely
3. Login page detects `flags.auth === false` → `router.replace('/dashboard/branch-manager')`

When reset, the cookie is cleared and normal auth resumes.

### All Feature Flags

| Flag | Default | Controlled element |
|------|---------|-------------------|
| `auth` | `true` | Login gate (middleware + login page redirect) |
| `sidebar` | `true` | Entire `<Sidebar />` component |
| `overview` | `true` | Dashboard overview page content + nav link |
| `students` | `true` | Students nav link + entire list page |
| `students_create` | `true` | "Add Student" button on list page |
| `students_view` | `true` | Eye icon linking to student view page |
| `students_edit` | `true` | Pencil icon linking to student edit page |
| `batches` | `true` | Batches nav link + page content |
| `classes` | `true` | Classes nav link + page content |
| `attendance` | `true` | Attendance nav link + page content |
| `fees` | `true` | Fees nav link + page content |
| `topbar_search` | `true` | Global search bar in header |
| `topbar_notifications` | `true` | Notification bell + red dot |
| `topbar_profile` | `true` | User avatar, name, role chip, sign-out dropdown |

### Flag wiring points

| Flag | Wired in |
|------|----------|
| `auth` | `middleware.ts` (cookie check) + `auth/login/page.tsx` (redirect) |
| `sidebar` | `dashboard/layout.tsx` (conditional render) |
| `overview` + nav flags | `Sidebar.tsx` `NAV_FLAG_MAP` filter |
| `overview` | `branch-manager/page.tsx` `return null` |
| `students` → `students_edit` | `students/page.tsx` |
| `batches/classes/attendance/fees` | Each scaffold page's `return null` guard |
| `topbar_*` | `Topbar.tsx` |

> **Note:** Flag guards on pages with `useState` always place `if (!flags.x) return null` **after** all hook calls to comply with React's rules of hooks.
