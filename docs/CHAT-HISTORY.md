# Smartup ERP — Build History & Feature Log
**Project:** Smartup Offline ERP Frontend  
**Stack:** Next.js 16 + Frappe Cloud  
**Period:** February 2026  
**Repo:** https://github.com/pydart-hub/smartup-erp-frontend

---

## Session 1 — Project Foundation

### What was built
- Initialized Next.js 16.1.6 project (`smartup-erp-frontend`) with App Router, TypeScript, Tailwind v4, Turbopack
- Set up full project folder structure: `src/app`, `src/components`, `src/lib`
- Installed all dependencies: Axios, React Query v5, Zustand, React Hook Form, Zod v4, Framer Motion, Sonner, Lucide React

### Infrastructure created
| File | Purpose |
|------|---------|
| `src/lib/api/client.ts` | Axios instance — base URL `/api/proxy`, reads `user_token` cookie |
| `src/middleware.ts` | Route protection — redirects unauthenticated users to login |
| `src/app/api/proxy/[...path]/route.ts` | Transparent Frappe proxy — injects `Authorization: token KEY:SECRET` |
| `src/app/api/auth/login/route.ts` | Login API route |
| `src/app/api/auth/logout/route.ts` | Logout — clears session cookie |
| `src/app/api/auth/me/route.ts` | Returns current session user |
| `src/lib/stores/authStore.ts` | Zustand auth state: user, role, isAuthenticated |
| `src/lib/stores/uiStore.ts` | Zustand UI state: sidebar open/collapsed |
| `src/lib/utils/constants.ts` | Nav items, roles, route map |

### UI Components created
- `Button` — variant (primary/secondary/ghost/danger), size, loading state
- `Input` — label, leftIcon, rightIcon, error, hint props
- `Card` / `CardHeader` / `CardTitle` / `CardContent`
- `Badge` — success/warning/error/default variants
- `Skeleton` — loading placeholder

### Layout Shell
- `Sidebar` — collapsible desktop, slide-in mobile, active indicator animation
- `Topbar` — search bar, notification bell, user avatar + dropdown, sign-out
- `BreadcrumbNav` — auto-generated from pathname segments
- `DashboardLayout` — QueryClientProvider wrapper + Toaster

### Auth Pages
- `/auth/login` — left panel branding + right panel login form
- `/auth/forgot-password` — placeholder page

### Dashboard Pages (scaffold)
- `/dashboard/branch-manager` — overview with stats cards, quick actions, recent activity
- `/dashboard/branch-manager/batches` — mock batch list grouped by class
- `/dashboard/branch-manager/classes` — mock class list
- `/dashboard/branch-manager/attendance` — mock attendance marking UI
- `/dashboard/branch-manager/fees` — mock fee stats + pending fees table

### Type definitions
- `src/lib/types/student.ts` — Student, Guardian, ProgramEnrollment, StudentGroup
- `src/lib/types/batch.ts`
- `src/lib/types/fee.ts`
- `src/lib/types/attendance.ts`
- `src/lib/types/api.ts` — FrappeListResponse, FrappeSingleResponse

---

## Session 2 — Login 403 Fix

### Problem
Login worked but redirect to dashboard gave 403. The original flow tried to read `Has Role` doctype using the user's session cookie — Frappe blocks this for regular users.

### Root cause
Frappe's REST API does not allow regular users to query the `Has Role` doctype via session cookie auth.

### Fix implemented
Changed `src/app/api/auth/login/route.ts` to use the **server admin token** (`FRAPPE_API_KEY:FRAPPE_API_SECRET` from `.env.local`) for all post-login operations:

1. `POST /api/method/login` — verifies credentials (unchanged)
2. `GET /api/resource/User/{email}` — fetch full User doc **using admin token** → contains `roles` child table
3. `POST /api/method/frappe.core.doctype.user.user.generate_keys` **using admin token** → gets fresh `api_key` and `api_secret` for the user
4. Store `api_key:api_secret` in httpOnly cookie `user_token`
5. All subsequent API calls use **user's own token** via the proxy

### Key learning
- Admin env vars (`FRAPPE_API_KEY`, `FRAPPE_API_SECRET`) must NOT be prefixed with `NEXT_PUBLIC_`
- The proxy falls back to admin token for operations that need elevated access

---

## Session 3 — Frappe Schema Discovery

### What was investigated
Queried the live Frappe Cloud instance (`smartup.m.frappe.cloud`) to discover:

### Apps installed on the backend
- `frappe` 15.87
- `erpnext` 15.85
- `education` 15.5.3
- `hrms` 15.52
- `crm` 1.58.5
- `frappe_whatsapp` 1.0.12

### Real field schemas discovered
| Doctype | Field | Reality (vs assumption) |
|---------|-------|------------------------|
| Student | `enabled` | Check field — `1` = Active, `0` = Inactive. **No `status` text field exists.** |
| Student | `custom_branch` | Link → Company (not a Branch doctype) |
| Student | `custom_srr_id` | Data, **mandatory** |
| Student | `student_email_id` | Data, **mandatory** |
| Program Enrollment | `docstatus` | Must be **1 (Submitted)** to link to Fees |
| Company | — | Used as Branch (11 companies = 11 branches) |

### Live reference data found
- **11 branches** (Companies): Smart Up Chullickal, GCC, Chamber, Eraveli, Fortkochi, Kacheripady, MLA Road, Moolamkuzhi, Palluruthy, Thopuppadi, Vyttila
- **18 programs**: 5th Grade through 12th Science 1 to M
- **Academic years**: 2025-2026, 2026-27
- **Student naming**: `STU-SU CHL-26-550`
- **SRR ID pattern**: sequential integer per branch (e.g. `550` for CHL, `202510` for GCC)

### Files updated
- All type files updated to match real Frappe field names
- `src/lib/api/enrollment.ts` — created with real Frappe operations

---

## Session 4 — API Layer Wiring

### Files created/updated

#### `src/lib/api/enrollment.ts`
Full admission flow:
```
admitStudent()
  1. POST /resource/Guardian          → create guardian
  2. POST /resource/Student           → create student (auto email, auto SRR)
  3. POST /resource/Program Enrollment → draft enrollment
  4. PUT  /resource/Program Enrollment/{id} {docstatus:1} → submit
  5. PUT  /resource/Student Group/{name}  → append student to batch
```

Other exports:
- `getNextSrrId(branch)` — queries last SRR, returns next integer
- `getBranches()` — GET /resource/Company
- `getPrograms()` — GET /resource/Program
- `getAcademicYears()` — GET /resource/Academic Year
- `getStudentGroups(params)` — filter by branch + program

#### `src/lib/api/students.ts`
- `getStudents()` — paginated list with search + enabled filter
- `getStudent(id)` — single student with guardians child table
- `updateStudent(id, data)` — partial PUT
- `searchStudents()` — search by name

#### `src/lib/validators/student.ts`
Zod v4 schema with real fields:
- `custom_branch`, `academic_year`, `enrollment_date` (required)
- `custom_srr_id`, `student_batch_name` (optional)
- Guardian fields: `guardian_name`, `guardian_mobile`, `guardian_relation`

---

## Session 5 — Students List Page (Live Data)

### File: `src/app/dashboard/branch-manager/students/page.tsx`

Replaced mock data with React Query live data.

### Key patterns

#### Dual-query enrollment join (N+1 fix)
```
Query 1: GET /resource/Student (page of 25)
Query 2: GET /resource/Program Enrollment
           filters: [["student","in",[...25 ids]], ["docstatus","=",1]]
→ Build Map<studentId, {program, batch}> in JS
→ 2 API calls regardless of page size
```

#### Features
- Debounced search (400ms) — `student_name like %search%`
- Status filter tabs: All / Active / Inactive (maps to `enabled` 0/1)
- Pagination: `PAGE_SIZE = 25`, prev/next buttons
- Skeleton loading rows during fetch
- Error state with retry
- Eye button → `/students/{id}` (view page)
- Pencil button → `/students/{id}/edit` (edit page)
- Trash button → placeholder (delete not yet implemented)

---

## Session 6 — Admission Wizard (3-Step Form)

### File: `src/app/dashboard/branch-manager/students/new/page.tsx`

### Step structure
| Step | Fields | Validation |
|------|--------|-----------|
| 1 — Personal | first_name, date_of_birth, gender | first_name required |
| 2 — Academic | custom_branch, program, academic_year, enrollment_date | all required |
| 3 — Guardian | guardian_name, guardian_mobile, guardian_relation | guardian_name required |

### Branch → Class cascade
Step 2's class dropdown dynamically filters:
```
GET /resource/Student Group
  filters: [["custom_branch","=",selectedBranch], ["group_based_on","=","Batch"]]
→ Extract unique `program` values
→ Populate class dropdown with only classes at that branch
```

### Auto SRR ID
- On branch selection: calls `getNextSrrId(branch)` 
- Queries last `CAST(custom_srr_id AS UNSIGNED) desc` student at that branch
- Suggests next integer (editable before submitting)

### 417 error fix
- Root cause: `custom_srr_id` (mandatory) and `student_email_id` (mandatory) were missing from POST body
- Fix: SRR auto-generated; email auto-generated as `{studentName}{srrId}@dummy.com`

---

## Session 7 — Student View & Edit Pages

### Student View Page
**File:** `src/app/dashboard/branch-manager/students/[id]/page.tsx`

3 parallel queries:
1. `getStudent(id)` — full student doc
2. Latest `Program Enrollment` (docstatus=1, order by enrollment_date desc)
3. `Guardian` doc via `student.guardians[0].guardian`

UI layout:
- **Hero card** — avatar (initials), name, SRR ID, branch, status badge, class, batch
- **Personal Info card** — DOB, gender, blood group, email, phone
- **Academic Details card** — branch, class, batch, academic year, enrollment date
- **Guardian card** — name, relation, mobile, email

### Student Edit Page
**File:** `src/app/dashboard/branch-manager/students/[id]/edit/page.tsx`

- Pre-fills all fields from live `getStudent(id)` query
- RHF + Zod schema (`enabled: z.enum(["0","1"])` — not `z.coerce.number()` which caused TypeScript error)
- On save: `PUT /resource/Student/{id}` + `PUT /resource/Guardian/{name}` separately
- Invalidates React Query cache: `["student", id]` and `["students"]`
- Redirects to view page on success

### TypeScript fix
`z.coerce.number()` for `enabled` caused resolver type mismatch. Fixed with:
```ts
enabled: z.enum(["0", "1"])
// then on save:
enabled: Number(values.enabled)
```

---

## Session 8 — Developer Toggle Screen

### Problem
Needed a way to show/hide individual UI features during development without touching code.

### Solution: `/toggle` screen

**Files created:**
- `src/lib/stores/featureFlagsStore.ts` — Zustand + `persist` middleware  
- `src/app/toggle/page.tsx` — dark GitHub-style developer UI

### Feature Flags (14 total)

| Flag | Controls |
|------|---------|
| `auth` | Login gate — middleware + login page redirect |
| `sidebar` | Entire sidebar component |
| `overview` | Dashboard overview page |
| `students` | Students nav + list page |
| `students_create` | "Add Student" button |
| `students_view` | Eye icon on list |
| `students_edit` | Pencil icon on list |
| `batches` | Batches nav + page |
| `classes` | Classes nav + page |
| `attendance` | Attendance nav + page |
| `fees` | Fees nav + page |
| `topbar_search` | Header search bar |
| `topbar_notifications` | Notification bell + red dot |
| `topbar_profile` | User avatar + sign-out dropdown |

### Auth bypass mechanism
```
Toggle auth OFF
  → featureFlagsStore.setFlag("auth", false)
  → document.cookie = "dev_auth_bypass=1"
  → middleware.ts reads cookie → skips session check
  → login page detects flags.auth===false → router.replace("/dashboard/branch-manager")
```

### Toggle UI features
- Toggle switch per flag (instant, no reload)
- ON/OFF label with colored indicator
- Live JSON dump of all current flag values
- Eye / strikethrough visual preview
- "Reset all" button — restores defaults, clears bypass cookie
- "Open App" link

### Flag wiring points
| Component | What changes |
|-----------|-------------|
| `middleware.ts` | Auth bypass cookie check |
| `dashboard/layout.tsx` | `{flags.sidebar && <Sidebar />}` |
| `Sidebar.tsx` | `NAV_FLAG_MAP` filters nav items |
| `Topbar.tsx` | Search, bell, profile all individually gated |
| Each page | `if (!flags.x) return null` early return |

> Note: Pages with `useState` put the null check **after all hooks** (React rules of hooks compliance)

---

## Session 9 — Documentation

### Files created in `docs/`

| File | Contents |
|------|---------|
| `docs/WORKFLOW.md` | 15-section comprehensive workflow — auth flow, API patterns, student CRUD, wizard, enrollment chain, error fixes |
| `docs/01-FOUNDATION-PLAN.md` | 14-section updated foundation plan — tech stack, auth, data model, API endpoints, phases, folder structure, live reference data, build status, toggle screen |
| `docs/CHAT-HISTORY.md` | This file — chronological build history |

---

## Session 10 — GitHub Push

### Repository
- **URL:** https://github.com/pydart-hub/smartup-erp-frontend
- **Branch:** `main`
- **Auth method:** Personal Access Token (PAT) stored in Windows Credential Manager (`wincred`)

### What was pushed
All source code + docs in a single initial commit:
```
feat: initial commit — Smartup ERP frontend + docs

- Next.js 16 App Router, TypeScript, Tailwind v4
- Auth: admin token login, generate_keys, httpOnly cookie
- Branch Manager dashboard: students CRUD (list/view/edit/new)
- Admission wizard: 3-step, live Frappe dropdowns, auto SRR ID
- Feature flags system: /toggle developer screen (14 flags)
- docs: WORKFLOW.md, 01-FOUNDATION-PLAN.md
```

### Setup commands for future pushes
```bash
git add .
git commit -m "your message"
git push
```

---

## Current Build State (Feb 24, 2026)

### Routes — 20 total, all clean
```
/toggle                                          Static   DEV feature flags screen
/auth/login                                      Static
/auth/forgot-password                            Static
/api/auth/login                                  Dynamic
/api/auth/logout                                 Dynamic
/api/auth/me                                     Dynamic
/api/proxy/[...path]                             Dynamic
/dashboard/branch-manager                        Static   overview (flags.overview)
/dashboard/branch-manager/students               Static   list (flags.students)
/dashboard/branch-manager/students/new           Static   admission wizard
/dashboard/branch-manager/students/[id]          Dynamic  view page
/dashboard/branch-manager/students/[id]/edit     Dynamic  edit page
/dashboard/branch-manager/batches                Static   scaffold (flags.batches)
/dashboard/branch-manager/classes                Static   scaffold (flags.classes)
/dashboard/branch-manager/attendance             Static   scaffold (flags.attendance)
/dashboard/branch-manager/fees                   Static   scaffold (flags.fees)
```

### What's fully live (connected to real Frappe)
- ✅ Login / logout / session
- ✅ Students list with search, filter, pagination
- ✅ Student view page (hero + 3 section cards)
- ✅ Student edit page (dual PUT: Student + Guardian)
- ✅ Admission wizard (Guardian → Student → ProgramEnrollment → StudentGroup)
- ✅ Branch → class cascade (live branch-specific programs)
- ✅ Auto SRR ID generation
- ✅ Developer toggle screen (14 flags)

### What's scaffold only (mock data, not yet wired)
- 🔲 Batches page
- 🔲 Classes page
- 🔲 Attendance page
- 🔲 Fees page
- 🔲 Delete student (Trash button exists, no handler)

---

## Known Issues & Bugs Fixed

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 1 | 403 on login redirect | Regular user can't read `Has Role` via session cookie | Use admin token to GET `/resource/User/{email}` + `generate_keys` |
| 2 | 417 on Student POST | `custom_srr_id` and `student_email_id` are mandatory, were missing | Auto-generate SRR ID + dummy email `{name}{srr}@dummy.com` |
| 3 | Students list showed all 18 programs globally in class dropdown | Class dropdown loaded all programs, not branch-specific | Query `Student Group` filtered by `custom_branch` to get branch programs only |
| 4 | TypeScript build error on edit page | `z.coerce.number()` for `enabled` caused RHF resolver type mismatch | Changed to `z.enum(["0","1"])` + `Number(values.enabled)` cast on save |
| 5 | Framer Motion `ease` TS error | `ease: "easeOut"` inferred as `string` not valid ease type | `ease: "easeOut" as const` |

---

## Tech Stack Reference

| Layer | Tech | Version | Notes |
|-------|------|---------|-------|
| Framework | Next.js App Router | 16.1.6 | Turbopack, `src/` dir |
| Language | TypeScript | latest | strict mode |
| Styling | Tailwind CSS | v4 | `@theme inline {}` syntax — NOT v3 |
| Animation | Framer Motion | latest | `ease: "easeOut" as const` |
| Server State | TanStack React Query | v5 | `staleTime: 5min`, `retry: 1` |
| Global State | Zustand | latest | `authStore`, `uiStore`, `featureFlagsStore` |
| HTTP | Axios | latest | base `/api/proxy`, cookie-based auth |
| Forms | React Hook Form + Zod | Zod v4 | Use `message:` not `required_error:` |
| Notifications | Sonner | latest | `toast.success()`, `toast.error()` |
| Icons | Lucide React | latest | |
| Backend | Frappe Cloud | 15.x | `https://smartup.m.frappe.cloud` |

---

## Environment Variables

```env
# .env.local (never commit this file)
NEXT_PUBLIC_FRAPPE_URL=https://smartup.m.frappe.cloud
NEXT_PUBLIC_APP_NAME=Smartup ERP
FRAPPE_API_KEY=<admin_api_key>
FRAPPE_API_SECRET=<admin_api_secret>
NEXTAUTH_SECRET=<random_32_char_string>
```
