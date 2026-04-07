# Teacher Performance Monitoring — Syllabus Part Tracking

## System Overview

**Two-step system:**
1. **Branch Manager configures** syllabus parts per course per branch (with titles)
2. **Teacher marks** parts as completed → waits for BM approval → BM approves/rejects

Later: performance metrics calculated based on completion velocity, approval rate, etc.

---

## CURRENT BACKEND STATE (from deep study)

### What exists today
- **50 courses** across grades 8-12, named like "10th Physics", "11th Chemistry"
- **11 programs** (e.g., "10th State", "10th CBSE", "11th Science State")
- **46 student groups** (batches) across **9 branches** - one batch per program per branch
- **30 instructors** distributed: Vennala(6), Eraveli(5), Kadavanthara(4), etc.
- **Instructor.instructor_log[]** maps instructor → (program, course, branch, academic_year)
  - Example: Ahad teaches 8th/9th/10th/11th/12th Chemistry at Thopumpadi
  - Example: Aleesha teaches 8th/9th/10th Hindi at both Palluruthy AND Thopumpadi
- **Course.topics[]** child table exists but is **EMPTY** for all courses (never populated)  
- **Topic doctype** exists (fields: topic_name, topic_content[], description) but has **ZERO records**
- **Student Group.instructors[]** is **EMPTY** for all groups — assignment lives only in instructor_log
- **No syllabus/progress/completion/part doctypes exist** — building from scratch

### Key numbers
| Metric | Count |
|---|---|
| Total courses | 50 |
| Total programs | 11 |
| Total branches | 9 |
| Total batches (Student Groups) | 46 |
| Total instructors | 30 |
| Avg instructor_log entries per instructor | ~5 (one per grade they teach) |
| Courses per program | 4-11 (CBSE=4 core, State=11 all subjects) |

### Instructor assignment pattern
Each instructor teaches **ONE subject across multiple grades** at their branch:
```
Ahad (Thopumpadi): 8th Chem, 9th Chem, 10th Chem, 11th Chem, 12th Chem
Anju (Kadavanthara): 8th Maths, 9th Maths, 10th Maths, 11th Maths, 12th Maths  
Aleesha (Thopumpadi): 8th Hindi, 9th Hindi, 10th Hindi (also cross-branch at Palluruthy)
```
Each instructor_log entry = `(program, course, branch, academic_year)` — **no student_group link**.
The batch is implicit: one batch per program per branch (e.g., "Thopumpadi-10th State-A").

---

## 1. BACKEND: Two New Custom DocTypes on Frappe

### DocType A: `Syllabus Configuration` (BM-managed template)

> Defines how many parts a course has at a branch, with titles. One record per (course, company, academic_year).

| Field | Fieldtype | Options/Values | Required | Purpose |
|---|---|---|---|---|
| `course` | Link → Course | | ✅ | Which subject (e.g., "10th Physics") |
| `company` | Link → Company | | ✅ | Which branch |
| `academic_year` | Link → Academic Year | | ✅ | e.g., "2026-2027" |
| `total_parts` | Int | | ✅ | How many parts (e.g., 12) |
| `parts` | Table → Syllabus Configuration Part | | ✅ | Child table with part titles |
| `configured_by` | Link → User | | | Who set this up |

**Uniqueness**: One record per `(course, company, academic_year)` — same part structure for all batches at a branch.

**Naming**: `SYLCFG-.YYYY.-.#####`

### DocType A-child: `Syllabus Configuration Part` (child table)

| Field | Fieldtype | Required | Purpose |
|---|---|---|---|
| `part_number` | Int | ✅ | Part 1, 2, 3, etc. |
| `part_title` | Data | ✅ | e.g., "Kinematics", "Dynamics" |

### DocType B: `Syllabus Part Completion` (per-part tracking record)

> A record-per-part approach. Each row = one part of one course, for one instructor, in one batch.
> Created automatically when BM saves a Syllabus Configuration (one completion record per instructor assigned to that course at that branch).

| Field | Fieldtype | Options/Values | Required | Purpose |
|---|---|---|---|---|
| `syllabus_config` | Link → Syllabus Configuration | | ✅ | Which template this belongs to |
| `instructor` | Link → Instructor | | ✅ | Who teaches this |
| `instructor_name` | Data (Read Only) | | | Display name |
| `course` | Link → Course | | ✅ | Which subject |
| `program` | Link → Program | | ✅ | Which program |
| `student_group` | Link → Student Group | | | Which batch (resolved from program+branch) |
| `academic_year` | Link → Academic Year | | ✅ | e.g., "2026-2027" |
| `company` | Link → Company | | ✅ | Branch (for scoping) |
| `part_number` | Int | | ✅ | Part 1, 2, 3, etc. |
| `part_title` | Data | | ✅ | Copied from config (e.g., "Kinematics") |
| `total_parts` | Int | | ✅ | Denormalized from config |
| `status` | Select | `Not Started` / `Pending Approval` / `Completed` / `Rejected` | ✅ | Workflow status |
| `completed_date` | Date | | | When teacher marked it |
| `approved_date` | Date | | | When BM approved |
| `approved_by` | Link → User | | | Who approved |
| `rejection_reason` | Small Text | | | If BM rejects |
| `remarks` | Small Text | | | Teacher notes |

**Naming**: `SPC-.YYYY.-.#####`

**Permissions**: 
- Instructor: Read + Write (own records only, via User Permission on company)
- Branch Manager: Read + Write + Create (branch-scoped)
- Director: Read (all records)
- Administrator: Full

### Why TWO doctypes (Config + Completion)?

1. **BM defines parts ONCE per course** → Syllabus Configuration (template)
2. **System auto-creates completion records** for each instructor assigned to that course at that branch
3. **If BM changes part count later** → can add/remove completion records cleanly
4. **Clean separation**: Config = "what should be done", Completion = "what has been done"
5. **Avoids duplication**: Part titles defined once, not repeated per instructor

### Why FLAT completion records (not child table)?

Same reasons as before:
1. Easy to query approval queue: `Syllabus Part Completion[status="Pending Approval", company=X]`
2. Individual audit trail per part
3. Matches Student Branch Transfer pattern
4. Granular timestamp tracking

---

## 2. DATA FLOW

### Step 1: BM Configures Parts (one-time per course per branch per year)

```
BM opens /dashboard/branch-manager/syllabus
→ Sees all courses for their branch's programs
→ Clicks "Configure" on "10th Physics"
→ Enters: total_parts=12, part titles:
    Part 1: Kinematics
    Part 2: Dynamics  
    Part 3: Work, Energy, Power
    ...
    Part 12: Modern Physics
→ Saves Syllabus Configuration

→ System auto-creates Syllabus Part Completion records:
  For each instructor who teaches 10th Physics at this branch
  (found via instructor_log: instructor.instructor_log[course="10th Physics", custom_branch=this branch])
  
  Example: Ahad teaches 10th Chemistry, NOT Physics → skip
           Priya teaches 10th Physics at this branch → create 12 records for Priya
```

### Step 2: Teacher Views & Marks Parts

```
Teacher opens /dashboard/instructor/syllabus
→ Sees courses from their instructor_log
→ Each course shows: progress bar (completed/total), pending count
→ Clicks into "10th Physics"
→ Sees 12 parts with statuses

→ Clicks "Mark Completed" on Part 5
→ Optionally adds remarks  
→ Record updates: status="Pending Approval", completed_date=today
```

### Step 3: BM Approves/Rejects

```
BM sees badge "3 pending" on Syllabus nav item
→ Opens /dashboard/branch-manager/syllabus → Pending tab
→ Sees: "Priya — 10th Physics — Part 5: Work, Energy, Power"
→ Clicks ✅ Approve → status="Completed", approved_date=today
   OR
→ Clicks ❌ Reject → enters reason → status="Rejected"
```

### Step 4: Re-submission (if rejected)

```
Teacher sees Part 5 as "Rejected" with reason
→ Clicks "Re-submit" → status="Pending Approval", clears rejection_reason, updates completed_date
```

---

## 3. API ROUTES (Next.js)

### Syllabus Configuration (BM manages)

| Route | Method | Purpose |
|---|---|---|
| `GET /api/syllabus-config` | GET | List configs for a branch (query: company, academic_year) |
| `GET /api/syllabus-config/[id]` | GET | Get single config with parts |
| `POST /api/syllabus-config` | POST | Create config (BM defines parts for a course) → auto-creates completion records |
| `PUT /api/syllabus-config/[id]` | PUT | Update config (add/remove/rename parts) → sync completion records |

### Syllabus Part Completion (Teacher + BM)

| Route | Method | Purpose |
|---|---|---|
| `GET /api/syllabus-parts` | GET | List completion records (filterable: instructor, course, company, status) |
| `PATCH /api/syllabus-parts/[id]` | PATCH | Teacher marks "Pending Approval" or re-submits |
| `PATCH /api/syllabus-parts/[id]/approve` | PATCH | BM approves → "Completed" |
| `PATCH /api/syllabus-parts/[id]/reject` | PATCH | BM rejects → "Rejected" + reason |
| `GET /api/syllabus-parts/summary` | GET | Aggregated stats (completion %) |

---

## 4. FRONTEND PAGES

### 4a. Branch Manager — Syllabus Management

**Route**: `/dashboard/branch-manager/syllabus`  
**Nav item**: Add to `BRANCH_MANAGER_NAV` after "Teachers" → `{ label: "Syllabus", href: "/dashboard/branch-manager/syllabus", icon: "BookOpen", emoji: "📖" }`

**Two-section page:**

**Section 1: Configuration** (define parts per course)

```
┌──────────────────────────────────────────────────────────────┐
│ Syllabus Configuration — Academic Year: 2026-2027            │
│                                                               │
│ ┌── Course ─────── Parts ─── Status ──── Action ────────────┐│
│ │ 10th Physics      12       ✅ Configured    [Edit]        ││
│ │ 10th Chemistry    10       ✅ Configured    [Edit]        ││
│ │ 10th Mathematics   8       ✅ Configured    [Edit]        ││
│ │ 10th Biology       0       ⚠ Not Set       [Configure]   ││
│ │ 10th English       0       ⚠ Not Set       [Configure]   ││
│ │ ...                                                        ││
│ └────────────────────────────────────────────────────────────┘│
│                                                               │
│ Shows all courses from programs at this branch               │
│ Quick view: which courses have been configured, which haven't │
└──────────────────────────────────────────────────────────────┘
```

**Configuration Dialog/Page** (for a single course):

```
┌──────────────────────────────────────────────────────────────┐
│ Configure: 10th Physics                                       │
│ Branch: Smart Up Kadavanthara  |  Year: 2026-2027            │
│                                                               │
│ Total Parts: [12]                                             │
│                                                               │
│ Part 1: [Kinematics                    ]                      │
│ Part 2: [Dynamics                      ]                      │
│ Part 3: [Work, Energy, Power           ]                      │
│ Part 4: [Gravity                       ]                      │
│ ...                                                           │
│ Part 12: [Modern Physics               ]                      │
│                                                               │
│ [+ Add Part]                                                  │
│                                                               │
│ Will create tracking records for: Priya (instructor)          │
│                                                               │
│ [Save Configuration]                                          │
└──────────────────────────────────────────────────────────────┘
```

**Section 2: Approvals** (approve/reject teacher submissions)

```
┌──────────────────────────────────────────────────────────────┐
│ Pending Approvals (5)                                         │
│                                                               │
│ ┌── Approval Card ──────────────────────────────────────────┐│
│ │ 👨‍🏫 Priya — 10th Physics — Part 5: Work, Energy, Power   ││
│ │ Batch: KDV-10th CBSE-A   Submitted: 2026-04-05            ││
│ │ Remarks: "Covered all practicals + numericals"             ││
│ │ [✅ Approve]  [❌ Reject]                                  ││
│ └────────────────────────────────────────────────────────────┘│
│                                                               │
│ ─── Progress Overview ───                                    │
│                                                               │
│ Teacher         | Course      | Progress                      │
│ Priya           | 10th Physics| ████░░░░ 5/12 (42%)          │
│ Ahad            | 10th Chem   | ██████░░ 7/10 (70%)          │
└──────────────────────────────────────────────────────────────┘
```

**Badge on Nav**: Count of "Pending Approval" (same pattern as Transfer notification badge).

### 4b. Instructor Dashboard — Syllabus Tracking

**Route**: `/dashboard/instructor/syllabus`  
**Nav item**: `{ label: "Syllabus", href: "/dashboard/instructor/syllabus", icon: "BookOpen", emoji: "📖" }`

**Course Overview Grid**:

```
┌─────────────────────────────────────────────────────────┐
│ My Syllabus Progress                                    │
│                                                          │
│ ┌────── Course Card ──────┐  ┌────── Course Card ──────┐│
│ │ 10th Physics             │  │ 9th Physics             ││
│ │ Batch: KDV-10th CBSE-A   │  │ Batch: KDV-9th CBSE-A  ││
│ │ ██████████░░░░ 7/12 parts│  │ ████░░░░░░░░░░ 3/10    ││
│ │ 2 Pending Approval       │  │ 1 Rejected              ││
│ │ [View Details →]         │  │ [View Details →]        ││
│ └──────────────────────────┘  └──────────────────────────┘│
│                                                          │
│ ┌────── Course Card ──────┐                              │
│ │ 8th Physics              │  ← No parts configured yet │
│ │ ⚠ Parts not yet set up   │  (BM hasn't configured)    │
│ │ by Branch Manager         │                             │
│ └──────────────────────────┘                              │
└──────────────────────────────────────────────────────────┘
```

**Detail View** (click on a course card):

**Route**: `/dashboard/instructor/syllabus/[courseId]`

```
┌────────────────────────────────────────────────────────────┐
│ 10th Physics — KDV-10th CBSE-A                             │
│ Progress: ██████████░░░░ 7/12 (58%)                        │
│                                                             │
│ ┌──── Part 1: Kinematics ───────────────── ✅ Completed ──┐│
│ │ Approved: 2026-03-15 by bm@smartup.in                    ││
│ └───────────────────────────────────────────────────────────┘│
│ ┌──── Part 5: Work, Energy ───── ⏳ Pending Approval ─────┐│
│ │ Submitted: 2026-04-05                                     ││
│ │ Remarks: "Covered all practicals"                         ││
│ └───────────────────────────────────────────────────────────┘│
│ ┌──── Part 8: Optics ──────────────── ❌ Rejected ────────┐│
│ │ Rejected: 2026-04-03                                      ││
│ │ Reason: "Lab portion not covered"                         ││
│ │ [Re-submit →]                                             ││
│ └───────────────────────────────────────────────────────────┘│
│ ┌──── Part 9: Modern Physics ──────── ○ Not Started ──────┐│
│ │ [Mark as Completed →]                                     ││
│ └───────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 4c. Director — Syllabus Overview (Phase 2)

Cross-branch view of completion rates per branch, comparable metrics.

---

## 5. IMPLEMENTATION STEPS (Ordered)

### Phase 1: Backend DocType Creation
1. Create `Syllabus Configuration Part` child table DocType
2. Create `Syllabus Configuration` DocType (with child table)
3. Create `Syllabus Part Completion` DocType
4. Test CRUD via REST API

### Phase 2: API Routes
5. `src/app/api/syllabus-config/route.ts` — GET list + POST create (with auto-population of completion records)
6. `src/app/api/syllabus-config/[id]/route.ts` — GET detail + PUT update
7. `src/app/api/syllabus-parts/route.ts` — GET list
8. `src/app/api/syllabus-parts/[id]/route.ts` — PATCH (teacher submits)
9. `src/app/api/syllabus-parts/[id]/approve/route.ts` — PATCH (BM approves)
10. `src/app/api/syllabus-parts/[id]/reject/route.ts` — PATCH (BM rejects)

### Phase 3: Type Definitions
11. `src/lib/types/syllabus.ts` — TypeScript interfaces for both doctypes
12. `src/lib/api/syllabus.ts` — Client-side API functions

### Phase 4: Branch Manager Frontend (FIRST — must configure before teachers can use)
13. `/dashboard/branch-manager/syllabus/page.tsx` — Config + Approvals
14. Configuration dialog/inline form for defining parts per course
15. Add "Syllabus" to `BRANCH_MANAGER_NAV` + pending badge

### Phase 5: Instructor Frontend
16. `/dashboard/instructor/syllabus/page.tsx` — Course grid with progress
17. `/dashboard/instructor/syllabus/[courseId]/page.tsx` — Part detail view
18. Add "Syllabus" to `INSTRUCTOR_NAV`

### Phase 6: Proxy Scoping + Polish
19. Add `"Syllabus Part Completion": "company"` and `"Syllabus Configuration": "company"` to `COMPANY_SCOPED_DOCTYPES`
20. Add `useSyllabusNotifications` hook for BM badge

---

## 6. AUTO-POPULATION LOGIC (Critical)

When BM saves a Syllabus Configuration for course X at branch Y:

```
1. Fetch all instructors at this branch:
   instructor_log[course=X, custom_branch=Y, academic_year=Z]
   → gives list of instructors who teach this course at this branch

2. For each instructor found:
   - Resolve the student_group: Student Group[program=log.program, custom_branch=Y, academic_year=Z]
   - For each part in the config:
     → Create a Syllabus Part Completion record:
       { instructor, course, program, student_group, company, 
         part_number, part_title, total_parts, status: "Not Started",
         syllabus_config: config.name, academic_year }

3. Example:
   BM configures "10th Physics" at Kadavanthara with 12 parts
   → System finds: instructor_log where course="10th Physics" AND custom_branch="Smart Up Kadavanthara"
   → Found: Ayana Rani (program: "10th CBSE")
   → Resolves batch: "Kadavanthara-10th CBSE-A"
   → Creates 12 × 1 = 12 Syllabus Part Completion records
```

### Edge case: Instructor teaches same course across multiple programs

```
If Priya teaches "10th Physics" in BOTH "10th State" AND "10th CBSE" at same branch:
→ instructor_log has 2 entries
→ Creates 12 records for Priya+10th State batch + 12 records for Priya+10th CBSE batch = 24 records
→ Each set points to a different student_group
```

---

## 7. Auth & Scoping Rules

| Role | Configure parts | Mark "Pending Approval" | Approve/Reject | Scope |
|---|---|---|---|---|
| Branch Manager | ✅ | ❌ | ✅ | company = their branch |
| Instructor | ❌ | ✅ (own parts) | ❌ | Own records via instructor_log |
| Director | ❌ | ❌ | ❌ (read only) | All branches |

---

## 8. FILES TO CREATE/MODIFY

**New Files:**
```
docs/create_syllabus_doctypes.mjs              # Backend DocType creation script
src/lib/types/syllabus.ts                       # TypeScript types
src/lib/api/syllabus.ts                         # Client API functions
src/app/api/syllabus-config/route.ts            # GET list + POST create
src/app/api/syllabus-config/[id]/route.ts       # GET detail + PUT update
src/app/api/syllabus-parts/route.ts             # GET list
src/app/api/syllabus-parts/[id]/route.ts        # PATCH (teacher submit)
src/app/api/syllabus-parts/[id]/approve/route.ts   # BM approve
src/app/api/syllabus-parts/[id]/reject/route.ts    # BM reject
src/app/dashboard/instructor/syllabus/page.tsx  # Teacher overview
src/app/dashboard/instructor/syllabus/[courseId]/page.tsx  # Part detail
src/app/dashboard/branch-manager/syllabus/page.tsx  # BM config + approvals
src/lib/hooks/useSyllabusNotifications.ts       # Pending count badge
```

**Modified Files:**
```
src/lib/utils/constants.ts                      # Add nav items to INSTRUCTOR_NAV + BRANCH_MANAGER_NAV
src/app/api/proxy/[...path]/route.ts            # Add to COMPANY_SCOPED_DOCTYPES
```

---

## 9. DESIGN DECISIONS & RATIONALE

| Decision | Rationale |
|---|---|
| **Two doctypes** (Config + Completion) | Clean separation of "what" (BM defines) vs "tracking" (per instructor). Part titles defined once |
| **BM configures, not teacher** | Ensures consistency across the branch. All teachers see same part structure |
| **Per course + per branch** (not global) | Different branches may have different pacing or syllabus breakdowns |
| **Auto-creates completion records** | Teacher doesn't need to set up anything. Just sees parts and marks them |
| **Flat completion records** | Easy approval queue queries, individual audit trail, matches Transfer pattern |
| **instructor_log for discovery** | Already maps instructor→course→program→branch. No new assignment needed |
| **Status field** (not docstatus) | Need 4 states (Not Started / Pending / Completed / Rejected). docstatus only has 3 |
