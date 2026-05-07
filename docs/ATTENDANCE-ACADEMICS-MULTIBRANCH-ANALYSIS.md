# Multi-Branch Instructor: Attendance Marking & Academics Viewing
## Detailed Analysis

---

## 📊 CURRENT IMPLEMENTATION ANALYSIS

### 1. WHO CAN MARK ATTENDANCE? 

#### Current Access Control (Single-Branch Model)

```
Role Hierarchy:
├── Instructor
│   └── Can mark attendance ONLY for their assigned batches
│   └── Scoped by: Frappe User Permissions (Company + Student Batch Name)
│   └── Frontend validation: useInstructorBatches() hook
│
├── Branch Manager
│   └── Can mark attendance for ALL batches in their branch
│   └── Scoped by: allowed_companies (their single branch)
│   └── No direct access — delegates to instructors or staff
│
├── General Manager
│   └── Read-only access across all branches
│   └── Can view analytics but NOT mark attendance
│
└── Director
    └── Can mark attendance anywhere (super-user)
```

#### How Instructors Currently Mark Attendance

**Page Flow:**
```
/dashboard/instructor/attendance
  ↓
[Select Date]
  ↓
[List of instructor's course schedules for that date]
  ↓
[For each session: expand → show batch students → mark status]
  ↓
[Submit: bulkMarkAttendance()] → Frappe Student Attendance docs created
```

**Code Flow (Instructor Attendance):**
```typescript
// File: src/app/dashboard/instructor/attendance/page.tsx

export default function InstructorAttendancePage() {
  const { instructorName } = useAuth();
  const { isBatchAllowed } = useInstructorBatches();  ← Checks if batch allowed
  
  // 1. Get today's course schedules for this instructor
  const schedules = getCourseSchedules({
    date: selectedDate,
    instructor: instructorName,  ← Only their sessions
  });
  
  // 2. For each session, fetch students in that batch
  const students = getBatch(sessionBatchId);
  
  // 3. Fetch existing attendance records
  const existing = getAttendance(date, { student_group: batchId });
  
  // 4. User marks each student as Present/Absent/Late
  // 5. Submit: bulkMarkAttendance()
  //    - Creates new Student Attendance docs (docstatus: 1 = submitted)
    // - Sets custom_branch from student_group
}
```

**Student Attendance Record Created:**
```
{
  name: "EDU-ATT-2026-00001",
  student: "STU-001",
  date: "2026-05-06",
  status: "Present",
  student_group: "CHL-10th-25-1",
  instructor: "INS-001",           ← NOT STORED (missing field)
  custom_branch: "Thopumpadi",     ← Inherited from batch
  docstatus: 1,                     ← Submitted
}
```

---

### 2. THE MULTI-BRANCH PROBLEM IN ATTENDANCE MARKING

#### Issue 1: Implicit Batch-to-Branch Mapping

**Current:**
```
Instructor "Aleesha"
  ├── instructor_log[0]: program="10th State", branch="Thopumpadi"
  ├── instructor_log[1]: program="10th State", branch="Palluruthy"
  
When marking attendance:
  ├── getCourseSchedules(instructor="Aleesha", date="2026-05-06")
  │   ├── Batch "CHL-10th-25-1" (Thopumpadi)
  │   ├── Batch "CHL-10th-26-1" (Palluruthy)  ← BOTH RETURNED
  │
  └── No clear indicator WHICH batch is in WHICH branch
      No `custom_branch` on CourseSchedule

Problem: Instructor sees both batches but can't tell them apart by branch!
```

**Proposed Solution:**
```
CourseSchedule needs explicit custom_branch field
(Or inherit from Student Group via lookup)

Then attendance UI shows:
  Session 1: CHL-10th-25-1 (Thopumpadi) 09:00-10:00
  Session 2: CHL-10th-26-1 (Palluruthy) 10:00-11:00  ← Clear branch label
```

---

#### Issue 2: No Conflict Detection During Attendance Marking

**Current Scenario:**
```
Instructor Aleesha
├── Thopumpadi: 10th Hindi class 09:00-10:00
└── Palluruthy: 11th Hindi class 09:00-10:00 (SAME TIME!)

Attendance marking UI shows:
  ✅ Mark 10th batch at 09:00 (Thopumpadi)
  ✅ Mark 11th batch at 09:00 (Palluruthy) ← NO WARNING!

Result: Impossible to attend both classes simultaneously
        No warning shown to instructor or branch manager
```

**What's Needed:**
- Warn instructor: "You have another class at this time"
- Allow branch manager to see: "This instructor teaches elsewhere at this time"
- Let admin force-override with reason logged

---

#### Issue 3: Branch Scoping in Attendance API

**Current Code (works for single-branch):**
```typescript
// File: src/lib/api/attendance.ts

export async function bulkMarkAttendance(payload: BulkAttendancePayload) {
  const { student_group, date, students, custom_branch } = payload;
  
  // Query existing attendance for this student_group + date
  const existing = getAttendance(date, { student_group });
  
  // For each student: mark as Present/Absent/Late
  // custom_branch is optional — inherited from student_group if not provided
}
```

**Multi-Branch Issue:**
```
If student_group="CHL-10th-25-1" (Thopumpadi)
  → custom_branch auto-filled as "Thopumpadi" ✅

If batch somehow linked to multiple branches (shouldn't happen):
  → Ambiguous which branch's attendance record to update ❌

Solution: Ensure Student Group ALWAYS linked to single branch
         (Already true in current model)
```

---

### 3. HOW ACADEMICS VIEWING WORKS (CURRENTLY)

#### Current Academics Architecture

```
Role            Dashboard           Analytics Retrieved
────────────────────────────────────────────────────────
Branch Manager  /dashboard/branch-   getAttendanceAnalytics(branch)
                manager/academics    getExamAnalytics(branch)
                                     getInstructorAnalytics(branch)
                
General Manager /dashboard/general-  getBranchAcademics()
                manager/academics    Shows all branches

Director        /dashboard/director/ getBranchAcademics()
                academics            getAchievementDashboard(year)
                                     Cross-branch drill-down
                
Instructor      /dashboard/           getStudentPerformance(student, batch)
                instructor/my-         View own teaching batches
                performance
```

#### Branch Manager Academics View

**Page:** `/dashboard/branch-manager/academics`

```typescript
export default function AcademicsOverviewPage() {
  const { defaultCompany } = useAuth();  // Their branch
  
  // 1. Fetch attendance for their branch
  const attData = getAttendanceAnalytics({
    branch: defaultCompany,
    from_date, to_date
  });  // Returns: { overall, chronic_absentees, batches[] }
  
  // 2. Fetch exam results for their branch
  const examData = getExamAnalytics({
    branch: defaultCompany
  });  // Returns: { overall, batches[], subject_breakdown }
  
  // 3. Fetch instructor performance for their branch
  const instrData = getInstructorAnalytics({
    branch: defaultCompany
  });  // Returns: { overall, instructors[] }
  
  // Renders: KPI cards, top batches, chronic absentees, instructor perf
}
```

**API Calls (Backend):**

```
File: src/app/api/analytics/attendance-summary/route.ts

GET /api/analytics/attendance-summary?branch=Thopumpadi&from_date=...&to_date=...
  ├── Filter Student Attendance by custom_branch
  ├── Group by program → batch
  ├── Calculate:
  │   ├── Overall: avg_attendance_pct, total_students, total_working_days
  │   ├── Per-batch: avg_pct, present, absent
  │   └── Chronic absentees (< 75%)
  └── Return: { overall, batches, chronic_absentees }

Same for:
  - getExamAnalytics() → Student Assessment records by branch
  - getInstructorAnalytics() → Course Schedule topic completion by branch
```

---

### 4. THE MULTI-BRANCH PROBLEM IN ACADEMICS VIEWING

#### Issue 1: Instructor Performance Shows Only Their Primary Branch

**Current:**
```
Branch Manager views /dashboard/branch-manager/academics
  → getInstructorAnalytics(branch="Thopumpadi")
  → Filters: instructors who teach in Thopumpadi
  
For Aleesha (teaches at Thopumpadi AND Palluruthy):
  ✅ Shows her stats at Thopumpadi
  ❌ DOESN'T show she teaches elsewhere
  ❌ DOESN'T show conflicting class times
  ❌ DOESN'T show total workload across branches
```

**What Branch Manager Needs to See:**
```
Instructor Performance (Thopumpadi Branch)

Aleesha
├── Classes Conducted: 45/50 (90%)
├── Avg Topic Completion: 85%
├── Students Taught: 120
└── ⚠️ ALSO TEACHES: Palluruthy (11th Hindi, 20 students)
    └── Check times for conflicts?
```

---

#### Issue 2: No Unified Cross-Branch Instructor Workload View

**Current:**
```
Director views /dashboard/director/academics
  → getBranchAcademics()
  → Queries all branches separately
  
BUT:
  ❌ No aggregated instructor workload across branches
  ❌ No conflict detection report
  ❌ No utilization percentage per instructor
```

**What Director Needs:**
```
Cross-Branch Instructor Dashboard

Aleesha
├── Thopumpadi: 45 classes, 90% completion
├── Palluruthy: 30 classes, 75% completion
├── Total: 75 classes/week, 2 branches
├── Potential Conflicts: 0 detected ✅
└── Workload: 85% utilized (safe)
```

---

#### Issue 3: Attendance Analytics Don't Show Instructor Assignment Across Branches

**Current Report:**
```
Attendance Summary (Thopumpadi)

Overall Attendance: 82%
  By Batch:
    CHL-10th-25-1: 85%
    CHL-10th-26-1: 80%
    ...

By Instructor:
  Aleesha: 85% attendance in their classes
  Ramesh: 78%
  ...

Missing:
  ❌ "Aleesha teaches 10th at Thopumpadi and Palluruthy"
  ❌ Cross-branch attendance patterns
```

---

## 🔧 HOW TO IMPLEMENT MULTI-BRANCH SUPPORT

### Option A: Minimal Changes (Recommended)

#### 1. Add explicit `custom_branch` to CourseSchedule

**Backend Change:** Frappe custom field on Course Schedule doctype
```
Field: custom_branch
  Type: Link → Company
  Auto-fill: From student_group.custom_branch
```

**Frontend Impact:**
```typescript
// Attendance marking UI shows branch label
<Session>
  {batch.student_group_name} @ {branch_name} — {time}
</Session>

// Attendance marking includes branch check
if (schedule_batch_branch !== other_schedule_branch_same_time) {
  warn("Different branches — confirm this is intentional")
}
```

---

#### 2. Update getInstructorAnalytics() to Show Cross-Branch

**Backend Change:** New query method
```
Route: GET /api/analytics/instructor-cross-branch?instructor=INS-001

Returns:
{
  instructor_name: "Aleesha",
  branches: [
    {
      branch: "Thopumpadi",
      classes_conducted: 45,
      topic_completion: 85%,
      students_taught: 120,
    },
    {
      branch: "Palluruthy",
      classes_conducted: 30,
      topic_completion: 75%,
      students_taught: 80,
    }
  ],
  total_workload_pct: 82%,
  conflicts_detected: 0,
}
```

**Frontend Component:**
```typescript
// New component: InstructorCrossBranchCard

<div className="bg-surface rounded p-4">
  <h3>{instructor.name}</h3>
  
  {instructor.branches.map(b => (
    <div key={b.branch}>
      <span>{b.branch}: {b.classes_conducted} classes, {b.topic_completion}%</span>
    </div>
  ))}
  
  <p>Total Workload: {instructor.total_workload_pct}%</p>
  {instructor.conflicts_detected > 0 && (
    <Alert>⚠️ {instructor.conflicts_detected} time conflicts detected</Alert>
  )}
</div>
```

---

#### 3. Update getAttendanceAnalytics() to Include Instructor Branch Info

**Backend Change:** Enhance response
```
GET /api/analytics/attendance-summary?branch=Thopumpadi

Returns:
{
  overall: { ... },
  batches: [
    {
      student_group: "CHL-10th-25-1",
      instructor: "Aleesha",
      instructor_branches: ["Thopumpadi", "Palluruthy"],  ← NEW
      classes_conducted: 45,
      avg_attendance: 85%,
      ...
    }
  ],
  ...
}
```

**Frontend:** Show warning badge
```
Batch Card:
  CHL-10th-25-1 (Thopumpadi)
  Instructor: Aleesha ⚠️ Also teaches: Palluruthy
  Attendance: 85%
```

---

#### 4. Add Attendance Conflict Detection

**Backend API:**
```
POST /api/method/check-attendance-conflict

Payload:
{
  instructor: "INS-001",
  date: "2026-05-06",
  batch: "CHL-10th-25-1",
  from_time: "09:00",
  to_time: "10:00"
}

Returns:
{
  has_conflict: false,
  conflicting_sessions: []
  
  // OR
  has_conflict: true,
  conflicting_sessions: [
    {
      batch: "CHL-10th-26-1",
      branch: "Palluruthy",
      from_time: "09:15",
      to_time: "10:15",
      time_overlap: "15 mins"
    }
  ]
}
```

**Frontend Integration:**
```typescript
// When instructor tries to mark attendance for a session
if (conflict_check.has_conflict) {
  showWarning(
    `Conflict: You have ${conflict_check.conflicting_sessions[0].batch} ` +
    `at ${conflict_check.conflicting_sessions[0].branch} during this time`
  );
  
  // Still allow marking (with audit log of conflict)
}
```

---

### Option B: Comprehensive Solution (For Future)

#### Create Explicit "Instructor Assignment" Doctype

```
Doctype: Instructor Assignment
  Fields:
    - instructor: Link → Instructor
    - batch: Link → Student Group
    - branch: Link → Company (denormalized from batch)
    - program: String (denormalized)
    - academic_year: Link → Academic Year
    - from_date/to_date: Date range
    - is_active: Boolean
    - max_hours_per_week: Number
    - courses: Table of specific courses
    - assignment_type: "Primary" | "Support" | "Substitute"
    - conflict_check_required: Boolean
```

**Benefits:**
- Explicit audit trail of assignments
- Can support time-bound assignments
- Can support role types (primary, support, substitute)
- Easier queries for analytics
- Supports future features (leave handling, etc.)

**Migration:**
```
Script: Create Instructor Assignment from instructor_log entries
  For each instructor_log entry:
    Create Instructor Assignment with:
      instructor = parent.name
      batch = matching Student Group (program + branch)
      from_date = academic_year.year_start_date
      to_date = academic_year.year_end_date
```

---

## 📋 ATTENDANCE MARKING WORKFLOW (Multi-Branch)

### For Instructors

**Current:** Simple (only their batches)
```
1. Instructor logs in → /dashboard/instructor/attendance
2. Select date → System fetches ALL their sessions for that date
3. For each session: Mark students as Present/Absent/Late
4. Submit → bulkMarkAttendance() creates Student Attendance docs
```

**Enhanced (Multi-Branch):**
```
1. Instructor logs in → /dashboard/instructor/attendance
2. Select date → System fetches ALL their sessions (multiple branches possible)
3. Each session card now shows:
   - Batch name
   - ✅ Branch label (Thopumpadi / Palluruthy)
   - Time: 09:00-10:00
   - ⚠️ Conflict badge if same time as another branch
4. User expands session → Mark attendance
5. System checks: Is there a time conflict?
   - If YES: Show warning "You have class at [other_branch] same time"
   - Allow override: "Mark as attended anyway"
6. Submit → Creates Student Attendance with conflict_noted=true (if override)
```

---

### For Branch Managers

**Current:** Can't mark directly (delegates to instructors)
```
1. Branch Manager views attendance in /dashboard/branch-manager/academics
2. Can see per-batch attendance summaries
3. Can see chronic absentees
4. BUT: Cannot mark attendance for students
```

**Enhanced (Multi-Branch):**
```
1. Branch Manager views: /dashboard/branch-manager/academics
2. NEW section: "Instructors Assigned to Your Branch"
   - Lists all instructors teaching in their branch
   - For each: shows batches, programs, cross-branch assignments
   
3. Can click "View Instructor": See cross-branch workload
   - Aleesha: 45 classes at Thopumpadi, 30 at Palluruthy
   - Conflict check: Any double-bookings? 0 detected ✅
   
4. When navigating to mark attendance:
   - Only see students from their branch's batches
   - For multi-branch instructors: Show "Also teaches:" indicator
   - Warn if instructor teaches elsewhere same time
```

---

### For Directors

**Current:** Full access across all branches
```
1. Can view /dashboard/director/academics
2. Drill down by branch → Attendance → Chronic absentees
3. Can view cross-branch analytics
```

**Enhanced (Multi-Branch):**
```
1. NEW Dashboard: /dashboard/director/instructor-workload
   - Shows all instructors, all branches
   - For each instructor:
     ├── Branch 1: X classes, Y% completion
     ├── Branch 2: Z classes, W% completion
     ├── Total workload: %
     └── Conflicts detected: N (if any)
   
2. Can filter by:
   - Over-utilized instructors (>100% capacity)
   - Conflict-prone assignments
   - Cross-branch instructors
   
3. Can manage assignments:
   - Reassign instructor to different branch
   - Set max hours per week
   - Force resolve conflicts with reason logged
```

---

## 🎯 ACADEMICS VIEWING ENHANCEMENTS

### Branch Manager Academics View (Enhanced)

**Current:**
```
/dashboard/branch-manager/academics

KPIs:
  ├── Overall Attendance: 82%
  ├── Avg Exam Score: 76%
  ├── Topic Coverage: 85%
  └── Total Instructors: 12

Top Performing Batches (by exam)
Top Instructors (by topic completion)
Chronic Absentees
```

**Enhanced (Multi-Branch):**
```
/dashboard/branch-manager/academics

KPIs: (unchanged)

NEW SECTION: Cross-Branch Instructors
  Shows: Instructors teaching at this branch who also teach elsewhere
  
  Example:
    ┌─────────────────────────────────────────────┐
    │ Aleesha                    [View Full Profile] │
    ├─────────────────────────────────────────────┤
    │ This Branch (Thopumpadi):                   │
    │   • 10th Hindi: 45 classes, 90% completion │
    │   • Classes: 09:00-10:00, 11:00-12:00      │
    │                                              │
    │ Other Branches:                             │
    │   • Palluruthy: 11th Hindi, 30 classes     │
    │   ⚠️ Potential Time Conflict?              │
    │      → Check if same time as Thopumpadi   │
    └─────────────────────────────────────────────┘

  Actions:
    - [View Cross-Branch Workload]
    - [Check Schedule Conflicts]
    - [View Complete Performance]
```

---

### Director Academics View (Enhanced)

**Current:**
```
/dashboard/director/academics

  ├── Overview (aggregate metrics all branches)
  ├── Attendance (drill-down by branch)
  ├── Exams (drill-down by branch)
  └── A+ Cabinet (student achievements by year)
```

**Enhanced (Multi-Branch):**
```
/dashboard/director/academics

  ├── Overview (unchanged)
  ├── Attendance (unchanged)
  ├── Exams (unchanged)
  ├── A+ Cabinet (unchanged)
  ├── [NEW] Instructor Workload
  │         └── Cross-branch utilization, conflicts, capacity
  └── [NEW] Branch Actions Needed
            └── Flag when instructor over-booked or conflicts detected
```

---

## ⚠️ DATA CONSISTENCY ISSUES TO HANDLE

### Issue 1: Attendance Records Without Branch Link

**Current State:**
```
Many Student Attendance records missing custom_branch field
(Pre-implementation records)
```

**Solution:**
```
Migration script:
  For each Student Attendance record without custom_branch:
    1. Look up student_group.custom_branch
    2. Fill in attendance.custom_branch
    3. Save

Add constraint: Student Attendance.custom_branch required
```

---

### Issue 2: Course Schedule Missing Instructor Link

**Current State:**
```
Course Schedule has instructor field
BUT Student Attendance doesn't link back to Course Schedule
```

**Solution:**
```
Populate course_schedule field on Student Attendance:
  When creating/updating attendance:
    1. Find Course Schedule for (batch, date, time)
    2. Link it to Student Attendance
    3. Use course_schedule to track which class this attendance is for

This enables:
  - "Student missed Math class at 09:00"
  - "All absent from Physics session"
  - Better reporting
```

---

### Issue 3: Sync instructor_log with Batch.instructors[]

**Current State:**
```
instructor_log: { program, branch } (implicit batch mapping)
Student Group.instructors: [] (empty, unused)
```

**Solution:**
```
Add sync script:
  Trigger: After insert/update Instructor or Student Group
  
  If Instructor created:
    For each instructor_log entry:
      Find matching Student Group(s) with same program + custom_branch
      Add instructor to batch.instructors[]
  
  If Student Group created/updated:
    Look up matching instructor_log entries
    Populate batch.instructors[]
  
  Daily reconciliation: Ensure data stays in sync
```

---

## 🔄 QUERY OPTIMIZATIONS NEEDED

### Current Queries (Work Fine)

```sql
-- Attendance for a date + branch
SELECT * FROM student_attendance
WHERE date = '2026-05-06' AND custom_branch = 'Thopumpadi'
ORDER BY student_group, student
```

### Enhanced Queries (Multi-Branch)

```sql
-- All sessions for instructor today (across branches)
SELECT cs.name, cs.student_group, sg.custom_branch, cs.from_time, cs.to_time
FROM course_schedule cs
JOIN student_group sg ON cs.student_group = sg.name
WHERE cs.instructor = 'INS-001' AND DATE(cs.schedule_date) = CURDATE()
ORDER BY cs.from_time

-- Conflict detection: Same instructor at multiple branches same time
SELECT cs1.*, cs2.*
FROM course_schedule cs1
JOIN course_schedule cs2 ON cs1.instructor = cs2.instructor
  AND DATE(cs1.schedule_date) = DATE(cs2.schedule_date)
  AND cs1.name != cs2.name
JOIN student_group sg1 ON cs1.student_group = sg1.name
JOIN student_group sg2 ON cs2.student_group = sg2.name
WHERE sg1.custom_branch != sg2.custom_branch
  AND (
    (cs1.from_time < cs2.to_time AND cs1.to_time > cs2.from_time)
  )

-- Instructor workload across branches
SELECT
  i.name,
  COUNT(DISTINCT cs.name) as total_sessions,
  COUNT(DISTINCT sg.custom_branch) as branch_count,
  GROUP_CONCAT(DISTINCT sg.custom_branch) as branches
FROM instructor i
JOIN course_schedule cs ON i.name = cs.instructor
JOIN student_group sg ON cs.student_group = sg.name
WHERE DATE(cs.schedule_date) BETWEEN @start_date AND @end_date
GROUP BY i.name
```

---

## 📝 SUMMARY: What Changes & What Stays Same

| Component | Current | Enhanced | Impact |
|-----------|---------|----------|--------|
| **Attendance Marking** | Instructor marks only their batches | Same, but shows branch labels + conflict warnings | LOW: UI enhancement |
| **Attendance Records** | Student Attendance scoped to branch via batch | Same scoping, add conflict_noted flag | LOW: One new field |
| **Attendance API** | bulkMarkAttendance() works per batch | Add conflict check before marking | MEDIUM: Validation layer |
| **Branch Manager Dashboard** | Shows own branch only | Add cross-branch instructor section | MEDIUM: New UI section |
| **Academics Analytics** | Per-branch queries | Add cross-branch instructor view | MEDIUM: New API endpoint |
| **Director Dashboard** | Branch drill-down | Add instructor workload view | MEDIUM: New page/tab |
| **User Permissions** | Scoped via Frappe User Permissions | No change (still scoped same way) | NONE |
| **Data Model** | Implicit instructor-batch mapping | Add explicit batch.instructors[] | LOW: Optional field |

---

## 🚀 IMPLEMENTATION PHASES (Attendance + Academics)

### Phase 1: Foundation (2 days)
```
☐ Add custom_branch to Course Schedule doctype
☐ Update getBatch() to populate instructors[] from instructor_log
☐ Add course_schedule link to Student Attendance bulkMarkAttendance()
☐ Create /api/method/check-attendance-conflict endpoint
```

### Phase 2: Instructor UI (2 days)
```
☐ Update attendance marking page to show branch labels
☐ Add conflict warning modal
☐ Add conflict-noted audit log
☐ Test multi-session marking across branches
```

### Phase 3: Branch Manager Views (2-3 days)
```
☐ Add "Cross-Branch Instructors" section to academics dashboard
☐ Create instructor cross-branch profile view
☐ Add conflict detection to instructor cards
☐ Build branch workload analytics
```

### Phase 4: Director Views (2-3 days)
```
☐ Create instructor workload dashboard
☐ Build conflict detection report
☐ Add utilization percentage calculations
☐ Create "Actions Needed" alert system
```

### Phase 5: Testing & Migration (2 days)
```
☐ Write data consistency checks
☐ Migrate existing data (fill custom_branch, add course_schedule links)
☐ E2E testing for conflict scenarios
☐ Performance testing on large datasets
```

---

## ✅ CHECKLIST: What You Need Before Implementation

- [ ] Approval on Option A (Minimal) vs Option B (Comprehensive)?
- [ ] Confirm: Should conflict detection prevent or just warn?
- [ ] Confirm: Who should see cross-branch instructor dashboard (Director only, or GM too)?
- [ ] Decide: Should multi-branch instructors be auto-detected or manually flagged?
- [ ] Decide: What's acceptable workload percentage? (Currently no limit)

