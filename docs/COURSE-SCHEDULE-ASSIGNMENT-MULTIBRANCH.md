# Course Schedule Assignment for Multi-Branch Instructors
## Complete Structure & Implementation Guide

---

## 📌 CURRENT WORKFLOW (Single-Branch Model)

### High-Level Flow

```
Branch Manager navigates to Course Schedule creation
    ↓
[1] Select Batch (Student Group) — LOCKED to their branch
    ↓
[2] System extracts Program from selected batch
    ↓
[3] Fetch all COURSES for that program
    ↓
[4] Fetch all INSTRUCTORS for that branch
    ↓
[5] Apply filtering rules:
    - Show only instructors teaching in this program
    - When course selected → show only instructors with that course
    - When instructor selected → show only courses they teach
    ↓
[6] Select: Course + Instructor + Room + Time
    ↓
[7] Optionally select Topic from course topics
    ↓
[8] Submit → Creates Course Schedule record
    - Populated: student_group, course, instructor, custom_branch
    - custom_branch = inherited from batch
```

---

## 🔍 DETAILED CURRENT IMPLEMENTATION

### Part 1: Batch Selection

**UI Code:** `/dashboard/branch-manager/course-schedule/new/page.tsx`

```typescript
// Branch is LOCKED to manager's company
const branch = defaultCompany;  // Their single branch

// Fetch student groups for THEIR branch only
const { data: groupRes } = useQuery({
  queryKey: ["student-groups", branch],
  queryFn: () => getStudentGroups({ branch: branch || undefined }),
});
const groups = groupRes?.data ?? [];  // Only Thopumpadi batches

// When manager selects a group → extract program
const selectedGroupProgram = useMemo(() => {
  const g = groups.find((g) => g.name === form.student_group);
  return g?.program ?? "";  // e.g., "10th State"
}, [form.student_group, groups]);
```

**Data Model:**
```
Student Group (Batch)
  - name: "CHL-10th-25-1"
  - program: "10th State"
  - custom_branch: "Thopumpadi"  ← Branch is FIXED here
  - students: []
```

---

### Part 2: Course Fetching

**UI Code:** Same file

```typescript
// Fetch ALL courses for the program
const { data: programCourses } = useQuery({
  queryKey: ["program-courses", selectedGroupProgram],
  queryFn: () => getProgramCourses(selectedGroupProgram),
  enabled: !!selectedGroupProgram,
});

// deduplicate courses (multiple entries with same course name)
const courses = useMemo(() => {
  const seen = new Set<string>();
  return rawCourses.filter((c) => {
    if (seen.has(c.course)) return false;
    seen.add(c.course);
    return true;
  });
}, [rawCourses]);
```

**Backend API:** `getProgramCourses(program: string)`

```typescript
// Frappe query:
GET /api/resource/Program?program_name=10th State
  → Returns: All courses linked to this program
  → Example: [Mathematics, Science, Hindi, ...]
```

---

### Part 3: Instructor Fetching WITH Course Assignments

**UI Code:** Same file

```typescript
// Fetch ALL instructors for the branch + their course assignments
const { data: allInstructors } = useQuery({
  queryKey: ["instructors-with-courses", branch],
  queryFn: () => getInstructorsWithCourses(branch),
  enabled: !!branch,
});

// allInstructors is InstructorWithLog[] → includes instructor_log
interface InstructorWithLog {
  name: "INS-001",
  instructor_log: [
    { program: "10th State", course: "Mathematics", custom_branch: "Thopumpadi" },
    { program: "10th State", course: "Hindi", custom_branch: "Thopumpadi" },
    { program: "11th Science", course: "Physics", custom_branch: "Thopumpadi" },
  ]
}
```

**Backend API:** `getInstructorsWithCourses(branch: string)`

```typescript
export async function getInstructorsWithCourses(branch: string): Promise<InstructorWithLog[]> {
  // 1. Get employees in this company
  const branchInstructors = await getInstructorsByCompany(branch);
  
  // 2. Fetch FULL doc for each instructor (includes instructor_log child table)
  const docs = await Promise.all(
    branchInstructors.map((i) =>
      getInstructorDoc(i.name)  // Parallel fetch
    )
  );
  
  return docs;  // Each has instructor_log populated
}
```

---

### Part 4: Bidirectional Filtering Logic

**UI Code:** Same file

```typescript
// FILTER 1: When instructor selected → show only THEIR courses
const filteredCourses = useMemo(() => {
  if (!form.instructor || !selectedGroupProgram) {
    return allProgramCourses;  // Show all program courses
  }
  
  const instructor = branchInstructors.find((i) => i.name === form.instructor);
  if (!instructor) return allProgramCourses;

  // Get courses from instructor's log for this program
  const assignedCourses = new Set(
    instructor.instructor_log
      .filter((log) => log.program === selectedGroupProgram && log.course)
      .map((log) => log.course!)
  );

  // If instructor has NO course assignments in log, show all program courses
  if (assignedCourses.size === 0) return allProgramCourses;

  // Show only courses instructor teaches in this program
  return allProgramCourses.filter((c) => assignedCourses.has(c.course));
}, [form.instructor, selectedGroupProgram, allProgramCourses, branchInstructors]);

// FILTER 2: When course selected → show only instructors who teach it
const filteredInstructors = useMemo(() => {
  if (!selectedGroupProgram) return branchInstructors;

  // First: Filter by program
  const programInstructors = branchInstructors.filter((i) =>
    i.instructor_log.some((log) => log.program === selectedGroupProgram)
  );

  // Second: If course selected, further filter
  if (!form.course) return programInstructors;

  const courseInstructors = programInstructors.filter((i) =>
    i.instructor_log.some(
      (log) => log.program === selectedGroupProgram && log.course === form.course
    )
  );

  // If no instructors have explicit course assignments, show all program instructors
  return courseInstructors.length > 0 ? courseInstructors : programInstructors;
}, [form.course, selectedGroupProgram, branchInstructors]);
```

---

### Part 5: Submit (Create Schedule)

**UI Code:** Same file

```typescript
const { mutate: submit } = useMutation({
  mutationFn: () =>
    createCourseSchedule({
      student_group: form.student_group,
      course: form.course,
      instructor: form.instructor,
      schedule_date: form.schedule_date,
      from_time: form.from_time,
      to_time: form.to_time,
      room: form.room,
      custom_branch: branch,  // ← Set from manager's branch
      custom_topic: form.custom_topic,
    }),
});
```

**Course Schedule Record Created:**
```
{
  name: "CS-2026-00001",
  student_group: "CHL-10th-25-1",
  instructor: "INS-001",
  course: "Mathematics",
  schedule_date: "2026-05-10",
  from_time: "09:00:00",
  to_time: "10:30:00",
  room: "Classroom A",
  custom_branch: "Thopumpadi",
  custom_topic: "Algebra",
  custom_topic_covered: 0,
}
```

---

## 🎯 CURRENT LIMITATION (Multi-Branch Problem)

### The Issue

**Scenario:** Instructor Aleesha teaches at both Thopumpadi AND Palluruthy

```
Aleesha's instructor_log:
  - program: "10th State", course: "Hindi", custom_branch: "Thopumpadi"
  - program: "10th State", course: "Hindi", custom_branch: "Palluruthy"
  
Manager at Thopumpadi creates a schedule:
  ✅ System shows Aleesha (has "10th State" in her log)
  ✅ Manager selects Aleesha
  ✅ Creates Course Schedule: student_group="CHL-10th-25-1" (Thopumpadi)
  
Manager at Palluruthy creates a schedule:
  ✅ System shows Aleesha (has "10th State" in her log)
  ✅ Manager selects Aleesha
  ✅ Creates Course Schedule: student_group="CHL-10th-26-1" (Palluruthy)
  
PROBLEM: No indication that these are different batches/branches!
         No conflict check if times overlap!
```

---

### What's Missing

| Issue | Current | Multi-Branch Need |
|-------|---------|------------------|
| **Instructor visibility** | All instructors from branch shown | ✅ Works correctly |
| **Course filtering** | Filter by instructor's courses | ✅ Works correctly |
| **Branch awareness** | No | ❌ Show which branch instructor teaches at |
| **Conflict detection** | No | ❌ Warn if different branches same time |
| **Cross-branch assignment** | No | ❌ Branch manager can't see instructor teaches elsewhere |
| **Implicit log matching** | Yes | ❌ Should be explicit (batch.instructors[]) |

---

## ✅ SOLUTION STRUCTURE

### Phase 1: Data Model Enhancement

#### Add Explicit Batch → Instructors Mapping

**Change 1: Populate Student Group.instructors[] field**

```
DocType: Student Group
  - Add field: instructors (Table of Links to Instructor)
  
Data:
  Student Group: "CHL-10th-25-1"
    - program: "10th State"
    - custom_branch: "Thopumpadi"
    - instructors: ["INS-001", "INS-002"]  ← NEW
    - academic_year: "2025-2026"
```

**Change 2: Add instructor_branches metadata to instructor_log**

```
Instructor: "INS-001"
  - instructor_log[]:
    - program: "10th State"
      course: "Hindi"
      custom_branch: "Thopumpadi"
      other_branches: ["Palluruthy"]  ← NEW (for visibility)
```

OR (simpler):

**Change 3: Just add batch_info in response**

```typescript
// When fetching instructors, include ALL their branches in response
interface InstructorWithLog {
  name: "INS-001",
  instructor_log: [
    { program: "10th State", course: "Hindi", custom_branch: "Thopumpadi" },
    { program: "10th State", course: "Hindi", custom_branch: "Palluruthy" },
  ],
  // NEW in response:
  all_branches: ["Thopumpadi", "Palluruthy"],  // Deduped list of all branches
}
```

---

### Phase 2: Enhanced Instructor Fetching

#### Change getInstructorsWithCourses() to Include Cross-Branch Info

**Current:**
```typescript
getInstructorsWithCourses(branch="Thopumpadi")
  → Returns: Instructors with their instructor_log
  → Problem: Doesn't show if they teach elsewhere
```

**Enhanced:**
```typescript
getInstructorsWithCourses(branch="Thopumpadi")
  → Returns: Instructors + their instructor_log + all_branches

interface InstructorWithLog {
  name: "INS-001",
  instructor_log: [...],
  all_branches: ["Thopumpadi", "Palluruthy"],  // ← NEW
  teaches_elsewhere: boolean,                   // ← NEW (convenience flag)
  other_branches: ["Palluruthy"],              // ← NEW (this branch excluded)
}
```

**Implementation:**
```typescript
export async function getInstructorsWithCourses(branch: string): Promise<InstructorWithLog[]> {
  const branchInstructors = await getInstructorsByCompany(branch);

  const docs = await Promise.all(
    branchInstructors.map((i) =>
      getInstructorDoc(i.name).then((doc) => {
        // Add derived fields
        const allBranches = [...new Set(doc.instructor_log.map(log => log.custom_branch))];
        const otherBranches = allBranches.filter(b => b !== branch);
        
        return {
          ...doc,
          all_branches: allBranches,
          teaches_elsewhere: otherBranches.length > 0,
          other_branches: otherBranches,
        };
      })
    )
  );

  return docs;
}
```

---

### Phase 3: Enhanced UI - Add Cross-Branch Indicators

#### Change 1: Show Branch Info on Instructor Card

**Before:**
```
Instructor List:
  Aleesha
  Ramesh
  Priya
```

**After:**
```
Instructor List:
  Aleesha                      [teaches at 2 branches ⚠️]
  Ramesh
  Priya                        [teaches at 2 branches ⚠️]
```

**Code:**
```typescript
{filteredInstructors.map(instr => (
  <option key={instr.name} value={instr.name}>
    {instr.instructor_name}
    {instr.teaches_elsewhere && ` (also @ ${instr.other_branches.join(", ")})`}
  </option>
))}
```

---

#### Change 2: Add Batch → Instructor Assignment View

**New Section in Form:**

```tsx
// Show: Which batches can this instructor teach?
{form.instructor && (
  <div className="bg-surface rounded p-3 border border-border-light">
    <p className="text-xs font-medium text-text-tertiary mb-2">
      This instructor teaches:
    </p>
    {selectedInstructor.instructor_log.map(log => (
      <div key={`${log.program}-${log.course}`} className="text-xs text-text-secondary mb-1">
        <span className="font-medium">{log.program}</span>
        {log.course && ` > ${log.course}`}
        {' @ '}
        <span className="font-medium">{log.custom_branch}</span>
      </div>
    ))}
  </div>
)}
```

---

#### Change 3: Add Conflict Warning Before Submit

**New Validation Check:**

```typescript
// Before submitting, check if this instructor has a conflict
const checkConflict = async () => {
  const response = await fetch('/api/method/check-schedule-conflict', {
    method: 'POST',
    body: JSON.stringify({
      instructor: form.instructor,
      date: form.schedule_date,
      from_time: form.from_time,
      to_time: form.to_time,
      exclude_batch: form.student_group,  // Exclude current batch
    })
  });
  
  const { conflicts } = await response.json();
  
  if (conflicts.length > 0) {
    showWarning(
      `Instructor has ${conflicts[0].batch} at ${conflicts[0].branch} ` +
      `${conflicts[0].from_time} - this may be a conflict!`
    );
    // Still allow submission, but flag it
  }
};
```

---

### Phase 4: Smart Instructor Assignment

#### Add Batch-Level Instructor View

**New Page:** `/dashboard/branch-manager/batch-assignments/[batchId]`

```typescript
// Shows which instructors teach which subjects in this batch
const batch = "CHL-10th-25-1";

Batch Instructors View:
┌─────────────────────────────────────────┐
│ Batch: CHL-10th-25-1 (10th State)      │
├─────────────────────────────────────────┤
│ Program Courses: Mathematics, Hindi,   │
│                 Science, English        │
├─────────────────────────────────────────┤
│ Current Assignments:                   │
│  • Mathematics → Ramesh (Thopumpadi)   │
│  • Hindi → Aleesha (Thopumpadi + Pall) │ ⚠️
│  • Science → ? (Unassigned)            │
│  • English → Priya (Thopumpadi)        │
│                                         │
│ [+ Add Assignment]                      │
└─────────────────────────────────────────┘
```

---

### Phase 5: Bulk Schedule Creation with Multi-Branch Support

**Current:** `/dashboard/branch-manager/course-schedule/bulk`

```typescript
// Already supports:
// - Multiple dates (Mon-Fri for 4 weeks)
// - Sequential topic assignment
// - Auto-topic selection

// Enhancement for multi-branch:
// - Show instructor's OTHER branches if conflict exists
// - Warn if creating schedules for same instructor at multiple branches
```

**New Feature: Cross-Branch Bulk Scheduling**

```typescript
// Allow GM/Director to create schedules across branches
function CrossBranchBulkSchedule() {
  const [branches, setBranches] = useState<string[]>([]);  // Multi-select
  const [instructor, setInstructor] = useState("");
  
  // When instructor selected + multiple branches
  if (branches.length > 1) {
    const allCourses = [];
    branches.forEach(branch => {
      const courses = instructor.instructor_log
        .filter(log => log.custom_branch === branch)
        .map(log => log.course);
      
      allCourses.push({
        branch,
        courses,  // [Mathematics, Hindi]
      });
    });
    
    // Show which courses per branch
    allCourses.forEach(item => {
      console.log(`${item.branch}: ${item.courses.join(', ')}`);
    });
  }
}
```

---

## 📋 API ENDPOINTS NEEDED

### 1. Check Schedule Conflict (NEW)

```
POST /api/method/check-schedule-conflict

Payload:
{
  instructor: "INS-001",
  date: "2026-05-10",
  from_time: "09:00",
  to_time: "10:30",
  exclude_batch?: "CHL-10th-25-1"
}

Response:
{
  has_conflict: true,
  conflicts: [
    {
      student_group: "CHL-10th-26-1",
      course: "Hindi",
      branch: "Palluruthy",
      from_time: "09:15",
      to_time: "10:15",
      time_overlap: "45 mins"
    }
  ]
}
```

### 2. Get Batch Instructors (Enhanced)

```
GET /api/resource/Student Group/CHL-10th-25-1

Response:
{
  name: "CHL-10th-25-1",
  program: "10th State",
  custom_branch: "Thopumpadi",
  instructors: [
    {
      instructor: "INS-001",
      course: "Mathematics",
      status: "active"
    }
  ]
}
```

### 3. Get Cross-Branch Instructor Workload (NEW)

```
GET /api/method/instructor-cross-branch?instructor=INS-001

Response:
{
  instructor: "INS-001",
  instructor_name: "Aleesha",
  workload_by_branch: {
    "Thopumpadi": {
      programs: ["10th State", "11th State"],
      courses: ["Hindi"],
      sessions_count: 45,
      students_count: 120,
    },
    "Palluruthy": {
      programs: ["10th State"],
      courses: ["Hindi"],
      sessions_count: 30,
      students_count: 80,
    }
  },
  total_sessions: 75,
  total_students: 200,
  utilization_pct: 85,
  conflicts_detected: 0,
}
```

---

## 🎯 IMPLEMENTATION PHASES

### Phase 1: Foundation (1-2 days)
```
☐ Add all_branches, teaches_elsewhere, other_branches to InstructorWithLog
☐ Enhance getInstructorsWithCourses() to compute derived fields
☐ Create check-schedule-conflict API endpoint
☐ Add conflict query logic (same instructor, same time, diff branch)
```

### Phase 2: UI Enhancement (1-2 days)
```
☐ Add instructor cross-branch badge to form
☐ Show instructor's teaching assignments (all programs/courses)
☐ Add conflict warning before submit
☐ Test with multi-branch instructors
```

### Phase 3: Batch Management (1 day)
```
☐ Add Student Group.instructors[] field population
☐ Create batch-level instructor assignment view
☐ Add ability to assign/unassign instructors per batch
```

### Phase 4: Bulk Scheduling (1-2 days)
```
☐ Enhance bulk schedule page for cross-branch scenarios
☐ Add conflict detection in bulk operations
☐ Add audit logging for conflicts
```

### Phase 5: Reporting (1 day)
```
☐ Create instructor cross-branch workload dashboard
☐ Add utilization reports
☐ Add conflict detection report
```

---

## 🔄 DATA FLOW DIAGRAM (Enhanced)

```
Manager @ Thopumpadi creates schedule for 10th batch
  ↓
[1] Select Batch: CHL-10th-25-1 (Thopumpadi, 10th State)
  ↓
[2] Extract Program: "10th State"
  ↓
[3] Fetch Courses: Math, Hindi, Science, English
  ↓
[4] Fetch Instructors for branch:
    getInstructorsWithCourses("Thopumpadi")
    → Returns: [
        { name: "INS-001", ..., all_branches: ["Thopumpadi"],    teaches_elsewhere: false },
        { name: "INS-002", ..., all_branches: ["Thopumpadi", "Palluruthy"], teaches_elsewhere: true },
        { name: "INS-003", ..., all_branches: ["Thopumpadi"],    teaches_elsewhere: false },
      ]
  ↓
[5] Manager selects: Instructor="INS-002" (teaches at 2 branches ⚠️)
  ↓
[6] System filters courses:
    INS-002's courses at Thopumpadi: [Hindi, Marathi]
    → Show only these
  ↓
[7] Manager selects: Course="Hindi", Date="2026-05-10", Time="09:00-10:00"
  ↓
[8] Before submit → Check conflict:
    checkScheduleConflict({
      instructor: "INS-002",
      date: "2026-05-10",
      from_time: "09:00",
      to_time: "10:00"
    })
    → Response: has_conflict = false ✅
  ↓
[9] Submit → Create Course Schedule
    {
      student_group: "CHL-10th-25-1",
      instructor: "INS-002",
      course: "Hindi",
      schedule_date: "2026-05-10",
      from_time: "09:00:00",
      to_time: "10:00:00",
      custom_branch: "Thopumpadi",
      conflict_noted: false
    }
```

---

## ⚠️ IMPORTANT CONSTRAINTS

### 1. Branch Manager Scoping

```
Branch Manager at Thopumpadi:
  ✅ Can see only instructors with employee in Thopumpadi
  ✅ Can see ONLY their branch's batches
  ❌ Cannot schedule for other branches
  ✅ CAN see that instructor teaches elsewhere (info only)
```

### 2. Instructor Assignment Rules

```
Instructor can be taught by branch managers at:
  - Their primary branch (has employee record there)
  - Any branch where they have instructor_log entry

Example: Aleesha
  - Employee record: Thopumpadi
  - instructor_log[0]: program="10th", custom_branch="Thopumpadi"
  - instructor_log[1]: program="10th", custom_branch="Palluruthy"
  
  Result:
  - Thopumpadi manager: can see her ✅
  - Palluruthy manager: can see her ✅
  - Other branches: cannot see her ❌
```

### 3. Overlap Handling

```
If same instructor at 2 branches same time:
  - System WARNS (does not block)
  - Allows override with checkbox "I confirm"
  - Logs conflict_noted = true
  - Flags for review

Why warn not block?
  - Unlikely but possible: Online class spanning branches
  - Parent might handle simultaneous classes
  - Director should approve, not system
```

---

## 📝 SUMMARY TABLE

| Aspect | Current | Enhanced | Effort |
|--------|---------|----------|--------|
| **Instructor visibility** | By branch + program | + shows all branches taught | 1 day |
| **Course filtering** | By instructor's courses | ✅ Same | 0 days |
| **Batch assignment** | Implicit (program match) | Explicit (batch.instructors[]) | 1 day |
| **Conflict detection** | None | Warn if time overlap | 1-2 days |
| **Bulk scheduling** | Works per branch | Enhanced with conflict check | 1 day |
| **Reporting** | Per-branch | + Cross-branch workload | 1 day |
| **Total Effort** | N/A | ~5-6 days | |

---

## ✅ CHECKLIST BEFORE IMPLEMENTATION

- [ ] Approve showing instructor's OTHER branches?
- [ ] Should conflict detection WARN or BLOCK?
- [ ] Should conflict info be logged/audited?
- [ ] Do you need explicit batch.instructors[] field or derived in API response?
- [ ] Should Director be able to bulk schedule across branches?
- [ ] Any other business rules for multi-branch instructors?

