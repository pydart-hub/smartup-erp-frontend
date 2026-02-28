# Instructor Access — API Audit & Fixes

## Completed

- [x] Deep study of all Frappe education DocType schemas and permissions
- [x] Audit instructor user roles, User Permissions, and API keys
- [x] Auto-add "Academics User" role to instructors at login
- [x] Guard DELETE on Student Group in proxy (prevent instructors deleting batches)
- [x] Add Room as required on new schedule form (matches Frappe schema)
- [x] TypeScript build passes clean

## Frappe Permission Matrix — Final State

| DocType | Instructor Role | Academics User Role | Gap Fixed? |
|---|---|---|---|
| **Student Attendance** | ❌ Not listed | read/write/create/submit/cancel/delete | ✅ Auto-added Academics User at login |
| **Course Schedule** | ❌ Not listed | read/write/create/delete | ✅ Auto-added Academics User at login |
| **Student Group** | read only | full CRUD | ✅ Proxy blocks write+delete for instructors |
| **Student** | read only | full CRUD | OK (read-only sufficient) |
| **Course** | full CRUD | full CRUD | OK |
| **Instructor** | read only | N/A | OK |

## Known Configuration Issue (Frappe Admin Action Needed)

The instructor `salihsali04@gmail.com` has a **Company User Permission** set to `Smart Up Thopumpadi`, but has course schedules at `Smart Up GCC` and `Smart Up Kacheripady`. When using the instructor's own API token, Frappe would restrict results to Thopumpadi only — hiding their actual schedules.

**Impact**: Once the instructor logs in (and gets api_key generated), the proxy will use their token, and they may not see their GCC/Kacheripady schedules.

**Fix options (Frappe admin)**:
1. Add additional Company User Permissions for each branch where the instructor teaches
2. Remove the Company User Permission and rely on frontend filtering by instructor name
3. Use `apply_to_all_doctypes: 0` on the Company permission so it only applies to HR doctypes

## Changes Made

### 1. Login Route (`src/app/api/auth/login/route.ts`)
- After detect instructor → check if "Academics User" role exists
- If missing → add via PUT to User doc's roles child table using admin token
- This is a one-time side effect per instructor login

### 2. Proxy (`src/app/api/proxy/[...path]/route.ts`)
- Extended write-guard to include DELETE method alongside PUT/POST
- Prevents instructors from deleting Student Group records (Academics User role grants this)

### 3. New Schedule Form (`src/app/dashboard/instructor/course-schedule/new/page.tsx`)
- Room field now marked as required with validation error
- Matches Frappe's `reqd: 1` on the Room field in Course Schedule schema
