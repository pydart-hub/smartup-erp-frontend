# Multi-Branch Instructor Architecture
## Problem & Solution Structure

---

## 📌 THE PROBLEM

**Current Situation:**
- Instructors teach classes in **multiple branches** (e.g., Aleesha teaches Hindi at Thopumpadi AND Palluruthy)
- Branch managers can only see their own branch
- No clear way for branch managers to:
  1. Know which instructors teach in their branch
  2. Schedule classes for those instructors without conflicts
  3. Mark attendance for classes across branches

**Why It's Complex:**
- Instructor assignments are implicit (matched via program + branch from instructor_log)
- No explicit "Instructor works at Branch X" relationship
- Branch managers need to see only their branch's data but still manage all their instructors' classes
- Risk of double-booking: instructor assigned to 2 branches at same time

---

## ✅ CURRENT STATE ANALYSIS

### What Already Works (Multi-Branch Foundation)

#### 1. **Instructor Data Model** ✅
```
Instructor Doctype:
  - name: "INS-001"
  - employee: "EMP-123"
  - instructor_log[] (child table):
    - program: "10th State"
      branch: "Thopumpadi"
      academic_year: "2025-2026"
    - program: "10th State"
      branch: "Palluruthy"          ← SAME INSTRUCTOR, DIFFERENT BRANCH
      academic_year: "2025-2026"
```
✅ **Already supports multi-branch** via child table entries

#### 2. **Batch Scoping** ✅
```
Student Group (Batch):
  - name: "CHL-10th-25-1"
  - program: "10th State"
  - custom_branch: "Thopumpadi"     ← Branch link
```
✅ **All batches scoped to single branch** via custom_branch field

#### 3. **Course Scheduling** ✅
```
Course Schedule:
  - student_group: "CHL-10th-25-1"
  - instructor: "INS-001"
  - course: "Mathematics"
  - schedule_date: "2025-05-06"
  - from_time/to_time: "09:00 - 10:00"
  - custom_branch: "Thopumpadi"     ← Branch link (inherited from batch)
```
✅ **Scheduling already branch-scoped**

#### 4. **Attendance Marking** ✅
```
Student Attendance:
  - student: "STU-001"
  - date: "2025-05-06"
  - status: "Present"
  - student_group: "CHL-10th-25-1"
  - custom_branch: "Thopumpadi"     ← Branch link
  - docstatus: 1 (submitted)
```
✅ **Attendance already branch-scoped**

---

## ❌ CURRENT GAPS

| Gap | Impact | Why |
|-----|--------|-----|
| **No explicit instructor-batch assignment** | Implicit matching causes confusion | instructor_log only lists programs+branches, not specific batches |
| **No visibility of cross-branch assignments** | Branch managers don't know instructor teaches elsewhere | Data exists but not surfaced |
| **No conflict detection** | Can schedule same instructor at 2 branches simultaneously | No validation across branches |
| **No unified instructor workload view** | Hard to see all class assignments across branches | No org-wide dashboard |
| **Missing explicit link in Course Schedule** | Hard to query "which batches does this instructor teach" | Matching is implicit, not explicit |

---

## 🎯 PROPOSED SOLUTION STRUCTURE

### Level 1: Data Model Enhancement

#### Option A: Minimal (Recommended First Step)
**Add explicit instructor-batch mapping without new doctype**

```
Batch (Student Group) - ADD NEW FIELD
  - instructors[]: Link to Instructor
  - instructors_for_academic_year: "2025-2026"
```

**Why this works:**
- Reuses existing batch structure
- Makes implicit relationships explicit
- No new doctype needed
- Simple queries: `batch.instructors → list of instructors for that batch`

**Data Consistency:**
- When instructor_log entry created → auto-populate batch.instructors
- When batch created → auto-populate from instructor_log matching

---

#### Option B: Comprehensive (For Future Scalability)
**Create explicit "Instructor Assignment" doctype**

```
Doctype: Instructor Assignment
  Fields:
    - instructor: Link to Instructor
    - batch: Link to Student Group
    - branch: Link to Company (denormalized from batch)
    - program: String (denormalized from batch)
    - academic_year: Link to Academic Year
    - from_date/to_date: Date range
    - is_active: Bool
    - courses[]: Specific courses instructor teaches in this batch
    - max_hours_per_week: Number (for conflict detection)
    - assignment_type: "Primary" | "Support" | "Substitute"
```

**Advantages:**
- Explicit audit trail
- Supports time-bound assignments
- Supports course-level granularity
- Supports role assignments (primary, support, substitute)
- Easy conflict detection via date ranges

**Disadvantages:**
- Requires migration from instructor_log
- More complex queries

---

### Level 2: Branch Manager Visibility

#### What Branch Manager Needs to See

**Dashboard / Query Results:**
```
Branch: "Thopumpadi"

Active Instructors in This Branch (2025-2026):
┌─────────────────────────────────────────────────────────┐
│ Instructor    │ Programs       │ Batches      │ Courses  │
├─────────────────────────────────────────────────────────┤
│ Aleesha       │ 10th, 11th     │ 4 batches    │ Hindi    │
│ Ramesh        │ 10th State     │ 2 batches    │ Math     │
│ Priya         │ 11th Science   │ 3 batches    │ Physics  │
└─────────────────────────────────────────────────────────┘

Cross-Branch Assignments (This Branch's Instructors):
┌─────────────────────────────────────────────────────────┐
│ Instructor │ Teaches At Other Branches │ Conflict Risk  │
├─────────────────────────────────────────────────────────┤
│ Aleesha    │ Palluruthy (Hindi-10th)   │ ⚠️ Check times │
│ Ramesh     │ None                      │ ✅ Local only  │
└─────────────────────────────────────────────────────────┘
```

#### Features Branch Manager Needs

1. **Instructor-Batch View** (filtered to their branch)
   - Who teaches what and where
   - All courses per batch

2. **Schedule Creation with Conflict Detection**
   - When creating Course Schedule for instructor:
     - Query ALL branches for same instructor's schedule
     - Warn if time overlap detected
     - Show: "Aleesha also teaches at Palluruthy from 10:00-11:00"

3. **Attendance Marking (Already Works)**
   - Scoped to their branch via custom_branch field
   - No changes needed

4. **Cross-Branch Instructor Utilization Report**
   - Hours per week per branch
   - Total instructor capacity
   - Detect over-booking

---

### Level 3: Query & API Layer

#### New API Endpoints (If Option A - Minimal)

```
1. GET /api/resource/Student%20Group/{batch_id}
   Returns: batch with instructors[] field populated
   
2. GET /api/method/get-instructor-batches?instructor=INS-001
   Returns: [{batch: "CHL-10th-25-1", branch: "Thopumpadi", courses: [...]}]
   
3. GET /api/method/check-instructor-conflict
   Params: {instructor, branch, date, from_time, to_time}
   Returns: [{conflicting_batch, branch, time_overlap}]
```

#### New Filters/Queries

```sql
-- Find all batches for an instructor in a branch
SELECT * FROM student_group 
WHERE instructors LIKE '%INS-001%' 
  AND custom_branch = 'Thopumpadi'
  AND academic_year = '2025-2026'

-- Find all instructor assignments (cross-branch)
SELECT DISTINCT instructor, custom_branch FROM course_schedule
WHERE instructor = 'INS-001'
  AND DATE(schedule_date) = CURDATE()

-- Detect scheduling conflicts
SELECT * FROM course_schedule cs1
JOIN course_schedule cs2 ON cs1.instructor = cs2.instructor
  AND cs1.custom_branch != cs2.custom_branch
  AND cs1.schedule_date = cs2.schedule_date
  AND (
    (cs1.from_time >= cs2.from_time AND cs1.from_time < cs2.to_time) OR
    (cs1.to_time > cs2.from_time AND cs1.to_time <= cs2.to_time)
  )
```

---

### Level 4: UI Changes Needed

#### For Branch Managers

**New Page: "Instructor Assignments" (Per-Branch)**
```
/dashboard/instructors-assignments

Shows:
1. Table of all instructors teaching in this branch
   - Name
   - Programs
   - Active batches count
   - Teaching hours/week
   - Other branches (if any)
   
2. Filter: By program, course, status
3. Action: Assign/unassign instructor to batch
```

**Enhanced Scheduling Form**
```
Current: Course Schedule form
  - Student Group
  - Instructor
  - Date/Time
  - Course

ADD: Conflict Warning Panel
  - Show if selected instructor has class at another branch
  - Time overlap alert
  - "Force Override" option (with audit log)
```

**Attendance Marking (No Changes)**
- Already scoped to branch
- Works as-is

#### For Admin/Director

**New Report: "Cross-Branch Instructor Utilization"**
```
Shows:
- Instructor workload across all branches
- Total hours/week
- Branches assigned
- Potential conflicts flagged
- Utilization percentage
```

---

## 📊 IMPLEMENTATION ROADMAP

### Phase 1: Data Model (Minimal Approach)
- [ ] Add `instructors[]` field to Student Group doctype
- [ ] Create server script to auto-populate Student Group.instructors from instructor_log
- [ ] Add `academic_year` field to Student Group (if not exists)

### Phase 2: Branch Manager Visibility
- [ ] Create new page: `/dashboard/instructors-assignments`
- [ ] Build instructor list query (scoped to branch)
- [ ] Add filter UI: program, course, status
- [ ] Add instructor-batch assignment UI

### Phase 3: Conflict Detection
- [ ] Add conflict check API endpoint
- [ ] Enhance Course Schedule form with warning panel
- [ ] Log conflicts to audit trail

### Phase 4: Reporting
- [ ] Create cross-branch utilization report
- [ ] Add to Director dashboard
- [ ] Add utilization metrics to Branch Manager view

---

## 🔐 Permissions Model

### Branch Manager Can:
- ✅ View all instructors in their branch
- ✅ View all batches in their branch
- ✅ Schedule classes for their branch (existing)
- ✅ See conflict warnings when instructor teaches elsewhere
- ✅ Mark attendance for their branch (existing)
- ❌ View or modify other branches' data
- ❌ Override conflicts (only Director/Admin)

### Instructor Can:
- ✅ View their own schedule (all branches)
- ✅ See all their batch assignments
- ✅ View attendance for their batches
- ❌ Schedule classes (Branch Manager does)
- ❌ Modify assignments

### Director Can:
- ✅ View all instructor assignments (all branches)
- ✅ Create/modify cross-branch assignments
- ✅ Override conflict warnings
- ✅ Run utilization reports
- ✅ See instructor workload across organization

---

## 🛠️ Technical Implementation Details

### Frontend Components Needed

```typescript
// Component: InstructorAssignmentTable
// Shows instructors and their batches per branch

// Component: ConflictWarningPanel
// Shows on Course Schedule form when instructor teaches elsewhere

// Component: CrossBranchView
// For Director to see all instructor assignments

// Component: InstructorUtilizationReport
// Shows workload per instructor across branches
```

### Backend Server Scripts Needed

```python
# Script: auto-populate-batch-instructors
# Trigger: After insert/update on Instructor
# Action: Update linked Student Group.instructors field

# Script: detect-scheduling-conflicts
# Trigger: Before insert on Course Schedule
# Action: Check for time conflicts across branches

# Script: sync-instructor-log-to-assignments
# Run: Periodic batch job
# Action: Ensure data consistency
```

### API Integration Points

```
Frappe Backend:
  - GET /api/resource/Instructor
  - GET /api/resource/Student%20Group
  - GET /api/resource/Course%20Schedule
  - POST /api/resource/Course%20Schedule (with conflict check)
  - GET /api/method/custom-conflict-check
  - GET /api/method/instructor-batches-by-branch
```

---

## ⚠️ Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Double-booking same instructor | Conflict detection in scheduling UI + warning + audit log |
| Data inconsistency (instructor_log vs assignments) | Auto-sync script runs nightly, alerts on mismatch |
| Branch manager sees other branches' data | Enforce scoping at API layer via proxy + UI filters |
| Instructor can't find their classes | Show all branches in instructor view (no scoping for them) |
| Admin can't override conflicts when needed | Add explicit "force schedule" option with mandatory reason |

---

## 📝 Summary

**Minimal Solution (Recommended):**
1. Add `instructors[]` field to Student Group
2. Auto-populate from instructor_log
3. Build Branch Manager UI to view instructor assignments
4. Add conflict detection on scheduling
5. Scope queries to branch for Branch Managers

**Benefits:**
- Reuses existing data structure
- No new doctypes
- Minimal database changes
- Solves branch manager visibility
- Prevents conflicts

**Effort:**
- Backend: ~2-3 days (server scripts + API)
- Frontend: ~3-4 days (UI + components)
- Testing: ~2 days

---

## 🚀 Next Steps (After Your Approval)

Once you approve this structure, I can:
1. Create the database migration
2. Build the Branch Manager dashboard
3. Implement conflict detection
4. Create the utilization report
5. Add comprehensive tests

**Ready to proceed?**
