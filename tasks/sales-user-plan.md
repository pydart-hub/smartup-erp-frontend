# Sales User Role — Structure & Workflow Plan

## Overview

A **Sales User** is a branch-level staff member whose sole job is to **admit new students** at their assigned branch. They get a stripped-down dashboard focused entirely on the admission workflow — no access to attendance, course schedules, teachers, transfers, or fee management.

---

## 1. Role Mapping & Auth

| Layer | Change |
|-------|--------|
| **Frappe backend** | Role already exists: `Sales User` |
| **`APP_ROLE_PRIORITY`** (authStore.ts) | Add `"Sales User"` after `"Accounts User"` and before `"Parent"` |
| **`ROLE_DASHBOARD_MAP`** (constants.ts + middleware.ts) | `"Sales User" → "/dashboard/sales-user"` |
| **Middleware route protection** | Sales Users locked to `/dashboard/sales-user/*` only (like Instructor/Parent guards) |
| **`STAFF_ROLES`** (apiAuth.ts) | Add `"Sales User"` so they can call staff-level API routes (admission endpoints) |

### Auth Flow
1. Sales User logs in → login route fetches roles → finds `"Sales User"` in role list
2. `determinePrimaryRole()` picks `"Sales User"` from priority list
3. Middleware redirects to `/dashboard/sales-user`
4. Session contains `default_company` (their branch) → all data scoped to this branch

---

## 2. Permissions & Scope

### What Sales User CAN do:
- **Admit new students** (full 4-step wizard)
  - Create Student records
  - Create Guardian records
  - Create Parent users
  - Create Program Enrollment
  - Create Sales Order + Sales Invoices
  - Add student to batch (Student Group)
- **View students** at their branch (read-only list)
- **View their recent admissions** (dashboard activity feed)

### What Sales User CANNOT do:
- View/manage attendance (student or staff)
- View/manage course schedules
- View/manage teachers/instructors
- View/manage fees or payments (post-admission)
- Process transfers
- Access employees/HR
- Manage batches or classes (only select them during admission)
- Delete or modify existing students
- Access any other branch's data

---

## 3. Navigation (Sidebar)

```
SALES_USER_NAV:
├── Dashboard          /dashboard/sales-user              icon: LayoutDashboard
├── New Admission      /dashboard/sales-user/admit        icon: UserPlus
└── Students           /dashboard/sales-user/students     icon: GraduationCap
```

Intentionally minimal — 3 items only.

---

## 4. Pages & Components

### 4.1 Dashboard (`/dashboard/sales-user/page.tsx`)

**Stats Cards (top row):**
| Stat | Query | Description |
|------|-------|-------------|
| Today's Admissions | Student count with `creation` = today, branch = user's company | Students admitted today |
| This Month's Admissions | Student count with `creation` in current month | Monthly total |
| Total Active Students | Student count with `enabled=1`, branch = company | Branch total |

**Quick Action:**
- Single prominent "New Admission" button → links to `/dashboard/sales-user/admit`

**Recent Admissions (activity feed):**
- Last 10 students created at this branch, ordered by creation date desc
- Shows: student name, class/program, batch, admission date
- Clickable → student detail (read-only)

### 4.2 Admission Wizard (`/dashboard/sales-user/admit/page.tsx`)

**Reuses the exact same 4-step admission logic** from `branch-manager/students/new/page.tsx`:
1. Student Info (name, DOB, gender, contact, aadhaar, address)
2. Guardian Details (name, email, mobile, relation)
3. Academic (branch auto-locked to user's company, program, batch, academic year)
4. Fee & Payment (fee structure, plan, instalments)

**Key difference from Branch Manager version:**
- Branch field is **auto-locked** to the Sales User's `defaultCompany` (cannot change)
- On success → redirect to `/dashboard/sales-user/students` (not BM path)
- Uses the same API endpoints: `/api/admission/create-invoices`, `/api/auth/create-parent-user`

### 4.3 Students List (`/dashboard/sales-user/students/page.tsx`)

**Read-only student list** scoped to their branch:
- Table: student name, class/program, batch, enrollment date, status
- Search by name
- Filter by program/class
- Click row → student detail view (read-only)
- **No** "Add Student" button here (they use the dedicated "New Admission" page)
- **No** edit, discontinue, or transfer actions

### 4.4 Student Detail (`/dashboard/sales-user/students/[id]/page.tsx`)

**Read-only student detail view:**
- Student info (name, DOB, contact, guardian)
- Current enrollment (program, batch, academic year)
- Fee summary (plan, total amount — view only)
- **No action buttons** (no edit, no discontinue, no transfer)

---

## 5. API Layer Changes

### Existing API routes to reuse (no changes needed):
| Endpoint | Purpose | Already exists |
|----------|---------|----------------|
| `GET /api/proxy/api/resource/Student` | List students (proxy auto-filters by company) | ✅ |
| `GET /api/proxy/api/resource/Student/{id}` | Student detail | ✅ |
| `GET /api/proxy/api/resource/Program` | List programs | ✅ |
| `GET /api/proxy/api/resource/Student Group` | List batches | ✅ |
| `POST /api/proxy/api/resource/Student` | Create student | ✅ |
| `POST /api/proxy/api/resource/Guardian` | Create guardian | ✅ |
| `POST /api/proxy/api/resource/Program Enrollment` | Create enrollment | ✅ |
| `POST /api/proxy/api/resource/Sales Order` | Create SO | ✅ |
| `POST /api/admission/create-invoices` | Generate invoices | ✅ |
| `POST /api/auth/create-parent-user` | Create parent account | ✅ |

### Proxy route change needed:
- **`src/app/api/proxy/[...path]/route.ts`**: Add `"Sales User"` to the list of roles allowed to use the admin token for company-scoped writes (currently only Branch Manager and above)

### API auth change:
- **`src/lib/utils/apiAuth.ts`**: Add `"Sales User"` to `STAFF_ROLES` array so admission route handlers accept this role

---

## 6. File Changes Summary

### New Files (6):
| File | Purpose |
|------|---------|
| `src/app/dashboard/sales-user/page.tsx` | Sales User dashboard |
| `src/app/dashboard/sales-user/admit/page.tsx` | Admission wizard (reuses BM logic) |
| `src/app/dashboard/sales-user/students/page.tsx` | Read-only student list |
| `src/app/dashboard/sales-user/students/[id]/page.tsx` | Read-only student detail |

### Modified Files (5):
| File | Change |
|------|--------|
| `src/lib/utils/constants.ts` | Add `SALES_USER_NAV`, add to `ROLE_DASHBOARD_MAP`, add to `ROLES` |
| `src/middleware.ts` | Add `"Sales User"` to `ROLE_DASHBOARD_MAP`, add route guard |
| `src/lib/stores/authStore.ts` | Add `"Sales User"` to `APP_ROLE_PRIORITY` |
| `src/app/dashboard/layout.tsx` | Import `SALES_USER_NAV`, add to role→nav mapping |
| `src/lib/utils/apiAuth.ts` | Add `"Sales User"` to `STAFF_ROLES` |

### Optionally Modified (1):
| File | Change |
|------|--------|
| `src/app/api/proxy/[...path]/route.ts` | Allow Sales User role to use admin token for writes |

---

## 7. Workflow Diagram

```
Sales User logs in
       │
       ▼
┌─────────────────────┐
│  Sales User Dashboard│
│                     │
│  Stats: Today / Month│
│  / Total admissions │
│                     │
│  [New Admission] btn│
│                     │
│  Recent Admissions  │
│  feed (last 10)     │
└──────┬──────────────┘
       │ clicks "New Admission"
       ▼
┌─────────────────────┐
│  4-Step Admission    │
│  Wizard              │
│                      │
│  1. Student Info     │
│  2. Guardian Details │
│  3. Academic Setup   │
│     (branch locked)  │
│  4. Fee & Payment    │
│                      │
│  [Submit]            │
└──────┬───────────────┘
       │ on success
       ▼
  Backend creates:
  ├── Student record
  ├── Guardian record
  ├── Parent user account
  ├── Program Enrollment
  ├── Student → Batch
  ├── Sales Order
  └── Sales Invoices (per instalment)
       │
       ▼
  Redirect → Students list
  (new student appears at top)
```

---

## 8. Security Considerations

1. **Branch scoping enforced server-side** via proxy company filter — Sales User can never see/create students at another branch
2. **Read-only** for everything except admission — no edit/delete endpoints exposed
3. **Route guard in middleware** — cannot navigate to Branch Manager, Director, HR, or other dashboards
4. **API routes** check for `STAFF_ROLES` — Sales User added to trusted staff list
5. **No fee management access** — cannot modify invoices, record payments, or adjust fees post-admission

---

## Status: AWAITING USER APPROVAL

Implementation will begin only after explicit user command.
