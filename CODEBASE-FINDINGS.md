# SmartUp ERP Codebase Findings
## Comprehensive Structure Analysis

**Last Updated**: May 6, 2026  
**Scope**: Frontend frontend + backend Frappe Education module integration

---

## 1. INSTRUCTOR STRUCTURE & MODELING

### Instructor Doctype Fields
Located in Frappe Education module. Core fields:
- `name` - Instructor ID (e.g., "INS-001")
- `instructor_name` - Display name (e.g., "Ahad Patel")
- `employee` - Link to Employee doctype (required)
- `department` - From linked Employee
- `status` - Active/Inactive
- `image` - Profile picture
- `gender` - From Employee
- `custom_company` - Custom field for company (branch) assignment (OPTIONAL - rarely used)

### Instructor Log Child Table (PRIMARY ASSIGNMENT)
**Location**: `Instructor.instructor_log[]` child table  
**This is the KEY to multi-branch support**

Each row represents one course assignment and contains:
```typescript
{
  program: string;           // e.g., "10th State"
  course: string;            // e.g., "Mathematics" (optional)
  custom_branch: string;     // Link to Company (branch) — e.g., "Smart Up Thopumpadi"
  academic_year: string;     // e.g., "2025-2026" (optional)
}
```

**Assignment Pattern (from system audit)**:
- One instructor teaches ONE subject across MULTIPLE grades at their branch
- Example: Ahad teaches Chemistry at Thopumpadi for grades 8th, 9th, 10th, 11th, 12th
- Example: Aleesha teaches Hindi at TWO branches (Thopumpadi AND Palluruthy) across grades 8-10
- Each grade = one `instructor_log` entry

**Current Data State**:
- 30 total instructors across 9 branches
- ~5 instructor_log entries per instructor on average
- Student Group.instructors[] child table is EMPTY (not used; assignment comes from instructor_log)

### Related Models
**InstructorWithLog type** (from `src/lib/types/analytics.ts`):
```typescript
interface InstructorWithLog extends Instructor {
  instructor_log: InstructorLogEntry[];
}
```

**InstructorPerformanceMetrics** (from analytics):
```typescript
{
  instructor: string;
  instructor_name: string;
  classes_scheduled: number;
  classes_conducted: number;    // only when attendance marked
  topics_assigned: number;
  topics_covered: number;
  topic_completion_pct: number;
  batches: InstructorBatchMetrics[];  // per-batch breakdown
}
```

---

## 2. BRANCH STRUCTURE & RELATIONSHIPS

### Company (Branch) Doctype
Each branch is a Frappe Company:
- `name` - Unique code (e.g., "Smart Up Chullickal")
- `company_name` - Display name
- Custom fields:
  - `company_abbreviation` - Short code (e.g., "CHL", "VNL", "KDV")

### Branch-Scoping Pattern
All academic doctypes use **custom_branch** field (Link → Company):
- `Student Group.custom_branch` → branch link
- `Student Attendance.custom_branch` → branch link
- `Course Schedule.custom_branch` → branch link
- `Student.custom_branch` → branch link
- `Assessment Plan.custom_branch` → branch link
- `Assessment Result.custom_branch` → branch link

**HR doctypes** use native **company** field (standard Frappe):
- `Employee.company` → company link
- `Attendance.company` → company link
- `Instructor.custom_company` → company link (custom, rarely set)

### Current Branches (9 total)
From teacher-performance-plan.md:
1. Thopumpadi (abbr: "")
2. Eraveli (abbr: "")
3. Kadavanthara (abbr: "KDV")
4. Vennala (abbr: "VNL")
5. Palluruthy (abbr: "")
6. And 4 others...

### Batch (Student Group) Structure
Each batch represents a class at a branch:
```typescript
interface Batch {
  name: string;                    // e.g., "CHL-10th-25-1"
  student_group_name: string;
  group_based_on: "Batch";
  academic_year: string;           // e.g., "2025-2026"
  program: string;                 // Program name (grade/stream)
  batch: string;                   // Student Batch Name (e.g., "CHL-25")
  custom_branch: string;           // Company/branch link
  max_strength: number;
  disabled: 0 | 1;
  instructors?: BatchInstructor[]; // USUALLY EMPTY
  students?: BatchStudent[];       // Child table with enrolled students
}
```

**Naming Convention**: `{ABBR}-{PROG_ABB}-{YY}-{SEQ}`  
Example: "CHL-10th-25-1" = Chullickal, 10th Grade, 2025, Batch #1

**Batch Count**: 46 total across 9 branches (one batch per program per branch typically)

---

## 3. CLASS & SCHEDULING SYSTEM

### Program & Course Hierarchy
```
Program (Grade + Stream)
  ├── "10th State" — All subjects for 10th Grade (State Board)
  ├── "10th CBSE" — CBSE subjects for 10th
  ├── "11th Science State"
  └── ... (11 total programs)
  
Course (Subject)
  ├── "Mathematics"
  ├── "Physics"
  ├── "Chemistry"
  └── ... (50 total courses across all programs)

Program Topic (ordered topics per course per program)
  ├── Doctype exists but HAS ZERO DATA
  └── Ordered by sort_order field (not yet populated)
```

### Course Schedule (Daily Session)
Primary doctype for scheduling:
```typescript
interface CourseSchedule {
  name: string;                // e.g., "CS-2026-00123"
  title: string;
  course: string;              // Link to Course (subject)
  student_group: string;       // Link to Student Group (batch)
  program: string;
  instructor: string;          // Link to Instructor
  instructor_name: string;
  schedule_date: string;       // YYYY-MM-DD
  from_time: string;           // HH:MM
  to_time: string;             // HH:MM
  room: string;                // Link to Room (optional)
  custom_branch: string;       // Company/branch link
  color?: string;
  custom_topic?: string;       // Link to Topic (optional) — NEW FEATURE
  custom_topic_covered?: 0|1;  // Auto-set when attendance marked
  custom_event_type?: string;  // Event categorization
  custom_event_title?: string;
}
```

### Scheduling Features

#### Bulk Creation (`bulkCreateCourseSchedules`)
Creates N schedules in one operation:
```typescript
interface BulkSchedulePayload {
  student_group: string;
  course: string;
  instructor: string;
  room?: string;
  from_time: string;
  to_time: string;
  custom_branch?: string;
  dates: string[];             // List of YYYY-MM-DD dates
  
  // Topic assignment mode (NEW)
  topicMode?: "sequential" | "single" | "none";
  custom_topic?: string;       // For "single" mode
  topicSequence?: string[];    // For "sequential" mode
}
```

**Topic Assignment Modes**:
- `sequential` — Auto-assign topics in order across dates (Day 1 = Topic 1, Day 2 = Topic 2, etc.)
- `single` — All dates get same topic (legacy behavior)
- `none` — No topics assigned

#### Overlap Bypass
Frappe Education raises `OverlapError` when room/instructor/group conflicts exist.  
**Solution**: Server Script `Create Course Schedule Force` with `flags.ignore_validate = True`
- Located in `src/lib/api/courseSchedule.ts`
- Method name: `create_course_schedule_force`
- Bypasses validation to allow admin overrides

---

## 4. ATTENDANCE MARKING IMPLEMENTATION

### Student Attendance Doctype
```typescript
interface AttendanceRecord {
  name: string;                    // e.g., "EDU-ATT-2026-00001"
  student: string;                 // Link to Student
  student_name: string;
  student_mobile_number?: string;
  date: string;                    // YYYY-MM-DD (required)
  status: "Present" | "Absent" | "Late";  // (required)
  student_group: string;           // Link to Student Group
  course_schedule?: string;        // Link to Course Schedule (optional)
  custom_branch: string;           // Link to Company (branch)
  link_nvfk?: string;              // Program (internal Frappe link)
  amended_from?: string;           // For amendments
  custom_video_watched?: 0|1;      // Parent confirmed video class watched
  custom_video_watched_on?: string;
  docstatus: 0|1;                  // 0=Draft, 1=Submitted (required)
}
```

**Submittable Doctype**: Yes (docstatus required)

### Bulk Attendance Marking (`bulkMarkAttendance`)
**Location**: `src/lib/api/attendance.ts`

Strategy:
1. Fetch existing submitted records for date + student_group
2. For each student:
   - No existing record → Create + Submit (docstatus: 1)
   - Existing with same status → Skip (no change)
   - Existing with different status → Cancel old, create new submitted

```typescript
interface BulkAttendancePayload {
  student_group: string;
  date: string;
  students: {
    student: string;
    student_name: string;
    status: "Present" | "Absent" | "Late";
  }[];
  custom_branch?: string;
}
```

### Attendance Unlock Mechanism
**Start-Time Based** (as of 2026-05-06 update):
- Instructors unlock attendance marking when class **STARTS** (from_time)
- Sessions remain unlocked after start time until next day
- Future sessions stay locked

### Attendance Analytics
**Per-Student Summary**:
```typescript
interface AttendanceSummary {
  student: string;
  student_name: string;
  total_days: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}
```

**Per-Batch Summary** (from `src/app/api/analytics/attendance-summary`):
- Batch attendance %
- Chronic absentees (threshold-based)
- Daily trend (present/absent/late counts)
- Branch-wide averages

---

## 5. USER ROLES & PERMISSIONS

### Role Hierarchy
1. **Administrator** - Full system access
2. **Director** - Org-wide reporting + analytics
3. **General Manager** - Branch & program analytics (no student edit)
4. **Branch Manager** - Single branch management (can create/edit students, instructors, schedules)
5. **Academics User** - Instructor + student access (auto-assigned at login)
6. **Instructor** - Class scheduling + attendance marking for assigned batches
7. **Parent** - Student fee + schedule views (read-only)

### Branch Manager Permissions
**Scoped to allowed_companies** (from session):
- Can manage employees in their branch
- Can manage students in their branch
- Can manage batches in their branch
- Can create/edit course schedules for their branch
- Can assign instructor roles to employees in their branch
- **Cannot** access other branches' data

**Related APIs**:
- `/api/admin/assign-instructor-role` — Branch Manager + Admin only
- GET returns status of instructor doc assignments
- POST creates missing Instructor docs + adds "Instructor" role to users

### Instructor Permissions
**Scoped by User Permissions** (Frappe native):
- Each instructor has User Permissions restricting:
  - Allowed Companies (branches)
  - Allowed Student Batch Names (batches they teach)
- When instructor uses personal API key, Frappe enforces scoping automatically
- Frontend hook `useInstructorBatches()` further validates batch access

### Role Assignment Flow
**At Login**:
1. User logs in with email
2. If user has Employee record → auto-add "Academics User" role
3. If user has Instructor doc → auto-add "Instructor" role
4. Frappe generates User Permissions based on role assignments

**Via Branch Manager**:
1. BM navigates to Manage Instructors page
2. BM clicks "Assign Instructor Roles"
3. API: `/api/admin/assign-instructor-role` (POST)
4. For each active employee in BM's branch:
   - Check if Instructor doc exists
   - If not, create one (links employee → instructor)
   - Fetch user_id from employee
   - If user_id exists, add "Instructor" role to User doc

---

## 6. API ENDPOINTS

### Instructor-Related Endpoints

| Endpoint | Method | Purpose | Scoping |
|----------|--------|---------|---------|
| `/api/resource/Instructor` | GET | List all instructors | Via employee company filter |
| `/api/resource/Instructor/{name}` | GET | Single instructor + instructor_log | Full doc with child table |
| `/api/resource/Instructor` | POST | Create instructor | Links to employee |
| `/api/admin/assign-instructor-role` | GET | Status of assignments | Branch-scoped for BM |
| `/api/admin/assign-instructor-role` | POST | Bulk assign instructor roles | Branch-scoped for BM |
| `/api/analytics/instructor-performance` | GET | Instructor performance metrics | Optional branch filter |

### Class/Batch Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/resource/Program` | GET | List programs (grades/streams) |
| `/api/resource/Course` | GET | List courses (subjects) |
| `/api/resource/Student Group` | GET/POST | List/create batches (filtered by custom_branch) |
| `/api/resource/Student Group/{name}` | GET | Single batch with students + instructors |
| `/api/resource/Course Schedule` | GET/POST/PUT | Schedules |

### Scheduling Endpoints

| Endpoint | Method | Purpose | Special Handling |
|----------|--------|---------|------------------|
| `/api/resource/Course Schedule` | GET | List schedules | Filtered by custom_branch + date range |
| `/api/resource/Course Schedule` | POST | Create single schedule | Tries Server Script first (force mode) |
| `/api/method/create_course_schedule_force` | POST | Bulk creation bypass | Ignores overlap validation |
| `/api/resource/Course Schedule/{name}` | PUT | Update schedule | Typically for topic_covered flag |

### Attendance Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/resource/Student Attendance` | GET | Fetch attendance records (filtered by date + branch) |
| `/api/resource/Student Attendance` | POST | Create attendance record |
| `/api/resource/Student Attendance/{name}` | PUT | Update attendance record |
| `/api/method/frappe.client.cancel` | POST | Cancel submitted attendance (for corrections) |

### Analytics Endpoints

| Endpoint | Purpose | Returns |
|----------|---------|---------|
| `/api/analytics/attendance-summary` | Per-batch/per-student attendance | AttendanceAnalyticsResponse |
| `/api/analytics/instructor-performance` | Instructor class + topic metrics | InstructorPerformanceMetrics[] |
| `/api/analytics/branch-actions-needed` | Current-week actions (not scheduled, not marked) | BranchAcademicHealth[] |

### Proxy Scoping

**Location**: `src/app/api/proxy/[...path]/route.ts`

All Frappe API calls route through the proxy which:
1. Extracts session data (roles, allowed_companies, instructor_name)
2. For non-admin, non-instructor-with-token users:
   - Injects company filter on list GET requests
   - Scopes to allowed_companies from User Permissions
3. For instructors with personal API token:
   - Forwards request unchanged (Frappe enforces User Permissions natively)
4. For instructors WITHOUT personal token:
   - Warns in logs, uses admin token fallback (less ideal)
   - Frontend hooks still validate batch access

---

## 7. CURRENT RELATIONSHIP MODEL

### Data Flow: Instructor → Branch → Batch → Course Schedule → Attendance

```
Instructor (e.g., "INS-001")
  │
  ├── instructor_log[0] ──┐
  │   ├── program: "10th State"
  │   ├── course: "Mathematics"
  │   └── custom_branch: "Smart Up Thopumpadi"
  │                           │
  │                           └──→ Company (Branch) 
  │                                  │
  │                                  ├──→ Student Group "CHL-10th-25-1"
  │                                  │       │
  │                                  │       ├──→ Course Schedule (daily session)
  │                                  │       │       │
  │                                  │       │       └──→ Student Attendance (per student)
  │                                  │       │
  │                                  │       └──→ Students (enrolled)
  │
  ├── instructor_log[1] ──┐
  │   ├── program: "11th State"
  │   ├── course: "Mathematics"
  │   └── custom_branch: "Smart Up Thopumpadi"
  │                           └──→ Batch "CHL-11th-25-1"
  │
  └── instructor_log[2] ──┐
      ├── program: "10th State"
      ├── course: "Mathematics"
      └── custom_branch: "Smart Up Palluruthy"  ← CROSS-BRANCH!
                              └──→ Batch "PAL-10th-26-1"
```

### Key Relationships

**One-to-Many**:
- One Instructor → Many instructor_log entries (multiple branches + programs)
- One Branch (Company) → Many Batches (Student Groups)
- One Batch → Many Course Schedules (daily sessions)
- One Course Schedule → Many Student Attendance records (one per student)

**Many-to-Many**:
- Instructors ↔ Batches (implicit via instructor_log + program+branch match)
- Not direct; matching done by:
  1. Fetch instructor_log entries for instructor
  2. Extract (program, branch) pairs
  3. Match against batches with same (program, custom_branch)

**No Direct Links**:
- Student Group.instructors[] exists but is EMPTY
- Assignment lives only in instructor_log on Instructor doctype
- This design allows **one instructor to teach multiple subjects/batches** implicitly

### Implicit Batch Discovery (useInstructorBatches Hook)

Frontend hook implements the resolution:
```
1. Get Instructor doc (includes instructor_log)
2. Build set of "program|branch" keys from instructor_log
3. Fetch all Student Groups
4. Filter to only groups matching an instructor_log entry
5. Fetch full docs (with students child table) in parallel
6. Return filtered list
```

---

## 8. EXISTING LIMITATIONS & CONSTRAINTS

### Current Design Limitations

1. **No explicit batch-instructor link**
   - Student Group.instructors[] not used (empty)
   - Assignment lives only in instructor_log on Instructor doc
   - Branch managers cannot override/modify batch instructor directly from batch form
   - Implicit matching can fail if program/branch naming is inconsistent

2. **Cross-branch complexity**
   - No UI to easily view instructor's teaching assignments across branches
   - Each branch manager only sees their branch's data (good for isolation, bad for awareness)
   - No conflict detection when same instructor scheduled at different branches simultaneously

3. **Attendance not linked to course_schedule**
   - `Student Attendance.course_schedule` is OPTIONAL
   - Bulk marking doesn't automatically populate this link
   - Without the link, attendance reporting loses context of which class/room

4. **Topic system not populated**
   - `Course.topics[]` child table exists but empty
   - `Program Topic` doctype exists but zero records
   - Topic-wise scheduling feature is NEW (not yet in use)
   - Topics are optional on Course Schedule

5. **Syllabus tracking not yet built**
   - `Syllabus Configuration` doctype = PLANNED, not implemented
   - `Syllabus Part Completion` doctype = PLANNED, not implemented
   - Teacher performance tracking is currently limited to classes conducted

6. **Exam system not yet populated**
   - Assessment Plan, Assessment Result doctypes exist but have zero data
   - Grading Scale structure exists but needs setup
   - Assessment Criteria master is empty

### Frappe Education Module Gaps

These doctypes exist but are **not yet used**:
- Topic (exists, zero records)
- Program Topic (exists, zero records)
- Assessment Plan (exists, zero records)
- Assessment Result (exists, zero records)
- Assessment Criteria (exists, mostly empty)
- Grading Scale (exists, needs setup)

### Permission & Scoping Gaps

1. **Instructor token generation sometimes fails**
   - If API key generation fails during login, instructor falls back to admin token
   - Frappe User Permissions enforcement is bypassed (logged warning)
   - Frontend hooks still validate batch access, but less secure

2. **Branch Manager cannot see cross-branch instructors**
   - Each BM only sees employees/instructors in their branch
   - Cannot reassign instructor from another branch (by design)
   - No org-wide instructor view available

---

## 9. SUMMARY: CURRENT STATE MATRIX

| Aspect | Status | Notes |
|--------|--------|-------|
| **Instructor Data Model** | ✅ Complete | Uses instructor_log child table for branch/program assignments |
| **Branch Scoping** | ✅ Complete | custom_branch field on all academic doctypes; company field on HR doctypes |
| **Class/Batch Creation** | ✅ Complete | 46 batches across 9 branches; one per program per branch typically |
| **Scheduling (Daily Sessions)** | ✅ Complete | Course Schedule doctype; bulk creation with topic assignment modes |
| **Attendance Marking** | ✅ Complete | Student Attendance doctype; bulk marking with cancel-recreate strategy |
| **Attendance Analytics** | ✅ Complete | Per-student, per-batch, per-branch summaries; chronic absentee detection |
| **Instructor Performance** | ✅ Partial | Classes conducted, topics covered tracked; syllabus completion NOT YET |
| **Role-Based Access Control** | ✅ Complete | 7-role hierarchy; Branch Managers scoped to their branch |
| **User Permissions** | ✅ Complete | Frappe native; enforced on Instructor + Student Batch Name |
| **Cross-Branch Instructor Support** | ✅ Working | instructor_log design allows multiple branches; UI doesn't emphasize it |
| **Topic Scheduling** | ✅ Recent | New feature (May 2026); sequential/single/none modes implemented |
| **Syllabus Tracking** | ❌ Planned | DocTypes defined (teacher-performance-plan.md), not yet built |
| **Exam System** | ❌ Planned | DocTypes exist, zero data; awaiting implementation plan approval |

---

## 10. FRONTEND COMPONENT STRUCTURE

### Key Components & Pages

**Branch Manager - Employee Management**:
- `/app/dashboard/branch-manager/employees/page.tsx` — Main employee list
- `/app/dashboard/branch-manager/employees/manage-instructors/page.tsx` — Assign instructor roles
- `/app/dashboard/branch-manager/employees/mark-attendance/page.tsx` — Employee attendance (HR)

**Branch Manager - Academics**:
- Batch management, student enrollment, course scheduling (in components/ folder)

**Instructor Dashboard**:
- `/app/dashboard/instructor/` — Instructor home
- Batch roster, attendance marking, class scheduling pages
- Exam creation (Assessment Plan)
- Topic coverage tracking

**General Manager & Director**:
- `/app/dashboard/general-manager/` — Branch-wise analytics
- `/app/dashboard/director/` — Org-wide reports
- Course schedule overview, attendance analytics, performance metrics

### Key Hooks

**`useInstructorBatches()`** (`src/lib/hooks/useInstructorBatches.ts`):
- Fetches instructor_log from Instructor doc
- Resolves matching batches (program + branch match)
- Returns filtered list of accessible batches
- Used by instructor pages for scoping

**`useAuth()`** (from authStore):
- Provides `instructorName`, `defaultCompany`, `allowedBatches`
- Session-stored, populated at login
- Used throughout app for role/access checks

### API Integration Files

**`src/lib/api/`**:
- `employees.ts` — Employee, Instructor, Attendance (HR)
- `batches.ts` — Student Group, batch creation/updates
- `courseSchedule.ts` — Course Schedule CRUD + bulk creation
- `attendance.ts` — Student Attendance marking
- `director.ts` — Branch/program-wide analytics
- `analytics.ts` — Instructor performance, attendance trends

---

## 11. FRONTEND IMPLEMENTATION PATTERNS

### Instructor Batch Discovery
```typescript
// Typical flow in instructor pages
const { instructorName } = useAuth();
const { activeBatches, isBatchAllowed } = useInstructorBatches();

// Use hook to get batches, then validate access to specific batch
if (!isBatchAllowed(selectedBatchId)) {
  // Redirect or show error
}
```

### Bulk Scheduling
```typescript
import { bulkCreateCourseSchedules } from "@/lib/api/courseSchedule";

const result = await bulkCreateCourseSchedules({
  student_group: "CHL-10th-25-1",
  course: "Mathematics",
  instructor: "INS-001",
  room: "Room 1",
  from_time: "09:00",
  to_time: "10:30",
  custom_branch: "Smart Up Chullickal",
  dates: ["2026-05-07", "2026-05-08", ...],
  topicMode: "sequential",
  topicSequence: ["Real Numbers", "Polynomials", ...],
}, onProgress);

// result.created — how many succeeded
// result.failed — array of { date, error } for failures
```

### Bulk Attendance Marking
```typescript
import { bulkMarkAttendance } from "@/lib/api/attendance";

const result = await bulkMarkAttendance({
  student_group: "CHL-10th-25-1",
  date: "2026-05-07",
  students: [
    { student: "STU-001", student_name: "Arjun", status: "Present" },
    { student: "STU-002", student_name: "Isha", status: "Absent" },
    ...
  ],
  custom_branch: "Smart Up Chullickal",
});
```

---

## 12. KEY FINDINGS FOR MULTI-BRANCH INSTRUCTOR ASSIGNMENT

### Design Pattern That Already Works
1. **Instructor_log child table** allows one instructor to be assigned multiple (program, branch) pairs
2. **Branch-scoped batches** are created with custom_branch field
3. **Hook-based discovery** (`useInstructorBatches`) resolves instructor access implicitly
4. **Proxy scoping** enforces branch limits for Branch Managers

### What's Missing for Full Multi-Branch Experience
1. **Cross-branch conflict detection** — No warning when same instructor scheduled simultaneously at different branches
2. **Unified instructor workload view** — Branch managers don't see cross-branch assignments
3. **Explicit batch-instructor links** — Assignment hidden in instructor_log, not visible on batch form
4. **Attendance linking** — course_schedule link often empty, loses context

### Recommendation for Enhancement
**To properly support multi-branch instructor assignments, consider**:
1. Populate Student Group.instructors[] based on instructor_log (currently unused)
2. Add explicit "Instructor Assignment" doctype linking instructor → batch → academic_year
3. Build UI for Branch Managers to view/manage all branches' instructor assignments
4. Add cross-branch conflict detection in scheduling
5. Always populate course_schedule link in Student Attendance bulk operations
6. Build syllabus tracking system (already planned in teacher-performance-plan.md)

